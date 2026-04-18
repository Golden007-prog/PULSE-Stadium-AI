"""PULSE orchestrator service — main entry.

Startup wires:
1. A Pub/Sub subscriber that lands `sensor-events` messages into an
   in-memory buffer and writes scripted density events to Firestore.
2. A 5-second tick loop that builds a venue snapshot and, when anything
   is actionable, invokes the Orchestrator `LlmAgent`.
3. FastAPI endpoints for liveness (`/healthz`) and manual invocation
   (`/trigger`).

Cost and token counts are accumulated per invocation and persisted to
`/agent_traces/{trace_id}` in Firestore.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types

from .agents.orchestrator import orchestrator_agent
from .state.event_buffer import BUFFER
from .state.firestore_client import AgentTrace as FsAgentTrace
from .state.firestore_client import write_trace
from .state.venue_snapshot import read_snapshot
from .subscribers.sensor_events import start_subscriber
from .tracing.cost_tracker import InvocationTrace, record, total_invocations, total_usd

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("orchestrator")

TICK_MS = int(os.environ.get("TICK_INTERVAL_MS", "5000"))
APP_NAME = "pulse-orchestrator"
VENUE_ID = os.environ.get("PULSE_VENUE_ID", "chinnaswamy")
USER_ID = "pulse-system"
COST_BUDGET = float(os.environ.get("COST_BUDGET_PER_SESSION_USD", "0.50"))
LOOP_AUTOSTART = os.environ.get("ORCHESTRATOR_AUTOSTART", "true").lower() == "true"

_runner = InMemoryRunner(agent=orchestrator_agent, app_name=APP_NAME)

state: dict[str, Any] = {
    "running": False,
    "ticks": 0,
    "invocations": 0,
    "last_trace_id": None,
    "last_summary": None,
    "total_usd": 0.0,
    "last_actionable_tick": None,
    "budget_paused": False,
}

_subscriber = None
_sub_future = None
_tick_task: asyncio.Task | None = None


async def _run_orchestrator(prompt: str, tag: str) -> dict[str, Any]:
    """Invoke the Orchestrator agent with a prompt and persist the trace."""
    state["invocations"] += 1
    session_id = str(uuid.uuid4())

    # ADK session creation — API returns a coroutine on 1.x.
    _maybe = _runner.session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if asyncio.iscoroutine(_maybe):
        await _maybe

    trace = InvocationTrace(
        root_agent="orchestrator",
        model=orchestrator_agent.model,
        tag=tag,
        invocation_chain=["orchestrator"],
        inputs={"tag": tag, "prompt": prompt[:2000]},
    )
    content = genai_types.Content(
        role="user", parts=[genai_types.Part.from_text(text=prompt)]
    )

    response_text: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    try:
        async for ev in _runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=content
        ):
            if getattr(ev, "usage_metadata", None):
                trace.input_tokens += getattr(ev.usage_metadata, "prompt_token_count", 0) or 0
                trace.output_tokens += (
                    getattr(ev.usage_metadata, "candidates_token_count", 0) or 0
                )
            author = getattr(ev, "author", None)
            if author and author not in trace.invocation_chain:
                trace.invocation_chain.append(author)
            content_obj = getattr(ev, "content", None)
            if content_obj and getattr(content_obj, "parts", None):
                for p in content_obj.parts:
                    if getattr(p, "text", None):
                        response_text.append(p.text)
                    if getattr(p, "function_call", None):
                        fc = p.function_call
                        tool_calls.append({
                            "agent": author,
                            "tool": getattr(fc, "name", ""),
                            "args": dict(getattr(fc, "args", {}) or {}),
                        })
    except Exception as exc:
        log.exception("orchestrator invocation failed tag=%s", tag)
        trace.outputs = {"error": str(exc), "summary": "\n".join(response_text)[:2000]}
        trace.mark_done()
        record(trace.cost_usd)
        write_trace(_to_fs_trace(trace))
        return {"trace_id": trace.trace_id, "error": str(exc)}

    summary = "\n".join(response_text).strip()[:2000]
    trace.outputs = {"summary": summary, "tool_calls": tool_calls}
    trace.mark_done()
    record(trace.cost_usd)
    state["last_trace_id"] = trace.trace_id
    state["last_summary"] = summary[:400]
    state["total_usd"] = total_usd()
    write_trace(_to_fs_trace(trace))

    log.info(
        "invoke tag=%s chain=%s in=%d out=%d cost=$%.5f tools=%d dur=%dms",
        tag,
        trace.invocation_chain,
        trace.input_tokens,
        trace.output_tokens,
        trace.cost_usd,
        len(tool_calls),
        trace.duration_ms,
    )

    if total_usd() >= COST_BUDGET and not state["budget_paused"]:
        state["budget_paused"] = True
        log.warning(
            "cost budget reached (total=$%.4f >= budget=$%.2f); tick loop paused",
            total_usd(),
            COST_BUDGET,
        )

    return {
        "trace_id": trace.trace_id,
        "chain": trace.invocation_chain,
        "summary": summary,
        "tool_calls": tool_calls,
        "tokens_used": trace.input_tokens + trace.output_tokens,
        "cost_usd": trace.cost_usd,
    }


def _to_fs_trace(t: InvocationTrace) -> FsAgentTrace:
    return FsAgentTrace(
        trace_id=t.trace_id,
        root_agent=t.root_agent,
        invocation_chain=t.invocation_chain,
        inputs=t.inputs,
        outputs=t.outputs,
        tokens_used=t.input_tokens + t.output_tokens,
        cost_usd=t.cost_usd,
        duration_ms=t.duration_ms,
        tag=t.tag,
    )


def _build_tick_prompt(snapshot) -> tuple[str, bool]:
    d = snapshot.to_prompt_json()
    hot = [z for z in d["zones"] if z["current_density"] >= 4.0]
    anomalies = d["anomalies"]
    if not hot and not anomalies:
        return "", False
    parts = [
        "Venue snapshot (IPL final, M. Chinnaswamy, Bengaluru).",
        "Venue state JSON:",
        json.dumps(d, indent=2),
    ]
    if hot:
        parts.append(
            "\nActionable: zones at or above 4 p/m²: "
            + ", ".join(f"{z['id']} ({z['current_density']})" for z in hot)
            + ". Delegate to Flow."
        )
    if anomalies:
        parts.append(
            "\nAnomalies present — phase 2 does not act on them (Care/Safety ship in phase 5). "
            "Acknowledge only."
        )
    return "\n".join(parts), True


async def _tick_loop() -> None:
    state["running"] = True
    log.info("tick loop started (period=%dms, budget=$%.2f)", TICK_MS, COST_BUDGET)
    while state["running"]:
        state["ticks"] += 1
        if state["budget_paused"]:
            await asyncio.sleep(TICK_MS / 1000)
            continue
        try:
            snap = read_snapshot(BUFFER)
            # Drain pending fan queries first — one per tick
            if BUFFER.fan_queries:
                q = BUFFER.fan_queries.popleft()
                prompt = (
                    "A fan has submitted a query. Delegate to the Concierge agent.\n\n"
                    f"fan_id: {q.get('fan_id')}\n"
                    f"seat: {q.get('seat')}\n"
                    f"modality: {q.get('modality', 'text')}\n"
                    f"query: {q.get('query')!r}\n\n"
                    "Concierge: look up the fan's profile, check match state, and if the "
                    "query is about food/drink/restroom, consult the Queue agent for the "
                    "nearest option. Reply in <=15 words."
                )
                await _run_orchestrator(prompt, tag="fan_query")
            else:
                prompt, actionable = _build_tick_prompt(snap)
                if actionable:
                    state["last_actionable_tick"] = state["ticks"]
                    await _run_orchestrator(prompt, tag="tick")
        except Exception:
            log.exception("tick loop error")
        await asyncio.sleep(TICK_MS / 1000)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _subscriber, _sub_future, _tick_task
    try:
        _subscriber, _sub_future = start_subscriber()
    except Exception:
        log.exception("sensor-events subscriber failed to start")
    if LOOP_AUTOSTART:
        _tick_task = asyncio.create_task(_tick_loop(), name="orchestrator-tick")
    try:
        yield
    finally:
        state["running"] = False
        if _tick_task and not _tick_task.done():
            _tick_task.cancel()
            try:
                await _tick_task
            except asyncio.CancelledError:
                pass
        if _sub_future:
            _sub_future.cancel()
        if _subscriber:
            try:
                _subscriber.close()
            except Exception:
                pass


app = FastAPI(title="pulse-orchestrator", lifespan=lifespan)


@app.get("/health")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "pulse-orchestrator",
        "venue_id": VENUE_ID,
        "agent_model": orchestrator_agent.model,
        "tick_ms": TICK_MS,
        "state": {
            **state,
            "attendance_counted": BUFFER.attendance,
            "fan_queries_pending": len(BUFFER.fan_queries),
            "anomalies_seen": len(BUFFER.anomalies),
            "alerts_seen": len(BUFFER.alerts),
            "total_invocations": total_invocations(),
            "total_usd": total_usd(),
        },
    }


@app.post("/trigger")
async def manual_trigger(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = (payload or {}).get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="body must include non-empty 'prompt'")
    return await _run_orchestrator(prompt, tag="manual")

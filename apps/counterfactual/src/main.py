"""PULSE counterfactual service — FastAPI + Cloud Run.

Exposes two endpoints:
  POST /start   {session_id}  → starts a background tick loop.
  POST /stop    {session_id}  → halts an in-flight session.
  GET  /status  {session_id?} → session state.
  GET  /health                → liveness.

For each active session, the service:
  1. Reads the current /venues/chinnaswamy/zones state as t=0.
  2. Advances the ABS engine every 5s for up to 10 minutes.
  3. Writes the counterfactual state AND a rolling metrics doc to
     /counterfactual/{session_id}/* in Firestore.

The ops console's split-screen twin reads those documents via the
same onSnapshot listeners used for reality (phase 5.4).
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager, suppress
from typing import Any

from fastapi import FastAPI, HTTPException
from google.cloud import firestore

from .abs_engine import ABSEngine, MetricsTracker

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("counterfactual")

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "pulse-stadium-ai")
VENUE_ID = os.environ.get("PULSE_VENUE_ID", "chinnaswamy")
TICK_INTERVAL_S = int(os.environ.get("SIM_TICK_INTERVAL_S", "5"))
MAX_TICKS = int(os.environ.get("SIM_MAX_TICKS", "120"))  # 10 min default

_db: firestore.Client | None = None
_sessions: dict[str, asyncio.Task[None]] = {}


def db() -> firestore.Client:
    """Lazily-initialised Firestore client."""
    global _db
    if _db is None:
        _db = firestore.Client(project=PROJECT)
    return _db


def _fetch_initial_zones() -> list[tuple[str, float]]:
    """Snapshot the current reality zones as t=0 for the counterfactual."""
    zones_ref = (
        db().collection("venues").document(VENUE_ID).collection("zones")
    )
    rows: list[tuple[str, float]] = []
    for doc in zones_ref.stream():
        data = doc.to_dict() or {}
        rows.append((doc.id, float(data.get("current_density", 0.0))))
    return rows


async def _run(session_id: str) -> None:
    """Background task: seed from current reality zones, tick every 5s up to MAX_TICKS, write per-tick state + rolling metrics."""
    initial = _fetch_initial_zones()
    if not initial:
        log.error("counterfactual %s: no zones in Firestore; aborting", session_id)
        _write_summary(session_id, {"status": "error", "error": "no-zones"})
        return

    engine = ABSEngine.from_initial(initial)
    metrics = MetricsTracker()

    session_ref = db().collection("counterfactual").document(session_id)
    states_ref = session_ref.collection("states")

    # Initial summary
    _write_summary(session_id, {
        "status": "running",
        "started_at": firestore.SERVER_TIMESTAMP,
        "tick": 0,
        "venue_id": VENUE_ID,
        "tick_interval_s": TICK_INTERVAL_S,
        "max_ticks": MAX_TICKS,
        "t0_zones": dict(initial),
    })

    log.info(
        "counterfactual %s started with %d zones; ticking every %ds up to %d ticks",
        session_id, len(initial), TICK_INTERVAL_S, MAX_TICKS,
    )

    t0 = time.monotonic()
    try:
        while engine.tick < MAX_TICKS:
            step = engine.step(dt_s=TICK_INTERVAL_S)
            metrics.observe(step)

            # Per-tick state doc
            states_ref.document(str(step.tick).zfill(4)).set({
                "tick": step.tick,
                "elapsed_s": step.elapsed_s,
                "zones": step.zones,
                "hot_zones": step.hot_zones,
                "critical_zones": step.critical_zones,
                "written_at": firestore.SERVER_TIMESTAMP,
            })

            # Rolling summary + metrics
            _write_summary(session_id, {
                "status": "running",
                "tick": step.tick,
                "elapsed_s": step.elapsed_s,
                "zones_latest": step.zones,
                "hot_count": len(step.hot_zones),
                "critical_count": len(step.critical_zones),
                "metrics": metrics.as_dict(),
                "updated_at": firestore.SERVER_TIMESTAMP,
            })

            await asyncio.sleep(TICK_INTERVAL_S)

        _write_summary(session_id, {
            "status": "finished",
            "tick": engine.tick,
            "metrics": metrics.as_dict(),
            "finished_at": firestore.SERVER_TIMESTAMP,
        })
        log.info(
            "counterfactual %s finished: peak=%.2f @ %s, incidents=%d, dur=%ds",
            session_id,
            metrics.peak_density,
            metrics.peak_zone,
            metrics.incidents_would_occur,
            int(time.monotonic() - t0),
        )
    except asyncio.CancelledError:
        _write_summary(session_id, {
            "status": "stopped",
            "tick": engine.tick,
            "metrics": metrics.as_dict(),
            "stopped_at": firestore.SERVER_TIMESTAMP,
        })
        log.info("counterfactual %s cancelled at tick %d", session_id, engine.tick)
        raise
    finally:
        _sessions.pop(session_id, None)


def _write_summary(session_id: str, patch: dict[str, Any]) -> None:
    """Merge-write a partial summary dict onto /counterfactual/{session_id}."""
    db().collection("counterfactual").document(session_id).set(patch, merge=True)


# ---------------- FastAPI ----------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context. Cancels every active session task cleanly on shutdown."""
    yield
    # Best-effort cancel on shutdown
    for _sid, task in list(_sessions.items()):
        task.cancel()
        with suppress(Exception):
            await task


app = FastAPI(title="pulse-counterfactual", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, Any]:
    """Liveness endpoint; reports active session count."""
    return {
        "status": "ok",
        "service": "pulse-counterfactual",
        "project": PROJECT,
        "venue_id": VENUE_ID,
        "tick_interval_s": TICK_INTERVAL_S,
        "max_ticks": MAX_TICKS,
        "active_sessions": list(_sessions.keys()),
    }


@app.post("/start")
async def start(payload: dict[str, Any]) -> dict[str, Any]:
    """Begin a new counterfactual session keyed by session_id. Idempotent if already running."""
    session_id = (payload or {}).get("session_id", "").strip()
    if not session_id:
        raise HTTPException(400, "body must include non-empty 'session_id'")
    if session_id in _sessions and not _sessions[session_id].done():
        return {"status": "already_running", "session_id": session_id}

    task = asyncio.create_task(_run(session_id), name=f"cf-{session_id}")
    _sessions[session_id] = task
    return {"status": "started", "session_id": session_id}


@app.post("/stop")
async def stop(payload: dict[str, Any]) -> dict[str, Any]:
    """Cancel an in-flight counterfactual session."""
    session_id = (payload or {}).get("session_id", "").strip()
    if not session_id:
        raise HTTPException(400, "body must include non-empty 'session_id'")
    task = _sessions.get(session_id)
    if not task:
        return {"status": "not_found", "session_id": session_id}
    task.cancel()
    with suppress(Exception):
        await task
    return {"status": "stopped", "session_id": session_id}


@app.get("/status")
def status(session_id: str | None = None) -> dict[str, Any]:
    """Return per-session or global active-session state."""
    if session_id:
        task = _sessions.get(session_id)
        running = bool(task and not task.done())
        return {"session_id": session_id, "running": running}
    return {
        "active_sessions": [
            {"session_id": sid, "running": not t.done()}
            for sid, t in _sessions.items()
        ]
    }

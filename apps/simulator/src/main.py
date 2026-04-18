"""PULSE simulator service.

Emits synthetic turnstile, PoS, restroom, density, and anomaly events to the
`sensor-events` Pub/Sub topic on a 1-second tick, following a scripted YAML
timeline. Headless on Cloud Run apart from a /healthz endpoint.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import random
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI
from google.cloud import pubsub_v1

from .emitters.turnstile import emit_turnstile
from .emitters.pos import emit_pos
from .emitters.restroom import emit_restroom
from .emitters.cctv import emit_cctv_anomaly

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("simulator")

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "pulse-stadium-ai")
TOPIC = os.environ.get("PUBSUB_TOPIC_SENSOR_EVENTS", "sensor-events")
VENUE_ID = os.environ.get("PULSE_VENUE_ID", "chinnaswamy")
SCENARIO_FILE = os.environ.get("SCENARIO_FILE", "ipl_final.yaml")
TICK_MS = int(os.environ.get("TICK_INTERVAL_MS", "1000"))
AUTOSTART = os.environ.get("SCENARIO_AUTOSTART", "true").lower() == "true"
SCENARIOS_DIR = Path(__file__).parent / "scenarios"

_publisher = pubsub_v1.PublisherClient()
_topic_path = _publisher.topic_path(PROJECT, TOPIC)

state: dict[str, Any] = {
    "running": False,
    "ticks": 0,
    "session_id": None,
    "started_at": None,
    "scenario": None,
    "events_published": 0,
    "last_scripted_event": None,
    "topic": _topic_path,
}

_task: asyncio.Task | None = None


def publish(event: dict[str, Any]) -> None:
    event.setdefault("event_id", str(uuid.uuid4()))
    event.setdefault("venue_id", VENUE_ID)
    event.setdefault("session_id", state.get("session_id"))
    event.setdefault("timestamp", time.time())
    data = json.dumps(event, separators=(",", ":")).encode("utf-8")
    _publisher.publish(_topic_path, data, type=event.get("type", "unknown"))
    state["events_published"] += 1


def _poisson(lam: float) -> int:
    if lam <= 0:
        return 0
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= random.random()
        if p < L:
            return k - 1


def _emit_scripted(ev: dict[str, Any]) -> None:
    state["last_scripted_event"] = ev
    log.info("scripted_event t=%ss type=%s zone=%s", ev.get("t"), ev.get("type"), ev.get("zone"))
    kind = ev["type"]
    if kind == "density_spike":
        publish({
            "type": "density_delta",
            "zone_id": ev["zone"],
            "payload": {
                "density_p_per_m2": ev["value"],
                "reason": ev.get("reason", ""),
                "scripted": True,
            },
        })
    elif kind == "fan_query":
        publish({
            "type": "fan_query",
            "zone_id": ev.get("seat"),
            "payload": {
                "fan_id": ev["fan_id"],
                "seat": ev.get("seat"),
                "query": ev["query"],
                "modality": ev.get("modality", "text"),
                "scripted": True,
            },
        })
    elif kind == "anomaly":
        emit_cctv_anomaly(ev, publish)
    elif kind == "negotiation_trigger":
        publish({
            "type": "negotiation_trigger",
            "zone_id": None,
            "payload": {"reason": ev.get("reason", ""), "scripted": True},
        })
    elif kind == "resolution_metric":
        publish({
            "type": "resolution_metric",
            "zone_id": None,
            "payload": {
                "metrics": ev.get("metrics", {}),
                "reason": ev.get("reason", ""),
                "scripted": True,
            },
        })
    else:
        publish({"type": kind, "zone_id": ev.get("zone"), "payload": ev})


async def run_scenario() -> None:
    path = SCENARIOS_DIR / SCENARIO_FILE
    scenario = yaml.safe_load(path.read_text(encoding="utf-8"))

    state["session_id"] = str(uuid.uuid4())
    state["started_at"] = time.time()
    state["ticks"] = 0
    state["events_published"] = 0
    state["last_scripted_event"] = None
    state["scenario"] = scenario.get("name", SCENARIO_FILE)
    state["running"] = True

    base = scenario.get("base_rates", {})
    turnstile_per_s = float(base.get("turnstile_per_s", 3.0))
    pos_per_s = float(base.get("pos_per_s", 1.5))
    restroom_per_s = float(base.get("restroom_per_s", 0.5))

    zones = scenario.get("zones", {})
    gates = zones.get("gates", ["G-1", "G-2", "G-3", "G-4"])
    concessions = zones.get("concessions", ["F-E", "F-W"])
    restrooms = zones.get("restrooms", ["C-01", "C-12"])

    events = sorted(scenario.get("events", []), key=lambda e: e["t"])
    duration = int(scenario.get("duration_s", 300))

    log.info(
        "scenario_start name=%r session=%s events=%d duration=%ss topic=%s",
        state["scenario"], state["session_id"], len(events), duration, _topic_path,
    )

    publish({
        "type": "scenario_start",
        "zone_id": None,
        "payload": {"name": state["scenario"], "duration_s": duration},
    })

    t0 = time.monotonic()
    next_idx = 0
    try:
        while state["running"] and (time.monotonic() - t0) < duration:
            t = time.monotonic() - t0

            for _ in range(_poisson(turnstile_per_s)):
                emit_turnstile(gates, publish)
            for _ in range(_poisson(pos_per_s)):
                emit_pos(concessions, publish)
            for _ in range(_poisson(restroom_per_s)):
                emit_restroom(restrooms, publish)

            while next_idx < len(events) and events[next_idx]["t"] <= t:
                _emit_scripted(events[next_idx])
                next_idx += 1

            state["ticks"] += 1
            await asyncio.sleep(TICK_MS / 1000)
    except asyncio.CancelledError:
        log.info("scenario cancelled at tick %d", state["ticks"])
        raise
    finally:
        state["running"] = False
        publish({
            "type": "scenario_end",
            "zone_id": None,
            "payload": {
                "events_published": state["events_published"],
                "ticks": state["ticks"],
            },
        })
        log.info(
            "scenario_end events_published=%d ticks=%d",
            state["events_published"], state["ticks"],
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _task
    if AUTOSTART:
        _task = asyncio.create_task(run_scenario(), name="scenario-runner")
    try:
        yield
    finally:
        state["running"] = False
        if _task and not _task.done():
            _task.cancel()
            try:
                await _task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="pulse-simulator", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "pulse-simulator",
        "project": PROJECT,
        "venue_id": VENUE_ID,
        "scenario": state.get("scenario"),
        "running": state.get("running", False),
        "ticks": state.get("ticks", 0),
        "events_published": state.get("events_published", 0),
        "last_scripted_event": state.get("last_scripted_event"),
        "topic": _topic_path,
    }


@app.post("/scenario/reset")
async def reset() -> dict[str, Any]:
    """Restart the scripted scenario from t=0."""
    global _task
    state["running"] = False
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = asyncio.create_task(run_scenario(), name="scenario-runner")
    return {"status": "restarting", "session_id": state.get("session_id")}

"""CCTV-synthesised anomaly emitter."""
from __future__ import annotations

from collections.abc import Callable
from typing import Any


def emit_cctv_anomaly(ev: dict[str, Any], publish: Callable[[dict[str, Any]], None]) -> None:
    publish({
        "type": "vision_anomaly",
        "zone_id": ev["zone"],
        "payload": {
            "anomaly_type": ev.get("anomaly_type", "unknown"),
            "severity": ev.get("severity", "medium"),
            "confidence": ev.get("confidence", 0.90),
            "reason": ev.get("reason", ""),
            "scripted": True,
        },
    })

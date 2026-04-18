"""Tools available to the Queue Agent.

Queue state is stubbed in-module for phase 2; phase 3+ will migrate to
a `/venues/{id}/queues/{queue_id}` collection with live wait forecasts.
"""
from __future__ import annotations

from typing import Any

from ..state.firestore_client import Intervention, add_intervention

_STUB_QUEUES: dict[str, dict[str, Any]] = {
    "gate-4-bar": {"zone": "F-W", "wait_s": 90, "staff": 2, "items": ["beer"]},
    "gate-5-bar": {"zone": "F-E", "wait_s": 240, "staff": 2, "items": ["beer"]},
    "stand-b-food": {"zone": "F-E", "wait_s": 180, "staff": 3, "items": ["biryani", "samosa"]},
    "stand-a-food": {"zone": "F-W", "wait_s": 60, "staff": 3, "items": ["samosa", "popcorn"]},
    "c-01-restroom": {"zone": "C-01", "wait_s": 75, "staff": 0, "items": ["restroom"]},
    "c-12-restroom": {"zone": "C-12", "wait_s": 150, "staff": 0, "items": ["restroom"]},
}


def _match_category(q: dict[str, Any], category: str) -> bool:
    cat = category.lower()
    items = [i.lower() for i in q.get("items", [])]
    return cat in items or any(cat in i or i in cat for i in items)


def find_nearest(fan_id: str, seat: str, category: str) -> dict[str, Any]:
    candidates = [
        {"queue_id": qid, **q}
        for qid, q in _STUB_QUEUES.items()
        if _match_category(q, category)
    ]
    candidates.sort(key=lambda c: c["wait_s"])
    return {
        "ok": True,
        "data": {
            "fan_id": fan_id,
            "seat": seat,
            "category": category,
            "candidates": candidates[:3],
        },
    }


def get_queue_state(queue_id: str) -> dict[str, Any]:
    q = _STUB_QUEUES.get(queue_id)
    if not q:
        return {"ok": False, "error": f"queue {queue_id} unknown"}
    return {"ok": True, "data": {"queue_id": queue_id, **q}}


def nudge_fans(
    zone_ids: list[str], queue_id: str, alt_queue_id: str, reason: str
) -> dict[str, Any]:
    iid = add_intervention(
        Intervention(
            initiating_agent="queue",
            action="nudge_fans",
            target=f"{queue_id}->{alt_queue_id}",
            reason=reason,
            metadata={"zone_ids": zone_ids},
        )
    )
    return {
        "ok": True,
        "data": {"intervention_id": iid, "from": queue_id, "to": alt_queue_id},
    }

"""Tools available to the Concierge Agent.

Fan profiles + match state are stubbed in-module for phase 2. Phase 4 wires
in real Cricinfo polling and a per-fan `/fans/{id}` Firestore collection.
"""
from __future__ import annotations

from typing import Any

_FAN_PROFILES: dict[str, dict[str, Any]] = {
    "raj-b-204": {
        "display_name": "Raj",
        "seat": "B-204",
        "preferences": {
            "food": ["beer", "samosa"],
            "language": "en",
            "accessibility": [],
        },
    },
}

_MATCH_STATE: dict[str, Any] = {
    "match_id": "RCB_vs_CSK_2026_final",
    "home_team": "RCB",
    "away_team": "CSK",
    "innings": 2,
    "over": 18.3,
    "on_strike": "Kohli",
    "non_striker": "Patidar",
    "score": "RCB 152/3",
    "required_rr": 9.5,
    "end_of_over_in_s": 45,
}


def get_fan_context(fan_id: str) -> dict[str, Any]:
    profile = _FAN_PROFILES.get(fan_id)
    if not profile:
        return {"ok": False, "error": f"fan {fan_id} unknown"}
    return {"ok": True, "data": profile}


def get_match_state() -> dict[str, Any]:
    return {"ok": True, "data": _MATCH_STATE}

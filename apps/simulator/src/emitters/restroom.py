"""Restroom emitter — simulates occupancy deltas."""
from __future__ import annotations

import random
from collections.abc import Callable
from typing import Any


def emit_restroom(restrooms: list[str], publish: Callable[[dict[str, Any]], None]) -> None:
    """Emit a restroom occupancy delta for a random restroom zone."""
    if not restrooms:
        return
    zone = random.choice(restrooms)
    # Biased toward positive (more people entering than leaving during a match)
    delta = random.choices([1, 1, 1, -1], k=1)[0]
    publish({
        "type": "restroom_count",
        "zone_id": zone,
        "payload": {
            "delta": delta,
            "gender_stall": random.choice(["m", "m", "f", "f", "acc"]),
        },
    })

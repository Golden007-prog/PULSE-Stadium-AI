"""Turnstile emitter — simulates gate entries."""
from __future__ import annotations

import random
from collections.abc import Callable
from typing import Any


def emit_turnstile(gates: list[str], publish: Callable[[dict[str, Any]], None]) -> None:
    """Emit a single turnstile entry scan at a randomly-picked gate (G-3 weighted higher for natural congestion)."""
    if not gates:
        return
    # weight Gate 3 slightly higher to produce natural congestion at that gate
    weights = [1.0 + (0.5 if g == "G-3" else 0.0) for g in gates]
    gate = random.choices(gates, weights=weights, k=1)[0]
    publish({
        "type": "turnstile_scan",
        "zone_id": gate,
        "payload": {
            "direction": "in",
            "delta": 1,
            "ticket_tier": random.choice(["general", "general", "general", "premium", "corp"]),
        },
    })

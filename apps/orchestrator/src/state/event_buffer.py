"""In-memory buffer of recent Pub/Sub signals.

The tick loop reads the buffer; the Pub/Sub subscriber writes to it. A single
process-wide singleton keeps the code simple for the hackathon. If we later
scale to >1 Cloud Run instance this buffer moves to Redis.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EventBuffer:
    attendance: int = 0
    zone_counts: dict[str, int] = field(default_factory=dict)
    fan_queries: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=50))
    anomalies: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=50))
    alerts: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=50))
    last_scripted: dict[str, Any] | None = None


BUFFER = EventBuffer()

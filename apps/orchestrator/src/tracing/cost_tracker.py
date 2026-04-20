"""Per-invocation cost tracker.

Accumulates token counts + USD cost per ADK invocation and exposes a
process-wide running total. Ported in spirit from Golden's Bruhworking
project — simplified to just the two Gemini 2.5 tiers PULSE uses.

Pricing is published Vertex AI rates; kept here as a single source of truth
so we can update in one place when rates change.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

# USD per million tokens. Vertex AI published rates for Gemini 2.5 family.
PRICING: dict[str, dict[str, float]] = {
    "gemini-2.5-pro": {"input_per_m": 1.25, "output_per_m": 10.00},
    "gemini-2.5-flash": {"input_per_m": 0.30, "output_per_m": 2.50},
    "gemini-2.5-flash-live": {"input_per_m": 0.30, "output_per_m": 2.50},
    "default": {"input_per_m": 1.00, "output_per_m": 5.00},
}


def calc_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Compute USD cost for a model tier at the given input + output token counts."""
    p = PRICING.get(model, PRICING["default"])
    return (input_tokens / 1_000_000.0) * p["input_per_m"] + \
           (output_tokens / 1_000_000.0) * p["output_per_m"]


@dataclass
class InvocationTrace:
    """One ADK invocation with its timings, token counts, cost, and composed chain."""
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    root_agent: str = "orchestrator"
    model: str = "gemini-2.5-pro"
    tag: str = ""
    invocation_chain: list[str] = field(default_factory=list)
    inputs: dict[str, Any] = field(default_factory=dict)
    outputs: dict[str, Any] = field(default_factory=dict)
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    started_at: float = field(default_factory=time.time)
    duration_ms: int = 0

    def mark_done(self) -> None:
        """Close the invocation: stamp duration_ms and compute cost_usd from the pricing table."""
        self.duration_ms = int((time.time() - self.started_at) * 1000)
        self.cost_usd = calc_cost(self.model, self.input_tokens, self.output_tokens)


_TOTAL_USD: float = 0.0
_TOTAL_INVOCATIONS: int = 0


def record(cost_usd: float) -> float:
    """Add a completed invocation cost to the running process-wide total; returns the new total."""
    global _TOTAL_USD, _TOTAL_INVOCATIONS
    _TOTAL_USD += cost_usd
    _TOTAL_INVOCATIONS += 1
    return _TOTAL_USD


def total_usd() -> float:
    """Return the cumulative USD cost recorded this process."""
    return _TOTAL_USD


def total_invocations() -> int:
    """Return the cumulative count of invocations recorded this process."""
    return _TOTAL_INVOCATIONS

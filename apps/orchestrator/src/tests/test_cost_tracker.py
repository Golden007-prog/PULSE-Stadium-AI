"""Tests for the Vertex AI cost tracker.

The tracker converts Gemini 2.5 token counts into USD and keeps a
process-wide running total consumed by the ``pulse-orchestrator``'s
budget-pause logic.
"""
from __future__ import annotations

from src.tracing.cost_tracker import (
    PRICING,
    InvocationTrace,
    calc_cost,
    record,
    total_invocations,
    total_usd,
)


def test_pricing_table_has_all_tiers_used_in_production() -> None:
    """Pricing table has all tiers used in production."""
    for tier in ("gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-live"):
        assert tier in PRICING
        assert PRICING[tier]["input_per_m"] > 0
        assert PRICING[tier]["output_per_m"] > PRICING[tier]["input_per_m"]


def test_calc_cost_uses_tier_rate() -> None:
    # gemini-2.5-flash: $0.30 input / $2.50 output per M tokens
    """Calc cost uses tier rate."""
    cost = calc_cost("gemini-2.5-flash", input_tokens=1_000_000, output_tokens=0)
    assert cost == 0.30

    cost = calc_cost("gemini-2.5-flash", input_tokens=0, output_tokens=1_000_000)
    assert cost == 2.50


def test_calc_cost_falls_back_to_default_for_unknown_model() -> None:
    """Calc cost falls back to default for unknown model."""
    cost = calc_cost("made-up-model", input_tokens=2_000_000, output_tokens=0)
    # default is $1.00/M input
    assert cost == PRICING["default"]["input_per_m"] * 2


def test_invocation_trace_mark_done_computes_duration_and_cost() -> None:
    """Invocation trace mark done computes duration and cost."""
    trace = InvocationTrace(
        model="gemini-2.5-pro",
        input_tokens=10_000,
        output_tokens=500,
    )
    trace.mark_done()
    # duration_ms must be populated
    assert trace.duration_ms >= 0
    # cost = (10k * 1.25 + 500 * 10.00) / 1M
    expected = (10_000 * 1.25 + 500 * 10.00) / 1_000_000
    assert trace.cost_usd == expected


def test_record_accumulates_total_usd_and_invocations() -> None:
    # Snapshot the starting totals since the tracker is module-global.
    """Record accumulates total usd and invocations."""
    start_usd = total_usd()
    start_invocations = total_invocations()

    new_total = record(0.00123)
    assert abs(new_total - (start_usd + 0.00123)) < 1e-9
    assert total_invocations() == start_invocations + 1

    record(0.005)
    assert abs(total_usd() - (start_usd + 0.00623)) < 1e-9
    assert total_invocations() == start_invocations + 2


def test_trace_id_is_unique_per_invocation() -> None:
    """Trace id is unique per invocation."""
    seen: set[str] = set()
    for _ in range(5):
        seen.add(InvocationTrace().trace_id)
    assert len(seen) == 5


def test_model_pricing_pro_is_more_expensive_than_flash() -> None:
    """Model pricing pro is more expensive than flash."""
    flash_cost = calc_cost("gemini-2.5-flash", 100_000, 100_000)
    pro_cost = calc_cost("gemini-2.5-pro", 100_000, 100_000)
    assert pro_cost > flash_cost
    # Pro is roughly 4x Flash on combined input+output rate
    assert pro_cost / flash_cost > 3

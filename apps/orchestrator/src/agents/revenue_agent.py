"""Revenue Agent — dynamic pricing + compensating offers."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from ..tools.revenue_tools import (
    adjust_stall_price,
    log_revenue_mitigation,
    push_targeted_offer,
)

_PROMPT = (
    Path(__file__).resolve().parent.parent / "prompts" / "revenue.md"
).read_text(encoding="utf-8")

revenue_agent = LlmAgent(
    name="revenue",
    model=os.environ.get("VERTEX_MODEL_SPECIALIST", "gemini-2.5-flash"),
    description=(
        "Dynamic pricing + compensating offers specialist. Call immediately "
        "after any Flow closure or Queue-triggered disruption to mitigate "
        "vendor impact with targeted fan offers."
    ),
    instruction=_PROMPT,
    tools=[push_targeted_offer, log_revenue_mitigation, adjust_stall_price],
)

"""Concierge Agent — per-fan voice/chat assistant."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from ..tools.concierge_tools import get_fan_context, get_match_state

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "concierge.md").read_text(
    encoding="utf-8"
)

concierge_agent = LlmAgent(
    name="concierge",
    model=os.environ.get("VERTEX_MODEL_SPECIALIST", "gemini-2.5-flash"),
    description=(
        "Per-fan assistant. Call to answer a fan query — the Concierge looks up "
        "the fan's profile, checks match state, and may ask the queue agent for "
        "the nearest F&B queue."
    ),
    instruction=_PROMPT,
    tools=[get_fan_context, get_match_state],
)

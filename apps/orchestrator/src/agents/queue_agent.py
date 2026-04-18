"""Queue Agent — F&B + restroom wait specialist."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from ..tools.queue_tools import find_nearest, get_queue_state, nudge_fans

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "queue.md").read_text(
    encoding="utf-8"
)

queue_agent = LlmAgent(
    name="queue",
    model=os.environ.get("VERTEX_MODEL_SPECIALIST", "gemini-2.5-flash"),
    description=(
        "F&B and restroom wait specialist. Call to find the nearest queue for a "
        "category (beer/food/restroom) and nudge fans away from long waits."
    ),
    instruction=_PROMPT,
    tools=[find_nearest, get_queue_state, nudge_fans],
)

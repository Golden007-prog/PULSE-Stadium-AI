"""Care Agent — medical + accessibility + lost-child specialist."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from ..tools.care_tools import (
    dispatch_medical,
    register_lost_child,
    request_flow_clearance,
    route_ambulance,
)

_PROMPT = (
    Path(__file__).resolve().parent.parent / "prompts" / "care.md"
).read_text(encoding="utf-8")

care_agent = LlmAgent(
    name="care",
    model=os.environ.get("VERTEX_MODEL_SPECIALIST", "gemini-2.5-flash"),
    description=(
        "Medical / accessibility / lost-child specialist. Call when a vision "
        "anomaly with severity >= high is reported, or when a fan or staff "
        "message mentions injury, collapse, or a missing person."
    ),
    instruction=_PROMPT,
    tools=[
        dispatch_medical,
        route_ambulance,
        request_flow_clearance,
        register_lost_child,
    ],
)

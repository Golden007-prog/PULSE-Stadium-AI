"""Flow Agent — PULSE's crowd-movement specialist."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from ..tools.flow_tools import (
    close_concourse,
    compute_route,
    get_zone_density,
    list_all_zones,
    mark_zone_resolved,
    predict_zone_density,
    reroute_fans,
    update_signage,
)

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "flow.md").read_text(
    encoding="utf-8"
)

flow_agent = LlmAgent(
    name="flow",
    model=os.environ.get("VERTEX_MODEL_SPECIALIST", "gemini-2.5-flash"),
    description=(
        "Crowd density prediction and flow specialist. Call when a zone is at or above "
        "4 p/m². Writes signage / reroute / closure interventions to Firestore."
    ),
    instruction=_PROMPT,
    tools=[
        get_zone_density,
        predict_zone_density,
        compute_route,
        close_concourse,
        update_signage,
        reroute_fans,
        mark_zone_resolved,
        list_all_zones,
    ],
)

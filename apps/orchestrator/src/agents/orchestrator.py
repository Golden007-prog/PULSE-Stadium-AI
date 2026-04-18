"""Root Orchestrator Agent — routes to specialists via LLM-driven delegation."""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent

from .concierge_agent import concierge_agent
from .flow_agent import flow_agent
from .queue_agent import queue_agent

_PROMPT = (
    Path(__file__).resolve().parent.parent / "prompts" / "orchestrator.md"
).read_text(encoding="utf-8")

orchestrator_agent = LlmAgent(
    name="orchestrator",
    model=os.environ.get("VERTEX_MODEL_ORCHESTRATOR", "gemini-2.5-pro"),
    description=(
        "PULSE root agent. Reads venue snapshots and fan queries, decides whether "
        "to act, and delegates to the right specialist (flow / queue / concierge)."
    ),
    instruction=_PROMPT,
    sub_agents=[flow_agent, queue_agent, concierge_agent],
)

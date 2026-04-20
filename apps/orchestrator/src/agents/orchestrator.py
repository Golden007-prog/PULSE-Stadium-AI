"""Root Orchestrator Agent — explicit AgentTool invocation per Idea.md §6.4.

Each specialist is wrapped as an `AgentTool` so the orchestrator can call
them sequentially in a single invocation (e.g. care → flow → revenue
for a medical negotiation) and still produce one composed final reply.
"""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from .care_agent import care_agent
from .concierge_agent import concierge_agent
from .flow_agent import flow_agent
from .queue_agent import queue_agent
from .revenue_agent import revenue_agent

_PROMPT = (
    Path(__file__).resolve().parent.parent / "prompts" / "orchestrator.md"
).read_text(encoding="utf-8")

# Each AgentTool lets the root orchestrator call the specialist as a
# function — control stays at the top, giving us visible negotiation
# chains instead of a single hand-off.
orchestrator_agent = LlmAgent(
    name="orchestrator",
    model=os.environ.get("VERTEX_MODEL_ORCHESTRATOR", "gemini-2.5-pro"),
    description=(
        "PULSE root agent. Reads venue snapshots and fan queries, decides "
        "whether to act, and composes a negotiation across specialists "
        "(care → flow → revenue for medical, flow → revenue for closures, "
        "concierge + queue for fans)."
    ),
    instruction=_PROMPT,
    tools=[
        AgentTool(agent=flow_agent),
        AgentTool(agent=queue_agent),
        AgentTool(agent=concierge_agent),
        AgentTool(agent=care_agent),
        AgentTool(agent=revenue_agent),
    ],
)

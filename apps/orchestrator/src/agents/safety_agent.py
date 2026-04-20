"""Safety Agent — phase-6 placeholder.

Specified in ``Idea.md`` §6.3.5. When the Gemini 2.5 Vision perception
pipeline lands post-hackathon this module will expose a Gemini 2.5 Pro
``LlmAgent`` that:

* reads ``/vision_anomalies/{id}`` documents written by the perception
  service,
* classifies each anomaly (``fight | fall | crush-formation | other``)
  with a confidence score,
* escalates to the Care Agent for severity ``>=`` medium, or to human
  stadium authorities for severity ``>=`` critical,
* records every classification to ``/agent_traces`` with its decision
  rationale.

Until then the Care Agent (:mod:`..agents.care_agent`) handles
vision_anomaly events of severity ``high+`` directly — see the README's
"Assumptions made" section.

No public exports yet; the orchestrator's roster UI greys out the Safety
tile based on this module's absence of an ``LlmAgent``.
"""
from __future__ import annotations

__all__: list[str] = []

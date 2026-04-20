"""Safety Agent tools — phase-6 placeholder.

Companion to :mod:`..agents.safety_agent`. The post-hackathon Gemini 2.5
Pro Vision pipeline will expose the following tools here per
``Idea.md`` §6.3.5:

* ``get_recent_anomalies(window_s: int) -> list[Anomaly]``
* ``classify_anomaly(anomaly_id: str) -> Classification``
* ``trigger_pa_announcement(zone_id: str, message: str) -> bool``
* ``escalate_to_authorities(incident_id: str, authority_type: str) -> bool``
* ``log_near_miss(description: str, zone_id: str) -> bool``

Until the tools land, high-severity vision anomalies are routed through
the Care Agent as specified in the Orchestrator's prompt.
"""
from __future__ import annotations

__all__: list[str] = []

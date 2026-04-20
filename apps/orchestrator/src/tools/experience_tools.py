"""Experience Agent tools — phase-6 placeholder.

Companion to :mod:`..agents.experience_agent`. Planned signatures per
``Idea.md`` §6.3.6:

* ``get_match_state() -> MatchState``
* ``get_fan_profile(fan_id: str) -> FanProfile``
* ``push_jumbotron(fan_id: str, duration_s: int) -> bool``
* ``send_delight_push(fan_id: str, content_template: str) -> bool``
* ``detect_milestones() -> list[Milestone]``

Until the tools land, the Fan PWA's Nudges tab uses seeded demo cards
from ``apps/fan-pwa/src/components/NudgesScreen.tsx``.
"""
from __future__ import annotations

__all__: list[str] = []

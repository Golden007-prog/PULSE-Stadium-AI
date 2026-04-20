"""Experience Agent — phase-6 placeholder.

Specified in ``Idea.md`` §6.3.6. Post-hackathon this module will expose
a Gemini 2.5 Flash ``LlmAgent`` that:

* subscribes to match-state milestones (century, hat-trick, record),
* cross-references fan profiles + seats from Firestore,
* pushes personalised nudges via FCM to a random sample of relevant
  fans ("Kohli just hit a 50 — your jersey is 40% off for the next
  10 minutes"),
* writes a jumbotron entry for fans with a public-profile opt-in whose
  birthday falls on the match day.

Until then the Fan PWA's Nudges screen is seeded with hand-crafted demo
cards (see ``apps/fan-pwa/src/components/NudgesScreen.tsx``).

No public exports yet; the orchestrator's roster UI greys out the
Experience tile based on this module's absence of an ``LlmAgent``.
"""
from __future__ import annotations

__all__: list[str] = []

# Capturing docs/hero.png

The README links to a `docs/hero.png` that I can't capture from this
headless shell. Steps (60 seconds in your browser):

1. Open <https://pulse-frontend-524510164011.asia-south1.run.app>
   in a desktop Chrome window at 1440×900 or wider.
2. Click **▶ Watch the 2026 IPL final →**.
3. Wait ~60 seconds until the medical chain fires (around T+60 s):
   the right pane shows the `orchestrator → care → flow → revenue`
   chain, Gate 3 turns amber then resolves, and Concourse South turns
   red briefly.
4. Click **▶ run counterfactual** in the top-right of the centre
   column so the split-screen activates.
5. Take a full-window screenshot (Chrome DevTools → cmd/ctrl-shift-P
   → "Capture full size screenshot", or your OS's native capture).
6. Crop to 16:9 if needed. Target width ≥ 1600 px. Save as
   `docs/hero.png`.

The frame that reads best for the GitHub README is one where:
- the reality twin (left) shows a reddish G-3 or C-12 while the rest is green,
- the counterfactual twin (right) is clearly more saturated + purple-tinted,
- the trace panel on the right shows at least two chained rows (e.g.
  `orchestrator → care → flow → revenue` and a fan-query row), and
- the delta metrics strip under the twins is visible with JetBrains
  Mono numbers.

Once you drop `hero.png` into `docs/`, the README renders it at the
top. No code change needed.

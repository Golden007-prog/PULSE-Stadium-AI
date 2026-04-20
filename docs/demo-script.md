# Demo script — 90 seconds for a judge

The judge lands on the public frontend and clicks one button. This script is the exact timeline the 90-second auto-play writes to Firestore.

Source of truth: [public/scripted-responses/ipl-final-2026.json](../apps/frontend/public/scripted-responses/ipl-final-2026.json) — 23 events over 90,000 ms. The scheduler in [src/lib/autoplay.ts](../apps/frontend/src/lib/autoplay.ts) fires each via `POST /api/scripted/fire`, which writes Firestore through `firebase-admin`. **Zero Gemini cost per run, byte-for-byte reproducible.**

## Landing (0:00 — 0:05)

Judge opens https://pulse-frontend-524510164011.asia-south1.run.app.

- Giant cyan headline: **PULSE_ — the self-aware stadium.**
- Sub: *"One multi-agent AI. 40,000 fans. Real-time. Built on Google ADK 2.5, Gemini 2.5, and Cloud Run — solo, in 48 hours."*
- Primary CTA: **▶ Watch the 2026 IPL final →**. Secondary: *Explore ops console* · *Try the fan PWA*.

Click **Watch**. A fresh `run_id` is generated; reality zones seed to the scripted baseline; a counterfactual session starts in parallel. Navigate to `/ops?autoplay=true&run=<run_id>`.

## Ops console loads (0:05 — 0:15)

- Top bar: match ticker (RCB 152/3 · over 18.3 · Kohli on strike · attendance live-counting).
- Left pane: agent roster — cyan/green/amber/purple dots for the 5 live agents; safety + experience greyed out with "phase 6" tag.
- Centre: slowly-rotating 3D stadium twin, 12 extruded zones colour-ramped by density.
- Right: empty trace panel with a subtle "waiting for first invocation…" ghost.
- Bottom: **AutoPlayBanner** — pulsing cyan dot, "demo playing · T+00:00 / T+01:30", progress bar.

## Gate-3 density spike (0:10 — 0:25)

- **T+02 s:** G-3 density climbs to 2.4 p/m².
- **T+08 s:** 3.8 p/m² — amber on the twin.
- **T+12 s:** 5.2 p/m² — the bottleneck alert fires. Zone pulses red.
- **T+16 s:** trace panel snaps in a new row: `orchestrator → flow` · `tick` · *"Flow rerouted 400 fans from G-3 to G-4 with signage update. Projected density drop on G-3 to ~3.2 p/m² by T+6min."*
- **T+17–18.5 s:** two interventions land — `update_signage` + `reroute_fans` — visible as floating cards above the twin.
- **T+21 s:** G-3 falls to 3.2 p/m² (post-reroute). Ambient calm restored.
- **T+22 s:** G-4 nudges to 2.6 p/m² (receiving the reroute).

**Narration:** *"This is Flow Agent catching a crush risk 12 minutes before it would have cascaded. The counterfactual toggle in the top-right shows what would have happened if we'd done nothing."* (Operator would toggle; in auto-play the split-screen is optional but recommended.)

## Fan `beer?` voice query (0:35 — 0:40)

- **T+35 s:** a new fan-query bubble appears in the trace panel header.
- **T+38.5 s:** `orchestrator → concierge` trace row streams in: `fan_query` · *"Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"*. The quotation is the literal model output from the live Concierge; here it's the cached version.

**Narration:** *"One fan asked 'beer?'. The Concierge checked his seat and the current over, consulted the Queue agent, and replied in natural prose — 11 words, end-with-next-action."*

## Medical fall at Concourse South (0:50 — 1:10)

- **T+50 s:** C-12 density elevates to 2.8 — bystanders gathering.
- **T+55 s:** **`vision_anomaly`** pulses red on C-12. Severity: **high**. Confidence: **0.93**.
- **T+58 s:** `care: dispatch_medical → C-12` — ambulance incident created.
- **T+59.5 s:** `care: request_flow_clearance → C-12` — Care asks Flow to close the concourse.
- **T+60.5 s:** `care: route_ambulance → C-12 → G-4` — ambulance path committed.
- **T+63 s:** `flow: close_concourse → C-12` — Flow signs off on the 4-minute closure.
- **T+65 s:** `flow: reroute_fans → C-12 → C-01` — 240 fans redirected.
- **T+67.5 s:** `revenue: push_targeted_offer` — ₹50-off beer coupon to displaced fans.
- **T+69 s:** `revenue: log_mitigation` — ₹3,200 estimated lost sales booked.
- **T+70 s:** one composite trace row lands: `orchestrator → care → flow → revenue` · `negotiation` · *"Medical unit dispatched to C-12 for fall (severity high). Flow closed C-12 for 4 minutes and rerouted 240 fans to C-01. Revenue pushed a ₹50-off beer coupon to ~240 displaced fans; ₹3,200 estimated lost sales mitigated."*
- **T+75–76 s:** C-12 falls to 0.5 (closed), C-01 climbs to 2.6 (absorbing the reroute).

**Narration:** *"This is the visible agent negotiation — Care asked Flow, Flow asked Revenue, all in one ADK invocation via the AgentTool pattern. Eight Firestore documents written across three specialists in 12 seconds."*

## Metrics card (1:25 — 1:30)

- **T+85 s:** `finale` event writes `/demo_runs/<run_id>` with final metrics.
- **T+90 s:** MetricsCard fades in:
  - **−47 %** avg wait
  - **−38 %** peak density
  - **7** incidents prevented
  - **+18 %** F&B revenue
  - **195 s** medical response

Footer: *"one solo dev · 48 hours · asia-south1"* · *"ADK 2.5 · Gemini 2.5 · Cloud Run"* · *github.com/Golden007-prog/PULSE-Stadium-AI*. Primary CTA: **Try it yourself →** — dismisses the card, drops URL params, leaves the CF session running so the judge can freely explore.

## Judge hand-off (1:30 onwards)

- **Counterfactual toggle** remains enabled — operator can show the split-screen at any point.
- **Reset Scenario** in the playback bar re-runs the 90-second sequence with a new `run_id`.
- **Fan PWA** (separate URL) — Raj's chat already has the first Concierge reply cached; judge can type `restroom?` and see the same chain fire live on Gemini (this one *does* spend).

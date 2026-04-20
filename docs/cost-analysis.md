# Cost analysis

PULSE ran for ~48 h across seven build phases on Vertex AI's Gemini 2.5 family. This doc captures both the observed spend and the cost envelope for a production deployment.

## 48-hour build spend

| Phase | Approx. spend | Notes |
|---|---:|---|
| 0 — 1 | $0.00 | no LLM calls — infra + scripted events |
| 2 | $0.031 | 4 region-fail invocations + 2 successful smoke tests |
| 3 | $0.039 | orchestrator kept ticking during frontend verification |
| 4 | $0.015 | fan-PWA "beer?" end-to-end + a couple of spurious density re-fires |
| 5.1 | $0.014 | two concierge-prose iterations |
| 5.2 | ≈ $0.00 | onSnapshot wiring — deploy-only |
| 5.3 | $0.00 | counterfactual is Gemini-free |
| 5.4 | $0.505 | tick loop re-fired G-3 during split-screen build; budget cap caught it at $0.512 |
| 5.5 | $0.024 | full `care → flow → revenue` chain tests |
| 6.1 — 6.2 | $0.00 | deterministic demo replay path + docs |
| **Total** | **≈ $0.63** | well under the $5 self-imposed stop-line |

Every invocation writes a row to `/agent_traces/{trace_id}` with its token counts and USD cost — the numbers above aggregate that collection.

## Per-invocation cost envelope

Observed on Gemini 2.5 Pro + 2.5 Flash in `us-central1`:

| Scenario | Tokens | Cost | Duration |
|---|---:|---:|---:|
| Orchestrator + Flow reroute | 8,990 | $0.01251 | 42 s |
| Orchestrator + Concierge `beer?` | 5,162 | $0.00700 | 16 s |
| Orchestrator + Concierge + Queue | 3,833 | $0.00538 | 12 s |
| Full medical chain (`care → flow → revenue`) | 5,085 | $0.00774 | 47 s |
| Scripted 90-s auto-play | 0 | $0.00 | 90 s |

## Model pricing ([tracing/cost_tracker.py](../apps/orchestrator/src/tracing/cost_tracker.py))

| Model | Input per M tokens | Output per M tokens |
|---|---:|---:|
| `gemini-2.5-pro` | $1.25 | $10.00 |
| `gemini-2.5-flash` | $0.30 | $2.50 |
| `gemini-2.5-flash-live` | $0.30 | $2.50 |

## Budget controls

- **Per-process cap.** `COST_BUDGET_PER_SESSION_USD=1.00` (see [orchestrator env](../deployments.md)). On cross-over, `main.py` sets `budget_paused=True` and the tick loop skips Gemini calls while still draining the Pub/Sub subscriber. Reset happens automatically on the next revision.
- **Model tier-split.** Only the root orchestrator uses 2.5 Pro. Five specialists run 2.5 Flash — roughly 10× cheaper per token.
- **Deterministic demo path.** The 90-second judge walkthrough never calls Gemini. A client-side scheduler reads a JSON timeline from [public/scripted-responses/ipl-final-2026.json](../apps/frontend/public/scripted-responses/ipl-final-2026.json) and POSTs each event to `/api/scripted/fire`, which writes Firestore directly via `firebase-admin`. Judges see byte-for-byte the same demo for $0.00 Gemini per run.
- **Cloud Run scale-to-zero** on `pulse-counterfactual` (Gemini-free anyway). `min-instances=1` on orchestrator + simulator + public web tier to keep the tick loop warm and cold-starts invisible.

## Production scaling — napkin math

For a 40 000-seat stadium with roughly 1-in-20 fans using the Concierge during a match (~2 000 active sessions):

- Average fan turn = 1 ask / 5 minutes × 120-minute match = 24 turns/fan
- Tokens/turn (observed) ≈ 4 000 (Flash) → 96 k tokens/fan over the match
- Bulk: 2 000 fans × 96 k = **192 M tokens/match**
- Cost at 2.5 Flash ($0.30 input + $2.50 output, ~50/50 split): `192M × 0.5 × (0.30 + 2.50) / 1M ≈ $269/match`

Add the orchestrator tick (12/min × 120 min = 1 440 invocations at ~5 000 tokens) ≈ **$75/match** on 2.5 Pro. Venue-layer cost per IPL match lands around **$350** — a rounding error against stadium F&B revenue, which this layer is designed to *lift* (+18 % per the counterfactual delta strip).

## What we did NOT spend on

- No fine-tuning, no Vertex AI Training, no Vector Search, no Matching Engine.
- No Gemini Live WebSocket usage (deferred; Web Speech covers the demo).
- No perception pipeline (deferred; simulator emits synthetic anomalies).
- No managed Cloud Scheduler (CricAPI polling deferred; frozen snapshot in code).

# Cloud Run deployments

Running list of PULSE service URLs. Updated after every deploy.

| Service | Region | URL | Revision | Last deploy |
|---|---|---|---|---|
| pulse-simulator | asia-south1 | https://pulse-simulator-bdyqmr2w3q-el.a.run.app | `pulse-simulator-00001-hhc` | 2026-04-18 12:35 UTC |
| pulse-orchestrator | asia-south1 | https://pulse-orchestrator-bdyqmr2w3q-el.a.run.app | `pulse-orchestrator-00004-b84` | 2026-04-18 13:20 UTC |
| pulse-frontend | asia-south1 | https://pulse-frontend-524510164011.asia-south1.run.app | `pulse-frontend-00001-fq5` | 2026-04-18 13:35 UTC |
| pulse-fan-pwa | asia-south1 | https://pulse-fan-pwa-524510164011.asia-south1.run.app | `pulse-fan-pwa-00001-lf5` | 2026-04-18 13:55 UTC |
| pulse-counterfactual | asia-south1 | https://pulse-counterfactual-524510164011.asia-south1.run.app | `pulse-counterfactual-00001-wfv` | 2026-04-18 14:35 UTC |
| pulse-perception | asia-south1 | _deferred post-hackathon_ | — | — |

## Notes

- All services are IAM-gated (`--no-allow-unauthenticated`); use `gcloud auth print-identity-token --audiences=<url>`.
- Endpoints named `/healthz` are **blocked by Google Front End** (reserved for GFE health checks). PULSE services expose `/health` instead.
- POSTs to Cloud Run need an explicit `Content-Length: 0` header when the body is empty (GFE returns HTTP 411 otherwise).
- `pulse-orchestrator` runs Vertex AI calls in `us-central1` because Gemini 2.5 Pro is not served in `asia-south1`. Compute stays in `asia-south1`.

## Simulator

- Service account: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`
- Scaling: `min=1, max=2`, concurrency 80, 512Mi / 1 vCPU
- Env: `SCENARIO_FILE=ipl_final.yaml`, `TICK_INTERVAL_MS=1000`, `SCENARIO_AUTOSTART=true`
- Reset scenario: `curl -X POST -H 'Authorization: Bearer <token>' -H 'Content-Length: 0' <url>/scenario/reset`

## Frontend (ops console)

- **Public** (`--allow-unauthenticated`) — this is the judge-facing URL.
- Scaling: `min=1, max=10`, concurrency 80, 1Gi / 1 vCPU, timeout 300s
- Env: `ORCHESTRATOR_URL`, `SIMULATOR_URL`, `PULSE_VENUE_ID=chinnaswamy`
- Routes:
  - `/` — landing page (big "Watch the 2026 IPL final" button)
  - `/ops` — ops console: agent roster (L) · 3D twin (center) · trace panel (R) · match ticker + playback bar
  - `/api/state` — Firestore venue + zones + interventions (server-side firebase-admin)
  - `/api/traces` — `/agent_traces` (most recent 30)
  - `/api/orchestrator` — proxy to `pulse-orchestrator/health`
  - `/api/sim/reset` — proxy POST to `pulse-simulator/scenario/reset`
- Built with Next.js 15 (App Router, `output: standalone`), React 18, Tailwind, React Three Fiber for the extruded-zone heatmap

## Fan PWA

- **Public, installable** (Web App Manifest at `/manifest.webmanifest`).
- 6 screens: onboarding → concierge (voice/text) → queues → wayfind → nudges → match.
- Voice input: browser Web Speech API (`SpeechRecognition` on Chrome/Edge/Android). Voice output: `speechSynthesis`. **Gemini Live WebSocket intentionally skipped** — plan called it "finicky from Cloud Run"; phase 6 can revisit.
- `POST /api/concierge` proxies to `pulse-orchestrator/trigger` with a fan-query prompt. End-to-end "beer?" confirmed: chain `orchestrator → concierge → queue`, 3.8k tokens, $0.005, 12s.
- Match state is a frozen 2024 IPL final snapshot at `/api/match`. CricAPI polling via Cloud Scheduler → Firestore deferred to phase 6.

## Counterfactual

- IAM-gated · min=0 max=2 · 512 Mi / 1 vCPU · Gemini-free.
- `POST /start {session_id}` snapshots current reality zones, then ticks a density-only ABS every 5 s (max 120 ticks = 10 min) with no intervention. Writes per-tick state to `/counterfactual/{id}/states/{tick}` and a rolling summary + metrics to `/counterfactual/{id}`.
- Adjacency + inflow model in [abs_engine.py](apps/counterfactual/src/abs_engine.py); east-side bottleneck (G-3 → S-B → C-12) primed to keep worsening so the split-screen divergence is visible.

## Orchestrator

- Service account: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`
- Scaling: `min=1, max=10`, concurrency 20, 1Gi / 1 vCPU, timeout 900s
- Vertex region: `us-central1`; compute region: `asia-south1`
- Pub/Sub sub (pre-created): `pulse-orchestrator-sensor-events` on topic `sensor-events`
- Cost budget per process: `COST_BUDGET_PER_SESSION_USD=0.50` (tick loop auto-pauses when reached)
- Agents active: Orchestrator (Gemini 2.5 Pro) + Flow / Queue / Concierge (Gemini 2.5 Flash). Care / Safety / Experience / Revenue placeholders ship in phase 5.

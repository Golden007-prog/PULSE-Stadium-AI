# Cloud Run deployments

Running list of PULSE service URLs. Updated after every deploy.

| Service | Region | URL | Revision | Last deploy |
|---|---|---|---|---|
| pulse-simulator | asia-south1 | https://pulse-simulator-524510164011.asia-south1.run.app | `pulse-simulator-00002-bgc` | 2026-04-20 17:59 UTC |
| pulse-orchestrator | asia-south1 | https://pulse-orchestrator-524510164011.asia-south1.run.app | `pulse-orchestrator-00011-52l` | 2026-04-20 18:04 UTC |
| pulse-counterfactual | asia-south1 | https://pulse-counterfactual-524510164011.asia-south1.run.app | `pulse-counterfactual-00002-wlc` | 2026-04-20 18:06 UTC |
| pulse-frontend | asia-south1 | https://pulse-frontend-524510164011.asia-south1.run.app | `pulse-frontend-00008-9cw` | 2026-04-20 18:08 UTC |
| pulse-fan-pwa | asia-south1 | https://pulse-fan-pwa-524510164011.asia-south1.run.app | `pulse-fan-pwa-00003-4r9` | 2026-04-20 18:13 UTC |
| pulse-perception | asia-south1 | _deferred post-hackathon_ | — | — |

## Cross-cutting notes

- All Cloud Run services are IAM-gated (`--no-allow-unauthenticated`) **except** the two public surfaces (`pulse-frontend` and `pulse-fan-pwa`). Server-to-server calls mint identity tokens via `google-auth-library`.
- Endpoints named `/healthz` are **blocked by Google Front End** (reserved path). PULSE services expose `/health` instead.
- POSTs to Cloud Run need an explicit `Content-Length: 0` header when the body is empty (GFE returns HTTP 411 otherwise).
- `pulse-orchestrator` runs Vertex AI calls in `us-central1` because Gemini 2.5 Pro is not served in `asia-south1`. Compute stays in `asia-south1`.
- Runtime service account for all services: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` with `run.admin`, `datastore.user`, `pubsub.publisher`, `pubsub.subscriber`, `bigquery.dataEditor`, `bigquery.jobUser`, `storage.objectAdmin`, `aiplatform.user`, `secretmanager.secretAccessor`, `logging.logWriter`.

## Frontend (ops console)

- **Public** (`--allow-unauthenticated`) — this is the judge-facing URL.
- Scaling: `min=1, max=10`, concurrency 80, 1 Gi / 1 vCPU, timeout 300 s.
- Env: `ORCHESTRATOR_URL`, `SIMULATOR_URL`, `COUNTERFACTUAL_URL`, `PULSE_VENUE_ID=chinnaswamy`.
- Routes:
  - `/` — landing with "▶ Watch the 2026 IPL final →" entry point.
  - `/ops` — ops console. Agent roster (L) · 3D twin (centre, split-screen when CF active) · trace panel (R) · match ticker + playback bar. Supports `?autoplay=true&run=<id>` for the scripted 90-second demo.
  - `/api/state`, `/api/traces`, `/api/orchestrator` — server-side Firestore reads + orchestrator health proxy (used for fallbacks; main UI now uses client `onSnapshot`).
  - `/api/sim/reset` — proxy POST to `pulse-simulator/scenario/reset`.
  - `/api/cf/start`, `/api/cf/stop` — proxy to `pulse-counterfactual`.
  - `/api/scenario/start` — generate demo run_id, seed reality baseline, start CF session.
  - `/api/scripted/fire` — server-side replay endpoint for the auto-play scheduler; writes Firestore directly via firebase-admin (zero-Gemini deterministic demo).
- Built with Next.js 15 (App Router, `output: standalone`), React 18, Tailwind 3, React Three Fiber 8 for the extruded-zone heatmap, Firebase Web SDK 11 for `onSnapshot` listeners.

## Fan PWA

- **Public, installable** (Web App Manifest at `/manifest.webmanifest`).
- 6 screens: onboarding → concierge (voice/text) → queues → wayfind → nudges → match.
- Voice input: browser Web Speech API (`SpeechRecognition` on Chrome/Edge/Android). Voice output: `speechSynthesis`. **Gemini Live WebSocket intentionally skipped** — plan called it "finicky from Cloud Run".
- `POST /api/concierge` proxies to `pulse-orchestrator/trigger`. End-to-end "beer?" confirmed at rev `pulse-orchestrator-00006-6lg`: chain `orchestrator → concierge`, 5,162 tokens, $0.007, 16 s, prose reply per spec.
- Match state is a frozen 2024 IPL final snapshot at `/api/match`. CricAPI polling deferred post-hackathon.

## Orchestrator

- Service account: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`.
- Scaling: `min=1, max=10`, concurrency 20, 1 Gi / 1 vCPU, timeout 900 s.
- Vertex region: `us-central1`; compute region: `asia-south1`.
- Pub/Sub sub (pre-created): `pulse-orchestrator-sensor-events` on topic `sensor-events`.
- Cost budget per process: `COST_BUDGET_PER_SESSION_USD=1.00` (tick loop auto-pauses when reached).
- **Five active agents** after phase 5.5: root Orchestrator (Gemini 2.5 Pro) with `AgentTool(Flow | Queue | Concierge | Care | Revenue)` (all Gemini 2.5 Flash). Safety + Experience are roster-only placeholders (deferred).
- Full negotiation chain verified at rev `pulse-orchestrator-00010-zbv`: a single invocation against a medical anomaly produced 8 Firestore interventions spanning `care → flow → revenue`, 5,085 tokens, $0.00774.

## Simulator

- Service account: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`.
- Scaling: `min=1, max=2`, concurrency 80, 512 Mi / 1 vCPU.
- Env: `SCENARIO_FILE=ipl_final.yaml`, `TICK_INTERVAL_MS=1000`, `SCENARIO_AUTOSTART=true`.
- Reset scenario: `curl -X POST -H 'Authorization: Bearer <token>' -H 'Content-Length: 0' <url>/scenario/reset`.

## Counterfactual

- IAM-gated · `min=0, max=2` · 512 Mi / 1 vCPU · **Gemini-free**.
- `POST /start {session_id}` snapshots current reality zones, then ticks a density-only ABS every 5 s (max 120 ticks = 10 min) with no intervention. Writes per-tick state to `/counterfactual/{id}/states/{tick:04d}` and a rolling summary + metrics to `/counterfactual/{id}`.
- Adjacency + inflow model in [apps/counterfactual/src/abs_engine.py](apps/counterfactual/src/abs_engine.py); east-side bottleneck (G-3 → S-B → C-12) primed to keep worsening so the split-screen divergence is visible.

## Auto-play demo run

- Run IDs are generated server-side with the format `demo-<base36_ts>-<r>`.
- Kick off via `POST /api/scenario/start {initial_zones: {...}}` — returns `{run_id, cf_started}`.
- Client scheduler reads `/scripted-responses/ipl-final-2026.json` (23 events, 90,000 ms) and POSTs each to `/api/scripted/fire` at the matching `at_ms`.
- Deterministic and **$0.00 Gemini** per demo run. The scripted replay writes Firestore directly — the orchestrator's tick loop stays idle because the simulator is not reset.

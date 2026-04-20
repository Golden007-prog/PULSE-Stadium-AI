# PULSE — build overview

> Snapshot as of **2026-04-18 16:00 UTC**, after phase 6.2.

## TL;DR

All **six planned Cloud Run services are live** in `asia-south1` under project `pulse-stadium-ai`. A 90-second deterministic auto-play is wired from the landing page through the ops console; the split-screen reality-vs-counterfactual twin plus the `orchestrator → care → flow → revenue` negotiation chain are both working. Cumulative Vertex AI spend: **≈ $0.63** — well under the $2 stop-line. What's left: Loom + LinkedIn draft (6.3) and the final smoke test (6.4).

## Live services

| Service | URL | State |
|---|---|---|
| **Ops console** (`pulse-frontend`) | https://pulse-frontend-524510164011.asia-south1.run.app | **public** · rev `00006-6s8` |
| **Fan PWA** (`pulse-fan-pwa`) | https://pulse-fan-pwa-524510164011.asia-south1.run.app | **public PWA** · rev `00001-lf5` |
| **Orchestrator** (`pulse-orchestrator`) | https://pulse-orchestrator-bdyqmr2w3q-el.a.run.app | IAM-gated · rev `00010-zbv` |
| **Simulator** (`pulse-simulator`) | https://pulse-simulator-bdyqmr2w3q-el.a.run.app | IAM-gated, headless · rev `00001-hhc` |
| **Counterfactual** (`pulse-counterfactual`) | https://pulse-counterfactual-524510164011.asia-south1.run.app | IAM-gated · rev `00001-wfv` |
| **Perception** (`pulse-perception`) | — | deferred post-hackathon |

## Architecture (what's actually running)

```
                 ┌─────────────────────────────────────────────┐
                 │   pulse-simulator   (Py 3.12 · FastAPI)     │
                 │   ipl_final.yaml scripted 1-second ticks    │
                 └───────────────┬─────────────────────────────┘
                                 │ Pub/Sub "sensor-events"
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  pulse-orchestrator  (Py 3.12 · ADK 1.x · AgentTool pattern) │
  │  ──────────────────────────────────────────────────────────  │
  │    subscriber → EventBuffer                                  │
  │    5s tick → Orchestrator LlmAgent (Gemini 2.5 Pro)          │
  │      tools=[AgentTool(flow), AgentTool(queue),               │
  │             AgentTool(concierge), AgentTool(care),           │
  │             AgentTool(revenue)]                              │
  │    Orchestrator composes negotiation chains in one           │
  │    invocation: care → flow → revenue for a medical anomaly,  │
  │    flow → revenue for a density spike, concierge + queue     │
  │    for fan queries.                                          │
  │    Writes /venues/../interventions  +  /agent_traces         │
  └──────────────┬─────────────────────────────┬────────────────┘
                 │ Firestore onSnapshot        │ /trigger (IAM)
                 ▼                             ▼
  ┌─────────────────────────────┐   ┌────────────────────────────┐
  │  pulse-frontend             │   │  pulse-fan-pwa             │
  │  Next 15 · R3F · Tailwind   │   │  Next 15 · Tailwind · PWA  │
  │  ops console + 3D twin      │   │  6 screens, voice chat     │
  │  + CF split-screen          │   │  + Web Speech API          │
  │  + 90s deterministic        │   │                            │
  │    auto-play                │   │                            │
  └──────────────┬──────────────┘   └────────────────────────────┘
                 │  onSnapshot (<500ms)
                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  pulse-counterfactual  (Py 3.12 · Gemini-free ABS)           │
  │  lightweight density-only simulator; runs alongside reality  │
  │  with all agent actions suppressed. Writes                   │
  │  /counterfactual/{session}/states/{tick:04d} and a rolling   │
  │  metrics summary for the split-screen + delta strip.         │
  └──────────────────────────────────────────────────────────────┘
```

### Data backbone

- **Firestore Native** `(default)` · asia-south1, reachable from browsers via `onSnapshot`.
  - `/venues/chinnaswamy` · 12 zones (GeoJSON-seeded polygons)
  - `/venues/chinnaswamy/zones/{G-1…G-4, S-A…S-D, C-01, C-12, F-E, F-W}` — live density
  - `/venues/chinnaswamy/interventions/{id}` — every agent tool write
  - `/agent_traces/{trace_id}` — token counts + USD cost per invocation
  - `/counterfactual/{session_id}` + `/counterfactual/{session_id}/states/{tick}` — ABS time series
  - `/demo_runs/{run_id}` — auto-play metadata, final metrics
  - `/fan_actions/{id}`, `/vision_anomalies/{id}` — scripted replay writes
- **Firestore security rules** ([infra/firestore.rules](infra/firestore.rules)): open read on `/venues/**`, `/agent_traces/**`, `/counterfactual/**`; all client writes blocked (server uses `firebase-admin` to bypass).
- **Firebase Web App** `PULSE Ops Console` · appId `1:524510164011:web:3a2a973bf02df862e8266e` · web config hardcoded in [firebase-client.ts](apps/frontend/src/lib/firebase-client.ts).
- **Pub/Sub** topics: `sensor-events`, `vision-frames`, `agent-events`, `fan-actions`, `staff-tasks`, `signage-updates` (each with a default sub; orchestrator has its own `pulse-orchestrator-sensor-events`).
- **BigQuery** dataset `pulse_analytics` · asia-south1 (streaming inserts post-hackathon).
- **GCS** bucket `pulse-cctv-clips` · asia-south1 (ready for perception service post-hackathon).

### IAM

Single runtime service account `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` carries 10 roles: `run.admin`, `datastore.user`, `pubsub.publisher`, `pubsub.subscriber`, `bigquery.dataEditor`, `bigquery.jobUser`, `storage.objectAdmin`, `aiplatform.user`, `secretmanager.secretAccessor`, `logging.logWriter`.

## Phase-by-phase status

### Phase 0 — infra bootstrap  ✅
GCP APIs enabled. Firestore Native, BigQuery dataset, GCS bucket, 6 Pub/Sub topics + default subs created. Monorepo scaffolded per [Idea.md §7](Idea.md#7-project-structure).

### Phase 1 — simulator + seed  ✅
12-zone [zones.geojson](packages/simulated-stadium-map/zones.geojson), [ipl_final.yaml](apps/simulator/src/scenarios/ipl_final.yaml) 300-second scripted timeline, [scripts/seed-firestore.ts](scripts/seed-firestore.ts) seeder (12 zone docs written). Deployed as `pulse-simulator`.

### Phase 2 — ADK orchestrator + 3 agents  ✅
ADK 1.x orchestrator with Flow / Queue / Concierge sub-agents. Pub/Sub subscriber + 5 s tick loop. Cost tracker with $0.50/process budget cap. Smoke test confirmed `orchestrator → flow` reroutes a 5.2 p/m² G-3 spike in 42 s, $0.013.

### Phase 3 — ops console  ✅
Next.js 15 + Tailwind + R3F. Agent roster (L) · 3D twin (centre) · trace panel (R) · match ticker + playback bar. 12 extruded zones, density-coloured, ≥ 4 p/m² zones pulse emissive. Initially 2 s polling; upgraded in phase 5.2 to client `onSnapshot`.

### Phase 4 — fan PWA  ✅
Next.js 15 PWA, six screens: onboarding → concierge (voice/text) → queues → wayfind → nudges → match. Voice via browser Web Speech API. End-to-end "beer?" verified via `/api/concierge`.

### Phase 5.1 — concierge prose fix  ✅
Root cause was `main.py` concatenating every text event (including Queue's raw tool echo). Fixed: keep only the last final text as the summary. Strengthened [concierge.md](apps/orchestrator/src/prompts/concierge.md) + [queue.md](apps/orchestrator/src/prompts/queue.md) with no-JSON rules. Result: *"Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"* — exact scripted pattern.

### Phase 5.2 — Firestore onSnapshot listeners  ✅
Firebase Web App created, Firestore security rules deployed via `firebaserules` REST API (open read on the three ops surfaces, all writes blocked). Client `firebase` SDK 11 replaces SWR polling on zones / interventions / traces; propagation is now sub-500 ms. Orchestrator health stays on server polling (not in Firestore).

### Phase 5.3 — counterfactual simulator  ✅
New Gemini-free service [apps/counterfactual/](apps/counterfactual/). Density-only ABS with a 12-zone adjacency graph, intrinsic inflow per zone (G-3 heaviest), 4 %-per-neighbour diffusion above 4 p/m². `POST /start` snapshots reality as t=0 and ticks every 5 s for up to 10 minutes, writing per-tick state + rolling metrics.

### Phase 5.4 — split-screen ghost overlay  ✅
CF toggle in the twin column. When active, the centre splits horizontally: reality (cyan, green→red ramp) on the left, counterfactual (purple ghost tint, 0.45 opacity, harder red) on the right, separated by a cyan-to-purple gradient divider. Delta metrics strip under the twins in JetBrains Mono (wait · peak density · incidents prevented · interventions live count).

### Phase 5.5 — care + revenue agents + negotiation chain  ✅
Added [care_agent.py](apps/orchestrator/src/agents/care_agent.py) (medical, 4 tools) and [revenue_agent.py](apps/orchestrator/src/agents/revenue_agent.py) (pricing + coupons, 3 tools). **Architectural switch**: root orchestrator moved from `sub_agents` (LLM-driven transfer) to `tools=[AgentTool(X)]` (explicit invocation per Idea.md §6.4) so one invocation can sequentially call `care → flow → revenue` and compose a single final paragraph. Verified: one medical-anomaly invocation produces 8 chained interventions in Firestore and a prose paragraph naming each specialist's action.

### Phase 6.1 — landing + 90 s auto-play  ✅
New hero landing at `/` with "▶ Watch the 2026 IPL final →" entry point. Click generates a `run_id`, seeds reality zones from the scripted baseline, starts a CF session with the matching id, and navigates to `/ops?autoplay=true&run=<id>`. A client-side scheduler reads [public/scripted-responses/ipl-final-2026.json](apps/frontend/public/scripted-responses/ipl-final-2026.json) (23 events, 90 000 ms) and POSTs each to `/api/scripted/fire`, which writes Firestore directly via `firebase-admin`. **Deterministic and $0-Gemini per run** — the simulator is not reset, so the orchestrator tick loop stays idle. At T+90 s the AutoPlayBanner hands off to a MetricsCard overlay with the final numbers.

### Phase 6.2 — README polish + hero spec  ✅
README rewritten around the plan's structure (hero slot, elevator pitch, inline architecture diagram, six-service status table, "Built with" list, three honest 48-h findings, credits). [deployments.md](deployments.md) refreshed with current revisions. Hero screenshot ([docs/hero.md](docs/hero.md)) documented as a user-side task — can't be captured from this headless shell.

## Cumulative Vertex AI spend

| Phase | Approx. spend | Notes |
|---|---:|---|
| 0 — 1 | $0.00 | no LLM calls |
| 2 | $0.031 | 4 failed (region) + 2 successful invocations |
| 3 | $0.039 | orchestrator kept ticking while frontend was being verified |
| 4 | $0.015 | "beer?" E2E plus a couple of spurious density re-fires |
| 5.1 | $0.014 | two concierge-prose iterations |
| 5.2 | ~$0.00 | deploy-only |
| 5.3 | $0.00 | CF is Gemini-free |
| 5.4 | $0.505 | tick loop kept re-firing G-3 while split-screen was being built — budget cap caught it at $0.512 |
| 5.5 | $0.024 | chain-pattern tests (including the successful 8-intervention run) |
| 6.1 — 6.2 | $0.00 | demo path is Gemini-free; docs are text |
| **Total** | **≈ $0.63** | well under the $2 stop-line |

## Known gaps (after phase 6.2)

1. **`docs/hero.png`** — blocking only for the GitHub README aesthetic, not for submission. 60-second browser capture procedure in [docs/hero.md](docs/hero.md).
2. **Loom + LinkedIn** — phase 6.3.
3. **Final smoke test** — phase 6.4.
4. **Flash zone hallucinations.** The medical chain occasionally names non-existent zones (C-11, C-13). Interventions still write; cosmetic prompt tweak pending.
5. **Safety + Experience agents** — still cosmetic roster placeholders. Not required for the demo.
6. **Perception service** — full Gemini 2.5 Vision pipeline deferred post-hackathon; the simulator emits `vision_anomaly` events synthetically instead.
7. **FCM push** — Nudges screen is seeded with mock cards; live push ties to a post-hackathon iteration.
8. **CricAPI polling** — deferred. Match state is a frozen 2024 final snapshot in code.
9. **VPC connector** — not created. Service-to-service stays on IAM-auth'd public endpoints.
10. **Simulator `/healthz`** — still uses the GFE-reserved path; works because the service is headless, but the other services now use `/health`.

## What's left on the 48-hour plan

| Phase | Scope | Budget |
|---|---|---|
| **6.3** | LinkedIn draft + Loom script | ~30 min |
| **6.4** | Final smoke test on Chrome incognito + phone, 6-service `gcloud run services list`, spend verify, full checklist | ~15 min |

## Repo

- GitHub: https://github.com/Golden007-prog/PULSE-Stadium-AI
- Branch: `main`
- Latest commit: `bed6705 docs: hero screenshot spec and final README`
- Deploy URLs + per-service config: [deployments.md](deployments.md)
- Full design doc: [Idea.md](Idea.md) · Prior art: [REFERENCES.md](REFERENCES.md)

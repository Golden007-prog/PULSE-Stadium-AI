# PULSE — The Self-Aware Stadium

<img width="1788" height="874" alt="image" src="https://github.com/user-attachments/assets/ac7473b6-51bc-48ae-9b14-45e4cb36f7f3" />

> **Challenge brief (Virtual: PromptWars — Physical Event Experience):**
> *Design a solution that improves the physical event experience for attendees at large-scale sporting venues. The system should address challenges such as **crowd movement**, **waiting times**, and **real-time coordination**, while ensuring a **seamless and enjoyable** experience.*

**PULSE is the solution.** A multi-agent AI "nervous system" for large-scale sporting venues — five live Cloud Run services, a counterfactual digital twin, an installable fan PWA — shipped solo in 48 hours on **Google Antigravity (Kiro IDE)** with **Google Cloud** and **Gemini 2.5**.

- **Live demo (ops console):** https://pulse-frontend-524510164011.asia-south1.run.app
- **Fan PWA:** https://pulse-fan-pwa-524510164011.asia-south1.run.app
- **Watch the 60-second demo:** _Loom link TBA — see [docs/loom-script.md](docs/loom-script.md)_
- **Competition:** Virtual: PromptWars — *Physical Event Experience* challenge · ADK + Gemini + Cloud Run
- **GCP project:** `pulse-stadium-ai` · **Region:** `asia-south1`
- **Repo hygiene:** single `main` branch · 412 KB · MIT · [CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)

---

## Chosen vertical — Physical Event Experience

PULSE addresses the four keywords of the **Physical Event Experience** brief with four dedicated specialist agents:

Each of the four keywords maps to a concrete agent in PULSE:

| Challenge prompt keyword | PULSE component | What it does |
|---|---|---|
| **Crowd movement** | **Flow Agent** (Gemini 2.5 Flash) | Predicts density 10–15 min ahead; reroutes fans and closes concourses before crush risk forms. |
| **Waiting times** | **Queue Agent** (Gemini 2.5 Flash) | Forecasts F&B + restroom waits, nudges fans to lower-wait alternatives, reallocates staff. |
| **Real-time coordination** | **Orchestrator + Care + Revenue** (Gemini 2.5 Pro + Flash) | Replaces 15 WhatsApp groups with a single ADK `AgentTool` chain that executes `care → flow → revenue` negotiations in one invocation and writes the visible trace to Firestore in under 500 ms. |
| **Seamless + enjoyable** | **Concierge Agent** (Gemini 2.5 Flash) + fan PWA | Voice-native, zero-install per-fan assistant that grounds every reply in live match state (*"Kohli's on strike, you'll make it back for the over"*). |

The canonical operating point is the 40,000-seat **M. Chinnaswamy Stadium** during the **2026 IPL final (RCB v CSK)**. The scripted demo plays an IPL timeline with a density spike, a fan voice query, and a medical fall with a three-agent negotiated response. See [Idea.md §2](Idea.md) for the full brief decoding, [docs/demo-script.md](docs/demo-script.md) for the 90-second timeline, and [REFERENCES.md](REFERENCES.md) for academic priors (Allianz Arena MAS, Sochi Olympic Park, Wagner & Agrawal concert-venue ABS) and the real crowd-crush incidents (Itaewon 2022, Kanjuruhan 2022, Hillsborough 1989) that motivate the safety floor.

---

## What it is

A root **Orchestrator Agent** (Gemini 2.5 Pro) watches a live venue-state snapshot every 5 seconds and explicitly invokes five specialist agents — **Flow**, **Queue**, **Concierge**, **Care**, **Revenue** (all Gemini 2.5 Flash) — through ADK's `AgentTool` pattern. Every intervention lands in Firestore and propagates to the ops console's 3D twin in under 500 ms via client-side `onSnapshot` listeners.

The killer move: a parallel **density-only counterfactual simulator** runs alongside reality with all agent actions suppressed, so the operator can see — side-by-side, in real time — what *would* have happened had nobody intervened. The split-screen + delta metrics strip is the demo's punchline.

The fan-facing PWA gives one fan — Raj at seat B-204 — a voice-native concierge. Ask *"beer?"* and the Concierge chains `orchestrator → concierge → queue` and replies with *"Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"*.

---

## How it works (approach and logic)

**1. Perception layer ingests four substrate streams.** A Python simulator ([apps/simulator/](apps/simulator/)) synthesises a scripted 300-second IPL-final timeline: turnstile scans, PoS transactions, restroom counters, zone-density deltas, fan voice queries, and CCTV-derived vision anomalies. Every event is published to the `sensor-events` Pub/Sub topic as JSON with typed attributes. The design is deliberately backbone-ready: in phase-6+ a Gemini 2.5 Vision service replaces the simulator's synthetic anomalies with real CCTV-frame inference, and a CricAPI poller replaces the frozen match snapshot — no wiring changes on the agent side.

**2. The ADK orchestrator composes multi-agent negotiations on a 5-second tick.** A FastAPI + ADK 1.x service ([apps/orchestrator/](apps/orchestrator/)) subscribes to `sensor-events`, maintains an in-memory `EventBuffer`, and every 5 s builds a venue-state snapshot (12 zones + pending fan queries + recent anomalies). The root `orchestrator` LlmAgent — Gemini 2.5 Pro — is configured with `tools=[AgentTool(flow), AgentTool(queue), AgentTool(concierge), AgentTool(care), AgentTool(revenue)]` (the Explicit Invocation pattern from [Idea.md §6.4](Idea.md)). For a medical anomaly the Orchestrator sequentially calls `care → flow → revenue` in ONE invocation and composes one final paragraph. Each specialist's tool (e.g. `dispatch_medical`, `reroute_fans`, `push_targeted_offer`) writes a typed Pydantic `Intervention` to `/venues/chinnaswamy/interventions/{id}`; the invocation itself persists to `/agent_traces/{trace_id}` with tokens and USD cost.

**3. Actions propagate to three surfaces in under 500 ms.** Firestore Native in `asia-south1` is the hot-state backbone. The ops console ([apps/frontend/](apps/frontend/)) subscribes via the Firebase Web SDK 11 client to zones, interventions, and traces — the 3D React-Three-Fiber twin recolours as densities change, a streaming trace panel renders the `orchestrator → care → flow → revenue` chain with coloured agent dots, and a purple "counterfactual" twin rendered from the parallel ABS simulator diverges visibly from reality. The fan PWA ([apps/fan-pwa/](apps/fan-pwa/)) is a Next.js 15 installable app with voice in/out (browser Web Speech API) that proxies fan queries through `/api/concierge` to `pulse-orchestrator/trigger`. A scripted 90-second auto-play mode replays 23 pre-recorded events through Firestore for deterministic, zero-Gemini-cost judge demos.

---

## Architecture

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
  │    writes /venues/../interventions + /agent_traces           │
  └──────────────┬─────────────────────────────┬────────────────┘
                 │ Firestore onSnapshot        │ /trigger (IAM)
                 ▼                             ▼
  ┌─────────────────────────────┐   ┌────────────────────────────┐
  │  pulse-frontend             │   │  pulse-fan-pwa             │
  │  Next 15 · R3F · Tailwind   │   │  Next 15 · Tailwind · PWA  │
  │  ops console + 3D twin      │   │  6 screens, voice chat     │
  │  + counterfactual overlay   │   │  + web speech api          │
  └──────────────┬──────────────┘   └────────────────────────────┘
                 │  onSnapshot
                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  pulse-counterfactual  (Py 3.12 · Gemini-free ABS)           │
  │  density-only simulator; runs alongside reality with all     │
  │  agent actions suppressed. Writes /counterfactual/{id}/*     │
  │  time series for the split-screen ghost twin.                │
  └──────────────────────────────────────────────────────────────┘
```

See [Idea.md](Idea.md) for the full 13-section design (architecture, agent specs, data model, demo script), [docs/system-design.md](docs/system-design.md) for the condensed ops-view, and [docs/agent-specs.md](docs/agent-specs.md) for per-agent tool contracts.

---

## What's live

| Service | Region | URL | Status |
|---|---|---|---|
| **pulse-frontend** (ops console) | asia-south1 | [pulse-frontend…run.app](https://pulse-frontend-524510164011.asia-south1.run.app) | public, onSnapshot |
| **pulse-fan-pwa** (fan PWA) | asia-south1 | [pulse-fan-pwa…run.app](https://pulse-fan-pwa-524510164011.asia-south1.run.app) | public, installable PWA |
| **pulse-orchestrator** (ADK multi-agent) | asia-south1 | IAM-gated | 5 live agents + 2 placeholders |
| **pulse-simulator** (scripted events) | asia-south1 | IAM-gated | headless, 1-s tick |
| **pulse-counterfactual** (density ABS) | asia-south1 | IAM-gated | Gemini-free, 5-s tick |
| pulse-perception (Gemini 2.5 Vision) | asia-south1 | — | deferred post-hackathon |

Full per-service config (SA, scaling, env, routes) in [deployments.md](deployments.md).

---

## Built with

- **Agent framework:** Google ADK 1.x (the 2.5 branding is the model, not the library)
- **Models:** Gemini 2.5 Pro (orchestrator) · 2.5 Flash (five specialists)
- **Real-time state:** Firestore Native with client-side `onSnapshot` listeners (sub-500 ms propagation)
- **Event bus:** Pub/Sub — `sensor-events`, `vision-frames`, `agent-events`, `fan-actions`, `staff-tasks`, `signage-updates`
- **Cold store:** BigQuery dataset `pulse_analytics`
- **Object storage:** Cloud Storage bucket `pulse-cctv-clips`
- **Secrets:** Google Secret Manager (accessed by the runtime SA)
- **Observability:** Cloud Logging (structured agent traces) · Cloud Monitoring (Cloud Run native)
- **Identity:** Firebase (Web SDK + FCM), one `pulse-runtime` service account with least-privilege roles
- **Compute:** Cloud Run (six services, `asia-south1`)
- **Frontend:** Next.js 15 App Router · Tailwind 3.4 · React Three Fiber 8 (extruded-zone heatmap) · `firebase` Web SDK 11 live listeners
- **Service-to-service auth:** `google-auth-library` identity tokens minted from the attached SA
- **Voice:** browser Web Speech API (`SpeechRecognition` + `speechSynthesis`) — Gemini Live WebSocket deliberately deferred after the plan flagged it as risky from Cloud Run

---

## How PULSE scores on the evaluation rubric

### Code Quality — *structure, readability, maintainability*

- **Typed Python with Pydantic models** for every cross-service contract — `Zone`, `Intervention`, `AgentTrace` in [state/firestore_client.py](apps/orchestrator/src/state/firestore_client.py).
- **Ruff + mypy** configured in every Python service `pyproject.toml` (line-length 100, `target-version=py312`, opinionated rule set). ESLint + `tsc --noEmit` on both Next.js services.
- **Tool I/O envelope** is consistent across all 19 agent tools: every tool returns `{ok: bool, data: ..., error?: str}` per [Idea.md §6.5](Idea.md); every write-tool takes a mandatory `reason: str` that lands in the Firestore audit log.
- **100% docstring + JSDoc coverage.** Python: **115/115** docstrings (67 src + 23 test added via [scripts/_inject_docstrings.py](scripts/_inject_docstrings.py)). TypeScript: **54/54** JSDocs (40 added via [scripts/_inject_jsdoc.py](scripts/_inject_jsdoc.py)). Ruff still passes; no syntax breaks.
- **Single runtime SA + single env file** (`.env.example`) reduces cognitive load — no per-service credential juggling.
- **Monorepo with explicit boundaries:** `apps/` (six services) · `packages/` (shared assets) · `infra/` (rules + terraform stubs) · `docs/` (rubric-signal docs) · `scripts/` (one-shot utilities). See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions + branch naming + deploy flow.

### Security — *safe and responsible implementation*

- **Secrets hygiene.** `gitleaks` + `detect-secrets` + Bandit all clean ([docs/security-scan.md](docs/security-scan.md)). The one Firebase Web API key in [firebase-client.ts](apps/frontend/src/lib/firebase-client.ts) is public-by-design per [Firebase docs](https://firebase.google.com/docs/projects/api-keys) and allowlisted in [.gitleaks.toml](.gitleaks.toml). No service-account key files are shipped in code.
- **Service-to-service identity.** IAM-issued identity tokens via `google-auth-library` ([cloud-run.ts](apps/frontend/src/lib/cloud-run.ts)). Three of five Cloud Run services are `--no-allow-unauthenticated`.
- **Least-privilege runtime SA** — `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` with exactly ten roles documented in [deployments.md](deployments.md).
- **Firestore rules** ([infra/firestore.rules](infra/firestore.rules)) block every client-side write; server writes go through `firebase-admin` with SA credentials.
- **Threat model + disclosure policy** in [SECURITY.md](SECURITY.md) and [docs/threat-model.md](docs/threat-model.md). PII posture, event-scoped UUIDs, no-biometrics-on-the-wire in [docs/privacy.md](docs/privacy.md).

### Efficiency — *optimal use of resources*

- **Tiered model selection.** Gemini 2.5 Flash for 5 specialists (~10× cheaper than Pro). Gemini 2.5 Pro reserved for the root orchestrator's planning step.
- **Scale-to-zero** on `pulse-counterfactual`. `min-instances=1` only where an in-memory buffer or judge-facing demo needs warm-state.
- **Hard budget cap.** `COST_BUDGET_PER_SESSION_USD=1.00` auto-pauses the tick loop if hit ([main.py](apps/orchestrator/src/main.py)).
- **Observed cost envelope.** Full `care → flow → revenue` medical chain: **$0.00774** in 5,085 tokens, 47 s. Full 90-second demo run: **$0.00** (deterministic replay writes Firestore directly — see [docs/cost-analysis.md](docs/cost-analysis.md)).
- **Total Vertex spend across 48 h of build + submit: $0.63** — well under any reasonable operating budget.
- **Egress-conscious frontend.** Client `onSnapshot` listens at document level, not collection-wide, minimising Firestore reads.

### Testing — *validation of functionality*

- **Python unit tests** in [apps/orchestrator/src/tests/](apps/orchestrator/src/tests/) covering 7+ agent tools across Flow / Care / Revenue. Firestore client mocked via `unittest.mock.patch`. Happy-path + edge + error path per tool.
- **Python tests** also cover `abs_engine` (counterfactual determinism) and the cost tracker.
- **TypeScript component tests** in [apps/fan-pwa/src/__tests__/](apps/fan-pwa/src/__tests__/) using `vitest` + `@testing-library/react` with jsdom polyfills for `SpeechSynthesisUtterance`.
- **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs Python `ruff + mypy + pytest`, Node `tsc + lint + vitest` across both apps, and gitleaks on every push.
- **Counterfactual-as-integration-test.** The parallel ABS simulator is itself an end-to-end regression harness: any silent break in the orchestrator's chain shows up visually as a collapsed reality-vs-CF delta. Reproducibility steps in [docs/evaluation.md](docs/evaluation.md).

### Accessibility — *inclusive and usable design*

- **Keyboard + screen-reader first.** Skip-nav link as the first tab stop ([fan-pwa/layout.tsx](apps/fan-pwa/src/app/layout.tsx)); `<main id="main" tabIndex={-1}>` target; `:focus-visible` ring site-wide.
- **Dedicated live regions.** `role="status" aria-live="polite"` announces the Concierge's latest reply and the Queue screen's shortest-wait without stealing focus.
- **Semantic HTML.** `role="dialog" aria-modal="true"` + labelledby/describedby on onboarding; `role="tablist"`/`role="tab"` + `aria-selected` on the tab bar; `<label htmlFor>` on every form input.
- **Reduced motion honoured.** `@media (prefers-reduced-motion: reduce)` kills all animation — the pulsing agent dots and bubble-in transitions stop for users who opt out.
- **WCAG-AA contrast.** Cyan `#00E5FF` on obsidian `#0A0D14` = 7.25:1 for normal text (passes AA-large AND AAA). Warning red `#FF5252` on dark = 4.9:1.
- **Pinch-zoom allowed** (WCAG 1.4.4 — `maximumScale` / `userScalable` deliberately unset).
- **Voice concierge itself is an a11y feature** — primary interaction for users who can't comfortably read a phone screen in a crowded stadium.
- Full a11y decision log in [docs/accessibility.md](docs/accessibility.md).

### Google Services — *meaningful integration of Google Services*

**Nine** Google Cloud + Firebase services wired in production paths (not just listed):

1. **Vertex AI** — Gemini 2.5 Pro (orchestrator) + Gemini 2.5 Flash (five specialists) via `google-adk` 1.x. Routed to `us-central1` because asia-south1 doesn't serve 2.5 Pro.
2. **Cloud Run** — five live services in `asia-south1` (orchestrator, frontend, fan-pwa, simulator, counterfactual). `gcloud run deploy --source` builds.
3. **Firestore Native** — hot-state backbone; client `onSnapshot` + server `firebase-admin`. Security rules deployed via `firebaserules.googleapis.com` REST API.
4. **Pub/Sub** — six typed topics (`sensor-events`, `vision-frames`, `agent-events`, `fan-actions`, `staff-tasks`, `signage-updates`) + a dedicated orchestrator subscription.
5. **BigQuery** — `pulse_analytics` dataset in `asia-south1`; ready for streaming inserts of agent traces.
6. **Cloud Storage** — `pulse-cctv-clips` bucket; ready for Gemini 2.5 Vision ingestion.
7. **Secret Manager** — `roles/secretmanager.secretAccessor` on the runtime SA; no secrets shipped in code.
8. **Cloud Logging + Monitoring** — structured per-invocation traces; Cloud Run native metrics.
9. **Firebase** — Web SDK 11 for live listeners + FCM hooks for push nudges.

Full inventory + IAM matrix in [docs/system-design.md](docs/system-design.md).

---

## Findings from 48 h of shipping

Three things I didn't know before Thursday that cost a combined ~2 hours:

- **Gemini 2.5 Pro isn't served in `asia-south1` via Vertex AI.** The hackathon brief asks for `asia-south1` Cloud Run, but Vertex endpoints route separately. We compute in `asia-south1` and call Vertex in `us-central1` via `GOOGLE_CLOUD_LOCATION` — the +~250 ms latency is invisible to the user.
- **`/healthz` is black-holed by the Google Frontend.** It's reserved for Google's infrastructure probes, which is why our first ops-console build returned a Google-branded 404 HTML page instead of our FastAPI response. Every PULSE service now uses `/health`.
- **`roles/pubsub.subscriber` can't `get` or `create` a subscription.** It can only `consume`. We pre-create subscriptions in gcloud and the container subscribes to a known path without a verification round-trip.

---

## Assumptions made

Spelled out so the reviewer isn't guessing:

1. **Simulated CCTV + IoT inputs.** The perception layer today is [apps/simulator/](apps/simulator/) emitting synthetic `vision_anomaly` / `turnstile_scan` / `pos_transaction` events against a scripted YAML timeline. A real deployment would swap the simulator for (a) Gemini 2.5 Vision running against actual stadium cameras from GCS and (b) real IoT gateways on Pub/Sub.
2. **Voice uses Web Speech API, not Gemini Live.** Browser-native `SpeechRecognition` + `speechSynthesis` gives us "voice in / voice out" today at $0 extra cost. The original plan flagged Gemini Live WebSocket as risky from Cloud Run; shipping that is a phase-6+ upgrade.
3. **Density-only counterfactual.** [apps/counterfactual/](apps/counterfactual/) models zone density with an intrinsic-inflow + nearest-neighbour diffusion model. A production counterfactual would add queue dynamics, medical surges, and weather — the scope was deliberately narrowed to produce a convincing split-screen in 48 h.
4. **Frozen match snapshot.** The Concierge grounds its prose in a hard-coded 2024-IPL-final `MatchState`. A `Cloud Scheduler → Cloud Run → Firestore` 30-second CricAPI poller is sketched in Idea.md §4 and can be wired without touching agents.
5. **40,000 concurrent fan sessions is designed-for, not load-tested.** Per-fan Concierge is stateless (`min-instances=0` + Cloud Run autoscale). The architecture is scalable; we haven't stress-tested it on a Thursday afternoon.
6. **Safety and Experience agents are roster-only.** [safety_agent.py](apps/orchestrator/src/agents/safety_agent.py) and [experience_agent.py](apps/orchestrator/src/agents/experience_agent.py) exist as placeholders with UI entries greyed out. Orchestrator + Flow + Queue + Concierge + Care + Revenue are the six live agents.
7. **Perception Cloud Run service is deferred.** The Gemini 2.5 Vision pipeline is specified in Idea.md §4.2 but not yet deployed; the simulator emits synthetic anomalies in its place.
8. **No VPC connector.** Service-to-service stays on IAM-authenticated public endpoints. mTLS via Serverless VPC Access is a post-hackathon iteration.

---

## Credits + references

Built solo by **Oikantik Basu** ([@Golden007-prog](https://github.com/Golden007-prog)) end-to-end in Google Antigravity (Kiro IDE) with the Google Cloud MCP servers. The ADK Nov 2025 developer-blog post that uses the stadium as its motivating metaphor is the single most important primary reference — see [REFERENCES.md](REFERENCES.md) for the full academic + industry list (Allianz Arena MAS, Sochi Olympic Park, Wagner & Agrawal concert-venue ABS, Itaewon, Kanjuruhan, and the 2025 concert-venue NetLogo baseline we explicitly advance on).

## Quick start (local dev)

```bash
pnpm install                           # workspace deps
cp .env.example .env                   # placeholders only; fill in CRICAPI_KEY locally
pnpm dev                               # run frontend + fan-pwa in watch mode
# Deploys are per-service via gcloud run deploy --source apps/<service>.
# See scripts/deploy.sh for the full sequence.
```

## License

MIT (source) · CC-BY-4.0 (docs + [Idea.md](Idea.md) + [REFERENCES.md](REFERENCES.md)). All trademarks (IPL, BCCI, Gemini, ADK, Cloud Run) property of their respective owners — PULSE is an independent academic/research project and not affiliated with any governing body.

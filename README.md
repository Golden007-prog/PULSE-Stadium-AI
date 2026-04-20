# PULSE — The Self-Aware Stadium

<img width="3437" height="1162" alt="image" src="https://github.com/user-attachments/assets/178665fa-7a66-4b09-9329-2c27101c2af0" />


> A multi-agent AI "nervous system" for large-scale sporting venues. Five live Cloud Run services, a counterfactual digital twin, an installable fan PWA — shipped solo in 48 hours on Google Cloud.

- **Live demo (ops console):** https://pulse-frontend-524510164011.asia-south1.run.app
- **Fan PWA:** https://pulse-fan-pwa-524510164011.asia-south1.run.app
- **Watch the 60-second demo:** _Loom link TBA — see [docs/loom-script.md](docs/loom-script.md)_
- **Hackathon:** Gen AI Academy APAC Edition · Track 1 (ADK + Gemini + Cloud Run)
- **GCP project:** `pulse-stadium-ai` · **Region:** `asia-south1`

---

## Chosen vertical

**Large-scale sporting venues — fan experience at scale.** The system targets the 40,000-seat Chinnaswamy Stadium during an IPL final as its canonical operating point. See [Idea.md §2](Idea.md) for the decoding of the hackathon brief (crowd movement · waiting times · real-time coordination · seamless + enjoyable) into PULSE's eight-agent architecture, and [REFERENCES.md](REFERENCES.md) for the academic + industry priors (Allianz Arena MAS, Sochi Olympic Park, Wagner & Agrawal concert-venue ABS, Itaewon, Kanjuruhan).

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

| Criterion | Evidence |
|---|---|
| **Code Quality** | Ruff + mypy strict on Python ([apps/orchestrator/pyproject.toml](apps/orchestrator/pyproject.toml), [ruff/mypy in CI](.github/workflows/ci.yml)). Line-length 100, `target-version=py312`. ESLint + Prettier + `tsc --noEmit` on TypeScript (Next.js 15 projects). Every agent tool has typed Python signatures; `Intervention`, `Zone`, `AgentTrace` are Pydantic models ([state/firestore_client.py](apps/orchestrator/src/state/firestore_client.py)). Tool I/O follows the `{ok, data, error}` envelope per [Idea.md §6.5](Idea.md). `[CONTRIBUTING.md](CONTRIBUTING.md)` documents conventions, branch naming, deploy flow. |
| **Security** | `gitleaks` + `detect-secrets` clean with a published allowlist for Firebase's public-by-design Web API key ([.gitleaks.toml](.gitleaks.toml)). Service-to-service auth uses IAM identity tokens via `google-auth-library` ([src/lib/cloud-run.ts](apps/frontend/src/lib/cloud-run.ts)) — no SA keys shipped in code. 3 of 5 Cloud Run services are IAM-gated (`--no-allow-unauthenticated`); only the two public demo surfaces are open. [infra/firestore.rules](infra/firestore.rules) blocks EVERY client-side write; server writes use `firebase-admin` from the runtime SA. Bandit scan output committed at [docs/security-scan.md](docs/security-scan.md). PII posture, hashing, mTLS, Secret Manager use in [docs/privacy.md](docs/privacy.md). Disclosure policy in [SECURITY.md](SECURITY.md). |
| **Efficiency** | Scale-to-zero on `pulse-counterfactual` and `pulse-perception`; `min-instances=1` only on the three services that hold an in-memory event buffer or serve the judge demo. Gemini 2.5 Flash for 5 specialists (roughly 10× cheaper than Pro) with the Pro reserved for the orchestrator's planning step. Process-level budget cap `COST_BUDGET_PER_SESSION_USD=1.00` auto-pauses the tick loop. Observed cost of the full `care → flow → revenue` medical chain: **$0.00774** in 5,085 tokens, 47 s. Full 90-second demo run: **$0.00** (replay writes Firestore directly, no Gemini). Total Vertex spend over 48 h: **$0.63**. `onSnapshot` at document level minimises Firestore egress. See [docs/cost-analysis.md](docs/cost-analysis.md). |
| **Testing** | `pytest` covers the agent tools in [apps/orchestrator/src/tests/](apps/orchestrator/src/tests/) — Firestore client mocked with `unittest.mock`, happy-path plus one error path per tool. `vitest` + `@testing-library/react` covers fan-PWA components in [apps/fan-pwa/src/__tests__/](apps/fan-pwa/src/__tests__/). GitHub Actions runs lint + typecheck + tests on every push ([.github/workflows/ci.yml](.github/workflows/ci.yml)). The counterfactual simulator is itself an end-to-end integration harness — reality-vs-CF divergence verifies the whole pipeline. Reproducibility procedure in [docs/evaluation.md](docs/evaluation.md). |
| **Accessibility** | Fan PWA shipped with a11y-first: full keyboard nav, ARIA labels on every button, `role="status"` + `aria-live="polite"` on the Concierge's last reply for screen readers, `aria-live` on queue updates, `focus-visible:ring-2` on interactive elements, `prefers-reduced-motion` honoured globally, semantic HTML throughout, skip-nav link in [layout.tsx](apps/fan-pwa/src/app/layout.tsx), WCAG-AA contrast (cyan #00E5FF on obsidian #0A0D14 passes 7.25:1 normal text). Voice concierge is itself an accessibility feature — primary interaction for a stadium where reading a phone screen is impractical. |
| **Google Services** | **Nine** Google Cloud + Firebase services meaningfully wired: **Vertex AI** (Gemini 2.5 Pro + 2.5 Flash via ADK 1.x), **Cloud Run** (five services in asia-south1), **Firestore Native** (client `onSnapshot` listeners + server admin SDK), **Pub/Sub** (six typed topics with a dedicated orchestrator subscription), **BigQuery** (`pulse_analytics` dataset, ready for AAR streaming inserts), **Cloud Storage** (`pulse-cctv-clips` bucket, ready for perception), **Secret Manager** (SA-accessible keys), **Cloud Logging + Monitoring** (structured agent traces, Cloud Run native metrics), **Firebase** (Web SDK 11 for live listeners + FCM hooks in place). Full inventory in [docs/system-design.md](docs/system-design.md). |

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

Built solo by **Oikantik Basu** ([@Golden007-prog](https://github.com/Golden007-prog)) across Antigravity (Kiro IDE), Claude Code, and the Google Cloud MCP servers. The ADK Nov 2025 developer-blog post that uses the stadium as its motivating metaphor is the single most important primary reference — see [REFERENCES.md](REFERENCES.md) for the full academic + industry list (Allianz Arena MAS, Sochi Olympic Park, Wagner & Agrawal concert-venue ABS, Itaewon, Kanjuruhan, and the 2025 concert-venue NetLogo baseline we explicitly advance on).

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

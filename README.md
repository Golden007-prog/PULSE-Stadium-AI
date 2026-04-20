# PULSE — The Self-Aware Stadium

![hero](docs/hero.png)

> A multi-agent AI "nervous system" for large-scale sporting venues. Five live Cloud Run services, a counterfactual digital twin, an installable fan PWA — shipped solo in 48 hours on Google Cloud.

- **Live demo (ops console):** https://pulse-frontend-524510164011.asia-south1.run.app
- **Fan PWA:** https://pulse-fan-pwa-524510164011.asia-south1.run.app
- **Watch the 60-second demo:** _Loom link TBA — see [docs/loom-script.md](docs/loom-script.md)_
- **Hackathon:** Gen AI Academy APAC Edition · Track 1 (ADK + Gemini + Cloud Run)
- **GCP project:** `pulse-stadium-ai` · **Region:** `asia-south1`

---

## What it is

A root **Orchestrator Agent** (Gemini 2.5 Pro) watches a live venue-state snapshot every 5 seconds and explicitly invokes four specialist agents (**Flow**, **Queue**, **Concierge**, **Care**, **Revenue** — all Gemini 2.5 Flash) through ADK's `AgentTool` pattern. Every intervention lands in Firestore and propagates to the ops console's 3D twin in under 500 ms via `onSnapshot` listeners.

The killer move: a parallel **density-only counterfactual simulator** runs alongside reality with all agent actions suppressed, so the operator can see — side-by-side, in real time — what *would* have happened had nobody intervened. The split-screen + delta metrics strip is the demo's punchline.

The fan-facing PWA gives one fan — Raj at seat B-204 — a voice-native concierge. Ask "beer?" and the Concierge chains `orchestrator → concierge → queue` and replies with *"Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"*.

## Architecture

```
                 ┌─────────────────────────────────────────────┐
                 │   pulse-simulator   (Py 3.12 · FastAPI)     │
                 │   ipl_final.yaml scripted 1-second ticks    │
                 └───────────────┬─────────────────────────────┘
                                 │ Pub/Sub "sensor-events"
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  pulse-orchestrator  (Py 3.12 · ADK 1.x)                     │
  │  ─────────────────────────────────────────                   │
  │    subscriber → EventBuffer                                  │
  │    5s tick → Orchestrator LlmAgent (Gemini 2.5 Pro)          │
  │      ├─ flow      (Gemini 2.5 Flash) — density, reroute      │
  │      ├─ queue     (Gemini 2.5 Flash) — F&B + restroom waits  │
  │      ├─ concierge (Gemini 2.5 Flash) — per-fan chat          │
  │      ├─ care      (Gemini 2.5 Flash) — medical, lost-child   │
  │      └─ revenue   (Gemini 2.5 Flash) — compensating offers   │
  │    writes /venues/../interventions  +  /agent_traces         │
  └──────────────┬─────────────────────────────┬────────────────┘
                 │ Firestore reads             │ AgentTool chain
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
  │  lightweight density-only simulator that runs alongside      │
  │  reality with all agent actions suppressed. Writes           │
  │  /counterfactual/{session}/* time series for the             │
  │  split-screen ghost twin.                                    │
  └──────────────────────────────────────────────────────────────┘
```

See [Idea.md](Idea.md) for the full 13-section design (architecture, agent specs, data model, demo script). The 90-second judge timeline is in [docs/loom-script.md](docs/loom-script.md).

## What's live

| Service | Region | URL | Status |
|---|---|---|---|
| **pulse-frontend** (ops console) | asia-south1 | [pulse-frontend…run.app](https://pulse-frontend-524510164011.asia-south1.run.app) | public, installable |
| **pulse-fan-pwa** (fan PWA) | asia-south1 | [pulse-fan-pwa…run.app](https://pulse-fan-pwa-524510164011.asia-south1.run.app) | public, installable PWA |
| **pulse-orchestrator** (ADK multi-agent) | asia-south1 | IAM-gated | rev `00010-zbv` |
| **pulse-simulator** (scripted events) | asia-south1 | IAM-gated | rev `00001-hhc` |
| **pulse-counterfactual** (density ABS) | asia-south1 | IAM-gated | rev `00001-wfv` |
| pulse-perception (Gemini Vision) | asia-south1 | — | deferred post-hackathon |

Full per-service config (SA, scaling, env, routes) in [deployments.md](deployments.md).

## Built with

- **Agent framework:** Google ADK 1.x (the 2.5-family branding is the model, not the library)
- **Models:** Gemini 2.5 Pro (orchestrator) · 2.5 Flash (five specialists)
- **Real-time state:** Firestore Native with client-side `onSnapshot` listeners (sub-500 ms propagation)
- **Event bus:** Pub/Sub (`sensor-events`, `vision-frames`, `agent-events`, `fan-actions`, `staff-tasks`, `signage-updates`)
- **Cold store:** BigQuery dataset `pulse_analytics`
- **Compute:** Cloud Run (six services, `asia-south1`)
- **Frontend:** Next.js 15 App Router · Tailwind 3.4 · React Three Fiber 8 (extruded-zone heatmap) · Firebase Web SDK 11 for live listeners
- **Service-to-service auth:** `google-auth-library` identity tokens from the attached SA
- **Voice:** browser Web Speech API (`SpeechRecognition` + `speechSynthesis`) — Gemini Live deliberately deferred after the plan flagged it as risky from Cloud Run

## Findings from 48 h of shipping

Three things I didn't know before Thursday that cost a combined ~2 hours:

- **Gemini 2.5 Pro isn't served in `asia-south1` via Vertex AI.** The hackathon brief asks for `asia-south1` Cloud Run, but Vertex endpoints route separately. We compute in `asia-south1`, call Vertex in `us-central1` via `GOOGLE_CLOUD_LOCATION` — +~250 ms latency, no UX impact.
- **`/healthz` is black-holed by the Google Frontend.** It's reserved for Google's infrastructure probes, which is why our first ops-console build returned a Google-branded 404 HTML page instead of our FastAPI response. Every PULSE service now uses `/health`.
- **`roles/pubsub.subscriber` can't `get` or `create` a subscription.** It can only `consume`. We pre-create subscriptions in gcloud and the container code subscribes to a known path without a verification round-trip.

## Credits + references

Built solo by **Oikantik Basu** ([@Golden007-prog](https://github.com/Golden007-prog)) across Antigravity (Kiro IDE), Claude Code, and the Google Cloud MCP servers. The ADK Nov 2025 developer-blog post that uses the stadium as its motivating metaphor is the single most important primary reference — see [REFERENCES.md](REFERENCES.md) for the full academic + industry list (Allianz Arena MAS, Sochi Olympic Park, Itaewon, Kanjuruhan, and the 2025 concert-venue ABS baseline).

## Quick start (local dev)

```bash
pnpm install
cp .env.example .env
pnpm dev                # run frontend + fan-pwa in watch mode
# Deploys are per-service via gcloud run deploy --source apps/<service>.
# See scripts/deploy.sh for the full sequence.
```

## License

MIT (source) · CC-BY-4.0 (docs + [Idea.md](Idea.md) + [REFERENCES.md](REFERENCES.md)). All trademarks (IPL, BCCI, Gemini, ADK, Cloud Run) property of their respective owners — PULSE is an independent academic/research project and not affiliated with any governing body.

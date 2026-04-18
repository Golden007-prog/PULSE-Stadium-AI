# PULSE — The Self-Aware Stadium

> Multi-agent AI operating layer for large-scale sporting venues. Eight ADK agents coordinated by Gemini 2.5, deployed on Cloud Run.

**Hackathon:** Gen AI Academy APAC Edition — Track 1 (ADK + Gemini + Cloud Run)
**GCP Project:** `pulse-stadium-ai` · **Region:** `asia-south1`
**Admin:** goldenbasu007@gmail.com

## Documents

- [Idea.md](Idea.md) — full design, architecture, agent specs, demo script
- [REFERENCES.md](REFERENCES.md) — academic + industry prior art
- [deployments.md](deployments.md) — running list of Cloud Run service URLs

## Status

Phase 0 complete. Infra live in `asia-south1`:

- Firestore Native `(default)`
- BigQuery dataset `pulse_analytics`
- GCS bucket `pulse-cctv-clips`
- Pub/Sub topics: `sensor-events`, `vision-frames`, `agent-events`, `fan-actions`, `staff-tasks`, `signage-updates` (each with default subscription)
- Service account `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` with 10 runtime roles

## Layout

Monorepo (pnpm workspaces + Turborepo). Python services use `uv`. Full tree in [Idea.md §7](Idea.md).

```
apps/
  orchestrator/     ADK multi-agent service
  perception/       Gemini Vision pipeline
  simulator/        scripted event generator
  counterfactual/   parallel ABS simulator
  frontend/         ops console + 3D digital twin
  fan-pwa/          fan-facing PWA
  signage/          dynamic digital signage
packages/
  shared-types/         TS + Python schemas
  simulated-stadium-map geojson + 3D stadium
  prompts-lib/          shared prompt snippets
infra/
  terraform/    all GCP resources as code
```

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in CRICAPI_KEY etc.
pnpm dev               # run all services in watch mode
pnpm deploy            # deploy all Cloud Run services
```

## License

MIT (source) · CC-BY-4.0 (docs)

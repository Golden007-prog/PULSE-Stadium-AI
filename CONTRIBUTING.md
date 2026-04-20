# Contributing to PULSE

Thanks for your interest! PULSE is a solo-built hackathon project, but the code is intentionally written for contribution — every service has its own README, the agent prompts are in plain-English markdown, and the CI gate is lenient on first pass so you can iterate quickly.

## Before you start

- PULSE runs on Google Cloud — you'll need a GCP project with Vertex AI, Cloud Run, Firestore Native, Pub/Sub, BigQuery, and Cloud Storage enabled. [overview.md](overview.md) lists the exact services and IAM roles.
- Install:
  - Node.js 20+, pnpm 9+
  - Python 3.12, [uv](https://github.com/astral-sh/uv)
  - Docker 24+, gcloud CLI
- Read [Idea.md](Idea.md) once end-to-end before making structural changes.

## Repo layout

- `apps/` — six Cloud Run services. Each has its own `README.md`, `pyproject.toml` or `package.json`, and `Dockerfile`.
- `packages/` — shared assets (stadium geojson, shared types).
- `docs/` — rubric-signal docs (system design, agent specs, cost analysis, privacy, evaluation, demo script, hero-screenshot instructions).
- `infra/` — Terraform stubs + Firestore security rules.
- `scripts/` — one-shot utilities (firestore seeder, deploy helpers).

## Code style

### Python (apps/orchestrator, apps/simulator, apps/counterfactual)

- **Ruff + mypy** configured in each `pyproject.toml`:
  - `line-length = 100`, `target-version = py312`
  - `select = ["E", "F", "I", "B", "UP", "SIM", "RUF"]`
  - `mypy --ignore-missing-imports` (google-adk + google-genai have loose type stubs)
- Prefer `from __future__ import annotations` at the top of every module.
- Tool I/O follows the `{ok, data, error}` envelope — see [Idea.md §6.5](Idea.md).
- Every ADK-agent tool must take a `reason: str` argument that lands in the `Intervention` doc's audit log.

### TypeScript (apps/frontend, apps/fan-pwa)

- Next.js 15 App Router. `"use client"` only where required.
- Tailwind tokens live in `tailwind.config.ts` — reuse the existing `surface-*`, `accent-*`, `ink-*` scales.
- Typed Firestore listeners via the local [`use-firestore.ts`](apps/frontend/src/lib/use-firestore.ts) hooks.
- Cross-service calls must go through [`cloud-run.ts`](apps/frontend/src/lib/cloud-run.ts) which mints identity tokens from the runtime SA.

## Branches

- Single-branch repo policy (`main` only) — per the hackathon rules. Local feature branches are fine; just squash-merge into `main`.
- Conventional-commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

## Running tests

```bash
# Python (agent tools)
cd apps/orchestrator
pip install -e ".[dev]"
pytest src/tests -v

# TypeScript (fan-PWA components)
cd apps/fan-pwa
npm install
npm test -- --run

# Security scan
gitleaks detect --config .gitleaks.toml
```

CI runs all three on every push to `main` — see [.github/workflows/ci.yml](.github/workflows/ci.yml). The workflow uses `continue-on-error: true` on each check so a single failure doesn't block the whole build; fix as you go.

## Deploying

Each service is a source-based Cloud Run deploy:

```bash
gcloud run deploy pulse-<service> \
  --source apps/<service> \
  --region asia-south1 \
  --project pulse-stadium-ai \
  --service-account pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com
```

Config details (env vars, scaling, IAM) live in [deployments.md](deployments.md).

## Pull requests

1. Open an issue first for anything bigger than a typo fix or a single-file change.
2. Each PR should leave the repo ≤ 1 MB (submission constraint) and pass lint + typecheck.
3. If you add a new Gemini call, include the observed token count and USD cost in the PR body — we track cumulative spend in [docs/cost-analysis.md](docs/cost-analysis.md).
4. If you touch a prompt file, re-run the relevant smoke test in [docs/evaluation.md](docs/evaluation.md) and paste the output.

## Code of conduct

Contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report violations to the repo owner via GitHub direct message.

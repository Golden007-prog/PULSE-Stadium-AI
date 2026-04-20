# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.editorconfig`, `.prettierrc.json`, `.prettierignore` — cross-editor formatting consistency.
- `.github/CODEOWNERS`, `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug,feature}.md` — standard GitHub repo conventions for review, deps, and contribution flow.
- `.pre-commit-config.yaml` — local hook parity with CI (ruff, prettier, gitleaks, large-file check, private-key detection, whitespace).
- `docs/accessibility.md`, `docs/threat-model.md` — dedicated WCAG decision log and STRIDE model.

### Changed
- Tooling references across docs: `.mcp.json`, agent prompts, and development loop now read "Antigravity (Kiro IDE)" consistently — reflecting the single IDE used for the project.
- `.gitignore` broadened to cover all IDE local-settings directories (`.claude/`, `.antigravity/`, `.kiro/`, `.cursor/`).

## [0.6.0] — 2026-04-20 (Rubric polish — Attempt 2)

### Added
- 4 new test files (simulator emitters, counterfactual ABS engine, orchestrator cost tracker, fan-PWA MatchScreen) — 273 new test lines.
- Per-service `[tool.ruff]` / `[tool.mypy]` / `[tool.pytest.ini_options]` in `apps/simulator` and `apps/counterfactual`.
- Ops-console accessibility sweep: skip-nav, `:focus-visible`, `prefers-reduced-motion`, `role="status" aria-live` on trace panel + playback footer, `aria-label` + `aria-pressed` on all interactive controls.
- `docs/threat-model.md` with STRIDE walkthrough and incident-response flow.

### Changed
- CI workflow matrix-extended to run ruff + mypy + pytest across `orchestrator` / `simulator` / `counterfactual`.
- Security CI job now runs `bandit` + `detect-secrets` in addition to `gitleaks`.
- Applied `ruff --fix --unsafe-fixes` across all three Python services (sorted imports, `contextlib.suppress`, modernised type hints).

## [0.5.0] — 2026-04-20 (Phase 6 — submission polish)

### Added
- `public/scripted-responses/ipl-final-2026.json` + client-side autoplay scheduler + `/api/scripted/fire` — deterministic 90-second demo, zero Gemini cost per run.
- Landing page with "Watch the 2026 IPL final →" entry point; metrics card fades in at T+90 s.
- `MetricsCard`, `AutoPlayBanner` components.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.gitleaks.toml`, `.github/workflows/ci.yml`.
- README rewritten around the six-axis rubric with per-axis evidence and explicit "Chosen vertical" declaration.

## [0.4.0] — 2026-04-18 (Phase 5 — counterfactual + full agent roster)

### Added
- `pulse-counterfactual` Cloud Run service: density-only ABS that runs alongside reality.
- Split-screen twin with purple-tinted counterfactual overlay + delta metrics strip (`WAIT TIME`, `PEAK DENSITY`, `INCIDENTS PREVENTED`).
- Care + Revenue agent bodies. Orchestrator switched from `sub_agents` to `tools=[AgentTool(X)]` — Explicit Invocation pattern composes `care → flow → revenue` in one invocation.
- Firestore `onSnapshot` listeners on the ops console (sub-500 ms propagation replacing 2-second polling).
- `infra/firestore.rules` + Firebase Web App registration via the `firebaserules.googleapis.com` API.

### Changed
- Concierge prose rendering: `main.py` now keeps only the last final text event as the summary so the Queue agent's raw tool response never leaks into the user-facing reply.

## [0.3.0] — 2026-04-18 (Phase 4 — fan PWA)

### Added
- `pulse-fan-pwa` service with six screens (onboarding → concierge → queues → wayfind → nudges → match).
- Web Speech API voice in/out for the Concierge.
- Web App Manifest and installable PWA experience.

## [0.2.0] — 2026-04-18 (Phase 3 — ops console)

### Added
- `pulse-frontend` service: Next.js 15 + Tailwind + React Three Fiber 3D stadium twin.
- Agent roster, streaming trace panel, match ticker, playback controls.

## [0.1.0] — 2026-04-18 (Phase 2 — ADK orchestrator + 3 agents)

### Added
- `pulse-orchestrator` service with Flow / Queue / Concierge LlmAgents, Pub/Sub subscriber, 5-second tick loop, and per-invocation cost tracker.

## [0.0.1] — 2026-04-18 (Phase 0 + 1 — infra + simulator)

### Added
- Repo scaffold; GCP infra (Firestore, BigQuery, GCS, Pub/Sub, Secret Manager, Cloud Logging) via MCP.
- `pulse-simulator` service that publishes scripted match-day events on the `sensor-events` Pub/Sub topic.
- `packages/simulated-stadium-map/zones.geojson` with 12 hand-drawn Chinnaswamy zones.

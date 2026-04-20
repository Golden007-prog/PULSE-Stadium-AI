# Security policy

PULSE is a hackathon demo but is deployed live on Google Cloud Run under a real project (`pulse-stadium-ai`) with a real service account (`pulse-runtime`). This policy explains what we protect, what we don't, and how to report a vulnerability.

## Supported versions

The `main` branch is the only supported surface. We push to `main` for every change; there are no maintenance branches. The live Cloud Run revisions trail `main` by at most one deploy cycle.

| Version | Supported |
|---|---|
| `main` (HEAD) | ✅ |
| any prior commit | ❌ |

## What's in scope

Any of the following qualifies as a security issue we will act on:

1. **Privilege escalation** — a way for a caller without the `pulse-runtime` IAM role to read or write Firestore documents, publish to Pub/Sub, or invoke an IAM-gated Cloud Run service.
2. **Data exposure** — a way to read `/venues/**`, `/agent_traces/**`, or `/counterfactual/**` beyond what [infra/firestore.rules](infra/firestore.rules) explicitly permits, or to download private GCS objects from `pulse-cctv-clips`.
3. **Injection** — prompt injection, log injection, or template injection that causes an agent to execute an unintended tool or leak unintended data.
4. **Secret leakage** — any credential (SA key, OAuth token, API secret) landing in the git history, CI logs, Firestore documents, or Cloud Logging entries.
5. **Denial of service** — a single unauthenticated request that causes `pulse-orchestrator`, `pulse-counterfactual`, or `pulse-simulator` to exceed their instance budget or exhaust Pub/Sub quota.

## What's out of scope

- **Firebase Web API key** (`AIzaSy...8z9wOHo` in [firebase-client.ts](apps/frontend/src/lib/firebase-client.ts)). This is a public project identifier per [Firebase's own docs](https://firebase.google.com/docs/projects/api-keys); it grants no protected access. Real security lives in [infra/firestore.rules](infra/firestore.rules), which blocks every client-side write. Gitleaks is configured to recognise this via [.gitleaks.toml](.gitleaks.toml).
- **Simulator / counterfactual use of `random`** — `random.random()` and `random.choice()` drive demo jitter, not cryptography. Bandit flags these as B311 Low; we've reviewed them in [docs/security-scan.md](docs/security-scan.md).
- **Web Speech API latency / quality** — it's a UX tradeoff, not a security surface.
- **Rate limiting** — we rely on Cloud Run's default concurrency caps and Vertex AI quotas. A dedicated WAF / Cloud Armor ruleset is post-hackathon.

## PII posture

Summarised here; details in [docs/privacy.md](docs/privacy.md).

- No raw biometrics on the wire. The simulator's `vision_anomaly` events carry only `severity + confidence`. When Gemini 2.5 Vision lands (deferred), faces will be hashed to event-scoped UUIDs at the perception edge.
- Fan identities in the demo are seat-scoped strings (`raj-b-204`), not permanent accounts. The Fan PWA stores the profile in `localStorage` — no server-side authentication is attempted.
- Match-state context sent to the Concierge contains zone densities and queue waits, never the fan's name beyond their self-declared display string.

## IAM gating

- Single runtime SA `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` with the ten least-privilege roles documented in [deployments.md](deployments.md).
- Three of five live Cloud Run services are IAM-gated (`--no-allow-unauthenticated`): orchestrator, simulator, counterfactual. The two public surfaces (ops console, fan PWA) serve read-mostly traffic and proxy writes through the IAM-gated tier.
- Service-to-service calls mint identity tokens at request time via `google-auth-library` ([cloud-run.ts](apps/frontend/src/lib/cloud-run.ts)) — no SA keys shipped in code.

## Disclosure

**To report a vulnerability:**

1. Send a direct message on GitHub to [@Golden007-prog](https://github.com/Golden007-prog) with "PULSE security" in the subject.
2. Include a reproduction, the expected vs actual behaviour, and a rough severity assessment.
3. Please do **not** file a public GitHub issue for security reports.

**We will:**

- Acknowledge receipt within **48 hours**.
- Share a triage assessment within **one week**.
- Release a fix (or mitigation + detailed explanation) within **30 days** for medium+ severity issues.

**We will not:**

- Pay a bounty. PULSE is a solo hackathon project with no funding.
- File CVEs independently. If a finding warrants one, we'll coordinate with GitHub Security Advisories.
- Litigate good-faith disclosure.

## Automated checks

CI runs on every push ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

- **Gitleaks** with the PULSE [`.gitleaks.toml`](.gitleaks.toml) allowlist.
- **Ruff** + **mypy** on every Python service.
- **ESLint** + **tsc** on both Next.js services.
- **Pytest** on orchestrator tools, **vitest** on fan-PWA components.

Locally: `python -m bandit -r apps/orchestrator/src apps/simulator/src apps/counterfactual/src --severity-level medium` should return zero issues. Output captured in [docs/security-scan.md](docs/security-scan.md).

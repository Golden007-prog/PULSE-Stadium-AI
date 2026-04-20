# Threat model

Short, structured threat model for PULSE. Complements [SECURITY.md](../SECURITY.md) (policy + disclosure) and [docs/privacy.md](privacy.md) (PII posture). The scope is the production architecture as deployed to `pulse-stadium-ai` / `asia-south1` — five Cloud Run services plus Firestore, Pub/Sub, BigQuery, GCS, and Vertex AI.

## System assets

| Asset | Sensitivity | Store |
|---|---|---|
| Fan profiles (seat, display name, language, local preferences) | **Low** — self-declared, no PII | `localStorage` in the Fan PWA only; never written to Firestore |
| Venue state (zone densities, interventions) | **Medium** — operational, not personal | `/venues/chinnaswamy/**` in Firestore |
| Agent traces (token counts, USD cost, chain, summary) | **Medium** — internal auditability | `/agent_traces/**` |
| Counterfactual time-series | **Low** — derived, contains no PII | `/counterfactual/**` |
| Simulated CCTV clips | **Not used yet** — ready for perception | GCS `pulse-cctv-clips` |
| Runtime SA credentials | **High** — identity of all services | Google Secret Manager |
| Firebase Web API key | **Low** — public by design | Committed to source |
| Stitch / CricAPI keys | **High** (if present) | Google Secret Manager, never in code |

## Trust boundaries

```
Public internet
  │
  ▼
┌─────────────────────────────────────────────┐
│  Google Frontend + Cloud Load Balancer      │  ◄── handles TLS, blocks /healthz, enforces IAM
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
  Public surfaces    IAM-gated surfaces
  (frontend +        (orchestrator, simulator,
   fan-pwa)           counterfactual)
        │               │
        └──────┬────────┘
               │ pulse-runtime service account
               ▼
       Firestore · Pub/Sub · Vertex AI · GCS · BigQuery
```

**Trust boundary 1: public internet → Google Frontend.** TLS 1.2+ terminated by Google. No weak cipher suites exposed.

**Trust boundary 2: Google Frontend → IAM-gated Cloud Run.** The two public services (`pulse-frontend`, `pulse-fan-pwa`) proxy sensitive actions server-side using the attached `pulse-runtime` SA. The three private services (`pulse-orchestrator`, `pulse-simulator`, `pulse-counterfactual`) require a valid Google-signed identity token whose `aud` matches the target URL. Client JS never sees these endpoints.

**Trust boundary 3: Cloud Run → GCP backends.** All outbound calls use the attached SA's short-lived access tokens; no static credentials in env or disk. Firestore security rules block every client-side write regardless of auth state.

## STRIDE walkthrough

### Spoofing

- **Threat:** An attacker impersonates the ops console and invokes `/trigger` on `pulse-orchestrator` to burn Vertex credits.
- **Mitigation:** `--no-allow-unauthenticated` on orchestrator; Cloud Run verifies the identity token's `aud` claim. The token is minted by the frontend's SA via `google-auth-library` — an attacker would need the SA's private key, which lives only in Secret Manager.
- **Residual risk:** Low. Per-process `COST_BUDGET_PER_SESSION_USD=1.00` caps runaway spend if the guard is ever bypassed.

### Tampering

- **Threat:** A compromised client mutates Firestore — e.g. writes fake interventions or inflates zone densities to trigger bad Flow decisions.
- **Mitigation:** `infra/firestore.rules` blocks all client-side writes. Server writes use `firebase-admin` with the runtime SA, which bypasses rules but is only callable from the three IAM-gated services.
- **Residual risk:** Low. If the runtime SA were exfiltrated, Google's SA key rotation + audit logs would flag the first anomalous write.

### Repudiation

- **Threat:** A malicious operator denies approving a Flow closure after the fact.
- **Mitigation:** Every agent-initiated write carries a mandatory `reason: str` and lands in `/venues/.../interventions/{id}` with `initiating_agent`, `action`, `target`, and a server-side `created_at` timestamp. Every LLM invocation writes a matching `/agent_traces/{trace_id}` with prompt + response + tokens + cost. Tamper-evident because Firestore preserves change history.
- **Residual risk:** Low.

### Information disclosure

- **Threat:** A fan's seat + preferences leak via a mis-configured Firestore collection.
- **Mitigation:** Fan profiles never leave `localStorage`. Match-state context sent to the Concierge contains no PII. Firestore rules explicitly gate read access to three public collections only.
- **Threat (#2):** Service-account key leakage via git.
- **Mitigation:** `.gitignore` blocks `*-sa-key.json` and `.secrets/`. Gitleaks in CI with the PULSE allowlist. The one AIza-prefixed string in source is the Firebase Web API key, which is public-by-design per Firebase docs.
- **Residual risk:** Low.

### Denial of service

- **Threat:** An attacker hammers the public landing page, burning Cloud Run instance minutes.
- **Mitigation:** Cloud Run default concurrency + instance caps. The scripted demo path writes Firestore directly and makes zero Gemini calls — the expensive path (`/trigger`) is IAM-gated.
- **Residual risk:** Medium. A sustained attack could exhaust the Cloud Build quota; mitigation = Cloud Armor or a CDN in front of the public surfaces. Tracked as a post-hackathon item.

### Elevation of privilege

- **Threat:** Prompt injection in a fan query causes the Concierge to call a tool it shouldn't (e.g. dispatch_medical with an invented incident).
- **Mitigation:** Tool bodies are plain Python; they take typed arguments, not free-form prompts. Every write-tool requires a `reason: str` that's audited. The orchestrator's prompt explicitly instructs it to "never invent events the snapshot doesn't show". The roster of tools available to each agent is fixed at process boot, not model-chosen.
- **Residual risk:** Medium. A persistent injection attack on the Concierge prompt could still surface as a spurious reply to the fan (embarrassing but not destructive). The Concierge cannot invoke Flow or Care directly — it must go through the Orchestrator.

## Supply-chain hygiene

- `pip`-installed Python deps are pinned to minor versions in each `pyproject.toml` and resolved at container build time. Cloud Build isolates the build step.
- `npm`-installed Node deps use `npm install --no-audit --no-fund` with `package.json`; the scanner will flag any new high-severity CVE on every push (GitHub Dependabot is enabled at the repo level).
- Container base images (`python:3.12-slim`, `node:20-slim`) are pulled from Docker Hub on every deploy — the `--source` workflow rebuilds from scratch each time so there's no stale base image.

## Incident response

1. **Detection.** Cloud Logging's default sink captures every request + structured log line. The ops console's trace panel surfaces agent invocations in real time.
2. **Containment.** Two failure-mode hooks:
   - `COST_BUDGET_PER_SESSION_USD` pauses the orchestrator tick loop if Vertex spend crosses $1/process.
   - `gcloud run services delete` can remove a compromised service in seconds; Firestore rules block client writes by default so data plane stays safe.
3. **Recovery.** Firestore's point-in-time recovery is disabled on the free tier; for production deployments this should be enabled.
4. **Lessons learned.** Disclosure policy + triage flow in [SECURITY.md](../SECURITY.md).

## Out of scope

- Physical security of the venue itself.
- Third-party vendor breaches (vendor PoS systems, CCTV vendors, match-API provider).
- Social-engineering attacks against the operator organisation.
- Denial-of-service attacks that exhaust Google Cloud regional capacity.

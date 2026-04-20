# Privacy + security posture

## Design principles

1. **No raw biometrics on the wire.** The simulator's `vision_anomaly` events already carry `severity + confidence`, never facial embeddings or frames. When the Gemini 2.5 Vision service lands (deferred), it will hash faces to event-scoped UUIDs at the perception edge before publishing to Pub/Sub. Raw imagery stays inside `gs://pulse-cctv-clips` with `roles/storage.objectAdmin` bound only to `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`.
2. **Event-scoped identities.** Fan IDs in the demo are short strings (`raj-b-204`) tied to seat + session, not to a permanent account. The Fan PWA stores the profile in `localStorage` — no server-side authentication is attempted, so there's nothing to leak. Firebase Auth anonymous sign-in is available for deployments that need stronger per-fan continuity.
3. **Match-state grounding never carries PII.** Concierge prompt context includes zone densities, queue waits, and frozen Cricinfo data. It never includes the fan's name beyond their self-declared display string.

## Secrets

- **Zero secret files in git history.** `git log --all --full-history -- .mcp.json` returns empty; no `*-sa-key.json` has ever been tracked. Verified by `gitleaks` with the published [`.gitleaks.toml`](../.gitleaks.toml) allowlist (only the Firebase Web API key, which is public by design per [Firebase docs](https://firebase.google.com/docs/projects/api-keys)) and by `detect-secrets`.
- **Secret Manager** holds the runtime configuration. Cloud Run injects at container start via the attached SA (`roles/secretmanager.secretAccessor`).
- **No shipped keys.** Service-to-service calls mint Cloud Run identity tokens at request time via `google-auth-library` (see [apps/frontend/src/lib/cloud-run.ts](../apps/frontend/src/lib/cloud-run.ts)). Nothing is cached on disk.
- **Local dev** uses [.env.example](../.env.example) — placeholder-only. Developers fill in `CRICAPI_KEY` and local SA credentials in their own `.env` which `.gitignore` blocks.

## IAM posture

- Single runtime SA `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com` carries ten least-privilege roles: `run.admin`, `datastore.user`, `pubsub.publisher`, `pubsub.subscriber`, `bigquery.dataEditor`, `bigquery.jobUser`, `storage.objectAdmin`, `aiplatform.user`, `secretmanager.secretAccessor`, `logging.logWriter`.
- Three of five live Cloud Run services are IAM-gated (`--no-allow-unauthenticated`): orchestrator, simulator, counterfactual. The two public surfaces (ops console, fan PWA) only serve GET reads and proxy writes through the IAM-gated tier.
- Cloud Run services call each other with identity tokens whose `aud` claim matches the target URL. The server validates by default.

## Firestore security rules

[`infra/firestore.rules`](../infra/firestore.rules):

- Client READ on `/venues/**`, `/agent_traces/**`, `/counterfactual/**` — exactly the three surfaces the ops console listens to.
- **Every client WRITE is explicitly denied.** Writes come from three places only: (a) the orchestrator via `firebase-admin`, (b) the counterfactual service via `firebase-admin`, (c) the frontend's `/api/scripted/fire` server route via `firebase-admin`. All three ride the `pulse-runtime` SA, which bypasses rules.
- Rule set deployed via the `firebaserules.googleapis.com` REST API under release `projects/pulse-stadium-ai/releases/cloud.firestore`.

## Transport

- HTTPS everywhere — Cloud Run, Firestore client SDK, Firebase Hosting-style requests. TLS termination at Google Front End.
- `WebSocket` use is limited to browser Web Speech; no long-lived WS from Cloud Run (a constraint of the free tier we deliberately stayed within).
- No public ingress to Pub/Sub, BigQuery, GCS, Secret Manager, or Firestore Admin — all locked to IAM principals.

## Audit + observability

- Every agent invocation writes an `/agent_traces` document with inputs, outputs, tokens, cost, duration, and the `invocation_chain`.
- Every write-tool writes an `Intervention` doc with `initiating_agent`, `action`, `target`, `reason`, `status`, and structured `metadata`.
- Cloud Logging captures every HTTP request per Cloud Run service with `resource.labels.service_name` for filtering.
- Cloud Monitoring surfaces CPU / memory / request rate per service via the default Cloud Run metrics scope.

## Disclosure

Public disclosure policy lives in [SECURITY.md](../SECURITY.md). A vulnerability in any service should be reported via a direct message on [@Golden007-prog](https://github.com/Golden007-prog); we aim to acknowledge within 48 h.

## Known limitations

- No VPC Serverless Connector — service-to-service stays on IAM-auth'd public endpoints. mTLS via VPC is a post-hackathon iteration.
- Simulator still exposes `/healthz` (which GFE reserves). Since the service is headless, the reservation is invisible; worth cleaning up.
- Firebase Web API key is committed (allowlisted) — per Firebase docs this is PUBLIC by design. Real security is rule-enforced.

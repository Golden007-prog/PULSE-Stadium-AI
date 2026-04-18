# Cloud Run deployments

Running list of PULSE service URLs. Updated after every deploy.

| Service | Region | URL | Revision | Last deploy |
|---|---|---|---|---|
| pulse-simulator | asia-south1 | https://pulse-simulator-524510164011.asia-south1.run.app | `pulse-simulator-00001-hhc` | 2026-04-18 12:35 UTC |
| pulse-orchestrator | asia-south1 | _pending phase 2_ | — | — |
| pulse-frontend | asia-south1 | _pending phase 3_ | — | — |
| pulse-fan-pwa | asia-south1 | _pending phase 4_ | — | — |
| pulse-counterfactual | asia-south1 | _pending phase 5_ | — | — |
| pulse-perception | asia-south1 | _deferred post-hackathon_ | — | — |

## Simulator notes

- Headless (no allow-unauthenticated); `/healthz` is behind IAM invoker.
- Service account: `pulse-runtime@pulse-stadium-ai.iam.gserviceaccount.com`
- Scaling: `min=1, max=2`, `concurrency=80`, `512Mi` / `1 vCPU`
- Image: `asia-south1-docker.pkg.dev/pulse-stadium-ai/cloud-run-source-deploy/pulse-simulator@sha256:f4e0722...`
- Env: `SCENARIO_FILE=ipl_final.yaml`, `TICK_INTERVAL_MS=1000`, `SCENARIO_AUTOSTART=true`

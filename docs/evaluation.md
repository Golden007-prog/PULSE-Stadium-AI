# Evaluation + reproducibility

How to reproduce every number the demo claims, verify the multi-agent behaviour, and re-run the 90-second auto-play.

## The demo's headline metrics

The [MetricsCard](../apps/frontend/src/components/MetricsCard.tsx) that fades in at T+90 s reads these values from [public/scripted-responses/ipl-final-2026.json](../apps/frontend/public/scripted-responses/ipl-final-2026.json):

| Metric | Value | What it measures |
|---|---:|---|
| Avg wait time | −47 % | Δ between reality and counterfactual per-fan F&B wait, proxy-modelled from in-zone dwell times and queue staffing. See [DeltaMetrics.tsx](../apps/frontend/src/components/DeltaMetrics.tsx). |
| Peak density | −38 % | Max zone density over the 90-s window. Reality capped by Flow's `mark_zone_resolved` at 3.2 p/m²; counterfactual climbs freely (ABS saturation of G-3 ≈ 6.8). |
| Incidents prevented | 7 | Distinct zones crossing 5.5 p/m² in the counterfactual; the ABS engine counts unique crossings per run. |
| F&B revenue lift | +18 % | Per the Revenue agent's `log_revenue_mitigation` interventions — coupons pushed to displaced fans are assumed to recover 60 % of projected lost sales. |
| Medical response | 195 s | Time from `vision_anomaly(severity=high)` at C-12 to `dispatch_medical` intervention in the scripted timeline. |

All of the above are timeline-scripted for determinism. In a live run they would be computed from `/venues/chinnaswamy/interventions/**` and `/counterfactual/{session_id}/metrics`.

## Reproducing the auto-play

1. Open https://pulse-frontend-524510164011.asia-south1.run.app in a fresh incognito window.
2. Click **▶ Watch the 2026 IPL final →**.
3. Observe the 90-second sequence: gate-3 density spike → Flow reroute → fan `beer?` query with prose reply → medical anomaly at C-12 → `care → flow → revenue` chain → metrics card.
4. Dismiss the MetricsCard with **Try it yourself →** to explore the live ops console.

Each button click generates a fresh `run_id` and writes a fresh `/demo_runs/{run_id}` record, so repeated runs are independently auditable. The scripted timeline is byte-for-byte identical; only `run_id` and timestamps change.

## Reproducing the multi-agent chain (live Gemini)

Exercises the actual Orchestrator + Care + Flow + Revenue agents end-to-end. Requires `gcloud auth` with the current user.

```bash
ORCH=https://pulse-orchestrator-bdyqmr2w3q-el.a.run.app
TOKEN=$(gcloud auth print-identity-token --audiences="$ORCH")
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"prompt":"Vision anomaly: person fallen at C-12 severity=high confidence=0.93. Walk the care → flow → revenue chain."}' \
  "$ORCH/trigger" | python -m json.tool
```

Expected shape:

```json
{
  "chain": ["orchestrator"],
  "tool_calls": [
    {"agent": "orchestrator", "tool": "care", ...},
    {"agent": "orchestrator", "tool": "flow", ...},
    {"agent": "orchestrator", "tool": "revenue", ...}
  ],
  "tokens_used": 5085,
  "cost_usd": 0.00774,
  "summary": "Medical unit dispatched to C-12 for fall (severity high). Flow closed C-12 for 4 minutes and rerouted 240 fans to C-01. Revenue pushed a ₹50-off beer coupon..."
}
```

Then verify the Firestore writes:

```bash
gcloud firestore databases list --project pulse-stadium-ai
# or via REST
TOKEN=$(gcloud auth print-access-token)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://firestore.googleapis.com/v1/projects/pulse-stadium-ai/databases/(default)/documents/venues/chinnaswamy/interventions?pageSize=10&orderBy=created_at%20desc"
```

You should see ~8 new documents with `initiating_agent` in `{care, flow, revenue}` within 60 s of the trigger.

## The counterfactual as integration test

The counterfactual simulator is deliberately Gemini-free so it can act as a deterministic integration harness:

1. It seeds its t=0 state by reading `/venues/chinnaswamy/zones` — same data the reality agents read.
2. It ticks a known inflow + diffusion model every 5 s for 120 ticks.
3. Reality-vs-CF divergence at any tick is a functional test: if Flow's `reroute_fans` stops firing on G-3, the delta strip collapses and the split-screen visually degenerates.

This means a silent regression in the orchestrator — e.g. the chain breaking — surfaces *visually* the next time the CF toggle is flipped. No separate assertion infrastructure required.

## Unit + component tests

- **Python:** `pytest` covers agent tools with Firestore client mocked via `unittest.mock`. Happy-path plus one error path per tool. Run: `cd apps/orchestrator && uv pip install -e . && pytest src/tests -v`.
- **TypeScript:** `vitest` + `@testing-library/react` covers the fan-PWA components. Run: `cd apps/fan-pwa && pnpm install && pnpm test`.
- **CI:** [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs ruff + mypy + pytest on Python, ESLint + tsc + vitest on TS, and `gitleaks` on the repo on every push.

## Manual QA checklist

Before each submission commit:

- [ ] `du -sh --exclude=.git --exclude=node_modules --exclude=.next .` < 1 MB
- [ ] `git branch -a` shows only `main`
- [ ] `/` renders landing with "Watch the 2026 IPL final" button
- [ ] `/ops` renders with the twin, roster, trace panel, and playback bar
- [ ] Counterfactual toggle produces a split-screen
- [ ] Fan PWA `/` renders onboarding; onboarded flow reaches Concierge tab
- [ ] All six rubric axes have concrete evidence in README

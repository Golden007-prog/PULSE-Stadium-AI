# pulse-orchestrator

ADK 1.x multi-agent service. Runs the PULSE decision loop: subscribe to `sensor-events`, maintain a venue state buffer, and every 5s invoke the Orchestrator `LlmAgent` to delegate to Flow / Queue / Concierge specialists.

## Agents (phase 2)

- **orchestrator** — Gemini 2.5 Pro root agent; routes to specialists via ADK LLM-driven delegation.
- **flow** — Gemini 2.5 Flash; density prediction, signage, rerouting, concourse closure.
- **queue** — Gemini 2.5 Flash; F&B + restroom wait forecasting, nudges.
- **concierge** — Gemini 2.5 Flash; per-fan voice/chat, match-state-aware.

Care / Safety / Experience / Revenue files exist as placeholders and will be populated in phase 5.

## Firestore writes

- `/venues/{id}/zones/{zone_id}.current_density` — updated from `density_delta` events and after Flow's `mark_zone_resolved` tool call.
- `/venues/{id}/interventions/{id}` — every tool-initiated action (signage, reroute, closure).
- `/agent_traces/{trace_id}` — one document per ADK invocation, with token counts and USD cost.

## Endpoints

- `GET /healthz` — tick count, invocation count, pending fan queries, total USD spent.
- `POST /trigger` — manually invoke the orchestrator with a freeform prompt (testing).

## Local dev

```bash
uv venv && source .venv/Scripts/activate
uv pip install -r pyproject.toml
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
export GOOGLE_CLOUD_PROJECT=pulse-stadium-ai
export GOOGLE_CLOUD_LOCATION=asia-south1
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
uvicorn src.main:app --reload
```

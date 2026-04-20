# Agent specifications

Five live agents on the orchestrator, two placeholders. Everything below maps to a file in [apps/orchestrator/src/](../apps/orchestrator/src/); `# post-hackathon` tags mark placeholders.

## Live agents

### Orchestrator (root)

- **File:** [agents/orchestrator.py](../apps/orchestrator/src/agents/orchestrator.py) · **Prompt:** [prompts/orchestrator.md](../apps/orchestrator/src/prompts/orchestrator.md)
- **Model:** Gemini 2.5 Pro (via Vertex AI, routed to `us-central1`)
- **Role:** Reads venue snapshots every 5 s plus ad-hoc fan queries; composes the negotiation across specialists.
- **Tools (all specialists exposed as `AgentTool`):** `flow`, `queue`, `concierge`, `care`, `revenue`.
- **Decision rules:** medical anomaly → `care → flow → revenue`; density ≥ 4 p/m² → `flow` (+ `revenue` if > 200 rerouted); fan query → `concierge` (with optional `queue`); else no-op.
- **Trigger cadence:** every 5 s + on any Pub/Sub `sensor-events` event that fills the in-memory buffer.

### Flow

- **File:** [agents/flow_agent.py](../apps/orchestrator/src/agents/flow_agent.py) · **Prompt:** [prompts/flow.md](../apps/orchestrator/src/prompts/flow.md)
- **Model:** Gemini 2.5 Flash
- **Role:** Crowd density prediction + intervention. Preferred order: signage → reroute → closure.
- **Tools:** `get_zone_density`, `predict_zone_density`, `compute_route`, `close_concourse`, `update_signage`, `reroute_fans`, `mark_zone_resolved`, `list_all_zones` (see [tools/flow_tools.py](../apps/orchestrator/src/tools/flow_tools.py)).
- **Decision policy:** target ≤ 3.5 p/m²; every write-tool takes a mandatory `reason` that hits the `Intervention` doc.

### Queue

- **File:** [agents/queue_agent.py](../apps/orchestrator/src/agents/queue_agent.py) · **Prompt:** [prompts/queue.md](../apps/orchestrator/src/prompts/queue.md)
- **Model:** Gemini 2.5 Flash
- **Role:** F&B + restroom wait specialist. Returns prose answers to the Concierge (no JSON, per the phase-5.1 fix).
- **Tools:** `find_nearest`, `get_queue_state`, `nudge_fans`.
- **Flag wait > 180 s; suggest alternative.**

### Concierge

- **File:** [agents/concierge_agent.py](../apps/orchestrator/src/agents/concierge_agent.py) · **Prompt:** [prompts/concierge.md](../apps/orchestrator/src/prompts/concierge.md)
- **Model:** Gemini 2.5 Flash (voice-capable via Web Speech bridge; Gemini Live deferred)
- **Role:** One instance per fan. Voice-first, ≤ 15-word reply, ends with a useful next action.
- **Tools:** `get_fan_context`, `get_match_state`; invokes `queue` via orchestrator composition.
- **Golden-path example:** *"beer?"* → *"Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"*

### Care

- **File:** [agents/care_agent.py](../apps/orchestrator/src/agents/care_agent.py) · **Prompt:** [prompts/care.md](../apps/orchestrator/src/prompts/care.md)
- **Model:** Gemini 2.5 Flash
- **Role:** Medical + accessibility + lost-child. Dispatches, books ambulance route, requests concourse clearance.
- **Tools:** `dispatch_medical`, `route_ambulance`, `request_flow_clearance`, `register_lost_child` (see [tools/care_tools.py](../apps/orchestrator/src/tools/care_tools.py)).
- **Acknowledgement SLO:** within 30 s. Critical severity triggers the full `care → flow → revenue` chain.

### Revenue

- **File:** [agents/revenue_agent.py](../apps/orchestrator/src/agents/revenue_agent.py) · **Prompt:** [prompts/revenue.md](../apps/orchestrator/src/prompts/revenue.md)
- **Model:** Gemini 2.5 Flash
- **Role:** Compensating offers, dynamic pricing nudges.
- **Tools:** `push_targeted_offer`, `log_revenue_mitigation`, `adjust_stall_price` (see [tools/revenue_tools.py](../apps/orchestrator/src/tools/revenue_tools.py)).
- **Typical mitigation:** 5-minute concourse closure ≈ 40 lost sales; push ₹50 coupon to ~200 displaced fans.

## Placeholders (post-hackathon)

### Safety

- **File:** [agents/safety_agent.py](../apps/orchestrator/src/agents/safety_agent.py) — roster-only stub, no `LlmAgent` body.
- **Planned:** Gemini 2.5 Pro Vision classifying CCTV anomalies (fight / fall / crush-formation). Care agent currently handles high-severity vision_anomaly events in its place. `# post-hackathon`

### Experience

- **File:** [agents/experience_agent.py](../apps/orchestrator/src/agents/experience_agent.py) — roster-only stub.
- **Planned:** personalised delight nudges (jumbotron shout-outs, milestone pushes) from the Experience rubric. Fan PWA's Nudges screen is currently seeded with sample cards. `# post-hackathon`

## Tool-design conventions (Idea.md §6.5)

- JSON-safe return envelope: `{ ok, data, error? }`.
- Every write-tool requires a `reason` string; reason lands in the `Intervention` doc's audit log.
- Pydantic-typed inputs at the ADK layer (`Zone`, `Intervention`, `AgentTrace` in [state/firestore_client.py](../apps/orchestrator/src/state/firestore_client.py)).
- Cost + duration captured per invocation by [tracing/cost_tracker.py](../apps/orchestrator/src/tracing/cost_tracker.py) and written to `/agent_traces`.

## Verified chain (phase 5.5 smoke test)

```
POST /trigger {prompt: "Vision anomaly at C-12 severity=high ..."}
  chain:    orchestrator → care → flow → revenue
  tokens:   5,085
  cost:     $0.00774
  duration: 47 s
  intervention writes: 8 (dispatch_medical, request_flow_clearance,
                         route_ambulance, close_concourse, reroute_fans × 2,
                         push_targeted_offer, log_mitigation)
```

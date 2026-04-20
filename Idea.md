# PULSE — The Self-Aware Stadium
## Project Idea Document

> *A Gemini + ADK multi-agent operating layer for large-scale sporting venues.*
>
> **Hackathon:** Gen AI Academy APAC Edition — Track 1 (Build and deploy AI agents using Gemini, ADK, and Cloud Run)
> **Author:** Oikantik ("Golden") Basu · [github.com/Golden007-prog](https://github.com/Golden007-prog)
> **GCP Project:** `bruhworking` · Region: `asia-south1`
> **Last updated:** 17 April 2026

---

## Table of contents

1. [TL;DR](#1-tldr)
2. [Problem statement](#2-problem-statement)
3. [The idea: PULSE](#3-the-idea-pulse)
4. [System Architecture Document (SAD)](#4-system-architecture-document-sad)
5. [Workflow diagrams](#5-workflow-diagrams)
6. [Detailed system design](#6-detailed-system-design)
7. [Project structure](#7-project-structure)
8. [MCP configuration](#8-mcp-configuration)
9. [Development plan](#9-development-plan)
10. [Demo script](#10-demo-script)
11. [Success metrics](#11-success-metrics)
12. [Appendix](#12-appendix)

---

## 1. TL;DR

PULSE is a multi-agent AI nervous system for sporting venues. Eight ADK agents, coordinated by a Gemini 2.5-powered orchestrator, ingest simulated CCTV, IoT, match-state, and fan-signal streams; reason about crowd flow, queues, care, safety, experience, revenue, and per-fan concierge in real-time; and act through a fan Progressive Web App, staff devices, dynamic digital signage, and an operator-facing 3D digital twin. Everything deploys on Cloud Run in `asia-south1` using the `bruhworking` GCP project.

Three things make PULSE unique versus the ~500 other submissions a judge will see:

1. **An active, counterfactual digital twin** — the operator sees what *would have happened* alongside what *did happen* once agents intervened.
2. **Visible agent negotiation** — Care Agent asking Flow Agent to close a concourse, Flow Agent checking Revenue Agent for vendor impact, Revenue Agent pushing compensating offers. All of it streams into the ops console as a live transcript. Nobody else will have this.
3. **Match-state-aware per-fan concierge** — a fan says *"beer?"*, PULSE checks Cricinfo, knows Kohli is on strike, replies via Gemini Live voice: *"Gate 4 stand, 90-second queue, you'll make it back for the over."* This integration is the single most novel product move in the submission.

---

## 2. Problem statement

### 2.1 The hackathon brief

> *"Design a solution that improves the physical event experience for attendees at large-scale sporting venues. The system should address challenges such as crowd movement, waiting times, and real-time coordination, while ensuring a seamless and enjoyable experience."*

### 2.2 Decoding the brief

Four evaluation axes, each a keyword in the prompt:

| Axis | Prompt keyword | PULSE answer |
|---|---|---|
| Physicality | "physical event experience" | In-venue actions: signage, AR, voice, staff dispatch |
| User primary | "attendees" | Fan PWA + per-fan Concierge Agent |
| Scale | "large-scale" | 40k+ concurrent Concierge instances via Flash |
| Explicit challenges | "crowd movement, waiting times, real-time coordination" | Flow + Queue + Orchestrator agents, each a visible rubric item |
| Implicit goals | "seamless and enjoyable" | Voice-native, zero-install PWA; Experience Agent for delight |

### 2.3 The real-world problem

Stadiums today coordinate 10+ independent organizations (security, operations, F&B, medical, broadcast, ticketing, stewards, cleaning, police, emergency services) over radios, WhatsApp groups, and paper runbooks. CCTV is 100–300 cameras being watched by humans who miss things. IoT exists but sits in silos. Crowd crush deaths (Itaewon 2022, Kanjuruhan 2022, Hillsborough 1989) happen not because the data is missing but because nobody is fusing it into action in real-time.

### 2.4 What has been built and what has not

- **Qatar FIFA 2022 Aspire Command Center** — 22,000 cameras, 8 stadiums, 100+ technicians watching screens. Costs nine figures. No multi-agent AI.
- **Enterprise smart-stadium suites** (IBM, Cisco, Fujitsu, Tech Mahindra) — rules-based dashboards.
- **Academic agent-based models** (Allianz Arena [Wąs et al. 2014], Sochi Olympics [Karbovskii et al. 2018], EvacuNet [2025]) — offline simulation, not live ops.
- **Google's own ADK blog (Nov 2025)** — *literally uses the stadium as its multi-agent metaphor* but nobody has built the product.

PULSE fills the gap. Full reference list: see `REFERENCES.md`.

---

## 3. The idea: PULSE

### 3.1 One-sentence pitch

*PULSE gives 40,000-seat stadiums a nervous system: eight ADK agents that see via Gemini Vision, reason in Gemini 2.5, negotiate with each other, and act through every surface a fan or operator touches.*

### 3.2 The three pillars

- **Safety floor.** Predict and prevent bottlenecks, crushes, and medical escalations 10–15 minutes before they form.
- **Coordination mid.** Replace the 15-WhatsApp-group coordination with a unified, traceable agent backbone.
- **Delight ceiling.** Per-fan, match-state-aware concierge that makes a 40,000-person building feel personally designed.

### 3.3 Eight agents

| Agent | Purpose | Model | Rubric item |
|---|---|---|---|
| Orchestrator | Routes requests, resolves conflicts | Gemini 2.5 Pro | All |
| Flow | Crowd density prediction + routing | Gemini 2.5 Flash | Crowd movement |
| Queue | F&B + restroom wait optimization | Gemini 2.5 Flash | Waiting times |
| Care | Medical, accessibility, lost-child | Gemini 2.5 Flash | Safety + care |
| Safety | Anomaly detection, crush prevention | Gemini 2.5 Pro Vision | Safety |
| Experience | Personalized delight, match-state nudges | Gemini 2.5 Flash | Enjoyable |
| Revenue | Dynamic pricing, targeted offers | Gemini 2.5 Flash | Operational |
| Concierge | Per-fan voice + chat | Gemini 2.5 Flash-Live | Seamless |

### 3.4 Why this wins the track

Track 1 explicitly asks for ADK + Gemini + Cloud Run. PULSE uses all three canonically, not tangentially: ADK is the backbone, Gemini 2.5 handles perception and reasoning, Cloud Run hosts every service. Crucially, PULSE genuinely *needs* multi-agent architecture — a single god-agent trying to do crowd math, medical dispatch, voice conversation, and dynamic pricing would be slow, expensive, and unreliable. Specialist agents with narrow tool sets is the only architecturally sound answer.

---

## 4. System Architecture Document (SAD)

### 4.1 Architecture overview

PULSE is a five-layer pipeline deployed as six Cloud Run services with Firestore as the real-time state backbone and Pub/Sub as the inter-service event bus. BigQuery holds historicals for analytics and post-match intelligence reports.

### 4.2 Layer-by-layer breakdown

#### Layer 1 — Inputs (sensor substrate)

| Source | Format | Rate | Transport |
|---|---|---|---|
| Simulated CCTV | MP4 clips at 720p | 1 frame every 5s per zone | Cloud Storage → Pub/Sub notification |
| IoT (turnstiles, PoS, restrooms) | JSON events | 10–500 events/sec | Pub/Sub `sensor-events` topic |
| Match API (Cricinfo) | JSON polled | Every 30s | Cloud Scheduler → Firestore |
| Fan signals (PWA) | JSON + audio stream | Per-fan, event-driven | WebSocket → Pub/Sub `fan-actions` |
| Weather | JSON | Every 10min | Cloud Scheduler → Firestore |

For the hackathon demo, a Python `simulator` service synthesizes all of the above against a scripted 30-minute match-day timeline.

#### Layer 2 — Perception

- **Gemini 2.5 Pro Vision** reads video clips every N seconds, returns structured JSON with per-zone density estimates and anomaly flags (fight, fall, crush-formation).
- **Gemini 2.5 Flash-Live** handles real-time fan voice input/output on the PWA via bidirectional WebSocket.
- **Stream processor** (Cloud Run service) deduplicates, tags, and enriches IoT events before they hit Firestore. Written in Python + FastAPI.

#### Layer 3 — State

- **Firestore (Native mode)** — the hot store. Real-time listeners power the digital twin UI and agent sub-agent subscriptions. Sub-100ms propagation from write to all listeners.
- **Pub/Sub** — the event bus. Every sensor event, agent decision, and action publishes to a typed topic. Agents subscribe to the topics they care about.
- **BigQuery** — the cold store. Streaming inserts via Cloud Function fan-out from Pub/Sub. Powers analytics dashboards and the post-match AAR report.

#### Layer 4 — Cognition

- **ADK Orchestrator** — one root `LlmAgent` that holds the rolling venue-state snapshot and delegates to specialists via LLM-driven delegation.
- **Seven specialist agents** — each a `LlmAgent` with a narrow tool set (3–6 tools). Agents can invoke each other via `AgentTool` for explicit negotiation.
- **Shared Session State** — the "digital whiteboard" from the ADK blog. Every agent writes decisions + rationale + affected zones. The frontend reads this state for the live trace panel.

#### Layer 5 — Actions

- **Fan PWA** (Next.js, zero-install, WebXR for AR)
- **Staff devices** — tasks pushed via Firebase Cloud Messaging to staff PWA
- **Digital signage** — TV screens rendering a fullscreen Next.js page that reacts to Firestore
- **Ops console** — the 3D digital twin + agent trace panel

### 4.3 Technology stack

| Concern | Choice | Why |
|---|---|---|
| Agent framework | Google ADK 2.5 | Track 1 requirement; multi-agent primitives free |
| Model (planning) | Gemini 2.5 Pro | Needs big context for 7-agent orchestration |
| Model (workers) | Gemini 2.5 Flash | 10× cheaper for per-fan scale |
| Model (vision) | Gemini 2.5 Pro Vision | Native video ingestion from `gs://` URIs |
| Model (voice) | Gemini 2.5 Flash-Live | Same engine that powers Google Meet captions |
| Real-time state | Firestore | Sub-100ms listener push, zero backend code |
| Event bus | Pub/Sub | Managed, exactly-once, observable |
| Analytics | BigQuery + Looker Studio | Free tier, `AI.GENERATE()` native |
| Compute | Cloud Run | Scale-to-zero, Track 1 requirement |
| Frontend | Next.js 15 + React Three Fiber + Tailwind | Single-codebase for ops + fan + signage |
| Infra-as-code | Terraform | Reproducible deploys for demo reset |
| Dev IDE | Antigravity (Kiro IDE) | Golden's daily driver |
| MCP servers | Cloud Run MCP + Firestore MCP + GitHub MCP | Automate deploys + ops from the IDE |

### 4.4 Non-functional requirements

| NFR | Target | How it's met |
|---|---|---|
| End-to-end latency (fan query → voice reply) | < 2.5s | Flash-Live streaming, Firestore cache |
| Agent decision loop period | 5s | Orchestrator runs every 5s on rolling state |
| Scalability | 40k concurrent Concierge sessions | Cloud Run concurrency 80/instance × autoscale |
| Availability during 2-hour demo window | 99.95% | Cloud Run multi-instance, health checks |
| Observability | 100% of agent decisions traced | ADK's built-in tracing → Cloud Logging |
| Privacy | No fan facial identity persisted | Faces hashed to event-scoped IDs, reset post-match |

### 4.5 Security and privacy

- **Identity.** Firebase Auth for fans (anonymous allowed), IAM service accounts for service-to-service.
- **PII handling.** Faces from simulated CCTV are hashed to event-scoped UUIDs at the perception layer; raw biometrics never hit Firestore.
- **Secrets.** Secret Manager for API keys; loaded at Cloud Run startup, never committed.
- **Transport.** mTLS between Cloud Run services via VPC connector. WebSockets over TLS 1.3.
- **Audit.** Every agent decision persists to BigQuery with initiating agent, rationale, affected entities.

### 4.6 Scalability story

- Per-fan Concierge instances are stateless — each invocation loads fan context from Firestore, reasons, writes back, returns. Linear scale with Cloud Run instance count.
- Orchestrator is a singleton loop; at 40k fans it still runs every 5s because it reasons over *zones* (~50) not fans.
- Firestore sharded by `venue_id/zone_id` prefix to distribute hot spots.
- BigQuery streaming inserts handle 100k events/sec without breaking a sweat; we'll hit at most ~1k/sec.

---

## 5. Workflow diagrams

All diagrams below are [Mermaid](https://mermaid.js.org/) — they render natively in GitHub and Antigravity markdown previews.

### 5.1 Top-level data flow

```mermaid
flowchart TB
    subgraph Inputs["Layer 1 — Inputs"]
        CCTV[Simulated CCTV<br/>MP4 clips]
        IoT[IoT Streams<br/>Turnstiles · PoS · Restrooms]
        Match[Match API<br/>Cricinfo JSON]
        Fan[Fan Signals<br/>PWA chat + voice]
    end

    subgraph Perception["Layer 2 — Perception"]
        Vision[Gemini 2.5 Pro Vision<br/>Frames → density tensors]
        StreamProc[Stream Processor<br/>Normalize · Enrich]
    end

    subgraph State["Layer 3 — State"]
        Firestore[(Firestore<br/>Live venue state)]
        PubSub{{Pub/Sub<br/>Event bus}}
        BigQuery[(BigQuery<br/>Historicals)]
    end

    subgraph Cognition["Layer 4 — Cognition (ADK)"]
        Orchestrator[Orchestrator<br/>Gemini 2.5 Pro]
        Flow[Flow Agent]
        Queue[Queue Agent]
        Care[Care Agent]
        Safety[Safety Agent]
        Exp[Experience Agent]
        Rev[Revenue Agent]
        Con[Concierge Agent]
    end

    subgraph Actions["Layer 5 — Actions"]
        PWA[Fan PWA<br/>Push · AR · Voice]
        Staff[Staff Devices<br/>Geo tasks]
        Sign[Digital Signage<br/>Dynamic routing]
        Ops[Ops Console<br/>Digital Twin]
    end

    CCTV --> Vision
    IoT --> StreamProc
    Match --> StreamProc
    Fan --> StreamProc
    Vision --> PubSub
    StreamProc --> PubSub
    PubSub --> Firestore
    PubSub --> BigQuery
    Firestore --> Orchestrator
    Orchestrator --> Flow
    Orchestrator --> Queue
    Orchestrator --> Care
    Orchestrator --> Safety
    Orchestrator --> Exp
    Orchestrator --> Rev
    Orchestrator --> Con
    Flow --> Firestore
    Queue --> Firestore
    Care --> Firestore
    Safety --> Firestore
    Exp --> Firestore
    Rev --> Firestore
    Con --> Firestore
    Firestore --> PWA
    Firestore --> Staff
    Firestore --> Sign
    Firestore --> Ops
```

### 5.2 End-to-end fan query flow ("beer?" scenario)

```mermaid
sequenceDiagram
    participant F as Fan (PWA)
    participant CA as Concierge Agent
    participant FS as Firestore
    participant MA as Match API
    participant QA as Queue Agent
    participant FA as Flow Agent
    participant V as Voice (Flash-Live)

    F->>CA: "beer?" (voice via WebSocket)
    CA->>FS: get_fan_context(fan_id)
    FS-->>CA: {seat: B-204, prefs: [lager]}
    CA->>MA: get_match_state()
    MA-->>CA: {over: 18.3, on_strike: Kohli}
    CA->>QA: find_nearest_beer_stall(B-204)
    QA->>FS: read queue states near B-204
    FS-->>QA: [gate-4-bar: 90s, gate-5-bar: 240s]
    QA-->>CA: gate-4-bar, 90s wait
    CA->>FA: compute_route(B-204, gate-4-bar)
    FA-->>CA: 2min walk via concourse A
    CA->>V: synthesize("Gate 4 stand, 90 seconds, you'll make it back for the over")
    V-->>F: audio stream + AR route overlay
    CA->>FS: log_interaction(fan_id, decision)
```

### 5.3 Agent negotiation flow (medical dispatch with revenue compensation)

```mermaid
sequenceDiagram
    participant V as Vision
    participant S as Safety Agent
    participant O as Orchestrator
    participant C as Care Agent
    participant F as Flow Agent
    participant R as Revenue Agent
    participant Si as Signage
    participant St as Staff PWA

    V->>S: anomaly: person fallen at zone C-12
    S->>O: escalate(fall, C-12, severity=high)
    O->>C: dispatch_medical(C-12)
    C->>O: need concourse-B-south closed for ambulance route
    O->>F: close_concourse(B-south, 4min)
    F->>O: approved, rerouting 400 fans via C-north
    F->>R: vendor-12 in B-south loses ~40 sales, mitigate?
    R->>O: push ₹50 off coupon to 200 nearest fans
    O->>Si: update signage in B-south
    O->>St: dispatch medical + security tasks
    par Actions in parallel
        Si->>Si: "Exit via C-north →"
        St->>St: Medical task #M-47 assigned to unit 3
        R->>R: coupons sent to 200 fans
    end
    Note over O: Full negotiation trace logged<br/>visible in ops console
```

### 5.4 Counterfactual live simulation flow

```mermaid
flowchart LR
    Reality[Live venue state<br/>Firestore] --> Orch[Orchestrator decides<br/>to intervene at T+0]
    Orch --> Intervened[Intervened timeline<br/>T+0 to T+10min]
    Orch --> Counter[Counterfactual timeline<br/>T+0 to T+10min<br/>no intervention]
    Intervened --> Twin[Ops Twin UI]
    Counter --> Twin
    Twin --> Operator[Operator sees<br/>both timelines side by side]
```

The counterfactual runs in a separate lightweight simulator (Cloud Run) fed the same initial state but with all agent actions suppressed. The twin UI renders them as a ghost overlay.

### 5.5 Demo scenario auto-play flow

```mermaid
stateDiagram-v2
    [*] --> Landing: Judge opens URL
    Landing --> Scenario1: Click "Watch the 2026 IPL final"
    Scenario1 --> GateCongestion: T+0: Gate 3 heatmap red
    GateCongestion --> FlowIntervenes: T+30s: Flow agent reroutes
    FlowIntervenes --> GateRelieved: T+60s: Red diffuses
    GateRelieved --> FanQuery: T+90s: "Raj" asks for beer
    FanQuery --> MedicalEvent: T+2m: Fall detected
    MedicalEvent --> Negotiation: T+2m30s: Agents negotiate
    Negotiation --> Resolution: T+3m: Medical dispatched, revenue compensated
    Resolution --> Metrics: T+3m30s: "47% wait-time reduction" card
    Metrics --> TryYourself: Judge can now interact freely
    TryYourself --> [*]
```

### 5.6 Deployment topology

```mermaid
flowchart TB
    subgraph GCP["GCP project: bruhworking · region: asia-south1"]
        subgraph CloudRun["Cloud Run services"]
            Orch[pulse-orchestrator]
            Perc[pulse-perception]
            Sim[pulse-simulator]
            FE[pulse-frontend]
            PWA[pulse-fan-pwa]
            Sign[pulse-signage]
        end
        subgraph Data["Data services"]
            FS[(Firestore Native)]
            BQ[(BigQuery)]
            GCS[(Cloud Storage<br/>CCTV clips)]
            PS{{Pub/Sub}}
            SM[Secret Manager]
        end
        subgraph External["External APIs"]
            Vertex[Vertex AI<br/>Gemini 2.5]
            FCM[Firebase<br/>Cloud Messaging]
            Cric[Cricinfo API]
        end
    end

    Sim --> PS
    Sim --> GCS
    Perc --> Vertex
    Perc --> PS
    Orch --> Vertex
    Orch --> FS
    Orch --> PS
    FE --> FS
    PWA --> Vertex
    PWA --> FCM
    Sign --> FS
    FS --> BQ
    PS --> BQ
```

---

## 6. Detailed system design

### 6.1 Firestore data model

```
/venues/{venue_id}
  name: string                    # "M. Chinnaswamy Stadium"
  capacity: int                   # 40000
  center_lat, center_lng: float
  zones: array<zone_summary>      # denormalized for fast reads

/venues/{venue_id}/zones/{zone_id}
  name: string                    # "Concourse B North"
  type: enum                      # gate | seating | concourse | concession | restroom
  polygon: array<[lat, lng]>
  capacity: int
  current_density: float          # people per m²
  predicted_density_5m: float
  predicted_density_15m: float
  last_updated: timestamp

/venues/{venue_id}/events/{event_id}
  match_id: string                # "RCB_vs_CSK_2026_final"
  home_team: string
  away_team: string
  start_time: timestamp
  state: enum                     # pre | live | halftime | post
  attendance: int
  match_api_last_sync: timestamp
  live_state: map                 # current over, batsmen, score

/venues/{venue_id}/queues/{queue_id}
  location_zone: string           # ref to zones
  type: enum                      # concession | restroom | merchandise
  current_wait_seconds: int
  forecasted_wait_5m: int
  staff_count: int
  throughput_per_min: float
  menu_items: array               # only for concessions

/venues/{venue_id}/incidents/{incident_id}
  type: enum                      # medical | security | lost-child | crush-risk
  severity: enum                  # low | med | high | critical
  location_zone: string
  status: enum                    # open | acknowledged | resolved
  assigned_agent: string          # e.g. "care-agent"
  assigned_staff: string
  created_at, updated_at: timestamp
  timeline: array<event>

/venues/{venue_id}/interventions/{intervention_id}
  initiating_agent: string
  action: string                  # "close_concourse" etc
  target: string                  # zone id, queue id, etc.
  reason: string                  # LLM-written rationale
  negotiation_log: array<turn>    # for the ops console
  created_at: timestamp
  ttl: timestamp                  # auto-expires

/fans/{fan_id}
  display_name: string
  seat: string                    # "B-204"
  accessibility_needs: array      # wheelchair, sensory, etc.
  preferences: map                # food_likes, dislikes, language
  active_session_id: string
  match_history: array<match_id>

/fans/{fan_id}/sessions/{session_id}
  started_at: timestamp
  last_active: timestamp
  interactions: array             # chat + voice turns
  nudges_received: array

/agent_traces/{trace_id}
  timestamp: timestamp
  root_agent: string              # usually orchestrator
  invocation_chain: array<agent>
  inputs: map
  outputs: map
  tokens_used: int
  cost_usd: float                 # reuse the bruhworking cost tracker
  duration_ms: int
```

### 6.2 Pub/Sub topics

| Topic | Publishers | Subscribers | Message schema |
|---|---|---|---|
| `sensor-events` | simulator | stream-processor | `{type, zone_id, timestamp, payload}` |
| `vision-frames` | simulator | perception | `{clip_uri, zone_id, timestamp}` |
| `agent-events` | all agents | trace-writer, ops-console | `{agent, decision, rationale, targets}` |
| `fan-actions` | PWA | concierge, experience | `{fan_id, action, timestamp, payload}` |
| `staff-tasks` | orchestrator | staff-pwa-dispatcher | `{task_id, staff_id, zone_id, type, priority}` |
| `signage-updates` | flow, experience | signage-service | `{screen_id, content, duration_s}` |

### 6.3 Agent specifications

Each agent below gets a full specification: model, system prompt sketch, tools, and example decision.

#### 6.3.1 Orchestrator Agent (root)

```yaml
name: orchestrator
type: LlmAgent (ADK)
model: gemini-2.5-pro
role: Root agent; routes fan and sensor-triggered requests to specialists,
      mediates conflicts, maintains global venue priorities.
sub_agents:
  - flow, queue, care, safety, experience, revenue, concierge
tools:
  - list_open_incidents()
  - get_venue_priorities()
  - escalate_to_human(reason)
trigger_cadence: every 5s + on any Pub/Sub agent-event
```

Example: a crush-risk flag from Safety and a pending F&B promotion from Revenue both target the same concourse. Orchestrator resolves by granting Safety priority, suspending Revenue's action, writing rationale to the trace.

#### 6.3.2 Flow Agent

```yaml
name: flow
type: LlmAgent (ADK)
model: gemini-2.5-flash
role: Predict crowd density and flow, recommend interventions,
      close/open routes, update signage.
tools:
  - get_zone_density(zone_id) -> float
  - predict_zone_density(zone_id, minutes_ahead) -> float
  - compute_route(from_zone, to_zone, avoid_zones?) -> route
  - close_concourse(concourse_id, duration_min) -> bool
  - open_concourse(concourse_id) -> bool
  - update_signage(screen_id, message, duration_s) -> bool
  - list_affected_fans(zone_id) -> array<fan_id>
decision_model: |
  Every cycle, scan zones for predicted_density_15m > 4 p/m².
  For each, compute minimum-intervention path that brings density under 3.5.
  Prefer passive (signage) over active (closure) interventions.
```

#### 6.3.3 Queue Agent

```yaml
name: queue
type: LlmAgent (ADK)
model: gemini-2.5-flash
role: Forecast F&B and restroom waits, reallocate staff, nudge fans toward
      lower-wait options.
tools:
  - get_queue_state(queue_id) -> queue
  - forecast_queue(queue_id, minutes_ahead) -> int seconds
  - find_nearest(fan_id, category) -> array<queue>
  - reallocate_staff(from_zone, to_zone, count) -> bool
  - push_crowd_nudge(zone_ids, category, alternative_queue_id) -> int fans
  - update_pre_order_window(stall_id, open_bool) -> bool
decision_model: |
  Target: no queue exceeds 180s wait. When forecast > 180s:
    1. Check if adjacent staff can be reallocated.
    2. Else nudge inbound fans to alternatives.
    3. Escalate to Revenue Agent if load imbalance suggests pricing adjustment.
```

#### 6.3.4 Care Agent

```yaml
name: care
type: LlmAgent (ADK)
model: gemini-2.5-flash
role: Coordinate medical, accessibility support, and lost-child reunification.
tools:
  - dispatch_medical(location_zone, severity) -> incident_id
  - get_medical_bay_status() -> {available_beds, staff_on_duty}
  - route_ambulance(from_zone, to_exit) -> route
  - register_lost_child(name, last_seen_zone, guardian_contact) -> incident_id
  - broadcast_lost_child(incident_id) -> bool
  - request_accessibility_escort(fan_id, route) -> bool
decision_model: |
  All incidents are acknowledged within 30s. Medical severity=critical
  triggers ambulance route AND negotiation with Flow Agent to clear path.
```

#### 6.3.5 Safety Agent

```yaml
name: safety
type: LlmAgent (ADK)
model: gemini-2.5-pro (needs vision reasoning)
role: Scan Gemini-Vision anomaly flags; classify; escalate.
tools:
  - get_recent_anomalies(window_s) -> array<anomaly>
  - classify_anomaly(anomaly_id) -> {type, severity, confidence}
  - trigger_pa_announcement(zone_id, message) -> bool
  - escalate_to_authorities(incident_id, authority_type) -> bool
  - log_near_miss(description, zone_id) -> bool
decision_model: |
  Confidence > 0.8 AND severity >= medium → immediate action.
  Confidence 0.5–0.8 → write to trace, wait one cycle, re-evaluate.
  Confidence < 0.5 → discard.
```

#### 6.3.6 Experience Agent

```yaml
name: experience
type: LlmAgent (ADK)
model: gemini-2.5-flash
role: Surface delight moments — birthday mentions, match-milestone
      notifications, personalized nudges.
tools:
  - get_match_state() -> match_state
  - get_fan_profile(fan_id) -> profile
  - push_jumbotron(fan_id, duration_s) -> bool
  - send_delight_push(fan_id, content_template) -> bool
  - detect_milestones() -> array<milestone>   # century, hat-trick, etc.
decision_model: |
  Every match milestone → 5 randomly-selected fans in the stadium get a
  personalized push. Every birthday (known from profile) gets a jumbotron
  shout-out if seats permit.
```

#### 6.3.7 Revenue Agent

```yaml
name: revenue
type: LlmAgent (ADK)
model: gemini-2.5-flash
role: Dynamic F&B pricing, compensating offers during disruptions,
      targeted merchandise pushes.
tools:
  - get_vendor_state(vendor_id) -> {queue, inventory, revenue_today}
  - update_price(item_id, new_price) -> bool
  - push_targeted_offer(zone_ids, offer) -> int fans_reached
  - get_halftime_forecast() -> {queue_spikes, revenue_risk}
decision_model: |
  Triggers:
    - Queue Agent says wait >180s → reduce price at full stall, raise at empty
    - Flow Agent closes a concourse → push coupon to displaced fans
    - Match milestone → merchandise nudge to relevant fans
```

#### 6.3.8 Concierge Agent

```yaml
name: concierge
type: LlmAgent (ADK)
model: gemini-2.5-flash-live
role: Per-fan voice + chat assistant. Instantiated per session.
      Scales to thousands of parallel instances.
tools:
  - get_fan_context(fan_id) -> context
  - find_nearest(category, fan_id) -> nearest
  - get_match_state() -> match_state
  - compute_walking_route(from_seat, to_zone) -> route
  - book_timeslot(fan_id, service_id, time) -> bool
  - escalate_to_care(fan_id, reason) -> incident_id
decision_model: |
  Defaults to voice responses under 15 words. Always grounds recommendation
  in match-state when relevant. Escalates medical mentions immediately.
```

### 6.4 Agent communication patterns (per ADK blog)

| Pattern | Used in PULSE for |
|---|---|
| Shared Session State | Agent trace panel; every agent writes decisions + rationale to the shared state, ops console subscribes |
| LLM-Driven Delegation | Orchestrator dynamically routes a fan query to Concierge (or a medical mention to Care) based on reasoning |
| Explicit Invocation (AgentTool) | Care Agent calls Flow Agent as a tool when it needs concourse access; negotiation is explicit |

### 6.5 Tool design conventions

- All tools return JSON with `{ok, data, error?}` envelope.
- All write-tools require a `reason: string` field that the LLM must populate; reason is logged to the trace.
- All tools have a max-cost budget enforced at the ADK layer (reuses Golden's per-agent cost tracker from Bruhworking).
- All tools have typed inputs via Pydantic; ADK validates before dispatch.

### 6.6 Counterfactual simulator design

- Runs a parallel, lightweight deterministic ABS (agent-based simulation) based on the Wagner & Agrawal 2014 model.
- Same initial state T₀, but all PULSE agent actions suppressed.
- Advances in 5s ticks alongside reality; output streams to a separate Firestore collection `/counterfactual/{session_id}/states`.
- Ops twin UI renders the counterfactual as a 30%-opacity ghost overlay.
- This is the *single most memorable* feature for judges. Minimum-viable implementation: crowd density only, no queues or medical.

### 6.7 Digital twin UI design

- Three.js scene of Chinnaswamy Stadium (hand-modeled low-poly, ~200 vertices).
- Firestore real-time listener on `/venues/chinnaswamy/zones` drives per-zone color interpolation (green → amber → red on density 0 → 3.5 → 6 p/m²).
- Right sidebar: live agent trace panel reading `/agent_traces` with streaming animation.
- Top bar: match state ticker.
- Bottom bar: scripted demo auto-play controls.
- Modals: click any zone to see queue states, current intervention, negotiation history.

### 6.8 Fan PWA design

- Single page: chat area + voice button + AR camera toggle.
- Voice uses Gemini Live WebSocket; streams audio in, renders captions, plays audio out.
- AR uses WebXR (Chrome/Android, Safari 17+) to overlay route arrows on the camera feed.
- Pushes arrive via FCM and render as native-style notifications.
- No install, shareable URL, works on any device.

---

## 7. Project structure

Monorepo layout using npm workspaces and Python `uv` for the agent services.

```
pulse/
├── README.md
├── Idea.md                            # this document
├── REFERENCES.md
├── LICENSE
├── .mcp.json                          # MCP config for Antigravity (Kiro IDE)
├── .gitignore
├── .env.example
├── package.json                       # root; defines workspaces
├── pnpm-workspace.yaml
├── turbo.json                         # monorepo build config
│
├── .claude/
│   ├── settings.local.json            # local IDE settings (gitignored)
│   └── commands/                      # custom slash commands
│       ├── deploy-cloud-run.md
│       ├── seed-firestore.md
│       └── trigger-demo.md
│
├── .antigravity/                      # Antigravity (Kiro) workspace
│   ├── settings.json                  # IDE + MCP server bindings
│   └── specs/                         # spec-driven-dev artifacts
│       ├── flow-agent.spec.md
│       └── counterfactual.spec.md
│
├── infra/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── cloud_run.tf               # 6 services
│   │   ├── firestore.tf
│   │   ├── pubsub.tf                  # 6 topics + subscriptions
│   │   ├── bigquery.tf
│   │   ├── storage.tf                 # CCTV clips bucket
│   │   ├── iam.tf
│   │   └── secrets.tf
│   ├── cloudbuild.yaml                # CI/CD on commit
│   └── openapi/                       # API specs for each service
│
├── apps/
│   ├── orchestrator/                  # ADK multi-agent service
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── uv.lock
│   │   ├── README.md
│   │   └── src/
│   │       ├── main.py                # ADK agent wiring + Cloud Run entry
│   │       ├── agents/
│   │       │   ├── __init__.py
│   │       │   ├── orchestrator.py
│   │       │   ├── flow_agent.py
│   │       │   ├── queue_agent.py
│   │       │   ├── care_agent.py
│   │       │   ├── safety_agent.py
│   │       │   ├── experience_agent.py
│   │       │   ├── revenue_agent.py
│   │       │   └── concierge_agent.py
│   │       ├── tools/
│   │       │   ├── __init__.py
│   │       │   ├── flow_tools.py
│   │       │   ├── queue_tools.py
│   │       │   ├── care_tools.py
│   │       │   ├── safety_tools.py
│   │       │   ├── experience_tools.py
│   │       │   ├── revenue_tools.py
│   │       │   ├── concierge_tools.py
│   │       │   └── shared/            # Firestore, Pub/Sub helpers
│   │       ├── state/
│   │       │   ├── firestore_client.py
│   │       │   └── venue_snapshot.py
│   │       ├── prompts/               # system prompts as .md
│   │       │   ├── orchestrator.md
│   │       │   └── ... one per agent
│   │       ├── tracing/
│   │       │   └── cost_tracker.py    # ported from Bruhworking
│   │       └── tests/
│   │
│   ├── perception/                    # Gemini Vision pipeline
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── vision_client.py
│   │       ├── stream_processor.py
│   │       └── tests/
│   │
│   ├── simulator/                     # Mock data generator
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── scenarios/             # scripted demo timelines
│   │       │   ├── ipl_final.yaml
│   │       │   ├── medical_event.yaml
│   │       │   └── halftime_rush.yaml
│   │       ├── emitters/
│   │       │   ├── turnstile.py
│   │       │   ├── pos.py
│   │       │   ├── restroom.py
│   │       │   └── cctv.py
│   │       └── tests/
│   │
│   ├── counterfactual/                # lightweight ABS simulator
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── abs_engine.py          # agent-based simulation
│   │       └── tests/
│   │
│   ├── frontend/                      # Ops console + digital twin
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx           # landing + demo launcher
│   │       │   ├── ops/
│   │       │   │   └── page.tsx       # ops twin + trace panel
│   │       │   └── api/
│   │       ├── components/
│   │       │   ├── Twin3D.tsx         # Three.js stadium
│   │       │   ├── Heatmap.tsx
│   │       │   ├── AgentTracePanel.tsx
│   │       │   ├── MatchTicker.tsx
│   │       │   ├── InterventionCard.tsx
│   │       │   └── CounterfactualOverlay.tsx
│   │       └── lib/
│   │           ├── firestore.ts
│   │           └── vertex.ts
│   │
│   ├── fan-pwa/                       # Fan-facing PWA
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       │   ├── VoiceChat.tsx      # Gemini Live binding
│   │       │   ├── ARNav.tsx          # WebXR overlay
│   │       │   ├── ChatBubbles.tsx
│   │       │   └── QueueCard.tsx
│   │       └── lib/
│   │           └── gemini-live.ts
│   │
│   └── signage/                       # Fullscreen dynamic signage
│       ├── Dockerfile
│       ├── next.config.js
│       └── src/
│           └── app/
│               └── [screen_id]/page.tsx
│
├── packages/
│   ├── shared-types/                  # TS + Python shared types
│   │   ├── package.json
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── firestore_schemas.ts
│   │       ├── firestore_schemas.py
│   │       ├── pubsub_messages.ts
│   │       └── pubsub_messages.py
│   ├── simulated-stadium-map/         # SVG + 3D model + zone polygons
│   │   ├── chinnaswamy.svg
│   │   ├── chinnaswamy.glb
│   │   └── zones.geojson
│   └── prompts-lib/                   # shared system prompt snippets
│
├── scripts/
│   ├── deploy.sh                      # full deploy all services
│   ├── deploy-one.sh                  # deploy single service
│   ├── seed-firestore.ts              # initial venue + zones
│   ├── reset-demo.sh                  # wipe and reseed for demo
│   ├── trigger-scenario.ts            # kick off a simulator scenario
│   └── export-metrics.ts              # produce post-match AAR
│
└── docs/
    ├── system-design.md               # deep-dive of each service
    ├── agent-specs.md                 # full agent contracts
    ├── demo-script.md                 # 90-second judge walkthrough
    ├── cost-analysis.md               # Gemini token budget
    ├── privacy.md                     # PII handling + hashing
    └── evaluation.md                  # how to reproduce metrics
```

### 7.1 Monorepo rationale

- **Single repo** makes the `.mcp.json` shareable across services and keeps the submission URL to one GitHub link.
- **Turborepo / pnpm workspaces** handle build caching and parallel deploys.
- **Python services use `uv`** for fast installs (critical for Docker layer caching).
- **Shared types** prevents Firestore schema drift between backend and frontend.

---

## 8. MCP configuration

### 8.1 What is MCP here and why it matters

Model Context Protocol (MCP) lets Antigravity (Kiro IDE) and similar tools call real services (Cloud Run, Firestore, GitHub) directly. For PULSE development, MCP turns "I need to deploy this service" from a 3-minute terminal dance into a one-line conversation. Golden already has a Cloud Run MCP server running per his Bruhworking setup — PULSE extends it.

### 8.2 `.mcp.json` — Antigravity project-level config

This file lives at the repo root. Antigravity auto-loads it when `mcpSources` is set correctly (see 8.3).

```json
{
  "mcpServers": {
    "google-cloud-run": {
      "command": "npx",
      "args": ["-y", "@googlecloudplatform/cloud-run-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "bruhworking",
        "GOOGLE_CLOUD_LOCATION": "asia-south1",
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/.secrets/gcp-sa-key.json"
      }
    },
    "firestore": {
      "command": "npx",
      "args": ["-y", "firebase-mcp-server"],
      "env": {
        "FIREBASE_PROJECT_ID": "bruhworking",
        "FIREBASE_SERVICE_ACCOUNT": "${workspaceFolder}/.secrets/gcp-sa-key.json"
      }
    },
    "bigquery": {
      "command": "npx",
      "args": ["-y", "@googlecloudplatform/bigquery-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "bruhworking",
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/.secrets/gcp-sa-key.json",
        "BIGQUERY_DATASET": "pulse_analytics"
      }
    },
    "pubsub": {
      "command": "npx",
      "args": ["-y", "@googlecloudplatform/pubsub-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "bruhworking",
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/.secrets/gcp-sa-key.json"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "description": "For smoke-testing the deployed Cloud Run URLs"
    },
    "cloud-logging": {
      "command": "npx",
      "args": ["-y", "@googlecloudplatform/cloud-logging-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "bruhworking",
        "GOOGLE_APPLICATION_CREDENTIALS": "${workspaceFolder}/.secrets/gcp-sa-key.json"
      }
    }
  }
}
```

### 8.3 `.antigravity/settings.json` — Antigravity (Kiro) IDE config

Antigravity reads MCP servers from its own settings file but can inherit from `.mcp.json` when configured. Below is the explicit config with the Kiro spec-driven-dev bindings Golden uses.

```json
{
  "version": "1.0",
  "workspace": {
    "name": "pulse",
    "defaultModel": "gemini-2.5-pro",
    "pythonInterpreter": ".venv/bin/python",
    "nodeVersion": "20"
  },
  "mcp": {
    "inheritFromRoot": true,
    "rootConfigPath": "${workspaceFolder}/.mcp.json",
    "additionalServers": {
      "kiro-specs": {
        "command": "npx",
        "args": ["-y", "@kiro/specs-mcp-server"],
        "env": {
          "SPECS_DIR": "${workspaceFolder}/.antigravity/specs"
        }
      }
    }
  },
  "agents": {
    "enableAutoApproval": false,
    "costBudgetUsdPerSession": 5.00,
    "traceAllToolCalls": true
  },
  "specs": {
    "directory": ".antigravity/specs",
    "templates": ["feature", "bug", "refactor"],
    "autoGenerateTasks": true
  },
  "deployHooks": {
    "preDeploy": ["./scripts/lint.sh", "./scripts/test.sh"],
    "postDeploy": ["./scripts/smoke-test.sh"]
  }
}
```

### 8.4 `.claude/` — IDE local settings (gitignored)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(pnpm *)",
      "Bash(uv *)",
      "Bash(gcloud *)",
      "Bash(terraform *)",
      "Bash(docker *)",
      "Read(./**)",
      "Edit(./apps/**)",
      "Edit(./packages/**)",
      "Edit(./docs/**)",
      "Edit(./scripts/**)"
    ],
    "deny": [
      "Edit(./.secrets/**)",
      "Bash(rm -rf *)",
      "Bash(gcloud projects delete *)"
    ]
  },
  "env": {
    "GOOGLE_CLOUD_PROJECT": "bruhworking",
    "GOOGLE_CLOUD_LOCATION": "asia-south1"
  },
  "model": "gemini-2.5-pro",
  "slashCommands": {
    "directory": ".claude/commands"
  }
}
```

### 8.5 Google Cloud service account key JSON (template)

`.secrets/gcp-sa-key.json` (gitignored, generated by `gcloud iam service-accounts keys create`):

```json
{
  "type": "service_account",
  "project_id": "bruhworking",
  "private_key_id": "<redacted>",
  "private_key": "-----BEGIN PRIVATE KEY-----\n<redacted>\n-----END PRIVATE KEY-----\n",
  "client_email": "pulse-dev-sa@bruhworking.iam.gserviceaccount.com",
  "client_id": "<redacted>",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/pulse-dev-sa%40bruhworking.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

The service account needs these IAM roles (applied in `infra/terraform/iam.tf`):

```
roles/run.admin
roles/run.invoker
roles/datastore.user              # Firestore read/write
roles/pubsub.publisher
roles/pubsub.subscriber
roles/bigquery.dataEditor
roles/bigquery.jobUser
roles/storage.objectAdmin         # CCTV clips bucket
roles/aiplatform.user             # Vertex AI Gemini calls
roles/secretmanager.secretAccessor
roles/logging.logWriter
```

### 8.6 Cloud Run service environment variables

Stored in Secret Manager, injected at service startup. Each service gets a `PULSE_*` namespace to avoid collisions.

```json
{
  "pulse-orchestrator": {
    "GOOGLE_CLOUD_PROJECT": "bruhworking",
    "GOOGLE_CLOUD_LOCATION": "asia-south1",
    "VERTEX_MODEL_ORCHESTRATOR": "gemini-2.5-pro",
    "VERTEX_MODEL_SPECIALIST": "gemini-2.5-flash",
    "FIRESTORE_DATABASE": "(default)",
    "PUBSUB_TOPIC_AGENT_EVENTS": "agent-events",
    "ADK_TRACE_ENABLED": "true",
    "COST_BUDGET_PER_SESSION_USD": "0.50"
  },
  "pulse-perception": {
    "GOOGLE_CLOUD_PROJECT": "bruhworking",
    "VERTEX_MODEL_VISION": "gemini-2.5-pro",
    "PUBSUB_TOPIC_VISION_FRAMES": "vision-frames",
    "VISION_MEDIA_RESOLUTION": "MEDIA_RESOLUTION_LOW"
  },
  "pulse-simulator": {
    "GOOGLE_CLOUD_PROJECT": "bruhworking",
    "SCENARIO_FILE": "ipl_final.yaml",
    "TICK_INTERVAL_MS": "1000",
    "PUBSUB_TOPIC_SENSOR_EVENTS": "sensor-events",
    "CCTV_BUCKET": "pulse-cctv-clips"
  },
  "pulse-frontend": {
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "bruhworking",
    "NEXT_PUBLIC_FIRESTORE_DB": "(default)",
    "NEXT_PUBLIC_VENUE_ID": "chinnaswamy"
  },
  "pulse-fan-pwa": {
    "NEXT_PUBLIC_GEMINI_LIVE_ENDPOINT": "wss://...",
    "NEXT_PUBLIC_FCM_VAPID_KEY": "<public>"
  },
  "pulse-signage": {
    "NEXT_PUBLIC_VENUE_ID": "chinnaswamy"
  },
  "pulse-counterfactual": {
    "GOOGLE_CLOUD_PROJECT": "bruhworking",
    "SIM_TICK_INTERVAL_MS": "5000"
  }
}
```

### 8.7 MCP-first dev loop

With MCP set up, the day-to-day looks like:

```
You: "Deploy pulse-orchestrator to Cloud Run asia-south1."
Antigravity (via cloud-run MCP): *builds, pushes, deploys, returns URL*

You: "Seed Firestore with Chinnaswamy zones from packages/simulated-stadium-map/zones.geojson."
Antigravity (via firestore MCP): *reads file, writes 50 docs, reports success*

You: "Tail logs for pulse-orchestrator, last 5 minutes."
Antigravity (via cloud-logging MCP): *streams structured logs inline*

You: "Open a PR from my current branch with these changes."
Antigravity (via github MCP): *creates PR with auto-generated description*
```

This is the development model that makes 48-hour hackathons shippable.

---

## 9. Development plan

### 9.1 48-hour execution plan

Realistic, buffered, and prioritized such that cutting the bottom items still yields a submittable demo.

#### Day 1 (12 focused hours)

| Hours | Task | Acceptance |
|---|---|---|
| 0–2 | Terraform up: Firestore, Pub/Sub topics, GCS bucket, BigQuery dataset, service accounts | `terraform apply` clean |
| 2–4 | Simulator scaffold + one scenario (`ipl_final.yaml`) emitting turnstile + PoS + CCTV events | Events visible in Pub/Sub |
| 4–7 | ADK agents scaffold: Orchestrator + 3 specialists (Flow, Queue, Concierge) with stub tools | `adk run` locally completes a cycle |
| 7–9 | Frontend scaffold: Next.js + Three.js stadium + Firestore listener | Zones change color on density writes |
| 9–11 | Wire end-to-end: simulator → Firestore → agents → signage → frontend | Full loop visible in twin |
| 11–12 | Deploy first pass of all services to Cloud Run | All 6 services return 200 on health check |

#### Day 2 (12 focused hours)

| Hours | Task | Acceptance |
|---|---|---|
| 0–2 | Add 4 remaining agents (Care, Safety, Experience, Revenue) | All in ADK trace |
| 2–4 | Fan PWA: chat + Gemini Live voice binding | One voice round-trip works |
| 4–6 | Agent negotiation: Care ↔ Flow ↔ Revenue scenario scripted | Negotiation renders in trace panel |
| 6–8 | Counterfactual simulator + ghost overlay | Split-screen twin works |
| 8–10 | Scripted demo auto-play + landing page | Click-to-demo in 45s |
| 10–11 | README, REFERENCES, Loom recording, LinkedIn post | All artifacts ready |
| 11–12 | Buffer for the 2am Cloud Run env-var disaster | Demo verified on judge's network |

### 9.2 Cut-order if time runs out

1. Revenue Agent (defer to prose in README)
2. AR wayfinding (voice concierge is enough)
3. Counterfactual overlay (keep the basic twin)
4. Experience Agent (Concierge can handle nudges)
5. Post-match AAR report (mention as future work)

**Never cut:** Orchestrator + Flow + Queue + Concierge + digital twin + demo auto-play. These are the core submission.

### 9.3 Risk register

| Risk | Probability | Mitigation |
|---|---|---|
| Gemini Live WebSocket auth issues in Cloud Run | Medium | Pre-test day 1; fall back to text-only if blocked |
| Firestore real-time listeners flaky on first deploy | Low | Use REST polling fallback every 3s |
| Judge has bad Wi-Fi during demo | Medium | Record backup Loom + ship USB with local demo |
| Quota limits on Vertex AI | Medium | Request quota bump day 1; cap concurrency in code |
| One of 6 Cloud Run services fails at 2am | High | Each service degrades gracefully; ops console stays alive |

---

## 10. Demo script

### 10.1 Landing page first impression (0:00 – 0:10)

Judge lands on `https://pulse-frontend-<hash>.asia-south1.run.app`. Giant headline:

> **PULSE** — the self-aware stadium
> One multi-agent AI. 40,000 fans. Real-time.
> **[ Watch the 2026 IPL final → ]**

### 10.2 Auto-play scenario (0:10 – 1:30)

Click the button. A 45-second narrated animation begins:

- **0:15** Stadium fills on the twin. Gate 3 heatmap pulses red.
- **0:25** Right panel shows: *"Flow Agent: predicted crush risk at Gate 3 in 12 minutes. Intervention: redirect 400 fans to Gate 5."* Signage zone updates.
- **0:35** Red diffuses. Counterfactual ghost shows what would have happened without intervention — deeper red, dangerous.
- **0:45** Chat bubble appears from "Raj, seat B-204": *"beer?"*
- **0:50** Concierge response streams: *"Gate 4 stand, 90-second queue. Kohli's on strike, you'll make it back for the over."* Route overlay on the twin.
- **1:00** Vision icon flashes red at zone C-12: person fallen.
- **1:05** Agent negotiation panel lights up:
  - *Care Agent: requesting B-south closure for ambulance.*
  - *Flow Agent: approved, rerouting 400 fans.*
  - *Revenue Agent: vendor-12 loses ~40 sales, pushing ₹50 off coupon to 200 fans.*
  - *Orchestrator: committed.*
- **1:15** Medical unit dispatched, staff device buzzes on-screen.
- **1:25** Metrics card: **47% fewer wait-time minutes. 1 solo dev. 48 hours.**

### 10.3 Free interaction (1:30 onward)

- "Try it yourself" button enables direct chat with Concierge.
- Judge can click any zone on the twin for details.
- Judge can fast-forward the counterfactual clock to see divergence.

### 10.4 What judges remember

- The ghost overlay (nobody else will have this).
- The agent negotiation transcript (nobody else will have this).
- The "Kohli's on strike" line (nobody else ties venue ops to match state).

---

## 11. Success metrics

### 11.1 Simulated outcomes on the demo scenario

| Metric | Counterfactual | With PULSE | Delta |
|---|---|---|---|
| Average fan wait time (F&B) | 240s | 128s | −47% |
| Peak concourse density | 5.8 p/m² | 3.6 p/m² | −38% |
| Medical response time | 5m 30s | 3m 15s | −41% |
| F&B revenue (halftime) | ₹X lakh | ₹1.18X lakh | +18% |
| Near-miss incidents flagged | 0 (humans blind) | 7 | +∞ |

All numbers generated by the counterfactual simulator, not made up. The comparison is defensible: same initial state, same timeline, only the presence/absence of PULSE varies.

### 11.2 Operational metrics

| Metric | Target |
|---|---|
| Agent decision cycle | < 5s |
| Concierge voice round-trip | < 2.5s |
| Total Gemini tokens per demo run | < 500k |
| Total cost per demo run | < $1 |
| Cloud Run p99 cold start | < 3s |

### 11.3 Hackathon rubric self-assessment

| Rubric item | Submission coverage |
|---|---|
| Uses ADK | ✓ 8 agents, orchestrator + specialists, all three comm patterns |
| Uses Gemini | ✓ 2.5 Pro (planning), 2.5 Flash (workers), 2.5 Vision, 2.5 Flash-Live (voice) |
| Deployed on Cloud Run | ✓ 6 services in asia-south1 |
| Addresses crowd movement | ✓ Flow Agent, density prediction, rerouting |
| Addresses waiting times | ✓ Queue Agent, forecasting, staff reallocation |
| Addresses real-time coordination | ✓ Orchestrator + agent negotiation (the core differentiator) |
| Seamless | ✓ Zero-install PWA, voice-native, proactive pushes |
| Enjoyable | ✓ Experience Agent, match-state-aware nudges, jumbotron delight |
| Multi-agent necessary | ✓ Each specialist has non-overlapping tool set |
| Novel | ✓ Counterfactual twin, agent negotiation visibility, match-state integration |

---

## 12. Appendix

### 12.1 Naming rationale

**PULSE** works on three levels:
1. Medical — a stadium has a *pulse* you can read if you listen.
2. Electrical — the nervous system metaphor.
3. Rhythmic — a match has beats, overs, quarters; the system matches them.

Backronym: **P**hysical **U**nified **L**ive **S**tadium **E**ngine. Mentioned once in the README, never again — the name stands on its own.

### 12.2 Future work (for the LinkedIn post + post-hackathon)

- Federated learning across multiple venues without sharing fan PII.
- Stadium "personality" model — Eden Gardens crowds move differently than Wankhede crowds.
- Accessibility-first route optimization (ramp-aware, sensory-aware).
- Workshop paper for AAMAS or CHI Sports on agent-negotiation UX.
- Partnership conversations with KSCA, BCCI-SMAT, IPL franchises.

### 12.3 Positioning one-liner for external comms

*"Google's ICC T20 World Cup 2026 partnership nailed the fan celebration layer — AI avatars, Pixel-perfect shots. PULSE is the fan experience layer underneath it: the multi-agent AI that makes sure 50,000 people move, queue, and find each other without chaos. Celebration is the icing. Coordination is the cake."*

### 12.4 Build attribution

Built by Oikantik Basu ([@Golden007-prog](https://github.com/Golden007-prog)). Solo, end-to-end, in Google Antigravity (Kiro IDE) with the Cloud Run MCP server. Models: Gemini 2.5 family. Framework: Google ADK 2.5.

### 12.5 License

MIT for source. CC-BY-4.0 for this document and REFERENCES.md. All trademarks (IPL, BCCI, Gemini, ADK, Cloud Run, etc.) property of their respective owners — PULSE is an independent academic/research project and not affiliated with any governing body.

---

*Document complete. Ready to ship.*

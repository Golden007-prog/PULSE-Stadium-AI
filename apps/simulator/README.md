# pulse-simulator

Synthesises match-day events against a scripted YAML timeline and publishes them to the `sensor-events` Pub/Sub topic.

## Run locally

```bash
uv venv && source .venv/Scripts/activate    # Windows Git Bash
uv pip install -r pyproject.toml
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
export GOOGLE_CLOUD_PROJECT=pulse-stadium-ai
export PUBSUB_TOPIC_SENSOR_EVENTS=sensor-events
uvicorn src.main:app --reload
```

## Endpoints

- `GET /healthz` — liveness + scenario state (ticks, events published, last scripted event)
- `POST /scenario/reset` — restart the scripted scenario from t=0

## Event types on `sensor-events`

| `type` | Source | Payload keys |
|---|---|---|
| `scenario_start` / `scenario_end` | lifecycle | `name`, `duration_s` / `events_published` |
| `turnstile_scan` | base rate | `direction`, `delta`, `ticket_tier` |
| `pos_transaction` | base rate | `item_id`, `qty`, `amount_inr`, `payment_method` |
| `restroom_count` | base rate | `delta`, `gender_stall` |
| `density_delta` | scripted | `density_p_per_m2`, `reason`, `scripted` |
| `fan_query` | scripted | `fan_id`, `seat`, `query`, `modality` |
| `vision_anomaly` | scripted | `anomaly_type`, `severity`, `confidence` |
| `negotiation_trigger` | scripted | `reason` |
| `resolution_metric` | scripted | `metrics` map |

Every event carries `event_id`, `venue_id`, `session_id`, `timestamp`, and a Pub/Sub attribute `type`.

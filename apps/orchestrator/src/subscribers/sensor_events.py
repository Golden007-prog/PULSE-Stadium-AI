"""Pub/Sub subscriber that lands `sensor-events` into the in-memory buffer
and, for scripted density_delta events, directly into Firestore.
"""
from __future__ import annotations

import json
import logging
import os

from google.cloud import pubsub_v1

from ..state.event_buffer import BUFFER
from ..state.firestore_client import set_zone_density

log = logging.getLogger("subscriber")

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "pulse-stadium-ai")
TOPIC = os.environ.get("PUBSUB_TOPIC_SENSOR_EVENTS", "sensor-events")
SUB_NAME = os.environ.get(
    "PUBSUB_SUBSCRIPTION_SENSOR_EVENTS", "pulse-orchestrator-sensor-events"
)


def subscription_path() -> str:
    """Assume the subscription is pre-created (see phase-2 deploy notes).

    Runtime SA only has `roles/pubsub.subscriber` which is sufficient to
    `consume` messages but NOT to `get` or `create` a subscription. We
    therefore skip verification at startup.
    """
    return f"projects/{PROJECT}/subscriptions/{SUB_NAME}"


def handle(message: pubsub_v1.subscriber.message.Message) -> None:
    try:
        event = json.loads(message.data.decode("utf-8"))
        etype = event.get("type", "")
        zone_id = event.get("zone_id")
        payload = event.get("payload", {}) or {}

        if etype == "turnstile_scan" and zone_id:
            BUFFER.zone_counts[zone_id] = BUFFER.zone_counts.get(zone_id, 0) + 1
            BUFFER.attendance += 1

        elif etype == "density_delta" and zone_id:
            density = float(payload.get("density_p_per_m2", 0.0))
            set_zone_density(zone_id, density, note=payload.get("reason", ""))
            BUFFER.alerts.append(
                {
                    "zone_id": zone_id,
                    "density": density,
                    "reason": payload.get("reason", ""),
                    "scripted": payload.get("scripted", False),
                }
            )

        elif etype == "fan_query":
            BUFFER.fan_queries.append(payload)

        elif etype == "vision_anomaly":
            BUFFER.anomalies.append({"zone_id": zone_id, **payload})

        elif etype in ("scenario_start", "scenario_end",
                       "negotiation_trigger", "resolution_metric"):
            BUFFER.last_scripted = {"type": etype, **payload}

        message.ack()
    except Exception:  # defensive — don't let one bad message kill the stream
        log.exception("failed to handle message; nacking")
        message.nack()


def start_subscriber():
    sub_path = subscription_path()
    subscriber = pubsub_v1.SubscriberClient()
    future = subscriber.subscribe(sub_path, callback=handle)
    log.info("subscribed to %s", sub_path)
    return subscriber, future

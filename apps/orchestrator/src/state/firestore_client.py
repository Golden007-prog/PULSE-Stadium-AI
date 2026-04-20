"""Typed Firestore helpers for PULSE.

Pydantic models match Idea.md §6.1. The thin wrapper around
`google.cloud.firestore.Client` is kept deliberately small — ADK agents call
the module-level functions via FunctionTools (see src/tools/).
"""
from __future__ import annotations

import os
from typing import Any, Literal

from google.cloud import firestore
from pydantic import BaseModel, Field

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "pulse-stadium-ai")
VENUE_ID = os.environ.get("PULSE_VENUE_ID", "chinnaswamy")


class Zone(BaseModel):
    """One stadium zone as stored at /venues/{id}/zones/{zone_id}."""
    id: str
    name: str
    type: str
    capacity: int = 0
    current_density: float = 0.0
    predicted_density_5m: float = 0.0
    predicted_density_15m: float = 0.0
    tags: list[str] = Field(default_factory=list)


class Intervention(BaseModel):
    """One agent-initiated write at /venues/{id}/interventions/{id}."""
    initiating_agent: str
    action: str
    target: str
    reason: str
    status: Literal["proposed", "committed", "expired"] = "committed"
    negotiation_log: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentTrace(BaseModel):
    """One ADK invocation record at /agent_traces/{trace_id} with tokens + USD cost."""
    trace_id: str
    root_agent: str
    invocation_chain: list[str]
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
    tokens_used: int = 0
    cost_usd: float = 0.0
    duration_ms: int = 0
    tag: str = ""


_client: firestore.Client | None = None


def client() -> firestore.Client:
    """Lazily-initialised Firestore client, reused process-wide."""
    global _client
    if _client is None:
        _client = firestore.Client(project=PROJECT)
    return _client


def venue_ref() -> firestore.DocumentReference:
    """DocumentReference for /venues/{VENUE_ID}."""
    return client().collection("venues").document(VENUE_ID)


def zones_ref() -> firestore.CollectionReference:
    """CollectionReference for /venues/{VENUE_ID}/zones."""
    return venue_ref().collection("zones")


def interventions_ref() -> firestore.CollectionReference:
    """CollectionReference for /venues/{VENUE_ID}/interventions."""
    return venue_ref().collection("interventions")


def traces_ref() -> firestore.CollectionReference:
    """CollectionReference for /agent_traces."""
    return client().collection("agent_traces")


def list_zones() -> list[Zone]:
    """Return every zone under the active venue as a list of typed Zone models."""
    out: list[Zone] = []
    for doc in zones_ref().stream():
        data = doc.to_dict() or {}
        out.append(
            Zone(
                id=doc.id,
                name=data.get("name", ""),
                type=data.get("type", ""),
                capacity=int(data.get("capacity", 0)),
                current_density=float(data.get("current_density", 0.0)),
                predicted_density_5m=float(data.get("predicted_density_5m", 0.0)),
                predicted_density_15m=float(data.get("predicted_density_15m", 0.0)),
                tags=list(data.get("tags", []) or []),
            )
        )
    return out


def get_zone(zone_id: str) -> Zone | None:
    """Fetch a single zone by id; returns None if it doesnt exist."""
    doc = zones_ref().document(zone_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    return Zone(
        id=doc.id,
        name=data.get("name", ""),
        type=data.get("type", ""),
        capacity=int(data.get("capacity", 0)),
        current_density=float(data.get("current_density", 0.0)),
        predicted_density_5m=float(data.get("predicted_density_5m", 0.0)),
        predicted_density_15m=float(data.get("predicted_density_15m", 0.0)),
        tags=list(data.get("tags", []) or []),
    )


def set_zone_density(zone_id: str, density: float, note: str = "") -> None:
    """Merge the given density + note onto a zone doc with a server timestamp."""
    zones_ref().document(zone_id).set(
        {
            "current_density": density,
            "last_updated": firestore.SERVER_TIMESTAMP,
            "last_update_note": note,
        },
        merge=True,
    )


def add_intervention(interv: Intervention) -> str:
    """Append an Intervention as a new /venues/.../interventions/{id} doc; returns the generated id."""
    ref = interventions_ref().document()
    data = interv.model_dump()
    data["id"] = ref.id
    data["created_at"] = firestore.SERVER_TIMESTAMP
    ref.set(data)
    return ref.id


def write_trace(trace: AgentTrace) -> None:
    """Persist an AgentTrace to /agent_traces/{trace_id} with a server timestamp."""
    traces_ref().document(trace.trace_id).set(
        {
            **trace.model_dump(),
            "timestamp": firestore.SERVER_TIMESTAMP,
        }
    )

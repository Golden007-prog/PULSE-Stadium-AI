"""Tools for the Care Agent — medical, accessibility, lost-child.

Write-tools emit Interventions so the ops console's trace panel surfaces
them immediately via the same onSnapshot listener reality uses.
"""
from __future__ import annotations

import uuid
from typing import Any

from ..state.firestore_client import Intervention, add_intervention


def dispatch_medical(zone_id: str, severity: str, reason: str) -> dict[str, Any]:
    """Create a medical-dispatch intervention and return the incident id."""
    incident_id = f"med-{uuid.uuid4().hex[:8]}"
    iid = add_intervention(
        Intervention(
            initiating_agent="care",
            action="dispatch_medical",
            target=zone_id,
            reason=reason,
            metadata={"severity": severity, "incident_id": incident_id},
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "incident_id": incident_id,
            "zone_id": zone_id,
            "severity": severity,
            "eta_s": 60 if severity == "critical" else 180,
        },
    }


def route_ambulance(from_zone: str, to_exit_zone: str, reason: str) -> dict[str, Any]:
    """Record the ambulance route; does NOT close the concourse itself —
    use `request_flow_clearance` for that so the Flow agent can sign off.
    """
    iid = add_intervention(
        Intervention(
            initiating_agent="care",
            action="route_ambulance",
            target=f"{from_zone}->{to_exit_zone}",
            reason=reason,
            metadata={"from_zone": from_zone, "to_exit_zone": to_exit_zone},
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "from": from_zone,
            "to_exit": to_exit_zone,
            "path": [from_zone, "C-12", to_exit_zone],
        },
    }


def request_flow_clearance(
    concourse_id: str, duration_min: int, reason: str
) -> dict[str, Any]:
    """Ask the Flow agent (via Orchestrator) to close a concourse so the
    ambulance can get through. Writes an intervention tagged so the trace
    panel shows the care → flow hand-off explicitly.
    """
    iid = add_intervention(
        Intervention(
            initiating_agent="care",
            action="request_flow_clearance",
            target=concourse_id,
            reason=reason,
            metadata={
                "duration_min": duration_min,
                "next_agent": "flow",
                "request_type": "concourse_closure",
            },
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "concourse_id": concourse_id,
            "duration_min": duration_min,
            "requested_from": "flow",
            "note": "Flow must also verify crowd displacement before closure.",
        },
    }


def register_lost_child(
    name: str, last_seen_zone: str, guardian_contact: str
) -> dict[str, Any]:
    incident_id = f"lost-{uuid.uuid4().hex[:8]}"
    iid = add_intervention(
        Intervention(
            initiating_agent="care",
            action="register_lost_child",
            target=last_seen_zone,
            reason=f"Lost child '{name}' last seen at {last_seen_zone}; guardian contact logged.",
            metadata={
                "incident_id": incident_id,
                "name": name,
                "guardian_contact": guardian_contact,
            },
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "incident_id": incident_id,
            "last_seen_zone": last_seen_zone,
        },
    }

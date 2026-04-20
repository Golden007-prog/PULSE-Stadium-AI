"""Tests for Care Agent tools — dispatch_medical, request_flow_clearance, route_ambulance.

Care writes to /venues/../interventions with severity + incident_id metadata
and — in the negotiation chain — asks Flow via request_flow_clearance().
"""
from __future__ import annotations

from unittest.mock import patch

from src.tools import care_tools


def test_dispatch_medical_writes_intervention_with_incident_id() -> None:
    """Dispatch medical writes intervention with incident id."""
    with patch.object(care_tools, "add_intervention", return_value="iv-med-1") as add_iv:
        result = care_tools.dispatch_medical(
            zone_id="C-12",
            severity="high",
            reason="Person fallen at Concourse South",
        )

    assert result["ok"] is True
    data = result["data"]
    assert data["intervention_id"] == "iv-med-1"
    assert data["zone_id"] == "C-12"
    assert data["severity"] == "high"
    assert data["incident_id"].startswith("med-")
    # ETA for high severity
    assert data["eta_s"] == 180

    # Verify the Intervention payload: initiating_agent = care, target = zone
    (interv,) = add_iv.call_args.args
    assert interv.initiating_agent == "care"
    assert interv.action == "dispatch_medical"
    assert interv.target == "C-12"
    assert interv.metadata["severity"] == "high"


def test_dispatch_medical_critical_severity_shortens_eta() -> None:
    """Dispatch medical critical severity shortens eta."""
    with patch.object(care_tools, "add_intervention", return_value="iv-med-crit"):
        result = care_tools.dispatch_medical(
            zone_id="S-B",
            severity="critical",
            reason="Cardiac event",
        )
    # Critical severity → shorter ETA
    assert result["data"]["eta_s"] == 60


def test_request_flow_clearance_tags_next_agent() -> None:
    """The care → flow hand-off is visible via metadata.next_agent."""
    with patch.object(care_tools, "add_intervention", return_value="iv-req") as add_iv:
        result = care_tools.request_flow_clearance(
            concourse_id="C-12",
            duration_min=4,
            reason="Ambulance path for fallen person at C-12",
        )

    assert result["ok"] is True
    (interv,) = add_iv.call_args.args
    assert interv.action == "request_flow_clearance"
    assert interv.metadata["next_agent"] == "flow"
    assert interv.metadata["duration_min"] == 4

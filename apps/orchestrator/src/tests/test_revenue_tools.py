"""Tests for Revenue Agent tools — push_targeted_offer, log_revenue_mitigation."""
from __future__ import annotations

from unittest.mock import patch

from src.tools import revenue_tools


def test_push_targeted_offer_generates_offer_id_and_records_zones() -> None:
    with patch.object(revenue_tools, "add_intervention", return_value="iv-rev-1") as add_iv:
        result = revenue_tools.push_targeted_offer(
            zone_ids=["S-B", "S-C"],
            offer_text="₹50 off Beer 500ml",
            offer_value_inr=50,
            fan_count_estimate=240,
            reason="Compensating offer for fans displaced by C-12 closure",
        )

    assert result["ok"] is True
    data = result["data"]
    assert data["intervention_id"] == "iv-rev-1"
    assert data["zones"] == ["S-B", "S-C"]
    assert data["fan_count"] == 240
    assert data["offer_id"].startswith("offer-")

    (interv,) = add_iv.call_args.args
    assert interv.initiating_agent == "revenue"
    assert interv.action == "push_targeted_offer"
    assert interv.target == "S-B,S-C"
    assert interv.metadata["offer_value_inr"] == 50
    assert interv.metadata["channels"] == ["fan-pwa", "signage"]


def test_push_targeted_offer_defaults_target_to_all_when_no_zones() -> None:
    with patch.object(revenue_tools, "add_intervention", return_value="iv-all"):
        result = revenue_tools.push_targeted_offer(
            zone_ids=[],
            offer_text="Halftime promo",
            offer_value_inr=25,
            fan_count_estimate=0,
            reason="halftime push",
        )

    assert result["ok"] is True
    # Interventions with no zones target "all"
    assert result["data"]["zones"] == []


def test_log_revenue_mitigation_persists_lost_sales_estimate() -> None:
    with patch.object(revenue_tools, "add_intervention", return_value="iv-log-1") as add_iv:
        result = revenue_tools.log_revenue_mitigation(
            estimated_lost_sales_inr=3200,
            offer_id="offer-abc123",
            reason="Estimated lost sales mitigated by coupon push",
        )

    assert result["ok"] is True
    assert result["data"]["estimated_lost_sales_inr"] == 3200
    assert result["data"]["offer_id"] == "offer-abc123"

    (interv,) = add_iv.call_args.args
    assert interv.action == "log_mitigation"
    assert interv.target == "offer-abc123"

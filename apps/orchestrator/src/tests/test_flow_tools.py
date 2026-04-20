"""Tests for Flow Agent tools — reroute_fans, update_signage, close_concourse.

Flow tools write an Intervention and (for reroute / signage) also close
the simulation loop by calling set_zone_density. We verify both effects.
"""
from __future__ import annotations

from unittest.mock import patch

from src.state.firestore_client import Zone
from src.tools import flow_tools


def test_reroute_fans_writes_intervention_and_reduces_hot_zone(hot_zone: Zone) -> None:
    with (
        patch.object(flow_tools, "add_intervention", return_value="iv-abc") as add_iv,
        patch.object(flow_tools, "get_zone", return_value=hot_zone),
        patch.object(flow_tools, "set_zone_density") as set_density,
    ):
        result = flow_tools.reroute_fans(
            from_zone="G-3",
            to_zone="G-4",
            expected_count=400,
            reason="G-3 at 5.2 p/m²; redirect to G-4",
        )

    assert result["ok"] is True
    assert result["data"]["intervention_id"] == "iv-abc"
    assert result["data"]["from"] == "G-3"
    assert result["data"]["to"] == "G-4"
    assert result["data"]["from_new_density"] == 3.2
    add_iv.assert_called_once()
    # Flow auto-closes the sim loop: density above 3.3 is pushed down to 3.2
    set_density.assert_called_once()
    assert set_density.call_args.args[0] == "G-3"
    assert set_density.call_args.args[1] == 3.2
    assert "flow reroute" in set_density.call_args.kwargs["note"]


def test_reroute_fans_skips_density_update_when_already_calm(calm_zone: Zone) -> None:
    with (
        patch.object(flow_tools, "add_intervention", return_value="iv-calm"),
        patch.object(flow_tools, "get_zone", return_value=calm_zone),
        patch.object(flow_tools, "set_zone_density") as set_density,
    ):
        result = flow_tools.reroute_fans(
            from_zone="G-2", to_zone="G-1", expected_count=50, reason="precautionary"
        )

    assert result["ok"] is True
    # 1.4 p/m² < 3.3 threshold → no auto-density reduction
    set_density.assert_not_called()


def test_get_zone_density_returns_error_envelope_for_unknown_zone() -> None:
    with patch.object(flow_tools, "get_zone", return_value=None):
        result = flow_tools.get_zone_density("NON-EXISTENT")

    assert result["ok"] is False
    assert "not found" in result["error"]

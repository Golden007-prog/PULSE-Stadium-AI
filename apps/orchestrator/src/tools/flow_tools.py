"""Tools available to the Flow Agent.

Each tool returns a JSON-serialisable dict with the `{ok, data, error?}`
envelope. Write-tools require a `reason` string which is logged into the
intervention record for audit + the ops-console trace panel.
"""
from __future__ import annotations

from typing import Any

from ..state.firestore_client import (
    Intervention,
    add_intervention,
    get_zone,
    list_zones,
    set_zone_density,
)


def get_zone_density(zone_id: str) -> dict[str, Any]:
    """Return the current density (people/m²) for a zone."""
    z = get_zone(zone_id)
    if not z:
        return {"ok": False, "error": f"zone {zone_id} not found"}
    return {
        "ok": True,
        "data": {
            "zone_id": zone_id,
            "name": z.name,
            "type": z.type,
            "current_density": z.current_density,
            "capacity": z.capacity,
        },
    }


def predict_zone_density(zone_id: str, minutes_ahead: int) -> dict[str, Any]:
    """Naive linear predictor — used when a proper model isn't wired yet."""
    z = get_zone(zone_id)
    if not z:
        return {"ok": False, "error": f"zone {zone_id} not found"}
    drift = 0.1 * minutes_ahead if z.current_density > 3.0 else 0.02 * minutes_ahead
    return {
        "ok": True,
        "data": {
            "zone_id": zone_id,
            "minutes_ahead": minutes_ahead,
            "predicted_density": round(z.current_density + drift, 2),
        },
    }


def compute_route(
    from_zone: str, to_zone: str, avoid_zones: list[str] | None = None
) -> dict[str, Any]:
    """Return a stubbed walking route."""
    avoid = avoid_zones or []
    hops: list[str] = [from_zone]
    if from_zone not in ("C-01", "C-12") and "C-01" not in avoid:
        hops.append("C-01")
    hops.append(to_zone)
    return {
        "ok": True,
        "data": {
            "from": from_zone,
            "to": to_zone,
            "hops": hops,
            "walk_time_s": 90 + 30 * (len(hops) - 2),
        },
    }


def close_concourse(concourse_id: str, duration_min: int, reason: str) -> dict[str, Any]:
    iid = add_intervention(
        Intervention(
            initiating_agent="flow",
            action="close_concourse",
            target=concourse_id,
            reason=reason,
            metadata={"duration_min": duration_min},
        )
    )
    return {"ok": True, "data": {"intervention_id": iid, "concourse": concourse_id}}


def update_signage(
    screen_id: str, message: str, duration_s: int, reason: str
) -> dict[str, Any]:
    iid = add_intervention(
        Intervention(
            initiating_agent="flow",
            action="update_signage",
            target=screen_id,
            reason=reason,
            metadata={"message": message, "duration_s": duration_s},
        )
    )
    # Signage nudges are weaker — if `screen_id` names a zone, trim density a bit.
    z = get_zone(screen_id)
    if z and z.current_density > 3.6:
        set_zone_density(screen_id, 3.4, note=f"flow signage: {reason[:80]}")
    return {"ok": True, "data": {"intervention_id": iid, "screen_id": screen_id}}


def reroute_fans(
    from_zone: str, to_zone: str, expected_count: int, reason: str
) -> dict[str, Any]:
    iid = add_intervention(
        Intervention(
            initiating_agent="flow",
            action="reroute_fans",
            target=f"{from_zone}->{to_zone}",
            reason=reason,
            metadata={"expected_count": expected_count},
        )
    )
    # Simulate the intervention's crowd-flow effect so the tick loop
    # stops re-firing on the same zone. Real sensors would update density
    # naturally; in the hackathon we close the loop in Python.
    src = get_zone(from_zone)
    if src and src.current_density > 3.3:
        set_zone_density(from_zone, 3.2, note=f"flow reroute -> {to_zone}: {reason[:80]}")
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "from": from_zone,
            "to": to_zone,
            "from_new_density": 3.2,
        },
    }


def mark_zone_resolved(zone_id: str, new_density: float, reason: str) -> dict[str, Any]:
    """Update the zone's density after enacting interventions.

    In a real system the simulator or downstream sensors would naturally show
    a reduced density; for the hackathon we close the loop explicitly so the
    ops-console renders diffused red.
    """
    set_zone_density(zone_id, new_density, note=f"flow: {reason}")
    return {
        "ok": True,
        "data": {"zone_id": zone_id, "new_density": new_density},
    }


def list_all_zones() -> dict[str, Any]:
    zones = list_zones()
    return {
        "ok": True,
        "data": [
            {
                "id": z.id,
                "name": z.name,
                "type": z.type,
                "current_density": z.current_density,
            }
            for z in zones
        ],
    }

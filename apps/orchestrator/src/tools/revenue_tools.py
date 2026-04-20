"""Tools for the Revenue Agent — dynamic pricing, compensating offers."""
from __future__ import annotations

import uuid
from typing import Any

from ..state.firestore_client import Intervention, add_intervention


def push_targeted_offer(
    zone_ids: list[str],
    offer_text: str,
    offer_value_inr: int,
    fan_count_estimate: int,
    reason: str,
) -> dict[str, Any]:
    """Push a targeted discount or coupon to fans in the affected zones."""
    offer_id = f"offer-{uuid.uuid4().hex[:8]}"
    iid = add_intervention(
        Intervention(
            initiating_agent="revenue",
            action="push_targeted_offer",
            target=",".join(zone_ids) if zone_ids else "all",
            reason=reason,
            metadata={
                "offer_id": offer_id,
                "offer_text": offer_text,
                "offer_value_inr": offer_value_inr,
                "fan_count_estimate": fan_count_estimate,
                "channels": ["fan-pwa", "signage"],
            },
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "offer_id": offer_id,
            "zones": zone_ids,
            "fan_count": fan_count_estimate,
        },
    }


def log_revenue_mitigation(
    estimated_lost_sales_inr: int,
    offer_id: str,
    reason: str,
) -> dict[str, Any]:
    """Book-keeping: log the gross lost-sales estimate that the pushed
    offers are expected to mitigate. Surfaces in the ops metrics card.
    """
    iid = add_intervention(
        Intervention(
            initiating_agent="revenue",
            action="log_mitigation",
            target=offer_id,
            reason=reason,
            metadata={
                "estimated_lost_sales_inr": estimated_lost_sales_inr,
                "offer_id": offer_id,
            },
        )
    )
    return {
        "ok": True,
        "data": {
            "intervention_id": iid,
            "estimated_lost_sales_inr": estimated_lost_sales_inr,
            "offer_id": offer_id,
        },
    }


def adjust_stall_price(
    stall_id: str, item_id: str, new_price_inr: int, reason: str
) -> dict[str, Any]:
    """Dynamic pricing nudge — queue agent may request this if one stall
    is empty while another is swamped.
    """
    iid = add_intervention(
        Intervention(
            initiating_agent="revenue",
            action="adjust_stall_price",
            target=f"{stall_id}/{item_id}",
            reason=reason,
            metadata={"new_price_inr": new_price_inr},
        )
    )
    return {
        "ok": True,
        "data": {"intervention_id": iid, "stall_id": stall_id, "item_id": item_id},
    }

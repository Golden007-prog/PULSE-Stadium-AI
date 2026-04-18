"""PoS emitter — simulates concession sales."""
from __future__ import annotations

import random
from collections.abc import Callable
from typing import Any

_ITEMS = [
    {"id": "beer-500", "name": "Beer 500ml", "price_inr": 250, "category": "alcohol"},
    {"id": "samosa", "name": "Samosa", "price_inr": 60, "category": "snack"},
    {"id": "biryani", "name": "Chicken Biryani", "price_inr": 220, "category": "meal"},
    {"id": "coke", "name": "Coke 350ml", "price_inr": 100, "category": "soft"},
    {"id": "water", "name": "Water 500ml", "price_inr": 40, "category": "soft"},
    {"id": "popcorn", "name": "Popcorn", "price_inr": 120, "category": "snack"},
    {"id": "merch-jersey", "name": "RCB Home Jersey", "price_inr": 1999, "category": "merch"},
    {"id": "merch-cap", "name": "RCB Cap", "price_inr": 599, "category": "merch"},
]


def emit_pos(concessions: list[str], publish: Callable[[dict[str, Any]], None]) -> None:
    if not concessions:
        return
    stall = random.choice(concessions)
    item = random.choice(_ITEMS)
    qty = random.choices([1, 2, 3], weights=[0.75, 0.2, 0.05], k=1)[0]
    publish({
        "type": "pos_transaction",
        "zone_id": stall,
        "payload": {
            "item_id": item["id"],
            "item_name": item["name"],
            "category": item["category"],
            "qty": qty,
            "amount_inr": item["price_inr"] * qty,
            "payment_method": random.choice(["upi", "upi", "card", "cash"]),
        },
    })

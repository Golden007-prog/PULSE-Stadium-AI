"""Tests for the scripted-scenario event emitters.

Each emitter must:
* call the supplied ``publish`` callable exactly once per call,
* pick a zone from the provided list (never invent one),
* produce a ``type`` attribute that matches the schema documented in
  ``apps/simulator/README.md``.
"""
from __future__ import annotations

from typing import Any

from src.emitters.cctv import emit_cctv_anomaly
from src.emitters.pos import emit_pos
from src.emitters.restroom import emit_restroom
from src.emitters.turnstile import emit_turnstile


class _Recorder:
    """Capture every event ``publish`` is called with."""

    def __init__(self) -> None:
        """Initialise the test helper."""
        self.events: list[dict[str, Any]] = []

    def __call__(self, event: dict[str, Any]) -> None:
        """Record a single event for later assertion."""
        self.events.append(event)


def test_turnstile_picks_gate_from_list_and_emits_scan() -> None:
    """Turnstile picks gate from list and emits scan."""
    rec = _Recorder()
    gates = ["G-1", "G-2", "G-3", "G-4"]
    emit_turnstile(gates, rec)

    assert len(rec.events) == 1
    ev = rec.events[0]
    assert ev["type"] == "turnstile_scan"
    assert ev["zone_id"] in gates
    assert ev["payload"]["direction"] == "in"
    assert ev["payload"]["delta"] == 1
    assert ev["payload"]["ticket_tier"] in {"general", "premium", "corp"}


def test_turnstile_with_empty_gates_is_a_noop() -> None:
    """Turnstile with empty gates is a noop."""
    rec = _Recorder()
    emit_turnstile([], rec)
    assert rec.events == []


def test_pos_picks_concession_and_items_are_inr_priced() -> None:
    """Pos picks concession and items are inr priced."""
    rec = _Recorder()
    concessions = ["F-E", "F-W"]
    emit_pos(concessions, rec)

    assert len(rec.events) == 1
    ev = rec.events[0]
    assert ev["type"] == "pos_transaction"
    assert ev["zone_id"] in concessions
    payload = ev["payload"]
    assert payload["qty"] in (1, 2, 3)
    assert payload["amount_inr"] >= 40  # water (cheapest item) at qty 1
    assert payload["payment_method"] in {"upi", "card", "cash"}
    assert payload["category"] in {"alcohol", "snack", "meal", "soft", "merch"}


def test_restroom_emits_delta_and_gender_stall() -> None:
    """Restroom emits delta and gender stall."""
    rec = _Recorder()
    restrooms = ["C-01", "C-12"]
    emit_restroom(restrooms, rec)

    assert len(rec.events) == 1
    ev = rec.events[0]
    assert ev["type"] == "restroom_count"
    assert ev["zone_id"] in restrooms
    assert ev["payload"]["delta"] in (-1, 1)
    assert ev["payload"]["gender_stall"] in {"m", "f", "acc"}


def test_cctv_anomaly_passes_scripted_fields_through() -> None:
    """Cctv anomaly passes scripted fields through."""
    rec = _Recorder()
    scripted = {
        "zone": "C-12",
        "anomaly_type": "fall",
        "severity": "high",
        "confidence": 0.93,
        "reason": "Person fallen at C-12",
    }
    emit_cctv_anomaly(scripted, rec)

    assert len(rec.events) == 1
    ev = rec.events[0]
    assert ev["type"] == "vision_anomaly"
    assert ev["zone_id"] == "C-12"
    assert ev["payload"]["anomaly_type"] == "fall"
    assert ev["payload"]["severity"] == "high"
    assert ev["payload"]["confidence"] == 0.93
    assert ev["payload"]["scripted"] is True

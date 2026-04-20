"""Tests for the counterfactual ABS engine.

The engine is deliberately deterministic (modulo a small jitter) so a
regression in the orchestrator's chain would show up as a collapsed
reality-vs-counterfactual delta on the ops console's split-screen.
"""
from __future__ import annotations

import random

from src.abs_engine import (
    ADJACENCY,
    SATURATION,
    ABSEngine,
    EngineStep,
    MetricsTracker,
)


def _seed_engine() -> ABSEngine:
    """A typical t=0 snapshot with a spiked G-3 just like reality."""
    return ABSEngine.from_initial(
        [
            ("G-1", 1.0),
            ("G-2", 1.2),
            ("G-3", 5.2),  # the scripted spike
            ("G-4", 1.0),
            ("S-A", 2.0),
            ("S-B", 2.2),
            ("S-C", 1.9),
            ("S-D", 1.5),
            ("C-01", 1.8),
            ("C-12", 2.1),
            ("F-E", 0.9),
            ("F-W", 0.7),
        ]
    )


def test_engine_step_advances_tick_and_returns_all_zones() -> None:
    random.seed(1)
    eng = _seed_engine()
    step: EngineStep = eng.step()
    assert step.tick == 1
    assert step.elapsed_s == 5
    assert set(step.zones.keys()) == set(ADJACENCY.keys())
    assert len(step.zones) == 12


def test_engine_respects_saturation_ceiling() -> None:
    """G-3 is capped at SATURATION[G-3] = 6.8 p/m² no matter how long we run."""
    random.seed(2)
    eng = _seed_engine()
    for _ in range(120):  # 10 minutes at 5-s ticks
        step = eng.step()
    for zid, density in step.zones.items():
        assert density <= SATURATION[zid] + 0.01, f"{zid} exceeded saturation"


def test_engine_g3_monotone_pressure() -> None:
    """Without intervention, G-3 should only climb or stay flat (modulo jitter)
    over the first 60 seconds — that's the whole point of the counterfactual."""
    random.seed(3)
    eng = _seed_engine()
    g3_values = [eng.zones["G-3"]]
    for _ in range(12):
        step = eng.step()
        g3_values.append(step.zones["G-3"])
    # G-3 should be in the crush-risk band by tick 12 (60 s).
    assert g3_values[-1] >= 5.2
    assert g3_values[-1] >= g3_values[0] - 0.2  # tolerate small negative jitter


def test_metrics_tracker_counts_unique_incidents() -> None:
    """Each distinct zone crossing 5.5 p/m² should increment the counter once."""
    random.seed(4)
    eng = _seed_engine()
    metrics = MetricsTracker()
    for _ in range(120):
        metrics.observe(eng.step())
    assert metrics.peak_density >= 5.5
    assert metrics.incidents_would_occur >= 1
    assert metrics.peak_zone in ADJACENCY
    # wait_time_proxy accumulates while any zone stays over 5.0
    assert metrics.wait_time_proxy_s > 0


def test_metrics_as_dict_is_json_safe() -> None:
    """The summary doc goes to Firestore — must be plain JSON types only."""
    random.seed(5)
    eng = _seed_engine()
    metrics = MetricsTracker()
    metrics.observe(eng.step())
    payload = metrics.as_dict()
    assert set(payload.keys()) == {
        "peak_density",
        "peak_zone",
        "over_threshold_seconds",
        "incidents_would_occur",
        "wait_time_proxy_s",
    }
    assert isinstance(payload["peak_density"], float)
    assert isinstance(payload["peak_zone"], str)
    assert isinstance(payload["over_threshold_seconds"], int)

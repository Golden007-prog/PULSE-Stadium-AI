"""Density-only Agent-Based Simulation (ABS) engine.

Models what each Chinnaswamy zone's crowd density would do **without
any PULSE intervention**. The model is deliberately simple:

* Each zone has an intrinsic inflow rate plus a diffusion coupling to
  its neighbours.
* The east-side "bottleneck" (Gate 3 → Stand B → Concourse C-12) is
  primed to keep worsening — this is the divergence from reality that
  produces the split-screen wow.
* No queues, no medical, no F&B. Pure density story.

Based loosely on Wagner & Agrawal 2014 (REFERENCES §A6) — the simplest
model that still produces a visibly worse "do-nothing" timeline than
the intervened reality.
"""
from __future__ import annotations

import random
from collections.abc import Iterable
from dataclasses import dataclass, field

# Adjacency graph for the 12 Chinnaswamy zones — determines where
# overflow bleeds from a saturated zone. Curated by inspecting
# packages/simulated-stadium-map/zones.geojson.
ADJACENCY: dict[str, list[str]] = {
    "G-1": ["S-D", "C-01", "F-W"],
    "G-2": ["S-A", "C-01"],
    "G-3": ["S-B", "C-12", "F-E"],
    "G-4": ["S-C", "C-12"],
    "S-A": ["C-01", "G-2"],
    "S-B": ["C-01", "C-12", "G-3", "F-E"],
    "S-C": ["C-12", "G-4"],
    "S-D": ["C-01", "G-1", "F-W"],
    "C-01": ["S-A", "S-D", "S-B", "G-1", "G-2", "F-W", "F-E"],
    "C-12": ["S-B", "S-C", "G-3", "G-4"],
    "F-E": ["S-B", "C-01", "G-3"],
    "F-W": ["S-D", "C-01", "G-1"],
}

# Per-zone intrinsic inflow per 5-second tick (p/m² added without diffusion).
# Higher on the east-side bottleneck to keep the counterfactual worsening.
INFLOW: dict[str, float] = {
    "G-3": 0.14,
    "S-B": 0.07,
    "C-12": 0.08,
    "F-E": 0.05,
    "G-1": 0.03,
    "G-2": 0.03,
    "G-4": 0.03,
    "S-A": 0.02,
    "S-C": 0.025,
    "S-D": 0.02,
    "C-01": 0.03,
    "F-W": 0.02,
}

# Saturation cap (p/m²) per zone — realistic crush-risk ceiling.
SATURATION: dict[str, float] = {
    "G-1": 5.0, "G-2": 5.0, "G-3": 6.8, "G-4": 5.0,
    "S-A": 4.5, "S-B": 5.6, "S-C": 4.5, "S-D": 4.5,
    "C-01": 5.0, "C-12": 5.8,
    "F-E": 4.8, "F-W": 4.5,
}


@dataclass
class EngineStep:
    """Result of one counterfactual tick."""
    tick: int
    elapsed_s: int
    zones: dict[str, float]  # zone_id -> density p/m²
    hot_zones: list[str]      # >= 4.5 p/m²
    critical_zones: list[str] # >= 5.5 p/m²


@dataclass
class MetricsTracker:
    peak_density: float = 0.0
    peak_zone: str = ""
    over_threshold_seconds: int = 0        # zone-seconds above 5.0 p/m² anywhere
    incidents_would_occur: int = 0          # distinct zone crossings above 5.5
    wait_time_proxy_s: int = 0              # scales with overcrowding
    _seen_critical: set[str] = field(default_factory=set)

    def observe(self, step: EngineStep) -> None:
        for zid, d in step.zones.items():
            if d > self.peak_density:
                self.peak_density = d
                self.peak_zone = zid
            if d >= 5.0:
                # Each tick is 5 seconds; count one zone-second per hot zone
                self.over_threshold_seconds += 5
                # Waits scale roughly with overcrowding
                self.wait_time_proxy_s += int(3 + (d - 5.0) * 25)
            if d >= 5.5 and zid not in self._seen_critical:
                self._seen_critical.add(zid)
                self.incidents_would_occur += 1

    def as_dict(self) -> dict[str, float | int | str]:
        return {
            "peak_density": round(self.peak_density, 2),
            "peak_zone": self.peak_zone,
            "over_threshold_seconds": self.over_threshold_seconds,
            "incidents_would_occur": self.incidents_would_occur,
            "wait_time_proxy_s": self.wait_time_proxy_s,
        }


@dataclass
class ABSEngine:
    zones: dict[str, float]
    tick: int = 0

    @classmethod
    def from_initial(cls, initial: Iterable[tuple[str, float]]) -> ABSEngine:
        return cls(zones={zid: max(0.0, float(d)) for zid, d in initial})

    def step(self, dt_s: int = 5) -> EngineStep:
        """Advance one 5-second tick with NO agent intervention."""
        self.tick += 1

        # 1. Intrinsic inflow per zone (with a little noise so ticks don't
        #    look mechanical on the split-screen).
        post_inflow: dict[str, float] = {}
        for zid, d in self.zones.items():
            inflow = INFLOW.get(zid, 0.02)
            jitter = random.uniform(-0.008, 0.015)
            post_inflow[zid] = d + inflow + jitter

        # 2. Diffusion: any zone above 4.0 p/m² pushes ~4% of its excess
        #    into each adjacent zone. Reality's Flow agent would have
        #    closed or rerouted before this got out of hand — the whole
        #    point of the counterfactual is that nothing does.
        diffusion_out: dict[str, float] = {zid: 0.0 for zid in post_inflow}
        diffusion_in: dict[str, float] = {zid: 0.0 for zid in post_inflow}
        for zid, d in post_inflow.items():
            excess = d - 4.0
            if excess <= 0:
                continue
            neighbours = ADJACENCY.get(zid, [])
            if not neighbours:
                continue
            per_neighbour = (excess * 0.04) / len(neighbours)
            diffusion_out[zid] += per_neighbour * len(neighbours)
            for n in neighbours:
                if n in diffusion_in:
                    diffusion_in[n] += per_neighbour

        new_zones: dict[str, float] = {}
        hot: list[str] = []
        critical: list[str] = []
        for zid in post_inflow:
            d = post_inflow[zid] - diffusion_out[zid] + diffusion_in[zid]
            d = max(0.0, min(SATURATION.get(zid, 5.0), d))
            new_zones[zid] = round(d, 3)
            if d >= 4.5:
                hot.append(zid)
            if d >= 5.5:
                critical.append(zid)

        self.zones = new_zones
        return EngineStep(
            tick=self.tick,
            elapsed_s=self.tick * dt_s,
            zones=new_zones,
            hot_zones=hot,
            critical_zones=critical,
        )

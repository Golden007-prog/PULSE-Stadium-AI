"""Read-only view of venue state assembled for the tick loop."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .event_buffer import EventBuffer
from .firestore_client import Zone, list_zones


@dataclass
class VenueSnapshot:
    zones: list[Zone]
    attendance: int
    alerts: list[dict[str, Any]]
    fan_queries: list[dict[str, Any]]
    anomalies: list[dict[str, Any]]

    def hot_zones(self, threshold: float = 3.5) -> list[Zone]:
        return [z for z in self.zones if z.current_density >= threshold]

    def crush_risk(self, threshold: float = 4.0) -> list[Zone]:
        return [z for z in self.zones if z.current_density >= threshold]

    def to_prompt_json(self) -> dict[str, Any]:
        return {
            "zones": [
                {
                    "id": z.id,
                    "name": z.name,
                    "type": z.type,
                    "capacity": z.capacity,
                    "current_density": round(z.current_density, 2),
                }
                for z in self.zones
            ],
            "attendance_counted": self.attendance,
            "alerts": self.alerts,
            "fan_queries": self.fan_queries,
            "anomalies": self.anomalies,
        }


def read_snapshot(buffer: EventBuffer) -> VenueSnapshot:
    return VenueSnapshot(
        zones=list_zones(),
        attendance=buffer.attendance,
        alerts=list(buffer.alerts),
        fan_queries=list(buffer.fan_queries),
        anomalies=list(buffer.anomalies),
    )

"""Shared pytest fixtures for orchestrator tool tests.

Tests run with `cd apps/orchestrator && pytest src/tests`. The pytest
config in pyproject.toml sets pythonpath so `src.*` imports resolve.
Firestore clients are never instantiated in tests — tools are exercised
with the underlying helpers patched via `unittest.mock`.
"""
from __future__ import annotations

import pytest

from src.state.firestore_client import Zone


@pytest.fixture
def hot_zone() -> Zone:
    """A zone above the 4.0 p/m² hot threshold."""
    return Zone(
        id="G-3",
        name="Gate 3 (East)",
        type="gate",
        capacity=700,
        current_density=5.2,
    )


@pytest.fixture
def calm_zone() -> Zone:
    """A zone comfortably below the soft intervention threshold."""
    return Zone(
        id="G-2",
        name="Gate 2 (North)",
        type="gate",
        capacity=600,
        current_density=1.4,
    )

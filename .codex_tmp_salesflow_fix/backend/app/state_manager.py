from __future__ import annotations

import asyncio
from typing import Any, Dict

from .models import ProjectState


class StateManager:
    """Small async-safe wrapper around ProjectState.

    Today the orchestration is request-scoped. If we later move to long-running
    jobs or websockets, this class is the seam where Redis/Postgres state can be
    added without rewriting the agents.
    """

    def __init__(self, initial_state: ProjectState | None = None):
        self._state = initial_state or ProjectState()
        self._lock = asyncio.Lock()

    async def snapshot(self) -> ProjectState:
        async with self._lock:
            return self._state.model_copy(deep=True)

    async def update(self, updates: Dict[str, Any]) -> ProjectState:
        async with self._lock:
            self._state.update_safe(updates)
            return self._state.model_copy(deep=True)

    async def add_note(self, note: str) -> None:
        if not note:
            return
        async with self._lock:
            self._state.notes.append(note)

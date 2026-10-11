from __future__ import annotations

TERMINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}
ACTIVE_STATES = {"CREATED", "ACTIVE", "SUSPECTED_STALL", "RECONNECTED", "UNKNOWN"}
ALL_STATES = TERMINAL_STATES | ACTIVE_STATES

_ALLOWED = {
    "CREATED": {"ACTIVE", "CANCELLED", "UNKNOWN"},
    "ACTIVE": {"SUSPECTED_STALL", "COMPLETED", "FAILED", "CANCELLED", "UNKNOWN"},
    "SUSPECTED_STALL": {"RECONNECTED", "CANCELLED", "UNKNOWN", "COMPLETED", "FAILED"},
    "RECONNECTED": {"ACTIVE", "SUSPECTED_STALL", "COMPLETED", "FAILED", "CANCELLED", "UNKNOWN"},
    "UNKNOWN": {"RECONNECTED", "ACTIVE", "COMPLETED", "FAILED", "CANCELLED", "SUSPECTED_STALL"},
    "COMPLETED": set(),
    "FAILED": set(),
    "CANCELLED": set(),
}


def validate_state(state: str) -> str:
    state = str(state).upper()
    if state not in ALL_STATES:
        raise ValueError(f"invalid TaskBridge state: {state}")
    return state


def can_transition(old: str, new: str) -> bool:
    old = validate_state(old)
    new = validate_state(new)
    return old == new or new in _ALLOWED[old]


def require_transition(old: str, new: str) -> None:
    if not can_transition(old, new):
        raise ValueError(f"invalid TaskBridge transition: {old} -> {new}")

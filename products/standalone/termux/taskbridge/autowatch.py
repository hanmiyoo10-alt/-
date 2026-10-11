from __future__ import annotations

import time
from typing import Any

DEFAULT_PACKAGE = "com.openai.chatgpt"
DEFAULT_POLL_INTERVAL = 5.0
MIN_POLL_INTERVAL = 2.0
MAX_POLL_INTERVAL = 60.0
REARM_SECONDS = 2.0
RETRY_SECONDS = 30.0
AUTO_NAME = "ChatGPT automatic notification observer"

META_ENABLED = "chatgpt_autowatch_enabled"
META_PACKAGE = "chatgpt_autowatch_package"
META_POLL = "chatgpt_autowatch_poll_interval"
META_CURRENT_JOB = "chatgpt_autowatch_current_job"
META_LAST_ARM = "chatgpt_autowatch_last_arm_at"

ACTIVE_STATES = {"CREATED", "ACTIVE", "RECONNECTED"}


def validate_poll_interval(value: float) -> float:
    value = float(value)
    if not (MIN_POLL_INTERVAL <= value <= MAX_POLL_INTERVAL):
        raise ValueError(
            f"poll interval must be between {MIN_POLL_INTERVAL:g} and {MAX_POLL_INTERVAL:g} seconds"
        )
    return value


def _float_meta(store: Any, key: str, default: float) -> float:
    raw = store.get_meta(key)
    try:
        return float(raw) if raw is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def config(store: Any) -> dict[str, Any]:
    package = store.get_meta(META_PACKAGE) or DEFAULT_PACKAGE
    poll = _float_meta(store, META_POLL, DEFAULT_POLL_INTERVAL)
    try:
        poll = validate_poll_interval(poll)
    except ValueError:
        poll = DEFAULT_POLL_INTERVAL
    return {
        "enabled": store.get_meta(META_ENABLED) == "1",
        "package": package,
        "poll_interval_seconds": poll,
        "current_job_id": store.get_meta(META_CURRENT_JOB) or None,
        "last_arm_at": _float_meta(store, META_LAST_ARM, 0.0),
    }


def find_active_observer(store: Any, package: str) -> dict[str, Any] | None:
    for job in store.list_jobs(500):
        if job.get("adapter") != "chatgpt_notification":
            continue
        command = job.get("command") or []
        job_package = command[0] if command else DEFAULT_PACKAGE
        if job_package == package and job.get("logical_state") in ACTIVE_STATES:
            return job
    return None


def latest_observer(store: Any, package: str) -> dict[str, Any] | None:
    for job in store.list_jobs(500):
        if job.get("adapter") != "chatgpt_notification":
            continue
        command = job.get("command") or []
        job_package = command[0] if command else DEFAULT_PACKAGE
        if job_package == package:
            return job
    return None


def status(store: Any) -> dict[str, Any]:
    data = config(store)
    active = find_active_observer(store, data["package"])
    latest = latest_observer(store, data["package"])
    data.update(
        {
            "active_job_id": active.get("job_id") if active else None,
            "active_state": active.get("logical_state") if active else None,
            "latest_job_id": latest.get("job_id") if latest else None,
            "latest_state": latest.get("logical_state") if latest else None,
            "scope": "local_taskbridge_state_only",
        }
    )
    return data


def enable(store: Any, package: str = DEFAULT_PACKAGE, poll_interval: float = DEFAULT_POLL_INTERVAL) -> dict[str, Any]:
    poll_interval = validate_poll_interval(poll_interval)
    store.set_meta(META_ENABLED, "1")
    store.set_meta(META_PACKAGE, package)
    store.set_meta(META_POLL, str(poll_interval))
    return status(store)


def disable(store: Any) -> dict[str, Any]:
    current = store.get_meta(META_CURRENT_JOB)
    store.set_meta(META_ENABLED, "0")
    if current:
        try:
            job = store.get_job(current)
        except KeyError:
            job = None
        if (
            job
            and job.get("name") == AUTO_NAME
            and job.get("logical_state") in ACTIVE_STATES
            and job.get("desired_action") != "CANCEL"
        ):
            store.request(current, "CANCEL")
    return status(store)


def arm_if_needed(store: Any, now: float | None = None, *, force: bool = False) -> dict[str, Any] | None:
    data = config(store)
    if not data["enabled"]:
        return None

    active = find_active_observer(store, data["package"])
    if active:
        store.set_meta(META_CURRENT_JOB, active["job_id"])
        return None

    now = time.time() if now is None else float(now)
    latest = latest_observer(store, data["package"])
    last_reference = data["last_arm_at"]
    cooldown = REARM_SECONDS
    if latest:
        last_reference = max(last_reference, float(latest.get("updated_at") or 0.0))
        if latest.get("logical_state") != "COMPLETED":
            cooldown = RETRY_SECONDS

    if not force and now - last_reference < cooldown:
        return None

    job = store.create_job(
        [data["package"], "0", str(data["poll_interval_seconds"])],
        adapter="chatgpt_notification",
        name=AUTO_NAME,
    )
    store.add_event(
        job["job_id"],
        "AUTOWATCH_ARMED",
        {
            "package": data["package"],
            "poll_interval_seconds": data["poll_interval_seconds"],
            "timeout_seconds": 0,
            "mode": "automatic_rearm",
            "forced": bool(force),
        },
    )
    store.request(job["job_id"], "RUN")
    store.set_meta(META_CURRENT_JOB, job["job_id"])
    store.set_meta(META_LAST_ARM, str(now))
    return store.get_job(job["job_id"])

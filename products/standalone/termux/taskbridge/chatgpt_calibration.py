from __future__ import annotations

import json
from typing import Any

TRUST_THRESHOLD = 3
META_PREFIX = "chatgpt_completion_confirmations:"


def _meta_key(package: str) -> str:
    return f"{META_PREFIX}{package}"


def confirmed_job_ids(store: Any, package: str) -> list[str]:
    raw = store.get_meta(_meta_key(package))
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(data, list):
        return []
    out: list[str] = []
    for item in data:
        if isinstance(item, str) and item and item not in out:
            out.append(item)
    return out


def status(store: Any, package: str) -> dict[str, Any]:
    jobs = confirmed_job_ids(store, package)
    trusted = len(jobs) >= TRUST_THRESHOLD
    return {
        "package": package,
        "confirmed_jobs": jobs,
        "confirmed_count": len(jobs),
        "threshold": TRUST_THRESHOLD,
        "trusted": trusted,
        "signal_confidence": "HIGH" if trusted else "MEDIUM",
        "scope": "local_taskbridge_state_only",
    }


def record_confirmation(store: Any, package: str, job_id: str) -> dict[str, Any]:
    jobs = confirmed_job_ids(store, package)
    added = job_id not in jobs
    if added:
        jobs.append(job_id)
        store.set_meta(_meta_key(package), json.dumps(jobs, separators=(",", ":")))
    result = status(store, package)
    result["added"] = added
    return result

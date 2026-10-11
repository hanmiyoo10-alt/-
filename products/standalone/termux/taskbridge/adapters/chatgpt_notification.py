from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from typing import Any, Iterable

CHATGPT_PACKAGE = "com.openai.chatgpt"


def available() -> bool:
    return shutil.which("termux-notification-list") is not None


def _fingerprint(item: dict[str, Any]) -> str:
    # Hash only; TaskBridge does not persist notification text.
    stable = {
        "id": item.get("id"),
        "tag": item.get("tag"),
        "key": item.get("key"),
        "group": item.get("group"),
        "packageName": item.get("packageName"),
        "title": item.get("title"),
        "content": item.get("content"),
        "when": item.get("when"),
        "lines": item.get("lines"),
    }
    raw = json.dumps(stable, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def list_notifications(*, timeout: float = 8.0) -> list[dict[str, Any]]:
    exe = shutil.which("termux-notification-list")
    if not exe:
        raise RuntimeError("termux-notification-list unavailable")
    proc = subprocess.run(
        [exe],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "notification list failed").strip().splitlines()
        raise RuntimeError(detail[-1][:200] if detail else "notification list failed")
    try:
        data = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError as exc:
        raise RuntimeError("invalid JSON from termux-notification-list") from exc
    if not isinstance(data, list):
        raise RuntimeError("unexpected notification-list payload")
    return [item for item in data if isinstance(item, dict)]


def snapshot_from_items(items: Iterable[dict[str, Any]], package: str = CHATGPT_PACKAGE) -> set[str]:
    return {
        _fingerprint(item)
        for item in items
        if str(item.get("packageName") or "") == package
    }


def snapshot(package: str = CHATGPT_PACKAGE) -> set[str]:
    return snapshot_from_items(list_notifications(), package)


def probe(package: str = CHATGPT_PACKAGE) -> dict[str, Any]:
    items = [
        item
        for item in list_notifications()
        if str(item.get("packageName") or "") == package
    ]
    # Privacy-preserving probe: only counts and opaque hashes are returned.
    return {
        "available": True,
        "package": package,
        "matching_notifications": len(items),
        "fingerprints": sorted(_fingerprint(item) for item in items),
    }

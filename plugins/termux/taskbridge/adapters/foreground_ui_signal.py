from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable

from adapters import chatgpt_notification

COMPANION_PACKAGE = "io.taskbridge.chatgptsignal"
SIGNAL_NOTIFICATION_ID = "742001"
SEMANTIC = "foreground_ui_stop_control_disappeared_signal"
SOURCE = "android_accessibility_companion"


def _matches(item: dict[str, Any]) -> bool:
    if str(item.get("packageName") or "") != COMPANION_PACKAGE:
        return False
    return str(item.get("id") or "") == SIGNAL_NOTIFICATION_ID


def _fingerprint(item: dict[str, Any]) -> str:
    # Deliberately exclude title/content/lines. TaskBridge only needs an opaque
    # change token from the dedicated companion notification.
    stable = {
        "id": item.get("id"),
        "key": item.get("key"),
        "packageName": item.get("packageName"),
        "when": item.get("when"),
    }
    raw = json.dumps(stable, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def available() -> bool:
    return chatgpt_notification.available()


def snapshot_from_items(items: Iterable[dict[str, Any]]) -> set[str]:
    return {_fingerprint(item) for item in items if _matches(item)}


def snapshot() -> set[str]:
    return snapshot_from_items(chatgpt_notification.list_notifications())


def probe() -> dict[str, Any]:
    items = [item for item in chatgpt_notification.list_notifications() if _matches(item)]
    return {
        "available": True,
        "package": COMPANION_PACKAGE,
        "notification_id": SIGNAL_NOTIFICATION_ID,
        "matching_signals": len(items),
        "fingerprints": sorted(_fingerprint(item) for item in items),
        "privacy": "package/id/time metadata only; notification text excluded from fingerprint",
    }

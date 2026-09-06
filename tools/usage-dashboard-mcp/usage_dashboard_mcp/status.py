from __future__ import annotations

import time
from typing import Any

from .github_reader import GitHubReadError
from .local_reader import LocalBridgeReadError

_MANIFEST_PATH = "plugins/usage-dashboard/runtime/product-manifest.json"
_LATEST_PATH = "plugins/usage-dashboard/latest.js"


def _add_error(errors: list[dict[str, str]], source: str, message: str) -> None:
    errors.append({"source": source, "message": message})


def _component(manifest: dict[str, Any] | None, *path: str) -> Any:
    value: Any = manifest
    for key in path:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def _bounded_contracts(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    result: dict[str, Any] = {}
    for key in ("snapshot", "recentRequest"):
        item = value.get(key)
        if isinstance(item, (str, int, float)) and not isinstance(item, bool):
            result[key] = item
        elif item is not None:
            result[key] = None
    return result


def _parity(main_manifest_blob: str | None, release_manifest_blob: str | None, main_latest_blob: str | None, release_latest_blob: str | None) -> str:
    values = (main_manifest_blob, release_manifest_blob, main_latest_blob, release_latest_blob)
    if any(value is None for value in values):
        return "unknown"
    return "exact" if (main_manifest_blob == release_manifest_blob and main_latest_blob == release_latest_blob) else "drift"


def _module_summary(snapshot: dict[str, Any] | None) -> dict[str, int] | None:
    modules = snapshot.get("modules") if isinstance(snapshot, dict) else None
    if not isinstance(modules, dict):
        return None
    counts = {"total": 0, "stale": 0, "error": 0, "partial": 0}
    for value in modules.values():
        if not isinstance(value, dict):
            continue
        counts["total"] += 1
        status = str(value.get("status") or "").lower()
        if status in counts and status != "total":
            counts[status] += 1
    return counts


def _snapshot_error_count(snapshot: dict[str, Any] | None) -> int | None:
    errors = snapshot.get("errors") if isinstance(snapshot, dict) else None
    return len(errors) if isinstance(errors, dict) else None


def _snapshot_age_ms(snapshot: dict[str, Any] | None, now_ms: int) -> int | None:
    fetched_at = snapshot.get("fetchedAt") if isinstance(snapshot, dict) else None
    if not isinstance(fetched_at, (int, float)) or isinstance(fetched_at, bool):
        return None
    return max(0, int(now_ms - fetched_at))


def build_status(github_reader: Any, local_reader: Any, *, now_ms: int | None = None) -> dict[str, Any]:
    """Aggregate read-only Usage Dashboard authority and same-device runtime status."""

    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    now = int(time.time() * 1000) if now_ms is None else int(now_ms)

    main_branch = getattr(github_reader, "main_branch", "main")
    release_branch = getattr(github_reader, "release_branch", "release-usage-dashboard")
    repository = getattr(github_reader, "repository", "unknown")

    main_head: str | None = None
    release_head: str | None = None
    main_manifest: dict[str, Any] | None = None
    release_manifest: dict[str, Any] | None = None
    main_manifest_blob: str | None = None
    release_manifest_blob: str | None = None
    main_latest_blob: str | None = None
    release_latest_blob: str | None = None

    for branch_name, target in ((main_branch, "main"), (release_branch, "release")):
        try:
            value = github_reader.get_branch_sha(branch_name)
            if target == "main":
                main_head = value
            else:
                release_head = value
        except GitHubReadError as exc:
            _add_error(errors, exc.source, exc.message)

    for branch_name, target in ((main_branch, "main"), (release_branch, "release")):
        try:
            manifest, blob = github_reader.get_json_file(_MANIFEST_PATH, branch_name)
            if target == "main":
                main_manifest, main_manifest_blob = manifest, blob
            else:
                release_manifest, release_manifest_blob = manifest, blob
        except GitHubReadError as exc:
            _add_error(errors, exc.source, exc.message)
        try:
            _, blob = github_reader.get_file(_LATEST_PATH, branch_name)
            if target == "main":
                main_latest_blob = blob
            else:
                release_latest_blob = blob
        except GitHubReadError as exc:
            _add_error(errors, exc.source, exc.message)

    production = release_manifest
    product = {
        "version": production.get("productVersion") if isinstance(production, dict) else None,
        "engineVersion": _component(production, "components", "bridge", "requiredVersion"),
        "managerVersion": _component(production, "components", "bridgeManager", "version"),
        "cliVersion": _component(production, "components", "bridgeManager", "managedCliVersion"),
        "modelsVersion": _component(production, "components", "bridgeManager", "managedModelCatalogVersion"),
        "contracts": _bounded_contracts(production.get("contracts") if isinstance(production, dict) else None),
    }

    health: dict[str, Any] | None = None
    snapshot: dict[str, Any] | None = None
    local_available: bool | None = None
    authenticated_snapshot: bool | None = None

    try:
        health = local_reader.get_health()
        local_available = True
    except LocalBridgeReadError as exc:
        local_available = False
        _add_error(errors, exc.source, exc.message)

    if local_available:
        try:
            snapshot = local_reader.get_light_snapshot()
            if snapshot is None:
                authenticated_snapshot = False
                warnings.append({"source": "local-bridge:/snapshot", "message": "bridge credential unavailable; authenticated snapshot skipped"})
            else:
                authenticated_snapshot = True
        except LocalBridgeReadError as exc:
            authenticated_snapshot = False
            _add_error(errors, exc.source, exc.message)

    module_summary = _module_summary(snapshot)
    active_errors = _snapshot_error_count(snapshot)
    health_ok = health.get("ok") if isinstance(health, dict) and isinstance(health.get("ok"), bool) else None
    snapshot_ok = snapshot.get("ok") if isinstance(snapshot, dict) and isinstance(snapshot.get("ok"), bool) else None
    local_runtime = {
        "available": local_available,
        "health": health.get("status") if isinstance(health, dict) and isinstance(health.get("status"), str) else None,
        "healthOk": health_ok,
        "readiness": snapshot.get("readiness") if isinstance(snapshot, dict) and isinstance(snapshot.get("readiness"), str) else None,
        "snapshotAuthenticated": authenticated_snapshot,
        "snapshotOk": snapshot_ok,
        "activeErrors": active_errors,
        "failures": snapshot.get("failures") if isinstance(snapshot, dict) and isinstance(snapshot.get("failures"), int) and not isinstance(snapshot.get("failures"), bool) else None,
        "staleModules": module_summary.get("stale") if module_summary is not None else None,
        "moduleSummary": module_summary,
        "bridgeVersion": (
            snapshot.get("bridgeVersion") if isinstance(snapshot, dict) and isinstance(snapshot.get("bridgeVersion"), str)
            else health.get("version") if isinstance(health, dict) and isinstance(health.get("version"), str)
            else None
        ),
        "snapshotAgeMs": _snapshot_age_ms(snapshot, now),
    }

    github_error_count = sum(1 for item in errors if item["source"].startswith(("branch:", "file:", "json:")))
    github_state = "ok" if github_error_count == 0 else "partial" if any((main_head, release_head, main_manifest, release_manifest)) else "unavailable"
    local_state = "unavailable" if not local_available else "ok" if authenticated_snapshot is True else "partial"
    parity_state = _parity(main_manifest_blob, release_manifest_blob, main_latest_blob, release_latest_blob)
    overall_ok = (
        not errors
        and parity_state != "drift"
        and health_ok is not False
        and snapshot_ok is not False
        and (active_errors is None or active_errors == 0)
    )

    return {
        "ok": overall_ok,
        "product": product,
        "github": {
            "repository": repository,
            "mainHead": main_head,
            "releaseHead": release_head,
            "releaseVersion": product["version"],
            "parityState": parity_state,
            "mainManifestBlob": main_manifest_blob,
            "releaseManifestBlob": release_manifest_blob,
            "mainLatestBlob": main_latest_blob,
            "releaseLatestBlob": release_latest_blob,
        },
        "localRuntime": local_runtime,
        "source": {"github": github_state, "localBridge": local_state},
        "warnings": warnings,
        "errors": errors,
    }

from __future__ import annotations

import argparse
import hashlib
import json
import platform as platform_module
import subprocess
import sys
import shutil
import time
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract
from benchmarks.colab.request import (
    EXECUTION_PROFILE_ID,
    OPERATION_KIND,
    ColabBootstrapRequestError,
    load_request,
    validate_request,
)

RECEIPT_SCHEMA = "colab-bootstrap-receipt-v1.schema.json"
EXECUTION_SURFACE = "COLAB_MANAGED_CPU_AUX"
HANDOFF_PREFIX = Path("nyang-colab/agent-bench/bootstrap")
SENTINEL_PATHS = (
    "tools/agent-skill-orchestrator/canonical.py",
    "tools/agent-skill-orchestrator/models/registry.json",
)
FORBIDDEN_KEYS = {
    "token", "access_token", "refresh_token", "cookie", "cookies",
    "password", "credential", "credentials", "secret", "secrets",
    "account_id", "drive_id", "email", "billing_id", "payment",
}
SENSITIVE_VALUE_MARKERS = ("ghp_", "github_pat_", "ya29.", "authorization:", "bearer ")


class ColabBootstrapError(ValueError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_file(path: Path) -> str:
    return _sha256_bytes(path.read_bytes())


def _json_file_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _hash_without_self(value: dict[str, Any], field: str) -> str:
    base = deepcopy(value)
    base.pop(field, None)
    return canonical_sha256(base)


def _git(repo_root: Path, *args: str, binary: bool = False) -> str | bytes:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=not binary,
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ColabBootstrapError(f"git invocation failed: {exc}") from exc
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", "replace") if binary else proc.stderr
        stdout = proc.stdout.decode("utf-8", "replace") if binary else proc.stdout
        detail = (stderr or stdout or f"exit={proc.returncode}").strip()
        raise ColabBootstrapError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout


def assert_sanitized_payload(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = str(key).lower()
            if normalized in FORBIDDEN_KEYS or normalized.endswith("_access_token") or normalized.endswith("_refresh_token"):
                raise ColabBootstrapError(f"forbidden sensitive key at {path}.{key}")
            assert_sanitized_payload(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            assert_sanitized_payload(item, f"{path}[{index}]")
    elif isinstance(value, str):
        lower = value.lower()
        if "@" in value and "." in value.split("@")[-1]:
            raise ColabBootstrapError(f"email-like value forbidden at {path}")
        if any(marker in lower for marker in SENSITIVE_VALUE_MARKERS):
            raise ColabBootstrapError(f"secret-like value forbidden at {path}")


def _admit_repository(repo_root: Path, request: dict[str, Any]) -> tuple[str, str]:
    root = repo_root.resolve()
    if not root.is_dir():
        raise ColabBootstrapError("repository root missing")
    head = str(_git(root, "rev-parse", "HEAD")).strip()
    if head != request["repository_sha"]:
        raise ColabBootstrapError(
            f"BLOCKED_REPO_SHA_MISMATCH: requested {request['repository_sha']} observed {head}"
        )
    status = str(_git(root, "status", "--porcelain", "--untracked-files=all"))
    if status.strip():
        raise ColabBootstrapError("BLOCKED_DIRTY_REPOSITORY: bootstrap checkout must be clean")
    tree_sha = str(_git(root, "rev-parse", "HEAD^{tree}")).strip()
    return head, tree_sha


def _sentinels(repo_root: Path, head: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for path in SENTINEL_PATHS:
        blob_sha = str(_git(repo_root, "rev-parse", f"{head}:{path}")).strip()
        content = _git(repo_root, "show", f"{head}:{path}", binary=True)
        if not isinstance(content, bytes):
            raise ColabBootstrapError("internal sentinel byte read failure")
        entries.append({
            "path": path,
            "blob_sha": blob_sha,
            "content_sha256": _sha256_bytes(content),
            "byte_size": len(content),
        })
    return entries


def _handoff_relative_path(request_id: str) -> str:
    return (HANDOFF_PREFIX / request_id).as_posix()


def _resolve_output_dir(drive_root: Path, request_id: str) -> Path:
    root = drive_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    target = (root / HANDOFF_PREFIX / request_id).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ColabBootstrapError("drive handoff escaped configured drive root") from exc
    if target.exists():
        raise ColabBootstrapError("drive handoff target already exists")
    return target


def _validate_result(value: dict[str, Any]) -> dict[str, Any]:
    required = {
        "schema_version", "operation_kind", "execution_profile_id", "request_sha256",
        "repository_sha", "repository_tree_sha", "sentinels", "sentinel_manifest_sha256",
        "model_call_count", "hosted_ai_call_count", "status", "semantic_scope", "result_sha256",
    }
    if set(value) != required:
        raise ColabBootstrapError("result fields invalid")
    if value["schema_version"] != 1 or value["operation_kind"] != OPERATION_KIND:
        raise ColabBootstrapError("result identity invalid")
    if value["execution_profile_id"] != EXECUTION_PROFILE_ID:
        raise ColabBootstrapError("result execution profile invalid")
    if value["model_call_count"] != 0 or value["hosted_ai_call_count"] != 0:
        raise ColabBootstrapError("bootstrap result must record zero AI calls")
    if value["status"] != "PROVENANCE_COMPLETE":
        raise ColabBootstrapError("bootstrap result status invalid")
    if value["semantic_scope"] != "REPOSITORY_PROVENANCE_ONLY":
        raise ColabBootstrapError("bootstrap result semantic scope invalid")
    if not isinstance(value["sentinels"], list) or [x.get("path") for x in value["sentinels"]] != list(SENTINEL_PATHS):
        raise ColabBootstrapError("sentinel list invalid")
    if canonical_sha256(value["sentinels"]) != value["sentinel_manifest_sha256"]:
        raise ColabBootstrapError("sentinel manifest hash mismatch")
    if _hash_without_self(value, "result_sha256") != value["result_sha256"]:
        raise ColabBootstrapError("result_sha256 mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def _validate_manifest(value: dict[str, Any]) -> dict[str, Any]:
    required = {
        "schema_version", "request_id", "drive_handoff_relative_path", "coverage_scope",
        "covered_files", "file_sha256", "bundle_manifest_sha256",
    }
    if set(value) != required:
        raise ColabBootstrapError("bundle manifest fields invalid")
    if value["schema_version"] != 1:
        raise ColabBootstrapError("bundle manifest schema invalid")
    if value["coverage_scope"] != "REQUEST_AND_RESULT_PRE_RECEIPT":
        raise ColabBootstrapError("bundle manifest coverage scope invalid")
    if value["covered_files"] != ["request.json", "result.json"]:
        raise ColabBootstrapError("bundle manifest covered_files invalid")
    if set(value["file_sha256"]) != {"request.json", "result.json"}:
        raise ColabBootstrapError("bundle manifest file map invalid")
    if _hash_without_self(value, "bundle_manifest_sha256") != value["bundle_manifest_sha256"]:
        raise ColabBootstrapError("bundle manifest hash mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def _validate_receipt(value: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_contract(value, RECEIPT_SCHEMA)
    except ContractValidationError as exc:
        raise ColabBootstrapError(str(exc)) from exc
    if value["wall_clock_ms"] < 0:
        raise ColabBootstrapError("wall_clock_ms must be non-negative")
    if _hash_without_self(value, "receipt_sha256") != value["receipt_sha256"]:
        raise ColabBootstrapError("receipt_sha256 mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def run_bootstrap(request: dict[str, Any], repo_root: Path | str, drive_root: Path | str) -> dict[str, Any]:
    request = validate_request(request)
    assert_sanitized_payload(request)
    started_iso = _utc_now()
    started = time.monotonic()
    root = Path(repo_root).resolve()
    head, tree_sha = _admit_repository(root, request)
    sentinels = _sentinels(root, head)
    sentinel_manifest_sha256 = canonical_sha256(sentinels)

    result = {
        "schema_version": 1,
        "operation_kind": OPERATION_KIND,
        "execution_profile_id": EXECUTION_PROFILE_ID,
        "request_sha256": request["request_sha256"],
        "repository_sha": head,
        "repository_tree_sha": tree_sha,
        "sentinels": sentinels,
        "sentinel_manifest_sha256": sentinel_manifest_sha256,
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
        "status": "PROVENANCE_COMPLETE",
        "semantic_scope": "REPOSITORY_PROVENANCE_ONLY",
    }
    result["result_sha256"] = _hash_without_self(result, "result_sha256")
    _validate_result(result)

    request_bytes = _json_file_bytes(request)
    result_bytes = _json_file_bytes(result)
    manifest = {
        "schema_version": 1,
        "request_id": request["request_id"],
        "drive_handoff_relative_path": _handoff_relative_path(request["request_id"]),
        "coverage_scope": "REQUEST_AND_RESULT_PRE_RECEIPT",
        "covered_files": ["request.json", "result.json"],
        "file_sha256": {
            "request.json": _sha256_bytes(request_bytes),
            "result.json": _sha256_bytes(result_bytes),
        },
    }
    manifest["bundle_manifest_sha256"] = _hash_without_self(manifest, "bundle_manifest_sha256")
    _validate_manifest(manifest)

    finished_iso = _utc_now()
    wall_clock_ms = max(0, int((time.monotonic() - started) * 1000))
    if wall_clock_ms > request["max_wall_minutes"] * 60 * 1000:
        raise ColabBootstrapError("BUDGET_EXHAUSTED: bootstrap exceeded declared wall-time budget")
    receipt = {
        "schema_version": 1,
        "execution_surface": EXECUTION_SURFACE,
        "operation_kind": OPERATION_KIND,
        "execution_profile_id": EXECUTION_PROFILE_ID,
        "request_id": request["request_id"],
        "request_sha256": request["request_sha256"],
        "repository_sha": head,
        "repository_tree_sha": tree_sha,
        "sentinel_manifest_sha256": sentinel_manifest_sha256,
        "python_version": platform_module.python_version(),
        "platform": {
            "system": platform_module.system() or "UNKNOWN",
            "machine": platform_module.machine() or "UNKNOWN",
        },
        "started_at_utc": started_iso,
        "finished_at_utc": finished_iso,
        "wall_clock_ms": wall_clock_ms,
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
        "result_sha256": result["result_sha256"],
        "bundle_manifest_sha256": manifest["bundle_manifest_sha256"],
        "drive_handoff_relative_path": manifest["drive_handoff_relative_path"],
        "completion_state": "COMPLETED",
        "blocker": "NONE",
    }
    receipt["receipt_sha256"] = _hash_without_self(receipt, "receipt_sha256")
    _validate_receipt(receipt)

    output_dir = _resolve_output_dir(Path(drive_root), request["request_id"])
    output_dir.mkdir(parents=True)
    try:
        (output_dir / "request.json").write_bytes(request_bytes)
        (output_dir / "result.json").write_bytes(result_bytes)
        (output_dir / "bundle-manifest.json").write_bytes(_json_file_bytes(manifest))
        (output_dir / "receipt.json").write_bytes(_json_file_bytes(receipt))
    except Exception:
        shutil.rmtree(output_dir, ignore_errors=True)
        raise
    return deepcopy(receipt)


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ColabBootstrapError(f"{path.name} must contain a JSON object")
    return value


def validate_bundle(bundle_dir: Path | str) -> dict[str, Any]:
    root = Path(bundle_dir)
    request_path = root / "request.json"
    result_path = root / "result.json"
    manifest_path = root / "bundle-manifest.json"
    receipt_path = root / "receipt.json"
    for path in (request_path, result_path, manifest_path, receipt_path):
        if not path.is_file():
            raise ColabBootstrapError(f"missing bundle file: {path.name}")

    request = validate_request(_load_json(request_path))
    result = _validate_result(_load_json(result_path))
    manifest = _validate_manifest(_load_json(manifest_path))
    receipt = _validate_receipt(_load_json(receipt_path))
    for payload in (request, result, manifest, receipt):
        assert_sanitized_payload(payload)

    if manifest["file_sha256"]["request.json"] != _sha256_file(request_path):
        raise ColabBootstrapError("request.json file hash mismatch")
    if manifest["file_sha256"]["result.json"] != _sha256_file(result_path):
        raise ColabBootstrapError("result.json file hash mismatch")
    expected_relative = _handoff_relative_path(request["request_id"])
    if manifest["request_id"] != request["request_id"] or manifest["drive_handoff_relative_path"] != expected_relative:
        raise ColabBootstrapError("manifest request/handoff identity mismatch")
    if result["request_sha256"] != request["request_sha256"] or receipt["request_sha256"] != request["request_sha256"]:
        raise ColabBootstrapError("request identity mismatch across bundle")
    if result["repository_sha"] != request["repository_sha"] or receipt["repository_sha"] != request["repository_sha"]:
        raise ColabBootstrapError("repository identity mismatch across bundle")
    if receipt["repository_tree_sha"] != result["repository_tree_sha"]:
        raise ColabBootstrapError("repository tree identity mismatch")
    if receipt["sentinel_manifest_sha256"] != result["sentinel_manifest_sha256"]:
        raise ColabBootstrapError("sentinel identity mismatch")
    if receipt["result_sha256"] != result["result_sha256"]:
        raise ColabBootstrapError("result identity mismatch")
    if receipt["bundle_manifest_sha256"] != manifest["bundle_manifest_sha256"]:
        raise ColabBootstrapError("manifest identity mismatch")
    if receipt["drive_handoff_relative_path"] != expected_relative:
        raise ColabBootstrapError("receipt handoff path mismatch")
    return {
        "schema_version": 1,
        "status": "VALID",
        "request_id": request["request_id"],
        "repository_sha": request["repository_sha"],
        "request_sha256": request["request_sha256"],
        "result_sha256": result["result_sha256"],
        "bundle_manifest_sha256": manifest["bundle_manifest_sha256"],
        "receipt_sha256": receipt["receipt_sha256"],
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run or validate the bounded Colab CPU bootstrap.")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run")
    run.add_argument("--request", required=True)
    run.add_argument("--repo-root", required=True)
    run.add_argument("--drive-root", required=True)
    check = sub.add_parser("validate")
    check.add_argument("--bundle-dir", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "run":
            receipt = run_bootstrap(load_request(args.request), args.repo_root, args.drive_root)
            print(json.dumps({
                "status": receipt["completion_state"],
                "request_id": receipt["request_id"],
                "receipt_sha256": receipt["receipt_sha256"],
                "drive_handoff_relative_path": receipt["drive_handoff_relative_path"],
            }, ensure_ascii=False, sort_keys=True))
        else:
            print(json.dumps(validate_bundle(args.bundle_dir), ensure_ascii=False, sort_keys=True))
        return 0
    except (ColabBootstrapError, ColabBootstrapRequestError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "BLOCKED", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

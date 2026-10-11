from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

PACKAGE_ROOT = Path(__file__).resolve().parents[3]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract
from benchmarks.colab.bootstrap import assert_sanitized_payload
from benchmarks.colab.gpu.request import load_request, validate_request

RECEIPT_SCHEMA = "colab-gpu-admission-receipt-v1.schema.json"
EXECUTION_SURFACE = "COLAB_MANAGED_GPU_AUX"
HANDOFF_PREFIX = Path("nyang-colab/agent-bench/gpu-admission")
PROFILE_PATH = Path(__file__).with_name("execution-profile.json")
LLAMA_RELEASE = "b10516"
LLAMA_SOURCE_DIGEST = "b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9"
LLAMA_SOURCE_REPOSITORY = "https://github.com/ggml-org/llama.cpp.git"
BUILD_PROFILE_ID = "llama-b10516-colab-cuda-v1"
UNKNOWN = "UNKNOWN"


class ColabGpuRuntimeError(ValueError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_without_self(value: dict[str, Any], field: str) -> str:
    base = deepcopy(value)
    base.pop(field, None)
    return canonical_sha256(base)


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ColabGpuRuntimeError(f"{path.name} must contain a JSON object")
    return value


def load_execution_profile() -> dict[str, Any]:
    profile = _load_json(PROFILE_PATH)
    expected_keys = {
        "schema_version", "profile_id", "source", "configure_args",
        "build_target", "parallel_jobs", "smoke_args",
    }
    if set(profile) != expected_keys:
        raise ColabGpuRuntimeError("execution profile fields invalid")
    if profile["schema_version"] != 1 or profile["profile_id"] != BUILD_PROFILE_ID:
        raise ColabGpuRuntimeError("execution profile identity invalid")
    source = profile["source"]
    if source != {
        "repository": LLAMA_SOURCE_REPOSITORY,
        "release": LLAMA_RELEASE,
        "source_digest": LLAMA_SOURCE_DIGEST,
    }:
        raise ColabGpuRuntimeError("execution profile source identity mismatch")
    if profile["configure_args"] != [
        "-DGGML_CUDA=ON",
        "-DLLAMA_CURL=OFF",
        "-DBUILD_SHARED_LIBS=ON",
        "-DCMAKE_BUILD_TYPE=Release",
    ]:
        raise ColabGpuRuntimeError("execution profile configure args drifted")
    if profile["build_target"] != "llama-server" or profile["parallel_jobs"] != 2:
        raise ColabGpuRuntimeError("execution profile build contract drifted")
    if profile["smoke_args"] != ["--version"]:
        raise ColabGpuRuntimeError("execution profile smoke contract drifted")
    assert_sanitized_payload(profile)
    return deepcopy(profile)


def execution_profile_sha256() -> str:
    return canonical_sha256(load_execution_profile())


def _run(
    command: list[str],
    *,
    cwd: Path | None = None,
    timeout: int,
) -> str:
    try:
        proc = subprocess.run(
            command,
            cwd=None if cwd is None else str(cwd),
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=max(1, timeout),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ColabGpuRuntimeError(f"runtime command failed: {command[0]}: {exc}") from exc
    if proc.returncode != 0:
        detail = (proc.stdout or f"exit={proc.returncode}").strip().replace("\n", " ")[:400]
        raise ColabGpuRuntimeError(f"runtime command failed: {command[0]}: {detail}")
    return proc.stdout


def _git(repo_root: Path, *args: str) -> str:
    return _run(["git", "-C", str(repo_root), *args], timeout=30)


def _remaining_seconds(deadline: float, cap: int | None = None) -> int:
    remaining = int(deadline - time.monotonic())
    if remaining <= 0:
        raise ColabGpuRuntimeError("BUDGET_EXHAUSTED: GPU runtime smoke exceeded wall-time budget")
    return remaining if cap is None else min(remaining, cap)


def _admit_repository(repo_root: Path, request: dict[str, Any]) -> tuple[str, str]:
    root = repo_root.resolve()
    if not root.is_dir():
        raise ColabGpuRuntimeError("repository root missing")
    head = _git(root, "rev-parse", "HEAD").strip()
    if head != request["repository_sha"]:
        raise ColabGpuRuntimeError(
            f"BLOCKED_REPO_SHA_MISMATCH: requested {request['repository_sha']} observed {head}"
        )
    status = _git(root, "status", "--porcelain", "--untracked-files=all")
    if status.strip():
        raise ColabGpuRuntimeError("BLOCKED_DIRTY_REPOSITORY: GPU smoke checkout must be clean")
    tree_sha = _git(root, "rev-parse", "HEAD^{tree}").strip()
    return head, tree_sha


def observe_gpu() -> dict[str, Any]:
    absent = {
        "gpu_present": False,
        "gpu_count": "0",
        "accelerator_name": UNKNOWN,
        "total_vram_mib": UNKNOWN,
        "driver_version": UNKNOWN,
        "cuda_driver_version": UNKNOWN,
        "cuda_toolkit_version": UNKNOWN,
    }
    try:
        query = _run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,driver_version",
                "--format=csv,noheader,nounits",
            ],
            timeout=15,
        )
    except ColabGpuRuntimeError:
        return absent
    lines = [line.strip() for line in query.splitlines() if line.strip()]
    if not lines:
        return absent
    first = [part.strip() for part in lines[0].split(",", 2)]
    if len(first) != 3:
        raise ColabGpuRuntimeError("GPU observation output shape invalid")
    cuda_driver = UNKNOWN
    try:
        summary = _run(["nvidia-smi"], timeout=15)
        match = re.search(r"CUDA Version:\s*([0-9.]+)", summary)
        if match:
            cuda_driver = match.group(1)
    except ColabGpuRuntimeError:
        pass
    cuda_toolkit = UNKNOWN
    try:
        nvcc = _run(["nvcc", "--version"], timeout=15)
        match = re.search(r"release\s+([0-9.]+)", nvcc)
        if match:
            cuda_toolkit = match.group(1)
    except ColabGpuRuntimeError:
        pass
    return {
        "gpu_present": True,
        "gpu_count": str(len(lines)),
        "accelerator_name": first[0] or UNKNOWN,
        "total_vram_mib": first[1] or UNKNOWN,
        "driver_version": first[2] or UNKNOWN,
        "cuda_driver_version": cuda_driver,
        "cuda_toolkit_version": cuda_toolkit,
    }


def _assert_source_identity(observed_digest: str) -> None:
    if observed_digest != LLAMA_SOURCE_DIGEST:
        raise ColabGpuRuntimeError(
            "BLOCKED_RUNTIME_IDENTITY_MISMATCH: pinned llama.cpp source digest mismatch"
        )


def _bounded_smoke_excerpt(value: str) -> str:
    text = " ".join(value.split())
    return text[:240] if text else UNKNOWN


def build_pinned_runtime(scratch_root: Path, deadline: float) -> dict[str, Any]:
    profile = load_execution_profile()
    source_dir = scratch_root / "llama.cpp"
    build_dir = scratch_root / "build"
    source_dir.mkdir(parents=True)
    _run(["git", "init", str(source_dir)], timeout=_remaining_seconds(deadline, 30))
    _run(
        ["git", "-C", str(source_dir), "remote", "add", "origin", profile["source"]["repository"]],
        timeout=_remaining_seconds(deadline, 30),
    )
    _run(
        [
            "git", "-C", str(source_dir), "fetch", "--depth", "1", "origin",
            f"refs/tags/{profile['source']['release']}",
        ],
        timeout=_remaining_seconds(deadline, 180),
    )
    _run(
        ["git", "-C", str(source_dir), "checkout", "--detach", "FETCH_HEAD"],
        timeout=_remaining_seconds(deadline, 30),
    )
    observed_source = _run(
        ["git", "-C", str(source_dir), "rev-parse", "HEAD"],
        timeout=_remaining_seconds(deadline, 30),
    ).strip()
    _assert_source_identity(observed_source)
    _run(
        ["cmake", "-S", str(source_dir), "-B", str(build_dir), *profile["configure_args"]],
        timeout=_remaining_seconds(deadline, 180),
    )
    _run(
        [
            "cmake", "--build", str(build_dir), "--config", "Release",
            "--parallel", str(profile["parallel_jobs"]), "--target", profile["build_target"],
        ],
        timeout=_remaining_seconds(deadline),
    )
    server = build_dir / "bin" / "llama-server"
    if not server.is_file():
        raise ColabGpuRuntimeError("BLOCKED_RUNTIME_IDENTITY_MISMATCH: llama-server binary missing")
    backend_candidates = sorted(
        path for path in build_dir.rglob("libggml-cuda.so") if path.is_file()
    )
    if len(backend_candidates) != 1:
        raise ColabGpuRuntimeError(
            "BLOCKED_RUNTIME_IDENTITY_MISMATCH: expected one materialized libggml-cuda.so"
        )
    backend = backend_candidates[0]
    smoke = _run(
        [str(server), *profile["smoke_args"]],
        timeout=_remaining_seconds(deadline, 60),
    )
    return {
        "server_binary_sha256": _sha256_file(server),
        "cuda_backend_artifact": backend.name,
        "cuda_backend_sha256": _sha256_file(backend),
        "smoke_state": "RUNNABLE",
        "smoke_excerpt": _bounded_smoke_excerpt(smoke),
    }


def _blocked_runtime() -> dict[str, str]:
    return {
        "server_binary_sha256": UNKNOWN,
        "cuda_backend_artifact": UNKNOWN,
        "cuda_backend_sha256": UNKNOWN,
        "smoke_state": "NOT_RUN",
        "smoke_excerpt": UNKNOWN,
    }


def _handoff_relative_path(request_id: str) -> str:
    return (HANDOFF_PREFIX / request_id).as_posix()


def _resolve_output_dir(drive_root: Path, request_id: str) -> Path:
    root = drive_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    target = (root / HANDOFF_PREFIX / request_id).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ColabGpuRuntimeError("drive handoff escaped configured drive root") from exc
    if target.exists():
        raise ColabGpuRuntimeError("drive handoff target already exists")
    return target


def _validate_result(value: dict[str, Any]) -> dict[str, Any]:
    required = {
        "schema_version", "request_id", "request_sha256", "repository_sha",
        "repository_tree_sha", "resource_class", "gpu_admission_state", "hardware",
        "llama_source", "build_profile_id", "build_profile_sha256", "runtime",
        "model_call_count", "hosted_ai_call_count", "status", "result_sha256",
    }
    if set(value) != required:
        raise ColabGpuRuntimeError("result fields invalid")
    if value["schema_version"] != 1 or value["resource_class"] != "GPU_REQUIRED":
        raise ColabGpuRuntimeError("result identity invalid")
    if value["model_call_count"] != 0 or value["hosted_ai_call_count"] != 0:
        raise ColabGpuRuntimeError("CAGB-2 result must record zero AI calls")
    if value["llama_source"] != load_execution_profile()["source"]:
        raise ColabGpuRuntimeError("result llama source identity mismatch")
    if value["build_profile_id"] != BUILD_PROFILE_ID:
        raise ColabGpuRuntimeError("result build profile id mismatch")
    if value["build_profile_sha256"] != execution_profile_sha256():
        raise ColabGpuRuntimeError("result build profile hash mismatch")
    gpu_present = value["hardware"].get("gpu_present")
    if value["gpu_admission_state"] == "GPU_PRESENT":
        if gpu_present is not True or value["status"] != "GPU_RUNTIME_READY":
            raise ColabGpuRuntimeError("GPU-present result state inconsistent")
        runtime = value["runtime"]
        if runtime.get("smoke_state") != "RUNNABLE":
            raise ColabGpuRuntimeError("GPU runtime is not runnable")
        for field in ("server_binary_sha256", "cuda_backend_sha256"):
            if re.fullmatch(r"[0-9a-f]{64}", str(runtime.get(field, ""))) is None:
                raise ColabGpuRuntimeError(f"{field} must be a lowercase SHA-256")
        if runtime.get("cuda_backend_artifact") != "libggml-cuda.so":
            raise ColabGpuRuntimeError("CUDA backend artifact identity invalid")
    elif value["gpu_admission_state"] == "GPU_ABSENT":
        if gpu_present is not False or value["status"] != "BLOCKED_NO_ACCELERATOR":
            raise ColabGpuRuntimeError("GPU-absent result state inconsistent")
        if value["runtime"] != _blocked_runtime():
            raise ColabGpuRuntimeError("GPU-absent result must not contain runtime artifacts")
    else:
        raise ColabGpuRuntimeError("gpu_admission_state invalid")
    if _hash_without_self(value, "result_sha256") != value["result_sha256"]:
        raise ColabGpuRuntimeError("result_sha256 mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def _validate_manifest(value: dict[str, Any]) -> dict[str, Any]:
    required = {
        "schema_version", "request_id", "drive_handoff_relative_path",
        "coverage_scope", "covered_files", "file_sha256", "bundle_manifest_sha256",
    }
    if set(value) != required:
        raise ColabGpuRuntimeError("bundle manifest fields invalid")
    if value["schema_version"] != 1:
        raise ColabGpuRuntimeError("bundle manifest schema invalid")
    expected_files = ["execution-profile.json", "request.json", "result.json"]
    if value["coverage_scope"] != "REQUEST_RESULT_PROFILE_PRE_RECEIPT":
        raise ColabGpuRuntimeError("bundle manifest coverage scope invalid")
    if value["covered_files"] != expected_files or set(value["file_sha256"]) != set(expected_files):
        raise ColabGpuRuntimeError("bundle manifest file coverage invalid")
    if _hash_without_self(value, "bundle_manifest_sha256") != value["bundle_manifest_sha256"]:
        raise ColabGpuRuntimeError("bundle manifest hash mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def _validate_receipt(value: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_contract(value, RECEIPT_SCHEMA)
    except ContractValidationError as exc:
        raise ColabGpuRuntimeError(str(exc)) from exc
    if value["wall_clock_ms"] < 0:
        raise ColabGpuRuntimeError("wall_clock_ms must be non-negative")
    if value["build_profile_sha256"] != execution_profile_sha256():
        raise ColabGpuRuntimeError("receipt build profile hash mismatch")
    if _hash_without_self(value, "receipt_sha256") != value["receipt_sha256"]:
        raise ColabGpuRuntimeError("receipt_sha256 mismatch")
    assert_sanitized_payload(value)
    return deepcopy(value)


def run_gpu_runtime_smoke(
    request: dict[str, Any],
    repo_root: Path | str,
    drive_root: Path | str,
    *,
    observe_gpu_fn: Callable[[], dict[str, Any]] = observe_gpu,
    build_runtime_fn: Callable[[Path, float], dict[str, Any]] = build_pinned_runtime,
) -> dict[str, Any]:
    request = validate_request(request)
    assert_sanitized_payload(request)
    started_iso = _utc_now()
    started = time.monotonic()
    deadline = started + request["max_wall_minutes"] * 60
    head, tree_sha = _admit_repository(Path(repo_root), request)
    hardware = observe_gpu_fn()
    if set(hardware) != {
        "gpu_present", "gpu_count", "accelerator_name", "total_vram_mib",
        "driver_version", "cuda_driver_version", "cuda_toolkit_version",
    }:
        raise ColabGpuRuntimeError("hardware observation fields invalid")
    assert_sanitized_payload(hardware)
    if hardware["gpu_present"] is False:
        gpu_state = "GPU_ABSENT"
        status = "BLOCKED_NO_ACCELERATOR"
        runtime = _blocked_runtime()
    elif hardware["gpu_present"] is True:
        gpu_state = "GPU_PRESENT"
        with tempfile.TemporaryDirectory(prefix="cagb2-gpu-") as temporary:
            runtime = build_runtime_fn(Path(temporary), deadline)
        gpu_state = "GPU_PRESENT"
        status = "GPU_RUNTIME_READY"
    else:
        raise ColabGpuRuntimeError("gpu_present must be boolean")
    profile = load_execution_profile()
    profile_sha = canonical_sha256(profile)
    result = {
        "schema_version": 1,
        "request_id": request["request_id"],
        "request_sha256": request["request_sha256"],
        "repository_sha": head,
        "repository_tree_sha": tree_sha,
        "resource_class": request["resource_class"],
        "gpu_admission_state": gpu_state,
        "hardware": hardware,
        "llama_source": profile["source"],
        "build_profile_id": profile["profile_id"],
        "build_profile_sha256": profile_sha,
        "runtime": runtime,
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
        "status": status,
    }
    result["result_sha256"] = _hash_without_self(result, "result_sha256")
    _validate_result(result)
    request_bytes = _json_bytes(request)
    result_bytes = _json_bytes(result)
    profile_bytes = _json_bytes(profile)
    manifest = {
        "schema_version": 1,
        "request_id": request["request_id"],
        "drive_handoff_relative_path": _handoff_relative_path(request["request_id"]),
        "coverage_scope": "REQUEST_RESULT_PROFILE_PRE_RECEIPT",
        "covered_files": ["execution-profile.json", "request.json", "result.json"],
        "file_sha256": {
            "execution-profile.json": _sha256_bytes(profile_bytes),
            "request.json": _sha256_bytes(request_bytes),
            "result.json": _sha256_bytes(result_bytes),
        },
    }
    manifest["bundle_manifest_sha256"] = _hash_without_self(manifest, "bundle_manifest_sha256")
    _validate_manifest(manifest)
    finished_iso = _utc_now()
    wall_clock_ms = max(0, int((time.monotonic() - started) * 1000))
    if time.monotonic() > deadline:
        raise ColabGpuRuntimeError("BUDGET_EXHAUSTED: GPU runtime smoke exceeded wall-time budget")
    completion_state = "COMPLETED" if status == "GPU_RUNTIME_READY" else "BLOCKED_CAPABILITY"
    blocker = "NONE" if status == "GPU_RUNTIME_READY" else "BLOCKED_NO_ACCELERATOR"
    receipt = {
        "schema_version": 1,
        "execution_surface": EXECUTION_SURFACE,
        "operation_kind": request["operation_kind"],
        "execution_profile_id": request["execution_profile_id"],
        "resource_class": request["resource_class"],
        "request_id": request["request_id"],
        "request_sha256": request["request_sha256"],
        "repository_sha": head,
        "repository_tree_sha": tree_sha,
        "gpu_admission_state": gpu_state,
        "hardware": hardware,
        "llama_source": profile["source"],
        "build_profile_id": profile["profile_id"],
        "build_profile_sha256": profile_sha,
        "runtime": runtime,
        "started_at_utc": started_iso,
        "finished_at_utc": finished_iso,
        "wall_clock_ms": wall_clock_ms,
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
        "result_sha256": result["result_sha256"],
        "bundle_manifest_sha256": manifest["bundle_manifest_sha256"],
        "drive_handoff_relative_path": manifest["drive_handoff_relative_path"],
        "completion_state": completion_state,
        "blocker": blocker,
    }
    receipt["receipt_sha256"] = _hash_without_self(receipt, "receipt_sha256")
    _validate_receipt(receipt)
    output_dir = _resolve_output_dir(Path(drive_root), request["request_id"])
    output_dir.mkdir(parents=True)
    try:
        (output_dir / "request.json").write_bytes(request_bytes)
        (output_dir / "result.json").write_bytes(result_bytes)
        (output_dir / "execution-profile.json").write_bytes(profile_bytes)
        (output_dir / "bundle-manifest.json").write_bytes(_json_bytes(manifest))
        (output_dir / "receipt.json").write_bytes(_json_bytes(receipt))
    except Exception:
        shutil.rmtree(output_dir, ignore_errors=True)
        raise
    return deepcopy(receipt)


def validate_bundle(bundle_dir: Path | str) -> dict[str, Any]:
    root = Path(bundle_dir)
    paths = {
        name: root / name
        for name in (
            "request.json", "result.json", "execution-profile.json",
            "bundle-manifest.json", "receipt.json",
        )
    }
    for path in paths.values():
        if not path.is_file():
            raise ColabGpuRuntimeError(f"missing bundle file: {path.name}")
    request = validate_request(_load_json(paths["request.json"]))
    result = _validate_result(_load_json(paths["result.json"]))
    profile = _load_json(paths["execution-profile.json"])
    if profile != load_execution_profile():
        raise ColabGpuRuntimeError("bundle execution profile mismatch")
    manifest = _validate_manifest(_load_json(paths["bundle-manifest.json"]))
    receipt = _validate_receipt(_load_json(paths["receipt.json"]))
    for payload in (request, result, profile, manifest, receipt):
        assert_sanitized_payload(payload)
    for name in manifest["covered_files"]:
        if manifest["file_sha256"][name] != _sha256_file(paths[name]):
            raise ColabGpuRuntimeError(f"{name} file hash mismatch")
    expected_relative = _handoff_relative_path(request["request_id"])
    if manifest["drive_handoff_relative_path"] != expected_relative:
        raise ColabGpuRuntimeError("bundle handoff path mismatch")
    if receipt["drive_handoff_relative_path"] != expected_relative:
        raise ColabGpuRuntimeError("receipt handoff path mismatch")
    if result["request_sha256"] != request["request_sha256"]:
        raise ColabGpuRuntimeError("result request hash mismatch")
    if receipt["request_sha256"] != request["request_sha256"]:
        raise ColabGpuRuntimeError("receipt request hash mismatch")
    if receipt["result_sha256"] != result["result_sha256"]:
        raise ColabGpuRuntimeError("receipt result hash mismatch")
    if receipt["bundle_manifest_sha256"] != manifest["bundle_manifest_sha256"]:
        raise ColabGpuRuntimeError("receipt manifest hash mismatch")
    if receipt["repository_sha"] != result["repository_sha"]:
        raise ColabGpuRuntimeError("repository identity mismatch")
    if receipt["gpu_admission_state"] != result["gpu_admission_state"]:
        raise ColabGpuRuntimeError("GPU admission state mismatch")
    if receipt["runtime"] != result["runtime"] or receipt["hardware"] != result["hardware"]:
        raise ColabGpuRuntimeError("receipt runtime/hardware mismatch")
    expected_completion = "COMPLETED" if result["status"] == "GPU_RUNTIME_READY" else "BLOCKED_CAPABILITY"
    expected_blocker = "NONE" if result["status"] == "GPU_RUNTIME_READY" else "BLOCKED_NO_ACCELERATOR"
    if receipt["completion_state"] != expected_completion or receipt["blocker"] != expected_blocker:
        raise ColabGpuRuntimeError("receipt completion state inconsistent")
    return {
        "status": "VALID",
        "request_id": request["request_id"],
        "repository_sha": receipt["repository_sha"],
        "gpu_admission_state": receipt["gpu_admission_state"],
        "completion_state": receipt["completion_state"],
        "blocker": receipt["blocker"],
        "receipt_sha256": receipt["receipt_sha256"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run or validate bounded CAGB-2 GPU runtime smoke.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--request", required=True)
    run_parser.add_argument("--repo-root", required=True)
    run_parser.add_argument("--drive-root", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--bundle-dir", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "run":
            receipt = run_gpu_runtime_smoke(
                load_request(args.request),
                args.repo_root,
                args.drive_root,
            )
            print(json.dumps({
                "completion_state": receipt["completion_state"],
                "blocker": receipt["blocker"],
                "receipt_sha256": receipt["receipt_sha256"],
            }, sort_keys=True))
        else:
            print(json.dumps(validate_bundle(args.bundle_dir), sort_keys=True))
        return 0
    except (ColabGpuRuntimeError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

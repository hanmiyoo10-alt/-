from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract

CANDIDATE_SCHEMA = "model-family-smoke-candidate-v1.schema.json"
RECEIPT_SCHEMA = "model-family-smoke-receipt-v1.schema.json"
DEFAULT_CANDIDATE_PATH = MODULE_DIR / "candidates" / "ministral-3-3b-instruct-2512-q4_k_m.json"

LLAMA_RUNTIME = {
    "release": "b10516",
    "source_digest": "b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9",
    "artifact": "llama-b10516-bin-ubuntu-x64.tar.gz",
    "artifact_sha256": "f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35",
    "threads": 4,
    "gpu_layers": 0,
}
GENERATION = {"temperature": 0, "seed": 42, "max_tokens": 32}
MODEL_CREDENTIAL_ENV_NAMES = (
    "HF_TOKEN",
    "HUGGING_FACE_HUB_TOKEN",
    "HUGGINGFACEHUB_API_TOKEN",
)

EXPECTED_CANDIDATE: dict[str, Any] = {
    "schema_version": 1,
    "candidate_id": "o4b-ministral-3-3b-instruct-2512-q4_k_m-v1",
    "profile_id": "ministral-3-3b-instruct-2512-q4_k_m",
    "local_model_id": "ministral-3-3b-instruct-2512-q4_k_m-local",
    "family": "ministral-3",
    "repository": "mistralai/Ministral-3-3B-Instruct-2512-GGUF",
    "revision": "fc774f009f0c62a186f48e870fd6295b36f63779",
    "file": "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf",
    "size_bytes": 2147023008,
    "sha256": "9ed150d4367e68df0ac8e1540f6ddc65b42d0ee26378329d1ecbca60f93fc5f8",
    "license": {
        "id": "apache-2.0",
        "status": "verified_metadata",
        "source": "https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-GGUF",
    },
    "access": {
        "target_class": "public_unauthenticated_https",
        "proof_status": "pending_smoke",
    },
    "execution_surface": "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS",
}


class ModelFamilySmokeError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    target = Path(path)
    try:
        value = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ModelFamilySmokeError(f"cannot read JSON {target}: {exc}") from exc
    if not isinstance(value, dict):
        raise ModelFamilySmokeError(f"JSON object required: {target}")
    return value


def _sha256_file(path: Path | str) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_candidate(path: Path | str = DEFAULT_CANDIDATE_PATH) -> dict[str, Any]:
    data = _read_json(path)
    try:
        validate_contract(data, CANDIDATE_SCHEMA)
    except ContractValidationError as exc:
        raise ModelFamilySmokeError(str(exc)) from exc
    if data != EXPECTED_CANDIDATE:
        raise ModelFamilySmokeError("candidate manifest differs from frozen O4-B acceptance identity")
    return data


def candidate_sha256(candidate: dict[str, Any] | None = None) -> str:
    value = load_candidate() if candidate is None else candidate
    if value != EXPECTED_CANDIDATE:
        raise ModelFamilySmokeError("cannot hash non-frozen candidate")
    return canonical_sha256(value)


def candidate_download_url(candidate: dict[str, Any] | None = None) -> str:
    value = load_candidate() if candidate is None else candidate
    return (
        "https://huggingface.co/"
        + value["repository"]
        + "/resolve/"
        + value["revision"]
        + "/"
        + value["file"]
        + "?download=true"
    )


def model_credential_env_present() -> bool:
    return any(bool(os.environ.get(name)) for name in MODEL_CREDENTIAL_ENV_NAMES)


def _response_semantics(response: dict[str, Any]) -> tuple[str, bool]:
    choices = response.get("choices")
    if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
        return "", False
    choice = choices[0]
    finish = choice.get("finish_reason")
    message = choice.get("message")
    if not isinstance(message, dict):
        return str(finish or ""), False
    content = message.get("content")
    return str(finish or ""), isinstance(content, str) and bool(content.strip())


def receipt_sha256(receipt: dict[str, Any]) -> str:
    base = deepcopy(receipt)
    base.pop("receipt_sha256", None)
    return canonical_sha256(base)


def validate_receipt(receipt: dict[str, Any]) -> None:
    try:
        validate_contract(receipt, RECEIPT_SCHEMA)
    except ContractValidationError as exc:
        raise ModelFamilySmokeError(str(exc)) from exc
    if receipt["workflow_run_id"] < 1 or receipt["workflow_run_attempt"] < 1:
        raise ModelFamilySmokeError("workflow run identity must be positive")
    if receipt["candidate_sha256"] != candidate_sha256(EXPECTED_CANDIDATE):
        raise ModelFamilySmokeError("candidate digest mismatch")
    candidate = receipt["candidate"]
    if candidate != {
        "profile_id": EXPECTED_CANDIDATE["profile_id"],
        "repository": EXPECTED_CANDIDATE["repository"],
        "revision": EXPECTED_CANDIDATE["revision"],
        "file": EXPECTED_CANDIDATE["file"],
        "expected_size_bytes": EXPECTED_CANDIDATE["size_bytes"],
        "expected_sha256": EXPECTED_CANDIDATE["sha256"],
    }:
        raise ModelFamilySmokeError("receipt candidate identity mismatch")
    download = receipt["download"]
    if download["measured_size_bytes"] != EXPECTED_CANDIDATE["size_bytes"]:
        raise ModelFamilySmokeError("downloaded model size mismatch")
    if download["measured_sha256"] != EXPECTED_CANDIDATE["sha256"]:
        raise ModelFamilySmokeError("downloaded model SHA256 mismatch")
    if download["url_uses_frozen_revision"] is not True:
        raise ModelFamilySmokeError("download URL was not frozen-revision scoped")
    if receipt["license"] != EXPECTED_CANDIDATE["license"]:
        raise ModelFamilySmokeError("license metadata mismatch")
    if receipt["access"]["credential_env_present"] is not False:
        raise ModelFamilySmokeError("model credential environment was present")
    if receipt["runtime"] | {} != receipt["runtime"]:
        raise ModelFamilySmokeError("runtime malformed")
    for key, expected in LLAMA_RUNTIME.items():
        if receipt["runtime"].get(key) != expected:
            raise ModelFamilySmokeError(f"runtime {key} mismatch")
    if not receipt["runtime"]["runtime_version"].strip():
        raise ModelFamilySmokeError("runtime version missing")
    if receipt["generation"] != GENERATION:
        raise ModelFamilySmokeError("generation settings mismatch")
    if receipt["transport_result"] != {
        "http_status": 200,
        "finish_reason": "stop",
        "content_nonempty": True,
    }:
        raise ModelFamilySmokeError("transport result is not a completed smoke")
    if receipt["local_model_call_count"] != 1 or receipt["hosted_ai_call_count"] != 0:
        raise ModelFamilySmokeError("call counts violate O4-B smoke boundary")
    if receipt["receipt_sha256"] != receipt_sha256(receipt):
        raise ModelFamilySmokeError("receipt SHA256 mismatch")
    expected_status = "PASS"
    if receipt["status"] != expected_status:
        raise ModelFamilySmokeError("receipt status mismatch")


def build_receipt(
    *,
    candidate_path: Path | str,
    model_path: Path | str,
    runtime_version_path: Path | str,
    prompt_path: Path | str,
    response_path: Path | str,
    http_status: int,
    workflow_repository_sha: str,
    workflow_run_id: int,
    workflow_run_attempt: int,
) -> dict[str, Any]:
    candidate = load_candidate(candidate_path)
    model_file = Path(model_path)
    prompt_file = Path(prompt_path)
    response_file = Path(response_path)
    runtime_version = Path(runtime_version_path).read_text(encoding="utf-8").strip()
    response_bytes = response_file.read_bytes()
    response = json.loads(response_bytes.decode("utf-8"))
    if not isinstance(response, dict):
        raise ModelFamilySmokeError("response JSON object required")
    finish_reason, content_nonempty = _response_semantics(response)
    download_url = candidate_download_url(candidate)
    receipt: dict[str, Any] = {
        "schema_version": 1,
        "status": "PASS",
        "workflow_repository_sha": workflow_repository_sha,
        "workflow_run_id": int(workflow_run_id),
        "workflow_run_attempt": int(workflow_run_attempt),
        "candidate_sha256": candidate_sha256(candidate),
        "candidate": {
            "profile_id": candidate["profile_id"],
            "repository": candidate["repository"],
            "revision": candidate["revision"],
            "file": candidate["file"],
            "expected_size_bytes": candidate["size_bytes"],
            "expected_sha256": candidate["sha256"],
        },
        "download": {
            "measured_size_bytes": model_file.stat().st_size,
            "measured_sha256": _sha256_file(model_file),
            "url_uses_frozen_revision": f"/resolve/{candidate['revision']}/" in download_url,
        },
        "license": deepcopy(candidate["license"]),
        "access": {
            "class": candidate["access"]["target_class"],
            "proof_mode": "fresh_github_hosted_runner_no_model_credentials",
            "credential_env_present": model_credential_env_present(),
        },
        "runtime": {**LLAMA_RUNTIME, "runtime_version": runtime_version},
        "generation": deepcopy(GENERATION),
        "transport_result": {
            "http_status": int(http_status),
            "finish_reason": finish_reason,
            "content_nonempty": content_nonempty,
        },
        "local_model_call_count": 1,
        "hosted_ai_call_count": 0,
        "prompt_sha256": _sha256_bytes(prompt_file.read_bytes()),
        "response_sha256": _sha256_bytes(response_bytes),
        "receipt_sha256": "0" * 64,
    }
    receipt["receipt_sha256"] = receipt_sha256(receipt)
    validate_receipt(receipt)
    return receipt


def _write_json(path: Path | str, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    resolve = sub.add_parser("resolve")
    resolve.add_argument("--candidate", default=str(DEFAULT_CANDIDATE_PATH))
    resolve.add_argument("--output", required=True)

    receipt_parser = sub.add_parser("receipt")
    receipt_parser.add_argument("--candidate", default=str(DEFAULT_CANDIDATE_PATH))
    receipt_parser.add_argument("--model-path", required=True)
    receipt_parser.add_argument("--runtime-version", required=True)
    receipt_parser.add_argument("--prompt", required=True)
    receipt_parser.add_argument("--response", required=True)
    receipt_parser.add_argument("--http-status", required=True, type=int)
    receipt_parser.add_argument("--workflow-repository-sha", required=True)
    receipt_parser.add_argument("--workflow-run-id", required=True, type=int)
    receipt_parser.add_argument("--workflow-run-attempt", required=True, type=int)
    receipt_parser.add_argument("--output", required=True)

    args = parser.parse_args(argv)
    try:
        if args.command == "resolve":
            candidate = load_candidate(args.candidate)
            _write_json(
                args.output,
                {
                    "candidate": candidate,
                    "candidate_sha256": candidate_sha256(candidate),
                    "download_url": candidate_download_url(candidate),
                },
            )
            return 0
        receipt = build_receipt(
            candidate_path=args.candidate,
            model_path=args.model_path,
            runtime_version_path=args.runtime_version,
            prompt_path=args.prompt,
            response_path=args.response,
            http_status=args.http_status,
            workflow_repository_sha=args.workflow_repository_sha,
            workflow_run_id=args.workflow_run_id,
            workflow_run_attempt=args.workflow_run_attempt,
        )
        _write_json(args.output, receipt)
        print("O4B_SMOKE_STATUS:" + receipt["status"])
        print("O4B_SMOKE_RECEIPT_SHA256:" + receipt["receipt_sha256"])
        return 0
    except (OSError, UnicodeError, json.JSONDecodeError, ModelFamilySmokeError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

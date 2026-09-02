from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from copy import deepcopy
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.score_role_output import (
    SCORING_POLICY_ID,
    SCORING_POLICY_SHA256,
    result_sha256,
    score_role_output,
    validate_case,
    validate_result,
)
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from registry import load_model_registry, validate_model_registry_data
from roles.scout import ScoutContractError, build_scout_prompt, prompt_sha256, scout_response_schema, validate_scout_wire
from runtime.generation import LLAMA_RUNTIME, scout_generation
from runtime.local_server import post_chat_completion

CASE_PATH = MODULE_DIR / "fixtures" / "o4c-scout-service-tier-fidelity-v1.case.json"
EVIDENCE_PATH = MODULE_DIR / "evidence" / "o4c-scout-service-tier-fidelity-v1.evidence.json"
O4C_MODEL_PROFILE_IDS = (
    "qwen2.5-3b-instruct-q4_k_m",
    "ministral-3-3b-instruct-2512-q4_k_m",
)


class O4CScoutBenchmarkError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    target = Path(path)
    value = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4CScoutBenchmarkError(f"JSON object required: {target}")
    return value


def _write_json(path: Path | str, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_case_and_evidence(
    case_path: Path | str = CASE_PATH,
    evidence_path: Path | str = EVIDENCE_PATH,
) -> tuple[dict[str, Any], dict[str, Any]]:
    case = validate_case(_read_json(case_path))
    evidence = _read_json(evidence_path)
    validate_evidence_package(evidence)
    if case["case_id"] != "o4c-scout-service-tier-fidelity-v1" or case["role"] != "scout":
        raise O4CScoutBenchmarkError("unexpected O4-C Scout fixture identity")
    digest = evidence_package_sha256(evidence)
    if digest != case["evidence_sha256"]:
        raise O4CScoutBenchmarkError("EvidencePackage digest does not bind frozen case")
    if set(evidence_source_refs(evidence)) != set(case["known_source_refs"]):
        raise O4CScoutBenchmarkError("known source refs do not equal frozen EvidencePackage refs")
    return case, evidence


def benchmark_model_profile(profile_id: str, registry_data: dict[str, Any] | None = None) -> dict[str, Any]:
    if profile_id not in O4C_MODEL_PROFILE_IDS:
        raise O4CScoutBenchmarkError("model profile is outside frozen O4-C matrix")
    registry = load_model_registry() if registry_data is None else registry_data
    validate_model_registry_data(registry)
    matches = [item for item in registry["profiles"] if item["profile_id"] == profile_id]
    if len(matches) != 1:
        raise O4CScoutBenchmarkError("frozen O4-C model profile missing or duplicated")
    profile = matches[0]
    if profile.get("enabled") is not True:
        raise O4CScoutBenchmarkError("O4-C model profile is disabled")
    if profile.get("execution_surface") != "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS":
        raise O4CScoutBenchmarkError("O4-C model profile execution surface drifted")
    if profile.get("access", {}).get("class") != "public_unauthenticated_https":
        raise O4CScoutBenchmarkError("O4-C model profile access class drifted")
    return deepcopy(profile)


def scout_wire_to_atoms(content: str, evidence: dict[str, Any]) -> list[dict[str, Any]]:
    parsed = validate_scout_wire(content, evidence)
    source_refs: set[str] = set()
    authority_pairs: set[tuple[str, str]] = set()
    for record in parsed["r"]:
        if record["k"] == "s":
            source_refs.update(record["r"])
        elif record["k"] == "a":
            authority_pairs.update((record["v"], ref) for ref in record["r"])
    atoms: list[dict[str, Any]] = [
        {"kind": "source_ref", "ref": ref}
        for ref in sorted(source_refs)
    ]
    atoms.extend(
        {"kind": "authority", "authority_class": authority_class, "refs": [ref]}
        for authority_class, ref in sorted(authority_pairs)
    )
    return atoms


def _parse_state(content: str, evidence: dict[str, Any]) -> tuple[bool, bool, dict[str, Any] | None, list[dict[str, Any]]]:
    try:
        parsed_json = json.loads(content)
        parse_valid = isinstance(parsed_json, dict)
    except json.JSONDecodeError:
        return False, False, None, []
    if not parse_valid:
        return False, False, None, []
    try:
        validated = validate_scout_wire(content, evidence)
    except ScoutContractError:
        return True, False, None, []
    return True, True, validated, scout_wire_to_atoms(content, evidence)


def _usage_int(envelope: dict[str, Any], key: str) -> int | None:
    usage = envelope.get("usage")
    if not isinstance(usage, dict):
        return None
    value = usage.get(key)
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def build_result(
    *,
    case: dict[str, Any],
    evidence: dict[str, Any],
    profile: dict[str, Any],
    runtime_version: str,
    runtime_binary_sha256: str,
    prompt: str,
    content: str,
    finish_reason: str,
    envelope: dict[str, Any],
    wall_clock_ms: int,
) -> tuple[dict[str, Any], dict[str, Any] | None, dict[str, Any]]:
    parse_valid, contract_valid, validated_wire, atoms = _parse_state(content, evidence)
    if finish_reason == "stop" and parse_valid and contract_valid:
        execution_status = "COMPLETED"
    elif finish_reason != "stop":
        execution_status = "EXECUTION_INCOMPLETE"
    else:
        execution_status = "INVALID"

    response_sha = _sha256_bytes(content.encode("utf-8"))
    receipt = {
        "schema_version": 1,
        "case_id": case["case_id"],
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "model_profile_id": profile["profile_id"],
        "model_sha256": profile["sha256"],
        "runtime_release": LLAMA_RUNTIME["release"],
        "runtime_version": runtime_version,
        "runtime_binary_sha256": runtime_binary_sha256,
        "prompt_sha256": prompt_sha256(prompt),
        "response_sha256": response_sha,
        "finish_reason": finish_reason,
        "execution_status": execution_status,
        "model_call_count": 1,
        "hosted_ai_call_count": 0,
    }
    receipt_sha = canonical_sha256(receipt)

    artifact: dict[str, Any] | None = None
    artifact_sha = "NONE"
    if execution_status == "COMPLETED" and validated_wire is not None:
        artifact = {
            "schema_version": 1,
            "role": "scout",
            "case_id": case["case_id"],
            "model_profile_id": profile["profile_id"],
            "evidence_sha256": case["evidence_sha256"],
            "prompt_sha256": prompt_sha256(prompt),
            "validated_wire": validated_wire,
        }
        artifact_sha = canonical_sha256(artifact)

    result: dict[str, Any] = {
        "schema_version": 1,
        "scoring_policy_id": SCORING_POLICY_ID,
        "scoring_policy_sha256": SCORING_POLICY_SHA256,
        "case_id": case["case_id"],
        "case_version": case["case_version"],
        "fixture_sha256": case["fixture_sha256"],
        "role": "scout",
        "model": {
            "profile_id": profile["profile_id"],
            "family": profile["family"],
            "repository": profile["repository"],
            "revision": profile["revision"],
            "file": profile["file"],
            "sha256": profile["sha256"],
        },
        "runtime": {
            "id": "llama.cpp",
            "version": runtime_version,
            "binary_sha256": runtime_binary_sha256,
        },
        "execution_status": execution_status,
        "finish_reason": finish_reason,
        "parse_valid": parse_valid,
        "contract_valid": contract_valid,
        "invalid_ref_count": 0,
        "model_call_count": 1,
        "hosted_ai_call_count": 0,
        "compact_completion_status": execution_status == "COMPLETED",
        "prompt_sha256": prompt_sha256(prompt),
        "response_sha256": response_sha,
        "receipt_sha256": receipt_sha,
        "artifact_sha256": artifact_sha,
        "telemetry": {
            "wall_clock_ms": wall_clock_ms,
            "server_cpu_ms": None,
            "server_peak_rss_bytes": None,
            "prompt_tokens": _usage_int(envelope, "prompt_tokens"),
            "completion_tokens": _usage_int(envelope, "completion_tokens"),
        },
        "predicted_atoms": atoms,
        "result_sha256": "0" * 64,
    }
    result["result_sha256"] = result_sha256(result)
    validate_result(result, case)
    return result, artifact, receipt


def execute_cell(
    *,
    profile_id: str,
    port: int,
    runtime_version: str,
    runtime_binary_sha256: str,
    case_path: Path | str = CASE_PATH,
    evidence_path: Path | str = EVIDENCE_PATH,
) -> tuple[dict[str, Any], dict[str, Any], str, str, dict[str, Any], dict[str, Any] | None, dict[str, Any]]:
    case, evidence = load_case_and_evidence(case_path, evidence_path)
    profile = benchmark_model_profile(profile_id)
    prompt = build_scout_prompt(evidence)
    start = time.monotonic()
    content, finish_reason, envelope = post_chat_completion(
        port,
        prompt,
        scout_generation(),
        scout_response_schema(),
    )
    wall_clock_ms = max(0, int((time.monotonic() - start) * 1000))
    result, artifact, receipt = build_result(
        case=case,
        evidence=evidence,
        profile=profile,
        runtime_version=runtime_version,
        runtime_binary_sha256=runtime_binary_sha256,
        prompt=prompt,
        content=content,
        finish_reason=finish_reason,
        envelope=envelope,
        wall_clock_ms=wall_clock_ms,
    )
    score = score_role_output(case, result)
    return result, score, prompt, content, envelope, artifact, receipt


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one frozen O4-C Scout benchmark cell against a loopback llama-server.")
    parser.add_argument("--model-profile", required=True, choices=O4C_MODEL_PROFILE_IDS)
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--runtime-version", required=True)
    parser.add_argument("--runtime-binary-sha256", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--case", default=str(CASE_PATH))
    parser.add_argument("--evidence", default=str(EVIDENCE_PATH))
    args = parser.parse_args(argv)

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    try:
        result, score, prompt, content, envelope, artifact, receipt = execute_cell(
            profile_id=args.model_profile,
            port=args.port,
            runtime_version=args.runtime_version,
            runtime_binary_sha256=args.runtime_binary_sha256,
            case_path=args.case,
            evidence_path=args.evidence,
        )
        (output / "prompt.txt").write_text(prompt, encoding="utf-8")
        (output / "response.txt").write_text(content, encoding="utf-8")
        _write_json(output / "response-envelope.json", envelope)
        _write_json(output / "receipt.json", receipt)
        _write_json(output / "result.json", result)
        _write_json(output / "score.json", score)
        if artifact is not None:
            _write_json(output / "artifact.json", artifact)
        print("O4C_CELL_STATUS:" + result["execution_status"])
        print("O4C_CELL_MODEL:" + result["model"]["profile_id"])
        print("O4C_CELL_RESULT_SHA256:" + result["result_sha256"])
        print("O4C_CELL_SCORE_SHA256:" + score["score_sha256"])
        return 0 if result["execution_status"] == "COMPLETED" else 3
    except Exception as exc:
        _write_json(output / "runner-error.json", {"error": str(exc), "model_profile_id": args.model_profile})
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
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

from benchmarks.run_scout_cell import build_result
from benchmarks.score_role_output import score_role_output, validate_case
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from registry import load_model_registry, validate_model_registry_data
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence
from runtime.generation import scout_generation
from runtime.local_server import post_chat_completion

CASE_PATH = MODULE_DIR / "fixtures" / "o4f-termux-background-autosave-scout-v1.case.json"
EVIDENCE_PATH = MODULE_DIR / "evidence" / "o4f-termux-background-autosave-scout-v1.evidence.json"
O4F_MODEL_PROFILE_IDS = (
    "qwen2.5-3b-instruct-q4_k_m",
    "ministral-3-3b-instruct-2512-q4_k_m",
)
EXPECTED_CASE_ID = "o4f-termux-background-autosave-scout-v1"
EXPECTED_SOURCE_CASE_ID = "termux-large-doc-background-autosave-heldout"
EXPECTED_SOURCE_REPOSITORY_SHA = "f01c2ef304656de9254191ec2fb9a2c046642f21"
REQUEST_TIMEOUT_SECONDS = 1800.0
MEASUREMENT_ID = "o4f-termux-background-autosave-scout-v1"


class O4FScoutCellError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    target = Path(path)
    value = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4FScoutCellError(f"JSON object required: {target}")
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_o4f_case_and_evidence(
    case_path: Path | str = CASE_PATH,
    evidence_path: Path | str = EVIDENCE_PATH,
) -> tuple[dict[str, Any], dict[str, Any]]:
    case = validate_case(_read_json(case_path))
    evidence = _read_json(evidence_path)
    validate_evidence_package(evidence)
    if case["case_id"] != EXPECTED_CASE_ID or case["role"] != "scout":
        raise O4FScoutCellError("unexpected O4-F Scout fixture identity")
    if case["source_case_id"] != EXPECTED_SOURCE_CASE_ID:
        raise O4FScoutCellError("O4-F source case identity drifted")
    if case["source_case_kind"] != "RETROSPECTIVE_COMPATIBILITY":
        raise O4FScoutCellError("O4-F source case must remain retrospective compatibility evidence")
    if case["retrospective_only"] is not True:
        raise O4FScoutCellError("O4-F case must remain retrospective only")
    if evidence.get("scope") != "plugin:termux-large-doc-editor":
        raise O4FScoutCellError("O4-F evidence scope drifted")
    if evidence.get("target_repository_sha") != EXPECTED_SOURCE_REPOSITORY_SHA:
        raise O4FScoutCellError("O4-F frozen source repository SHA drifted")
    digest = evidence_package_sha256(evidence)
    if digest != case["evidence_sha256"]:
        raise O4FScoutCellError("O4-F EvidencePackage digest does not bind frozen case")
    if set(evidence_source_refs(evidence)) != set(case["known_source_refs"]):
        raise O4FScoutCellError("O4-F known source refs do not equal frozen EvidencePackage refs")
    return case, evidence


def o4f_model_profile(
    profile_id: str,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if profile_id not in O4F_MODEL_PROFILE_IDS:
        raise O4FScoutCellError("model profile is outside frozen O4-F matrix")
    registry = load_model_registry() if registry_data is None else registry_data
    validate_model_registry_data(registry)
    matches = [item for item in registry["profiles"] if item["profile_id"] == profile_id]
    if len(matches) != 1:
        raise O4FScoutCellError("frozen O4-F model profile missing or duplicated")
    profile = matches[0]
    if profile.get("enabled") is not True:
        raise O4FScoutCellError("O4-F model profile is disabled")
    if profile.get("execution_surface") != "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS":
        raise O4FScoutCellError("O4-F model profile execution surface drifted")
    if profile.get("access", {}).get("class") != "public_unauthenticated_https":
        raise O4FScoutCellError("O4-F model profile access class drifted")
    return deepcopy(profile)


def execute_cell(
    *,
    profile_id: str,
    port: int,
    runtime_version: str,
    runtime_binary_sha256: str,
    case_path: Path | str = CASE_PATH,
    evidence_path: Path | str = EVIDENCE_PATH,
) -> tuple[
    dict[str, Any],
    dict[str, Any],
    str,
    str,
    dict[str, Any],
    dict[str, Any] | None,
    dict[str, Any],
    dict[str, Any],
]:
    case, evidence = load_o4f_case_and_evidence(case_path, evidence_path)
    profile = o4f_model_profile(profile_id)
    prompt = build_scout_prompt(evidence)
    response_schema = scout_response_schema_for_evidence(evidence)
    response_schema_sha256 = canonical_sha256(response_schema)

    start = time.monotonic()
    content, finish_reason, envelope = post_chat_completion(
        port,
        prompt,
        scout_generation(),
        response_schema,
        timeout_seconds=REQUEST_TIMEOUT_SECONDS,
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
    metadata = {
        "schema_version": 1,
        "measurement_id": MEASUREMENT_ID,
        "model_profile_id": profile_id,
        "response_schema_sha256": response_schema_sha256,
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "canonical_terminal_row": True,
        "diagnostic_replay_only": False,
        "execution_status": result["execution_status"],
        "model_call_count": result["model_call_count"],
        "hosted_ai_call_count": result["hosted_ai_call_count"],
    }
    return result, score, prompt, content, envelope, artifact, receipt, metadata


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one frozen O4-F Termux Scout benchmark cell.")
    parser.add_argument("--model-profile", required=True, choices=O4F_MODEL_PROFILE_IDS)
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
        result, score, prompt, content, envelope, artifact, receipt, metadata = execute_cell(
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
        _write_json(output / "cell-metadata.json", metadata)
        if artifact is not None:
            _write_json(output / "artifact.json", artifact)
        print("O4F_CELL_STATUS:" + result["execution_status"])
        print("O4F_CELL_MODEL:" + result["model"]["profile_id"])
        print("O4F_CELL_RESULT_SHA256:" + result["result_sha256"])
        print("O4F_CELL_SCORE_SHA256:" + score["score_sha256"])
        print("O4F_CELL_RESPONSE_SCHEMA_SHA256:" + metadata["response_schema_sha256"])
        print("O4F_CELL_REQUEST_TIMEOUT_SECONDS:1800")
        return 0
    except Exception as exc:
        _write_json(
            output / "runner-error.json",
            {
                "error": str(exc),
                "model_profile_id": args.model_profile,
                "measurement_id": MEASUREMENT_ID,
                "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
            },
        )
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

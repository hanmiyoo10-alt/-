from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.build_o4h_voyage_inputs import (
    CASE_ID,
    SOURCE_CASE_ID,
    SOURCE_REPOSITORY_SHA,
)
from benchmarks.run_o4f_scout_cell import (
    O4F_MODEL_PROFILE_IDS,
    REQUEST_TIMEOUT_SECONDS,
    o4f_model_profile,
)
from benchmarks.run_scout_cell import build_result
from benchmarks.score_role_output import score_role_output, validate_case
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence_unique_refs
from runtime.generation import scout_generation
from runtime.local_server import post_chat_completion

O4H_MODEL_PROFILE_IDS = O4F_MODEL_PROFILE_IDS
MEASUREMENT_ID = CASE_ID


class O4HScoutCellError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    target = Path(path)
    value = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4HScoutCellError(f"JSON object required: {target}")
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_o4h_case_and_evidence(
    case_path: Path | str,
    evidence_path: Path | str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    case = validate_case(_read_json(case_path))
    evidence = _read_json(evidence_path)
    validate_evidence_package(evidence)
    if case["case_id"] != CASE_ID or case["role"] != "scout":
        raise O4HScoutCellError("unexpected O4-H Scout fixture identity")
    if case["source_case_id"] != SOURCE_CASE_ID:
        raise O4HScoutCellError("O4-H source case identity drifted")
    if case["source_case_kind"] != "PROSPECTIVE_HELD_OUT_CONSUMED":
        raise O4HScoutCellError("O4-H source case must remain consumed held-out retrospective evidence")
    if case["retrospective_only"] is not True:
        raise O4HScoutCellError("O4-H case must remain retrospective only")
    if evidence.get("scope") != "plugin:voyage-token-check":
        raise O4HScoutCellError("O4-H evidence scope drifted")
    if evidence.get("target_repository_sha") != SOURCE_REPOSITORY_SHA:
        raise O4HScoutCellError("O4-H frozen source repository SHA drifted")
    if evidence.get("blockers"):
        raise O4HScoutCellError("O4-H frozen evidence unexpectedly contains blockers")
    digest = evidence_package_sha256(evidence)
    if digest != case["evidence_sha256"]:
        raise O4HScoutCellError("O4-H EvidencePackage digest does not bind frozen case")
    if set(evidence_source_refs(evidence)) != set(case["known_source_refs"]):
        raise O4HScoutCellError("O4-H known source refs do not equal frozen EvidencePackage refs")
    return case, evidence


def o4h_model_profile(profile_id: str) -> dict[str, Any]:
    if profile_id not in O4H_MODEL_PROFILE_IDS:
        raise O4HScoutCellError("model profile is outside frozen O4-H pair")
    return o4f_model_profile(profile_id)


def execute_cell(
    *,
    profile_id: str,
    port: int,
    runtime_version: str,
    runtime_binary_sha256: str,
    case_path: Path | str,
    evidence_path: Path | str,
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
    case, evidence = load_o4h_case_and_evidence(case_path, evidence_path)
    profile = o4h_model_profile(profile_id)
    prompt = build_scout_prompt(evidence)
    response_schema = scout_response_schema_for_evidence_unique_refs(evidence)
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
        "response_schema_mode": "STRICT_UNIQUE_REF_ARRAY_ENUM",
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "canonical_terminal_row": True,
        "retrospective_only": True,
        "diagnostic_replay_only": False,
        "assignment_candidate_only": True,
        "independent_assignment_case": True,
        "assignment_eligible": False,
        "assignment_basis": "PENDING_PAIR_AGGREGATION",
        "semantic_retry_count": 0,
        "repair_count": 0,
        "fallback_count": 0,
        "execution_status": result["execution_status"],
        "model_call_count": result["model_call_count"],
        "hosted_ai_call_count": result["hosted_ai_call_count"],
    }
    return result, score, prompt, content, envelope, artifact, receipt, metadata


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one frozen O4-H Voyage Scout benchmark cell.")
    parser.add_argument("--model-profile", required=True, choices=O4H_MODEL_PROFILE_IDS)
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--runtime-version", required=True)
    parser.add_argument("--runtime-binary-sha256", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--case", required=True)
    parser.add_argument("--evidence", required=True)
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
        print("O4H_CELL_STATUS:" + result["execution_status"])
        print("O4H_CELL_MODEL:" + result["model"]["profile_id"])
        print("O4H_CELL_RESULT_SHA256:" + result["result_sha256"])
        print("O4H_CELL_SCORE_SHA256:" + score["score_sha256"])
        print("O4H_CELL_RESPONSE_SCHEMA_SHA256:" + metadata["response_schema_sha256"])
        print("O4H_CELL_LOCAL_MODEL_CALL_COUNT:" + str(result["model_call_count"]))
        print("O4H_CELL_HOSTED_AI_CALL_COUNT:" + str(result["hosted_ai_call_count"]))
        print("O4H_CELL_SEMANTIC_RETRY_COUNT:0")
        return 0
    except Exception as exc:
        _write_json(
            output / "runner-error.json",
            {
                "error": str(exc),
                "model_profile_id": args.model_profile,
                "measurement_id": MEASUREMENT_ID,
                "diagnostic_replay_only": False,
                "assignment_candidate_only": True,
                "independent_assignment_case": True,
                "semantic_retry_count": 0,
                "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
            },
        )
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

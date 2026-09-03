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

from benchmarks.run_o4f_scout_cell import (
    CASE_PATH,
    EVIDENCE_PATH,
    EXPECTED_SOURCE_REPOSITORY_SHA,
    O4F_MODEL_PROFILE_IDS,
    REQUEST_TIMEOUT_SECONDS,
    load_o4f_case_and_evidence,
    o4f_model_profile,
)
from benchmarks.run_scout_cell import build_result
from benchmarks.score_role_output import score_role_output
from canonical import canonical_sha256
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence_unique_refs
from runtime.generation import scout_generation
from runtime.local_server import post_chat_completion

O4G_MODEL_PROFILE_IDS = O4F_MODEL_PROFILE_IDS
MEASUREMENT_ID = "o4g-termux-background-autosave-scout-unique-ref-diagnostic-v1"


class O4GScoutCellError(ValueError):
    pass


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


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
    if profile_id not in O4G_MODEL_PROFILE_IDS:
        raise O4GScoutCellError("model profile is outside frozen O4-G diagnostic pair")
    profile = o4f_model_profile(profile_id)
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
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "canonical_terminal_row": True,
        "diagnostic_replay_only": True,
        "independent_assignment_case": False,
        "assignment_eligible": False,
        "assignment_basis": "DIAGNOSTIC_ONLY",
        "execution_status": result["execution_status"],
        "model_call_count": result["model_call_count"],
        "hosted_ai_call_count": result["hosted_ai_call_count"],
    }
    return result, score, prompt, content, envelope, artifact, receipt, metadata


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run one frozen O4-G Termux Scout uniqueness diagnostic cell."
    )
    parser.add_argument("--model-profile", required=True, choices=O4G_MODEL_PROFILE_IDS)
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
        print("O4G_CELL_STATUS:" + result["execution_status"])
        print("O4G_CELL_MODEL:" + result["model"]["profile_id"])
        print("O4G_CELL_RESULT_SHA256:" + result["result_sha256"])
        print("O4G_CELL_SCORE_SHA256:" + score["score_sha256"])
        print("O4G_CELL_RESPONSE_SCHEMA_SHA256:" + metadata["response_schema_sha256"])
        print("O4G_CELL_DIAGNOSTIC_REPLAY_ONLY:true")
        print("O4G_CELL_ASSIGNMENT_ELIGIBLE:false")
        return 0
    except Exception as exc:
        _write_json(
            output / "runner-error.json",
            {
                "error": str(exc),
                "model_profile_id": args.model_profile,
                "measurement_id": MEASUREMENT_ID,
                "diagnostic_replay_only": True,
                "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
            },
        )
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

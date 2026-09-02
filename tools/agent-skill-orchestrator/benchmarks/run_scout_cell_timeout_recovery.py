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

from benchmarks.run_scout_cell import (
    benchmark_model_profile,
    build_result,
    load_case_and_evidence,
)
from benchmarks.score_role_output import score_role_output
from roles.scout import build_scout_prompt, scout_response_schema
from runtime.generation import scout_generation
from runtime.local_server import post_chat_completion

RECOVERY_PROFILE_ID = "ministral-3-3b-instruct-2512-q4_k_m"
REQUEST_TIMEOUT_SECONDS = 1800.0
RECOVERY_ATTEMPT_NUMBER = 2


class O4CTimeoutRecoveryError(ValueError):
    pass


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def execute_recovery_cell(
    *,
    port: int,
    runtime_version: str,
    runtime_binary_sha256: str,
) -> tuple[
    dict[str, Any],
    dict[str, Any],
    str,
    str,
    dict[str, Any],
    dict[str, Any] | None,
    dict[str, Any],
]:
    case, evidence = load_case_and_evidence()
    profile = benchmark_model_profile(RECOVERY_PROFILE_ID)
    prompt = build_scout_prompt(evidence)
    start = time.monotonic()
    content, finish_reason, envelope = post_chat_completion(
        port,
        prompt,
        scout_generation(),
        scout_response_schema(),
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
    return result, score, prompt, content, envelope, artifact, receipt


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the bounded second Ministral attempt for the frozen O4-C Scout benchmark."
    )
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--runtime-version", required=True)
    parser.add_argument("--runtime-binary-sha256", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    recovery_metadata = {
        "schema_version": 1,
        "model_profile_id": RECOVERY_PROFILE_ID,
        "recovery_attempt_number": RECOVERY_ATTEMPT_NUMBER,
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "production_default_timeout_unchanged": True,
    }
    _write_json(output / "recovery-metadata.json", recovery_metadata)

    try:
        result, score, prompt, content, envelope, artifact, receipt = execute_recovery_cell(
            port=args.port,
            runtime_version=args.runtime_version,
            runtime_binary_sha256=args.runtime_binary_sha256,
        )
        (output / "prompt.txt").write_text(prompt, encoding="utf-8")
        (output / "response.txt").write_text(content, encoding="utf-8")
        _write_json(output / "response-envelope.json", envelope)
        _write_json(output / "receipt.json", receipt)
        _write_json(output / "result.json", result)
        _write_json(output / "score.json", score)
        if artifact is not None:
            _write_json(output / "artifact.json", artifact)
        print("O4C_TIMEOUT_RECOVERY_CELL_STATUS:" + result["execution_status"])
        print("O4C_TIMEOUT_RECOVERY_MODEL:" + result["model"]["profile_id"])
        print("O4C_TIMEOUT_RECOVERY_RESULT_SHA256:" + result["result_sha256"])
        print("O4C_TIMEOUT_RECOVERY_SCORE_SHA256:" + score["score_sha256"])
        print("O4C_TIMEOUT_RECOVERY_REQUEST_TIMEOUT_SECONDS:1800")
        return 0 if result["execution_status"] == "COMPLETED" else 3
    except Exception as exc:
        _write_json(
            output / "runner-error.json",
            {
                "error": str(exc),
                "model_profile_id": RECOVERY_PROFILE_ID,
                "recovery_attempt_number": RECOVERY_ATTEMPT_NUMBER,
                "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
            },
        )
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

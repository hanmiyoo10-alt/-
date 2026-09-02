from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.run_o4d_scout_cell import REQUEST_TIMEOUT_SECONDS
from benchmarks.run_scout_cell import (
    CASE_PATH,
    EVIDENCE_PATH,
    O4C_MODEL_PROFILE_IDS,
    benchmark_model_profile,
    load_case_and_evidence,
)
from benchmarks.score_role_output import score_role_output, validate_result, validate_score
from canonical import canonical_sha256
from roles.scout import build_scout_prompt, prompt_sha256, scout_response_schema
from runtime.generation import GENERATION, LLAMA_RUNTIME

MATRIX_ID = "o4d-scout-schema-hardening-validation-v1"
EXPECTED_CASE_ID = "o4c-scout-service-tier-fidelity-v1"
EXPECTED_FIXTURE_SHA256 = "196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f"
EXPECTED_EVIDENCE_SHA256 = "06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97"
EXPECTED_PROMPT_SHA256 = "8973db5c8ebf8c54a6dff2aee38769efab2c76999821084cdb4f5d240833a876"
HISTORICAL_O4C_RESULTS = {
    "qwen2.5-3b-instruct-q4_k_m": "eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08",
    "ministral-3-3b-instruct-2512-q4_k_m": "195f66b52261d14d7cee81018e0888808a0fbc6233d29a3435fa9f607a2513b5",
}
SCOUT_SOURCE_PATH = PACKAGE_ROOT / "roles" / "scout.py"
SCOUT_CONTRACT_PATH = PACKAGE_ROOT / "role-contracts" / "scout.json"


class O4DMatrixError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4DMatrixError(f"JSON object required: {path}")
    return value


def _write_json(path: Path | str, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_frozen_inputs(case: dict[str, Any], evidence: dict[str, Any], prompt: str) -> None:
    if case["case_id"] != EXPECTED_CASE_ID:
        raise O4DMatrixError("O4-D retrospective case identity drifted")
    if case["fixture_sha256"] != EXPECTED_FIXTURE_SHA256:
        raise O4DMatrixError("O4-D fixture digest drifted")
    if case["evidence_sha256"] != EXPECTED_EVIDENCE_SHA256:
        raise O4DMatrixError("O4-D evidence digest drifted")
    if prompt_sha256(prompt) != EXPECTED_PROMPT_SHA256:
        raise O4DMatrixError("O4-D prompt bytes drifted")
    if evidence.get("scope") != "plugin:usage-dashboard":
        raise O4DMatrixError("O4-D scope drifted")


def build_matrix_manifest(target_repository_sha: str) -> dict[str, Any]:
    if len(target_repository_sha) != 40 or any(ch not in "0123456789abcdef" for ch in target_repository_sha):
        raise O4DMatrixError("target_repository_sha must be lowercase 40-hex")
    case, evidence = load_case_and_evidence()
    prompt = build_scout_prompt(evidence)
    _validate_frozen_inputs(case, evidence, prompt)
    response_schema = scout_response_schema()
    profiles = [benchmark_model_profile(profile_id) for profile_id in O4C_MODEL_PROFILE_IDS]

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "diagnostic_replay_only": True,
        "target_repository_sha": target_repository_sha,
        "source_case_id": case["case_id"],
        "source_case_version": case["case_version"],
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "role": "scout",
        "role_contract_id": case["role_contract_id"],
        "prompt_sha256": prompt_sha256(prompt),
        "response_schema_sha256": canonical_sha256(response_schema),
        "scout_source_sha256": _sha256_file(SCOUT_SOURCE_PATH),
        "scout_contract_source_sha256": _sha256_file(SCOUT_CONTRACT_PATH),
        "runtime": deepcopy(LLAMA_RUNTIME),
        "generation": deepcopy(GENERATION),
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "model_profile_ids": list(O4C_MODEL_PROFILE_IDS),
        "models": [
            {
                "profile_id": profile["profile_id"],
                "family": profile["family"],
                "repository": profile["repository"],
                "revision": profile["revision"],
                "file": profile["file"],
                "sha256": profile["sha256"],
                "execution_surface": profile["execution_surface"],
                "access_class": profile["access"]["class"],
            }
            for profile in profiles
        ],
        "historical_o4c_result_sha256": deepcopy(HISTORICAL_O4C_RESULTS),
        "local_model_call_ceiling": 2,
        "hosted_ai_call_ceiling": 0,
        "matrix_sha256": "0" * 64,
    }
    forbidden = {"winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"}
    if forbidden.intersection(manifest):
        raise O4DMatrixError("winner/assignment semantics forbidden in O4-D manifest")
    base = deepcopy(manifest)
    base.pop("matrix_sha256")
    manifest["matrix_sha256"] = canonical_sha256(base)
    return manifest


def prepare_matrix(target_repository_sha: str, output_path: Path | str) -> dict[str, Any]:
    manifest = build_matrix_manifest(target_repository_sha)
    output = Path(output_path)
    _write_json(output, manifest)
    frozen = output.parent / "frozen-inputs"
    frozen.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CASE_PATH, frozen / CASE_PATH.name)
    shutil.copyfile(EVIDENCE_PATH, frozen / EVIDENCE_PATH.name)
    _write_json(frozen / "scout-response-schema.json", scout_response_schema())
    case, evidence = load_case_and_evidence()
    del case
    (frozen / "prompt.txt").write_text(build_scout_prompt(evidence), encoding="utf-8")
    return manifest


def aggregate_outputs(
    output_root: Path | str,
    matrix_path: Path | str,
) -> dict[str, Any]:
    case, _ = load_case_and_evidence()
    matrix = _read_json(matrix_path)
    expected_matrix_sha = matrix.get("matrix_sha256")
    if not isinstance(expected_matrix_sha, str):
        raise O4DMatrixError("matrix_sha256 missing")
    matrix_base = deepcopy(matrix)
    matrix_base.pop("matrix_sha256", None)
    if canonical_sha256(matrix_base) != expected_matrix_sha:
        raise O4DMatrixError("matrix digest mismatch")
    if matrix.get("matrix_id") != MATRIX_ID:
        raise O4DMatrixError("matrix id mismatch")

    root = Path(output_root)
    rows: list[dict[str, Any]] = []
    prompt_digests: set[str] = set()
    schema_digests: set[str] = set()
    for profile_id in O4C_MODEL_PROFILE_IDS:
        cell_dir = root / profile_id
        result = validate_result(_read_json(cell_dir / "result.json"), case)
        score = validate_score(_read_json(cell_dir / "score.json"))
        recomputed = score_role_output(case, result)
        if score != recomputed:
            raise O4DMatrixError(f"score read-back mismatch for {profile_id}")
        metadata = _read_json(cell_dir / "cell-metadata.json")
        if result["model"]["profile_id"] != profile_id:
            raise O4DMatrixError("cell result model identity mismatch")
        if result["model_call_count"] != 1 or result["hosted_ai_call_count"] != 0:
            raise O4DMatrixError("cell call accounting drifted")
        if metadata.get("request_timeout_seconds") != int(REQUEST_TIMEOUT_SECONDS):
            raise O4DMatrixError("cell timeout drifted")
        if metadata.get("response_schema_sha256") != matrix["response_schema_sha256"]:
            raise O4DMatrixError("cell response schema digest drifted")
        prompt_digests.add(result["prompt_sha256"])
        schema_digests.add(str(metadata["response_schema_sha256"]))
        rows.append({
            "model_profile_id": profile_id,
            "family": result["model"]["family"],
            "execution_status": result["execution_status"],
            "finish_reason": result["finish_reason"],
            "parse_valid": result["parse_valid"],
            "contract_valid": result["contract_valid"],
            "result_sha256": result["result_sha256"],
            "score_sha256": score["score_sha256"],
            "metrics": deepcopy(score["metrics"]),
            "telemetry": deepcopy(result["telemetry"]),
        })

    if prompt_digests != {matrix["prompt_sha256"]}:
        raise O4DMatrixError("O4-D cells did not use frozen prompt bytes")
    if schema_digests != {matrix["response_schema_sha256"]}:
        raise O4DMatrixError("O4-D cells did not use frozen response schema")

    validated = all(
        row["execution_status"] == "COMPLETED"
        and row["parse_valid"] is True
        and row["contract_valid"] is True
        for row in rows
    )
    summary: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "matrix_sha256": matrix["matrix_sha256"],
        "target_repository_sha": matrix["target_repository_sha"],
        "source_case_id": case["case_id"],
        "fixture_sha256": case["fixture_sha256"],
        "prompt_sha256": matrix["prompt_sha256"],
        "response_schema_sha256": matrix["response_schema_sha256"],
        "local_model_call_count": len(rows),
        "hosted_ai_call_count": 0,
        "hardening_verdict": "HARDENING_VALIDATED" if validated else "HARDENING_NOT_VALIDATED",
        "rows": rows,
        "summary_sha256": "0" * 64,
    }
    forbidden = {"winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"}
    if forbidden.intersection(summary):
        raise O4DMatrixError("winner/assignment semantics forbidden in O4-D summary")
    base = deepcopy(summary)
    base.pop("summary_sha256")
    summary["summary_sha256"] = canonical_sha256(base)
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepare or aggregate O4-D Scout schema-hardening validation.")
    sub = parser.add_subparsers(dest="command", required=True)

    prepare = sub.add_parser("prepare")
    prepare.add_argument("--target-sha", required=True)
    prepare.add_argument("--output", required=True)

    aggregate = sub.add_parser("aggregate")
    aggregate.add_argument("--matrix", required=True)
    aggregate.add_argument("--output-root", required=True)
    aggregate.add_argument("--output", required=True)

    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            manifest = prepare_matrix(args.target_sha, args.output)
            print("O4D_MATRIX_SHA256:" + manifest["matrix_sha256"])
            print("O4D_RESPONSE_SCHEMA_SHA256:" + manifest["response_schema_sha256"])
            return 0
        summary = aggregate_outputs(args.output_root, args.matrix)
        _write_json(args.output, summary)
        print("O4D_SUMMARY_SHA256:" + summary["summary_sha256"])
        print("O4D_HARDENING_VERDICT:" + summary["hardening_verdict"])
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

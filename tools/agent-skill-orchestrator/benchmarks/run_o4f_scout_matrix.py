from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from copy import deepcopy
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
    MEASUREMENT_ID,
    O4F_MODEL_PROFILE_IDS,
    REQUEST_TIMEOUT_SECONDS,
    load_o4f_case_and_evidence,
    o4f_model_profile,
)
from benchmarks.score_role_output import score_role_output, validate_result, validate_score
from canonical import canonical_sha256
from roles.scout import build_scout_prompt, prompt_sha256
from roles.scout_evidence_schema import scout_response_schema_for_evidence
from runtime.generation import GENERATION, LLAMA_RUNTIME

MATRIX_ID = MEASUREMENT_ID
SCOUT_SOURCE_PATH = PACKAGE_ROOT / "roles" / "scout.py"
SCOUT_CONTRACT_PATH = PACKAGE_ROOT / "role-contracts" / "scout.json"


class O4FMatrixError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4FMatrixError(f"JSON object required: {path}")
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


def _git(repo_root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit={proc.returncode}"
        raise O4FMatrixError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout


def verify_frozen_source_bytes(repo_root: Path | str = ".") -> None:
    _, evidence = load_o4f_case_and_evidence()
    root = Path(repo_root).resolve()
    source_shas = {str(item["source_sha"]) for item in evidence["sources"]}
    if source_shas != {EXPECTED_SOURCE_REPOSITORY_SHA}:
        raise O4FMatrixError("O4-F EvidencePackage contains unexpected source repository SHA")
    canonical = _git(root, "rev-parse", f"{EXPECTED_SOURCE_REPOSITORY_SHA}^{{commit}}").strip()
    if canonical != EXPECTED_SOURCE_REPOSITORY_SHA:
        raise O4FMatrixError("O4-F frozen source commit is unavailable or drifted")
    for item in evidence["sources"]:
        raw = _git(root, "show", f"{EXPECTED_SOURCE_REPOSITORY_SHA}:{item['path']}")
        lines = raw.splitlines()
        start = int(item["start_line"])
        end = int(item["end_line"])
        if start < 1 or end < start or end > len(lines):
            raise O4FMatrixError(f"O4-F frozen line range invalid for {item['path']}")
        observed = "\n".join(lines[start - 1:end])
        if observed != item["content"]:
            raise O4FMatrixError(
                f"O4-F frozen source bytes drifted for {item['source_ref']['ref']} {item['path']}"
            )


def build_matrix_manifest(target_repository_sha: str) -> dict[str, Any]:
    if len(target_repository_sha) != 40 or any(
        ch not in "0123456789abcdef" for ch in target_repository_sha
    ):
        raise O4FMatrixError("target_repository_sha must be lowercase 40-hex")
    case, evidence = load_o4f_case_and_evidence()
    prompt = build_scout_prompt(evidence)
    response_schema = scout_response_schema_for_evidence(evidence)
    profiles = [o4f_model_profile(profile_id) for profile_id in O4F_MODEL_PROFILE_IDS]
    families = {profile["family"] for profile in profiles}
    if len(families) != 2:
        raise O4FMatrixError("O4-F requires exactly two distinct model families")

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "retrospective_only": True,
        "diagnostic_replay_only": False,
        "assignment_candidate_only": True,
        "target_repository_sha": target_repository_sha,
        "source_repository_sha": EXPECTED_SOURCE_REPOSITORY_SHA,
        "case_id": case["case_id"],
        "case_version": case["case_version"],
        "source_case_id": case["source_case_id"],
        "source_case_kind": case["source_case_kind"],
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "role": "scout",
        "role_contract_id": case["role_contract_id"],
        "scoring_policy_id": case["scoring_policy_id"],
        "scoring_policy_sha256": case["scoring_policy_sha256"],
        "prompt_sha256": prompt_sha256(prompt),
        "response_schema_sha256": canonical_sha256(response_schema),
        "scout_source_sha256": _sha256_file(SCOUT_SOURCE_PATH),
        "scout_contract_source_sha256": _sha256_file(SCOUT_CONTRACT_PATH),
        "runtime": deepcopy(LLAMA_RUNTIME),
        "generation": deepcopy(GENERATION),
        "request_timeout_seconds": int(REQUEST_TIMEOUT_SECONDS),
        "model_profile_ids": list(O4F_MODEL_PROFILE_IDS),
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
        "local_model_call_ceiling": 2,
        "hosted_ai_call_ceiling": 0,
        "matrix_sha256": "0" * 64,
    }
    forbidden = {"winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"}
    if forbidden.intersection(manifest):
        raise O4FMatrixError("winner/assignment semantics forbidden in O4-F manifest")
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
    _, evidence = load_o4f_case_and_evidence()
    _write_json(
        frozen / "scout-response-schema.json",
        scout_response_schema_for_evidence(evidence),
    )
    (frozen / "prompt.txt").write_text(build_scout_prompt(evidence), encoding="utf-8")
    return manifest


def aggregate_outputs(
    output_root: Path | str,
    matrix_path: Path | str,
) -> dict[str, Any]:
    case, _ = load_o4f_case_and_evidence()
    matrix = _read_json(matrix_path)
    expected_matrix_sha = matrix.get("matrix_sha256")
    if not isinstance(expected_matrix_sha, str):
        raise O4FMatrixError("matrix_sha256 missing")
    matrix_base = deepcopy(matrix)
    matrix_base.pop("matrix_sha256", None)
    if canonical_sha256(matrix_base) != expected_matrix_sha:
        raise O4FMatrixError("matrix digest mismatch")
    if matrix.get("matrix_id") != MATRIX_ID:
        raise O4FMatrixError("matrix id mismatch")
    if matrix.get("source_repository_sha") != EXPECTED_SOURCE_REPOSITORY_SHA:
        raise O4FMatrixError("matrix frozen source SHA drifted")

    root = Path(output_root)
    rows: list[dict[str, Any]] = []
    prompt_digests: set[str] = set()
    schema_digests: set[str] = set()
    preliminary_valid: list[bool] = []
    for profile_id in O4F_MODEL_PROFILE_IDS:
        cell_dir = root / profile_id
        result = validate_result(_read_json(cell_dir / "result.json"), case)
        score = validate_score(_read_json(cell_dir / "score.json"))
        recomputed = score_role_output(case, result)
        if score != recomputed:
            raise O4FMatrixError(f"score read-back mismatch for {profile_id}")
        metadata = _read_json(cell_dir / "cell-metadata.json")
        if result["model"]["profile_id"] != profile_id:
            raise O4FMatrixError("cell result model identity mismatch")
        if result["model_call_count"] != 1 or result["hosted_ai_call_count"] != 0:
            raise O4FMatrixError("cell call accounting drifted")
        if metadata.get("measurement_id") != MATRIX_ID:
            raise O4FMatrixError("cell measurement identity drifted")
        if metadata.get("diagnostic_replay_only") is not False:
            raise O4FMatrixError("O4-F cell incorrectly marked diagnostic replay")
        if metadata.get("request_timeout_seconds") != int(REQUEST_TIMEOUT_SECONDS):
            raise O4FMatrixError("cell timeout drifted")
        if metadata.get("response_schema_sha256") != matrix["response_schema_sha256"]:
            raise O4FMatrixError("cell response schema digest drifted")
        prompt_digests.add(result["prompt_sha256"])
        schema_digests.add(str(metadata["response_schema_sha256"]))
        valid = (
            result["execution_status"] == "COMPLETED"
            and result["parse_valid"] is True
            and result["contract_valid"] is True
            and result["invalid_ref_count"] == 0
        )
        preliminary_valid.append(valid)
        rows.append(
            {
                "measurement_id": MATRIX_ID,
                "model_profile_id": profile_id,
                "family": result["model"]["family"],
                "execution_status": result["execution_status"],
                "finish_reason": result["finish_reason"],
                "parse_valid": result["parse_valid"],
                "contract_valid": result["contract_valid"],
                "invalid_ref_count": result["invalid_ref_count"],
                "result_sha256": result["result_sha256"],
                "score_sha256": score["score_sha256"],
                "metrics": deepcopy(score["metrics"]),
                "telemetry": deepcopy(result["telemetry"]),
                "diagnostic_replay_only": False,
                "assignment_eligible": False,
                "assignment_basis": "HISTORICAL_TERMINAL_ONLY",
            }
        )

    if prompt_digests != {matrix["prompt_sha256"]}:
        raise O4FMatrixError("O4-F cells did not use frozen prompt bytes")
    if schema_digests != {matrix["response_schema_sha256"]}:
        raise O4FMatrixError("O4-F cells did not use frozen response schema")

    paired_eligible = all(preliminary_valid) and len(rows) == 2
    if paired_eligible:
        for row in rows:
            row["assignment_eligible"] = True
            row["assignment_basis"] = "ELIGIBLE_RETROSPECTIVE"

    summary: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "matrix_sha256": matrix["matrix_sha256"],
        "target_repository_sha": matrix["target_repository_sha"],
        "source_repository_sha": matrix["source_repository_sha"],
        "case_id": case["case_id"],
        "case_version": case["case_version"],
        "source_case_id": case["source_case_id"],
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "prompt_sha256": matrix["prompt_sha256"],
        "response_schema_sha256": matrix["response_schema_sha256"],
        "role": "scout",
        "paired_assignment_eligible": paired_eligible,
        "local_model_call_count": len(rows),
        "hosted_ai_call_count": 0,
        "rows": rows,
        "summary_sha256": "0" * 64,
    }
    forbidden = {"winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"}
    if forbidden.intersection(summary):
        raise O4FMatrixError("winner/assignment semantics forbidden in O4-F summary")
    base = deepcopy(summary)
    base.pop("summary_sha256")
    summary["summary_sha256"] = canonical_sha256(base)
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Prepare, verify, or aggregate the frozen O4-F Termux Scout matrix."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    verify = sub.add_parser("verify-source")
    verify.add_argument("--repo-root", default=".")

    prepare = sub.add_parser("prepare")
    prepare.add_argument("--target-sha", required=True)
    prepare.add_argument("--output", required=True)

    aggregate = sub.add_parser("aggregate")
    aggregate.add_argument("--matrix", required=True)
    aggregate.add_argument("--output-root", required=True)
    aggregate.add_argument("--output", required=True)

    args = parser.parse_args(argv)
    try:
        if args.command == "verify-source":
            verify_frozen_source_bytes(args.repo_root)
            print("O4F_FROZEN_SOURCE_BYTES:VERIFIED")
            return 0
        if args.command == "prepare":
            manifest = prepare_matrix(args.target_sha, args.output)
            print("O4F_MATRIX_SHA256:" + manifest["matrix_sha256"])
            print("O4F_RESPONSE_SCHEMA_SHA256:" + manifest["response_schema_sha256"])
            return 0
        summary = aggregate_outputs(args.output_root, args.matrix)
        _write_json(args.output, summary)
        print("O4F_SUMMARY_SHA256:" + summary["summary_sha256"])
        print(
            "O4F_PAIRED_ASSIGNMENT_ELIGIBLE:"
            + ("true" if summary["paired_assignment_eligible"] else "false")
        )
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.run_scout_cell import (
    CASE_PATH,
    EVIDENCE_PATH,
    O4C_MODEL_PROFILE_IDS,
    benchmark_model_profile,
    load_case_and_evidence,
)
from benchmarks.score_role_output import score_role_output, validate_result, validate_score
from canonical import canonical_sha256
from roles.scout import build_scout_prompt, prompt_sha256
from runtime.generation import GENERATION, LLAMA_RUNTIME, SCOUT_MODEL_PROFILE_ID
from runtime.budget_profile import DEFAULT_RUNTIME_BUDGET_PROFILE_ID

MATRIX_ID = "o4c-scout-service-tier-fidelity-first-slice-v1"


class O4CMatrixError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise O4CMatrixError(f"JSON object required: {path}")
    return value


def _write_json(path: Path | str, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_matrix_manifest(
    case_path: Path | str = CASE_PATH,
    evidence_path: Path | str = EVIDENCE_PATH,
) -> dict[str, Any]:
    case, evidence = load_case_and_evidence(case_path, evidence_path)
    if SCOUT_MODEL_PROFILE_ID != "qwen2.5-3b-instruct-q4_k_m":
        raise O4CMatrixError("production SCOUT_MODEL_PROFILE_ID drifted")
    if DEFAULT_RUNTIME_BUDGET_PROFILE_ID != "standard-cpu-v1":
        raise O4CMatrixError("production default runtime budget profile drifted")

    profiles = [benchmark_model_profile(profile_id) for profile_id in O4C_MODEL_PROFILE_IDS]
    prompt = build_scout_prompt(evidence)
    manifest: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "retrospective_only": True,
        "case_id": case["case_id"],
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "role": "scout",
        "role_contract_id": case["role_contract_id"],
        "prompt_sha256": prompt_sha256(prompt),
        "runtime": deepcopy(LLAMA_RUNTIME),
        "generation": deepcopy(GENERATION),
        "model_profile_ids": list(O4C_MODEL_PROFILE_IDS),
        "models": [
            {
                "profile_id": profile["profile_id"],
                "local_model_id": profile["local_model_id"],
                "family": profile["family"],
                "repository": profile["repository"],
                "revision": profile["revision"],
                "file": profile["file"],
                "sha256": profile["sha256"],
                "access_class": profile["access"]["class"],
                "execution_surface": profile["execution_surface"],
            }
            for profile in profiles
        ],
        "hosted_ai_call_count": 0,
        "matrix_sha256": "0" * 64,
    }
    base = deepcopy(manifest)
    base.pop("matrix_sha256")
    manifest["matrix_sha256"] = canonical_sha256(base)
    return manifest


def aggregate_outputs(output_root: Path | str, *, case_path: Path | str = CASE_PATH) -> dict[str, Any]:
    case, _ = load_case_and_evidence(case_path, EVIDENCE_PATH)
    root = Path(output_root)
    rows: list[dict[str, Any]] = []
    prompt_digests: set[str] = set()
    for profile_id in O4C_MODEL_PROFILE_IDS:
        cell_dir = root / profile_id
        result = validate_result(_read_json(cell_dir / "result.json"), case)
        score = validate_score(_read_json(cell_dir / "score.json"))
        recomputed = score_role_output(case, result)
        if recomputed != score:
            raise O4CMatrixError(f"score read-back mismatch for {profile_id}")
        if result["model"]["profile_id"] != profile_id:
            raise O4CMatrixError("cell result model identity mismatch")
        if result["hosted_ai_call_count"] != 0 or result["model_call_count"] != 1:
            raise O4CMatrixError("cell call accounting drifted")
        prompt_digests.add(result["prompt_sha256"])
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
    if len(prompt_digests) != 1:
        raise O4CMatrixError("O4-C cells did not execute identical Scout prompt bytes")

    summary: dict[str, Any] = {
        "schema_version": 1,
        "matrix_id": MATRIX_ID,
        "case_id": case["case_id"],
        "fixture_sha256": case["fixture_sha256"],
        "role": "scout",
        "model_profile_ids": list(O4C_MODEL_PROFILE_IDS),
        "prompt_sha256": next(iter(prompt_digests)),
        "hosted_ai_call_count": 0,
        "local_model_call_count": len(rows),
        "rows": rows,
        "summary_sha256": "0" * 64,
    }
    forbidden = {"winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"}
    if forbidden.intersection(summary):
        raise O4CMatrixError("winner/assignment semantics forbidden in O4-C summary")
    base = deepcopy(summary)
    base.pop("summary_sha256")
    summary["summary_sha256"] = canonical_sha256(base)
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepare or aggregate the frozen O4-C two-cell Scout matrix.")
    sub = parser.add_subparsers(dest="command", required=True)

    prepare = sub.add_parser("prepare")
    prepare.add_argument("--case", default=str(CASE_PATH))
    prepare.add_argument("--evidence", default=str(EVIDENCE_PATH))
    prepare.add_argument("--output", required=True)

    aggregate = sub.add_parser("aggregate")
    aggregate.add_argument("--case", default=str(CASE_PATH))
    aggregate.add_argument("--output-root", required=True)
    aggregate.add_argument("--output", required=True)

    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            manifest = build_matrix_manifest(args.case, args.evidence)
            _write_json(args.output, manifest)
            print("O4C_MATRIX_SHA256:" + manifest["matrix_sha256"])
            return 0
        summary = aggregate_outputs(args.output_root, case_path=args.case)
        _write_json(args.output, summary)
        print("O4C_SUMMARY_SHA256:" + summary["summary_sha256"])
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build and validate provenance receipts for isolated Agent Skill eval pairs.

This module never judges qualitative model quality. It validates execution identity,
mode isolation evidence, and with-skill/baseline pair consistency.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
MODES = frozenset({"with_skill", "baseline_without_target_skill"})
PAIR_IDENTITY_FIELDS = (
    "repository_sha",
    "skill",
    "skill_sha256",
    "eval_kind",
    "fixture_sha256",
    "case_id",
    "prompt_sha256",
    "requested_model",
    "copilot_package_version",
    "copilot_runtime_version",
)
FORBIDDEN_VERDICT_KEYS = frozenset({"skill_better", "promoted", "winner", "quality_score"})


class ReceiptError(ValueError):
    pass


def _load(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReceiptError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ReceiptError(f"JSON object required: {path}")
    return data


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_proof(proof: dict[str, Any], mode: str, skill: str) -> None:
    if proof.get("proof") != "PASS" or proof.get("mode") != mode or proof.get("skill") != skill:
        raise ReceiptError("workspace proof does not match receipt mode/skill")
    canonical = bool(proof.get("canonical_skill_present"))
    quarantined = bool(proof.get("quarantined_skill_present"))
    if mode == "with_skill" and not (canonical and not quarantined):
        raise ReceiptError("with_skill proof is inconsistent")
    if mode == "baseline_without_target_skill" and not ((not canonical) and quarantined):
        raise ReceiptError("baseline proof is inconsistent")


def make_receipt(
    matrix: dict[str, Any],
    proof: dict[str, Any],
    response_path: Path,
    exit_code: int,
    mode: str,
    copilot_package_version: str,
    copilot_runtime_version: str,
    workflow_run_id: str,
    workflow_run_attempt: str,
) -> dict[str, Any]:
    if matrix.get("schema_version") != SCHEMA_VERSION:
        raise ReceiptError("unsupported matrix schema")
    if mode not in MODES:
        raise ReceiptError(f"unsupported mode: {mode}")
    skill = matrix.get("skill")
    if not isinstance(skill, str) or not skill:
        raise ReceiptError("matrix missing skill")
    _validate_proof(proof, mode, skill)
    if not copilot_package_version.strip() or not copilot_runtime_version.strip():
        raise ReceiptError("Copilot package/runtime identity is required")
    response_exists = response_path.is_file()
    response_hash = _sha256_file(response_path) if response_exists else None
    if exit_code == 0 and not response_exists:
        raise ReceiptError("successful execution requires a response artifact")
    return {
        "schema_version": SCHEMA_VERSION,
        "repository_sha": matrix.get("repository_sha"),
        "workflow_run_id": str(workflow_run_id),
        "workflow_run_attempt": str(workflow_run_attempt),
        "skill": skill,
        "skill_sha256": matrix.get("skill_sha256"),
        "eval_kind": matrix.get("eval_kind"),
        "fixture_sha256": matrix.get("fixture_sha256"),
        "case_id": matrix.get("case_id"),
        "mode": mode,
        "prompt_sha256": matrix.get("prompt_sha256"),
        "requested_model": matrix.get("requested_model"),
        "copilot_package_version": copilot_package_version.strip(),
        "copilot_runtime_version": copilot_runtime_version.strip(),
        "response_sha256": response_hash,
        "response_path": str(response_path),
        "process_exit_code": int(exit_code),
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        "skill_presence_proof": proof,
        "expected_trigger": matrix.get("expected_trigger"),
        "trigger_observability": "UNOBSERVABLE" if matrix.get("eval_kind") == "trigger" else None,
        "qualitative_verdict": None,
    }


def _validate_receipt_shape(receipt: dict[str, Any]) -> None:
    if receipt.get("schema_version") != SCHEMA_VERSION:
        raise ReceiptError("unsupported receipt schema")
    if receipt.get("mode") not in MODES:
        raise ReceiptError("receipt mode invalid")
    for field in PAIR_IDENTITY_FIELDS:
        value = receipt.get(field)
        if value is None or value == "":
            raise ReceiptError(f"receipt missing identity field: {field}")
    if int(receipt.get("process_exit_code", -9999)) == 0 and not receipt.get("response_sha256"):
        raise ReceiptError("successful receipt missing response hash")
    proof = receipt.get("skill_presence_proof")
    if not isinstance(proof, dict):
        raise ReceiptError("receipt missing skill presence proof")
    _validate_proof(proof, receipt["mode"], receipt["skill"])
    if receipt.get("qualitative_verdict") not in (None, ""):
        raise ReceiptError("mechanical receipt must not carry qualitative verdict")
    for key in receipt:
        if key.lower() in FORBIDDEN_VERDICT_KEYS:
            raise ReceiptError(f"forbidden automatic verdict key: {key}")
    if receipt.get("eval_kind") == "trigger":
        if receipt.get("trigger_observability") not in {"UNOBSERVABLE", "INVOKED", "NOT_INVOKED"}:
            raise ReceiptError("invalid trigger observability state")


def validate_pair(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    _validate_receipt_shape(a)
    _validate_receipt_shape(b)
    if {a["mode"], b["mode"]} != MODES:
        raise ReceiptError("pair must contain exactly one with_skill and one baseline mode")
    mismatches = [field for field in PAIR_IDENTITY_FIELDS if a.get(field) != b.get(field)]
    if mismatches:
        raise ReceiptError("pair identity mismatch: " + ",".join(mismatches))
    by_mode = {a["mode"]: a, b["mode"]: b}
    complete = all(int(item["process_exit_code"]) == 0 for item in by_mode.values())
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "PAIR_VALID" if complete else "EXECUTION_INCOMPLETE",
        "repository_sha": a["repository_sha"],
        "skill": a["skill"],
        "eval_kind": a["eval_kind"],
        "case_id": a["case_id"],
        "prompt_sha256": a["prompt_sha256"],
        "requested_model": a["requested_model"],
        "copilot_runtime_version": a["copilot_runtime_version"],
        "modes": sorted(MODES),
        "qualitative_verdict": None,
    }


def _write(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    make = sub.add_parser("make")
    make.add_argument("--matrix", required=True)
    make.add_argument("--proof", required=True)
    make.add_argument("--response", required=True)
    make.add_argument("--exit-code", type=int, required=True)
    make.add_argument("--mode", choices=sorted(MODES), required=True)
    make.add_argument("--copilot-package-version", required=True)
    make.add_argument("--copilot-runtime-version", required=True)
    make.add_argument("--workflow-run-id", required=True)
    make.add_argument("--workflow-run-attempt", required=True)
    make.add_argument("--output")

    pair = sub.add_parser("pair")
    pair.add_argument("--with-receipt", required=True)
    pair.add_argument("--baseline-receipt", required=True)
    pair.add_argument("--output")

    args = parser.parse_args(argv)
    try:
        if args.command == "make":
            payload = make_receipt(
                _load(Path(args.matrix)),
                _load(Path(args.proof)),
                Path(args.response),
                args.exit_code,
                args.mode,
                args.copilot_package_version,
                args.copilot_runtime_version,
                args.workflow_run_id,
                args.workflow_run_attempt,
            )
            _write(Path(args.output) if args.output else None, payload)
        else:
            payload = validate_pair(_load(Path(args.with_receipt)), _load(Path(args.baseline_receipt)))
            _write(Path(args.output) if args.output else None, payload)
    except ReceiptError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

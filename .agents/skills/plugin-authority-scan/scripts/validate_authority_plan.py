#!/usr/bin/env python3
"""Validate the structure of a derived plugin authority plan.

This validator is intentionally read-only and project-agnostic. It verifies that
resolved evidence reads carry explicit ref/path/claim/provenance fields and that a
plan does not claim readiness while unresolved authority remains.

It does not decide which repository ref owns a path and must never be used as a
replacement for the owning project contract.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

VALID_STATUSES = frozenset({"PLAN_READY", "UNKNOWN", "CONFLICT"})
REQUIRED_EVIDENCE_FIELDS = ("ref", "path", "claim", "basis")
MUTATION_KEYS = frozenset(
    {
        "write",
        "writes",
        "mutation",
        "mutations",
        "edit",
        "edits",
        "delete",
        "deletes",
        "deploy",
        "release_action",
    }
)


class PlanError(Exception):
    pass


def load_plan(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise PlanError(f"plan missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise PlanError(f"invalid JSON in {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise PlanError("authority plan must be a JSON object")
    return data


def _nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _find_mutation_keys(value: Any, path: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            key_text = str(key)
            child_path = f"{path}.{key_text}"
            if key_text.lower() in MUTATION_KEYS:
                found.append(child_path)
            found.extend(_find_mutation_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(_find_mutation_keys(child, f"{path}[{index}]"))
    return found


def validate_plan(plan: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    scope = plan.get("scope")
    if not _nonempty_string(scope):
        errors.append("scope must be a non-empty string")

    status = plan.get("status")
    if status not in VALID_STATUSES:
        errors.append(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    contract_reads = plan.get("contract_reads", [])
    if not isinstance(contract_reads, list):
        errors.append("contract_reads must be an array")
        contract_reads = []
    for index, item in enumerate(contract_reads):
        if not isinstance(item, dict):
            errors.append(f"contract_reads[{index}] must be an object")
            continue
        for field in ("ref", "path", "purpose"):
            if not _nonempty_string(item.get(field)):
                errors.append(f"contract_reads[{index}].{field} must be a non-empty string")

    evidence_reads = plan.get("evidence_reads", [])
    if not isinstance(evidence_reads, list):
        errors.append("evidence_reads must be an array")
        evidence_reads = []
    for index, item in enumerate(evidence_reads):
        if not isinstance(item, dict):
            errors.append(f"evidence_reads[{index}] must be an object")
            continue
        for field in REQUIRED_EVIDENCE_FIELDS:
            if not _nonempty_string(item.get(field)):
                errors.append(f"evidence_reads[{index}].{field} must be a non-empty string")

    unresolved = plan.get("unresolved", [])
    if not isinstance(unresolved, list):
        errors.append("unresolved must be an array")
        unresolved = []

    if status == "PLAN_READY" and unresolved:
        errors.append("PLAN_READY requires unresolved to be empty")
    if status == "UNKNOWN" and not unresolved:
        warnings.append("UNKNOWN normally carries at least one unresolved authority/evidence item")

    mutation_keys = _find_mutation_keys(plan)
    if mutation_keys:
        errors.append(
            "authority plan must remain read-only; mutation-like keys found at: "
            + ", ".join(mutation_keys)
        )

    seen_claims: dict[str, set[tuple[str, str]]] = {}
    for item in evidence_reads:
        if not isinstance(item, dict):
            continue
        claim = item.get("claim")
        ref = item.get("ref")
        path = item.get("path")
        if not all(_nonempty_string(value) for value in (claim, ref, path)):
            continue
        seen_claims.setdefault(str(claim), set()).add((str(ref), str(path)))
    for claim, owners in seen_claims.items():
        if len(owners) > 1 and status != "CONFLICT":
            warnings.append(
                f"claim {claim!r} maps to multiple evidence reads; ensure the owning contract requires composition rather than conflict"
            )

    return {
        "valid": not errors,
        "status": "VALID" if not errors else "INVALID",
        "errors": errors,
        "warnings": warnings,
        "mutation_performed": False,
        "truth_claim_status": "STRUCTURE_ONLY",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate authority-plan structure/provenance without resolving project truth."
    )
    parser.add_argument("--plan", required=True, type=Path, help="JSON authority plan to validate")
    parser.add_argument("--json", action="store_true", help="emit structured JSON")
    return parser


def render_text(result: dict[str, Any]) -> str:
    lines = [f"status: {result['status']}", "truth_claim_status: STRUCTURE_ONLY"]
    for error in result["errors"]:
        lines.append(f"error: {error}")
    for warning in result["warnings"]:
        lines.append(f"warning: {warning}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        plan = load_plan(args.plan)
        result = validate_plan(plan)
    except PlanError as exc:
        result = {
            "valid": False,
            "status": "INVALID",
            "errors": [str(exc)],
            "warnings": [],
            "mutation_performed": False,
            "truth_claim_status": "STRUCTURE_ONLY",
        }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(render_text(result))
    return 0 if result["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

EXPECTED_PHASES = [
    "release_spec",
    "materialization",
    "reconciliation",
    "syntax_checks",
    "full_test_suite",
    "release_candidate_validation",
    "cleanliness_integrity",
]
MAX_REPORT_BYTES = 32 * 1024
STEP_OUTCOMES = {"success", "failure", "cancelled", "skipped"}
PHASE_RESULTS = {"NOT_RUN", "RUNNING", "PASS"}


def _run(args: argparse.Namespace) -> dict[str, Any]:
    try:
        attempt = int(args.attempt or os.environ.get("GITHUB_RUN_ATTEMPT") or "0")
    except ValueError:
        attempt = 0
    return {
        "id": args.run_id or os.environ.get("GITHUB_RUN_ID") or "UNKNOWN",
        "attempt": max(0, attempt),
        "event": args.event or os.environ.get("GITHUB_EVENT_NAME") or "UNKNOWN",
        "sha": args.sha or os.environ.get("GITHUB_SHA") or "UNKNOWN",
    }


def _bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise ValueError("identity-required must be true or false")


def _outcome(value: str, field: str) -> str:
    normalized = value.strip().lower()
    if normalized not in STEP_OUTCOMES:
        raise ValueError(f"{field} has invalid GitHub step outcome: {value!r}")
    return normalized


def _fallback(args: argparse.Namespace, code: str, message: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run(args),
        "scope": {"product": "Usage Dashboard", "profile": "VALIDATION"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {
            "phase": "usage_dashboard_adapter",
            "code": code,
            "message": " ".join(message.split())[:500],
        },
        "source": {"kind": "phase-receipt", "path": args.report},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("Usage Dashboard phase receipt missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("Usage Dashboard phase receipt exceeds 32 KiB")
    raw = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("phase receipt root must be object")
    return raw


def _validate_receipt(raw: dict[str, Any]) -> tuple[list[dict[str, str]], dict[str, int]]:
    if raw.get("schemaVersion") != 1 or raw.get("receiptKind") != "CI_PHASE_RECEIPT_V1":
        raise ValueError("phase receipt contract mismatch")
    phases = raw.get("phases")
    if not isinstance(phases, list) or len(phases) != len(EXPECTED_PHASES):
        raise ValueError("phase receipt length mismatch")
    normalized: list[dict[str, str]] = []
    for expected, item in zip(EXPECTED_PHASES, phases):
        if not isinstance(item, dict) or item.get("name") != expected:
            raise ValueError(f"phase receipt order mismatch at {expected}")
        result = item.get("result")
        if result not in PHASE_RESULTS:
            raise ValueError(f"phase receipt result invalid at {expected}")
        normalized.append({"name": expected, "result": result})

    seen_running = False
    seen_not_run = False
    for item in normalized:
        result = item["result"]
        if result == "PASS":
            if seen_running or seen_not_run:
                raise ValueError("phase receipt PASS appears after unfinished phase")
        elif result == "RUNNING":
            if seen_running or seen_not_run:
                raise ValueError("phase receipt contains multiple/out-of-order RUNNING phases")
            seen_running = True
        else:
            seen_not_run = True

    metadata = raw.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("phase receipt metadata invalid")
    normalized_metadata: dict[str, int] = {}
    for key, value in metadata.items():
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"phase receipt metadata invalid at {key}")
        normalized_metadata[str(key)] = value
    return normalized, normalized_metadata


def _phase_code(phase: str, suffix: str) -> str:
    return f"USAGE_DASHBOARD_{phase.upper()}_{suffix}"[:128]


def _phase_checks(phases: list[dict[str, str]], *, active_result: str | None, test_total: int | None) -> list[dict[str, str]]:
    checks: list[dict[str, str]] = []
    for item in phases:
        result = item["result"]
        if result == "RUNNING":
            result = active_result or "UNKNOWN"
        elif result == "NOT_RUN":
            result = "SKIPPED"
        name = item["name"]
        if name == "full_test_suite" and test_total is not None:
            name = f"full_test_suite_{test_total}_tests"
        checks.append({"name": name, "result": result})
    return checks


def adapt(
    report: dict[str, Any] | None,
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    identity_required: bool,
    identity_outcome: str,
    validation_outcome: str,
) -> dict[str, Any]:
    identity_outcome = _outcome(identity_outcome, "identity-outcome")
    validation_outcome = _outcome(validation_outcome, "validation-outcome")
    planned = len(EXPECTED_PHASES) + (1 if identity_required else 0)
    checks: list[dict[str, str]] = []
    passed = 0

    if identity_required:
        if identity_outcome == "success":
            checks.append({"name": "candidate_identity", "result": "PASS"})
            passed += 1
        elif identity_outcome == "failure":
            checks.append({"name": "candidate_identity", "result": "FAIL"})
            checks.extend({"name": phase, "result": "SKIPPED"} for phase in EXPECTED_PHASES)
            code = "USAGE_DASHBOARD_CANDIDATE_IDENTITY_FAILED"
            return {
                "schemaVersion": 1,
                "workflow": workflow,
                "run": run,
                "scope": {"product": "Usage Dashboard", "profile": "EXACT_SHA_VALIDATION"},
                "result": "FAIL",
                "counts": {"passed": 0, "total": planned, "failed": 1, "warnings": 0},
                "checks": checks,
                "reasonCodes": [code],
                "firstFailure": {"phase": "candidate_identity", "code": code, "message": "exact candidate identity check failed"},
                "source": {"kind": "workflow-step", "path": ".github/workflows/reusable-usage-dashboard-validate.yml"},
                "complete": True,
            }
        elif identity_outcome == "cancelled":
            checks.append({"name": "candidate_identity", "result": "CANCELLED"})
            checks.extend({"name": phase, "result": "SKIPPED"} for phase in EXPECTED_PHASES)
            code = "USAGE_DASHBOARD_CANDIDATE_IDENTITY_CANCELLED"
            return {
                "schemaVersion": 1,
                "workflow": workflow,
                "run": run,
                "scope": {"product": "Usage Dashboard", "profile": "EXACT_SHA_VALIDATION"},
                "result": "CANCELLED",
                "counts": {"passed": 0, "total": planned, "failed": 0, "warnings": 0},
                "checks": checks,
                "reasonCodes": [code],
                "firstFailure": {"phase": "candidate_identity", "code": code, "message": "exact candidate identity check cancelled"},
                "source": {"kind": "workflow-step", "path": ".github/workflows/reusable-usage-dashboard-validate.yml"},
                "complete": True,
            }
        else:
            raise ValueError("required candidate identity step was skipped")
    elif identity_outcome != "skipped":
        raise ValueError("candidate identity step must be skipped when candidate_sha is absent")

    if validation_outcome == "skipped":
        raise ValueError("authoritative validation step was unexpectedly skipped")
    if report is None:
        raise ValueError("Usage Dashboard phase receipt missing")

    phases, metadata = _validate_receipt(report)
    running = [item for item in phases if item["result"] == "RUNNING"]
    phase_passed = sum(1 for item in phases if item["result"] == "PASS")
    passed += phase_passed
    test_total = metadata.get("test_total")

    if validation_outcome == "success":
        if running or phase_passed != len(EXPECTED_PHASES):
            raise ValueError("successful validation contradicts phase receipt")
        checks.extend(_phase_checks(phases, active_result=None, test_total=test_total))
        return {
            "schemaVersion": 1,
            "workflow": workflow,
            "run": run,
            "scope": {"product": "Usage Dashboard", "profile": "EXACT_SHA_VALIDATION" if identity_required else "CANDIDATE_VALIDATION"},
            "result": "PASS",
            "counts": {"passed": planned, "total": planned, "failed": 0, "warnings": 0},
            "checks": checks,
            "reasonCodes": [],
            "firstFailure": None,
            "source": {"kind": "phase-receipt", "path": source_path},
            "complete": True,
        }

    if len(running) != 1:
        raise ValueError("failed/cancelled validation must leave exactly one RUNNING phase")
    active_phase = running[0]["name"]
    if validation_outcome == "failure":
        active_result = "FAIL"
        top_result = "FAIL"
        suffix = "FAILED"
        failed_count = 1
        message = "authoritative validation command failed inside this phase"
    else:
        active_result = "CANCELLED"
        top_result = "CANCELLED"
        suffix = "CANCELLED"
        failed_count = 0
        message = "authoritative validation was cancelled inside this phase"
    checks.extend(_phase_checks(phases, active_result=active_result, test_total=test_total))
    code = _phase_code(active_phase, suffix)
    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Usage Dashboard", "profile": "EXACT_SHA_VALIDATION" if identity_required else "CANDIDATE_VALIDATION"},
        "result": top_result,
        "counts": {"passed": passed, "total": planned, "failed": failed_count, "warnings": 0},
        "checks": checks,
        "reasonCodes": [code],
        "firstFailure": {"phase": active_phase, "code": code, "message": message},
        "source": {"kind": "phase-receipt", "path": source_path},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Usage Dashboard phase receipts to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="Reusable Usage Dashboard Validate")
    parser.add_argument("--identity-required", required=True)
    parser.add_argument("--identity-outcome", required=True)
    parser.add_argument("--validation-outcome", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        identity_required = _bool(args.identity_required)
        report = None
        if Path(args.report).is_file():
            report = _read(args.report)
        summary = adapt(
            report,
            workflow=args.workflow,
            run=_run(args),
            source_path=args.report,
            identity_required=identity_required,
            identity_outcome=args.identity_outcome,
            validation_outcome=args.validation_outcome,
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        text = str(exc)
        code = "USAGE_DASHBOARD_PHASE_RECEIPT_MISSING" if "missing" in text.lower() else "USAGE_DASHBOARD_SUMMARY_SOURCE_INVALID"
        summary = _fallback(args, code, text)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

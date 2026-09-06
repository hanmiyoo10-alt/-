#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

EXPECTED_PHASE = "docs_validation"
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


def _outcome(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in STEP_OUTCOMES:
        raise ValueError(f"docs-validation-outcome has invalid GitHub step outcome: {value!r}")
    return normalized


def _fallback(args: argparse.Namespace, code: str, message: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run(args),
        "scope": {"product": "PocketRisu Helper Mod", "profile": "POCKETRISU_HELPER_DOCS"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {
            "phase": "pocketrisu_helper_adapter",
            "code": code,
            "message": " ".join(message.split())[:500],
        },
        "source": {"kind": "phase-receipt", "path": args.report},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("PocketRisu Helper phase receipt missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("PocketRisu Helper phase receipt exceeds 32 KiB")
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"PocketRisu Helper phase receipt unreadable: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("PocketRisu Helper phase receipt root must be object")
    return raw


def _validate_receipt(raw: dict[str, Any]) -> str:
    if raw.get("schemaVersion") != 1 or raw.get("receiptKind") != "CI_PHASE_RECEIPT_V1":
        raise ValueError("PocketRisu Helper phase receipt contract mismatch")
    phases = raw.get("phases")
    if not isinstance(phases, list) or len(phases) != 1:
        raise ValueError("PocketRisu Helper phase receipt length mismatch")
    item = phases[0]
    if not isinstance(item, dict) or set(item) != {"name", "result"} or item.get("name") != EXPECTED_PHASE:
        raise ValueError("PocketRisu Helper phase receipt phase mismatch")
    result = item.get("result")
    if result not in PHASE_RESULTS:
        raise ValueError("PocketRisu Helper phase receipt result invalid")
    if not isinstance(raw.get("metadata"), dict):
        raise ValueError("PocketRisu Helper phase receipt metadata invalid")
    return result


def adapt(
    report: dict[str, Any],
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    step_outcome: str,
) -> dict[str, Any]:
    phase_result = _validate_receipt(report)
    outcome = _outcome(step_outcome)
    base = {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "PocketRisu Helper Mod", "profile": "POCKETRISU_HELPER_DOCS"},
        "source": {"kind": "phase-receipt", "path": source_path},
    }

    if phase_result == "PASS":
        if outcome != "success":
            raise ValueError("PocketRisu Helper successful receipt contradicts step outcome")
        return {
            **base,
            "result": "PASS",
            "counts": {"passed": 1, "total": 1, "failed": 0, "warnings": 0},
            "checks": [{"name": EXPECTED_PHASE, "result": "PASS"}],
            "reasonCodes": [],
            "firstFailure": None,
            "complete": True,
        }

    if phase_result != "RUNNING":
        raise ValueError("PocketRisu Helper incomplete receipt must contain RUNNING docs_validation phase")

    if outcome == "failure":
        result = "FAIL"
        check_result = "FAIL"
        code = "POCKETRISU_HELPER_DOCS_VALIDATION_FAILED"
        failed = 1
        message = "authoritative PocketRisu helper docs validation command failed"
    elif outcome == "cancelled":
        result = "CANCELLED"
        check_result = "CANCELLED"
        code = "POCKETRISU_HELPER_DOCS_VALIDATION_CANCELLED"
        failed = 0
        message = "authoritative PocketRisu helper docs validation command was cancelled"
    else:
        raise ValueError("PocketRisu Helper RUNNING phase must have failure or cancelled outcome")

    return {
        **base,
        "result": result,
        "counts": {"passed": 0, "total": 1, "failed": failed, "warnings": 0},
        "checks": [{"name": EXPECTED_PHASE, "result": check_result}],
        "reasonCodes": [code],
        "firstFailure": {"phase": EXPECTED_PHASE, "code": code, "message": message},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt PocketRisu Helper docs phase receipt to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="PocketRisu helper docs")
    parser.add_argument("--docs-validation-outcome", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        report = _read(args.report)
        summary = adapt(
            report,
            workflow=args.workflow,
            run=_run(args),
            source_path=args.report,
            step_outcome=args.docs_validation_outcome,
        )
    except ValueError as exc:
        text = str(exc)
        code = (
            "POCKETRISU_HELPER_PHASE_RECEIPT_MISSING"
            if "missing" in text.lower()
            else "POCKETRISU_HELPER_SUMMARY_SOURCE_INVALID"
        )
        summary = _fallback(args, code, text)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

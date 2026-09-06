#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

EXPECTED_PHASES = ("syntax_check", "unit_tests")
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


def _outcome(value: str, name: str) -> str:
    normalized = value.strip().lower()
    if normalized not in STEP_OUTCOMES:
        raise ValueError(f"{name} has invalid GitHub step outcome: {value!r}")
    return normalized


def _fallback(args: argparse.Namespace, code: str, message: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run(args),
        "scope": {"product": "Termux Response Watch", "profile": "TERMUX_RESPONSE_WATCH"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {
            "phase": "termux_response_watch_adapter",
            "code": code,
            "message": " ".join(message.split())[:500],
        },
        "source": {"kind": "phase-receipt", "path": args.report},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("Termux Response Watch phase receipt missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("Termux Response Watch phase receipt exceeds 32 KiB")
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Termux Response Watch phase receipt unreadable: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("Termux Response Watch phase receipt root must be object")
    return raw


def _validate_receipt(raw: dict[str, Any]) -> dict[str, str]:
    if raw.get("schemaVersion") != 1 or raw.get("receiptKind") != "CI_PHASE_RECEIPT_V1":
        raise ValueError("Termux Response Watch phase receipt contract mismatch")
    phases = raw.get("phases")
    if not isinstance(phases, list) or len(phases) != len(EXPECTED_PHASES):
        raise ValueError("Termux Response Watch phase receipt length mismatch")
    observed: dict[str, str] = {}
    for expected, item in zip(EXPECTED_PHASES, phases, strict=True):
        if not isinstance(item, dict) or set(item) != {"name", "result"} or item.get("name") != expected:
            raise ValueError("Termux Response Watch phase receipt phase mismatch")
        result = item.get("result")
        if result not in PHASE_RESULTS:
            raise ValueError("Termux Response Watch phase receipt result invalid")
        observed[expected] = result
    if not isinstance(raw.get("metadata"), dict):
        raise ValueError("Termux Response Watch phase receipt metadata invalid")
    return observed


def adapt(
    report: dict[str, Any],
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    syntax_outcome: str,
    unit_outcome: str,
) -> dict[str, Any]:
    phases = _validate_receipt(report)
    outcomes = {
        "syntax_check": _outcome(syntax_outcome, "syntax-check-outcome"),
        "unit_tests": _outcome(unit_outcome, "unit-tests-outcome"),
    }
    base = {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Termux Response Watch", "profile": "TERMUX_RESPONSE_WATCH"},
        "source": {"kind": "phase-receipt", "path": source_path},
    }

    active = [index for index, name in enumerate(EXPECTED_PHASES) if phases[name] == "RUNNING"]
    if len(active) > 1:
        raise ValueError("Termux Response Watch phase receipt has multiple RUNNING phases")

    if not active:
        if any(phases[name] != "PASS" for name in EXPECTED_PHASES):
            raise ValueError("Termux Response Watch incomplete receipt has no active failure phase")
        for phase in EXPECTED_PHASES:
            if outcomes[phase] != "success":
                raise ValueError(f"Termux Response Watch PASS {phase} contradicts step outcome")
        return {
            **base,
            "result": "PASS",
            "counts": {"passed": 2, "total": 2, "failed": 0, "warnings": 0},
            "checks": [{"name": phase, "result": "PASS"} for phase in EXPECTED_PHASES],
            "reasonCodes": [],
            "firstFailure": None,
            "complete": True,
        }

    index = active[0]
    phase = EXPECTED_PHASES[index]
    prior = EXPECTED_PHASES[:index]
    later = EXPECTED_PHASES[index + 1 :]
    if any(phases[name] != "PASS" for name in prior):
        raise ValueError("Termux Response Watch RUNNING phase has incomplete predecessor")
    if any(phases[name] != "NOT_RUN" for name in later):
        raise ValueError("Termux Response Watch RUNNING phase has executed successor")
    if any(outcomes[name] != "success" for name in prior):
        raise ValueError("Termux Response Watch passed predecessor contradicts step outcome")
    if any(outcomes[name] != "skipped" for name in later):
        raise ValueError("Termux Response Watch NOT_RUN successor contradicts step outcome")

    outcome = outcomes[phase]
    if outcome == "failure":
        result = "FAIL"
        check_result = "FAIL"
        code = f"TERMUX_RESPONSE_WATCH_{phase.upper()}_FAILED"
        failed = 1
        message = f"authoritative Termux Response Watch {phase} command failed"
    elif outcome == "cancelled":
        result = "CANCELLED"
        check_result = "CANCELLED"
        code = f"TERMUX_RESPONSE_WATCH_{phase.upper()}_CANCELLED"
        failed = 0
        message = f"authoritative Termux Response Watch {phase} command was cancelled"
    else:
        raise ValueError("Termux Response Watch RUNNING phase must have failure or cancelled outcome")

    checks = [{"name": name, "result": "PASS"} for name in prior]
    checks.append({"name": phase, "result": check_result})
    checks.extend({"name": name, "result": "NOT_RUN"} for name in later)
    return {
        **base,
        "result": result,
        "counts": {"passed": index, "total": len(EXPECTED_PHASES), "failed": failed, "warnings": 0},
        "checks": checks,
        "reasonCodes": [code],
        "firstFailure": {"phase": phase, "code": code, "message": message},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Termux Response Watch phase receipt to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="Termux Response Watch")
    parser.add_argument("--syntax-check-outcome", required=True)
    parser.add_argument("--unit-tests-outcome", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        summary = adapt(
            _read(args.report),
            workflow=args.workflow,
            run=_run(args),
            source_path=args.report,
            syntax_outcome=args.syntax_check_outcome,
            unit_outcome=args.unit_tests_outcome,
        )
    except ValueError as exc:
        text = str(exc)
        code = (
            "TERMUX_RESPONSE_WATCH_PHASE_RECEIPT_MISSING"
            if "missing" in text.lower()
            else "TERMUX_RESPONSE_WATCH_SUMMARY_SOURCE_INVALID"
        )
        summary = _fallback(args, code, text)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

EXPECTED_PHASES = [
    "python_compile",
    "skill_unit_tests",
    "live_eval_harness",
    "orchestrator_contracts",
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
        "scope": {"product": "Agent Skills", "profile": "AGENT_SKILLS_CI"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {
            "phase": "agent_skills_adapter",
            "code": code,
            "message": " ".join(message.split())[:500],
        },
        "source": {"kind": "phase-receipt", "path": args.report},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("Agent Skills phase receipt missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("Agent Skills phase receipt exceeds 32 KiB")
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Agent Skills phase receipt unreadable: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("Agent Skills phase receipt root must be object")
    return raw


def _validate_receipt(raw: dict[str, Any]) -> list[dict[str, str]]:
    if raw.get("schemaVersion") != 1 or raw.get("receiptKind") != "CI_PHASE_RECEIPT_V1":
        raise ValueError("Agent Skills phase receipt contract mismatch")
    phases = raw.get("phases")
    if not isinstance(phases, list) or len(phases) != len(EXPECTED_PHASES):
        raise ValueError("Agent Skills phase receipt length mismatch")
    normalized: list[dict[str, str]] = []
    for expected, item in zip(EXPECTED_PHASES, phases):
        if not isinstance(item, dict) or item.get("name") != expected:
            raise ValueError(f"Agent Skills phase receipt order mismatch at {expected}")
        result = item.get("result")
        if result not in PHASE_RESULTS:
            raise ValueError(f"Agent Skills phase receipt result invalid at {expected}")
        normalized.append({"name": expected, "result": result})
    metadata = raw.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("Agent Skills phase receipt metadata invalid")

    seen_running = False
    seen_not_run = False
    for item in normalized:
        result = item["result"]
        if result == "PASS":
            if seen_running or seen_not_run:
                raise ValueError("Agent Skills PASS appears after unfinished phase")
        elif result == "RUNNING":
            if seen_running or seen_not_run:
                raise ValueError("Agent Skills receipt contains multiple/out-of-order RUNNING phases")
            seen_running = True
        else:
            seen_not_run = True
    return normalized


def _code(phase: str, suffix: str) -> str:
    return f"AGENT_SKILLS_{phase.upper()}_{suffix}"[:128]


def adapt(
    report: dict[str, Any],
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    step_outcomes: dict[str, str],
) -> dict[str, Any]:
    phases = _validate_receipt(report)
    outcomes = {
        name: _outcome(step_outcomes.get(name, ""), f"{name}-outcome")
        for name in EXPECTED_PHASES
    }
    passed = sum(1 for item in phases if item["result"] == "PASS")
    running = [item for item in phases if item["result"] == "RUNNING"]

    if passed == len(EXPECTED_PHASES):
        if any(outcomes[name] != "success" for name in EXPECTED_PHASES):
            raise ValueError("Agent Skills successful receipt contradicts step outcomes")
        return {
            "schemaVersion": 1,
            "workflow": workflow,
            "run": run,
            "scope": {"product": "Agent Skills", "profile": "AGENT_SKILLS_CI"},
            "result": "PASS",
            "counts": {"passed": passed, "total": len(EXPECTED_PHASES), "failed": 0, "warnings": 0},
            "checks": [{"name": item["name"], "result": "PASS"} for item in phases],
            "reasonCodes": [],
            "firstFailure": None,
            "source": {"kind": "phase-receipt", "path": source_path},
            "complete": True,
        }

    if len(running) != 1:
        raise ValueError("Agent Skills incomplete receipt must contain exactly one RUNNING phase")
    active = running[0]["name"]
    active_index = EXPECTED_PHASES.index(active)
    if passed != active_index:
        raise ValueError("Agent Skills passed count does not align with active phase")
    for name in EXPECTED_PHASES[:active_index]:
        if outcomes[name] != "success":
            raise ValueError("Agent Skills completed phase contradicts step outcome")
    active_outcome = outcomes[active]
    for name in EXPECTED_PHASES[active_index + 1 :]:
        if outcomes[name] != "skipped":
            raise ValueError("Agent Skills later phase must be skipped after terminal active phase")

    if active_outcome == "failure":
        result = "FAIL"
        suffix = "FAILED"
        active_result = "FAIL"
        failed = 1
        message = "authoritative Agent Skills CI command failed inside this phase"
    elif active_outcome == "cancelled":
        result = "CANCELLED"
        suffix = "CANCELLED"
        active_result = "CANCELLED"
        failed = 0
        message = "authoritative Agent Skills CI command was cancelled inside this phase"
    else:
        raise ValueError("Agent Skills RUNNING phase must have failure or cancelled outcome")

    code = _code(active, suffix)
    checks: list[dict[str, str]] = []
    for item in phases:
        phase_result = item["result"]
        if item["name"] == active:
            phase_result = active_result
        elif phase_result == "NOT_RUN":
            phase_result = "SKIPPED"
        checks.append({"name": item["name"], "result": phase_result})
    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Agent Skills", "profile": "AGENT_SKILLS_CI"},
        "result": result,
        "counts": {"passed": passed, "total": len(EXPECTED_PHASES), "failed": failed, "warnings": 0},
        "checks": checks,
        "reasonCodes": [code],
        "firstFailure": {"phase": active, "code": code, "message": message},
        "source": {"kind": "phase-receipt", "path": source_path},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Agent Skills phase receipt to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="Agent Skills CI")
    for phase in EXPECTED_PHASES:
        parser.add_argument(f"--{phase.replace('_', '-')}-outcome", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        report = _read(args.report)
        outcomes = {
            phase: getattr(args, f"{phase}_outcome")
            for phase in EXPECTED_PHASES
        }
        summary = adapt(
            report,
            workflow=args.workflow,
            run=_run(args),
            source_path=args.report,
            step_outcomes=outcomes,
        )
    except ValueError as exc:
        text = str(exc)
        code = "AGENT_SKILLS_PHASE_RECEIPT_MISSING" if "missing" in text.lower() else "AGENT_SKILLS_SUMMARY_SOURCE_INVALID"
        summary = _fallback(args, code, text)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

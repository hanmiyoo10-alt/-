#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

PHASES = ("install", "compile", "unit_tests")
STEP_OUTCOMES = {"success", "failure", "cancelled", "skipped"}


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


def _outcome(value: str, phase: str) -> str:
    normalized = value.strip().lower()
    if normalized not in STEP_OUTCOMES:
        raise ValueError(f"{phase} has invalid GitHub step outcome: {value!r}")
    return normalized


def _code(phase: str, suffix: str) -> str:
    return f"REPOSITORY_READ_MCP_{phase.upper()}_{suffix}"[:128]


def adapt(*, workflow: str, run: dict[str, Any], step_outcomes: dict[str, str]) -> dict[str, Any]:
    outcomes = {phase: _outcome(step_outcomes.get(phase, ""), phase) for phase in PHASES}
    checks: list[dict[str, str]] = []
    passed = 0
    terminal: tuple[str, str] | None = None

    for phase in PHASES:
        outcome = outcomes[phase]
        if terminal is None:
            if outcome == "success":
                passed += 1
                checks.append({"name": phase, "result": "PASS"})
                continue
            if outcome in {"failure", "cancelled"}:
                result = "FAIL" if outcome == "failure" else "CANCELLED"
                terminal = (phase, result)
                checks.append({"name": phase, "result": result})
                continue
            raise ValueError(f"{phase} was skipped before a terminal failure/cancellation")
        if outcome != "skipped":
            raise ValueError(f"{phase} must be skipped after terminal phase {terminal[0]}")
        checks.append({"name": phase, "result": "SKIPPED"})

    reason_codes: list[str] = []
    first_failure = None
    failed = 0
    if terminal is None:
        result = "PASS"
    else:
        phase, result = terminal
        suffix = "FAILED" if result == "FAIL" else "CANCELLED"
        code = _code(phase, suffix)
        reason_codes = [code]
        failed = 1 if result == "FAIL" else 0
        first_failure = {
            "phase": phase,
            "code": code,
            "message": f"authoritative Repository Read MCP CI {phase} step {result.lower()}",
        }

    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Repository", "profile": "REPOSITORY_READ_MCP_CI"},
        "result": result,
        "counts": {"passed": passed, "total": len(PHASES), "failed": failed, "warnings": 0},
        "checks": checks,
        "reasonCodes": reason_codes,
        "firstFailure": first_failure,
        "source": {"kind": "github-step-outcomes", "path": ".github/workflows/repository-read-mcp-ci.yml"},
        "complete": True,
    }


def _fallback(args: argparse.Namespace, message: str) -> dict[str, Any]:
    code = "REPOSITORY_READ_MCP_SUMMARY_SOURCE_INVALID"
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run(args),
        "scope": {"product": "Repository", "profile": "REPOSITORY_READ_MCP_CI"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": len(PHASES), "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {"phase": "repository_read_mcp_adapter", "code": code, "message": " ".join(message.split())[:500]},
        "source": {"kind": "github-step-outcomes", "path": ".github/workflows/repository-read-mcp-ci.yml"},
        "complete": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Repository Read MCP GitHub step outcomes to CI_SUMMARY_V1")
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="Repository Read MCP CI")
    for phase in PHASES:
        parser.add_argument(f"--{phase.replace('_', '-')}-outcome", required=True)
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        summary = adapt(
            workflow=args.workflow,
            run=_run(args),
            step_outcomes={phase: getattr(args, f"{phase}_outcome") for phase in PHASES},
        )
    except ValueError as exc:
        summary = _fallback(args, str(exc))
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

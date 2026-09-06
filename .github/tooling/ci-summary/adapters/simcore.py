#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

MAX_REPORT_BYTES = 256 * 1024
ALLOWED_CONCLUSIONS = {"PASS", "NOOP", "FAIL", "INFRA_ERROR"}
ALLOWED_GATE_STATUS = {"PASS", "FAIL", "INFRA_ERROR", "PENDING", "NOT_APPLICABLE"}


def _clean(value: Any, limit: int = 400) -> str:
    text = " ".join(str(value or "").replace("\x00", "").split())
    if len(text) > limit:
        return text[: limit - 1] + "…"
    return text


def _run_metadata(args: argparse.Namespace) -> dict[str, Any]:
    attempt_raw = args.attempt or os.environ.get("GITHUB_RUN_ATTEMPT") or "0"
    try:
        attempt = int(attempt_raw)
    except ValueError:
        attempt = 0
    return {
        "id": args.run_id or os.environ.get("GITHUB_RUN_ID") or "UNKNOWN",
        "attempt": max(0, attempt),
        "event": args.event or os.environ.get("GITHUB_EVENT_NAME") or "UNKNOWN",
        "sha": args.sha or os.environ.get("GITHUB_SHA") or "UNKNOWN",
    }


def _fallback(args: argparse.Namespace, code: str, message: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run_metadata(args),
        "scope": {"product": "SimCore", "profile": "UNKNOWN"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {"phase": "simcore_adapter", "code": code, "message": _clean(message)},
        "source": {"kind": "report", "path": args.report},
        "complete": False,
    }


def _read_report(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("SimCore report missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("SimCore report exceeds 256 KiB authority bound")
    try:
        value = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"SimCore report unreadable: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError("SimCore report root must be an object")
    return value


def adapt_report(report: dict[str, Any], *, workflow: str, run: dict[str, Any], source_path: str) -> dict[str, Any]:
    if report.get("schemaVersion") != 1:
        raise ValueError("unsupported SimCore report schemaVersion")
    profile = report.get("profile")
    if not isinstance(profile, str) or not profile:
        raise ValueError("SimCore report profile missing")
    conclusion = report.get("conclusion")
    if conclusion not in ALLOWED_CONCLUSIONS:
        raise ValueError("SimCore report conclusion invalid")
    reason_codes = report.get("reasonCodes")
    if not isinstance(reason_codes, list) or not all(isinstance(x, str) and x for x in reason_codes):
        raise ValueError("SimCore report reasonCodes invalid")
    gates = report.get("gates")
    if not isinstance(gates, list):
        raise ValueError("SimCore report gates invalid")

    planned: list[dict[str, Any]] = []
    for index, gate in enumerate(gates):
        if not isinstance(gate, dict):
            raise ValueError(f"SimCore gate {index} invalid")
        if not gate.get("planned"):
            continue
        gate_id = gate.get("id")
        status = gate.get("status")
        if not isinstance(gate_id, str) or not gate_id:
            raise ValueError(f"SimCore gate {index} id invalid")
        if status not in ALLOWED_GATE_STATUS or status in {"PENDING", "NOT_APPLICABLE"}:
            raise ValueError(f"SimCore planned gate {gate_id} has non-terminal status")
        planned.append(gate)

    failures = [gate for gate in planned if gate.get("status") in {"FAIL", "INFRA_ERROR"}]
    if conclusion == "PASS" and failures:
        raise ValueError("SimCore report contradiction: PASS with failed planned gate")
    if conclusion == "NOOP" and planned:
        raise ValueError("SimCore report contradiction: NOOP with planned gates")
    if conclusion in {"FAIL", "INFRA_ERROR"} and not failures:
        raise ValueError("SimCore report contradiction: failed conclusion without failed planned gate")

    checks = []
    for gate in planned:
        name = str(gate["id"])
        if name.startswith("GATE_"):
            name = name[5:]
        checks.append({"name": name.lower(), "result": str(gate["status"])})

    passed = sum(1 for gate in planned if gate.get("status") == "PASS")
    failed = len(planned) - passed
    observations = report.get("observationIds")
    warning_count = len(observations) if isinstance(observations, list) else 0

    first_failure = None
    if failures:
        gate = failures[0]
        code = gate.get("reasonCode") or (reason_codes[0] if reason_codes else "SIMCORE_GATE_FAILURE")
        first_failure = {"phase": str(gate.get("id") or "simcore_gate"), "code": str(code)}
        details = report.get("details")
        if isinstance(details, dict):
            detail = details.get(gate.get("id"))
            if isinstance(detail, dict) and detail.get("stderr"):
                first_failure["message"] = _clean(detail.get("stderr"))

    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "SimCore", "profile": profile},
        "result": conclusion,
        "counts": {"passed": passed, "total": len(planned), "failed": failed, "warnings": warning_count},
        "checks": checks,
        "reasonCodes": reason_codes,
        "firstFailure": first_failure,
        "source": {"kind": "report", "path": source_path},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt SimCore bounded CI report to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="SimCore CI")
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)

    try:
        report = _read_report(args.report)
        summary = adapt_report(report, workflow=args.workflow, run=_run_metadata(args), source_path=args.report)
    except ValueError as exc:
        code = "SIMCORE_REPORT_MISSING" if "missing" in str(exc).lower() else "SIMCORE_REPORT_INVALID"
        summary = _fallback(args, code, str(exc))

    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

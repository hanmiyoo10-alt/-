#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

MAX_REPORT_BYTES = 128 * 1024
TERMINAL = {"PASS", "FAIL", "INFRA_ERROR", "NOT_RUN"}


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


def _fallback(args: argparse.Namespace, code: str, message: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": args.workflow,
        "run": _run(args),
        "scope": {"product": "Repository", "profile": "PLUGIN_CONTROL_PLANE"},
        "result": "INFRA_ERROR",
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {"phase": "plugin_control_plane_adapter", "code": code, "message": " ".join(message.split())[:500]},
        "source": {"kind": "receipt", "path": args.report},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("Plugin Control Plane receipt missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("Plugin Control Plane receipt exceeds 128 KiB")
    raw = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("receipt root must be object")
    return raw


def _reason_for(name: str, status: str) -> str:
    safe = "".join(ch if ch.isalnum() else "_" for ch in name.upper()).strip("_")
    prefix = "PLUGIN_CONTROL_PLANE_INFRA" if status == "INFRA_ERROR" else "PLUGIN_CONTROL_PLANE_CONTRACT"
    return f"{prefix}_{safe}"[:128]


def adapt(report: dict[str, Any], *, workflow: str, run: dict[str, Any], source_path: str) -> dict[str, Any]:
    if report.get("schemaVersion") != 1:
        raise ValueError("receipt schemaVersion invalid")
    if report.get("failFast") is not True:
        raise ValueError("receipt must declare failFast=true")
    result = report.get("result")
    if result not in {"PASS", "FAIL", "INFRA_ERROR"}:
        raise ValueError("receipt result non-terminal")
    planned = report.get("plannedCount")
    completed = report.get("completedCount")
    checks = report.get("checks")
    if isinstance(planned, bool) or not isinstance(planned, int) or planned < 1:
        raise ValueError("plannedCount invalid")
    if isinstance(completed, bool) or not isinstance(completed, int) or not 0 <= completed <= planned:
        raise ValueError("completedCount invalid")
    if not isinstance(checks, list) or len(checks) != planned:
        raise ValueError("receipt checks length mismatch")

    executed: list[dict[str, str]] = []
    failures: list[dict[str, Any]] = []
    passed = 0
    for index, item in enumerate(checks):
        if not isinstance(item, dict) or not isinstance(item.get("name"), str) or not item["name"]:
            raise ValueError(f"receipt check {index} invalid")
        status = item.get("status")
        if status not in TERMINAL:
            raise ValueError(f"receipt check {item['name']} status invalid")
        if index < completed and status == "NOT_RUN":
            raise ValueError("completed prefix contains NOT_RUN")
        if index >= completed and status != "NOT_RUN":
            raise ValueError("uncompleted suffix must be NOT_RUN")
        if status != "NOT_RUN":
            executed.append({"name": item["name"], "result": status})
        if status == "PASS":
            passed += 1
        elif status in {"FAIL", "INFRA_ERROR"}:
            failures.append(item)

    if result == "PASS" and (completed != planned or failures or passed != planned):
        raise ValueError("PASS receipt contradicts checks")
    if result in {"FAIL", "INFRA_ERROR"}:
        if len(failures) != 1 or completed < 1 or failures[0] is not checks[completed - 1]:
            raise ValueError("failed receipt must stop at exactly one terminal failure")
        if failures[0]["status"] != result:
            raise ValueError("receipt result does not match first failure status")

    reason_codes: list[str] = []
    first_failure = None
    if failures:
        failed = failures[0]
        code = _reason_for(failed["name"], failed["status"])
        reason_codes = [code]
        first_failure = {"phase": failed["name"], "code": code, "message": f"exit code {failed.get('exitCode')}"}

    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Repository", "profile": "PLUGIN_CONTROL_PLANE"},
        "result": result,
        "counts": {"passed": passed, "total": planned, "failed": len(failures), "warnings": 0},
        "checks": executed,
        "reasonCodes": reason_codes,
        "firstFailure": first_failure,
        "source": {"kind": "receipt", "path": source_path},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Plugin Control Plane fail-fast receipts to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workflow", default="Plugin Control Plane CI")
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)
    try:
        summary = adapt(_read(args.report), workflow=args.workflow, run=_run(args), source_path=args.report)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        code = "PLUGIN_CONTROL_PLANE_RECEIPT_MISSING" if "missing" in str(exc).lower() else "PLUGIN_CONTROL_PLANE_RECEIPT_INVALID"
        summary = _fallback(args, code, str(exc))
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

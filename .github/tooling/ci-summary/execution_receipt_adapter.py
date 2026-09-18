#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

MAX_REPORT_BYTES = 128 * 1024
MAX_CHECKS = 200
MAX_TEXT = 160
MAX_LOCATOR = 300
MAX_ATTENTION_STEPS = 23
ALLOWED_RESULTS = {"RUNNING", "PASS", "FAIL", "INFRA_ERROR"}
ALLOWED_CHECK_STATUS = {"NOT_RUN", "PASS", "FAIL", "INFRA_ERROR"}
SAFE_ID = re.compile(r"[^a-z0-9._:-]+")


def _text(value: Any, field: str, limit: int = MAX_TEXT) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} missing")
    text = value.strip()
    if len(text) > limit:
        raise ValueError(f"{field} too long")
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in text):
        raise ValueError(f"{field} contains control characters")
    return text


def _slug(text: str) -> str:
    value = SAFE_ID.sub("-", text.lower()).strip("-")
    if not value:
        raise ValueError("suite cannot form operation id")
    return value[:120]
def _load_report(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file() or source.is_symlink():
        raise ValueError("report must be a regular non-symlink file")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("report exceeds 128 KiB")
    raw = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("schemaVersion") != 1:
        raise ValueError("report schemaVersion must equal 1")

    suite = _text(raw.get("suite"), "suite")
    result = raw.get("result")
    if result not in ALLOWED_RESULTS:
        raise ValueError("report result invalid")

    planned = raw.get("plannedCount")
    completed = raw.get("completedCount")
    checks = raw.get("checks")
    if not isinstance(planned, int) or planned < 1 or planned > MAX_CHECKS:
        raise ValueError("plannedCount invalid")
    if not isinstance(completed, int) or completed < 0 or completed > planned:
        raise ValueError("completedCount invalid")
    if not isinstance(checks, list) or len(checks) != planned:
        raise ValueError("checks must match plannedCount")

    normalized: list[dict[str, Any]] = []
    for index, check in enumerate(checks):
        if not isinstance(check, dict):
            raise ValueError(f"check {index} must be object")
        name = _text(check.get("name"), f"check[{index}].name")
        status = check.get("status")
        exit_code = check.get("exitCode")
        if status not in ALLOWED_CHECK_STATUS:
            raise ValueError(f"check {index} status invalid")
        if exit_code is not None and not isinstance(exit_code, int):
            raise ValueError(f"check {index} exitCode invalid")
        normalized.append({"name": name, "status": status, "exitCode": exit_code})
    actual_completed = sum(1 for item in normalized if item["status"] != "NOT_RUN")
    if actual_completed != completed:
        raise ValueError("completedCount conflicts with checks")

    if result == "RUNNING" and completed >= planned:
        raise ValueError("RUNNING report cannot be complete")
    if result == "PASS" and (
        completed != planned or any(item["status"] != "PASS" for item in normalized)
    ):
        raise ValueError("PASS report conflicts with checks")
    if result == "FAIL" and not any(item["status"] == "FAIL" for item in normalized):
        raise ValueError("FAIL report lacks failed check")
    if result == "INFRA_ERROR" and not any(
        item["status"] == "INFRA_ERROR" for item in normalized
    ):
        raise ValueError("INFRA_ERROR report lacks infra-error check")

    first_failure = raw.get("firstFailure")
    if result in {"FAIL", "INFRA_ERROR"}:
        if not isinstance(first_failure, dict):
            raise ValueError("terminal failure report lacks firstFailure")
        _text(first_failure.get("name"), "firstFailure.name")
    elif first_failure is not None:
        raise ValueError("non-failure report must not include firstFailure")

    return {
        "schemaVersion": 1,
        "suite": suite,
        "result": result,
        "plannedCount": planned,
        "completedCount": completed,
        "checks": normalized,
    }
def _map_check_status(status: str) -> str:
    return {
        "PASS": "PASS",
        "FAIL": "FAIL",
        "INFRA_ERROR": "BLOCKED",
        "NOT_RUN": "SKIPPED",
    }[status]


def _result_mapping(result: str) -> tuple[str, str, list[str], list[str], str]:
    if result == "RUNNING":
        return "RUNNING", "PARTIAL", ["RUNNER_IN_PROGRESS"], [], "WAIT_OR_RECHECK_RUNNER"
    if result == "PASS":
        return "COMPLETE", "PASS", [], [], "INTERPRET_RECEIPT"
    if result == "FAIL":
        return "COMPLETE", "FAIL", ["CHECK_FAILED"], [], "DRILL_DOWN_FIRST_FAILURE"
    return (
        "BLOCKED",
        "BLOCKED",
        ["RUNNER_INFRA_ERROR"],
        ["RUNNER_COMMAND_LAUNCH_BLOCKED"],
        "RESOLVE_RUNNER_INFRA_ERROR",
    )


def build_facts(
    report: dict[str, Any],
    *,
    source_kind: str,
    source_locator: str,
    source_identity: str,
    execution_surface: str,
    artifact_locator: str,
) -> dict[str, Any]:
    source_kind = _text(source_kind, "source-kind")
    source_locator = _text(source_locator, "source-locator", MAX_LOCATOR)
    source_identity = _text(source_identity, "source-identity", MAX_LOCATOR)
    execution_surface = _text(execution_surface, "execution-surface")
    artifact_locator = _text(artifact_locator, "artifact-locator", MAX_LOCATOR)

    attention, result, reasons, blockers, next_action = _result_mapping(report["result"])
    counts = {
        status: sum(1 for item in report["checks"] if item["status"] == status)
        for status in ALLOWED_CHECK_STATUS
    }
    attention_checks = [
        (index, item)
        for index, item in enumerate(report["checks"])
        if item["status"] in {"FAIL", "INFRA_ERROR"}
    ]
    if len(attention_checks) > MAX_ATTENTION_STEPS:
        raise ValueError("attention checks exceed bounded receipt capacity")

    summary_result = {
        "RUNNING": "PARTIAL",
        "PASS": "PASS",
        "FAIL": "FAIL",
        "INFRA_ERROR": "BLOCKED",
    }[report["result"]]
    steps = [{
        "name": f"suite:{_slug(report['suite'])}",
        "result": summary_result,
        "evidenceLocator": artifact_locator,
    }]
    for index, item in attention_checks:
        steps.append({
            "name": item["name"],
            "result": _map_check_status(item["status"]),
            "evidenceLocator": f"{artifact_locator}#check:{index}",
        })

    exit_code = None
    for _, item in attention_checks:
        if item["exitCode"] is not None:
            exit_code = item["exitCode"]
            break

    return {
        "schemaVersion": 1,
        "operationId": f"manifest-suite:{_slug(report['suite'])}",
        "primitiveId": "ci-summary:receipt-runner",
        "sourceIdentity": {
            "kind": source_kind,
            "locator": source_locator,
            "identity": source_identity,
        },
        "executionSurface": execution_surface,
        "stage": "MANIFEST_SUITE",
        "attentionState": attention,
        "result": result,
        "proofScope": "manifest-driven repository check suite execution only",
        "steps": steps,
        "counters": [
            {"name": "planned", "value": report["plannedCount"]},
            {"name": "completed", "value": report["completedCount"]},
            {"name": "passed", "value": counts["PASS"]},
            {"name": "failed", "value": counts["FAIL"]},
            {"name": "infra_error", "value": counts["INFRA_ERROR"]},
            {"name": "not_run", "value": counts["NOT_RUN"]},
        ],
        "affectedFiles": [],
        "artifactLocators": [artifact_locator],
        "reasonCodes": reasons,
        "requiredUnknowns": [],
        "conflicts": [],
        "blockers": blockers,
        "exitCode": exit_code,
        "nextLegalAction": next_action,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Translate ci-summary receipt-runner reports into execution-receipt facts"
    )
    parser.add_argument("--report", required=True)
    parser.add_argument("--source-kind", required=True)
    parser.add_argument("--source-locator", required=True)
    parser.add_argument("--source-identity", required=True)
    parser.add_argument("--execution-surface", required=True)
    parser.add_argument("--artifact-locator", required=True)
    parser.add_argument("--output")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        report = _load_report(args.report)
        facts = build_facts(
            report,
            source_kind=args.source_kind,
            source_locator=args.source_locator,
            source_identity=args.source_identity,
            execution_surface=args.execution_surface,
            artifact_locator=args.artifact_locator,
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"EXECUTION_RECEIPT_ADAPTER_ERROR:{exc}", file=sys.stderr)
        return 2
    rendered = json.dumps(facts, indent=2, sort_keys=True) + "\n"
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

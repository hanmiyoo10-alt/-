#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

MAX_REPORT_BYTES = 64 * 1024
STEP_OUTCOMES = {"success", "failure", "cancelled", "skipped"}
STATE_VALUES = {"COMPLETE", "PARTIAL"}
MODE = "CANONICAL_MAIN_PROOF_BUNDLE"
SHA40_RE = re.compile(r"^[0-9a-f]{40}$")


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
        raise ValueError(f"proof-outcome has invalid GitHub step outcome: {value!r}")
    return normalized


def _clean(value: Any, limit: int = 500) -> str:
    text = " ".join(str(value or "").replace("\x00", "").split())
    return text[:limit]


def _fallback(
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    result: str,
    code: str,
    message: str,
) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Repository", "profile": MODE},
        "result": result,
        "counts": {"passed": 0, "total": 0, "failed": 0, "warnings": 0},
        "checks": [],
        "reasonCodes": [code],
        "firstFailure": {
            "phase": "canonical_main_proof_bundle",
            "code": code,
            "message": _clean(message),
        },
        "source": {"kind": "report", "path": source_path},
        "complete": False,
    }


def _read(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError("Canonical Main proof bundle missing")
    if source.stat().st_size > MAX_REPORT_BYTES:
        raise ValueError("Canonical Main proof bundle exceeds 64 KiB")
    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Canonical Main proof bundle unreadable: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("Canonical Main proof bundle root must be object")
    return raw


def _codes(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"Canonical Main proof bundle {field} must be array")
    out: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item or len(item) > 128:
            raise ValueError(f"Canonical Main proof bundle {field}[{index}] invalid")
        out.append(item)
    return list(dict.fromkeys(out))


def _validate(bundle: dict[str, Any], *, run_sha: str) -> tuple[str, bool, list[str], list[str]]:
    if bundle.get("schemaVersion") != 1:
        raise ValueError("Canonical Main proof bundle schemaVersion invalid")
    if bundle.get("mode") != MODE:
        raise ValueError("Canonical Main proof bundle mode invalid")

    state = bundle.get("state")
    if state not in STATE_VALUES:
        raise ValueError("Canonical Main proof bundle state invalid")
    acceptance_ready = bundle.get("acceptanceReady")
    if not isinstance(acceptance_ready, bool):
        raise ValueError("Canonical Main proof bundle acceptanceReady invalid")

    target_sha = bundle.get("targetSha")
    if not isinstance(target_sha, str) or not SHA40_RE.fullmatch(target_sha):
        raise ValueError("Canonical Main proof bundle targetSha invalid")
    if SHA40_RE.fullmatch(run_sha or "") and target_sha != run_sha:
        raise ValueError("Canonical Main proof bundle targetSha does not match workflow SHA")

    missing = _codes(bundle.get("missing"), "missing")
    failures = _codes(bundle.get("failures"), "failures")

    if state == "COMPLETE" and missing:
        raise ValueError("Canonical Main proof bundle contradiction: COMPLETE with missing evidence")
    if state == "PARTIAL" and not missing:
        raise ValueError("Canonical Main proof bundle contradiction: PARTIAL without missing evidence")
    expected_ready = state == "COMPLETE" and not failures
    if acceptance_ready != expected_ready:
        raise ValueError("Canonical Main proof bundle acceptanceReady contradicts state/failures")

    return state, acceptance_ready, missing, failures


def adapt(
    bundle: dict[str, Any] | None,
    *,
    workflow: str,
    run: dict[str, Any],
    source_path: str,
    proof_outcome: str,
) -> dict[str, Any]:
    outcome = _outcome(proof_outcome)

    if outcome == "cancelled":
        return _fallback(
            workflow=workflow,
            run=run,
            source_path=source_path,
            result="CANCELLED",
            code="CANONICAL_MAIN_PROOF_COMPOSE_CANCELLED",
            message="proof bundle composition was cancelled",
        )
    if outcome == "failure":
        return _fallback(
            workflow=workflow,
            run=run,
            source_path=source_path,
            result="INFRA_ERROR",
            code="CANONICAL_MAIN_PROOF_COMPOSE_FAILED",
            message="proof bundle composition step failed",
        )
    if outcome == "skipped":
        return _fallback(
            workflow=workflow,
            run=run,
            source_path=source_path,
            result="INFRA_ERROR",
            code="CANONICAL_MAIN_PROOF_COMPOSE_SKIPPED",
            message="proof bundle composition step was unexpectedly skipped",
        )
    if bundle is None:
        return _fallback(
            workflow=workflow,
            run=run,
            source_path=source_path,
            result="INFRA_ERROR",
            code="CANONICAL_MAIN_PROOF_BUNDLE_MISSING",
            message="successful proof composition produced no proof bundle",
        )

    state, acceptance_ready, missing, failures = _validate(bundle, run_sha=str(run.get("sha") or ""))

    if state == "PARTIAL":
        reason_codes = list(dict.fromkeys(missing + failures))
        first_code = reason_codes[0] if reason_codes else "CANONICAL_MAIN_PROOF_PARTIAL"
        return {
            "schemaVersion": 1,
            "workflow": workflow,
            "run": run,
            "scope": {"product": "Repository", "profile": MODE},
            "result": "UNKNOWN",
            "counts": {"passed": 0, "total": 2, "failed": 0, "warnings": 0},
            "checks": [
                {"name": "proof_bundle_complete", "result": "UNKNOWN"},
                {"name": "acceptance_ready", "result": "UNKNOWN"},
            ],
            "reasonCodes": reason_codes,
            "firstFailure": {
                "phase": "proof_bundle_evidence",
                "code": first_code,
                "message": "required Canonical Main evidence is incomplete",
            },
            "source": {"kind": "report", "path": source_path},
            "complete": False,
        }

    if acceptance_ready:
        return {
            "schemaVersion": 1,
            "workflow": workflow,
            "run": run,
            "scope": {"product": "Repository", "profile": MODE},
            "result": "PASS",
            "counts": {"passed": 2, "total": 2, "failed": 0, "warnings": 0},
            "checks": [
                {"name": "proof_bundle_complete", "result": "PASS"},
                {"name": "acceptance_ready", "result": "PASS"},
            ],
            "reasonCodes": [],
            "firstFailure": None,
            "source": {"kind": "report", "path": source_path},
            "complete": True,
        }

    first_code = failures[0]
    return {
        "schemaVersion": 1,
        "workflow": workflow,
        "run": run,
        "scope": {"product": "Repository", "profile": MODE},
        "result": "FAIL",
        "counts": {"passed": 1, "total": 2, "failed": 1, "warnings": 0},
        "checks": [
            {"name": "proof_bundle_complete", "result": "PASS"},
            {"name": "acceptance_ready", "result": "FAIL"},
        ],
        "reasonCodes": failures,
        "firstFailure": {
            "phase": "canonical_main_acceptance",
            "code": first_code,
            "message": "Canonical Main proof bundle is complete but not acceptance-ready",
        },
        "source": {"kind": "report", "path": source_path},
        "complete": True,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Adapt Canonical Main proof bundle to CI_SUMMARY_V1")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--proof-outcome", required=True)
    parser.add_argument("--workflow", default="Canonical Main Proof Bundle")
    parser.add_argument("--run-id")
    parser.add_argument("--attempt")
    parser.add_argument("--event")
    parser.add_argument("--sha")
    args = parser.parse_args(argv)

    run = _run(args)
    try:
        outcome = _outcome(args.proof_outcome)
        bundle = None
        if outcome == "success":
            bundle = _read(args.report)
        summary = adapt(
            bundle,
            workflow=args.workflow,
            run=run,
            source_path=args.report,
            proof_outcome=outcome,
        )
    except ValueError as exc:
        text = str(exc)
        code = "CANONICAL_MAIN_PROOF_BUNDLE_MISSING" if "missing" in text.lower() else "CANONICAL_MAIN_PROOF_BUNDLE_INVALID"
        summary = _fallback(
            workflow=args.workflow,
            run=run,
            source_path=args.report,
            result="INFRA_ERROR",
            code=code,
            message=text,
        )

    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

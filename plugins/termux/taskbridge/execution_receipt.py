from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

MAX_INPUT_BYTES = 48 * 1024
MAX_TEXT_BYTES = 320
MAX_COMMAND_ARGS = 64
MAX_COMMAND_ARG_BYTES = 2048
JOB_ID_RE = re.compile(r"^job_[0-9a-f]{12}$")
CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]*$")
STATES = {
    "CREATED",
    "ACTIVE",
    "SUSPECTED_STALL",
    "RECONNECTED",
    "UNKNOWN",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
}
JOB_FIELDS = {
    "job_id",
    "name",
    "adapter",
    "command",
    "logical_state",
    "local_state",
    "remote_state",
    "signal_confidence",
    "desired_action",
    "worker_pid",
    "child_pid",
    "exit_code",
    "result_ref",
    "error_code",
    "created_at",
    "started_at",
    "last_seen",
    "finished_at",
    "updated_at",
}
TOP_FIELDS = {
    "schemaVersion",
    "job",
    "sourceIdentity",
    "executionSurface",
    "artifactLocator",
}


def _object(value: Any, field: str, allowed: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    unsupported = sorted(set(value) - allowed)
    if unsupported:
        raise ValueError(f"{field} contains unsupported field: {unsupported[0]}")
    return value


def _text(
    value: Any,
    field: str,
    *,
    nullable: bool = False,
    max_bytes: int = MAX_TEXT_BYTES,
) -> str | None:
    if nullable and value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} missing")
    text = value.strip()
    if len(text.encode("utf-8")) > max_bytes:
        raise ValueError(f"{field} too large")
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in text):
        raise ValueError(f"{field} contains control characters")
    return text


def _optional_pid(value: Any, field: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field} invalid")
    return value


def _optional_exit(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("job.exit_code invalid")
    if value < -2147483648 or value > 2147483647:
        raise ValueError("job.exit_code invalid")
    return value


def _optional_number(value: Any, field: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} invalid")
    if value < 0:
        raise ValueError(f"{field} invalid")
    return float(value)


def _source_identity(value: Any) -> dict[str, str]:
    row = _object(value, "sourceIdentity", {"kind", "locator", "identity"})
    return {
        "kind": _text(row.get("kind"), "sourceIdentity.kind") or "",
        "locator": _text(row.get("locator"), "sourceIdentity.locator") or "",
        "identity": _text(row.get("identity"), "sourceIdentity.identity") or "",
    }


def _command(value: Any) -> list[str]:
    if not isinstance(value, list) or not value or len(value) > MAX_COMMAND_ARGS:
        raise ValueError("job.command invalid")
    out: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item:
            raise ValueError(f"job.command[{index}] invalid")
        if len(item.encode("utf-8")) > MAX_COMMAND_ARG_BYTES:
            raise ValueError(f"job.command[{index}] too large")
        out.append(item)
    return out


def _normalize_job(value: Any) -> dict[str, Any]:
    row = _object(value, "job", JOB_FIELDS)
    job_id = _text(row.get("job_id"), "job.job_id", max_bytes=64)
    if not JOB_ID_RE.fullmatch(job_id or ""):
        raise ValueError("job.job_id invalid")

    adapter = _text(row.get("adapter"), "job.adapter", max_bytes=80)
    if adapter != "shell":
        raise ValueError("job.adapter unsupported")

    logical_state = _text(row.get("logical_state"), "job.logical_state", max_bytes=40)
    if logical_state not in STATES:
        raise ValueError("job.logical_state invalid")

    local_state = _text(row.get("local_state"), "job.local_state", max_bytes=80)
    remote_state = _text(row.get("remote_state"), "job.remote_state", max_bytes=80)
    signal_confidence = _text(
        row.get("signal_confidence"),
        "job.signal_confidence",
        max_bytes=40,
    )
    desired_action = _text(
        row.get("desired_action"),
        "job.desired_action",
        max_bytes=40,
    )
    error_code = _text(
        row.get("error_code"),
        "job.error_code",
        nullable=True,
        max_bytes=128,
    )
    if error_code is not None and not CODE_RE.fullmatch(error_code):
        raise ValueError("job.error_code invalid")

    result_ref = row.get("result_ref")
    if result_ref is not None and not isinstance(result_ref, str):
        raise ValueError("job.result_ref invalid")

    name = row.get("name")
    if name is not None and not isinstance(name, str):
        raise ValueError("job.name invalid")

    return {
        "job_id": job_id,
        "adapter": adapter,
        "command": _command(row.get("command")),
        "logical_state": logical_state,
        "local_state": local_state,
        "remote_state": remote_state,
        "signal_confidence": signal_confidence,
        "desired_action": desired_action,
        "worker_pid": _optional_pid(row.get("worker_pid"), "job.worker_pid"),
        "child_pid": _optional_pid(row.get("child_pid"), "job.child_pid"),
        "exit_code": _optional_exit(row.get("exit_code")),
        "result_ref_present": isinstance(result_ref, str) and bool(result_ref),
        "error_code": error_code,
        "created_at": _optional_number(row.get("created_at"), "job.created_at"),
        "started_at": _optional_number(row.get("started_at"), "job.started_at"),
        "last_seen": _optional_number(row.get("last_seen"), "job.last_seen"),
        "finished_at": _optional_number(row.get("finished_at"), "job.finished_at"),
        "updated_at": _optional_number(row.get("updated_at"), "job.updated_at"),
    }
def _conflicts(job: dict[str, Any]) -> list[str]:
    state = job["logical_state"]
    local = job["local_state"]
    exit_code = job["exit_code"]
    finished = job["finished_at"]
    result_ref = job["result_ref_present"]
    conflicts: list[str] = []

    if state == "COMPLETED":
        if exit_code != 0:
            conflicts.append("TASKBRIDGE_COMPLETED_EXIT_CONFLICT")
        if local != "STOPPED":
            conflicts.append("TASKBRIDGE_COMPLETED_LOCAL_STATE_CONFLICT")
        if finished is None:
            conflicts.append("TASKBRIDGE_COMPLETED_FINISH_TIME_MISSING")
        if not result_ref:
            conflicts.append("TASKBRIDGE_COMPLETED_RESULT_REF_MISSING")
    elif state == "FAILED":
        if exit_code == 0:
            conflicts.append("TASKBRIDGE_FAILED_ZERO_EXIT_CONFLICT")
        if exit_code is None and job["error_code"] is None:
            conflicts.append("TASKBRIDGE_FAILED_EVIDENCE_MISSING")
        if local != "STOPPED":
            conflicts.append("TASKBRIDGE_FAILED_LOCAL_STATE_CONFLICT")
        if finished is None:
            conflicts.append("TASKBRIDGE_FAILED_FINISH_TIME_MISSING")
    elif state == "CANCELLED":
        if local != "STOPPED":
            conflicts.append("TASKBRIDGE_CANCELLED_LOCAL_STATE_CONFLICT")
        if finished is None:
            conflicts.append("TASKBRIDGE_CANCELLED_FINISH_TIME_MISSING")
    elif state in {"ACTIVE", "RECONNECTED"}:
        if exit_code is not None:
            conflicts.append("TASKBRIDGE_RUNNING_EXIT_CODE_CONFLICT")
        if local != "RUNNING":
            conflicts.append("TASKBRIDGE_RUNNING_LOCAL_STATE_CONFLICT")
        if finished is not None:
            conflicts.append("TASKBRIDGE_RUNNING_FINISH_TIME_CONFLICT")
        if not result_ref:
            conflicts.append("TASKBRIDGE_RUNNING_RESULT_REF_MISSING")
    elif state == "CREATED":
        if exit_code is not None:
            conflicts.append("TASKBRIDGE_CREATED_EXIT_CODE_CONFLICT")
        if result_ref:
            conflicts.append("TASKBRIDGE_CREATED_RESULT_REF_CONFLICT")
        if finished is not None:
            conflicts.append("TASKBRIDGE_CREATED_FINISH_TIME_CONFLICT")
        if local not in {"NOT_STARTED", "STARTING"}:
            conflicts.append("TASKBRIDGE_CREATED_LOCAL_STATE_CONFLICT")
    elif state == "SUSPECTED_STALL":
        if exit_code is not None:
            conflicts.append("TASKBRIDGE_STALL_EXIT_CODE_CONFLICT")
        if finished is not None:
            conflicts.append("TASKBRIDGE_STALL_FINISH_TIME_CONFLICT")
        if local not in {"STALE", "STOPPED"}:
            conflicts.append("TASKBRIDGE_STALL_LOCAL_STATE_CONFLICT")
    elif state == "UNKNOWN":
        if finished is not None:
            conflicts.append("TASKBRIDGE_UNKNOWN_FINISH_TIME_CONFLICT")

    return sorted(set(conflicts))


def _state(job: dict[str, Any], conflicts: list[str]) -> dict[str, Any]:
    if conflicts:
        return {
            "attentionState": "UNKNOWN",
            "result": "CONFLICT",
            "stepResult": "CONFLICT",
            "reasonCodes": ["TASKBRIDGE_STATUS_CONFLICT"],
            "requiredUnknowns": [],
            "blockers": [],
            "nextLegalAction": "RESOLVE_TASKBRIDGE_STATUS_CONFLICT",
        }

    state = job["logical_state"]
    if state == "COMPLETED":
        return {
            "attentionState": "COMPLETE",
            "result": "PASS",
            "stepResult": "PASS",
            "reasonCodes": [],
            "requiredUnknowns": [],
            "blockers": [],
            "nextLegalAction": "INTERPRET_REMOTE_EXECUTION_RECEIPT",
        }
    if state == "FAILED":
        reasons = ["TASKBRIDGE_JOB_FAILED"]
        if job["error_code"] is not None:
            reasons.append(job["error_code"])
        return {
            "attentionState": "COMPLETE",
            "result": "FAIL",
            "stepResult": "FAIL",
            "reasonCodes": sorted(set(reasons)),
            "requiredUnknowns": [],
            "blockers": [],
            "nextLegalAction": "DRILL_DOWN_TASKBRIDGE_FAILURE",
        }
    if state in {"ACTIVE", "RECONNECTED"}:
        return {
            "attentionState": "RUNNING",
            "result": "PARTIAL",
            "stepResult": "PARTIAL",
            "reasonCodes": ["TASKBRIDGE_JOB_RUNNING"],
            "requiredUnknowns": [],
            "blockers": [],
            "nextLegalAction": "WAIT_OR_RECHECK_TASKBRIDGE_JOB",
        }
    if state == "CREATED":
        return {
            "attentionState": "RUNNING",
            "result": "PARTIAL",
            "stepResult": "PARTIAL",
            "reasonCodes": ["TASKBRIDGE_JOB_NOT_STARTED"],
            "requiredUnknowns": [],
            "blockers": [],
            "nextLegalAction": "WAIT_OR_RECHECK_TASKBRIDGE_JOB",
        }
    if state == "SUSPECTED_STALL":
        return {
            "attentionState": "NEEDS_REVIEW",
            "result": "UNKNOWN",
            "stepResult": "UNKNOWN",
            "reasonCodes": ["TASKBRIDGE_SUSPECTED_STALL"],
            "requiredUnknowns": ["TASKBRIDGE_COMPLETION_STATE_UNKNOWN"],
            "blockers": [],
            "nextLegalAction": "RECONNECT_OR_RECHECK_TASKBRIDGE_JOB",
        }
    if state == "UNKNOWN":
        return {
            "attentionState": "UNKNOWN",
            "result": "UNKNOWN",
            "stepResult": "UNKNOWN",
            "reasonCodes": ["TASKBRIDGE_JOB_UNKNOWN"],
            "requiredUnknowns": ["TASKBRIDGE_COMPLETION_STATE_UNKNOWN"],
            "blockers": [],
            "nextLegalAction": "RECONNECT_OR_RECHECK_TASKBRIDGE_JOB",
        }
    return {
        "attentionState": "BLOCKED",
        "result": "BLOCKED",
        "stepResult": "BLOCKED",
        "reasonCodes": ["TASKBRIDGE_JOB_CANCELLED"],
        "requiredUnknowns": [],
        "blockers": ["TASKBRIDGE_JOB_CANCELLED"],
        "nextLegalAction": "RESOLVE_TASKBRIDGE_CANCELLATION",
    }
def project_taskbridge_facts(value: Any) -> dict[str, Any]:
    row = _object(value, "input", TOP_FIELDS)
    if row.get("schemaVersion") != 1:
        raise ValueError("input schemaVersion must equal 1")

    job = _normalize_job(row.get("job"))
    source_identity = _source_identity(row.get("sourceIdentity"))
    execution_surface = _text(
        row.get("executionSurface"),
        "executionSurface",
        max_bytes=160,
    )
    artifact_locator = _text(
        row.get("artifactLocator"),
        "artifactLocator",
        max_bytes=300,
    )
    conflicts = _conflicts(job)
    state = _state(job, conflicts)

    return {
        "schemaVersion": 1,
        "operationId": f"taskbridge-shell:{job['job_id']}",
        "primitiveId": "termux-taskbridge:shell",
        "sourceIdentity": source_identity,
        "executionSurface": execution_surface,
        "stage": "REMOTE_TASKBRIDGE_SHELL_JOB",
        "attentionState": state["attentionState"],
        "result": state["result"],
        "proofScope": "TaskBridge shell job lifecycle and exit evidence only",
        "steps": [
            {
                "name": "taskbridge-shell-job",
                "result": state["stepResult"],
                "evidenceLocator": artifact_locator,
            }
        ],
        "counters": [
            {
                "name": "terminal",
                "value": 1 if job["logical_state"] in {"COMPLETED", "FAILED", "CANCELLED"} else 0,
            },
            {
                "name": "exit_code_known",
                "value": 1 if job["exit_code"] is not None else 0,
            },
            {
                "name": "result_ref_present",
                "value": 1 if job["result_ref_present"] else 0,
            },
        ],
        "affectedFiles": [],
        "artifactLocators": [artifact_locator],
        "reasonCodes": state["reasonCodes"],
        "requiredUnknowns": state["requiredUnknowns"],
        "conflicts": conflicts,
        "blockers": state["blockers"],
        "exitCode": job["exit_code"],
        "stderrTail": None,
        "nextLegalAction": state["nextLegalAction"],
    }


def _read_input(path: str) -> Any:
    source = Path(path)
    stat = source.lstat()
    if not source.is_file() or source.is_symlink():
        raise ValueError("input-file must be a regular non-symlink file")
    if stat.st_size > MAX_INPUT_BYTES:
        raise ValueError(f"input-file exceeds {MAX_INPUT_BYTES} bytes")
    return json.loads(source.read_text(encoding="utf-8"))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Translate TaskBridge shell job status into execution-receipt facts"
    )
    parser.add_argument("--input-file", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        facts = project_taskbridge_facts(_read_input(args.input_file))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"TASKBRIDGE_EXECUTION_RECEIPT_ERROR:{exc}", file=sys.stderr)
        return 2
    sys.stdout.write(json.dumps(facts, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

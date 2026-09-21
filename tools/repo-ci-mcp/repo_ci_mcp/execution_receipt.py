from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

MAX_INPUT_BYTES = 96 * 1024
MAX_ERRORS = 16
MAX_TEXT = 320
SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")
CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9_.:-]*$")
ALLOWED_RESULTS = {"PASS", "NOOP", "FAIL", "INFRA_ERROR", "CANCELLED", "UNKNOWN"}
BLOCKING_ERROR_CODES = {"JOBS_UNAVAILABLE", "JOB_LOG_UNAVAILABLE", "JOBS_BOUND_EXCEEDED"}
TOP_FIELDS = {"ok", "repository", "selection", "run", "summary", "source", "errors", "supported_workflows"}


def _object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    return value


def _text(value: Any, field: str, *, nullable: bool = False, limit: int = MAX_TEXT) -> str | None:
    if nullable and value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} missing")
    text = value.strip()
    if len(text.encode("utf-8")) > limit:
        raise ValueError(f"{field} too large")
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in text):
        raise ValueError(f"{field} contains control characters")
    return text


def _positive_int(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field} must be a positive integer")
    return value


def _optional_positive_int(value: Any, field: str) -> int | None:
    if value is None:
        return None
    return _positive_int(value, field)


def _errors(value: Any) -> list[str]:
    if not isinstance(value, list) or len(value) > MAX_ERRORS:
        raise ValueError("errors invalid")
    codes: list[str] = []
    for index, row in enumerate(value):
        item = _object(row, f"errors[{index}]")
        code = _text(item.get("code"), f"errors[{index}].code", limit=128)
        if not CODE_RE.fullmatch(code or ""):
            raise ValueError(f"errors[{index}].code invalid")
        message = item.get("message")
        if not isinstance(message, str):
            raise ValueError(f"errors[{index}].message invalid")
        codes.append(code)
    return sorted(set(codes))


def _selection(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    row = _object(value, "selection")
    mode = _text(row.get("mode"), "selection.mode", limit=32)
    if mode not in {"exact", "latest"}:
        raise ValueError("selection.mode invalid")
    ref = row.get("ref")
    if ref is not None:
        ref = _text(ref, "selection.ref", limit=200)
    return {
        "mode": mode,
        "workflow_key": _text(row.get("workflow_key"), "selection.workflow_key", limit=120),
        "workflow_path": _text(row.get("workflow_path"), "selection.workflow_path", limit=240),
        "workflow_name": _text(row.get("workflow_name"), "selection.workflow_name", limit=160),
        "ref": ref,
    }


def _run(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    row = _object(value, "run")
    head_sha = _text(row.get("head_sha"), "run.head_sha", limit=40)
    if not SHA_RE.fullmatch(head_sha or ""):
        raise ValueError("run.head_sha invalid")
    status = _text(row.get("status"), "run.status", limit=40)
    conclusion = row.get("conclusion")
    if conclusion is not None:
        conclusion = _text(conclusion, "run.conclusion", limit=40)
    event = row.get("event")
    if event is not None:
        event = _text(event, "run.event", limit=80)
    branch = row.get("head_branch")
    if branch is not None:
        branch = _text(branch, "run.head_branch", limit=200)
    run_number = row.get("run_number")
    if run_number is not None:
        run_number = _positive_int(run_number, "run.run_number")
    return {
        "id": _positive_int(row.get("id"), "run.id"),
        "run_number": run_number,
        "event": event,
        "head_branch": branch,
        "head_sha": head_sha.lower(),
        "status": status,
        "conclusion": conclusion,
    }
def _summary(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    row = _object(value, "summary")
    result = _text(row.get("result"), "summary.result", limit=40)
    if result not in ALLOWED_RESULTS:
        raise ValueError("summary.result invalid")
    complete = row.get("complete")
    if not isinstance(complete, bool):
        raise ValueError("summary.complete invalid")
    raw_text = row.get("text")
    if not isinstance(raw_text, str):
        raise ValueError("summary.text invalid")
    return {"result": result, "complete": complete}


def _source(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    row = _object(value, "source")
    kind = _text(row.get("kind"), "source.kind", limit=100)
    if kind != "github_actions_job_log_compact_block":
        raise ValueError("source.kind invalid")
    return {
        "kind": kind,
        "job_id": _positive_int(row.get("job_id"), "source.job_id"),
        "job_name": _text(row.get("job_name"), "source.job_name", limit=160),
    }


def _normalize(value: Any) -> dict[str, Any]:
    row = _object(value, "input")
    unsupported = sorted(set(row) - TOP_FIELDS)
    if unsupported:
        raise ValueError(f"input contains unsupported field: {unsupported[0]}")
    if not isinstance(row.get("ok"), bool):
        raise ValueError("ok invalid")
    repository = _text(row.get("repository"), "repository", limit=200)
    errors = _errors(row.get("errors"))
    return {
        "ok": row["ok"],
        "repository": repository,
        "selection": _selection(row.get("selection")),
        "run": _run(row.get("run")),
        "summary": _summary(row.get("summary")),
        "source": _source(row.get("source")),
        "errors": errors,
    }


def _locators(run: dict[str, Any] | None, source: dict[str, Any] | None) -> list[str]:
    rows: list[str] = []
    if run is not None:
        rows.append(f"github-actions:run:{run['id']}")
    if source is not None:
        rows.append(f"github-actions:job:{source['job_id']}")
    return rows


def _identity(run: dict[str, Any] | None) -> dict[str, str] | None:
    if run is None:
        return None
    return {
        "kind": "GITHUB_ACTIONS_RUN",
        "locator": f"github-actions:run:{run['id']}",
        "identity": run["head_sha"],
    }


def _operation(selection: dict[str, Any] | None, run: dict[str, Any] | None) -> str:
    workflow = selection["workflow_key"] if selection is not None else "unresolved"
    suffix = f":run:{run['id']}" if run is not None else ""
    return f"repo-ci-summary:{workflow}{suffix}"


def _conflicts(data: dict[str, Any]) -> list[str]:
    conflicts: list[str] = []
    if data["ok"]:
        if data["errors"]:
            conflicts.append("CI_SUMMARY_OK_WITH_ERRORS")
        if data["selection"] is None:
            conflicts.append("CI_SUMMARY_OK_WITHOUT_SELECTION")
        if data["run"] is None:
            conflicts.append("CI_SUMMARY_OK_WITHOUT_RUN")
        if data["summary"] is None:
            conflicts.append("CI_SUMMARY_OK_WITHOUT_SUMMARY")
        if data["source"] is None:
            conflicts.append("CI_SUMMARY_OK_WITHOUT_SOURCE")
    if data["summary"] is not None and data["run"] is not None:
        if data["run"]["status"] != "completed":
            conflicts.append("CI_SUMMARY_NONTERMINAL_RUN")
        if data["summary"]["result"] == "PASS" and data["run"]["conclusion"] != "success":
            conflicts.append("CI_SUMMARY_PASS_RUN_CONCLUSION_CONFLICT")
        if data["summary"]["result"] == "FAIL" and data["run"]["conclusion"] == "success":
            conflicts.append("CI_SUMMARY_FAIL_RUN_CONCLUSION_CONFLICT")
    return sorted(set(conflicts))
def _state_for(data: dict[str, Any], conflicts: list[str]) -> dict[str, Any]:
    if conflicts:
        return {
            "attention": "UNKNOWN",
            "result": "CONFLICT",
            "step_result": "CONFLICT",
            "reasons": ["CI_SUMMARY_EVIDENCE_CONFLICT"],
            "unknowns": [],
            "blockers": [],
            "next_action": "RESOLVE_CI_SUMMARY_EVIDENCE_CONFLICT",
        }

    if not data["ok"]:
        codes = data["errors"] or ["REPO_CI_ERRORS_MISSING"]
        if "RUN_NOT_TERMINAL" in codes:
            return {
                "attention": "RUNNING",
                "result": "PARTIAL",
                "step_result": "PARTIAL",
                "reasons": codes,
                "unknowns": [],
                "blockers": [],
                "next_action": "WAIT_FOR_CI_RUN",
            }
        if any(code in BLOCKING_ERROR_CODES for code in codes):
            return {
                "attention": "BLOCKED",
                "result": "BLOCKED",
                "step_result": "BLOCKED",
                "reasons": codes,
                "unknowns": [],
                "blockers": ["CI_EVIDENCE_ACCESS_BLOCKED"],
                "next_action": "RESOLVE_CI_EVIDENCE_ACCESS",
            }
        return {
            "attention": "UNKNOWN",
            "result": "UNKNOWN",
            "step_result": "UNKNOWN",
            "reasons": codes,
            "unknowns": ["CI_SUMMARY_RESULT_UNKNOWN"],
            "blockers": [],
            "next_action": "DRILL_DOWN_CI_SUMMARY_ERROR",
        }

    summary = data["summary"]
    assert summary is not None
    result = summary["result"]
    complete = summary["complete"]

    if result == "PASS":
        if not complete:
            return {
                "attention": "NEEDS_REVIEW",
                "result": "PARTIAL",
                "step_result": "PARTIAL",
                "reasons": ["CI_SUMMARY_INCOMPLETE"],
                "unknowns": ["CI_SUMMARY_COMPLETENESS_UNKNOWN"],
                "blockers": [],
                "next_action": "DRILL_DOWN_INCOMPLETE_CI_SUMMARY",
            }
        return {
            "attention": "COMPLETE",
            "result": "PASS",
            "step_result": "PASS",
            "reasons": [],
            "unknowns": [],
            "blockers": [],
            "next_action": "INTERPRET_CI_RECEIPT",
        }
    if result == "NOOP":
        return {
            "attention": "NEEDS_REVIEW",
            "result": "PARTIAL",
            "step_result": "PARTIAL",
            "reasons": ["CI_SUMMARY_NOOP"],
            "unknowns": [],
            "blockers": [],
            "next_action": "INTERPRET_CI_NOOP",
        }
    if result == "FAIL":
        reasons = ["CI_SUMMARY_FAIL"]
        if not complete:
            reasons.append("CI_SUMMARY_INCOMPLETE")
        return {
            "attention": "COMPLETE",
            "result": "FAIL",
            "step_result": "FAIL",
            "reasons": reasons,
            "unknowns": [],
            "blockers": [],
            "next_action": "DRILL_DOWN_CI_FAILURE",
        }
    if result in {"INFRA_ERROR", "CANCELLED"}:
        code = f"CI_SUMMARY_{result}"
        return {
            "attention": "BLOCKED",
            "result": "BLOCKED",
            "step_result": "BLOCKED",
            "reasons": [code],
            "unknowns": [],
            "blockers": [code],
            "next_action": "RESOLVE_CI_INFRA_OR_CANCELLATION",
        }
    return {
        "attention": "UNKNOWN",
        "result": "UNKNOWN",
        "step_result": "UNKNOWN",
        "reasons": ["CI_SUMMARY_UNKNOWN"],
        "unknowns": ["CI_RESULT_UNKNOWN"],
        "blockers": [],
        "next_action": "DRILL_DOWN_CI_UNKNOWN",
    }
def project_ci_summary_facts(value: Any) -> dict[str, Any]:
    data = _normalize(value)
    conflicts = _conflicts(data)
    state = _state_for(data, conflicts)
    selection = data["selection"]
    run = data["run"]
    source = data["source"]
    locators = _locators(run, source)
    evidence = locators[-1] if locators else "input:repo_ci_summary"

    facts: dict[str, Any] = {
        "schemaVersion": 1,
        "operationId": _operation(selection, run),
        "primitiveId": "repo-ci-mcp:repo_ci_summary",
        "executionSurface": "CI_PROOF:GITHUB_ACTIONS",
        "stage": "CI_SUMMARY_PROOF",
        "attentionState": state["attention"],
        "result": state["result"],
        "proofScope": "Repository Read MCP validated compact GitHub Actions CI summary only",
        "steps": [{
            "name": f"ci:{selection['workflow_key'] if selection else 'unresolved'}",
            "result": state["step_result"],
            "evidenceLocator": evidence,
        }],
        "counters": [
            {"name": "run_selected", "value": 1 if run is not None else 0},
            {"name": "source_job_selected", "value": 1 if source is not None else 0},
            {"name": "summary_complete", "value": 1 if data["summary"] and data["summary"]["complete"] else 0},
        ],
        "affectedFiles": [],
        "artifactLocators": locators,
        "reasonCodes": state["reasons"],
        "requiredUnknowns": state["unknowns"],
        "conflicts": conflicts,
        "blockers": state["blockers"],
        "exitCode": None,
        "stderrTail": None,
        "nextLegalAction": state["next_action"],
    }
    source_identity = _identity(run)
    if source_identity is not None:
        facts["sourceIdentity"] = source_identity
    return facts


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
        description="Translate Repository Read MCP repo_ci_summary output into execution-receipt facts"
    )
    parser.add_argument("--input-file", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        facts = project_ci_summary_facts(_read_input(args.input_file))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"REPO_CI_EXECUTION_RECEIPT_ERROR:{exc}", file=sys.stderr)
        return 2
    sys.stdout.write(json.dumps(facts, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

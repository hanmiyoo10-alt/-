#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
ALLOWED_RESULTS = {"PASS", "NOOP", "FAIL", "INFRA_ERROR", "CANCELLED", "UNKNOWN"}
MAX_INPUT_BYTES = 64 * 1024
MAX_REASON_CODES = 20
MAX_CHECKS = 100
MAX_FIRST_FAILURE_MESSAGE = 500
MAX_TEXT_LINES_PASS = 30
MAX_TEXT_LINES_FAIL = 60
MAX_STRING = 500
REASON_RE = re.compile(r"^[A-Z0-9][A-Z0-9_.:-]{0,127}$")
CHECK_RESULT_RE = re.compile(r"^[A-Z0-9][A-Z0-9_.:-]{0,63}$")


class SummaryError(ValueError):
    pass


def _clean_text(value: Any, *, field: str, limit: int = MAX_STRING, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise SummaryError(f"{field} must be a string")
    cleaned = " ".join(value.replace("\x00", "").split())
    if not cleaned and not allow_empty:
        raise SummaryError(f"{field} must be non-empty")
    if len(cleaned) > limit:
        cleaned = cleaned[: max(0, limit - 1)] + "…"
    return cleaned


def _nonnegative_int(value: Any, *, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise SummaryError(f"{field} must be a non-negative integer")
    return value


def _normalize_reason_codes(value: Any) -> list[str]:
    if not isinstance(value, list):
        raise SummaryError("reasonCodes must be an array")
    normalized: list[str] = []
    for index, item in enumerate(value):
        code = _clean_text(item, field=f"reasonCodes[{index}]", limit=128)
        if not REASON_RE.fullmatch(code):
            raise SummaryError(f"reasonCodes[{index}] has invalid format")
        normalized.append(code)
    return sorted(set(normalized))[:MAX_REASON_CODES]


def _normalize_run(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise SummaryError("run must be an object")
    return {
        "id": _clean_text(value.get("id"), field="run.id", limit=64),
        "attempt": _nonnegative_int(value.get("attempt"), field="run.attempt"),
        "event": _clean_text(value.get("event"), field="run.event", limit=64),
        "sha": _clean_text(value.get("sha"), field="run.sha", limit=64),
    }


def _normalize_scope(value: Any) -> dict[str, str] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise SummaryError("scope must be an object")
    out: dict[str, str] = {}
    for key in ("product", "profile"):
        if key in value and value[key] is not None:
            out[key] = _clean_text(value[key], field=f"scope.{key}", limit=128)
    return out or None


def _normalize_counts(value: Any) -> dict[str, int] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise SummaryError("counts must be an object")
    out: dict[str, int] = {}
    for key in ("passed", "total", "failed", "warnings"):
        if key in value and value[key] is not None:
            out[key] = _nonnegative_int(value[key], field=f"counts.{key}")
    if "passed" in out and "total" in out and out["passed"] > out["total"]:
        raise SummaryError("counts.passed cannot exceed counts.total")
    if "failed" in out and "total" in out and out["failed"] > out["total"]:
        raise SummaryError("counts.failed cannot exceed counts.total")
    return out or None


def _normalize_checks(value: Any) -> list[dict[str, str]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise SummaryError("checks must be an array")
    out: list[dict[str, str]] = []
    for index, item in enumerate(value[:MAX_CHECKS]):
        if not isinstance(item, dict):
            raise SummaryError(f"checks[{index}] must be an object")
        name = _clean_text(item.get("name"), field=f"checks[{index}].name", limit=128)
        result = _clean_text(item.get("result"), field=f"checks[{index}].result", limit=64)
        if not CHECK_RESULT_RE.fullmatch(result):
            raise SummaryError(f"checks[{index}].result has invalid format")
        entry = {"name": name, "result": result}
        if item.get("detail") is not None:
            entry["detail"] = _clean_text(item.get("detail"), field=f"checks[{index}].detail", limit=240)
        out.append(entry)
    return out


def _normalize_first_failure(value: Any) -> dict[str, str] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise SummaryError("firstFailure must be an object or null")
    out: dict[str, str] = {}
    for key, limit in (("phase", 128), ("code", 128), ("message", MAX_FIRST_FAILURE_MESSAGE)):
        if value.get(key) is not None:
            out[key] = _clean_text(value[key], field=f"firstFailure.{key}", limit=limit)
    if not out:
        raise SummaryError("firstFailure must contain at least one field")
    return out


def _normalize_source(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise SummaryError("source must be an object")
    out = {
        "kind": _clean_text(value.get("kind"), field="source.kind", limit=64),
        "path": _clean_text(value.get("path"), field="source.path", limit=300),
    }
    return out


def normalize_summary(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise SummaryError("summary root must be an object")
    if raw.get("schemaVersion") != SCHEMA_VERSION:
        raise SummaryError("schemaVersion must equal 1")
    result = _clean_text(raw.get("result"), field="result", limit=32)
    if result not in ALLOWED_RESULTS:
        raise SummaryError(f"result must be one of {sorted(ALLOWED_RESULTS)}")
    complete = raw.get("complete")
    if not isinstance(complete, bool):
        raise SummaryError("complete must be boolean")

    normalized: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "workflow": _clean_text(raw.get("workflow"), field="workflow", limit=160),
        "run": _normalize_run(raw.get("run")),
        "result": result,
        "reasonCodes": _normalize_reason_codes(raw.get("reasonCodes")),
        "source": _normalize_source(raw.get("source")),
        "complete": complete,
    }

    scope = _normalize_scope(raw.get("scope"))
    counts = _normalize_counts(raw.get("counts"))
    checks = _normalize_checks(raw.get("checks"))
    first_failure = _normalize_first_failure(raw.get("firstFailure"))
    if scope is not None:
        normalized["scope"] = scope
    if counts is not None:
        normalized["counts"] = counts
    if checks:
        normalized["checks"] = checks
    normalized["firstFailure"] = first_failure

    if result in {"PASS", "NOOP"} and first_failure is not None:
        raise SummaryError("PASS/NOOP summary cannot contain firstFailure")
    if result == "PASS" and normalized["reasonCodes"]:
        raise SummaryError("PASS summary cannot contain reasonCodes")
    if result == "PASS" and not complete:
        raise SummaryError("PASS summary must be complete")
    return normalized


def canonical_json(summary: dict[str, Any]) -> str:
    text = json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    if len(text.encode("utf-8")) > MAX_INPUT_BYTES:
        raise SummaryError("normalized summary exceeds 64 KiB")
    return text


def _safe(value: Any) -> str:
    return html.escape(str(value), quote=False)


def _check_label(name: str) -> str:
    return name.replace("_", " ").strip().capitalize()


def render_lines(summary: dict[str, Any]) -> list[str]:
    lines = [f"CI SUMMARY · {_safe(summary['workflow'])}", f"Result: {summary['result']}"]
    counts = summary.get("counts") or {}
    if "passed" in counts and "total" in counts:
        lines.append(f"Checks: {counts['passed']}/{counts['total']} PASS")
    if counts.get("failed", 0):
        lines.append(f"Failed: {counts['failed']}")
    scope = summary.get("scope") or {}
    if scope.get("product"):
        lines.append(f"Product: {_safe(scope['product'])}")
    if scope.get("profile"):
        lines.append(f"Profile: {_safe(scope['profile'])}")

    checks = summary.get("checks") or []
    if summary["result"] in {"PASS", "NOOP"}:
        selected = checks[:12]
    else:
        failed = [item for item in checks if item.get("result") not in {"PASS", "NOOP", "SKIPPED"}]
        selected = failed[:10]
    for item in selected:
        lines.append(f"{_safe(_check_label(item['name']))}: {_safe(item['result'])}")
    if checks and len(selected) < len(checks):
        lines.append(f"Additional checks: {len(checks) - len(selected)}")

    if "warnings" in counts:
        lines.append(f"Warnings: {counts['warnings']}")

    failure = summary.get("firstFailure")
    if failure:
        lines.extend(["", "First failure:"])
        for key in ("phase", "code", "message"):
            if failure.get(key):
                lines.append(f"- {key}: {_safe(failure[key])}")

    reason_codes = summary.get("reasonCodes") or []
    if reason_codes:
        lines.extend(["", "Reason codes:"])
        lines.extend(f"- {_safe(code)}" for code in reason_codes)
    else:
        lines.append("Reason codes: none")

    source = summary["source"]
    if summary["result"] not in {"PASS", "NOOP"} or not summary["complete"]:
        lines.extend(["", "Drill down:", f"- {_safe(source['path'])}"])

    if not summary["complete"]:
        lines.append("Summary complete: false")

    run = summary["run"]
    lines.extend([f"Run: {_safe(run['id'])} · attempt {run['attempt']}", f"Commit: {_safe(run['sha'][:12])}"])
    limit = MAX_TEXT_LINES_PASS if summary["result"] in {"PASS", "NOOP"} else MAX_TEXT_LINES_FAIL
    if len(lines) > limit:
        lines = lines[: limit - 1] + ["… summary truncated by CI_SUMMARY_V1 bound"]
    return lines


def render_text(summary: dict[str, Any], *, markers: bool = True) -> str:
    body = "\n".join(render_lines(summary))
    if markers:
        return f"CI_SUMMARY_V1_BEGIN\n{body}\nCI_SUMMARY_V1_END\n"
    return body + "\n"


def render_markdown(summary: dict[str, Any]) -> str:
    return "\n".join(render_lines(summary)) + "\n"


def fallback_summary(message: str, *, workflow: str | None = None) -> dict[str, Any]:
    safe_message = _clean_text(message, field="fallback.message", limit=MAX_FIRST_FAILURE_MESSAGE)
    return {
        "schemaVersion": 1,
        "workflow": workflow or os.environ.get("GITHUB_WORKFLOW") or "UNKNOWN_WORKFLOW",
        "run": {
            "id": os.environ.get("GITHUB_RUN_ID") or "UNKNOWN",
            "attempt": int(os.environ.get("GITHUB_RUN_ATTEMPT") or "0"),
            "event": os.environ.get("GITHUB_EVENT_NAME") or "UNKNOWN",
            "sha": os.environ.get("GITHUB_SHA") or "UNKNOWN",
        },
        "result": "INFRA_ERROR",
        "reasonCodes": ["CI_SUMMARY_RENDER_ERROR"],
        "firstFailure": {"phase": "ci_summary", "code": "CI_SUMMARY_RENDER_ERROR", "message": safe_message},
        "source": {"kind": "renderer", "path": ".github/tooling/ci-summary/render.py"},
        "complete": False,
    }


def _write(path: str | None, content: str) -> None:
    if not path:
        return
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def _load(path: str) -> Any:
    source = Path(path)
    if not source.is_file():
        raise SummaryError(f"input file missing: {path}")
    size = source.stat().st_size
    if size > MAX_INPUT_BYTES:
        raise SummaryError(f"input file exceeds {MAX_INPUT_BYTES} bytes")
    try:
        return json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SummaryError(f"input JSON unreadable: {exc}") from exc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and render CI_SUMMARY_V1")
    parser.add_argument("--input", required=True, help="Adapter-produced CI_SUMMARY_V1 JSON")
    parser.add_argument("--json-out", help="Normalized canonical summary JSON output")
    parser.add_argument("--text-out", help="Compact console text output")
    parser.add_argument("--markdown-out", help="Compact GitHub Step Summary output")
    parser.add_argument("--workflow", help="Fallback workflow name when input is malformed")
    args = parser.parse_args(argv)

    try:
        summary = normalize_summary(_load(args.input))
        canonical = canonical_json(summary)
        text = render_text(summary)
        markdown = render_markdown(summary)
        exit_code = 0
    except SummaryError as exc:
        summary = fallback_summary(str(exc), workflow=args.workflow)
        summary = normalize_summary(summary)
        canonical = canonical_json(summary)
        text = render_text(summary)
        markdown = render_markdown(summary)
        exit_code = 2

    _write(args.json_out, canonical)
    _write(args.text_out, text)
    _write(args.markdown_out, markdown)
    sys.stdout.write(text)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())

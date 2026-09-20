from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError, GitHubReader
from .summary import normalize_workflow_path, resolve_workflow

SCHEMA = "repo-ci-exact-sha.v1"
MAX_RUNS = 100
MAX_WORKFLOW_BYTES = 128 * 1024
SUPPORTED_FILTERS = {"branches", "branches-ignore", "paths", "paths-ignore"}
DISPOSITIONS = {
    "RAN", "EXPECTED_NO_RUN_PATH_FILTER", "TRIGGER_NOT_APPLICABLE",
    "BLOCKED_CAPABILITY", "MISSING_UNEXPECTED", "UNKNOWN",
}


def _reason(code: str) -> list[str]:
    return [code]


def _valid_sha(value: object) -> str | None:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", value):
        return None
    return value.lower()


def _workflow_path(value: object) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    spec = resolve_workflow(value)
    if spec is not None:
        return spec.path
    if not value.startswith(".github/workflows/"):
        return None
    if not value.endswith((".yml", ".yaml")) or ".." in value.split("/"):
        return None
    return value


def _run_view(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": run.get("id"), "workflow_name": run.get("name"),
        "workflow_path": normalize_workflow_path(run.get("path")),
        "event": run.get("event"), "head_sha": run.get("head_sha"),
        "head_branch": run.get("head_branch"), "status": run.get("status"),
        "conclusion": run.get("conclusion"), "run_number": run.get("run_number"),
        "run_attempt": run.get("run_attempt"), "html_url": run.get("html_url"),
    }


def _scalar_list(raw: str) -> list[str]:
    value = raw.strip()
    if value in {"", "{}"}:
        return []
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        parts = [item.strip().strip("'\"") for item in inner.split(",")]
        if any(not item for item in parts):
            raise ValueError("inline list invalid")
        return parts
    item = value.strip("'\"")
    if not item or any(ch in item for ch in "\r\n"):
        raise ValueError("scalar invalid")
    return [item]


def _parse_triggers(text: str) -> dict[str, dict[str, Any]]:
    lines = text.splitlines()
    start = None
    tail = ""
    for index, raw in enumerate(lines):
        match = re.fullmatch(r"on:\s*(.*)", raw)
        if match:
            start, tail = index, match.group(1)
            break
    if start is None:
        raise ValueError("on block missing or unsupported")
    if tail:
        return {event: {"filters": {}, "unsupported": False} for event in _scalar_list(tail)}

    events: dict[str, dict[str, Any]] = {}
    current: str | None = None
    current_filter: str | None = None
    for raw in lines[start + 1:]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        stripped = raw.strip()
        if indent == 0:
            break
        if indent == 2:
            match = re.fullmatch(r"([A-Za-z0-9_]+):\s*(.*)", stripped)
            if not match:
                raise ValueError("event syntax unsupported")
            current, value = match.groups()
            events[current] = {"filters": {}, "unsupported": value not in {"", "{}"}}
            current_filter = None
            continue
        if current is None:
            raise ValueError("trigger nesting unsupported")
        if indent == 4:
            match = re.fullmatch(r"([A-Za-z0-9_-]+):\s*(.*)", stripped)
            if not match:
                events[current]["unsupported"] = True
                current_filter = None
                continue
            key, value = match.groups()
            if key not in SUPPORTED_FILTERS:
                events[current]["unsupported"] = True
                current_filter = None
                continue
            events[current]["filters"][key] = _scalar_list(value) if value else []
            current_filter = key if not value else None
            continue
        if indent == 6 and current_filter is not None and stripped.startswith("- "):
            item = stripped[2:].strip().strip("'\"")
            if not item:
                raise ValueError("filter list item invalid")
            events[current]["filters"][current_filter].append(item)
            continue
        events[current]["unsupported"] = True
        current_filter = None
    if not events:
        raise ValueError("on block has no events")
    return events


def _glob_regex(pattern: str) -> re.Pattern[str]:
    if not pattern or pattern.startswith("!") or any(ch in pattern for ch in "[]{}()+|\\"):
        raise ValueError("glob pattern unsupported")
    pieces: list[str] = ["^"]
    index = 0
    while index < len(pattern):
        ch = pattern[index]
        if ch == "*" and index + 1 < len(pattern) and pattern[index + 1] == "*":
            pieces.append(".*")
            index += 2
            continue
        if ch == "*":
            pieces.append("[^/]*")
        elif ch == "?":
            pieces.append("[^/]")
        else:
            pieces.append(re.escape(ch))
        index += 1
    pieces.append("$")
    return re.compile("".join(pieces))


def _matches_any(value: str, patterns: list[str]) -> bool:
    return any(_glob_regex(pattern).fullmatch(value) for pattern in patterns)


def _branch_applicable(filters: dict[str, list[str]], ref: str | None) -> bool | None:
    branches = filters.get("branches", [])
    ignored = filters.get("branches-ignore", [])
    if not branches and not ignored:
        return True
    if not ref:
        return None
    if branches and not _matches_any(ref, branches):
        return False
    if ignored and _matches_any(ref, ignored):
        return False
    return True


def _paths_applicable(filters: dict[str, list[str]], paths: list[str]) -> bool:
    included = filters.get("paths", [])
    ignored = filters.get("paths-ignore", [])
    if included:
        return any(_matches_any(path, included) for path in paths)
    if ignored:
        return any(not _matches_any(path, ignored) for path in paths)
    return True

def _base(reader: GitHubReader, sha: object, workflow: object) -> dict[str, Any]:
    return {
        "schema": SCHEMA, "ok": False, "repository": reader.repository,
        "sha": sha, "workflow": workflow, "disposition": "UNKNOWN",
        "runs": [], "inventory_complete": False, "reason_codes": [],
        "evidence": {},
    }


def _finish(out: dict[str, Any], disposition: str, reasons: list[str] | None = None) -> dict[str, Any]:
    if disposition not in DISPOSITIONS:
        raise ValueError("invalid disposition")
    out["disposition"] = disposition
    out["reason_codes"] = reasons or []
    out["ok"] = disposition != "UNKNOWN"
    return out


def _decode_workflow(source: dict[str, Any]) -> str:
    raw = source.get("content")
    if not isinstance(raw, (bytes, bytearray)):
        raise ValueError("workflow content invalid")
    try:
        return bytes(raw).decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("workflow source is not UTF-8") from exc


def repo_ci_exact_sha(
    reader: GitHubReader, sha: str, workflow: str | None = None,
    event: str | None = None, ref: str | None = None, before_sha: str | None = None,
) -> dict[str, Any]:
    out = _base(reader, sha, workflow)
    exact_sha = _valid_sha(sha)
    workflow_path = _workflow_path(workflow) if workflow is not None else None
    if exact_sha is None:
        return _finish(out, "UNKNOWN", _reason("SHA_INVALID"))
    if workflow is not None and workflow_path is None:
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_INVALID"))
    if event is not None and (not isinstance(event, str) or not re.fullmatch(r"[A-Za-z0-9_]+", event)):
        return _finish(out, "UNKNOWN", _reason("EVENT_INVALID"))
    if ref is not None and (not isinstance(ref, str) or not ref or len(ref) > 200):
        return _finish(out, "UNKNOWN", _reason("REF_INVALID"))
    try:
        total, runs = reader.list_runs_exact_sha(exact_sha)
    except GitHubReadError as exc:
        if exc.status_code == 403:
            return _finish(out, "BLOCKED_CAPABILITY", _reason("RUN_INVENTORY_READ_BLOCKED"))
        return _finish(out, "UNKNOWN", _reason("RUN_INVENTORY_READ_FAILED"))
    if total > MAX_RUNS or len(runs) > MAX_RUNS:
        return _finish(out, "UNKNOWN", _reason("RUN_INVENTORY_BOUND_EXCEEDED"))
    if len(runs) != total:
        return _finish(out, "UNKNOWN", _reason("RUN_INVENTORY_INCOMPLETE"))
    if any(run.get("head_sha") != exact_sha for run in runs):
        return _finish(out, "UNKNOWN", _reason("RUN_INVENTORY_SHA_MISMATCH"))
    out["inventory_complete"] = True
    out["runs"] = [_run_view(run) for run in runs]
    if workflow_path is None:
        if runs:
            return _finish(out, "RAN")
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_REQUIRED_FOR_ABSENCE"))

    matching = [run for run in runs if normalize_workflow_path(run.get("path")) == workflow_path]
    out["workflow"] = workflow_path
    if matching:
        out["runs"] = [_run_view(run) for run in matching]
        return _finish(out, "RAN")
    if event is None:
        return _finish(out, "UNKNOWN", _reason("EVENT_REQUIRED_FOR_ABSENCE"))
    try:
        source = reader.get_repository_file(workflow_path, exact_sha, max_bytes=MAX_WORKFLOW_BYTES)
        triggers = _parse_triggers(_decode_workflow(source))
    except GitHubReadError as exc:
        if exc.status_code == 403:
            return _finish(out, "BLOCKED_CAPABILITY", _reason("WORKFLOW_SOURCE_READ_BLOCKED"))
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_SOURCE_READ_FAILED"))
    except ValueError:
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_TRIGGER_UNSUPPORTED"))
    out["evidence"]["workflow_blob_sha"] = source.get("blob_sha")
    if event not in triggers:
        return _finish(out, "TRIGGER_NOT_APPLICABLE", _reason("EVENT_NOT_CONFIGURED"))
    trigger = triggers[event]
    if trigger.get("unsupported"):
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_TRIGGER_UNSUPPORTED"))
    filters = trigger.get("filters")
    if not isinstance(filters, dict):
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_TRIGGER_UNSUPPORTED"))
    if (filters.get("branches") and filters.get("branches-ignore")) or (filters.get("paths") and filters.get("paths-ignore")):
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_TRIGGER_UNSUPPORTED"))
    try:
        branch_applicable = _branch_applicable(filters, ref)
    except ValueError:
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_PATTERN_UNSUPPORTED"))
    if branch_applicable is None:
        return _finish(out, "UNKNOWN", _reason("REF_REQUIRED_FOR_BRANCH_FILTER"))
    if not branch_applicable:
        return _finish(out, "TRIGGER_NOT_APPLICABLE", _reason("REF_FILTERED"))

    has_path_filter = bool(filters.get("paths") or filters.get("paths-ignore"))
    if not has_path_filter:
        return _finish(out, "MISSING_UNEXPECTED", _reason("APPLICABLE_TRIGGER_NO_RUN"))
    exact_before = _valid_sha(before_sha)
    if exact_before is None:
        return _finish(out, "UNKNOWN", _reason("TRANSITION_IDENTITY_REQUIRED"))
    try:
        paths, complete = reader.compare_changed_paths(exact_before, exact_sha)
    except GitHubReadError as exc:
        if exc.status_code == 403:
            return _finish(out, "BLOCKED_CAPABILITY", _reason("TRANSITION_READ_BLOCKED"))
        return _finish(out, "UNKNOWN", _reason("TRANSITION_READ_FAILED"))
    if not complete:
        return _finish(out, "UNKNOWN", _reason("CHANGED_PATHS_INCOMPLETE"))
    out["evidence"]["before_sha"] = exact_before
    out["evidence"]["changed_path_count"] = len(paths)
    try:
        path_applicable = _paths_applicable(filters, paths)
    except ValueError:
        return _finish(out, "UNKNOWN", _reason("WORKFLOW_PATTERN_UNSUPPORTED"))
    if not path_applicable:
        return _finish(out, "EXPECTED_NO_RUN_PATH_FILTER", _reason("PATH_FILTERED"))
    return _finish(out, "MISSING_UNEXPECTED", _reason("APPLICABLE_TRIGGER_NO_RUN"))

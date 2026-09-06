from __future__ import annotations

from typing import Any

from .summary import ALLOWED_RESULTS, repo_ci_summary, resolve_workflow, supported_workflows

MIN_OVERVIEW_WORKFLOWS = 2
MAX_OVERVIEW_WORKFLOWS = 5
MAX_ITEM_ERRORS = 2
ATTENTION_RESULTS = {"FAIL", "INFRA_ERROR", "CANCELLED", "UNKNOWN"}


def _error(code: str, message: str) -> dict[str, str]:
    clean = " ".join(str(message).replace("\x00", "").split())
    if len(clean) > 300:
        clean = clean[:299] + "…"
    return {"code": code, "message": clean}


def _empty_counts() -> dict[str, int]:
    return {result: 0 for result in sorted(ALLOWED_RESULTS)}


def _base(repository: str) -> dict[str, Any]:
    return {
        "ok": False,
        "repository": repository,
        "selection": None,
        "attention_required": True,
        "attention_workflows": [],
        "result_counts": _empty_counts(),
        "unavailable_count": 0,
        "items": [],
        "errors": [],
    }


def _project(spec, result: dict[str, Any]) -> dict[str, Any]:
    summary = result.get("summary") if isinstance(result.get("summary"), dict) else None
    run = result.get("run") if isinstance(result.get("run"), dict) else None
    source = result.get("source") if isinstance(result.get("source"), dict) else None
    errors = result.get("errors") if isinstance(result.get("errors"), list) else []

    run_projection = None
    if run is not None:
        run_projection = {
            "id": run.get("id"),
            "head_branch": run.get("head_branch"),
            "head_sha": run.get("head_sha"),
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
        }

    return {
        "workflow_key": spec.key,
        "workflow_name": spec.name,
        "ok": result.get("ok") is True,
        "ci_result": summary.get("result") if summary is not None else None,
        "summary_complete": summary.get("complete") if summary is not None else None,
        "run": run_projection,
        "source": source,
        "errors": errors[:MAX_ITEM_ERRORS],
    }


def repo_ci_overview(reader, workflows: list[str] | None, ref: str | None = None) -> dict[str, Any]:
    """Return a bounded projection across multiple existing compact CI summaries."""
    out = _base(reader.repository)

    if not isinstance(workflows, list):
        out["errors"] = [_error("WORKFLOW_LIST_REQUIRED", "workflows must be an explicit list")]
        return out
    if not (MIN_OVERVIEW_WORKFLOWS <= len(workflows) <= MAX_OVERVIEW_WORKFLOWS):
        out["errors"] = [
            _error(
                "WORKFLOW_COUNT_INVALID",
                f"request {MIN_OVERVIEW_WORKFLOWS}–{MAX_OVERVIEW_WORKFLOWS} workflows; use repo_ci_summary for one workflow",
            )
        ]
        return out
    if ref is not None and (not isinstance(ref, str) or not ref.strip()):
        out["errors"] = [_error("REF_INVALID", "ref must be a non-empty string when supplied")]
        return out

    specs = []
    seen: set[str] = set()
    for value in workflows:
        if not isinstance(value, str) or not value:
            out["errors"] = [_error("WORKFLOW_UNSUPPORTED", "workflow values must be non-empty strings")]
            out["supported_workflows"] = supported_workflows()
            return out
        spec = resolve_workflow(value)
        if spec is None:
            out["errors"] = [_error("WORKFLOW_UNSUPPORTED", f"unsupported workflow: {value}")]
            out["supported_workflows"] = supported_workflows()
            return out
        if spec.key in seen:
            out["errors"] = [_error("WORKFLOW_DUPLICATE", f"duplicate workflow family: {spec.key}")]
            return out
        seen.add(spec.key)
        specs.append(spec)

    selected_ref = ref if ref is not None else "main"
    out["selection"] = {
        "mode": "latest-per-workflow",
        "ref": selected_ref,
        "workflow_count": len(specs),
        "workflow_keys": [spec.key for spec in specs],
    }

    items = []
    counts = _empty_counts()
    unavailable_count = 0
    attention = []

    for spec in specs:
        result = repo_ci_summary(reader, workflow=spec.key, ref=selected_ref)
        item = _project(spec, result)
        items.append(item)

        ci_result = item["ci_result"]
        if item["ok"] and ci_result in counts:
            counts[ci_result] += 1
        else:
            unavailable_count += 1

        needs_attention = (
            not item["ok"]
            or item["summary_complete"] is not True
            or ci_result in ATTENTION_RESULTS
        )
        if needs_attention:
            attention.append(spec.key)

    out["items"] = items
    out["result_counts"] = counts
    out["unavailable_count"] = unavailable_count
    out["attention_workflows"] = attention
    out["attention_required"] = bool(attention)
    out["ok"] = unavailable_count == 0
    return out

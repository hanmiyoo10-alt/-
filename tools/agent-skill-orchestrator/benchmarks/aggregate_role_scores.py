from __future__ import annotations

from copy import deepcopy
from typing import Any, Iterable

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract
from benchmarks.score_role_output import (
    BOOL_METRIC_KEYS,
    COUNT_METRIC_KEYS,
    RATIO_METRIC_KEYS,
    ROLE_METRIC_KEYS,
    ROLES,
    SCORING_POLICY_ID,
    SCORING_POLICY_SHA256,
    RoleBenchmarkError,
    ratio,
    validate_ratio,
    validate_score,
)

AGGREGATE_SCHEMA = "role-benchmark-aggregate-v1.schema.json"

SYNTH_AGG_METRIC_KEYS = frozenset(
    (ROLE_METRIC_KEYS["synthesizer"] - {"compact_completion_status"})
    | {"compact_completion_ratio"}
)
AGG_ROLE_METRIC_KEYS = {
    "scout": ROLE_METRIC_KEYS["scout"],
    "mapper": ROLE_METRIC_KEYS["mapper"],
    "critic": ROLE_METRIC_KEYS["critic"],
    "synthesizer": SYNTH_AGG_METRIC_KEYS,
}

EXECUTION_KEYS = frozenset({
    "total",
    "completed",
    "invalid",
    "execution_incomplete",
    "failed",
    "parse_valid",
    "contract_valid",
    "semantic_scored",
})
RELIABILITY_KEYS = frozenset({
    "completion_ratio",
    "parse_valid_ratio",
    "contract_valid_ratio",
    "semantic_scored_ratio",
})
TELEMETRY_FIELDS = (
    "wall_clock_ms",
    "server_cpu_ms",
    "server_peak_rss_bytes",
    "prompt_tokens",
    "completion_tokens",
)
TELEMETRY_AGG_KEYS = frozenset(
    key
    for field in TELEMETRY_FIELDS
    for key in (f"{field}_sum", f"{field}_known_count")
)


class RoleBenchmarkAggregateError(RoleBenchmarkError):
    pass


def _fail(message: str) -> None:
    raise RoleBenchmarkAggregateError(message)


def _nonnegative_int(value: Any, label: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        _fail(f"{label} must be a non-negative integer")
    return value


def aggregate_sha256(aggregate: dict[str, Any]) -> str:
    base = deepcopy(aggregate)
    base.pop("aggregate_sha256", None)
    return canonical_sha256(base)


def _cell_identity(score: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        score["role"],
        score["model_profile_id"],
        score["case_id"],
        score["case_version"],
    )


def _cell_sort_key(score: dict[str, Any]) -> tuple[str, str, str, str, str]:
    return (*_cell_identity(score), score["result_sha256"])


def _execution_summary(scores: list[dict[str, Any]]) -> dict[str, int]:
    total = len(scores)
    completed = sum(item["execution_status"] == "COMPLETED" for item in scores)
    invalid = sum(item["execution_status"] == "INVALID" for item in scores)
    incomplete = sum(item["execution_status"] == "EXECUTION_INCOMPLETE" for item in scores)
    failed = sum(item["execution_status"] == "FAILED" for item in scores)
    parse_valid = sum(item["parse_valid"] for item in scores)
    contract_valid = sum(item["contract_valid"] for item in scores)
    semantic = sum(item["semantic_scored"] for item in scores)
    return {
        "total": total,
        "completed": completed,
        "invalid": invalid,
        "execution_incomplete": incomplete,
        "failed": failed,
        "parse_valid": parse_valid,
        "contract_valid": contract_valid,
        "semantic_scored": semantic,
    }


def _reliability(execution: dict[str, int]) -> dict[str, dict[str, int | None]]:
    total = execution["total"]
    return {
        "completion_ratio": ratio(execution["completed"], total),
        "parse_valid_ratio": ratio(execution["parse_valid"], total),
        "contract_valid_ratio": ratio(execution["contract_valid"], total),
        "semantic_scored_ratio": ratio(execution["semantic_scored"], total),
    }


def _aggregate_metrics(role: str, scores: list[dict[str, Any]]) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    score_keys = ROLE_METRIC_KEYS[role]
    for key in sorted(score_keys):
        if key in RATIO_METRIC_KEYS:
            numerator = sum(item["metrics"][key]["numerator"] for item in scores)
            denominator = sum(item["metrics"][key]["denominator"] for item in scores)
            metrics[key] = ratio(numerator, denominator)
        elif key in COUNT_METRIC_KEYS:
            metrics[key] = sum(item["metrics"][key] for item in scores)
        elif key == "compact_completion_status":
            metrics["compact_completion_ratio"] = ratio(
                sum(bool(item["metrics"][key]) for item in scores),
                len(scores),
            )
        else:
            _fail(f"unsupported metric {key!r}")
    return metrics


def _aggregate_telemetry(scores: list[dict[str, Any]]) -> dict[str, int]:
    output: dict[str, int] = {}
    for field in TELEMETRY_FIELDS:
        values = [item["telemetry"][field] for item in scores if item["telemetry"][field] is not None]
        output[f"{field}_sum"] = sum(values)
        output[f"{field}_known_count"] = len(values)
    return output


def _cell_projection(score: dict[str, Any]) -> dict[str, Any]:
    return {
        "case_id": score["case_id"],
        "case_version": score["case_version"],
        "fixture_sha256": score["fixture_sha256"],
        "result_sha256": score["result_sha256"],
        "score_sha256": score["score_sha256"],
        "execution_status": score["execution_status"],
        "parse_valid": score["parse_valid"],
        "contract_valid": score["contract_valid"],
        "semantic_scored": score["semantic_scored"],
        "telemetry": deepcopy(score["telemetry"]),
        "metrics": deepcopy(score["metrics"]),
    }


def aggregate_role_scores(scores: Iterable[dict[str, Any]]) -> dict[str, Any]:
    normalized = [validate_score(item) for item in scores]
    seen: set[tuple[str, str, str, str]] = set()
    for item in normalized:
        identity = _cell_identity(item)
        if identity in seen:
            _fail("duplicate benchmark cell identity: " + "/".join(identity))
        seen.add(identity)

    ordered = sorted(normalized, key=_cell_sort_key)
    groups: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for item in ordered:
        key = (item["role"], item["model_profile_id"], item["model_family"])
        groups.setdefault(key, []).append(item)

    rows: list[dict[str, Any]] = []
    for (role, profile_id, family), items in sorted(groups.items()):
        execution = _execution_summary(items)
        rows.append({
            "role": role,
            "model_profile_id": profile_id,
            "model_family": family,
            "cell_count": len(items),
            "execution": execution,
            "reliability": _reliability(execution),
            "metrics": _aggregate_metrics(role, items),
            "telemetry": _aggregate_telemetry(items),
            "cells": [_cell_projection(item) for item in items],
        })

    aggregate = {
        "schema_version": 1,
        "scoring_policy_id": SCORING_POLICY_ID,
        "scoring_policy_sha256": SCORING_POLICY_SHA256,
        "contributing_score_sha256": [item["score_sha256"] for item in ordered],
        "rows": rows,
    }
    aggregate["aggregate_sha256"] = aggregate_sha256(aggregate)
    validate_aggregate(aggregate)
    return aggregate


def _validate_execution(value: Any, *, cell_count: int, label: str) -> dict[str, int]:
    if not isinstance(value, dict) or set(value) != EXECUTION_KEYS:
        _fail(f"{label} fields invalid")
    normalized = {key: _nonnegative_int(raw, f"{label}.{key}") for key, raw in value.items()}
    if normalized["total"] != cell_count:
        _fail(f"{label}.total must equal cell_count")
    terminal_total = (
        normalized["completed"]
        + normalized["invalid"]
        + normalized["execution_incomplete"]
        + normalized["failed"]
    )
    if terminal_total != cell_count:
        _fail(f"{label} terminal execution counts must sum to cell_count")
    for key in ("parse_valid", "contract_valid", "semantic_scored"):
        if normalized[key] > cell_count:
            _fail(f"{label}.{key} exceeds cell_count")
    if normalized["semantic_scored"] > normalized["contract_valid"] or normalized["contract_valid"] > normalized["parse_valid"]:
        _fail(f"{label} validity counts are inconsistent")
    return normalized


def _validate_reliability(value: Any, execution: dict[str, int], label: str) -> None:
    if not isinstance(value, dict) or set(value) != RELIABILITY_KEYS:
        _fail(f"{label} fields invalid")
    expected = _reliability(execution)
    if value != expected:
        _fail(f"{label} does not match deterministic execution ratios")
    for key, item in value.items():
        validate_ratio(item, f"{label}.{key}")


def _validate_metrics(value: Any, role: str, label: str) -> None:
    if not isinstance(value, dict) or set(value) != AGG_ROLE_METRIC_KEYS[role]:
        _fail(f"{label} does not match exact aggregate metric vector")
    for key, item in value.items():
        if key in RATIO_METRIC_KEYS or key == "compact_completion_ratio":
            validate_ratio(item, f"{label}.{key}")
        elif key in COUNT_METRIC_KEYS:
            _nonnegative_int(item, f"{label}.{key}")
        else:
            _fail(f"{label} contains unsupported metric {key!r}")


def _validate_telemetry(value: Any, cell_count: int, label: str) -> None:
    if not isinstance(value, dict) or set(value) != TELEMETRY_AGG_KEYS:
        _fail(f"{label} fields invalid")
    for field in TELEMETRY_FIELDS:
        total = _nonnegative_int(value[f"{field}_sum"], f"{label}.{field}_sum")
        known = _nonnegative_int(value[f"{field}_known_count"], f"{label}.{field}_known_count")
        if known > cell_count:
            _fail(f"{label}.{field}_known_count exceeds cell_count")
        if known == 0 and total != 0:
            _fail(f"{label}.{field}_sum must be zero when known_count is zero")


def _validate_cell(cell: Any, role: str, label: str) -> dict[str, Any]:
    expected_keys = {
        "case_id",
        "case_version",
        "fixture_sha256",
        "result_sha256",
        "score_sha256",
        "execution_status",
        "parse_valid",
        "contract_valid",
        "semantic_scored",
        "telemetry",
        "metrics",
    }
    if not isinstance(cell, dict) or set(cell) != expected_keys:
        _fail(f"{label} fields invalid")
    if cell["execution_status"] not in {"COMPLETED", "INVALID", "EXECUTION_INCOMPLETE", "FAILED"}:
        _fail(f"{label}.execution_status invalid")
    for key in ("parse_valid", "contract_valid", "semantic_scored"):
        if not isinstance(cell[key], bool):
            _fail(f"{label}.{key} must be boolean")
    if cell["contract_valid"] and not cell["parse_valid"]:
        _fail(f"{label} validity flags inconsistent")
    expected_semantic = cell["execution_status"] == "COMPLETED" and cell["parse_valid"] and cell["contract_valid"]
    if cell["semantic_scored"] != expected_semantic:
        _fail(f"{label}.semantic_scored drifted")
    for key in ("case_id", "case_version", "fixture_sha256", "result_sha256", "score_sha256"):
        if not isinstance(cell[key], str) or not cell[key]:
            _fail(f"{label}.{key} must be non-empty")
    score_metric_keys = ROLE_METRIC_KEYS[role]
    if not isinstance(cell["metrics"], dict) or set(cell["metrics"]) != score_metric_keys:
        _fail(f"{label}.metrics does not match role vector")
    for key, value in cell["metrics"].items():
        if key in RATIO_METRIC_KEYS:
            validate_ratio(value, f"{label}.metrics.{key}")
        elif key in COUNT_METRIC_KEYS:
            _nonnegative_int(value, f"{label}.metrics.{key}")
        elif key in BOOL_METRIC_KEYS:
            if not isinstance(value, bool):
                _fail(f"{label}.metrics.{key} must be boolean")
    telemetry = cell["telemetry"]
    if not isinstance(telemetry, dict) or set(telemetry) != set(TELEMETRY_FIELDS):
        _fail(f"{label}.telemetry fields invalid")
    for field, raw in telemetry.items():
        if raw is not None:
            _nonnegative_int(raw, f"{label}.telemetry.{field}")
    return deepcopy(cell)


def _recompute_row_from_cells(row: dict[str, Any]) -> dict[str, Any]:
    role = row["role"]
    pseudo_scores: list[dict[str, Any]] = []
    for cell in row["cells"]:
        pseudo_scores.append({
            "execution_status": cell["execution_status"],
            "parse_valid": cell["parse_valid"],
            "contract_valid": cell["contract_valid"],
            "semantic_scored": cell["semantic_scored"],
            "telemetry": cell["telemetry"],
            "metrics": cell["metrics"],
        })
    execution = _execution_summary(pseudo_scores)
    return {
        "execution": execution,
        "reliability": _reliability(execution),
        "metrics": _aggregate_metrics(role, pseudo_scores),
        "telemetry": _aggregate_telemetry(pseudo_scores),
    }


def validate_aggregate(aggregate: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_contract(aggregate, AGGREGATE_SCHEMA)
    except ContractValidationError as exc:
        raise RoleBenchmarkAggregateError(f"aggregate schema invalid: {exc}") from exc
    if aggregate["schema_version"] != 1:
        _fail("aggregate schema_version must equal 1")
    if aggregate["scoring_policy_id"] != SCORING_POLICY_ID or aggregate["scoring_policy_sha256"] != SCORING_POLICY_SHA256:
        _fail("aggregate scoring policy identity drifted")
    rows = aggregate["rows"]
    if not isinstance(rows, list):
        _fail("aggregate rows must be an array")

    flattened_score_shas: list[tuple[tuple[str, str, str, str, str], str]] = []
    seen_cells: set[tuple[str, str, str, str]] = set()
    previous_row_key: tuple[str, str, str] | None = None
    normalized_rows: list[dict[str, Any]] = []
    for row_index, row in enumerate(rows):
        expected_row_keys = {
            "role",
            "model_profile_id",
            "model_family",
            "cell_count",
            "execution",
            "reliability",
            "metrics",
            "telemetry",
            "cells",
        }
        if not isinstance(row, dict) or set(row) != expected_row_keys:
            _fail(f"aggregate.rows[{row_index}] fields invalid")
        role = row["role"]
        if role not in ROLES:
            _fail(f"aggregate.rows[{row_index}].role invalid")
        for key in ("model_profile_id", "model_family"):
            if not isinstance(row[key], str) or not row[key]:
                _fail(f"aggregate.rows[{row_index}].{key} must be non-empty")
        row_key = (role, row["model_profile_id"], row["model_family"])
        if previous_row_key is not None and row_key <= previous_row_key:
            _fail("aggregate rows must be in canonical role/model order")
        previous_row_key = row_key
        cell_count = _nonnegative_int(row["cell_count"], f"aggregate.rows[{row_index}].cell_count")
        if not isinstance(row["cells"], list) or len(row["cells"]) != cell_count:
            _fail(f"aggregate.rows[{row_index}].cells length must equal cell_count")

        normalized_cells = []
        previous_cell_key: tuple[str, str, str] | None = None
        for cell_index, raw_cell in enumerate(row["cells"]):
            cell = _validate_cell(raw_cell, role, f"aggregate.rows[{row_index}].cells[{cell_index}]")
            cell_key = (cell["case_id"], cell["case_version"], cell["result_sha256"])
            if previous_cell_key is not None and cell_key <= previous_cell_key:
                _fail("aggregate row cells must be in canonical case/version/result order")
            previous_cell_key = cell_key
            identity = (role, row["model_profile_id"], cell["case_id"], cell["case_version"])
            if identity in seen_cells:
                _fail("aggregate contains duplicate benchmark cell identity")
            seen_cells.add(identity)
            global_key = (*identity, cell["result_sha256"])
            flattened_score_shas.append((global_key, cell["score_sha256"]))
            normalized_cells.append(cell)

        execution = _validate_execution(row["execution"], cell_count=cell_count, label=f"aggregate.rows[{row_index}].execution")
        _validate_reliability(row["reliability"], execution, f"aggregate.rows[{row_index}].reliability")
        _validate_metrics(row["metrics"], role, f"aggregate.rows[{row_index}].metrics")
        _validate_telemetry(row["telemetry"], cell_count, f"aggregate.rows[{row_index}].telemetry")

        recomputed = _recompute_row_from_cells({**row, "cells": normalized_cells})
        for key in ("execution", "reliability", "metrics", "telemetry"):
            if row[key] != recomputed[key]:
                _fail(f"aggregate.rows[{row_index}].{key} does not match cell micro-aggregation")
        normalized_rows.append(deepcopy(row))

    expected_score_shas = [sha for _, sha in sorted(flattened_score_shas)]
    if aggregate["contributing_score_sha256"] != expected_score_shas:
        _fail("aggregate contributing_score_sha256 is not canonical or does not match cells")
    expected_digest = aggregate_sha256(aggregate)
    if aggregate["aggregate_sha256"] != expected_digest:
        _fail("aggregate aggregate_sha256 does not match deterministic recomputation")
    return deepcopy(aggregate)

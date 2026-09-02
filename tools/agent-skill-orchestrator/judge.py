from __future__ import annotations

from typing import Any

from budget import budget_state_sha256, validate_budget_state
from bus import typed_bus_sha256, validate_typed_bus
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from schema_validation import ContractValidationError, validate_contract

JUDGE_RESULT_SCHEMA = "judge-result.schema.json"


class JudgeError(ValueError):
    pass


def _blocker_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (
        str(item["kind"]),
        str(item["subject"]),
        str(item["origin_role"]),
        tuple(item["refs"]),
    )


def _combined_blockers(
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
) -> list[dict[str, Any]]:
    blockers = [
        dict(item)
        for group in (
            evidence_package["blockers"],
            typed_bus["blockers"],
            budget_state["blockers"],
        )
        for item in group
    ]
    return sorted(blockers, key=_blocker_sort_key)


def _material_records(typed_bus: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for key in ("claims", "flow_edges", "boundaries")
        for item in typed_bus[key]
    ]


def _derive_verdict(
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
) -> str:
    blockers = _combined_blockers(evidence_package, typed_bus, budget_state)
    records = _material_records(typed_bus)
    has_positive = any(item["status"] in {"DIRECT", "SUPPORTED_LIKELY"} for item in records)
    has_succeeded_stage = any(
        item["status"] == "SUCCEEDED" for item in budget_state["stage_states"]
    )
    has_typed_conflict = any(item["status"] == "CONFLICT" for item in records)
    has_unresolved_conflict = any(
        item["resolution"] == "UNRESOLVED" for item in typed_bus["conflicts"]
    )
    has_conflict_blocker = any(item["kind"] == "conflict" for item in blockers)
    if has_typed_conflict or has_unresolved_conflict or has_conflict_blocker:
        return "CONFLICT"

    if any(item["kind"] == "execution_incomplete" for item in blockers):
        return "EXECUTION_INCOMPLETE"

    has_budget = budget_state["exhausted"] or any(
        item["kind"] == "budget" for item in blockers
    )
    if has_budget:
        return "PARTIAL" if (has_positive or has_succeeded_stage) else "UNKNOWN"

    has_unknown_record = any(item["status"] == "UNKNOWN" for item in records)
    if blockers or has_unknown_record:
        return "PARTIAL" if has_positive else "UNKNOWN"

    if has_positive:
        return "SUPPORTED"
    return "UNKNOWN"


def validate_judge_result(
    result: dict[str, Any],
    *,
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
) -> None:
    validate_evidence_package(evidence_package)
    known_refs = evidence_source_refs(evidence_package)
    validate_typed_bus(typed_bus, known_source_refs=known_refs)
    validate_budget_state(budget_state, evidence_package=evidence_package)
    try:
        validate_contract(result, JUDGE_RESULT_SCHEMA, known_source_refs=known_refs)
    except ContractValidationError as exc:
        raise JudgeError(f"invalid judge result: {exc}") from exc

    evidence_digest = evidence_package_sha256(evidence_package)
    bus_digest = typed_bus_sha256(typed_bus, known_source_refs=known_refs)
    budget_digest = budget_state_sha256(budget_state, evidence_package=evidence_package)
    if result["evidence_sha256"] != evidence_digest:
        raise JudgeError("judge evidence digest mismatch")
    if typed_bus["evidence_sha256"] != evidence_digest:
        raise JudgeError("typed bus does not bind supplied evidence package")
    if budget_state["evidence_sha256"] != evidence_digest:
        raise JudgeError("budget state does not bind supplied evidence package")
    if result["typed_bus_sha256"] != bus_digest:
        raise JudgeError("judge typed bus digest mismatch")
    if result["budget_state_sha256"] != budget_digest:
        raise JudgeError("judge budget state digest mismatch")

    expected_blockers = _combined_blockers(evidence_package, typed_bus, budget_state)
    if result["blockers"] != expected_blockers:
        raise JudgeError("judge blockers must preserve exact deterministic blocker inputs")
    expected_verdict = _derive_verdict(evidence_package, typed_bus, budget_state)
    if result["final_verdict"] != expected_verdict:
        raise JudgeError("judge final verdict does not match deterministic precedence")


def judge_result_sha256(
    result: dict[str, Any],
    *,
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
) -> str:
    validate_judge_result(
        result,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
    )
    return canonical_sha256(result)


def judge_synthetic(
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
) -> dict[str, Any]:
    """Derive the O1 analysis verdict from validated deterministic inputs only."""
    validate_evidence_package(evidence_package)
    known_refs = evidence_source_refs(evidence_package)
    validate_typed_bus(typed_bus, known_source_refs=known_refs)
    validate_budget_state(budget_state, evidence_package=evidence_package)
    blockers = _combined_blockers(evidence_package, typed_bus, budget_state)
    result = {
        "schema_version": 1,
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "typed_bus_sha256": typed_bus_sha256(typed_bus, known_source_refs=known_refs),
        "budget_state_sha256": budget_state_sha256(
            budget_state, evidence_package=evidence_package
        ),
        "final_verdict": _derive_verdict(evidence_package, typed_bus, budget_state),
        "blockers": blockers,
    }
    validate_judge_result(
        result,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
    )
    return result

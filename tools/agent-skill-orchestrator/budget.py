from __future__ import annotations

from typing import Any, Iterable

from bus import (
    build_typed_bus,
    synthetic_role_fixture_sha256,
    validate_synthetic_role_fixture,
)
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from router import execution_plan_sha256
from schema_validation import ContractValidationError, validate_contract

BUDGET_STATE_SCHEMA = "budget-state.schema.json"
DEFAULT_ROLE_ATTEMPT_LIMITS = {
    "deterministic_only": 0,
    "fast": 1,
    "standard": 4,
}


class BudgetError(ValueError):
    pass


def _blocker_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (
        str(item["kind"]),
        str(item["subject"]),
        str(item["origin_role"]),
        tuple(item["refs"]),
    )


def _state_blocker(state: dict[str, Any]) -> dict[str, Any] | None:
    stage_id = str(state["stage_id"])
    status = str(state["status"])
    cause = str(state["cause"])
    if status == "SUCCEEDED":
        return None
    if status == "FAILED":
        subject = f"stage {stage_id} failed"
        kind = "execution_incomplete"
    elif status == "MISSING_INPUT":
        subject = f"stage {stage_id} missing synthetic input"
        kind = "execution_incomplete"
    elif status == "SKIPPED_BUDGET":
        subject = f"stage {stage_id} skipped: synthetic role-attempt budget exhausted"
        kind = "budget"
    elif status == "BLOCKED_DEPENDENCY":
        dependencies = ",".join(str(item) for item in state["depends_on"])
        subject = f"stage {stage_id} blocked by dependency ({cause}): {dependencies}"
        kind = "budget" if cause == "budget" else "execution_incomplete"
    else:
        raise BudgetError(f"unsupported synthetic stage status: {status}")
    return {
        "kind": kind,
        "subject": subject,
        "origin_role": "deterministic",
        "refs": [],
    }


def _derived_blockers(stage_states: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    blockers = [item for item in (_state_blocker(state) for state in stage_states) if item]
    return sorted(blockers, key=_blocker_sort_key)


def _validate_stage_shape(state: dict[str, Any]) -> None:
    status = str(state["status"])
    cause = str(state["cause"])
    has_fixture = "fixture_sha256" in state
    if status == "SUCCEEDED":
        if cause != "none":
            raise BudgetError("SUCCEEDED synthetic stage must have cause=none")
        if not has_fixture:
            raise BudgetError("SUCCEEDED synthetic stage must carry fixture_sha256")
        return
    if has_fixture:
        raise BudgetError(f"{status} synthetic stage must not carry fixture_sha256")
    if status in {"FAILED", "MISSING_INPUT"} and cause != "execution":
        raise BudgetError(f"{status} synthetic stage must have cause=execution")
    if status == "SKIPPED_BUDGET" and cause != "budget":
        raise BudgetError("SKIPPED_BUDGET synthetic stage must have cause=budget")
    if status == "BLOCKED_DEPENDENCY" and cause not in {"execution", "budget"}:
        raise BudgetError("BLOCKED_DEPENDENCY synthetic stage must identify execution or budget cause")


def validate_budget_state(
    state: dict[str, Any],
    *,
    execution_plan: dict[str, Any] | None = None,
    evidence_package: dict[str, Any] | None = None,
) -> None:
    known_refs = None
    if evidence_package is not None:
        validate_evidence_package(evidence_package)
        known_refs = evidence_source_refs(evidence_package)
    try:
        validate_contract(state, BUDGET_STATE_SCHEMA, known_source_refs=known_refs)
    except ContractValidationError as exc:
        raise BudgetError(f"invalid budget state: {exc}") from exc

    max_attempts = state["max_role_attempts"]
    role_attempt_count = state["role_attempt_count"]
    if max_attempts < 0 or role_attempt_count < 0:
        raise BudgetError("role-attempt counts must be non-negative")
    if role_attempt_count > max_attempts:
        raise BudgetError("role_attempt_count exceeds max_role_attempts")

    stage_states = state["stage_states"]
    stage_ids = [str(item["stage_id"]) for item in stage_states]
    if len(stage_ids) != len(set(stage_ids)):
        raise BudgetError("duplicate stage id in budget state")
    for item in stage_states:
        _validate_stage_shape(item)
    expected_attempts = sum(
        1 for item in stage_states if item["status"] in {"SUCCEEDED", "FAILED"}
    )
    if role_attempt_count != expected_attempts:
        raise BudgetError("role_attempt_count does not equal launched synthetic stages")
    expected_exhausted = any(item["cause"] == "budget" for item in stage_states)
    if state["exhausted"] != expected_exhausted:
        raise BudgetError("budget exhausted flag does not match stage causes")
    expected_blockers = _derived_blockers(stage_states)
    if state["blockers"] != expected_blockers:
        raise BudgetError("budget blockers must equal deterministic stage-state derivation")

    if execution_plan is not None:
        try:
            validate_contract(execution_plan, "execution-plan.schema.json")
        except ContractValidationError as exc:
            raise BudgetError(f"invalid execution plan: {exc}") from exc
        if state["execution_plan_sha256"] != execution_plan_sha256(execution_plan):
            raise BudgetError("budget state execution plan digest mismatch")
        execution_class = str(execution_plan["execution_class"])
        if execution_class not in DEFAULT_ROLE_ATTEMPT_LIMITS:
            raise BudgetError(f"unsupported execution class for synthetic budget: {execution_class}")
        default_limit = DEFAULT_ROLE_ATTEMPT_LIMITS[execution_class]
        if max_attempts > default_limit:
            raise BudgetError("synthetic budget may not exceed execution-class default")
        expected_stages = execution_plan["role_stages"]
        if len(stage_states) != len(expected_stages):
            raise BudgetError("budget state must contain exactly one state per plan role stage")
        for actual, expected in zip(stage_states, expected_stages):
            if actual["stage_id"] != expected["stage_id"]:
                raise BudgetError("budget stage order/id does not match execution plan")
            if actual["role"] != expected["role_id"]:
                raise BudgetError("budget stage role does not match execution plan")
            if actual["depends_on"] != expected["depends_on"]:
                raise BudgetError("budget stage dependencies do not match execution plan")
        expected_profile = (
            {0: "deterministic-only", 1: "fast-cpu", 4: "standard-cpu"}.get(default_limit)
            if max_attempts == default_limit
            else f"synthetic-strict-{max_attempts}"
        )
        if state["profile_id"] != expected_profile:
            raise BudgetError("budget profile_id does not match execution class/limit")

    if evidence_package is not None:
        if state["evidence_sha256"] != evidence_package_sha256(evidence_package):
            raise BudgetError("budget state evidence digest mismatch")
        if execution_plan is not None and evidence_package["execution_plan_sha256"] != execution_plan_sha256(execution_plan):
            raise BudgetError("evidence package does not bind supplied execution plan")


def budget_state_sha256(
    state: dict[str, Any],
    *,
    execution_plan: dict[str, Any] | None = None,
    evidence_package: dict[str, Any] | None = None,
) -> str:
    validate_budget_state(
        state,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
    )
    return canonical_sha256(state)


def _budget_profile(execution_class: str, override: int | None) -> tuple[str, int]:
    if execution_class not in DEFAULT_ROLE_ATTEMPT_LIMITS:
        raise BudgetError(f"unsupported execution class for synthetic budget: {execution_class}")
    default_limit = DEFAULT_ROLE_ATTEMPT_LIMITS[execution_class]
    if override is None:
        profile_id = {
            "deterministic_only": "deterministic-only",
            "fast": "fast-cpu",
            "standard": "standard-cpu",
        }[execution_class]
        return profile_id, default_limit
    if isinstance(override, bool) or not isinstance(override, int):
        raise BudgetError("synthetic role-attempt override must be an integer")
    if override < 0 or override > default_limit:
        raise BudgetError("synthetic role-attempt override must be stricter than or equal to default")
    return f"synthetic-strict-{override}", override


def execute_synthetic_budget(
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    fixtures: Iterable[dict[str, Any]],
    *,
    failed_stage_ids: Iterable[str] = (),
    role_attempt_limit_override: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Deterministically admit O1 synthetic fixtures under a role-attempt budget.

    This function performs zero model calls. Successful fixtures are the only fixtures
    admitted to the B1 typed bus; failed/missing/budget/dependency states remain control
    plane metadata and deterministic blockers.
    """
    try:
        validate_contract(execution_plan, "execution-plan.schema.json")
    except ContractValidationError as exc:
        raise BudgetError(f"invalid execution plan: {exc}") from exc
    validate_evidence_package(evidence_package)
    if evidence_package["execution_plan_sha256"] != execution_plan_sha256(execution_plan):
        raise BudgetError("evidence package execution plan digest mismatch")

    profile_id, max_attempts = _budget_profile(
        str(execution_plan["execution_class"]), role_attempt_limit_override
    )
    stage_map = {
        str(item["stage_id"]): item for item in execution_plan["role_stages"]
    }

    fixture_by_stage: dict[str, dict[str, Any]] = {}
    for fixture in fixtures:
        validate_synthetic_role_fixture(
            fixture,
            execution_plan=execution_plan,
            evidence_package=evidence_package,
        )
        stage_id = str(fixture["stage_id"])
        if stage_id in fixture_by_stage:
            raise BudgetError(f"duplicate synthetic fixture for stage: {stage_id}")
        fixture_by_stage[stage_id] = fixture

    failed = [str(item) for item in failed_stage_ids]
    if len(failed) != len(set(failed)):
        raise BudgetError("duplicate failed stage id")
    unknown_failed = sorted(set(failed) - set(stage_map))
    if unknown_failed:
        raise BudgetError(f"unknown failed stage id: {', '.join(unknown_failed)}")
    overlap = sorted(set(failed) & set(fixture_by_stage))
    if overlap:
        raise BudgetError(f"stage cannot be both successful fixture and failed: {', '.join(overlap)}")

    role_attempt_count = 0
    succeeded: set[str] = set()
    cause_by_stage: dict[str, str] = {}
    stage_states: list[dict[str, Any]] = []
    admitted_fixtures: list[dict[str, Any]] = []

    for stage in execution_plan["role_stages"]:
        stage_id = str(stage["stage_id"])
        role = str(stage["role_id"])
        dependencies = [str(item) for item in stage["depends_on"]]
        unsatisfied = [item for item in dependencies if item not in succeeded]
        state: dict[str, Any] = {
            "stage_id": stage_id,
            "role": role,
            "status": "MISSING_INPUT",
            "cause": "execution",
            "depends_on": dependencies,
        }

        if unsatisfied:
            dependency_causes = [cause_by_stage.get(item, "execution") for item in unsatisfied]
            cause = "execution" if "execution" in dependency_causes else "budget"
            state["status"] = "BLOCKED_DEPENDENCY"
            state["cause"] = cause
            cause_by_stage[stage_id] = cause
        elif role_attempt_count >= max_attempts:
            state["status"] = "SKIPPED_BUDGET"
            state["cause"] = "budget"
            cause_by_stage[stage_id] = "budget"
        elif stage_id in fixture_by_stage:
            fixture = fixture_by_stage[stage_id]
            role_attempt_count += 1
            state["status"] = "SUCCEEDED"
            state["cause"] = "none"
            state["fixture_sha256"] = synthetic_role_fixture_sha256(
                fixture,
                execution_plan=execution_plan,
                evidence_package=evidence_package,
            )
            succeeded.add(stage_id)
            cause_by_stage[stage_id] = "none"
            admitted_fixtures.append(fixture)
        elif stage_id in failed:
            role_attempt_count += 1
            state["status"] = "FAILED"
            state["cause"] = "execution"
            cause_by_stage[stage_id] = "execution"
        else:
            cause_by_stage[stage_id] = "execution"

        stage_states.append(state)

    blockers = _derived_blockers(stage_states)
    state = {
        "schema_version": 1,
        "execution_plan_sha256": execution_plan_sha256(execution_plan),
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "profile_id": profile_id,
        "max_role_attempts": max_attempts,
        "role_attempt_count": role_attempt_count,
        "model_call_count": 0,
        "exhausted": any(item["cause"] == "budget" for item in stage_states),
        "stage_states": stage_states,
        "blockers": blockers,
    }
    validate_budget_state(
        state,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
    )
    typed_bus = build_typed_bus(execution_plan, evidence_package, admitted_fixtures)
    expected_fixture_map = {
        item["stage_id"]: item["fixture_sha256"]
        for item in stage_states
        if item["status"] == "SUCCEEDED"
    }
    if typed_bus["fixture_sha256"] != expected_fixture_map:
        raise BudgetError("typed bus fixture map does not equal succeeded synthetic stages")
    return typed_bus, state

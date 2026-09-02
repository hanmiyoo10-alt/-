from __future__ import annotations

from typing import Any, Iterable

from budget import (
    budget_state_sha256,
    execute_synthetic_budget,
    validate_budget_state,
)
from bus import typed_bus_sha256, validate_typed_bus
from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from judge import judge_result_sha256, judge_synthetic, validate_judge_result
from router import execution_plan_sha256
from schema_validation import ContractValidationError, validate_contract

SYNTHETIC_RECEIPT_SCHEMA = "synthetic-orchestration-receipt.schema.json"


class SyntheticReceiptError(ValueError):
    pass


def _successful_fixture_map(budget_state: dict[str, Any]) -> dict[str, str]:
    return {
        str(item["stage_id"]): str(item["fixture_sha256"])
        for item in budget_state["stage_states"]
        if item["status"] == "SUCCEEDED"
    }


def validate_synthetic_receipt(
    receipt: dict[str, Any],
    *,
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
    judge_result: dict[str, Any],
) -> None:
    try:
        validate_contract(execution_plan, "execution-plan.schema.json")
    except ContractValidationError as exc:
        raise SyntheticReceiptError(f"invalid execution plan: {exc}") from exc
    validate_evidence_package(evidence_package)
    known_refs = evidence_source_refs(evidence_package)
    validate_typed_bus(typed_bus, known_source_refs=known_refs)
    validate_budget_state(
        budget_state,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
    )
    validate_judge_result(
        judge_result,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
    )
    try:
        validate_contract(receipt, SYNTHETIC_RECEIPT_SCHEMA)
    except ContractValidationError as exc:
        raise SyntheticReceiptError(f"invalid synthetic receipt: {exc}") from exc

    plan_digest = execution_plan_sha256(execution_plan)
    evidence_digest = evidence_package_sha256(evidence_package)
    bus_digest = typed_bus_sha256(typed_bus, known_source_refs=known_refs)
    budget_digest = budget_state_sha256(
        budget_state,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
    )
    judge_digest = judge_result_sha256(
        judge_result,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
    )

    if evidence_package["execution_plan_sha256"] != plan_digest:
        raise SyntheticReceiptError("evidence package execution plan digest mismatch")
    if typed_bus["evidence_sha256"] != evidence_digest:
        raise SyntheticReceiptError("typed bus evidence digest mismatch")
    if budget_state["execution_plan_sha256"] != plan_digest:
        raise SyntheticReceiptError("budget execution plan digest mismatch")
    if budget_state["evidence_sha256"] != evidence_digest:
        raise SyntheticReceiptError("budget evidence digest mismatch")
    if _successful_fixture_map(budget_state) != typed_bus["fixture_sha256"]:
        raise SyntheticReceiptError("typed bus fixture map does not equal successful stage fixtures")

    expected = {
        "scope": execution_plan["scope"],
        "target_repository_sha": evidence_package["target_repository_sha"],
        "request_sha256": execution_plan["request_sha256"],
        "execution_plan_sha256": plan_digest,
        "authority_snapshot_sha256": evidence_package["authority_snapshot_sha256"],
        "evidence_sha256": evidence_digest,
        "typed_bus_sha256": bus_digest,
        "budget_state_sha256": budget_digest,
        "judge_result_sha256": judge_digest,
        "synthetic_fixture_sha256": typed_bus["fixture_sha256"],
        "final_verdict": judge_result["final_verdict"],
    }
    for key, value in expected.items():
        if receipt[key] != value:
            raise SyntheticReceiptError(f"synthetic receipt {key} mismatch")
    if receipt["model_call_count"] != 0 or budget_state["model_call_count"] != 0:
        raise SyntheticReceiptError("O1 synthetic receipt must have exactly zero model calls")


def synthetic_receipt_sha256(
    receipt: dict[str, Any],
    *,
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
    judge_result: dict[str, Any],
) -> str:
    validate_synthetic_receipt(
        receipt,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
        judge_result=judge_result,
    )
    return canonical_sha256(receipt)


def build_synthetic_receipt(
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    typed_bus: dict[str, Any],
    budget_state: dict[str, Any],
    judge_result: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    known_refs = evidence_source_refs(evidence_package)
    receipt = {
        "schema_version": 1,
        "mode": "o1_synthetic_zero_model",
        "scope": execution_plan["scope"],
        "target_repository_sha": evidence_package["target_repository_sha"],
        "request_sha256": execution_plan["request_sha256"],
        "execution_plan_sha256": execution_plan_sha256(execution_plan),
        "authority_snapshot_sha256": evidence_package["authority_snapshot_sha256"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "typed_bus_sha256": typed_bus_sha256(typed_bus, known_source_refs=known_refs),
        "budget_state_sha256": budget_state_sha256(
            budget_state,
            execution_plan=execution_plan,
            evidence_package=evidence_package,
        ),
        "judge_result_sha256": judge_result_sha256(
            judge_result,
            evidence_package=evidence_package,
            typed_bus=typed_bus,
            budget_state=budget_state,
        ),
        "synthetic_fixture_sha256": dict(typed_bus["fixture_sha256"]),
        "model_call_count": 0,
        "final_verdict": judge_result["final_verdict"],
    }
    validate_synthetic_receipt(
        receipt,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
        typed_bus=typed_bus,
        budget_state=budget_state,
        judge_result=judge_result,
    )
    return receipt


def run_synthetic_control_plane(
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    fixtures: Iterable[dict[str, Any]],
    *,
    failed_stage_ids: Iterable[str] = (),
    role_attempt_limit_override: int | None = None,
) -> dict[str, Any]:
    """Run the complete O1 synthetic control plane with zero model execution."""
    typed_bus, budget_state = execute_synthetic_budget(
        execution_plan,
        evidence_package,
        fixtures,
        failed_stage_ids=failed_stage_ids,
        role_attempt_limit_override=role_attempt_limit_override,
    )
    judge_result = judge_synthetic(evidence_package, typed_bus, budget_state)
    receipt = build_synthetic_receipt(
        execution_plan,
        evidence_package,
        typed_bus,
        budget_state,
        judge_result,
    )
    return {
        "typed_bus": typed_bus,
        "budget_state": budget_state,
        "judge_result": judge_result,
        "receipt": receipt,
    }

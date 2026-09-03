from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable

from canonical import canonical_sha256
from registry import load_model_registry, validate_model_registry_data
from schema_validation import ContractValidationError, validate_contract

PACKAGE_ROOT = Path(__file__).resolve().parent
POLICY_PATH = PACKAGE_ROOT / "models" / "assignment-policy-v1.json"
EVIDENCE_PATH = PACKAGE_ROOT / "models" / "assignment-evidence-o4-through-o4e-20260903.json"
POLICY_SCHEMA = "role-assignment-policy-v1.schema.json"
EVIDENCE_SCHEMA = "role-assignment-evidence-v1.schema.json"
SNAPSHOT_SCHEMA = "role-assignment-snapshot-v1.schema.json"
ROLES = ("scout", "mapper", "critic", "synthesizer")
ZERO_CREDIT_SURFACE = "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS"
PUBLIC_ACCESS = "public_unauthenticated_https"
VERIFIED_LICENSE = "verified_metadata"

ALLOWED_METRICS = frozenset({
    "authority_overclaim_count",
    "authority_precision",
    "authority_recall",
    "blocker_precision",
    "blocker_recall",
    "boundary_precision",
    "boundary_recall",
    "compact_completion_status",
    "edge_precision",
    "edge_recall",
    "excess_optional_selection_count",
    "false_blocker_count",
    "false_edge_count",
    "forbidden_new_claim_count",
    "grounding_precision",
    "invalid_ref_count",
    "optimism_violation_count",
    "optional_useful_selection_recall",
    "owner_precision",
    "owner_recall",
    "required_blocker_conflict_preservation_recall",
    "required_record_preservation_recall",
    "required_uncertainty_preservation_recall",
    "source_selection_precision",
    "source_selection_recall",
})

REASON_CODES = frozenset({
    "ASSIGNED",
    "INSUFFICIENT_INDEPENDENT_CASES",
    "INSUFFICIENT_MODEL_FAMILIES",
    "MISSING_PAIRED_CELL",
    "INCOMPATIBLE_EVIDENCE_IDENTITY",
    "MODEL_INELIGIBLE",
    "THRESHOLD_FAILURE",
    "UNDEFINED_REQUIRED_METRIC",
    "EXACT_TIE",
    "EVIDENCE_CONFLICT",
    "NO_COMPARABLE_O4_EVIDENCE",
})


class AssignmentPolicyError(ValueError):
    pass


def _read_json(path: Path | str) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise AssignmentPolicyError(f"JSON object required: {path}")
    return value


def _self_hash(value: dict[str, Any], field: str) -> str:
    base = deepcopy(value)
    base.pop(field, None)
    return canonical_sha256(base)


def policy_sha256(policy: dict[str, Any]) -> str:
    validate_policy(policy)
    return str(policy["policy_sha256"])


def evidence_sha256(evidence: dict[str, Any]) -> str:
    validate_evidence(evidence)
    return str(evidence["evidence_sha256"])


def snapshot_sha256(snapshot: dict[str, Any]) -> str:
    validate_assignment_snapshot(snapshot)
    return str(snapshot["assignment_sha256"])


def load_assignment_policy(path: Path | str = POLICY_PATH) -> dict[str, Any]:
    value = _read_json(path)
    validate_policy(value)
    return value


def load_assignment_evidence(path: Path | str = EVIDENCE_PATH) -> dict[str, Any]:
    value = _read_json(path)
    validate_evidence(value)
    return value


def _require_nonnegative_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise AssignmentPolicyError(f"{label} must be a non-negative integer")
    return value


def _validate_ratio(value: Any, label: str) -> None:
    if not isinstance(value, dict) or set(value) != {"numerator", "denominator", "basis_points"}:
        raise AssignmentPolicyError(f"{label} must be a closed ratio object")
    numerator = _require_nonnegative_int(value["numerator"], f"{label}.numerator")
    denominator = _require_nonnegative_int(value["denominator"], f"{label}.denominator")
    basis_points = value["basis_points"]
    if numerator > denominator:
        raise AssignmentPolicyError(f"{label} numerator exceeds denominator")
    expected = None if denominator == 0 else (10000 * numerator) // denominator
    if basis_points != expected:
        raise AssignmentPolicyError(f"{label} basis_points mismatch")


def validate_policy(policy: dict[str, Any]) -> None:
    try:
        validate_contract(policy, POLICY_SCHEMA)
    except ContractValidationError as exc:
        raise AssignmentPolicyError(f"invalid O5 policy: {exc}") from exc
    if _self_hash(policy, "policy_sha256") != policy["policy_sha256"]:
        raise AssignmentPolicyError("O5 policy digest mismatch")
    if policy["minimum_distinct_cases"] < 2:
        raise AssignmentPolicyError("O5 policy may not require fewer than two distinct cases")
    if policy["minimum_model_families"] < 2:
        raise AssignmentPolicyError("O5 policy may not require fewer than two model families")
    if policy["weighted_composite_score"] is not False:
        raise AssignmentPolicyError("weighted composite score is forbidden")
    if policy["family_diversity_bonus"] is not False:
        raise AssignmentPolicyError("family diversity bonus is forbidden in O5 v1")
    if policy["exact_tie_behavior"] != "NO_ASSIGNMENT":
        raise AssignmentPolicyError("exact ties must remain unassigned")
    if policy["quality_before_latency"] is not True:
        raise AssignmentPolicyError("quality must precede latency")
    budget = policy["budget"]
    limits = budget["role_call_limits"]
    if limits != {"scout": 1, "mapper": 1, "critic": 1, "synthesizer": 1}:
        raise AssignmentPolicyError("O5 standard role-call limits drifted")
    if budget["total_semantic_role_calls"] != 4:
        raise AssignmentPolicyError("O5 standard total role-call ceiling must be four")
    if budget["hosted_ai_calls"] != 0 or budget["semantic_reruns"] != 0 or budget["escalation_model_calls"] != 0:
        raise AssignmentPolicyError("O5 v1 must use zero hosted AI, semantic reruns, and escalation calls")
    if policy["runtime"]["request_timeout_seconds"] != 1800:
        raise AssignmentPolicyError("O5 request timeout drifted")
    role_rules = policy["role_rules"]
    if set(role_rules) != set(ROLES):
        raise AssignmentPolicyError("O5 role rules must cover exactly the four frozen roles")
    for role, rule in role_rules.items():
        seen_ratios: set[str] = set()
        for threshold in rule["ratio_thresholds"]:
            metric = threshold["metric"]
            if metric not in ALLOWED_METRICS or metric in seen_ratios:
                raise AssignmentPolicyError(f"invalid/duplicate ratio threshold metric for {role}: {metric}")
            seen_ratios.add(metric)
            floor = threshold["minimum_basis_points"]
            if floor < 0 or floor > 10000:
                raise AssignmentPolicyError(f"invalid threshold floor for {role}.{metric}")
        for metric in rule["zero_count_metrics"]:
            if metric not in ALLOWED_METRICS:
                raise AssignmentPolicyError(f"invalid zero-count metric for {role}: {metric}")
        for metric in rule["true_boolean_metrics"]:
            if metric not in ALLOWED_METRICS:
                raise AssignmentPolicyError(f"invalid boolean metric for {role}: {metric}")
        seen_vector: set[str] = set()
        for component in rule["quality_vector"]:
            metric = component["metric"]
            if metric not in ALLOWED_METRICS and metric != "compact_completion_rate":
                raise AssignmentPolicyError(f"invalid quality-vector metric for {role}: {metric}")
            if metric in seen_vector:
                raise AssignmentPolicyError(f"duplicate quality-vector metric for {role}: {metric}")
            seen_vector.add(metric)


def validate_evidence(evidence: dict[str, Any]) -> None:
    try:
        validate_contract(evidence, EVIDENCE_SCHEMA)
    except ContractValidationError as exc:
        raise AssignmentPolicyError(f"invalid O5 evidence: {exc}") from exc
    if _self_hash(evidence, "evidence_sha256") != evidence["evidence_sha256"]:
        raise AssignmentPolicyError("O5 evidence digest mismatch")
    identities: set[tuple[str, str, str, str]] = set()
    for index, cell in enumerate(evidence["cells"]):
        identity = (cell["role"], cell["model_profile_id"], cell["case_id"], cell["case_version"])
        if identity in identities:
            raise AssignmentPolicyError(f"duplicate O5 evidence cell identity at index {index}")
        identities.add(identity)
        if cell["diagnostic_replay_only"] and cell["assignment_eligible"]:
            raise AssignmentPolicyError("diagnostic replay may not be assignment eligible")
        if cell["assignment_eligible"] and cell["assignment_basis"] != "ELIGIBLE_RETROSPECTIVE":
            raise AssignmentPolicyError("eligible evidence must use ELIGIBLE_RETROSPECTIVE basis")
        if cell["diagnostic_replay_only"] and cell["assignment_basis"] != "DIAGNOSTIC_REPLAY_ONLY":
            raise AssignmentPolicyError("diagnostic replay basis mismatch")
        if set(cell["metrics"]) - ALLOWED_METRICS:
            unknown = sorted(set(cell["metrics"]) - ALLOWED_METRICS)
            raise AssignmentPolicyError(f"unknown O5 metric(s): {', '.join(unknown)}")
        for name, value in cell["metrics"].items():
            if isinstance(value, dict):
                _validate_ratio(value, f"cell[{index}].metrics.{name}")
            elif isinstance(value, bool):
                continue
            else:
                _require_nonnegative_int(value, f"cell[{index}].metrics.{name}")
        if cell["wall_clock_ms"] is not None:
            _require_nonnegative_int(cell["wall_clock_ms"], f"cell[{index}].wall_clock_ms")


def _registry_profile_map(registry_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    validate_model_registry_data(registry_data)
    return {str(item["profile_id"]): item for item in registry_data["profiles"]}


def _cell_registry_eligible(cell: dict[str, Any], registry_map: dict[str, dict[str, Any]]) -> bool:
    profile = registry_map.get(str(cell["model_profile_id"]))
    if profile is None:
        return False
    return (
        profile["family"] == cell["model_family"]
        and profile["sha256"] == cell["model_sha256"]
        and profile["enabled"] is True
        and profile["license"]["status"] == VERIFIED_LICENSE
        and profile["access"]["class"] == PUBLIC_ACCESS
        and profile["execution_surface"] == ZERO_CREDIT_SURFACE
    )


def _case_key(cell: dict[str, Any]) -> tuple[str, str]:
    return str(cell["case_id"]), str(cell["case_version"])


def _paired_identity(cell: dict[str, Any]) -> tuple[str, ...]:
    return (
        str(cell["scoring_policy_id"]),
        str(cell["scoring_policy_sha256"]),
        str(cell["role_contract_id"]),
        str(cell["generation_sha256"]),
        str(cell["fixture_sha256"]),
        str(cell["evidence_sha256"]),
        str(cell["prompt_sha256"]),
        str(cell["response_schema_sha256"]),
    )


def _micro_ratio(cells: Iterable[dict[str, Any]], metric: str) -> dict[str, Any] | None:
    numerator = 0
    denominator = 0
    for cell in cells:
        value = cell["metrics"].get(metric)
        if not isinstance(value, dict):
            return None
        if value["basis_points"] is None:
            return None
        numerator += int(value["numerator"])
        denominator += int(value["denominator"])
    if denominator == 0:
        return None
    return {"numerator": numerator, "denominator": denominator, "basis_points": (10000 * numerator) // denominator}


def _compact_completion_rate(cells: list[dict[str, Any]]) -> int:
    if not cells:
        return 0
    complete = sum(1 for cell in cells if cell["metrics"].get("compact_completion_status") is True)
    return (10000 * complete) // len(cells)


def _candidate_evaluation(role: str, profile_id: str, cells: list[dict[str, Any]], rule: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    failures: list[str] = []
    undefined_required = False
    for cell in cells:
        if cell["execution_status"] != "COMPLETED" or cell["parse_valid"] is not True or cell["contract_valid"] is not True:
            failures.append("execution_or_contract")
            break

    aggregated_ratios: dict[str, dict[str, Any]] = {}
    for threshold in rule["ratio_thresholds"]:
        metric = threshold["metric"]
        aggregate = _micro_ratio(cells, metric)
        if aggregate is None:
            failures.append(f"undefined:{metric}")
            undefined_required = True
            continue
        aggregated_ratios[metric] = aggregate
        if aggregate["basis_points"] < threshold["minimum_basis_points"]:
            failures.append(f"threshold:{metric}")

    zero_counts: dict[str, int] = {}
    for metric in rule["zero_count_metrics"]:
        values = [cell["metrics"].get(metric) for cell in cells]
        if any(isinstance(value, bool) or not isinstance(value, int) for value in values):
            failures.append(f"missing_count:{metric}")
            continue
        total = sum(int(value) for value in values)
        zero_counts[metric] = total
        if total != 0:
            failures.append(f"nonzero:{metric}")

    boolean_values: dict[str, bool] = {}
    for metric in rule["true_boolean_metrics"]:
        values = [cell["metrics"].get(metric) for cell in cells]
        passed = all(value is True for value in values)
        boolean_values[metric] = passed
        if not passed:
            failures.append(f"false:{metric}")

    vector: list[dict[str, Any]] = []
    for component in rule["quality_vector"]:
        metric = component["metric"]
        if metric == "compact_completion_rate":
            value = _compact_completion_rate(cells)
        elif metric in aggregated_ratios:
            value = aggregated_ratios[metric]["basis_points"]
        elif all(isinstance(cell["metrics"].get(metric), dict) for cell in cells):
            aggregate = _micro_ratio(cells, metric)
            if aggregate is None:
                failures.append(f"missing_vector:{metric}")
                value = 0
            else:
                value = aggregate["basis_points"]
        else:
            raw_values = [cell["metrics"].get(metric) for cell in cells]
            if any(isinstance(value, bool) or not isinstance(value, int) for value in raw_values):
                failures.append(f"missing_vector:{metric}")
                value = 0
            else:
                value = sum(int(item) for item in raw_values)
        vector.append({"metric": metric, "direction": component["direction"], "value": value})

    wall_clock_values = [cell["wall_clock_ms"] for cell in cells]
    total_wall_clock_ms = None if any(value is None for value in wall_clock_values) else sum(int(value) for value in wall_clock_values)
    evaluation = {
        "model_profile_id": profile_id,
        "model_family": cells[0]["model_family"],
        "threshold_pass": not failures,
        "threshold_failures": sorted(set(failures)),
        "quality_vector": vector,
        "total_wall_clock_ms": total_wall_clock_ms,
    }
    return evaluation, undefined_required


def _quality_key(evaluation: dict[str, Any]) -> tuple[int, ...]:
    result: list[int] = []
    for component in evaluation["quality_vector"]:
        value = int(component["value"])
        result.append(value if component["direction"] == "higher" else -value)
    return tuple(result)


def _no_assignment(policy: dict[str, Any], evidence: dict[str, Any], role: str, reason_code: str, candidates: list[str], paired_cases: list[dict[str, str]], evaluations: list[dict[str, Any]]) -> dict[str, Any]:
    return _build_snapshot(policy, evidence, role, "NO_ASSIGNMENT", reason_code, candidates, paired_cases, evaluations, None)


def _build_snapshot(policy: dict[str, Any], evidence: dict[str, Any], role: str, status: str, reason_code: str, candidates: list[str], paired_cases: list[dict[str, str]], evaluations: list[dict[str, Any]], selection: dict[str, str] | None) -> dict[str, Any]:
    if reason_code not in REASON_CODES:
        raise AssignmentPolicyError(f"unsupported reason code: {reason_code}")
    chosen = selection or {"profile_id": "", "family": "", "model_sha256": ""}
    snapshot = {
        "schema_version": 1,
        "policy_id": policy["policy_id"],
        "policy_sha256": policy["policy_sha256"],
        "assignment_evidence_sha256": evidence["evidence_sha256"],
        "role": role,
        "status": status,
        "reason_code": reason_code,
        "candidate_profile_ids": sorted(candidates),
        "paired_cases": sorted(paired_cases, key=lambda item: (item["case_id"], item["case_version"])),
        "candidate_evaluations": sorted(evaluations, key=lambda item: item["model_profile_id"]),
        "selection": {
            "present": selection is not None,
            "profile_id": chosen["profile_id"],
            "family": chosen["family"],
            "model_sha256": chosen["model_sha256"],
        },
        "generation_sha256": canonical_sha256(policy["generation"]),
        "budget_sha256": canonical_sha256(policy["budget"]),
        "assignment_sha256": "0" * 64,
    }
    snapshot["assignment_sha256"] = _self_hash(snapshot, "assignment_sha256")
    validate_assignment_snapshot(snapshot)
    return snapshot


def validate_assignment_snapshot(snapshot: dict[str, Any]) -> None:
    try:
        validate_contract(snapshot, SNAPSHOT_SCHEMA)
    except ContractValidationError as exc:
        raise AssignmentPolicyError(f"invalid O5 assignment snapshot: {exc}") from exc
    if _self_hash(snapshot, "assignment_sha256") != snapshot["assignment_sha256"]:
        raise AssignmentPolicyError("O5 assignment snapshot digest mismatch")
    if snapshot["reason_code"] not in REASON_CODES:
        raise AssignmentPolicyError("O5 assignment reason code invalid")
    selection = snapshot["selection"]
    if snapshot["status"] == "FROZEN_ASSIGNMENT":
        if snapshot["reason_code"] != "ASSIGNED" or selection["present"] is not True:
            raise AssignmentPolicyError("frozen assignment must carry ASSIGNED selection")
        if not all(selection[key] for key in ("profile_id", "family", "model_sha256")):
            raise AssignmentPolicyError("frozen assignment selection must be complete")
    else:
        if snapshot["reason_code"] == "ASSIGNED" or selection["present"] is not False:
            raise AssignmentPolicyError("NO_ASSIGNMENT must not carry selection")
        if any(selection[key] for key in ("profile_id", "family", "model_sha256")):
            raise AssignmentPolicyError("NO_ASSIGNMENT selection fields must be empty")


def assign_role(role: str, evidence: dict[str, Any], policy: dict[str, Any], *, registry_data: dict[str, Any] | None = None) -> dict[str, Any]:
    if role not in ROLES:
        raise AssignmentPolicyError(f"unsupported O5 role: {role}")
    validate_policy(policy)
    validate_evidence(evidence)
    registry = load_model_registry() if registry_data is None else registry_data
    registry_map = _registry_profile_map(registry)

    role_cells = [cell for cell in evidence["cells"] if cell["role"] == role]
    all_candidates = sorted({cell["model_profile_id"] for cell in role_cells})
    if not role_cells:
        return _no_assignment(policy, evidence, role, "NO_COMPARABLE_O4_EVIDENCE", [], [], [])

    eligible = [cell for cell in role_cells if cell["assignment_eligible"] and not cell["diagnostic_replay_only"]]
    if not eligible:
        reason = "INSUFFICIENT_INDEPENDENT_CASES" if any(cell["diagnostic_replay_only"] for cell in role_cells) else "NO_COMPARABLE_O4_EVIDENCE"
        return _no_assignment(policy, evidence, role, reason, all_candidates, [], [])

    for cell in eligible:
        if not _cell_registry_eligible(cell, registry_map):
            cases = [{"case_id": cid, "case_version": ver} for cid, ver in sorted({_case_key(item) for item in eligible})]
            return _no_assignment(policy, evidence, role, "MODEL_INELIGIBLE", sorted({item["model_profile_id"] for item in eligible}), cases, [])

    case_keys = sorted({_case_key(cell) for cell in eligible})
    paired_cases = [{"case_id": case_id, "case_version": case_version} for case_id, case_version in case_keys]
    if len(case_keys) < policy["minimum_distinct_cases"]:
        return _no_assignment(policy, evidence, role, "INSUFFICIENT_INDEPENDENT_CASES", sorted({item["model_profile_id"] for item in eligible}), paired_cases, [])

    families = {cell["model_family"] for cell in eligible}
    if len(families) < policy["minimum_model_families"]:
        return _no_assignment(policy, evidence, role, "INSUFFICIENT_MODEL_FAMILIES", sorted({item["model_profile_id"] for item in eligible}), paired_cases, [])

    by_profile: dict[str, list[dict[str, Any]]] = {}
    for cell in eligible:
        by_profile.setdefault(str(cell["model_profile_id"]), []).append(cell)
    expected_case_set = set(case_keys)
    if any({_case_key(cell) for cell in cells} != expected_case_set for cells in by_profile.values()):
        return _no_assignment(policy, evidence, role, "MISSING_PAIRED_CELL", sorted(by_profile), paired_cases, [])

    for case_key in case_keys:
        per_case = [cell for cell in eligible if _case_key(cell) == case_key]
        identities = {_paired_identity(cell) for cell in per_case}
        if len(identities) != 1:
            return _no_assignment(policy, evidence, role, "INCOMPATIBLE_EVIDENCE_IDENTITY", sorted(by_profile), paired_cases, [])
    role_compat = {(cell["scoring_policy_id"], cell["scoring_policy_sha256"], cell["role_contract_id"], cell["generation_sha256"]) for cell in eligible}
    if len(role_compat) != 1:
        return _no_assignment(policy, evidence, role, "INCOMPATIBLE_EVIDENCE_IDENTITY", sorted(by_profile), paired_cases, [])

    rule = policy["role_rules"][role]
    evaluations: list[dict[str, Any]] = []
    undefined_seen = False
    for profile_id, cells in sorted(by_profile.items()):
        ordered = sorted(cells, key=_case_key)
        evaluation, undefined_required = _candidate_evaluation(role, profile_id, ordered, rule)
        evaluations.append(evaluation)
        undefined_seen = undefined_seen or undefined_required

    passing = [item for item in evaluations if item["threshold_pass"]]
    if not passing:
        reason = "UNDEFINED_REQUIRED_METRIC" if undefined_seen else "THRESHOLD_FAILURE"
        return _no_assignment(policy, evidence, role, reason, sorted(by_profile), paired_cases, evaluations)

    best_key = max(_quality_key(item) for item in passing)
    best = [item for item in passing if _quality_key(item) == best_key]
    if len(best) > 1:
        concrete = [item for item in best if item["total_wall_clock_ms"] is not None]
        if concrete:
            fastest = min(int(item["total_wall_clock_ms"]) for item in concrete)
            best = [item for item in concrete if item["total_wall_clock_ms"] == fastest]
        if len(best) != 1:
            return _no_assignment(policy, evidence, role, "EXACT_TIE", sorted(by_profile), paired_cases, evaluations)

    selected_eval = best[0]
    selected_profile = registry_map[selected_eval["model_profile_id"]]
    selection = {
        "profile_id": selected_profile["profile_id"],
        "family": selected_profile["family"],
        "model_sha256": selected_profile["sha256"],
    }
    return _build_snapshot(policy, evidence, role, "FROZEN_ASSIGNMENT", "ASSIGNED", sorted(by_profile), paired_cases, evaluations, selection)


def assign_all_roles(evidence: dict[str, Any] | None = None, policy: dict[str, Any] | None = None, *, registry_data: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    resolved_evidence = load_assignment_evidence() if evidence is None else evidence
    resolved_policy = load_assignment_policy() if policy is None else policy
    return {role: assign_role(role, resolved_evidence, resolved_policy, registry_data=registry_data) for role in ROLES}

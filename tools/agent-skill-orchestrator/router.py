from __future__ import annotations

from typing import Any

from canonical import canonical_sha256
from registry import (
    load_domain_registry,
    load_role_registry,
    registry_sha256,
    validate_domain_registry_data,
    validate_role_registry_data,
)
from schema_validation import ContractValidationError, validate_contract

TASK_REQUEST_SCHEMA = "task-request.schema.json"
EXECUTION_PLAN_SCHEMA = "execution-plan.schema.json"
ROUTER_POLICY_VERSION = 1


class RoutingError(ValueError):
    pass


def _validated_request(task_request: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_contract(task_request, TASK_REQUEST_SCHEMA)
    except ContractValidationError as exc:
        raise RoutingError(f"invalid task request: {exc}") from exc
    if task_request["mutation_requested"]:
        raise RoutingError("mutation_requested=true is not allowed in O1-A")
    if task_request["device_truth_requested"]:
        raise RoutingError("device_truth_requested=true is not allowed in O1-A")
    return task_request


def _validated_registries(
    domain_registry_data: dict[str, Any] | None,
    role_registry_data: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    domains = load_domain_registry() if domain_registry_data is None else domain_registry_data
    roles = load_role_registry() if role_registry_data is None else role_registry_data
    try:
        validate_domain_registry_data(domains)
        validate_role_registry_data(roles)
    except ContractValidationError as exc:
        raise RoutingError(f"invalid orchestrator registry: {exc}") from exc
    return domains, roles


def _domain_for_scope(domains: dict[str, Any], scope: str) -> dict[str, Any]:
    matches = [item for item in domains["domains"] if item["scope"] == scope]
    if len(matches) != 1:
        raise RoutingError(f"unregistered scope: {scope}")
    return matches[0]


def _assert_release_authority(domain: dict[str, Any]) -> None:
    if not any(
        item["kind"] == "release_branch" and bool(item["value"])
        for item in domain["authority_refs"]
    ):
        raise RoutingError(
            f"release_lookup requires registered release_branch authority for {domain['scope']}"
        )


def _role_ids(roles: dict[str, Any]) -> frozenset[str]:
    return frozenset(item["role_id"] for item in roles["roles"])


def _require_roles(roles: dict[str, Any], required: tuple[str, ...]) -> None:
    available = _role_ids(roles)
    missing = [role_id for role_id in required if role_id not in available]
    if missing:
        raise RoutingError(f"missing required role metadata: {', '.join(missing)}")


def _role_stage(role_id: str, depends_on: list[str]) -> dict[str, Any]:
    return {
        "stage_id": role_id,
        "role_id": role_id,
        "depends_on": depends_on,
    }


def _route_topology(task_kind: str, roles: dict[str, Any]) -> tuple[str, list[str], list[dict[str, Any]]]:
    if task_kind == "release_lookup":
        return (
            "deterministic_only",
            ["resolve_domain_registration", "resolve_release_authority"],
            [],
        )
    if task_kind == "source_locator":
        _require_roles(roles, ("scout",))
        return (
            "fast",
            ["resolve_domain_registration"],
            [_role_stage("scout", [])],
        )
    if task_kind == "impact_analysis":
        _require_roles(roles, ("scout", "mapper", "critic", "synthesizer"))
        return (
            "standard",
            ["resolve_domain_registration"],
            [
                _role_stage("scout", []),
                _role_stage("mapper", ["scout"]),
                _role_stage("critic", ["mapper"]),
                _role_stage("synthesizer", ["mapper", "critic"]),
            ],
        )
    raise RoutingError(f"unsupported task kind: {task_kind}")


def route_task(
    task_request: dict[str, Any],
    *,
    domain_registry_data: dict[str, Any] | None = None,
    role_registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a deterministic inert O1-A execution plan for one typed request."""
    request = _validated_request(task_request)
    domains, roles = _validated_registries(domain_registry_data, role_registry_data)
    domain = _domain_for_scope(domains, request["scope"])

    if request["task_kind"] == "release_lookup":
        _assert_release_authority(domain)

    execution_class, deterministic_actions, role_stages = _route_topology(
        request["task_kind"], roles
    )
    plan = {
        "schema_version": 1,
        "router_policy_version": ROUTER_POLICY_VERSION,
        "task_id": request["task_id"],
        "scope": request["scope"],
        "task_kind": request["task_kind"],
        "execution_class": execution_class,
        "request_sha256": canonical_sha256(request),
        "domain_registry_sha256": registry_sha256(domains),
        "role_registry_sha256": registry_sha256(roles),
        "deterministic_actions": deterministic_actions,
        "role_stages": role_stages,
        "model_selection": "deferred_to_later_phase",
        "mutation_allowed": False,
        "device_truth_allowed": False,
        "verdict_authority": "none_in_o1a",
    }
    try:
        validate_contract(plan, EXECUTION_PLAN_SCHEMA)
    except ContractValidationError as exc:
        raise RoutingError(f"generated execution plan violates contract: {exc}") from exc
    return plan


def execution_plan_sha256(plan: dict[str, Any]) -> str:
    try:
        validate_contract(plan, EXECUTION_PLAN_SCHEMA)
    except ContractValidationError as exc:
        raise RoutingError(f"invalid execution plan: {exc}") from exc
    return canonical_sha256(plan)

from __future__ import annotations

import hashlib
from itertools import combinations
from typing import Any, Iterable

from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from router import execution_plan_sha256
from schema_validation import ContractValidationError, validate_contract

SYNTHETIC_ROLE_FIXTURE_SCHEMA = "synthetic-role-fixture.schema.json"
TYPED_BUS_SCHEMA = "typed-bus.schema.json"


class BusError(ValueError):
    pass


def _claim_subject_map(claims: list[dict[str, Any]], subjects: list[dict[str, Any]]) -> dict[str, str]:
    claim_ids = [str(item["id"]) for item in claims]
    if len(set(claim_ids)) != len(claim_ids):
        raise BusError("duplicate claim id within fixture or bus")
    mapping: dict[str, str] = {}
    for item in subjects:
        claim_id = str(item["claim_id"])
        if claim_id in mapping:
            raise BusError(f"duplicate claim subject mapping: {claim_id}")
        mapping[claim_id] = str(item["subject_key"])
    missing = sorted(set(claim_ids) - set(mapping))
    orphan = sorted(set(mapping) - set(claim_ids))
    if missing:
        raise BusError(f"missing claim subject mapping: {', '.join(missing)}")
    if orphan:
        raise BusError(f"orphan claim subject mapping: {', '.join(orphan)}")
    return mapping


def _assert_fixture_role_ownership(fixture: dict[str, Any]) -> None:
    role = fixture["role"]
    records = fixture["records"]
    for claim in records["claims"]:
        if claim["role"] != role:
            raise BusError(f"claim role {claim['role']} does not match fixture role {role}")
    for edge in records["flow_edges"]:
        if edge["role"] != role:
            raise BusError(f"flow edge role {edge['role']} does not match fixture role {role}")
    for boundary in records["boundaries"]:
        if boundary["role"] != role:
            raise BusError(f"boundary role {boundary['role']} does not match fixture role {role}")
    for blocker in records["blockers"]:
        if blocker["origin_role"] != role:
            raise BusError(
                f"blocker origin_role {blocker['origin_role']} does not match fixture role {role}"
            )


def _fixture_stage_map(execution_plan: dict[str, Any]) -> dict[str, str]:
    return {str(item["stage_id"]): str(item["role_id"]) for item in execution_plan["role_stages"]}


def validate_synthetic_role_fixture(
    fixture: dict[str, Any],
    *,
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
) -> None:
    refs = evidence_source_refs(evidence_package)
    try:
        validate_contract(fixture, SYNTHETIC_ROLE_FIXTURE_SCHEMA, known_source_refs=refs)
    except ContractValidationError as exc:
        raise BusError(f"invalid synthetic role fixture: {exc}") from exc
    if fixture["evidence_sha256"] != evidence_package_sha256(evidence_package):
        raise BusError("synthetic role fixture evidence digest does not match evidence package")
    stage_map = _fixture_stage_map(execution_plan)
    stage_id = fixture["stage_id"]
    if stage_id not in stage_map:
        raise BusError(f"fixture stage is not present in execution plan: {stage_id}")
    if stage_map[stage_id] != fixture["role"]:
        raise BusError(
            f"fixture role {fixture['role']} does not match plan stage {stage_id}:{stage_map[stage_id]}"
        )
    _assert_fixture_role_ownership(fixture)
    _claim_subject_map(fixture["records"]["claims"], fixture["records"]["claim_subjects"])


def synthetic_role_fixture_sha256(
    fixture: dict[str, Any],
    *,
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
) -> str:
    validate_synthetic_role_fixture(
        fixture,
        execution_plan=execution_plan,
        evidence_package=evidence_package,
    )
    return canonical_sha256(fixture)


def _claim_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (str(item["id"]), str(item["kind"]), str(item["status"]), str(item["value"]), str(item["role"]), tuple(item["refs"]))


def _subject_sort_key(item: dict[str, Any]) -> tuple[str, str]:
    return str(item["claim_id"]), str(item["subject_key"])


def _edge_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (str(item["from"]), str(item["to"]), str(item["status"]), str(item["role"]), tuple(item["refs"]))


def _boundary_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (str(item["kind"]), str(item["subject"]), str(item["status"]), str(item["role"]), tuple(item["refs"]))


def _blocker_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    return (str(item["kind"]), str(item["subject"]), str(item["origin_role"]), tuple(item["refs"]))


def _conflict_id(subject_key: str, left_claim_id: str, right_claim_id: str) -> str:
    material = f"{subject_key}\0{left_claim_id}\0{right_claim_id}".encode("utf-8")
    return "conflict-" + hashlib.sha256(material).hexdigest()[:20]


def _derived_conflicts(
    claims: list[dict[str, Any]],
    subjects: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    subject_by_claim = _claim_subject_map(claims, subjects)
    by_subject: dict[str, list[dict[str, Any]]] = {}
    for claim in claims:
        by_subject.setdefault(subject_by_claim[claim["id"]], []).append(claim)

    conflicts: list[dict[str, Any]] = []
    conflict_subject_refs: dict[str, set[str]] = {}
    for subject_key in sorted(by_subject):
        eligible = sorted(
            (claim for claim in by_subject[subject_key] if claim["status"] != "UNKNOWN"),
            key=_claim_sort_key,
        )
        for left, right in combinations(eligible, 2):
            if left["value"] == right["value"]:
                continue
            left_id, right_id = sorted((str(left["id"]), str(right["id"])))
            conflicts.append(
                {
                    "id": _conflict_id(subject_key, left_id, right_id),
                    "subject": subject_key,
                    "left_claim_id": left_id,
                    "right_claim_id": right_id,
                    "resolution": "UNRESOLVED",
                }
            )
            refs = conflict_subject_refs.setdefault(subject_key, set())
            refs.update(str(ref) for ref in left["refs"])
            refs.update(str(ref) for ref in right["refs"])

    conflicts.sort(key=lambda item: (item["subject"], item["left_claim_id"], item["right_claim_id"], item["id"]))
    blockers = [
        {
            "kind": "conflict",
            "subject": f"unresolved claim disagreement: {subject_key}",
            "origin_role": "deterministic",
            "refs": sorted(refs),
        }
        for subject_key, refs in sorted(conflict_subject_refs.items())
    ]
    return conflicts, blockers


def _assert_global_claim_ids(claims: list[dict[str, Any]]) -> None:
    ids = [str(item["id"]) for item in claims]
    if len(ids) != len(set(ids)):
        raise BusError("duplicate claim id across typed bus")


def validate_typed_bus(bus: dict[str, Any], *, known_source_refs: Iterable[str]) -> None:
    known = frozenset(known_source_refs)
    try:
        validate_contract(bus, TYPED_BUS_SCHEMA, known_source_refs=known)
    except ContractValidationError as exc:
        raise BusError(f"invalid typed bus: {exc}") from exc
    _assert_global_claim_ids(bus["claims"])
    _claim_subject_map(bus["claims"], bus["claim_subjects"])

    if bus["claims"] != sorted(bus["claims"], key=_claim_sort_key):
        raise BusError("typed bus claims must be in canonical order")
    if bus["claim_subjects"] != sorted(bus["claim_subjects"], key=_subject_sort_key):
        raise BusError("typed bus claim subjects must be in canonical order")
    if bus["flow_edges"] != sorted(bus["flow_edges"], key=_edge_sort_key):
        raise BusError("typed bus flow edges must be in canonical order")
    if bus["boundaries"] != sorted(bus["boundaries"], key=_boundary_sort_key):
        raise BusError("typed bus boundaries must be in canonical order")
    if bus["blockers"] != sorted(bus["blockers"], key=_blocker_sort_key):
        raise BusError("typed bus blockers must be in canonical order")

    expected_conflicts, expected_deterministic_blockers = _derived_conflicts(
        bus["claims"], bus["claim_subjects"]
    )
    if bus["conflicts"] != expected_conflicts:
        raise BusError("typed bus conflicts must equal deterministic pairwise conflict derivation")
    actual_deterministic = [
        item for item in bus["blockers"] if item["origin_role"] == "deterministic"
    ]
    if actual_deterministic != sorted(expected_deterministic_blockers, key=_blocker_sort_key):
        raise BusError("typed bus deterministic blockers must equal derived conflict blockers")


def build_typed_bus(
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    fixtures: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    """Merge validated synthetic role fixtures into one deterministic typed evidence bus."""
    try:
        validate_contract(execution_plan, "execution-plan.schema.json")
    except ContractValidationError as exc:
        raise BusError(f"invalid execution plan: {exc}") from exc
    validate_evidence_package(evidence_package)
    if evidence_package["execution_plan_sha256"] != execution_plan_sha256(execution_plan):
        raise BusError("evidence package execution plan digest does not match execution plan")

    evidence_digest = evidence_package_sha256(evidence_package)
    fixture_by_stage: dict[str, dict[str, Any]] = {}
    for fixture in fixtures:
        validate_synthetic_role_fixture(
            fixture,
            execution_plan=execution_plan,
            evidence_package=evidence_package,
        )
        stage_id = str(fixture["stage_id"])
        if stage_id in fixture_by_stage:
            raise BusError(f"duplicate synthetic fixture for stage: {stage_id}")
        fixture_by_stage[stage_id] = fixture

    claims: list[dict[str, Any]] = []
    claim_subjects: list[dict[str, Any]] = []
    flow_edges: list[dict[str, Any]] = []
    boundaries: list[dict[str, Any]] = []
    role_blockers: list[dict[str, Any]] = []
    fixture_sha256: dict[str, str] = {}
    seen_claim_ids: set[str] = set()

    for stage_id in sorted(fixture_by_stage):
        fixture = fixture_by_stage[stage_id]
        fixture_sha256[stage_id] = canonical_sha256(fixture)
        records = fixture["records"]
        for claim in records["claims"]:
            claim_id = str(claim["id"])
            if claim_id in seen_claim_ids:
                raise BusError(f"duplicate claim id across fixtures: {claim_id}")
            seen_claim_ids.add(claim_id)
            claims.append(dict(claim))
        claim_subjects.extend(dict(item) for item in records["claim_subjects"])
        flow_edges.extend(dict(item) for item in records["flow_edges"])
        boundaries.extend(dict(item) for item in records["boundaries"])
        role_blockers.extend(dict(item) for item in records["blockers"])

    claims.sort(key=_claim_sort_key)
    claim_subjects.sort(key=_subject_sort_key)
    flow_edges.sort(key=_edge_sort_key)
    boundaries.sort(key=_boundary_sort_key)
    role_blockers.sort(key=_blocker_sort_key)
    conflicts, conflict_blockers = _derived_conflicts(claims, claim_subjects)
    blockers = sorted(role_blockers + conflict_blockers, key=_blocker_sort_key)

    bus = {
        "schema_version": 1,
        "evidence_sha256": evidence_digest,
        "fixture_sha256": fixture_sha256,
        "claims": claims,
        "claim_subjects": claim_subjects,
        "flow_edges": flow_edges,
        "boundaries": boundaries,
        "blockers": blockers,
        "conflicts": conflicts,
    }
    validate_typed_bus(bus, known_source_refs=evidence_source_refs(evidence_package))
    return bus


def typed_bus_sha256(bus: dict[str, Any], *, known_source_refs: Iterable[str]) -> str:
    validate_typed_bus(bus, known_source_refs=known_source_refs)
    return canonical_sha256(bus)

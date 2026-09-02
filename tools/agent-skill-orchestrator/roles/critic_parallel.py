from __future__ import annotations

import json
from typing import Any

from evidence import evidence_source_refs, validate_evidence_package
from roles._compact import (
    RoleContractError,
    artifact_sha256,
    enforce_canonical_ceiling,
    load_role_contract,
    parse_wire,
    validate_refs,
    validate_short_text,
    validate_upstream_artifact,
)

CONTRACT_FILE = "critic-parallel.json"
CONTRACT_ID = "critic-parallel-compact-wire-v2"


class ParallelCriticContractError(RoleContractError):
    pass


def _contract() -> dict[str, Any]:
    value = load_role_contract(CONTRACT_FILE, CONTRACT_ID, "critic")
    expected = {
        "schema_version", "contract_id", "role", "max_wire_bytes", "max_boundaries",
        "max_concerns", "max_unresolved", "max_refs_per_record", "max_value_bytes",
        "boundary_kinds", "blocker_kinds", "grounded_boundary_status",
    }
    if set(value) != expected or value["grounded_boundary_status"] != "SUPPORTED_LIKELY":
        raise ParallelCriticContractError("parallel Critic contract fields changed")
    return value


def parallel_critic_response_schema() -> dict[str, Any]:
    c = _contract()
    refs = {
        "type": "array",
        "maxItems": int(c["max_refs_per_record"]),
        "uniqueItems": True,
        "items": {"type": "string", "pattern": "^S[1-9][0-9]*@L[1-9][0-9]*$"},
    }
    boundary = {
        "type": "object",
        "properties": {
            "k": {"type": "string", "enum": list(c["boundary_kinds"])},
            "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
            "r": {**refs, "minItems": 1},
        },
        "required": ["k", "v", "r"],
        "additionalProperties": False,
    }
    blocker = {
        "type": "object",
        "properties": {
            "k": {"type": "string", "enum": list(c["blocker_kinds"])},
            "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
            "r": refs,
        },
        "required": ["k", "v", "r"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "b": {"type": "array", "maxItems": int(c["max_boundaries"]), "items": boundary},
            "c": {"type": "array", "maxItems": int(c["max_concerns"]), "items": blocker},
            "u": {"type": "array", "maxItems": int(c["max_unresolved"]), "items": blocker},
        },
        "required": ["b", "c", "u"],
        "additionalProperties": False,
    }


def parallel_critic_input_projection(
    evidence_package: dict[str, Any],
    scout_artifact: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    try:
        artifact = validate_upstream_artifact(
            scout_artifact,
            evidence_package,
            allowed_roles={"scout"},
        )
    except RoleContractError as exc:
        raise ParallelCriticContractError(str(exc)) from exc
    records = artifact["records"]
    return {
        "artifact_sha256": artifact_sha256(artifact),
        "role": "scout",
        "claims": [
            {key: item[key] for key in ("id", "kind", "status", "value", "refs")}
            for item in records["claims"]
        ],
        "blockers": list(records["blockers"]),
        "conflicts": list(records["conflicts"]),
    }


def _validated_blocker_record(
    item: Any,
    *,
    label: str,
    known_refs: frozenset[str],
    contract: dict[str, Any],
    allow_empty_refs: bool,
) -> dict[str, Any]:
    if not isinstance(item, dict) or set(item) != {"k", "v", "r"}:
        raise ParallelCriticContractError(f"{label} fields invalid")
    kind = item["k"]
    if kind not in frozenset(contract["blocker_kinds"]):
        raise ParallelCriticContractError(f"{label} blocker kind invalid")
    value = validate_short_text(
        item["v"], label=f"{label}.v", max_bytes=int(contract["max_value_bytes"])
    )
    refs = validate_refs(
        item["r"],
        known_refs=known_refs,
        label=label,
        max_refs=int(contract["max_refs_per_record"]),
        min_refs=0 if allow_empty_refs else 1,
    )
    if not refs and kind not in {"missing_evidence", "unknown"}:
        raise ParallelCriticContractError(
            f"{label} empty refs are allowed only for missing_evidence/unknown"
        )
    return {"k": kind, "v": value, "r": refs}


def validate_parallel_critic_wire(
    content: str,
    evidence_package: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    c = _contract()
    try:
        payload = parse_wire(content, max_wire_bytes=int(c["max_wire_bytes"]), role="Parallel Critic")
    except RoleContractError as exc:
        raise ParallelCriticContractError(str(exc)) from exc
    if not isinstance(payload, dict) or set(payload) != {"b", "c", "u"}:
        raise ParallelCriticContractError("Parallel Critic response must contain exactly b,c,u")
    boundaries, concerns, unresolved = payload["b"], payload["c"], payload["u"]
    if not isinstance(boundaries, list) or len(boundaries) > int(c["max_boundaries"]):
        raise ParallelCriticContractError("Parallel Critic boundary list is invalid")
    if not isinstance(concerns, list) or len(concerns) > int(c["max_concerns"]):
        raise ParallelCriticContractError("Parallel Critic concern list is invalid")
    if not isinstance(unresolved, list) or len(unresolved) > int(c["max_unresolved"]):
        raise ParallelCriticContractError("Parallel Critic unresolved list is invalid")

    known = evidence_source_refs(evidence_package)
    boundary_kinds = frozenset(c["boundary_kinds"])
    normalized_b: list[dict[str, Any]] = []
    seen_b: set[tuple[str, str]] = set()
    for index, item in enumerate(boundaries):
        label = f"b[{index}]"
        if not isinstance(item, dict) or set(item) != {"k", "v", "r"}:
            raise ParallelCriticContractError(f"{label} fields invalid")
        kind = item["k"]
        if kind not in boundary_kinds:
            raise ParallelCriticContractError(f"{label} boundary kind invalid")
        value = validate_short_text(item["v"], label=f"{label}.v", max_bytes=int(c["max_value_bytes"]))
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=1,
        )
        key = (kind, value)
        if key in seen_b:
            raise ParallelCriticContractError(f"duplicate Parallel Critic boundary: {kind!r}/{value!r}")
        seen_b.add(key)
        normalized_b.append({"k": kind, "v": value, "r": refs})

    normalized_c: list[dict[str, Any]] = []
    normalized_u: list[dict[str, Any]] = []
    seen_blockers: set[tuple[str, str]] = set()
    for family, items, output, allow_empty in (
        ("c", concerns, normalized_c, True),
        ("u", unresolved, normalized_u, True),
    ):
        for index, item in enumerate(items):
            label = f"{family}[{index}]"
            normalized = _validated_blocker_record(
                item,
                label=label,
                known_refs=known,
                contract=c,
                allow_empty_refs=allow_empty,
            )
            key = (normalized["k"], normalized["v"])
            if key in seen_blockers:
                raise ParallelCriticContractError(
                    f"duplicate Parallel Critic blocker: {key[0]!r}/{key[1]!r}"
                )
            seen_blockers.add(key)
            output.append(normalized)

    canonical = {"b": normalized_b, "c": normalized_c, "u": normalized_u}
    try:
        enforce_canonical_ceiling(canonical, max_wire_bytes=int(c["max_wire_bytes"]), role="Parallel Critic")
    except RoleContractError as exc:
        raise ParallelCriticContractError(str(exc)) from exc
    return canonical


def build_parallel_critic_prompt(
    evidence_package: dict[str, Any],
    scout_artifact: dict[str, Any],
) -> str:
    validate_evidence_package(evidence_package)
    c = _contract()
    upstream = parallel_critic_input_projection(evidence_package, scout_artifact)
    lines = [
        "ROLE: critic",
        "O3 PARALLEL-INDEPENDENT MODE: identify evidence-grounded preservation/risk boundaries and independent concern/blocker candidates without seeing Mapper output.",
        "Do not reference or invent Mapper claim ids. Do not resolve upstream blockers/conflicts, declare release/device truth, write patches, choose status/confidence, or give a final verdict.",
        "Return compact JSON only with exact keys b,c,u.",
        "Boundary: {\"k\":\"boundary_kind\",\"v\":\"subject\",\"r\":[\"S#@L#\"]}; concern/unresolved: {\"k\":\"blocker_kind\",\"v\":\"subject\",\"r\":[]}.",
        f"Maximum response bytes: {c['max_wire_bytes']}; boundaries <= {c['max_boundaries']}; concerns <= {c['max_concerns']}; unresolved <= {c['max_unresolved']}.",
        "Every boundary must cite supplied evidence. Empty refs on concern/unresolved records are allowed only for missing_evidence or unknown.",
        "Validated Scout typed projection follows; it is not raw model prose:",
        json.dumps(upstream, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        f"SCOPE: {evidence_package['scope']}",
        "EVIDENCE:",
    ]
    for item in evidence_package["sources"]:
        lines.extend([
            f"REF {item['source_ref']['ref']} | authority_class={item['authority_class']} | path={item['path']} | source_sha={item['source_sha']}",
            item["content"],
            "END_REF",
        ])
    return "\n".join(lines).rstrip() + "\n"

#!/usr/bin/env python3
"""Resolve and validate bounded structured response contracts for local Agent Skill evals."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
CLAIM_STATUSES = {"DIRECT", "SUPPORTED_LIKELY", "UNKNOWN", "CONFLICT"}
VERDICTS = {"SUPPORTED", "PARTIAL", "UNKNOWN", "CONFLICT"}
CLAIM_KEYS = {"status", "source_path", "source_anchor"}
EDGE_KEYS = {"from", "to", "status", "source_path", "source_anchor"}
TOP_LEVEL_KEYS = {
    "scope",
    "authority",
    "flow_edges",
    "request_identity",
    "no_extra_io",
    "tests",
    "generated_release",
    "narrowest_boundary",
    "blocked_claims",
    "verdict",
}


class ResponseContractError(ValueError):
    pass


def _load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ResponseContractError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ResponseContractError("JSON object required")
    return data


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def contract_sha256(contract: dict[str, Any] | None) -> str | None:
    if contract is None:
        return None
    return hashlib.sha256(canonical_json(contract).encode("utf-8")).hexdigest()


def load_contract(path: Path, skill: str, case_id: str) -> dict[str, Any] | None:
    data = _load_json(path)
    if data.get("schema_version") != SCHEMA_VERSION:
        raise ResponseContractError("unsupported response-contract schema_version")
    contracts = data.get("contracts")
    if not isinstance(contracts, dict):
        raise ResponseContractError("response contracts map missing")
    skill_map = contracts.get(str(skill))
    if skill_map is None:
        return None
    if not isinstance(skill_map, dict):
        raise ResponseContractError("skill response-contract map must be an object")
    contract = skill_map.get(str(case_id))
    if contract is None:
        return None
    if not isinstance(contract, dict):
        raise ResponseContractError("response contract must be an object")
    expected = {"id", "expected_scope", "prompt_instruction", "schema"}
    if set(contract) != expected:
        raise ResponseContractError("response contract must contain exactly id, expected_scope, prompt_instruction, schema")
    for key in ("id", "expected_scope", "prompt_instruction"):
        if not isinstance(contract.get(key), str) or not contract[key].strip():
            raise ResponseContractError(f"response contract {key} missing")
    if not isinstance(contract.get("schema"), dict):
        raise ResponseContractError("response contract schema missing")
    return contract


def response_format(contract: dict[str, Any] | None) -> dict[str, Any] | None:
    if contract is None:
        return None
    return {"type": "json_object", "schema": contract["schema"]}


def _bounded_string(value: Any, label: str, maximum: int, *, allow_empty: bool = True) -> str:
    if not isinstance(value, str):
        raise ResponseContractError(f"{label} must be a string")
    if not allow_empty and not value:
        raise ResponseContractError(f"{label} must not be empty")
    if len(value) > maximum:
        raise ResponseContractError(f"{label} exceeds max length {maximum}")
    return value


def _source_map(context: dict[str, Any]) -> dict[str, str]:
    blocks = context.get("blocks")
    if not isinstance(blocks, list):
        raise ResponseContractError("context blocks missing")
    result: dict[str, str] = {}
    for block in blocks:
        if not isinstance(block, dict):
            raise ResponseContractError("context block must be an object")
        path = block.get("path")
        text = block.get("text")
        if not isinstance(path, str) or not path or not isinstance(text, str):
            raise ResponseContractError("context block path/text missing")
        if path in result and result[path] != text:
            raise ResponseContractError(f"duplicate context path with conflicting text: {path}")
        result[path] = text
    return result


def _validate_claim(value: Any, label: str, sources: dict[str, str]) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != CLAIM_KEYS:
        raise ResponseContractError(f"{label} must contain exactly {sorted(CLAIM_KEYS)}")
    status = value.get("status")
    if status not in CLAIM_STATUSES:
        raise ResponseContractError(f"{label}.status invalid")
    source_path = _bounded_string(value.get("source_path"), f"{label}.source_path", 180)
    source_anchor = _bounded_string(value.get("source_anchor"), f"{label}.source_anchor", 100)
    if status == "UNKNOWN":
        if source_path or source_anchor:
            raise ResponseContractError(f"{label} UNKNOWN must not invent source_path/source_anchor")
        return value
    if not source_path or not source_anchor:
        raise ResponseContractError(f"{label} non-UNKNOWN requires source_path/source_anchor")
    source_text = sources.get(source_path)
    if source_text is None:
        raise ResponseContractError(f"{label}.source_path is not a supplied context path: {source_path}")
    if source_anchor not in source_text:
        raise ResponseContractError(f"{label}.source_anchor not found verbatim in {source_path}: {source_anchor}")
    return value


def _validate_edge(value: Any, index: int, sources: dict[str, str]) -> dict[str, Any]:
    label = f"flow_edges[{index}]"
    if not isinstance(value, dict) or set(value) != EDGE_KEYS:
        raise ResponseContractError(f"{label} must contain exactly {sorted(EDGE_KEYS)}")
    _bounded_string(value.get("from"), f"{label}.from", 100, allow_empty=False)
    _bounded_string(value.get("to"), f"{label}.to", 100, allow_empty=False)
    _validate_claim({key: value[key] for key in CLAIM_KEYS}, label, sources)
    return value


def validate_impact_scope_output(content: str, contract: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ResponseContractError(f"structured response is not valid JSON: {exc}") from exc
    if not isinstance(payload, dict) or set(payload) != TOP_LEVEL_KEYS:
        raise ResponseContractError(f"structured response must contain exactly {sorted(TOP_LEVEL_KEYS)}")
    scope = _bounded_string(payload.get("scope"), "scope", 80, allow_empty=False)
    if scope != contract["expected_scope"]:
        raise ResponseContractError(f"scope mismatch: expected {contract['expected_scope']}, got {scope}")
    sources = _source_map(context)
    _validate_claim(payload.get("authority"), "authority", sources)
    edges = payload.get("flow_edges")
    if not isinstance(edges, list) or not 1 <= len(edges) <= 3:
        raise ResponseContractError("flow_edges must contain 1-3 entries")
    seen_edges: set[tuple[str, ...]] = set()
    for index, edge in enumerate(edges):
        _validate_edge(edge, index, sources)
        identity = tuple(str(edge[key]) for key in ("from", "to", "status", "source_path", "source_anchor"))
        if identity in seen_edges:
            raise ResponseContractError("duplicate flow edge rejected")
        seen_edges.add(identity)
    request_identity = _validate_claim(payload.get("request_identity"), "request_identity", sources)
    no_extra_io = _validate_claim(payload.get("no_extra_io"), "no_extra_io", sources)
    tests = payload.get("tests")
    if not isinstance(tests, list) or len(tests) > 2:
        raise ResponseContractError("tests must contain at most 2 entries")
    for index, item in enumerate(tests):
        _validate_claim(item, f"tests[{index}]", sources)
    generated_release = _validate_claim(payload.get("generated_release"), "generated_release", sources)
    narrowest_boundary = _validate_claim(payload.get("narrowest_boundary"), "narrowest_boundary", sources)
    blocked = payload.get("blocked_claims")
    if not isinstance(blocked, list) or len(blocked) > 2:
        raise ResponseContractError("blocked_claims must contain at most 2 entries")
    for index, item in enumerate(blocked):
        _bounded_string(item, f"blocked_claims[{index}]", 120)
    verdict = payload.get("verdict")
    if verdict not in VERDICTS:
        raise ResponseContractError("verdict invalid")
    required_preservation = (request_identity, no_extra_io, generated_release, narrowest_boundary)
    if verdict == "SUPPORTED" and any(item["status"] in {"UNKNOWN", "CONFLICT"} for item in required_preservation):
        raise ResponseContractError("SUPPORTED verdict conflicts with unresolved required preservation claim")
    return payload


def validate_content(content: str, contract: dict[str, Any] | None, context: dict[str, Any]) -> dict[str, Any] | None:
    if contract is None:
        return None
    if contract.get("id") != "impact-scope-source-linked-v2":
        raise ResponseContractError(f"unsupported response contract id: {contract.get('id')}")
    return validate_impact_scope_output(content, contract, context)

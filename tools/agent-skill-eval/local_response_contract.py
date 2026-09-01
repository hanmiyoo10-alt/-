#!/usr/bin/env python3
"""Versioned response-contract dispatcher preserving historical v8/v9 behavior."""
from __future__ import annotations

import sys
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

import local_response_contract_legacy as _legacy
import local_response_contract_v10 as _v10

# Re-export the exact historical implementation, including private helpers used by tests.
for _name, _value in vars(_legacy).items():
    if _name not in {"__name__", "__file__", "__package__", "__loader__", "__spec__"}:
        globals()[_name] = _value

V10_CONTRACT_ID = _v10.V10_CONTRACT_ID
V10_MAX_TEXT_BYTES = _v10.V10_MAX_TEXT_BYTES
V10_MAX_SOURCE_LINE = _v10.V10_MAX_SOURCE_LINE
V10_SOURCE_REF_RE = _v10.V10_SOURCE_REF_RE
MAX_COMPACT_WIRE_BYTES = _v10.MAX_COMPACT_WIRE_BYTES
compact_wire_bytes = _v10.compact_wire_bytes
v10_source_context_text = _v10.source_context_text


def build_schema(contract):
    if contract.get("id") == V10_CONTRACT_ID:
        return _v10.build_schema(contract)
    return _legacy.build_schema(contract)


def load_contract(path: Path, skill, case_id):
    data = _legacy._load_json(path)
    if data.get("schema_version") != _legacy.SCHEMA_VERSION:
        raise _legacy.ResponseContractError("unsupported response-contract schema_version")
    skill_map = data.get("contracts", {}).get(str(skill))
    if skill_map is None:
        return None
    if not isinstance(skill_map, dict):
        raise _legacy.ResponseContractError("skill response-contract map must be an object")
    raw = skill_map.get(str(case_id))
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise _legacy.ResponseContractError("response contract must be an object")
    if raw.get("id") != V10_CONTRACT_ID:
        return _legacy.load_contract(path, skill, case_id)
    if set(raw) != {"id", "expected_scope", "prompt_instruction"}:
        raise _legacy.ResponseContractError("v10 candidate contract must not contain hidden expected-answer fields")
    contract = dict(raw)
    if (
        not isinstance(contract.get("expected_scope"), str)
        or not contract["expected_scope"]
        or len(contract["expected_scope"].encode("utf-8")) > 96
        or not isinstance(contract.get("prompt_instruction"), str)
        or not contract["prompt_instruction"]
    ):
        raise _legacy.ResponseContractError("response contract identity missing")
    contract["schema"] = _v10.build_schema(contract)
    return contract


def validate_content(content, contract, context):
    if contract is None:
        return None
    if contract.get("id") == V10_CONTRACT_ID:
        return _v10.validate_content(content, contract, context)
    return _legacy.validate_content(content, contract, context)

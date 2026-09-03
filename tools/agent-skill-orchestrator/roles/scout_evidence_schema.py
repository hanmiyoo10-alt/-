from __future__ import annotations

from copy import deepcopy
from itertools import combinations
from typing import Any

from evidence import validate_evidence_package
from roles.scout import scout_response_schema


MAX_STRICT_REF_ARRAY_VARIANTS = 50_000


class ScoutEvidenceSchemaError(ValueError):
    pass


def _variant(record_schema: dict[str, Any], kind: str) -> dict[str, Any]:
    matches = [
        item
        for item in record_schema.get("oneOf", [])
        if item.get("properties", {}).get("k", {}).get("enum") == [kind]
    ]
    if len(matches) != 1:
        raise ScoutEvidenceSchemaError(f"static Scout schema must contain exactly one {kind!r} variant")
    return matches[0]


def _ref_schema(template: dict[str, Any], refs: list[str]) -> dict[str, Any]:
    if not refs:
        raise ScoutEvidenceSchemaError("evidence-aware Scout schema branch has no supplied refs")
    result = deepcopy(template)
    result["items"] = {"type": "string", "enum": list(refs)}
    return result


def _record_branch(
    template: dict[str, Any],
    *,
    kind: str,
    value: str,
    refs: list[str],
) -> dict[str, Any]:
    result = deepcopy(template)
    result.pop("oneOf", None)
    result["properties"]["k"] = {"type": "string", "enum": [kind]}
    result["properties"]["v"] = {"type": "string", "enum": [value]}
    result["properties"]["r"] = _ref_schema(template["properties"]["r"], refs)
    return result


def scout_response_schema_for_evidence(
    evidence_package: dict[str, Any],
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Project supplied EvidencePackage authority/ref facts into Scout generation grammar.

    This narrows generation only. ``validate_scout_wire`` remains the final contract
    authority and the historical/static ``scout_response_schema`` is left unchanged.
    """

    validate_evidence_package(evidence_package)
    sources = evidence_package["sources"]
    if not sources:
        raise ScoutEvidenceSchemaError("evidence-aware Scout schema requires supplied evidence refs")

    refs_by_authority: dict[str, list[str]] = {}
    all_refs: list[str] = []
    for item in sources:
        ref = str(item["source_ref"]["ref"])
        authority_class = str(item["authority_class"])
        all_refs.append(ref)
        refs_by_authority.setdefault(authority_class, []).append(ref)

    all_refs = sorted(all_refs)
    if len(all_refs) != len(set(all_refs)):
        raise ScoutEvidenceSchemaError("supplied evidence refs are duplicated")
    if not refs_by_authority:
        raise ScoutEvidenceSchemaError("evidence-aware Scout schema has no supplied authority classes")

    static_schema = scout_response_schema(contract)
    record_template = deepcopy(static_schema["properties"]["r"]["items"])
    source_variant = _variant(record_template, "s")
    source_values = source_variant["properties"]["v"].get("enum", [])
    if len(source_values) != 1 or not isinstance(source_values[0], str) or not source_values[0]:
        raise ScoutEvidenceSchemaError("static Scout source-selection value is not singular")

    branches: list[dict[str, Any]] = [
        _record_branch(
            record_template,
            kind="s",
            value=source_values[0],
            refs=all_refs,
        )
    ]
    for authority_class in sorted(refs_by_authority):
        refs = sorted(refs_by_authority[authority_class])
        branches.append(
            _record_branch(
                record_template,
                kind="a",
                value=authority_class,
                refs=refs,
            )
        )

    record_template["oneOf"] = branches
    static_schema["properties"]["r"]["items"] = record_template
    return static_schema


def _strict_unique_ref_arrays(ref_schema: dict[str, Any]) -> list[list[str]]:
    items = ref_schema.get("items")
    refs = items.get("enum") if isinstance(items, dict) else None
    if (
        not isinstance(refs, list)
        or not refs
        or any(not isinstance(ref, str) or not ref for ref in refs)
    ):
        raise ScoutEvidenceSchemaError("strict Scout ref schema requires a non-empty supplied ref enum")
    if refs != sorted(refs) or len(refs) != len(set(refs)):
        raise ScoutEvidenceSchemaError("strict Scout ref enum must be sorted and unique")

    min_items = ref_schema.get("minItems")
    max_items = ref_schema.get("maxItems")
    if (
        not isinstance(min_items, int)
        or isinstance(min_items, bool)
        or not isinstance(max_items, int)
        or isinstance(max_items, bool)
        or min_items < 0
        or max_items < min_items
    ):
        raise ScoutEvidenceSchemaError("strict Scout ref array bounds are invalid")

    upper = min(max_items, len(refs))
    variants: list[list[str]] = []
    for size in range(min_items, upper + 1):
        for values in combinations(refs, size):
            variants.append(list(values))
            if len(variants) > MAX_STRICT_REF_ARRAY_VARIANTS:
                raise ScoutEvidenceSchemaError(
                    "strict Scout ref array expansion exceeds deterministic variant bound"
                )
    if not variants:
        raise ScoutEvidenceSchemaError("strict Scout ref schema has no representable unique arrays")
    return variants


def scout_response_schema_for_evidence_unique_refs(
    evidence_package: dict[str, Any],
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Narrow live Scout generation to unique, canonical ref arrays.

    The historical evidence-aware builder above remains unchanged for O4-E/O4-F
    provenance. This strict projection adds array-valued enums that the pinned
    llama.cpp grammar converter can represent, while ``validate_scout_wire``
    remains the final semantic and contract authority.
    """

    schema = scout_response_schema_for_evidence(evidence_package, contract)
    record_schema = schema["properties"]["r"]["items"]
    branches = record_schema.get("oneOf")
    if not isinstance(branches, list) or not branches:
        raise ScoutEvidenceSchemaError("strict Scout schema requires evidence-aware record branches")

    for branch in branches:
        properties = branch.get("properties")
        ref_schema = properties.get("r") if isinstance(properties, dict) else None
        if not isinstance(ref_schema, dict):
            raise ScoutEvidenceSchemaError("strict Scout branch is missing ref schema")
        ref_schema["enum"] = _strict_unique_ref_arrays(ref_schema)
    return schema

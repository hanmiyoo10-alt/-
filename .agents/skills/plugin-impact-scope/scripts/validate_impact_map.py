from __future__ import annotations

import argparse
import json
from pathlib import Path

PILOT_VALIDATED_SCOPES = {"plugin:usage-dashboard"}
ALLOWED_EDGE_CLASSES = {"DIRECT", "SUPPORTED_LIKELY", "UNKNOWN", "CONFLICT"}
ALLOWED_VERDICTS = {"IMPACT_SCOPED", "PARTIAL", "UNKNOWN", "CONFLICT"}
BANNED_MUTATION_KEYS = {
    "write", "writes", "edit", "edits", "patch", "patches", "deploy", "deployment",
    "merge", "release", "commit", "mutation", "mutations", "delete", "create_pr",
}


def _walk_keys(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            yield str(key)
            yield from _walk_keys(nested)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_keys(item)


def validate_map(payload: dict) -> dict:
    errors: list[str] = []
    scope = payload.get("scope")
    if scope not in PILOT_VALIDATED_SCOPES:
        errors.append("scope is outside PILOT_VALIDATED_SCOPES")

    verdict = payload.get("verdict")
    if verdict not in ALLOWED_VERDICTS:
        errors.append("verdict must be IMPACT_SCOPED, PARTIAL, UNKNOWN, or CONFLICT")

    for key in _walk_keys(payload):
        if key.casefold() in BANNED_MUTATION_KEYS:
            errors.append(f"read-only impact map contains mutation-shaped key: {key}")

    edges = payload.get("impact_edges")
    if not isinstance(edges, list):
        errors.append("impact_edges must be a list")
        edges = []

    has_unknown = False
    has_conflict = False
    has_supported = False

    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"impact_edges[{index}] must be an object")
            continue
        evidence_class = edge.get("evidence_class")
        if evidence_class not in ALLOWED_EDGE_CLASSES:
            errors.append(f"impact_edges[{index}].evidence_class is invalid")
            continue
        if not str(edge.get("from", "")).strip():
            errors.append(f"impact_edges[{index}].from is required")
        if not str(edge.get("to", "")).strip():
            errors.append(f"impact_edges[{index}].to is required")
        if not str(edge.get("relationship", "")).strip():
            errors.append(f"impact_edges[{index}].relationship is required")

        basis = str(edge.get("basis", "")).strip()
        sources = edge.get("sources", [])
        if not isinstance(sources, list):
            errors.append(f"impact_edges[{index}].sources must be a list")
            sources = []

        if evidence_class == "UNKNOWN":
            has_unknown = True
        elif evidence_class == "CONFLICT":
            has_conflict = True
            if not basis or not sources:
                errors.append(f"impact_edges[{index}] CONFLICT requires basis and sources")
        else:
            has_supported = True
            if not basis:
                errors.append(f"impact_edges[{index}] {evidence_class} requires basis")
            if not sources or any(not str(source).strip() for source in sources):
                errors.append(f"impact_edges[{index}] {evidence_class} requires concrete sources")

    if has_conflict and verdict != "CONFLICT":
        errors.append("CONFLICT edge requires CONFLICT verdict")
    if verdict == "CONFLICT" and not has_conflict:
        errors.append("CONFLICT verdict requires at least one CONFLICT edge")
    if verdict == "IMPACT_SCOPED" and (has_unknown or has_conflict):
        errors.append("IMPACT_SCOPED cannot contain UNKNOWN or CONFLICT edges")
    if verdict == "PARTIAL" and not has_unknown:
        errors.append("PARTIAL verdict requires at least one UNKNOWN edge")
    if verdict == "UNKNOWN" and has_supported:
        errors.append("UNKNOWN verdict cannot include DIRECT or SUPPORTED_LIKELY edges")

    required_lists = ["semantic_owners", "validation_surfaces", "generated_release_surfaces", "blocked_claims"]
    for key in required_lists:
        if not isinstance(payload.get(key), list):
            errors.append(f"{key} must be a list")

    if not str(payload.get("question_class", "")).strip():
        errors.append("question_class is required")
    if not str(payload.get("authority_input", "")).strip():
        errors.append("authority_input is required")
    if verdict in {"IMPACT_SCOPED", "PARTIAL"} and not str(
        payload.get("narrowest_supported_boundary", "")
    ).strip():
        errors.append("narrowest_supported_boundary is required for IMPACT_SCOPED/PARTIAL")

    return {
        "valid": not errors,
        "errors": errors,
        "scope": scope,
        "verdict": verdict,
        "truth_claim_status": "STRUCTURE_AND_PROVENANCE_ONLY",
        "semantic_relationships_proven_by_validator": False,
        "mutation_performed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate plugin-impact-scope JSON shape/provenance")
    parser.add_argument("--map", required=True, dest="map_path")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    path = Path(args.map_path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        result = {
            "valid": False,
            "errors": [f"unable to read impact map: {exc}"],
            "truth_claim_status": "STRUCTURE_AND_PROVENANCE_ONLY",
            "mutation_performed": False,
        }
    else:
        result = validate_map(payload)

    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else result)
    return 0 if result["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

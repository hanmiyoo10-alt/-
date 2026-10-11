from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from registry import DOMAIN_REGISTRY_PATH, load_domain_registry, registry_sha256

PACKAGE_ROOT = Path(__file__).resolve().parent
FROZEN_FIXTURE_ROOT = PACKAGE_ROOT / "tests" / "fixtures"
MAX_FROZEN_FIXTURES = 16
MAX_REQUEST_BYTES = 32 * 1024
DISPOSITIONS = {
    "LIVE_CURRENT_ONLY",
    "FROZEN_RETROSPECTIVE_ONLY",
    "LIVE_AND_FROZEN",
    "ABSENT_FROM_SUPPLIED_REGISTRIES",
    "UNKNOWN",
}
AUTHORITY_REF_KINDS = frozenset({
    "release_branch",
    "manifest",
    "artifact",
    "release_spec_dir",
    "declared_by",
    "evidence",
    "current_state",
})


def _result(
    disposition: str,
    reason_code: str,
    *,
    scope: str | None = None,
    reference: dict[str, str] | None = None,
    live_scope_present: bool = False,
    live_match: bool = False,
    live_registry_sha256: str | None = None,
    frozen_registries: tuple[dict[str, Any], ...] = (),
    frozen_scope_fixtures: tuple[str, ...] = (),
    frozen_match_fixtures: tuple[str, ...] = (),
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "disposition": disposition,
        "reason_code": reason_code,
        "scope": scope,
        "reference": reference,
        "live": {
            "registry": "domains/registry.json",
            "registry_sha256": live_registry_sha256,
            "scope_present": live_scope_present,
            "match": live_match,
        },
        "frozen": {
            "registries": list(frozen_registries),
            "scope_present_fixtures": list(frozen_scope_fixtures),
            "match_fixtures": list(frozen_match_fixtures),
        },
        "historical_exhaustiveness_claimed": False,
        "deletion_authorized": False,
        "retirement_authorized": False,
        "routing_authorized": False,
        "mutation_authorized": False,
        "network_used": False,
    }


def _unknown(reason_code: str) -> dict[str, Any]:
    return _result("UNKNOWN", reason_code)


def _validate_request(request: Any) -> tuple[str, dict[str, str], list[str]] | None:
    if not isinstance(request, dict) or set(request) != {
        "schema_version",
        "scope",
        "reference",
        "frozen_registry_paths",
    }:
        return None
    if type(request["schema_version"]) is not int or request["schema_version"] != 1:
        return None
    scope = request["scope"]
    if not isinstance(scope, str) or not scope.strip() or len(scope) > 160:
        return None
    reference = request["reference"]
    if not isinstance(reference, dict):
        return None
    field = reference.get("field")
    if not isinstance(field, str):
        return None
    if field in {"primary_path", "guidelines_path"}:
        if set(reference) != {"field", "value"}:
            return None
    elif field == "authority_ref":
        if set(reference) != {"field", "kind", "value"}:
            return None
        if (
            not isinstance(reference.get("kind"), str)
            or reference["kind"] not in AUTHORITY_REF_KINDS
        ):
            return None
    else:
        return None
    if not isinstance(reference.get("value"), str) or not reference["value"].strip():
        return None
    if len(reference["value"]) > 512:
        return None
    frozen = request["frozen_registry_paths"]
    if (
        not isinstance(frozen, list)
        or len(frozen) > MAX_FROZEN_FIXTURES
        or any(not isinstance(item, str) or not item.strip() or len(item) > 512 for item in frozen)
        or len(set(frozen)) != len(frozen)
    ):
        return None
    return scope.strip(), dict(reference), frozen


def _domain_for_scope(registry: dict[str, Any], scope: str) -> dict[str, Any] | None:
    matches = [item for item in registry["domains"] if item["scope"] == scope]
    if len(matches) > 1:
        raise ValueError("ambiguous scope")
    return matches[0] if matches else None


def _reference_matches(domain: dict[str, Any], reference: dict[str, str]) -> bool:
    field = reference["field"]
    if field in {"primary_path", "guidelines_path"}:
        return domain[field] == reference["value"]
    return any(
        item["kind"] == reference["kind"] and item["value"] == reference["value"]
        for item in domain["authority_refs"]
    )


def _load_frozen_fixture(raw_path: str) -> tuple[str, dict[str, Any]]:
    requested = Path(raw_path)
    candidate = requested if requested.is_absolute() else PACKAGE_ROOT / requested
    if candidate.is_symlink():
        raise ValueError("frozen fixture symlink is not allowed")
    resolved = candidate.resolve(strict=True)
    root = FROZEN_FIXTURE_ROOT.resolve(strict=True)
    if resolved.parent != root:
        raise ValueError("frozen fixture must be a direct child of tests/fixtures")
    if not resolved.name.endswith("-frozen-domain-registry.json"):
        raise ValueError("unsupported frozen fixture filename")
    if not resolved.is_file():
        raise ValueError("frozen fixture must be a regular file")
    data = load_domain_registry(resolved)
    return resolved.relative_to(PACKAGE_ROOT).as_posix(), data


def classify_reference(request: Any) -> dict[str, Any]:
    validated = _validate_request(request)
    if validated is None:
        return _unknown("REQUEST_INVALID")
    scope, reference, frozen_paths = validated

    try:
        live_registry = load_domain_registry(DOMAIN_REGISTRY_PATH)
        live_registry_digest = registry_sha256(live_registry)
        live_domain = _domain_for_scope(live_registry, scope)
    except Exception:
        return _unknown("LIVE_REGISTRY_INVALID")

    frozen_by_locator: dict[str, tuple[str, dict[str, Any] | None]] = {}
    try:
        for raw_path in frozen_paths:
            locator, registry = _load_frozen_fixture(raw_path)
            frozen_by_locator[locator] = (
                registry_sha256(registry),
                _domain_for_scope(registry, scope),
            )
    except Exception:
        return _unknown("FROZEN_FIXTURE_INVALID")
    frozen_rows = [
        (locator, digest, domain)
        for locator, (digest, domain) in sorted(frozen_by_locator.items())
    ]

    live_scope_present = live_domain is not None
    live_match = bool(live_domain and _reference_matches(live_domain, reference))
    frozen_scope_fixtures = tuple(
        locator for locator, _, domain in frozen_rows if domain is not None
    )
    frozen_match_fixtures = tuple(
        locator
        for locator, _, domain in frozen_rows
        if domain is not None and _reference_matches(domain, reference)
    )
    frozen_registry_rows = tuple({
        "registry": locator,
        "registry_sha256": digest,
        "scope_present": domain is not None,
        "match": bool(domain and _reference_matches(domain, reference)),
    } for locator, digest, domain in frozen_rows)

    present_domains = [domain for _, _, domain in frozen_rows if domain is not None]
    domain_ids = {domain["domain_id"] for domain in present_domains}
    if live_domain is not None:
        domain_ids.add(live_domain["domain_id"])
    if len(domain_ids) > 1:
        return _result(
            "UNKNOWN",
            "SCOPE_IDENTITY_DISAGREEMENT",
            scope=scope,
            reference=reference,
            live_registry_sha256=live_registry_digest,
            frozen_registries=frozen_registry_rows,
            live_scope_present=live_scope_present,
            live_match=live_match,
            frozen_scope_fixtures=frozen_scope_fixtures,
            frozen_match_fixtures=frozen_match_fixtures,
        )

    if not live_scope_present and not frozen_scope_fixtures:
        return _result(
            "UNKNOWN",
            "SCOPE_NOT_FOUND",
            scope=scope,
            reference=reference,
            live_registry_sha256=live_registry_digest,
            frozen_registries=frozen_registry_rows,
        )
    if live_match and frozen_match_fixtures:
        disposition = "LIVE_AND_FROZEN"
    elif live_match:
        disposition = "LIVE_CURRENT_ONLY"
    elif frozen_match_fixtures:
        disposition = "FROZEN_RETROSPECTIVE_ONLY"
    else:
        disposition = "ABSENT_FROM_SUPPLIED_REGISTRIES"

    return _result(
        disposition,
        disposition,
        scope=scope,
        reference=reference,
        live_registry_sha256=live_registry_digest,
        frozen_registries=frozen_registry_rows,
        live_scope_present=live_scope_present,
        live_match=live_match,
        frozen_scope_fixtures=frozen_scope_fixtures,
        frozen_match_fixtures=frozen_match_fixtures,
    )


def _read_cli_input(args: list[str]) -> str:
    if args:
        target = Path(args[0])
        stat = target.lstat()
        if target.is_symlink() or not target.is_file() or stat.st_size > MAX_REQUEST_BYTES:
            raise ValueError("request file invalid or too large")
        with target.open("rb") as handle:
            raw_bytes = handle.read(MAX_REQUEST_BYTES + 1)
        if len(raw_bytes) > MAX_REQUEST_BYTES:
            raise ValueError("request file too large")
        return raw_bytes.decode("utf-8")
    raw_bytes = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
    if len(raw_bytes) > MAX_REQUEST_BYTES:
        raise ValueError("stdin request too large")
    return raw_bytes.decode("utf-8")


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) > 1:
        output = _unknown("CLI_ARGUMENT_INVALID")
    else:
        try:
            output = classify_reference(json.loads(_read_cli_input(args)))
        except Exception:
            output = _unknown("INPUT_JSON_INVALID")
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 2 if output["disposition"] == "UNKNOWN" else 0


if __name__ == "__main__":
    raise SystemExit(main())

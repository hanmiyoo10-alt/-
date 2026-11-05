from __future__ import annotations

import json
import os
import re
import stat
import sys
from pathlib import Path
from typing import Any

from registry import DOMAIN_REGISTRY_PATH, registry_sha256, validate_domain_registry_data

PACKAGE_ROOT = Path(__file__).resolve().parent
FROZEN_FIXTURE_ROOT = PACKAGE_ROOT / "tests" / "fixtures"
MAX_FROZEN_FIXTURES = 16
MAX_REQUEST_BYTES = 32 * 1024
MAX_REGISTRY_BYTES = 4 * 1024 * 1024
SCOPE_RE = re.compile(r"^(plugin|product):[a-z0-9][a-z0-9._-]{0,127}$")
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
    frozen_error_locators: tuple[str, ...] = (),
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
            "error_locator": frozen_error_locators[0] if frozen_error_locators else None,
            "error_locators": list(frozen_error_locators),
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
    if not isinstance(scope, str) or SCOPE_RE.fullmatch(scope) is None:
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
    if not isinstance(reference.get("value"), str) or len(reference["value"]) < 1:
        return None
    if len(reference["value"]) > 256:
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


def _read_bounded_regular_file(
    path: Path | str,
    max_bytes: int,
    *,
    dir_fd: int | None = None,
) -> bytes:
    nofollow = getattr(os, "O_NOFOLLOW", None)
    if nofollow is None:
        raise ValueError("no-follow file reads are unsupported")
    flags = os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_CLOEXEC", 0) | nofollow
    fd = os.open(path, flags, dir_fd=dir_fd)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > max_bytes:
            raise ValueError("file invalid or too large")
        chunks: list[bytes] = []
        total = 0
        while total <= max_bytes:
            chunk = os.read(fd, min(64 * 1024, max_bytes + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
        raw = b"".join(chunks)
        if len(raw) > max_bytes:
            raise ValueError("file too large")
        return raw
    finally:
        os.close(fd)


def _open_directory_nofollow(
    path: Path | str,
    *,
    dir_fd: int | None = None,
) -> int:
    nofollow = getattr(os, "O_NOFOLLOW", None)
    odirectory = getattr(os, "O_DIRECTORY", None)
    if nofollow is None or odirectory is None:
        raise ValueError("anchored directory reads are unsupported")
    flags = os.O_RDONLY | odirectory | getattr(os, "O_CLOEXEC", 0) | nofollow
    return os.open(path, flags, dir_fd=dir_fd)


def _open_absolute_directory_nofollow(path: Path | str) -> int:
    lexical = Path(os.path.abspath(path))
    if not lexical.is_absolute() or not lexical.anchor:
        raise ValueError("absolute directory path required")

    opened: list[int] = []
    try:
        current_fd = _open_directory_nofollow(lexical.anchor)
        opened.append(current_fd)
        for part in lexical.parts[1:]:
            current_fd = _open_directory_nofollow(part, dir_fd=current_fd)
            opened.append(current_fd)
        for fd in opened[:-1]:
            os.close(fd)
        return opened[-1]
    except Exception:
        for fd in reversed(opened):
            os.close(fd)
        raise


def _read_package_relative_regular_file(
    parts: tuple[str, ...],
    max_bytes: int,
) -> bytes:
    if (
        len(parts) < 2
        or any(
            not isinstance(part, str)
            or not part
            or part in {".", ".."}
            or "/" in part
            or "\\" in part
            for part in parts
        )
    ):
        raise ValueError("invalid package-relative file path")

    root_fd = _open_absolute_directory_nofollow(PACKAGE_ROOT)
    directory_fds: list[int] = []
    current_fd = root_fd
    try:
        for directory in parts[:-1]:
            next_fd = _open_directory_nofollow(directory, dir_fd=current_fd)
            directory_fds.append(next_fd)
            current_fd = next_fd
        return _read_bounded_regular_file(
            parts[-1],
            max_bytes,
            dir_fd=current_fd,
        )
    finally:
        for fd in reversed(directory_fds):
            os.close(fd)
        os.close(root_fd)


def _reject_unicode_surrogates(value: Any) -> None:
    if isinstance(value, str):
        if any(0xD800 <= ord(char) <= 0xDFFF for char in value):
            raise ValueError("registry contains unsupported Unicode surrogate code point")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            _reject_unicode_surrogates(key)
            _reject_unicode_surrogates(item)
        return
    if isinstance(value, list):
        for item in value:
            _reject_unicode_surrogates(item)


def _validate_registry_bytes(raw: bytes) -> dict[str, Any]:
    text = raw.decode("utf-8")
    data = json.loads(text, object_pairs_hook=_reject_duplicate_keys)
    if not isinstance(data, dict):
        raise ValueError("registry must be a JSON object")
    validate_domain_registry_data(data)
    _reject_unicode_surrogates(data)
    return data


def _bounded_registry_snapshot(path: Path) -> dict[str, Any]:
    lexical = Path(os.path.abspath(path))
    root_fd = _open_absolute_directory_nofollow(lexical.parent)
    try:
        raw = _read_bounded_regular_file(
            lexical.name,
            MAX_REGISTRY_BYTES,
            dir_fd=root_fd,
        )
    finally:
        os.close(root_fd)
    return _validate_registry_bytes(raw)


def _load_live_registry() -> dict[str, Any]:
    return _validate_registry_bytes(
        _read_package_relative_regular_file(
            ("domains", "registry.json"),
            MAX_REGISTRY_BYTES,
        )
    )


def _load_frozen_fixture(raw_path: str) -> tuple[str, dict[str, Any]]:
    requested = Path(raw_path)
    candidate = requested if requested.is_absolute() else PACKAGE_ROOT / requested
    lexical_root = Path(os.path.abspath(PACKAGE_ROOT / "tests" / "fixtures"))
    lexical_candidate = Path(os.path.abspath(candidate))
    if lexical_candidate.parent != lexical_root:
        raise ValueError("frozen fixture must be a direct child of tests/fixtures")
    if not lexical_candidate.name.endswith("-frozen-domain-registry.json"):
        raise ValueError("unsupported frozen fixture filename")

    data = _validate_registry_bytes(
        _read_package_relative_regular_file(
            ("tests", "fixtures", lexical_candidate.name),
            MAX_REGISTRY_BYTES,
        )
    )
    return f"tests/fixtures/{lexical_candidate.name}", data


def classify_reference(request: Any) -> dict[str, Any]:
    validated = _validate_request(request)
    if validated is None:
        return _unknown("REQUEST_INVALID")
    scope, reference, frozen_paths = validated

    try:
        live_registry = _load_live_registry()
        live_registry_digest = registry_sha256(live_registry)
        live_domain = _domain_for_scope(live_registry, scope)
    except Exception:
        return _result(
            "UNKNOWN",
            "LIVE_REGISTRY_INVALID",
            scope=scope,
            reference=reference,
        )

    frozen_by_locator: dict[str, tuple[str, dict[str, Any] | None]] = {}
    frozen_errors: list[str] = []
    for raw_path in sorted(frozen_paths):
        try:
            locator, registry = _load_frozen_fixture(raw_path)
            frozen_by_locator[locator] = (
                registry_sha256(registry),
                _domain_for_scope(registry, scope),
            )
        except Exception:
            frozen_errors.append(raw_path)

    frozen_rows = [
        (locator, digest, domain)
        for locator, (digest, domain) in sorted(frozen_by_locator.items())
    ]
    if frozen_errors:
        frozen_registries = tuple({
            "registry": locator,
            "registry_sha256": digest,
            "scope_present": domain is not None,
            "match": bool(domain and _reference_matches(domain, reference)),
        } for locator, digest, domain in frozen_rows)
        return _result(
            "UNKNOWN",
            "FROZEN_FIXTURE_INVALID",
            scope=scope,
            reference=reference,
            live_registry_sha256=live_registry_digest,
            live_scope_present=live_domain is not None,
            live_match=bool(live_domain and _reference_matches(live_domain, reference)),
            frozen_registries=frozen_registries,
            frozen_scope_fixtures=tuple(
                locator for locator, _, domain in frozen_rows if domain is not None
            ),
            frozen_match_fixtures=tuple(
                locator
                for locator, _, domain in frozen_rows
                if domain is not None and _reference_matches(domain, reference)
            ),
            frozen_error_locators=tuple(frozen_errors),
        )
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
        return _read_bounded_regular_file(Path(args[0]), MAX_REQUEST_BYTES).decode("utf-8")
    raw_bytes = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
    if len(raw_bytes) > MAX_REQUEST_BYTES:
        raise ValueError("stdin request too large")
    return raw_bytes.decode("utf-8")


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) > 1:
        output = _unknown("CLI_ARGUMENT_INVALID")
    else:
        try:
            request = json.loads(
                _read_cli_input(args),
                object_pairs_hook=_reject_duplicate_keys,
            )
            output = classify_reference(request)
        except Exception:
            output = _unknown("INPUT_JSON_INVALID")
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 2 if output["disposition"] == "UNKNOWN" else 0


if __name__ == "__main__":
    raise SystemExit(main())

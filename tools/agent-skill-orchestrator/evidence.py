from __future__ import annotations

import hashlib
from pathlib import PurePosixPath
from typing import Any, Iterable

from authority import (
    AuthorityError,
    authority_snapshot_sha256,
    observed_authority_sha,
    validate_authority_snapshot,
)
from canonical import canonical_sha256
from registry import load_domain_registry, registry_sha256, validate_domain_registry_data
from router import execution_plan_sha256
from schema_validation import ContractValidationError, validate_contract

EVIDENCE_SOURCE_INPUT_SCHEMA = "evidence-source-input.schema.json"
EVIDENCE_PACKAGE_SCHEMA = "evidence-package.schema.json"
MAX_SOURCES = 64
MAX_TOTAL_CONTENT_CHARS = 120_000


class EvidenceError(ValueError):
    pass


def _content_digest(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _canonical_repo_path(path: str) -> str:
    raw = str(path)
    if not raw or raw.startswith("/") or "\\" in raw:
        raise EvidenceError(f"source path must be relative canonical POSIX path: {raw!r}")
    pure = PurePosixPath(raw)
    if ".." in pure.parts:
        raise EvidenceError(f"source path traversal is forbidden: {raw!r}")
    normalized = pure.as_posix()
    if normalized != raw or normalized in {".", ""} or "/./" in raw:
        raise EvidenceError(f"source path must be canonical POSIX path: {raw!r}")
    return normalized


def _find_domain(domains: dict[str, Any], scope: str) -> dict[str, Any]:
    matches = [item for item in domains["domains"] if item["scope"] == scope]
    if len(matches) != 1:
        raise EvidenceError(f"unregistered scope: {scope}")
    return matches[0]


def _primary_root(domain: dict[str, Any]) -> str:
    primary = str(domain["primary_path"])
    if not primary.endswith("/**"):
        raise EvidenceError(f"unsupported primary_path contract: {primary!r}")
    root = primary[:-2]
    if not root.endswith("/"):
        raise EvidenceError(f"primary_path must identify a directory root: {primary!r}")
    _canonical_repo_path(root[:-1])
    return root


def _authority_refs(domain: dict[str, Any], kind: str) -> tuple[str, ...]:
    return tuple(
        sorted(str(item["value"]) for item in domain["authority_refs"] if item["kind"] == kind)
    )


def _classify_path(domain: dict[str, Any], path: str) -> tuple[str, tuple[str, str] | None]:
    if path == domain["guidelines_path"]:
        return "guidelines", None

    for kind in ("manifest", "artifact"):
        values = _authority_refs(domain, kind)
        if path in values:
            return kind, (kind, path)

    release_dirs = sorted(_authority_refs(domain, "release_spec_dir"), key=len, reverse=True)
    for directory in release_dirs:
        canonical_dir = _canonical_repo_path(directory.rstrip("/"))
        prefix = canonical_dir + "/"
        if path.startswith(prefix):
            return "release_spec_dir", ("release_spec_dir", directory)

    if path.startswith(_primary_root(domain)):
        return "domain_primary", None

    raise EvidenceError(f"source path is outside registered domain evidence boundaries: {path!r}")


def _assert_snapshot_matches_domain(
    snapshot: dict[str, Any],
    domain: dict[str, Any],
    domains: dict[str, Any],
) -> None:
    validate_authority_snapshot(snapshot)
    expected_digest = registry_sha256(domains)
    if snapshot["domain_registry_sha256"] != expected_digest:
        raise EvidenceError("authority snapshot domain registry digest does not match supplied registry")
    if snapshot["scope"] != domain["scope"]:
        raise EvidenceError("authority snapshot scope does not match registered domain")
    expected_profile = f"{domain['domain_id']}-current"
    if snapshot["authority_profile"] != expected_profile:
        raise EvidenceError(
            f"authority snapshot profile must be {expected_profile!r} for registered domain"
        )
    expected_keys = sorted(
        (str(item["kind"]), str(item["value"])) for item in domain["authority_refs"]
    )
    actual_keys = [(str(item["kind"]), str(item["value"])) for item in snapshot["authorities"]]
    if actual_keys != expected_keys:
        raise EvidenceError("authority snapshot entries do not exactly match registered domain authority refs")


def _expected_source_sha(
    authority_class: str,
    authority_key: tuple[str, str] | None,
    snapshot: dict[str, Any],
) -> str:
    if authority_class in {"domain_primary", "guidelines"}:
        return str(snapshot["target_repository_sha"])
    if authority_key is None:
        raise EvidenceError(f"missing authority key for {authority_class}")
    try:
        return observed_authority_sha(snapshot, authority_key[0], authority_key[1])
    except AuthorityError as exc:
        raise EvidenceError(str(exc)) from exc


def _line_count(content: str) -> int:
    return len(content.splitlines()) or 1


def _validate_source_inputs(
    source_blocks: Iterable[dict[str, Any]],
    *,
    domain: dict[str, Any],
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    blocks = list(source_blocks)
    if len(blocks) > MAX_SOURCES:
        raise EvidenceError(f"source count exceeds bound {MAX_SOURCES}")

    total_chars = 0
    normalized: list[dict[str, Any]] = []
    for index, raw in enumerate(blocks):
        try:
            validate_contract(raw, EVIDENCE_SOURCE_INPUT_SCHEMA)
        except ContractValidationError as exc:
            raise EvidenceError(f"invalid evidence source input at index {index}: {exc}") from exc
        start_line = raw["start_line"]
        if start_line < 1:
            raise EvidenceError(f"start_line must be >= 1 at source index {index}")
        path = _canonical_repo_path(raw["path"])
        content = raw["content"]
        total_chars += len(content)
        if total_chars > MAX_TOTAL_CONTENT_CHARS:
            raise EvidenceError(
                f"total evidence content exceeds bound {MAX_TOTAL_CONTENT_CHARS} characters"
            )
        authority_class, authority_key = _classify_path(domain, path)
        expected_sha = _expected_source_sha(authority_class, authority_key, snapshot)
        if raw["source_sha"] != expected_sha:
            raise EvidenceError(
                f"source_sha mismatch for {path!r}: expected {expected_sha}, got {raw['source_sha']}"
            )
        digest = _content_digest(content)
        end_line = start_line + _line_count(content) - 1
        normalized.append(
            {
                "path": path,
                "source_sha": raw["source_sha"],
                "start_line": start_line,
                "end_line": end_line,
                "content": content,
                "authority_class": authority_class,
                "block_digest": digest,
            }
        )

    normalized.sort(
        key=lambda item: (
            item["path"],
            item["start_line"],
            item["end_line"],
            item["source_sha"],
            item["block_digest"],
        )
    )

    previous_by_path: dict[str, tuple[int, int]] = {}
    for item in normalized:
        previous = previous_by_path.get(item["path"])
        if previous is not None and item["start_line"] <= previous[1]:
            raise EvidenceError(
                f"overlapping evidence blocks are forbidden for {item['path']!r}: "
                f"previous={previous[0]}-{previous[1]}, next={item['start_line']}-{item['end_line']}"
            )
        previous_by_path[item["path"]] = (item["start_line"], item["end_line"])
    return normalized


def evidence_source_refs(package: dict[str, Any]) -> frozenset[str]:
    return frozenset(str(item["source_ref"]["ref"]) for item in package["sources"])


def validate_evidence_package(package: dict[str, Any]) -> None:
    refs = evidence_source_refs(package) if isinstance(package.get("sources"), list) else frozenset()
    try:
        validate_contract(package, EVIDENCE_PACKAGE_SCHEMA, known_source_refs=refs)
    except ContractValidationError as exc:
        raise EvidenceError(f"invalid evidence package: {exc}") from exc

    if len(package["sources"]) > MAX_SOURCES:
        raise EvidenceError(f"source count exceeds bound {MAX_SOURCES}")
    if sum(len(item["content"]) for item in package["sources"]) > MAX_TOTAL_CONTENT_CHARS:
        raise EvidenceError(
            f"total evidence content exceeds bound {MAX_TOTAL_CONTENT_CHARS} characters"
        )

    previous_key: tuple[str, int, int, str, str] | None = None
    previous_by_path: dict[str, tuple[int, int]] = {}
    for index, item in enumerate(package["sources"], start=1):
        path = _canonical_repo_path(item["path"])
        if item["start_line"] < 1 or item["end_line"] < item["start_line"]:
            raise EvidenceError(f"invalid line range for source {index}")
        expected_end = item["start_line"] + _line_count(item["content"]) - 1
        if item["end_line"] != expected_end:
            raise EvidenceError(f"end_line does not match exact content line count for source {index}")
        digest = _content_digest(item["content"])
        expected_source_id = f"S{index}"
        expected_ref = f"{expected_source_id}@L{item['start_line']}"
        if item["source_id"] != expected_source_id:
            raise EvidenceError(f"source ids must be sequential canonical ids; expected {expected_source_id}")
        if item["source_ref"]["ref"] != expected_ref:
            raise EvidenceError(f"source ref must be {expected_ref!r} for {expected_source_id}")
        if item["source_ref"]["source_sha"] != item["source_sha"]:
            raise EvidenceError(f"source ref SHA mismatch for {expected_source_id}")
        if item["source_ref"]["block_digest"] != digest:
            raise EvidenceError(f"source ref block digest mismatch for {expected_source_id}")

        key = (path, item["start_line"], item["end_line"], item["source_sha"], digest)
        if previous_key is not None and key < previous_key:
            raise EvidenceError("evidence sources must be in canonical sorted order")
        previous_key = key
        previous = previous_by_path.get(path)
        if previous is not None and item["start_line"] <= previous[1]:
            raise EvidenceError(f"overlapping evidence blocks are forbidden for {path!r}")
        previous_by_path[path] = (item["start_line"], item["end_line"])


def build_evidence_package(
    execution_plan: dict[str, Any],
    authority_snapshot: dict[str, Any],
    source_blocks: Iterable[dict[str, Any]],
    *,
    domain_registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build an immutable bounded evidence package from explicit repository source blocks."""
    try:
        validate_contract(execution_plan, "execution-plan.schema.json")
    except ContractValidationError as exc:
        raise EvidenceError(f"invalid execution plan: {exc}") from exc

    domains = load_domain_registry() if domain_registry_data is None else domain_registry_data
    try:
        validate_domain_registry_data(domains)
    except ContractValidationError as exc:
        raise EvidenceError(f"invalid domain registry: {exc}") from exc
    domain = _find_domain(domains, execution_plan["scope"])
    _assert_snapshot_matches_domain(authority_snapshot, domain, domains)
    if authority_snapshot["scope"] != execution_plan["scope"]:
        raise EvidenceError("execution plan scope and authority snapshot scope must match")

    normalized = _validate_source_inputs(
        source_blocks,
        domain=domain,
        snapshot=authority_snapshot,
    )
    sources: list[dict[str, Any]] = []
    for index, item in enumerate(normalized, start=1):
        source_id = f"S{index}"
        source_ref = {
            "ref": f"{source_id}@L{item['start_line']}",
            "source_sha": item["source_sha"],
            "block_digest": item["block_digest"],
        }
        sources.append(
            {
                "source_id": source_id,
                "path": item["path"],
                "source_sha": item["source_sha"],
                "start_line": item["start_line"],
                "end_line": item["end_line"],
                "content": item["content"],
                "authority_class": item["authority_class"],
                "source_ref": source_ref,
            }
        )

    package = {
        "schema_version": 1,
        "scope": execution_plan["scope"],
        "target_repository_sha": authority_snapshot["target_repository_sha"],
        "execution_plan_sha256": execution_plan_sha256(execution_plan),
        "authority_snapshot_sha256": authority_snapshot_sha256(authority_snapshot),
        "domain_registry_sha256": registry_sha256(domains),
        "sources": sources,
        "blockers": list(authority_snapshot["blockers"]),
    }
    validate_evidence_package(package)
    return package


def evidence_package_sha256(package: dict[str, Any]) -> str:
    validate_evidence_package(package)
    return canonical_sha256(package)

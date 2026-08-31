#!/usr/bin/env python3
"""Resolve repository authority locators without making mutable truth claims.

This helper is intentionally read-only. It reads repository registration/catalog
files and reports locators. It never reads network state, mutates repository files,
or treats a locator as proof of the current value stored there.

Authority fields are independent locators until the owning project contract binds
a ref-like locator to a path-like locator. This helper deliberately does not build
project-specific ref:path authority plans.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

REGISTRY_REL = Path(".github/plugin-control-plane/registry.json")
CATALOG_REL = Path("docs/REPO_PROJECT_CATALOG.md")
COMMON_RULES_REL = Path("docs/REPOSITORY_COMMON_RULES.md")
PILOT_VALIDATED_SCOPES = frozenset({"plugin:usage-dashboard"})
LOCATOR_SEMANTICS = "INDEPENDENT_UNTIL_BOUND_BY_OWNING_CONTRACT"


class ScanError(Exception):
    def __init__(self, message: str, exit_code: int = 2) -> None:
        super().__init__(message)
        self.exit_code = exit_code


@dataclass(frozen=True)
class ScopeEntry:
    scope: str
    kind: str
    key: str
    data: dict[str, Any]

    @property
    def display_name(self) -> str:
        return str(self.data.get("displayName", self.key))

    @property
    def lifecycle(self) -> str:
        return str(self.data.get("lifecycle", ""))

    @property
    def paths(self) -> list[str]:
        value = self.data.get("paths", [])
        return [str(item) for item in value] if isinstance(value, list) else []

    @property
    def issue_values(self) -> list[str]:
        value = self.data.get("issueValues", [])
        return [str(item) for item in value] if isinstance(value, list) else []


def normalize(value: str) -> str:
    return " ".join(value.strip().lower().split())


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError as exc:
        raise ScanError(f"required source missing: {path}", 4) from exc
    except json.JSONDecodeError as exc:
        raise ScanError(f"invalid JSON in {path}: {exc}", 4) from exc
    if not isinstance(data, dict):
        raise ScanError(f"expected JSON object in {path}", 4)
    return data


def registry_entries(registry: dict[str, Any]) -> list[ScopeEntry]:
    entries: list[ScopeEntry] = []
    for plural, prefix in (("plugins", "plugin"), ("products", "product")):
        group = registry.get(plural, {})
        if not isinstance(group, dict):
            raise ScanError(f"registry field {plural!r} must be an object", 4)
        for key, raw in group.items():
            if not isinstance(raw, dict):
                raise ScanError(f"registry entry {plural}.{key} must be an object", 4)
            entries.append(ScopeEntry(f"{prefix}:{key}", prefix, str(key), raw))
    return entries


def _path_matches(pattern: str, query: str) -> bool:
    q = query.strip().replace("\\", "/").lstrip("./")
    p = pattern.strip().replace("\\", "/").lstrip("./")
    return bool(q) and fnmatch.fnmatchcase(q, p)


def entry_matches(entry: ScopeEntry, query: str) -> bool:
    q = normalize(query)
    exact_candidates = {
        normalize(entry.scope),
        normalize(entry.key),
        normalize(entry.display_name),
        *(normalize(value) for value in entry.issue_values),
    }
    if q in exact_candidates:
        return True
    return any(_path_matches(pattern, query) for pattern in entry.paths)


def resolve_entry(entries: Iterable[ScopeEntry], query: str) -> ScopeEntry:
    matches = [entry for entry in entries if entry_matches(entry, query)]
    if not matches:
        raise ScanError(f"scope did not resolve from current registry: {query!r}", 2)
    unique = {entry.scope: entry for entry in matches}
    if len(unique) != 1:
        scopes = ", ".join(sorted(unique))
        raise ScanError(f"ambiguous scope {query!r}; matches: {scopes}", 3)
    return next(iter(unique.values()))


def parse_catalog(path: Path) -> dict[str, dict[str, str]]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise ScanError(f"required source missing: {path}", 4) from exc

    rows: dict[str, dict[str, str]] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) < 6 or cells[0] in {"Scope", "---"}:
            continue
        scope, name, lifecycle, primary_path, authority, guidelines = cells[:6]
        if not scope.startswith(("plugin:", "product:")):
            continue
        if scope in rows:
            raise ScanError(f"duplicate catalog scope: {scope}", 4)
        rows[scope] = {
            "scope": scope,
            "name": name,
            "lifecycle": lifecycle,
            "primary_path": primary_path,
            "authority": authority,
            "guidelines": guidelines,
        }
    return rows


def parse_authority_cell(value: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for part in value.split(";"):
        item = part.strip()
        if not item:
            continue
        if "=" not in item:
            result[item] = ""
            continue
        key, raw = item.split("=", 1)
        result[key.strip()] = raw.strip()
    return result


def compare_catalog(entry: ScopeEntry, row: dict[str, str]) -> dict[str, Any]:
    registry_authority = entry.data.get("authority", {})
    if not isinstance(registry_authority, dict):
        raise ScanError(f"registry authority for {entry.scope} must be an object", 4)
    registry_authority = {str(k): str(v) for k, v in registry_authority.items()}
    catalog_authority = parse_authority_cell(row.get("authority", ""))

    mismatches: list[str] = []
    if row.get("name") != entry.display_name:
        mismatches.append("displayName")
    if row.get("lifecycle") != entry.lifecycle:
        mismatches.append("lifecycle")
    if catalog_authority != registry_authority:
        mismatches.append("authority")

    return {
        "status": "CONSISTENT" if not mismatches else "CONFLICT",
        "mismatches": mismatches,
        "registry_authority": registry_authority,
        "catalog_authority": catalog_authority,
    }


PATH_AUTHORITY_KEYS = {
    "manifest",
    "artifact",
    "releaseSpecDir",
    "evidence",
    "currentState",
    "declaredBy",
}


def local_locator_checks(repo_root: Path, entry: ScopeEntry, guideline: str) -> dict[str, Any]:
    authority = entry.data.get("authority", {})
    result: dict[str, Any] = {
        "guideline": {
            "path": guideline,
            "exists_on_current_checkout": bool(guideline) and (repo_root / guideline).exists(),
        }
    }
    if isinstance(authority, dict):
        for key, value in authority.items():
            if key not in PATH_AUTHORITY_KEYS:
                continue
            path = str(value)
            result[key] = {
                "path": path,
                "exists_on_current_checkout": (repo_root / path).exists(),
                "note": "current-checkout existence is not proof of ref ownership or production state",
            }
    return result


def scan(repo_root: Path, query: str) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    registry_path = repo_root / REGISTRY_REL
    catalog_path = repo_root / CATALOG_REL
    common_rules_path = repo_root / COMMON_RULES_REL

    if not common_rules_path.exists():
        raise ScanError(f"required source missing: {common_rules_path}", 4)

    registry = load_json(registry_path)
    entry = resolve_entry(registry_entries(registry), query)
    catalog = parse_catalog(catalog_path)
    row = catalog.get(entry.scope)
    if row is None:
        raise ScanError(
            f"registry/catalog conflict: {entry.scope} exists in registry but not catalog",
            4,
        )

    consistency = compare_catalog(entry, row)
    guideline = row.get("guidelines", "")
    authority = entry.data.get("authority", {})
    authority = {str(k): str(v) for k, v in authority.items()} if isinstance(authority, dict) else {}

    return {
        "schema_version": 1,
        "query": query,
        "scope": entry.scope,
        "kind": entry.kind,
        "key": entry.key,
        "display_name": entry.display_name,
        "lifecycle": entry.lifecycle,
        "pilot_validated": entry.scope in PILOT_VALIDATED_SCOPES,
        "truth_claim_status": "LOCATOR_ONLY",
        "locator_semantics": LOCATOR_SEMANTICS,
        "registration_sources": [
            str(REGISTRY_REL),
            str(CATALOG_REL),
            str(COMMON_RULES_REL),
        ],
        "primary_paths": entry.paths,
        "catalog_primary_path": row.get("primary_path", ""),
        "guideline": guideline,
        "declared_authority": authority,
        "catalog_consistency": consistency,
        "local_locator_checks": local_locator_checks(repo_root, entry, guideline),
        "fresh_read_requirements": [
            "Read the owning guideline and follow its project-specific source-of-truth order.",
            "Treat every registry/catalog authority field as an independent locator unless the owning contract binds fields together.",
            "Build exact ref:path reads from current project authority, not from locator adjacency.",
            "Read only the exact evidence needed for the requested claim.",
            "If ref ownership or required evidence is unavailable or unresolved, preserve UNKNOWN or CONFLICT.",
        ],
        "mutation_performed": False,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Resolve registered plugin/product authority locators from the repository "
            "without making current-version or deployment claims."
        )
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path.cwd(),
        help="repository root containing .github/plugin-control-plane/registry.json (default: current directory)",
    )
    parser.add_argument(
        "--scope",
        required=True,
        help="scope id, registry key/display name/issue value, or path that should resolve to one registered scope",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit structured JSON instead of a compact text report",
    )
    return parser


def render_text(result: dict[str, Any]) -> str:
    authority = result["declared_authority"]
    lines = [
        f"scope: {result['scope']} ({result['display_name']})",
        f"lifecycle: {result['lifecycle']}",
        f"pilot_validated: {'yes' if result['pilot_validated'] else 'no'}",
        f"guideline: {result['guideline'] or '—'}",
        f"catalog_consistency: {result['catalog_consistency']['status']}",
        f"locator_semantics: {result['locator_semantics']}",
        "declared_authority:",
    ]
    if authority:
        lines.extend(f"  {key}: {value}" for key, value in authority.items())
    else:
        lines.append("  —")
    lines.append("truth_claim_status: LOCATOR_ONLY")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = scan(args.repo_root, args.scope)
    except ScanError as exc:
        if args.json:
            print(json.dumps({"error": str(exc), "status": "UNKNOWN"}, ensure_ascii=False))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return exc.exit_code

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(render_text(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

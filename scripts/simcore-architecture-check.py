#!/usr/bin/env python3
"""SimCore Contracts v2 architecture drift guard.

This checker is intentionally behavioral-neutral. It inspects module declarations
and direct SimCore-internal require edges only; it does not execute the plugin.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

DEFINE_RE = re.compile(
    r'SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{'
)
REQUIRE_RE = re.compile(r"""require\(['"]\./([^'"]+)['"]\)""")
SOURCE_VERSION_RE = re.compile(r"^//@version\s+([^\s]+)\s*$", re.MULTILINE)

SNAPSHOT_MAX_MODULES = 256
SNAPSHOT_MAX_EDGES = 2048
SNAPSHOT_MAX_TEXT = 2048
SNAPSHOT_MAX_BYTES = 512 * 1024


class SnapshotError(RuntimeError):
    """Operational snapshot-generation failure; never changes architecture policy."""


def extract_modules(source: str) -> Tuple[Dict[str, List[str]], List[str]]:
    matches = list(DEFINE_RE.finditer(source))
    modules: Dict[str, List[str]] = {}
    duplicates: List[str] = []

    for i, match in enumerate(matches):
        name = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(source)
        deps = sorted(set(REQUIRE_RE.findall(source[start:end])))
        if name in modules:
            duplicates.append(name)
        modules[name] = deps

    return modules, sorted(set(duplicates))


def parse_release_version(value: object) -> Tuple[int, int, int] | None:
    text = str(value or "")
    parts = text.split(".")
    if len(parts) != 3 or any(not part.isdigit() for part in parts):
        return None
    return tuple(int(part) for part in parts)  # type: ignore[return-value]


def extract_source_version(source: str) -> Tuple[str, Tuple[int, int, int] | None]:
    match = SOURCE_VERSION_RE.search(source)
    text = match.group(1) if match else ""
    return text, parse_release_version(text)


def retirement_target(spec: dict) -> Tuple[str, Tuple[int, int, int] | None]:
    text = str(spec.get("retire_at_version") or "")
    return text, parse_release_version(text)


def classify_edge(name: str, dep: str, contract: dict) -> str:
    """Serialize the same contract checks already enforced by the checker."""
    declared = contract["modules"]
    if name not in declared:
        return "UNDECLARED"
    if dep not in declared:
        return "UNKNOWN_MODULE"

    spec = declared[name]
    dep_layer = declared[dep]["layer"]
    exceptions = set(spec.get("transition_exceptions", []))
    allowed = set(spec.get("allowed_dependencies", []))
    allowed_layers = set(contract["layer_dependency_policy"].get(spec["layer"], []))

    if spec["layer"] != "runtime" and dep_layer == "runtime":
        return "FORBIDDEN_LAYER"
    if dep_layer not in allowed_layers and dep not in exceptions:
        return "FORBIDDEN_LAYER"
    if dep not in allowed and dep not in exceptions:
        return "UNDECLARED"
    if dep in exceptions:
        return "TRANSITION_EXCEPTION"
    return "ALLOWED"


def analyze_source(path: Path, contract: dict) -> dict:
    source = path.read_text(encoding="utf-8")
    actual, duplicates = extract_modules(source)
    source_version_text, source_version = extract_source_version(source)
    failures: List[str] = []
    notices: List[str] = []

    declared = contract["modules"]
    known_modules = set(declared)
    layer_policy = contract["layer_dependency_policy"]
    runtime_authorized = bool(contract["major_update"].get("runtime_refactor_authorized"))

    if source_version is None:
        failures.append(
            f"{path}: source //@version must be exact numeric x.y.z for architecture retirement checks; "
            f"observed={source_version_text or 'MISSING'}"
        )

    if duplicates:
        failures.append(f"{path}: duplicate SimCore module definition(s): {duplicates}")

    for name, deps in actual.items():
        if name not in declared:
            failures.append(f"{path}: undeclared module {name!r}")
            continue

        spec = declared[name]
        physical = spec.get("physical")
        if physical == "deferred":
            failures.append(
                f"{path}: deferred module {name!r} appeared before contract promotion"
            )
        if physical == "planned" and not runtime_authorized:
            failures.append(
                f"{path}: planned M2 module {name!r} appeared while "
                "runtime_refactor_authorized=false"
            )
        if physical == "retiring":
            target_text, target_version = retirement_target(spec)
            if target_version is None:
                failures.append(
                    f"{path}: retiring module {name!r} requires exact retire_at_version x.y.z; "
                    f"observed={target_text or 'MISSING'}"
                )
            elif source_version is not None and source_version >= target_version:
                failures.append(
                    f"{path}: retiring module {name!r} must be absent at/after "
                    f"v{target_text}; source is v{source_version_text}"
                )

        allowed = set(spec.get("allowed_dependencies", []))
        exceptions = set(spec.get("transition_exceptions", []))
        actual_set = set(deps)

        unknown = sorted(actual_set - known_modules)
        if unknown:
            failures.append(f"{path}: {name} requires unknown module(s): {unknown}")

        undeclared_edges = sorted(actual_set - allowed - exceptions)
        if undeclared_edges:
            failures.append(
                f"{path}: {name} has undeclared dependency edge(s): {undeclared_edges}"
            )

        stale_exceptions = sorted(exceptions - actual_set)
        if stale_exceptions:
            failures.append(
                f"{path}: {name} has stale transition exception(s) no longer present "
                f"in source: {stale_exceptions}; remove them from the contract"
            )

        for dep in deps:
            if dep not in declared:
                continue
            dep_layer = declared[dep]["layer"]
            allowed_layers = set(layer_policy.get(spec["layer"], []))
            if dep_layer not in allowed_layers and dep not in exceptions:
                failures.append(
                    f"{path}: forbidden layer edge {name}({spec['layer']}) "
                    f"-> {dep}({dep_layer})"
                )

            if spec["layer"] != "runtime" and dep_layer == "runtime":
                failures.append(
                    f"{path}: core module {name} must not depend directly on runtime module {dep}"
                )

        if exceptions:
            notices.append(
                f"{path}: transition debt {name} -> {sorted(exceptions)} "
                "(frozen; may shrink, may not expand)"
            )

    required = {
        name
        for name, spec in declared.items()
        if spec.get("physical") == "required"
    }
    if source_version is not None:
        for name, spec in declared.items():
            if spec.get("physical") != "retiring":
                continue
            target_text, target_version = retirement_target(spec)
            if target_version is None:
                continue
            if source_version < target_version:
                required.add(name)
                notices.append(
                    f"{path}: retirement staged {name} present before v{target_text}; "
                    f"source v{source_version_text}"
                )

    missing = sorted(required - set(actual))
    if missing:
        failures.append(f"{path}: missing required module definition(s): {missing}")

    edges = [
        {"from": name, "to": dep, "classification": classify_edge(name, dep, contract)}
        for name in sorted(actual)
        for dep in actual[name]
    ]
    return {
        "graph": actual,
        "failures": failures,
        "notices": notices,
        "edges": edges,
    }


def check_source(path: Path, contract: dict) -> Tuple[Dict[str, List[str]], List[str], List[str]]:
    analysis = analyze_source(path, contract)
    return analysis["graph"], analysis["failures"], analysis["notices"]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def repo_relative(path: Path, root: Path) -> str:
    try:
        relative = path.resolve().relative_to(root.resolve())
    except ValueError as error:
        raise SnapshotError(f"path outside repository root: {path}") from error
    return relative.as_posix()


def graph_digest(graph: Dict[str, List[str]]) -> str:
    material = [[name, list(sorted(set(graph[name])))] for name in sorted(graph)]
    encoded = json.dumps(material, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(encoded)


def build_snapshot(
    *,
    root: Path,
    contract_path: Path,
    contract_bytes: bytes,
    contract: dict,
    source_paths: List[Path],
    analyses: Dict[str, dict],
    failures: List[str],
    notices: List[str],
) -> dict:
    contract_rel = repo_relative(contract_path, root)
    source_rows = []

    for source_path in source_paths:
        analysis = analyses[str(source_path)]
        graph = analysis["graph"]
        edges = analysis["edges"]

        if len(graph) > SNAPSHOT_MAX_MODULES:
            raise SnapshotError(
                f"{source_path}: physical module count {len(graph)} exceeds {SNAPSHOT_MAX_MODULES}"
            )
        if len(edges) > SNAPSHOT_MAX_EDGES:
            raise SnapshotError(
                f"{source_path}: direct edge count {len(edges)} exceeds {SNAPSHOT_MAX_EDGES}"
            )

        modules = []
        for name in sorted(graph):
            spec = contract["modules"].get(name)
            modules.append(
                {
                    "name": name,
                    "layer": spec.get("layer") if spec else "UNDECLARED",
                    "physical": spec.get("physical") if spec else "UNDECLARED",
                    "dependencies": list(sorted(set(graph[name]))),
                }
            )

        source_bytes = source_path.read_bytes()
        source_rows.append(
            {
                "path": repo_relative(source_path, root),
                "sha256": sha256_bytes(source_bytes),
                "modules": modules,
                "edges": sorted(
                    edges,
                    key=lambda row: (row["from"], row["to"], row["classification"]),
                ),
                "graphSha256": graph_digest(graph),
            }
        )

    bounded_failures = sorted(set(failures))
    bounded_notices = sorted(set(notices))
    for item in bounded_failures + bounded_notices:
        if len(item) > SNAPSHOT_MAX_TEXT:
            raise SnapshotError(
                f"checker finding exceeds {SNAPSHOT_MAX_TEXT} characters"
            )

    graph_hashes = [row["graphSha256"] for row in source_rows]
    graph_equal = len(graph_hashes) <= 1 or len(set(graph_hashes)) == 1

    return {
        "schemaVersion": 1,
        "contract": {
            "path": contract_rel,
            "sha256": sha256_bytes(contract_bytes),
            "schemaVersion": contract["schema_version"],
            "milestone": contract["major_update"]["milestone"],
            "phase": contract["major_update"]["phase"],
        },
        "sources": source_rows,
        "parity": {
            "graphEqual": graph_equal,
            "allGraphSha256Equal": graph_equal,
        },
        "check": {
            "result": "FAIL" if failures else "PASS",
            "failureCount": len(bounded_failures),
            "noticeCount": len(bounded_notices),
            "failures": bounded_failures,
            "notices": bounded_notices,
        },
    }


def serialize_snapshot(snapshot: dict) -> bytes:
    data = (json.dumps(snapshot, indent=2, ensure_ascii=True) + "\n").encode("utf-8")
    if len(data) > SNAPSHOT_MAX_BYTES:
        raise SnapshotError(
            f"snapshot size {len(data)} exceeds {SNAPSHOT_MAX_BYTES} bytes"
        )
    return data


def write_snapshot(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        temp.write_bytes(data)
        temp.replace(path)
    finally:
        if temp.exists():
            temp.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--contract",
        default="config/simcore-architecture-v2.json",
        help="machine-readable Contracts v2 file",
    )
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        help="plugin source to inspect; repeatable",
    )
    parser.add_argument(
        "--snapshot-out",
        default=None,
        help="optional deterministic JSON dependency snapshot output path",
    )
    args = parser.parse_args()

    contract_path = Path(args.contract)
    contract_bytes = contract_path.read_bytes()
    contract = json.loads(contract_bytes.decode("utf-8"))
    if int(contract.get("schema_version", 0)) != 2:
        raise SystemExit("SimCore architecture contract: FAIL\n- schema_version must be 2")

    source_paths = [
        Path(p)
        for p in (
            args.source
            or ["plugins/simcore/latest.js", "plugins/simcore/install.js"]
        )
    ]

    all_graphs: Dict[str, Dict[str, List[str]]] = {}
    analyses: Dict[str, dict] = {}
    failures: List[str] = []
    notices: List[str] = []

    for source_path in source_paths:
        analysis = analyze_source(source_path, contract)
        graph = analysis["graph"]
        all_graphs[str(source_path)] = graph
        analyses[str(source_path)] = analysis
        failures.extend(analysis["failures"])
        notices.extend(analysis["notices"])

    if len(source_paths) >= 2:
        baseline = all_graphs[str(source_paths[0])]
        for other in source_paths[1:]:
            if all_graphs[str(other)] != baseline:
                failures.append(
                    f"module dependency graph differs: {source_paths[0]} vs {other}"
                )

    snapshot_error = None
    if args.snapshot_out:
        try:
            snapshot = build_snapshot(
                root=Path.cwd(),
                contract_path=contract_path,
                contract_bytes=contract_bytes,
                contract=contract,
                source_paths=source_paths,
                analyses=analyses,
                failures=failures,
                notices=notices,
            )
            write_snapshot(Path(args.snapshot_out), serialize_snapshot(snapshot))
        except (OSError, SnapshotError, KeyError, TypeError, ValueError) as error:
            snapshot_error = error

    if failures:
        print("SimCore architecture contract: FAIL")
        for failure in failures:
            print(f"- {failure}")
        if notices:
            print("Transition notices:")
            for notice in sorted(set(notices)):
                print(f"- {notice}")
        if snapshot_error is not None:
            print(f"Snapshot output: FAIL - {snapshot_error}")
        raise SystemExit(1)

    print("SimCore architecture contract: PASS")
    print(
        f"- schema v{contract['schema_version']} · "
        f"{contract['major_update']['milestone']} {contract['major_update']['phase']}"
    )
    print(
        "- runtime refactor authorized: "
        f"{str(bool(contract['major_update'].get('runtime_refactor_authorized'))).lower()}"
    )
    for notice in sorted(set(notices)):
        print(f"- {notice}")

    if snapshot_error is not None:
        print(f"Snapshot output: FAIL - {snapshot_error}")
        raise SystemExit(2)


if __name__ == "__main__":
    main()

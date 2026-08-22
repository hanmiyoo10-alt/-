#!/usr/bin/env python3
"""SimCore Contracts v2 architecture drift guard.

This checker is intentionally behavioral-neutral. It inspects module declarations
and direct SimCore-internal require edges only; it does not execute the plugin.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

DEFINE_RE = re.compile(
    r'SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{'
)
REQUIRE_RE = re.compile(r"""require\(['"]\./([^'"]+)['"]\)""")


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


def check_source(path: Path, contract: dict) -> Tuple[Dict[str, List[str]], List[str], List[str]]:
    source = path.read_text(encoding="utf-8")
    actual, duplicates = extract_modules(source)
    failures: List[str] = []
    notices: List[str] = []

    declared = contract["modules"]
    known_modules = set(declared)
    layer_policy = contract["layer_dependency_policy"]
    runtime_authorized = bool(contract["major_update"].get("runtime_refactor_authorized"))

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
    missing = sorted(required - set(actual))
    if missing:
        failures.append(f"{path}: missing required module definition(s): {missing}")

    return actual, failures, notices


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
    args = parser.parse_args()

    contract = json.loads(Path(args.contract).read_text(encoding="utf-8"))
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
    failures: List[str] = []
    notices: List[str] = []

    for source_path in source_paths:
        graph, source_failures, source_notices = check_source(source_path, contract)
        all_graphs[str(source_path)] = graph
        failures.extend(source_failures)
        notices.extend(source_notices)

    if len(source_paths) >= 2:
        baseline = all_graphs[str(source_paths[0])]
        for other in source_paths[1:]:
            if all_graphs[str(other)] != baseline:
                failures.append(
                    f"module dependency graph differs: {source_paths[0]} vs {other}"
                )

    if failures:
        print("SimCore architecture contract: FAIL")
        for failure in failures:
            print(f"- {failure}")
        if notices:
            print("Transition notices:")
            for notice in sorted(set(notices)):
                print(f"- {notice}")
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


if __name__ == "__main__":
    main()

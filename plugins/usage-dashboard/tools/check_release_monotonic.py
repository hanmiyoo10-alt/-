#!/usr/bin/env python3
"""Guard Local Usage Dashboard release publishing against stale/downgrade candidates.

Exit codes:
  0: publish is allowed, or candidate/release are already identical (no-op).
  2: stale candidate / downgrade attempt.
  3: same-version artifact divergence.
  4: malformed or unsupported manifest/version input.

The script is intentionally product-scoped. It compares only Local Usage Dashboard
manifests and never reads or reasons about other products in this repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PRODUCT = "Local Usage Dashboard"
VERSION_RE = re.compile(r"^3\.0\.0-(alpha|rc)\.(\d+)(?:\.(\d+))?$")


@dataclass(frozen=True, order=True)
class VersionKey:
    stage: int
    major: int
    minor: int


def parse_version(value: str) -> VersionKey:
    text = str(value or "").strip()
    if text == "3.0.0":
        return VersionKey(2, 0, 0)
    match = VERSION_RE.fullmatch(text)
    if not match:
        raise ValueError(f"unsupported Local Usage Dashboard version: {text!r}")
    stage_name, first, second = match.groups()
    if stage_name == "alpha":
        # Project alpha versions are alpha.<series>.<iteration>, e.g. alpha.5.60.
        if second is None:
            raise ValueError(f"alpha version must include series and iteration: {text!r}")
        return VersionKey(0, int(first), int(second))
    # RC versions are rc.<iteration>.
    if second is not None:
        raise ValueError(f"rc version must have one numeric component: {text!r}")
    return VersionKey(1, int(first), 0)


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001 - fail closed by design
        raise ValueError(f"cannot read manifest {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"manifest is not an object: {path}")
    if data.get("product") != PRODUCT:
        raise ValueError(f"unexpected product in {path}: {data.get('product')!r}")
    version = str(data.get("productVersion") or "")
    parse_version(version)
    plugin_version = str(((data.get("components") or {}).get("plugin") or {}).get("version") or "")
    manager_product_version = str(((data.get("components") or {}).get("bridgeManager") or {}).get("productVersion") or "")
    if plugin_version != version or manager_product_version != version:
        raise ValueError(
            f"manifest product/plugin/manager productVersion mismatch in {path}: "
            f"{version!r} / {plugin_version!r} / {manager_product_version!r}"
        )
    return data


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_artifacts(manifest: dict[str, Any], root: Path) -> tuple[str, str, str]:
    components = manifest.get("components") or {}
    bridge = components.get("bridge") or {}
    manager = components.get("bridgeManager") or {}
    engine_path = root / "bridge-engine.mjs"
    manager_path = root / "bridge-manager.cjs"
    latest_path = root.parent / "latest.js"
    for path in (engine_path, manager_path, latest_path):
        if not path.is_file():
            raise ValueError(f"missing release artifact: {path}")
    engine_sha = sha256_file(engine_path)
    manager_sha = sha256_file(manager_path)
    expected_engine = str(bridge.get("sha256") or "")
    expected_manager = str(manager.get("sha256") or "")
    if engine_sha != expected_engine:
        raise ValueError(f"engine sha mismatch: {engine_sha} != {expected_engine}")
    if manager_sha != expected_manager:
        raise ValueError(f"manager sha mismatch: {manager_sha} != {expected_manager}")
    return engine_sha, manager_sha, sha256_file(latest_path)


def decision(candidate: dict[str, Any], main: dict[str, Any], release: dict[str, Any]) -> str:
    candidate_v = str(candidate["productVersion"])
    main_v = str(main["productVersion"])
    release_v = str(release["productVersion"])
    ck = parse_version(candidate_v)
    mk = parse_version(main_v)
    rk = parse_version(release_v)
    if ck < mk:
        return f"STALE_CANDIDATE_MAIN:{candidate_v}<{main_v}"
    if ck < rk:
        return f"STALE_CANDIDATE_RELEASE:{candidate_v}<{release_v}"
    if ck > mk:
        return f"CANDIDATE_AHEAD_OF_MAIN:{candidate_v}>{main_v}"
    return "ALLOW"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-manifest", type=Path, required=True)
    parser.add_argument("--main-manifest", type=Path, required=True)
    parser.add_argument("--release-manifest", type=Path, required=True)
    parser.add_argument("--candidate-runtime", type=Path)
    parser.add_argument("--release-runtime", type=Path)
    parser.add_argument("--check-artifacts", action="store_true")
    args = parser.parse_args()

    try:
        candidate = load_manifest(args.candidate_manifest)
        main_manifest = load_manifest(args.main_manifest)
        release = load_manifest(args.release_manifest)
        result = decision(candidate, main_manifest, release)
        if result.startswith("STALE_CANDIDATE"):
            print(result)
            return 2
        if result.startswith("CANDIDATE_AHEAD_OF_MAIN"):
            print(result)
            return 4

        candidate_v = str(candidate["productVersion"])
        release_v = str(release["productVersion"])
        if args.check_artifacts:
            if not args.candidate_runtime or not args.release_runtime:
                raise ValueError("--check-artifacts requires candidate/release runtime directories")
            candidate_artifacts = validate_artifacts(candidate, args.candidate_runtime)
            release_artifacts = validate_artifacts(release, args.release_runtime)
            if parse_version(candidate_v) == parse_version(release_v):
                if candidate_artifacts != release_artifacts:
                    print(f"SAME_VERSION_ARTIFACT_DIVERGENCE:{candidate_v}")
                    return 3
                print(f"NOOP_IDENTICAL:{candidate_v}")
                return 0

        print(f"ALLOW:{candidate_v}:main={main_manifest['productVersion']}:release={release_v}")
        return 0
    except ValueError as exc:
        print(f"FAIL_CLOSED:{exc}", file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())

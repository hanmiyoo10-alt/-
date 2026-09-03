from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
REPO_ROOT = PACKAGE_ROOT.parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from authority import resolve_authority
from evidence import build_evidence_package, evidence_package_sha256, validate_evidence_package
from router import route_task
from benchmarks.score_role_output import (
    SCORING_POLICY_ID,
    SCORING_POLICY_SHA256,
    fixture_sha256,
    validate_case,
)

SOURCE_REPOSITORY_SHA = "3908f71122f267375ee5eccb3fa3ca85564c634e"
PROFILE_PATH = Path("tools/agent-skill-eval/local-context-profiles.json")
PROFILE_SKILL = "plugin-impact-scope"
SOURCE_CASE_ID = "voyage-token-check-visible-refresh-heldout"
EXPECTED_PROFILE_BLOB_SHA = "b15f779ca11fe9fc211925ca2b10bb034e55de82"
CASE_ID = "o4h-voyage-visible-refresh-scout-v1"
CASE_VERSION = "v1"
SCOPE = "plugin:voyage-token-check"
ROLE_CONTRACT_ID = "scout-compact-wire-v3"
EXPECTED_PROFILE_PATHS = (
    "docs/REPO_PROJECT_CATALOG.md",
    "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
    "voyage-token-check/DESIGN_STATUS.md",
    "voyage-token-check/PROJECT_MEMORY.md",
    "voyage-token-check/ARCHITECTURE.md",
    "voyage-token-check/LIVE_REFRESH_CONTRACT.md",
    "voyage-token-check/SECURITY_CONTRACT.md",
)


class O4HInputError(ValueError):
    pass


def _git(repo_root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit={proc.returncode}"
        raise O4HInputError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout.rstrip("\n")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise O4HInputError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise O4HInputError(f"JSON object required: {path}")
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _profile_specs(repo_root: Path, target_repository_sha: str) -> list[dict[str, Any]]:
    if len(target_repository_sha) != 40 or any(ch not in "0123456789abcdef" for ch in target_repository_sha):
        raise O4HInputError("target_repository_sha must be lowercase 40-hex")
    canonical_target = _git(repo_root, "rev-parse", f"{target_repository_sha}^{{commit}}")
    if canonical_target != target_repository_sha:
        raise O4HInputError("target_repository_sha is unavailable or drifted")
    blob_sha = _git(repo_root, "rev-parse", f"{target_repository_sha}:{PROFILE_PATH.as_posix()}")
    if blob_sha != EXPECTED_PROFILE_BLOB_SHA:
        raise O4HInputError(
            f"O4-H locator profile blob drifted: expected {EXPECTED_PROFILE_BLOB_SHA}, got {blob_sha}"
        )
    profile = _read_json(repo_root / PROFILE_PATH)
    if profile.get("schema_version") != 1:
        raise O4HInputError("unsupported local-context profile schema")
    profiles = profile.get("profiles")
    if not isinstance(profiles, dict):
        raise O4HInputError("local-context profiles object missing")
    skill_profiles = profiles.get(PROFILE_SKILL)
    if not isinstance(skill_profiles, dict):
        raise O4HInputError("plugin-impact-scope context profiles missing")
    raw_specs = skill_profiles.get(SOURCE_CASE_ID)
    if not isinstance(raw_specs, list) or not raw_specs:
        raise O4HInputError("frozen Voyage held-out locator profile missing")
    specs: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_specs):
        if not isinstance(raw, dict):
            raise O4HInputError(f"locator spec {index} must be an object")
        if raw.get("ref") != SOURCE_REPOSITORY_SHA:
            raise O4HInputError(f"locator spec {index} source ref drifted")
        if raw.get("mode") != "needle_windows":
            raise O4HInputError(f"locator spec {index} must remain needle_windows")
        path = raw.get("path")
        needles = raw.get("needles")
        radius = raw.get("radius")
        if not isinstance(path, str) or not path:
            raise O4HInputError(f"locator spec {index} path invalid")
        if not isinstance(needles, list) or not needles or any(not isinstance(x, str) or not x for x in needles):
            raise O4HInputError(f"locator spec {index} needles invalid")
        if not isinstance(radius, int) or isinstance(radius, bool) or radius < 0 or radius > 40:
            raise O4HInputError(f"locator spec {index} radius invalid")
        specs.append(dict(raw))
    paths = tuple(spec["path"] for spec in specs)
    if paths != EXPECTED_PROFILE_PATHS:
        raise O4HInputError("frozen Voyage locator path order/set drifted")
    return specs


def merged_line_ranges(lines: list[str], needles: list[str], radius: int) -> list[tuple[int, int]]:
    """Return sorted merged zero-based inclusive ranges for all required needle matches."""
    selected: set[int] = set()
    for needle in needles:
        matches = [index for index, line in enumerate(lines) if needle in line]
        if not matches:
            raise O4HInputError(f"required frozen source needle not found: {needle!r}")
        for index in matches:
            selected.update(range(max(0, index - radius), min(len(lines), index + radius + 1)))
    if not selected:
        raise O4HInputError("locator produced no source lines")
    ordered = sorted(selected)
    ranges: list[tuple[int, int]] = []
    start = previous = ordered[0]
    for index in ordered[1:]:
        if index == previous + 1:
            previous = index
            continue
        ranges.append((start, previous))
        start = previous = index
    ranges.append((start, previous))
    return ranges


def build_source_blocks(repo_root: Path, target_repository_sha: str) -> list[dict[str, Any]]:
    specs = _profile_specs(repo_root, target_repository_sha)
    source_canonical = _git(repo_root, "rev-parse", f"{SOURCE_REPOSITORY_SHA}^{{commit}}")
    if source_canonical != SOURCE_REPOSITORY_SHA:
        raise O4HInputError("frozen Voyage source commit is unavailable or drifted")
    blocks: list[dict[str, Any]] = []
    for spec in specs:
        path = str(spec["path"])
        raw = _git(repo_root, "show", f"{SOURCE_REPOSITORY_SHA}:{path}")
        lines = raw.splitlines()
        if not lines:
            raise O4HInputError(f"frozen source is empty: {path}")
        for start, end in merged_line_ranges(lines, list(spec["needles"]), int(spec["radius"])):
            blocks.append(
                {
                    "path": path,
                    "source_sha": SOURCE_REPOSITORY_SHA,
                    "start_line": start + 1,
                    "content": "\n".join(lines[start : end + 1]),
                }
            )
    if not blocks:
        raise O4HInputError("frozen Voyage locator produced no evidence blocks")
    return blocks


def build_inputs(repo_root: Path | str, target_repository_sha: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    root = Path(repo_root).resolve()
    source_blocks = build_source_blocks(root, target_repository_sha)
    plan = route_task(
        {
            "schema_version": 1,
            "task_id": "o4h-voyage-visible-refresh-scout-v1",
            "scope": SCOPE,
            "task_kind": "impact_analysis",
            "intent": "Build frozen retrospective Voyage visible-refresh Scout benchmark evidence.",
            "mutation_requested": False,
            "device_truth_requested": False,
        }
    )
    snapshot = resolve_authority(
        SCOPE,
        SOURCE_REPOSITORY_SHA,
        [
            {
                "kind": "declared_by",
                "value": "docs/REPO_PROJECT_CATALOG.md",
                "status": "OBSERVED",
                "source_sha": SOURCE_REPOSITORY_SHA,
            },
            {
                "kind": "evidence",
                "value": "voyage-token-check/DESIGN_STATUS.md",
                "status": "OBSERVED",
                "source_sha": SOURCE_REPOSITORY_SHA,
            },
        ],
    )
    if snapshot["overall_status"] != "RESOLVED" or snapshot["blockers"]:
        raise O4HInputError("Voyage frozen authority snapshot did not resolve exactly")
    evidence = build_evidence_package(plan, snapshot, source_blocks)
    validate_evidence_package(evidence)
    if evidence["scope"] != SCOPE or evidence["target_repository_sha"] != SOURCE_REPOSITORY_SHA:
        raise O4HInputError("generated O4-H EvidencePackage identity drifted")
    if evidence["blockers"]:
        raise O4HInputError("generated O4-H EvidencePackage unexpectedly contains blockers")

    known_refs = [str(item["source_ref"]["ref"]) for item in evidence["sources"]]
    expected_labels: list[dict[str, Any]] = []
    for item in evidence["sources"]:
        source_id = str(item["source_id"]).lower()
        ref = str(item["source_ref"]["ref"])
        expected_labels.append(
            {"label_id": f"src-{source_id}", "kind": "source_ref", "ref": ref}
        )
        expected_labels.append(
            {
                "label_id": f"auth-{source_id}",
                "kind": "authority",
                "authority_class": str(item["authority_class"]),
                "refs": [ref],
            }
        )

    case: dict[str, Any] = {
        "schema_version": 1,
        "case_id": CASE_ID,
        "case_version": CASE_VERSION,
        "source_case_id": SOURCE_CASE_ID,
        "source_case_kind": "PROSPECTIVE_HELD_OUT_CONSUMED",
        "retrospective_only": True,
        "role": "scout",
        "role_contract_id": ROLE_CONTRACT_ID,
        "scoring_policy_id": SCORING_POLICY_ID,
        "scoring_policy_sha256": SCORING_POLICY_SHA256,
        "repository_snapshots": [{"name": "main", "sha": SOURCE_REPOSITORY_SHA}],
        "upstream_artifact_sha256": [],
        "known_source_refs": known_refs,
        "expected_labels": expected_labels,
        "evidence_sha256": evidence_package_sha256(evidence),
        "fixture_sha256": "0" * 64,
    }
    case["fixture_sha256"] = fixture_sha256(case)
    case = validate_case(case)
    if set(case["known_source_refs"]) != set(known_refs):
        raise O4HInputError("generated O4-H fixture known refs drifted")

    metadata = {
        "schema_version": 1,
        "case_id": CASE_ID,
        "source_case_id": SOURCE_CASE_ID,
        "source_repository_sha": SOURCE_REPOSITORY_SHA,
        "target_repository_sha": target_repository_sha,
        "profile_path": PROFILE_PATH.as_posix(),
        "profile_blob_sha": EXPECTED_PROFILE_BLOB_SHA,
        "source_block_count": len(source_blocks),
        "evidence_source_count": len(evidence["sources"]),
        "fixture_sha256": case["fixture_sha256"],
        "evidence_sha256": case["evidence_sha256"],
        "labels_derived_from_evidence_only": True,
        "prior_model_output_used": False,
    }
    return case, evidence, metadata


def write_inputs(repo_root: Path | str, target_repository_sha: str, output_dir: Path | str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    case, evidence, metadata = build_inputs(repo_root, target_repository_sha)
    output = Path(output_dir)
    _write_json(output / "case.json", case)
    _write_json(output / "evidence.json", evidence)
    _write_json(output / "input-metadata.json", metadata)
    return case, evidence, metadata


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build frozen O4-H Voyage Scout benchmark inputs.")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--target-sha", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)
    try:
        case, evidence, metadata = write_inputs(args.repo_root, args.target_sha, args.output_dir)
        print("O4H_CASE_SHA256:" + case["fixture_sha256"])
        print("O4H_EVIDENCE_SHA256:" + case["evidence_sha256"])
        print("O4H_EVIDENCE_SOURCE_COUNT:" + str(metadata["evidence_source_count"]))
        print("O4H_PRIOR_MODEL_OUTPUT_USED:false")
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

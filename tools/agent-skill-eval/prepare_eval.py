#!/usr/bin/env python3
"""Deterministic preparation helpers for repository Agent Skill live evals.

This module performs no model/network calls. It normalizes source-controlled eval
fixtures, computes execution provenance, and proves target-skill isolation in
prepared workspaces.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
ALLOWED_SKILLS = frozenset({"plugin-authority-scan", "plugin-impact-scope"})
ALLOWED_MODELS = frozenset({"claude-haiku-4.5", "claude-sonnet-4.6", "gpt-5.4"})
ALLOWED_EVAL_KINDS = frozenset({"output", "trigger"})
SKILL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAX_CASES_PER_FIXTURE = 64
SECOND_SCOPE_FIXTURE = "second_scope_candidate_evals.json"
SECOND_SCOPE_STATUS = "CANDIDATE_ONLY_NOT_PROMOTED"


class EvalPreparationError(ValueError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def sha256_skill_tree(skill_dir: Path) -> str:
    if not skill_dir.is_dir():
        raise EvalPreparationError(f"missing skill directory: {skill_dir}")
    records: list[bytes] = []
    for path in sorted(p for p in skill_dir.rglob("*") if p.is_file()):
        if path.is_symlink():
            raise EvalPreparationError(f"symlink not allowed in skill tree: {path}")
        rel = path.relative_to(skill_dir).as_posix().encode("utf-8")
        records.append(rel + b"\0" + hashlib.sha256(path.read_bytes()).digest())
    if not records:
        raise EvalPreparationError("skill tree has no files")
    return sha256_bytes(b"\n".join(records))


def validate_skill_name(skill: str) -> None:
    if skill not in ALLOWED_SKILLS:
        raise EvalPreparationError(f"unallowlisted skill: {skill}")
    if not SKILL_RE.fullmatch(skill) or "/" in skill or ".." in skill:
        raise EvalPreparationError(f"invalid skill name: {skill}")


def validate_model(model: str) -> None:
    if model not in ALLOWED_MODELS:
        raise EvalPreparationError(f"unallowlisted model: {model}")


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise EvalPreparationError(f"cannot read JSON fixture {path}: {exc}") from exc


def _normalize_output_fixture(payload: Any, skill: str) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise EvalPreparationError("output fixture must be an object")
    declared = payload.get("skill_name", payload.get("skill"))
    if declared is not None and declared != skill:
        raise EvalPreparationError(f"fixture skill mismatch: {declared!r} != {skill!r}")
    raw_cases = payload.get("evals")
    if raw_cases is None:
        raw_cases = payload.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise EvalPreparationError("output fixture must contain non-empty evals[] or cases[]")
    if len(raw_cases) > MAX_CASES_PER_FIXTURE:
        raise EvalPreparationError("output fixture exceeds bounded case limit")

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, raw in enumerate(raw_cases, start=1):
        if not isinstance(raw, dict):
            raise EvalPreparationError(f"case {index} must be an object")
        case_id = str(raw.get("id", "")).strip()
        prompt = raw.get("prompt")
        if not case_id:
            raise EvalPreparationError(f"case {index} missing id")
        if case_id in seen:
            raise EvalPreparationError(f"duplicate case id: {case_id}")
        if not isinstance(prompt, str) or not prompt.strip():
            raise EvalPreparationError(f"case {case_id} missing non-empty prompt")
        seen.add(case_id)
        assertions = raw.get("assertions", [])
        if assertions is None:
            assertions = []
        if not isinstance(assertions, list) or any(not isinstance(x, str) for x in assertions):
            raise EvalPreparationError(f"case {case_id} assertions must be strings")
        out.append(
            {
                "id": case_id,
                "prompt": prompt,
                "expected_output": raw.get("expected_output"),
                "assertions": assertions,
                "expected_trigger": None,
            }
        )
    return out


def _normalize_trigger_fixture(payload: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if isinstance(payload, list):
        if len(payload) > MAX_CASES_PER_FIXTURE:
            raise EvalPreparationError("trigger fixture exceeds bounded case limit")
        for index, raw in enumerate(payload, start=1):
            if not isinstance(raw, dict):
                raise EvalPreparationError(f"trigger case {index} must be an object")
            query = raw.get("query")
            expected = raw.get("should_trigger")
            if not isinstance(query, str) or not query.strip():
                raise EvalPreparationError(f"trigger case {index} missing query")
            if not isinstance(expected, bool):
                raise EvalPreparationError(f"trigger case {index} missing boolean should_trigger")
            out.append(
                {
                    "id": f"trigger-{index:03d}",
                    "prompt": query,
                    "expected_output": raw.get("reason"),
                    "assertions": [],
                    "expected_trigger": expected,
                }
            )
        return out

    if not isinstance(payload, dict):
        raise EvalPreparationError("trigger fixture must be an object or array")
    positive = payload.get("positive", [])
    negative = payload.get("negative_near_miss", [])
    if not isinstance(positive, list) or not isinstance(negative, list):
        raise EvalPreparationError("trigger positive/negative_near_miss must be arrays")
    if len(positive) + len(negative) > MAX_CASES_PER_FIXTURE:
        raise EvalPreparationError("trigger fixture exceeds bounded case limit")
    for label, values, expected in (("positive", positive, True), ("negative", negative, False)):
        for index, query in enumerate(values, start=1):
            if not isinstance(query, str) or not query.strip():
                raise EvalPreparationError(f"{label} trigger {index} must be non-empty text")
            out.append(
                {
                    "id": f"{label}-{index:03d}",
                    "prompt": query,
                    "expected_output": None,
                    "assertions": [],
                    "expected_trigger": expected,
                }
            )
    if not out:
        raise EvalPreparationError("trigger fixture has no cases")
    return out


def load_cases(repo_root: Path, skill: str, eval_kind: str) -> tuple[Path, list[dict[str, Any]]]:
    validate_skill_name(skill)
    if eval_kind not in ALLOWED_EVAL_KINDS:
        raise EvalPreparationError(f"unsupported eval kind: {eval_kind}")
    fixture = repo_root / ".agents" / "skills" / skill / "evals" / (
        "evals.json" if eval_kind == "output" else "trigger_queries.json"
    )
    payload = _read_json(fixture)
    cases = (
        _normalize_output_fixture(payload, skill)
        if eval_kind == "output"
        else _normalize_trigger_fixture(payload)
    )
    return fixture, cases


def _load_second_scope_candidate(
    repo_root: Path,
    skill: str,
) -> tuple[Path, list[dict[str, Any]], dict[str, Any]]:
    fixture = repo_root / ".agents" / "skills" / skill / "evals" / SECOND_SCOPE_FIXTURE
    payload = _read_json(fixture)
    if not isinstance(payload, dict):
        raise EvalPreparationError("second-scope candidate fixture must be an object")
    if payload.get("status") != SECOND_SCOPE_STATUS:
        raise EvalPreparationError("second-scope candidate fixture is not candidate-only")
    declared = payload.get("skill_name", payload.get("skill"))
    if declared != skill:
        raise EvalPreparationError(f"candidate fixture skill mismatch: {declared!r} != {skill!r}")
    candidate_scope = payload.get("candidate_scope")
    if not isinstance(candidate_scope, str) or not candidate_scope.strip():
        raise EvalPreparationError("candidate_scope missing")
    frozen = payload.get("frozen_source_snapshot")
    if not isinstance(frozen, dict) or not frozen:
        raise EvalPreparationError("candidate frozen_source_snapshot missing")
    normalized_frozen: dict[str, str] = {}
    for label, value in frozen.items():
        if not isinstance(label, str) or not label.strip():
            raise EvalPreparationError("candidate frozen source label invalid")
        if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
            raise EvalPreparationError(f"candidate frozen source SHA invalid: {label}")
        normalized_frozen[label] = value
    cases = _normalize_output_fixture(payload, skill)
    meta = {
        "fixture_class": "second_scope_candidate",
        "candidate_scope": candidate_scope.strip(),
        "candidate_frozen_source_snapshot": normalized_frozen,
    }
    return fixture, cases, meta


def select_case(cases: list[dict[str, Any]], case_id: str) -> dict[str, Any]:
    wanted = str(case_id).strip()
    matches = [case for case in cases if case["id"] == wanted]
    if len(matches) != 1:
        available = ",".join(case["id"] for case in cases)
        raise EvalPreparationError(f"unknown case id {wanted!r}; available={available}")
    return matches[0]


def build_matrix(
    repo_root: Path,
    skill: str,
    eval_kind: str,
    case_id: str,
    model: str,
    repository_sha: str,
) -> dict[str, Any]:
    validate_skill_name(skill)
    validate_model(model)
    if not repository_sha or not re.fullmatch(r"[0-9a-fA-F]{7,64}", repository_sha):
        raise EvalPreparationError("repository SHA is missing or malformed")
    skill_dir = repo_root / ".agents" / "skills" / skill
    if not (skill_dir / "SKILL.md").is_file():
        raise EvalPreparationError(f"missing SKILL.md for {skill}")

    fixture, cases = load_cases(repo_root, skill, eval_kind)
    fixture_meta: dict[str, Any] = {"fixture_class": "standard"}
    wanted = str(case_id).strip()
    matches = [case for case in cases if case["id"] == wanted]
    if len(matches) == 1:
        selected = matches[0]
    elif eval_kind == "output":
        candidate_fixture, candidate_cases, candidate_meta = _load_second_scope_candidate(
            repo_root,
            skill,
        )
        selected = select_case(candidate_cases, wanted)
        fixture = candidate_fixture
        fixture_meta = candidate_meta
    else:
        selected = select_case(cases, wanted)

    prompt_bytes = selected["prompt"].encode("utf-8")
    result = {
        "schema_version": SCHEMA_VERSION,
        "repository_sha": repository_sha.lower(),
        "skill": skill,
        "skill_sha256": sha256_skill_tree(skill_dir),
        "eval_kind": eval_kind,
        "fixture_path": fixture.relative_to(repo_root).as_posix(),
        "fixture_sha256": sha256_file(fixture),
        "fixture_class": fixture_meta["fixture_class"],
        "case_id": selected["id"],
        "prompt": selected["prompt"],
        "prompt_sha256": sha256_bytes(prompt_bytes),
        "expected_output": selected.get("expected_output"),
        "assertions": selected.get("assertions", []),
        "expected_trigger": selected.get("expected_trigger"),
        "requested_model": model,
        "modes": ["with_skill", "baseline_without_target_skill"],
    }
    if fixture_meta["fixture_class"] == "second_scope_candidate":
        result["candidate_scope"] = fixture_meta["candidate_scope"]
        result["candidate_frozen_source_snapshot"] = fixture_meta[
            "candidate_frozen_source_snapshot"
        ]
    return result


def prove_workspace(workspace_root: Path, skill: str, mode: str) -> dict[str, Any]:
    validate_skill_name(skill)
    canonical = workspace_root / ".agents" / "skills" / skill / "SKILL.md"
    quarantined = workspace_root / ".eval-quarantine" / skill / "SKILL.md"
    if mode == "with_skill":
        ok = canonical.is_file() and not quarantined.exists()
    elif mode == "baseline_without_target_skill":
        ok = (not canonical.exists()) and quarantined.is_file()
    else:
        raise EvalPreparationError(f"unsupported mode: {mode}")
    result = {
        "mode": mode,
        "skill": skill,
        "canonical_skill_present": canonical.is_file(),
        "quarantined_skill_present": quarantined.is_file(),
        "proof": "PASS" if ok else "FAIL",
    }
    if not ok:
        raise EvalPreparationError(f"workspace isolation proof failed: {result}")
    return result


def _write_json(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path is None:
        sys.stdout.write(text)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    matrix = sub.add_parser("matrix", help="normalize one bounded eval case")
    matrix.add_argument("--repo-root", default=".")
    matrix.add_argument("--skill", required=True)
    matrix.add_argument("--eval-kind", choices=sorted(ALLOWED_EVAL_KINDS), default="output")
    matrix.add_argument("--case-id", required=True)
    matrix.add_argument("--model", required=True)
    matrix.add_argument("--repository-sha", default=os.environ.get("GITHUB_SHA", ""))
    matrix.add_argument("--output")

    prove = sub.add_parser("prove", help="prove target skill presence/absence in one workspace")
    prove.add_argument("--workspace-root", required=True)
    prove.add_argument("--skill", required=True)
    prove.add_argument("--mode", choices=["with_skill", "baseline_without_target_skill"], required=True)
    prove.add_argument("--output")

    args = parser.parse_args(argv)
    try:
        if args.command == "matrix":
            payload = build_matrix(
                Path(args.repo_root).resolve(),
                args.skill,
                args.eval_kind,
                args.case_id,
                args.model,
                args.repository_sha,
            )
            _write_json(Path(args.output) if args.output else None, payload)
        else:
            payload = prove_workspace(Path(args.workspace_root).resolve(), args.skill, args.mode)
            _write_json(Path(args.output) if args.output else None, payload)
    except EvalPreparationError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

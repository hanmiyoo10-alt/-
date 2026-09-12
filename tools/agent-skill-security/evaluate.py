#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

SCANNER_PACKAGE = "cisco-ai-skill-scanner"
SCANNER_VERSION = "2.1.0"
UPSTREAM_TAG_COMMIT = "a24df340ca6056a6446a239f4a7b114b11c6073a"
POLICY = "balanced"
REPEATS = 3
MODES = {
    "CORE": [],
    "CORE_BEHAVIORAL": ["--use-behavioral"],
}
FORBIDDEN_ENV_VARS = (
    "SKILL_SCANNER_LLM_API_KEY",
    "AI_DEFENSE_API_KEY",
    "VIRUSTOTAL_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "AZURE_OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
)
FORBIDDEN_ANALYZER_TOKENS = ("llm", "meta", "aidefense", "ai_defense", "virus")
SEVERITY_RANK = {"SAFE": 0, "INFO": 1, "LOW": 2, "MEDIUM": 3, "HIGH": 4, "CRITICAL": 5}


class BenchmarkInvalid(RuntimeError):
    pass


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BenchmarkInvalid(f"JSON_READ_FAILED:{path}:{exc}") from exc
    if not isinstance(value, dict):
        raise BenchmarkInvalid(f"JSON_ROOT_NOT_OBJECT:{path}")
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_corpus(tool_root: Path) -> dict[str, Any]:
    corpus = _read_json(tool_root / "corpus.json")
    if corpus.get("schemaVersion") != 1:
        raise BenchmarkInvalid("CORPUS_SCHEMA_VERSION_MISMATCH")
    scanner = corpus.get("scanner")
    if not isinstance(scanner, dict):
        raise BenchmarkInvalid("CORPUS_SCANNER_CONTRACT_MISSING")
    expected = {
        "package": SCANNER_PACKAGE,
        "version": SCANNER_VERSION,
        "upstreamTagCommit": UPSTREAM_TAG_COMMIT,
        "policy": POLICY,
        "repeats": REPEATS,
    }
    for key, value in expected.items():
        if scanner.get(key) != value:
            raise BenchmarkInvalid(f"CORPUS_SCANNER_{key.upper()}_MISMATCH")
    fixtures = corpus.get("fixtures")
    if not isinstance(fixtures, list):
        raise BenchmarkInvalid("CORPUS_FIXTURES_NOT_LIST")
    return corpus


def discover_real_skills(repo_root: Path) -> list[dict[str, Any]]:
    skills_root = repo_root / ".agents" / "skills"
    if not skills_root.is_dir():
        raise BenchmarkInvalid("REAL_SKILLS_ROOT_MISSING")
    results: list[dict[str, Any]] = []
    for child in sorted(skills_root.iterdir(), key=lambda item: item.name):
        if child.is_dir() and (child / "SKILL.md").is_file():
            results.append(
                {
                    "id": f"REAL:{child.name}",
                    "kind": "benign",
                    "path": child,
                    "securityProperty": "current repository-owned Agent Skill",
                    "acceptableCategories": [],
                }
            )
    if not results:
        raise BenchmarkInvalid("REAL_SKILLS_NONE_DISCOVERED")
    return results


def _target_from_fixture(tool_root: Path, item: dict[str, Any]) -> dict[str, Any]:
    fixture_id = item.get("id")
    kind = item.get("kind")
    path_value = item.get("path")
    if not isinstance(fixture_id, str) or not isinstance(path_value, str):
        raise BenchmarkInvalid("CORPUS_FIXTURE_ID_OR_PATH_INVALID")
    if kind not in {"benign", "malicious"}:
        raise BenchmarkInvalid(f"CORPUS_FIXTURE_KIND_INVALID:{fixture_id}")
    target_path = (tool_root / path_value).resolve()
    try:
        target_path.relative_to(tool_root.resolve())
    except ValueError as exc:
        raise BenchmarkInvalid(f"CORPUS_FIXTURE_PATH_ESCAPES_ROOT:{fixture_id}") from exc
    if not target_path.is_dir() or not (target_path / "SKILL.md").is_file():
        raise BenchmarkInvalid(f"CORPUS_FIXTURE_MISSING:{fixture_id}")
    acceptable = item.get("acceptableCategories", [])
    if not isinstance(acceptable, list) or not all(isinstance(value, str) for value in acceptable):
        raise BenchmarkInvalid(f"CORPUS_ACCEPTABLE_CATEGORIES_INVALID:{fixture_id}")
    return {
        "id": fixture_id,
        "kind": kind,
        "path": target_path,
        "securityProperty": item.get("securityProperty", ""),
        "acceptableCategories": acceptable,
    }


def _normalize_relative_file_path(file_path: str, target_path: Path) -> str:
    if not isinstance(file_path, str) or not file_path.strip():
        raise BenchmarkInvalid("FINDING_FILE_PATH_INVALID")
    normalized = file_path.replace("\\", "/")
    candidate = Path(normalized)
    if candidate.is_absolute():
        try:
            candidate = candidate.resolve().relative_to(target_path.resolve())
        except ValueError as exc:
            raise BenchmarkInvalid(f"FINDING_PATH_OUTSIDE_TARGET:{file_path}") from exc
    text = candidate.as_posix()
    while text.startswith("./"):
        text = text[2:]
    if not text or text == ".":
        raise BenchmarkInvalid("FINDING_RELATIVE_PATH_EMPTY")
    return text


def normalize_findings(
    result: dict[str, Any],
    *,
    target_id: str,
    target_path: Path,
) -> list[tuple[str, str, str, str, str, int, str]]:
    findings = result.get("findings")
    if not isinstance(findings, list):
        raise BenchmarkInvalid(f"FINDINGS_NOT_LIST:{target_id}")
    normalized: list[tuple[str, str, str, str, str, int, str]] = []
    for index, finding in enumerate(findings):
        if not isinstance(finding, dict):
            raise BenchmarkInvalid(f"FINDING_NOT_OBJECT:{target_id}:{index}")
        rule_id = finding.get("rule_id")
        category = finding.get("category")
        severity = finding.get("severity")
        analyzer = finding.get("analyzer")
        if not all(isinstance(value, str) and value for value in (rule_id, category, severity, analyzer)):
            raise BenchmarkInvalid(f"FINDING_IDENTITY_FIELD_INVALID:{target_id}:{index}")
        severity = severity.upper()
        if severity not in SEVERITY_RANK:
            raise BenchmarkInvalid(f"FINDING_SEVERITY_INVALID:{target_id}:{index}:{severity}")
        line_number = finding.get("line_number")
        if line_number is None:
            stable_line = -1
        elif isinstance(line_number, int) and line_number >= 0:
            stable_line = line_number
        else:
            raise BenchmarkInvalid(f"FINDING_LINE_INVALID:{target_id}:{index}")
        normalized.append(
            (
                target_id,
                rule_id,
                category,
                severity,
                _normalize_relative_file_path(finding.get("file_path", ""), target_path),
                stable_line,
                analyzer,
            )
        )
    return sorted(normalized)


def _validate_analyzers(result: dict[str, Any], target_id: str) -> list[str]:
    analyzers = result.get("analyzers_used")
    if not isinstance(analyzers, list) or not all(isinstance(value, str) for value in analyzers):
        raise BenchmarkInvalid(f"ANALYZERS_USED_INVALID:{target_id}")
    for analyzer in analyzers:
        lowered = analyzer.lower()
        if any(token in lowered for token in FORBIDDEN_ANALYZER_TOKENS):
            raise BenchmarkInvalid(f"FORBIDDEN_ANALYZER_OBSERVED:{target_id}:{analyzer}")
    return analyzers


def _scan_once(
    *,
    scanner_executable: str,
    repo_root: Path,
    target: dict[str, Any],
    mode: str,
    repeat: int,
    raw_path: Path,
) -> dict[str, Any]:
    command = [
        scanner_executable,
        "scan",
        str(target["path"]),
        "--policy",
        POLICY,
        "--format",
        "json",
        "--output",
        str(raw_path),
        "--compact",
        *MODES[mode],
    ]
    child_env = os.environ.copy()
    for name in FORBIDDEN_ENV_VARS:
        child_env.pop(name, None)
    started = time.perf_counter()
    completed = subprocess.run(
        command,
        cwd=repo_root,
        env=child_env,
        text=True,
        capture_output=True,
        check=False,
    )
    duration_ms = round((time.perf_counter() - started) * 1000, 3)
    if completed.returncode != 0:
        raise BenchmarkInvalid(
            f"SCANNER_EXIT_NONZERO:{mode}:R{repeat}:{target['id']}:{completed.returncode}:"
            f"{completed.stderr.strip()[-500:]}"
        )
    if not raw_path.is_file():
        raise BenchmarkInvalid(f"SCANNER_JSON_MISSING:{mode}:R{repeat}:{target['id']}")
    result = _read_json(raw_path)
    _validate_analyzers(result, target["id"])
    normalized = normalize_findings(result, target_id=target["id"], target_path=Path(target["path"]))
    return {
        "normalized": normalized,
        "durationMs": duration_ms,
        "scannerExitStatus": completed.returncode,
    }


def _severity_at_least(severity: str, minimum: str) -> bool:
    return SEVERITY_RANK[severity] >= SEVERITY_RANK[minimum]


def _mode_disposition(
    *,
    mode: str,
    targets: list[dict[str, Any]],
    normalized_runs: list[list[tuple[str, str, str, str, str, int, str]]],
) -> dict[str, Any]:
    reasons: list[str] = []
    deterministic = all(run == normalized_runs[0] for run in normalized_runs[1:])
    if not deterministic:
        reasons.append("NONDETERMINISTIC_NORMALIZED_FINDINGS")
    benign_high_critical: dict[str, list[int]] = {}
    must_catch: dict[str, list[bool]] = {}
    for target in targets:
        target_id = target["id"]
        per_repeat = [[finding for finding in run if finding[0] == target_id] for run in normalized_runs]
        if target["kind"] == "benign":
            counts = [
                sum(1 for finding in findings if _severity_at_least(finding[3], "HIGH"))
                for findings in per_repeat
            ]
            benign_high_critical[target_id] = counts
            if any(count > 0 for count in counts):
                reasons.append(f"BENIGN_HIGH_OR_CRITICAL:{target_id}")
        else:
            accepted_categories = set(target["acceptableCategories"])
            coverage = []
            for findings in per_repeat:
                relevant = any(
                    _severity_at_least(finding[3], "HIGH") and finding[2] in accepted_categories
                    for finding in findings
                )
                coverage.append(relevant)
            must_catch[target_id] = coverage
            if not all(coverage):
                reasons.append(f"MUST_CATCH_MISSED:{target_id}")
    disposition = "HIGH_GATE_ELIGIBLE" if not reasons else "NOT_ELIGIBLE"
    return {
        "mode": mode,
        "disposition": disposition,
        "reasonCodes": sorted(set(reasons)),
        "normalizedDeterministic": deterministic,
        "benignHighCriticalByRepeat": benign_high_critical,
        "mustCatchHighCriticalRelevantByRepeat": must_catch,
        "normalizedFindingCountByRepeat": [len(run) for run in normalized_runs],
    }


def _write_markdown(summary: dict[str, Any], path: Path) -> None:
    lines = [
        "# Agent Skill Security Benchmark",
        "",
        f"- Scanner: `{summary['scanner']['package']}=={summary['scanner']['version']}`",
        f"- Upstream tag commit: `{summary['scanner']['upstreamTagCommit']}`",
        f"- Repository SHA: `{summary['repository']['sha']}`",
        f"- Dependency manifest SHA-256: `{summary['environment']['dependencyManifestSha256']}`",
        f"- Install duration: `{summary['environment']['installDurationMs']} ms`",
        f"- Promotion blocker: `{summary['promotionBlocker']}`",
        "",
        "## Mode dispositions",
        "",
    ]
    for mode_name in sorted(summary["modes"]):
        mode = summary["modes"][mode_name]
        lines.append(
            f"- `{mode_name}`: **{mode['disposition']}** "
            f"(deterministic={str(mode['normalizedDeterministic']).lower()})"
        )
        for reason in mode["reasonCodes"]:
            lines.append(f"  - `{reason}`")
    lines.extend(
        [
            "",
            "> This benchmark proves only the declared repository corpus contract. "
            "It is not a general skill-security, recall, or zero-day guarantee.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchmark Cisco Agent Skill scanner against the repository corpus")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--dependency-manifest", required=True)
    parser.add_argument("--install-duration-ms", type=float, required=True)
    args = parser.parse_args(argv)
    repo_root = Path(args.repo_root).resolve()
    tool_root = (repo_root / "tools" / "agent-skill-security").resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    dependency_manifest = Path(args.dependency_manifest).resolve()

    present_secrets = sorted(name for name in FORBIDDEN_ENV_VARS if os.environ.get(name))
    if present_secrets:
        failure = {
            "schemaVersion": 1,
            "result": "BENCHMARK_INVALID",
            "reasonCodes": [f"FORBIDDEN_ENV_PRESENT:{name}" for name in present_secrets],
        }
        (output_dir / "summary.json").write_text(
            json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        return 2

    try:
        corpus = _load_corpus(tool_root)
        if not dependency_manifest.is_file():
            raise BenchmarkInvalid("DEPENDENCY_MANIFEST_MISSING")
        installed_version = importlib.metadata.version(SCANNER_PACKAGE)
        if installed_version != SCANNER_VERSION:
            raise BenchmarkInvalid(
                f"SCANNER_VERSION_MISMATCH:expected={SCANNER_VERSION}:actual={installed_version}"
            )
        scanner_executable = shutil.which("skill-scanner")
        if not scanner_executable:
            raise BenchmarkInvalid("SCANNER_EXECUTABLE_MISSING")
        synthetic_targets = [_target_from_fixture(tool_root, item) for item in corpus["fixtures"]]
        real_targets = discover_real_skills(repo_root)
        targets = synthetic_targets + real_targets
        repository_sha = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()
        if len(repository_sha) != 40:
            raise BenchmarkInvalid("REPOSITORY_SHA_INVALID")

        mode_summaries: dict[str, Any] = {}
        raw_durations: dict[str, list[dict[str, Any]]] = {}
        for mode in MODES:
            normalized_runs: list[list[tuple[str, str, str, str, str, int, str]]] = []
            mode_durations: list[dict[str, Any]] = []
            for repeat in range(1, REPEATS + 1):
                repeat_findings: list[tuple[str, str, str, str, str, int, str]] = []
                for target in targets:
                    safe_target = target["id"].replace(":", "__")
                    raw_path = output_dir / "raw" / mode / f"repeat-{repeat}" / f"{safe_target}.json"
                    raw_path.parent.mkdir(parents=True, exist_ok=True)
                    observation = _scan_once(
                        scanner_executable=scanner_executable,
                        repo_root=repo_root,
                        target=target,
                        mode=mode,
                        repeat=repeat,
                        raw_path=raw_path,
                    )
                    repeat_findings.extend(observation["normalized"])
                    mode_durations.append(
                        {
                            "repeat": repeat,
                            "targetId": target["id"],
                            "durationMs": observation["durationMs"],
                            "scannerExitStatus": observation["scannerExitStatus"],
                        }
                    )
                normalized_runs.append(sorted(repeat_findings))
            mode_summaries[mode] = _mode_disposition(
                mode=mode, targets=targets, normalized_runs=normalized_runs
            )
            raw_durations[mode] = mode_durations

        summary = {
            "schemaVersion": 1,
            "result": "COMPLETE",
            "scanner": {
                "package": SCANNER_PACKAGE,
                "version": installed_version,
                "upstreamTagCommit": UPSTREAM_TAG_COMMIT,
                "policy": POLICY,
                "repeats": REPEATS,
            },
            "repository": {
                "sha": repository_sha,
                "realSkills": [target["id"] for target in real_targets],
            },
            "environment": {
                "python": platform.python_version(),
                "implementation": platform.python_implementation(),
                "platform": platform.platform(),
                "dependencyManifestSha256": _sha256(dependency_manifest),
                "dependencyLockRepositoryOwned": False,
                "installDurationMs": args.install_duration_ms,
            },
            "promotionBlocker": "DEPENDENCY_LOCK_NOT_REPOSITORY_OWNED",
            "modes": mode_summaries,
            "scanObservations": raw_durations,
            "scopeNonClaim": (
                "Local corpus evidence only; no general recall, zero-day, or overall skill-security guarantee."
            ),
        }
        (output_dir / "summary.json").write_text(
            json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        _write_markdown(summary, output_dir / "summary.md")
        return 0
    except (BenchmarkInvalid, importlib.metadata.PackageNotFoundError, subprocess.SubprocessError) as exc:
        failure = {"schemaVersion": 1, "result": "BENCHMARK_INVALID", "reasonCodes": [str(exc)]}
        (output_dir / "summary.json").write_text(
            json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        (output_dir / "summary.md").write_text(
            "# Agent Skill Security Benchmark\n\n"
            f"- Result: **BENCHMARK_INVALID**\n- Reason: `{exc}`\n",
            encoding="utf-8",
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

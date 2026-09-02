#!/usr/bin/env python3
"""Run the frozen O2-D retrospective Scout -> Mapper -> Critic -> Synthesizer sequence."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from authority import resolve_authority
from canonical import canonical_sha256
from evidence import build_evidence_package, evidence_package_sha256
from roles.critic import build_critic_prompt, critic_response_schema
from roles.mapper import build_mapper_prompt, mapper_response_schema
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence
from roles.synthesizer import build_synthesizer_prompt, synthesizer_response_schema
from router import route_task
from runtime.generation import scout_generation, scout_model_profile
from runtime.llama_cpp import start_server, stop_server, verify_file_sha256
from runtime.local_server import post_chat_completion, wait_for_health
from runtime.receipt import build_scout_execution_result, role_execution_receipt_sha256
from runtime.semantic_role_receipt import (
    build_semantic_role_execution_result,
    semantic_role_execution_receipt_sha256,
)

MODE = "o2d_sequential_retrospective_mechanical"
SCOPE = "plugin:usage-dashboard"
GUIDELINES_PATH = "docs/USAGE_DASHBOARD_GUIDELINES.md"
MANIFEST_PATH = "plugins/usage-dashboard/runtime/product-manifest.json"
ARTIFACT_PATH = "plugins/usage-dashboard/latest.js"
RELEASE_SPEC_DIR = ".github/usage-dashboard/releases"
RELEASE_BRANCH = "release-usage-dashboard"
ROLE_ORDER = ("scout", "mapper", "critic", "synthesizer")
DIRECT_DEPENDENCIES = {
    "scout": (),
    "mapper": ("scout",),
    "critic": ("mapper",),
    "synthesizer": ("mapper", "critic"),
}
EXPECTED_ROLE_STAGES = [
    {"stage_id": role, "role_id": role, "depends_on": list(DIRECT_DEPENDENCIES[role])}
    for role in ROLE_ORDER
]


class SequentialPilotError(ValueError):
    pass


def _git(repo_root: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo_root), *args],
            text=True,
            stderr=subprocess.STDOUT,
        ).strip()
    except subprocess.CalledProcessError as exc:
        raise SequentialPilotError(
            f"git {' '.join(args)} failed for {repo_root}: {exc.output.strip()}"
        ) from exc


def _bounded_lines(path: Path, start_line: int, end_line: int) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise SequentialPilotError(f"cannot read evidence file {path}: {exc}") from exc
    if start_line < 1 or end_line < start_line or end_line > len(lines):
        raise SequentialPilotError(f"invalid evidence line range for {path}")
    return "\n".join(lines[start_line - 1 : end_line]) + "\n"


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def validate_execution_plan(plan: dict[str, Any]) -> None:
    if plan.get("execution_class") != "standard":
        raise SequentialPilotError("O2-D must resolve to standard execution class")
    if plan.get("role_stages") != EXPECTED_ROLE_STAGES:
        raise SequentialPilotError(
            "O2-D router role dependency plan does not match frozen sequential topology"
        )


def dependencies_completed(role: str, role_summaries: dict[str, dict[str, Any]]) -> bool:
    if role not in DIRECT_DEPENDENCIES:
        raise SequentialPilotError(f"unknown O2-D role: {role}")
    return all(
        role_summaries.get(dep, {}).get("execution_status") == "COMPLETED"
        for dep in DIRECT_DEPENDENCIES[role]
    )


def blocked_dependency_summary(role: str) -> dict[str, Any]:
    return {
        "role": role,
        "execution_status": "BLOCKED_DEPENDENCY",
        "finish_reason": "NOT_CALLED",
        "model_call_count": 0,
        "hosted_ai_call_count": 0,
        "role_artifact_present": False,
        "role_artifact_sha256": "NONE",
        "receipt_present": False,
    }


def build_sequential_control_inputs(
    harness_repo_root: Path,
    evidence_repo_root: Path,
    harness_repository_sha: str,
    evidence_repository_sha: str,
    release_repository_sha: str,
) -> dict[str, Any]:
    request_parent = _git(harness_repo_root, "rev-parse", "HEAD^")
    if request_parent != harness_repository_sha:
        raise SequentialPilotError(
            f"harness provenance mismatch: request parent={request_parent} harness={harness_repository_sha}"
        )
    evidence_head = _git(evidence_repo_root, "rev-parse", "HEAD")
    if evidence_head != evidence_repository_sha:
        raise SequentialPilotError(
            f"evidence checkout mismatch: HEAD={evidence_head} evidence={evidence_repository_sha}"
        )
    release_ref = _git(
        harness_repo_root,
        "rev-parse",
        "refs/remotes/origin/release-usage-dashboard^{commit}",
    )
    if release_ref != release_repository_sha:
        raise SequentialPilotError(
            f"release authority mismatch: fetched={release_ref} request={release_repository_sha}"
        )
    for required in (GUIDELINES_PATH, MANIFEST_PATH, ARTIFACT_PATH, RELEASE_SPEC_DIR):
        if not (evidence_repo_root / required).exists():
            raise SequentialPilotError(
                f"required frozen Usage Dashboard authority path missing: {required}"
            )

    task_request = {
        "schema_version": 1,
        "task_id": "o2d-sequential-retrospective-mechanical",
        "scope": SCOPE,
        "task_kind": "impact_analysis",
        "intent": (
            "Retrospectively exercise the frozen bounded Usage Dashboard evidence through "
            "Scout, Mapper, Critic, and Synthesizer without mutation or device truth."
        ),
        "mutation_requested": False,
        "device_truth_requested": False,
    }
    execution_plan = route_task(task_request)
    validate_execution_plan(execution_plan)

    authority_snapshot = resolve_authority(
        SCOPE,
        evidence_repository_sha,
        [
            {
                "kind": "release_branch",
                "value": RELEASE_BRANCH,
                "status": "OBSERVED",
                "source_sha": release_repository_sha,
            },
            {
                "kind": "manifest",
                "value": MANIFEST_PATH,
                "status": "OBSERVED",
                "source_sha": evidence_repository_sha,
            },
            {
                "kind": "artifact",
                "value": ARTIFACT_PATH,
                "status": "OBSERVED",
                "source_sha": evidence_repository_sha,
            },
            {
                "kind": "release_spec_dir",
                "value": RELEASE_SPEC_DIR,
                "status": "OBSERVED",
                "source_sha": evidence_repository_sha,
            },
        ],
    )
    if authority_snapshot["overall_status"] != "RESOLVED" or authority_snapshot["blockers"]:
        raise SequentialPilotError(
            "O2-D requires fully resolved deterministic Usage Dashboard authority"
        )

    evidence_package = build_evidence_package(
        execution_plan,
        authority_snapshot,
        [
            {
                "path": GUIDELINES_PATH,
                "source_sha": evidence_repository_sha,
                "start_line": 1,
                "content": _bounded_lines(
                    evidence_repo_root / GUIDELINES_PATH, 1, 12
                ),
            },
            {
                "path": MANIFEST_PATH,
                "source_sha": evidence_repository_sha,
                "start_line": 1,
                "content": _bounded_lines(
                    evidence_repo_root / MANIFEST_PATH, 1, 12
                ),
            },
        ],
    )
    if len(evidence_package["sources"]) != 2:
        raise SequentialPilotError(
            "O2-D evidence must contain exactly two bounded O2-A source blocks"
        )
    return {
        "task_request": task_request,
        "execution_plan": execution_plan,
        "authority_snapshot": authority_snapshot,
        "evidence_package": evidence_package,
    }


def _role_summary(
    role: str,
    result: dict[str, Any],
    finish_reason: str,
    *,
    receipt_sha256: str,
) -> dict[str, Any]:
    receipt = result["receipt"]
    return {
        "role": role,
        "execution_status": receipt["execution_status"],
        "finish_reason": finish_reason,
        "model_call_count": receipt["model_call_count"],
        "hosted_ai_call_count": receipt["hosted_ai_call_count"],
        "role_artifact_present": result["artifact"] is not None,
        "role_artifact_sha256": receipt["role_artifact_sha256"],
        "receipt_present": True,
        "receipt_sha256": receipt_sha256,
        "upstream_artifact_sha256": list(receipt.get("upstream_artifact_sha256", [])),
    }


def _persist_role(
    output_dir: Path,
    role: str,
    prompt: str,
    content: str,
    finish_reason: str,
    envelope: dict[str, Any],
    result: dict[str, Any],
) -> dict[str, Any]:
    role_dir = output_dir / "roles" / role
    role_dir.mkdir(parents=True, exist_ok=True)
    (role_dir / "prompt.txt").write_text(prompt, encoding="utf-8")
    (role_dir / "prompt-sha256.txt").write_text(_sha256_text(prompt) + "\n", encoding="utf-8")
    (role_dir / "response.txt").write_text(content.rstrip() + "\n", encoding="utf-8")
    (role_dir / "response-sha256.txt").write_text(_sha256_text(content) + "\n", encoding="utf-8")
    (role_dir / "finish-reason.txt").write_text(finish_reason + "\n", encoding="utf-8")
    _write_json(role_dir / "response-envelope.json", envelope)

    if role == "scout":
        receipt_name = "role-execution-receipt.json"
        receipt_sha = role_execution_receipt_sha256(result["receipt"])
    else:
        receipt_name = "semantic-role-execution-receipt.json"
        receipt_sha = semantic_role_execution_receipt_sha256(result["receipt"])
    _write_json(role_dir / receipt_name, result["receipt"])
    (role_dir / "receipt-sha256.txt").write_text(receipt_sha + "\n", encoding="utf-8")
    if result["artifact"] is not None:
        _write_json(role_dir / "role-artifact.json", result["artifact"])
    if result.get("error"):
        (role_dir / "validation-error.txt").write_text(
            str(result["error"]) + "\n", encoding="utf-8"
        )
    summary = _role_summary(role, result, finish_reason, receipt_sha256=receipt_sha)
    _write_json(role_dir / "summary.json", summary)
    return summary


def _mark_remaining_blocked(
    output_dir: Path,
    role_summaries: dict[str, dict[str, Any]],
    start_index: int,
) -> None:
    for role in ROLE_ORDER[start_index:]:
        if role in role_summaries:
            continue
        summary = blocked_dependency_summary(role)
        role_summaries[role] = summary
        _write_json(output_dir / "roles" / role / "summary.json", summary)


def _invoke(
    port: int,
    prompt: str,
    schema: dict[str, Any],
) -> tuple[str, str, dict[str, Any]]:
    return post_chat_completion(port, prompt, scout_generation(), schema)


def run_sequential_calls(
    *,
    port: int,
    output_dir: Path,
    evidence_package: dict[str, Any],
    runtime_version: str,
    invoke: Callable[
        [int, str, dict[str, Any]], tuple[str, str, dict[str, Any]]
    ] = _invoke,
) -> tuple[dict[str, dict[str, Any]], int]:
    role_summaries: dict[str, dict[str, Any]] = {}
    artifacts: dict[str, dict[str, Any]] = {}
    model_calls = 0

    scout_prompt = build_scout_prompt(evidence_package)
    content, finish, envelope = invoke(
        port, scout_prompt, scout_response_schema_for_evidence(evidence_package)
    )
    model_calls += 1
    result = build_scout_execution_result(
        content=content,
        finish_reason=finish,
        evidence_package=evidence_package,
        prompt=scout_prompt,
        runtime_version=runtime_version,
    )
    role_summaries["scout"] = _persist_role(
        output_dir, "scout", scout_prompt, content, finish, envelope, result
    )
    if result["artifact"] is None or role_summaries["scout"]["execution_status"] != "COMPLETED":
        _mark_remaining_blocked(output_dir, role_summaries, 1)
        return role_summaries, model_calls
    artifacts["scout"] = result["artifact"]

    if not dependencies_completed("mapper", role_summaries):
        raise SequentialPilotError("Mapper dependency gate disagrees with Scout completion")
    mapper_prompt = build_mapper_prompt(evidence_package, artifacts["scout"])
    content, finish, envelope = invoke(
        port, mapper_prompt, mapper_response_schema()
    )
    model_calls += 1
    result = build_semantic_role_execution_result(
        role="mapper",
        content=content,
        finish_reason=finish,
        evidence_package=evidence_package,
        prompt=mapper_prompt,
        upstream_artifacts=[artifacts["scout"]],
        runtime_version=runtime_version,
    )
    role_summaries["mapper"] = _persist_role(
        output_dir, "mapper", mapper_prompt, content, finish, envelope, result
    )
    if result["artifact"] is None or role_summaries["mapper"]["execution_status"] != "COMPLETED":
        _mark_remaining_blocked(output_dir, role_summaries, 2)
        return role_summaries, model_calls
    artifacts["mapper"] = result["artifact"]

    if not dependencies_completed("critic", role_summaries):
        raise SequentialPilotError("Critic dependency gate disagrees with Mapper completion")
    critic_prompt = build_critic_prompt(evidence_package, artifacts["mapper"])
    content, finish, envelope = invoke(
        port, critic_prompt, critic_response_schema()
    )
    model_calls += 1
    result = build_semantic_role_execution_result(
        role="critic",
        content=content,
        finish_reason=finish,
        evidence_package=evidence_package,
        prompt=critic_prompt,
        upstream_artifacts=[artifacts["mapper"]],
        runtime_version=runtime_version,
    )
    role_summaries["critic"] = _persist_role(
        output_dir, "critic", critic_prompt, content, finish, envelope, result
    )
    if result["artifact"] is None or role_summaries["critic"]["execution_status"] != "COMPLETED":
        _mark_remaining_blocked(output_dir, role_summaries, 3)
        return role_summaries, model_calls
    artifacts["critic"] = result["artifact"]

    if not dependencies_completed("synthesizer", role_summaries):
        raise SequentialPilotError(
            "Synthesizer direct dependency gate disagrees with Mapper/Critic completion"
        )
    synthesizer_upstream = [
        artifacts["scout"],
        artifacts["mapper"],
        artifacts["critic"],
    ]
    synth_prompt = build_synthesizer_prompt(
        evidence_package, synthesizer_upstream
    )
    content, finish, envelope = invoke(
        port, synth_prompt, synthesizer_response_schema()
    )
    model_calls += 1
    result = build_semantic_role_execution_result(
        role="synthesizer",
        content=content,
        finish_reason=finish,
        evidence_package=evidence_package,
        prompt=synth_prompt,
        upstream_artifacts=synthesizer_upstream,
        runtime_version=runtime_version,
    )
    role_summaries["synthesizer"] = _persist_role(
        output_dir, "synthesizer", synth_prompt, content, finish, envelope, result
    )
    return role_summaries, model_calls


def build_run_summary(
    *,
    harness_repository_sha: str,
    evidence_repository_sha: str,
    release_repository_sha: str,
    execution_plan: dict[str, Any],
    evidence_package: dict[str, Any],
    role_summaries: dict[str, dict[str, Any]],
    model_calls: int,
) -> dict[str, Any]:
    hosted_calls = sum(
        int(role_summaries.get(role, {}).get("hosted_ai_call_count", 0))
        for role in ROLE_ORDER
    )
    all_completed = all(
        role_summaries.get(role, {}).get("execution_status") == "COMPLETED"
        for role in ROLE_ORDER
    )
    final_sha = role_summaries.get("synthesizer", {}).get(
        "role_artifact_sha256", "NONE"
    )
    return {
        "schema_version": 1,
        "mode": MODE,
        "scope": SCOPE,
        "harness_repository_sha": harness_repository_sha,
        "evidence_repository_sha": evidence_repository_sha,
        "release_repository_sha": release_repository_sha,
        "execution_plan_sha256": canonical_sha256(execution_plan),
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "role_order": list(ROLE_ORDER),
        "direct_dependencies": {
            role: list(DIRECT_DEPENDENCIES[role]) for role in ROLE_ORDER
        },
        "roles": {role: role_summaries[role] for role in ROLE_ORDER},
        "total_model_call_count": model_calls,
        "total_hosted_ai_call_count": hosted_calls,
        "final_synthesizer_role_artifact_sha256": final_sha,
        "overall_execution_status": "COMPLETED" if all_completed else "FAILED_CLOSED",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--harness-repo-root", required=True)
    parser.add_argument("--evidence-repo-root", required=True)
    parser.add_argument("--harness-sha", required=True)
    parser.add_argument("--evidence-sha", required=True)
    parser.add_argument("--release-sha", required=True)
    parser.add_argument("--server-binary", required=True)
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--runtime-version-file", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--port", type=int, default=39131)
    args = parser.parse_args(argv)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    process = None
    try:
        profile = scout_model_profile()
        verify_file_sha256(Path(args.model_path), profile["sha256"])
        control = build_sequential_control_inputs(
            Path(args.harness_repo_root).resolve(),
            Path(args.evidence_repo_root).resolve(),
            args.harness_sha,
            args.evidence_sha,
            args.release_sha,
        )
        for key, value in control.items():
            _write_json(output_dir / f"{key.replace('_', '-')}.json", value)

        runtime_version = Path(args.runtime_version_file).read_text(
            encoding="utf-8"
        ).strip()
        if not runtime_version:
            raise SequentialPilotError("llama.cpp runtime version is empty")

        server_log_path = output_dir / "llama-server.log"
        with server_log_path.open("wb") as server_log:
            process = start_server(
                Path(args.server_binary),
                Path(args.model_path),
                scout_generation(),
                args.port,
                server_log,
            )
            try:
                wait_for_health(args.port, process)
                role_summaries, model_calls = run_sequential_calls(
                    port=args.port,
                    output_dir=output_dir,
                    evidence_package=control["evidence_package"],
                    runtime_version=runtime_version,
                )
            finally:
                stop_server(process)
                process = None

        summary = build_run_summary(
            harness_repository_sha=args.harness_sha,
            evidence_repository_sha=args.evidence_sha,
            release_repository_sha=args.release_sha,
            execution_plan=control["execution_plan"],
            evidence_package=control["evidence_package"],
            role_summaries=role_summaries,
            model_calls=model_calls,
        )
        _write_json(output_dir / "summary.json", summary)
        print("O2D_SEQUENTIAL_STATUS:" + summary["overall_execution_status"])
        print("O2D_MODEL_CALLS:" + str(summary["total_model_call_count"]))
        print("O2D_HOSTED_AI_CALLS:" + str(summary["total_hosted_ai_call_count"]))
        print(
            "O2D_FINAL_SYNTH_SHA:"
            + str(summary["final_synthesizer_role_artifact_sha256"])
        )
        return 0 if summary["overall_execution_status"] == "COMPLETED" else 3
    except Exception as exc:
        if process is not None:
            stop_server(process)
        _write_json(
            output_dir / "summary.json",
            {
                "schema_version": 1,
                "mode": MODE,
                "overall_execution_status": "FAILED_CLOSED",
                "error": str(exc),
            },
        )
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

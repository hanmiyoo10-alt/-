#!/usr/bin/env python3
"""Run the frozen O3-D Scout -> (Mapper || Critic v2) -> Synthesizer live retrospective."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from evidence import evidence_package_sha256, evidence_source_refs
from roles.critic_parallel import (
    build_parallel_critic_prompt,
    parallel_critic_response_schema,
)
from roles.mapper import build_mapper_prompt, mapper_response_schema
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence
from roles.synthesizer import build_synthesizer_prompt, synthesizer_response_schema
from runtime.budget_profile import runtime_budget_profile
from runtime.generation import scout_generation, scout_model_profile
from runtime.llama_cpp import (
    build_server_command,
    stop_server,
    verify_file_sha256,
)
from runtime.local_server import post_chat_completion, wait_for_health
from runtime.parallel_critic_receipt import build_parallel_critic_execution_result
from runtime.parallel_scheduler import (
    blocked_dependency_job,
    build_parallel_root_provenance,
    parallel_root_provenance_sha256,
)
from runtime.receipt import build_scout_execution_result
from runtime.run_sequential_pilot import (
    _persist_role,
    _write_json,
    blocked_dependency_summary,
    build_sequential_control_inputs,
)
from runtime.semantic_role_receipt import build_semantic_role_execution_result

MODE = "o3d_parallel_retrospective_live"
SCOPE = "plugin:usage-dashboard"
ROLE_ORDER = ("scout", "mapper", "critic", "synthesizer")
DIRECT_DEPENDENCIES = {
    "scout": (),
    "mapper": ("scout",),
    "critic": ("scout",),
    "synthesizer": ("mapper", "critic"),
}
SERVER_PARALLEL_SLOTS = 2
EXPECTED_EVIDENCE_SHA256 = "88f85dd31748e80184152605b6be1b1e8faf49d30e7f6349c603bef23d8b7730"
O2_FULL_MODEL_BASELINE_MS = 61_067
O2_MAPPER_CRITIC_BASELINE_MS = 37_387
MIN_OVERLAP_MS = 1_000


class ParallelPilotError(ValueError):
    pass


def _duration_ms(start_ns: int, end_ns: int) -> int:
    if end_ns < start_ns:
        raise ParallelPilotError("monotonic timing end precedes start")
    return (end_ns - start_ns) // 1_000_000


def build_parallel_server_command(
    server_binary: Path | str,
    model_path: Path | str,
    generation: dict[str, Any],
    port: int,
) -> list[str]:
    profile = runtime_budget_profile()
    if profile["max_concurrent_model_workers"] != SERVER_PARALLEL_SLOTS:
        raise ParallelPilotError("O3-D runtime budget no longer binds exactly two workers")
    command = build_server_command(server_binary, model_path, generation, port)
    if "--parallel" in command or "-np" in command:
        raise ParallelPilotError("base O2 llama-server command unexpectedly controls parallel slots")
    return [*command, "--parallel", str(SERVER_PARALLEL_SLOTS)]


def start_parallel_server(
    server_binary: Path | str,
    model_path: Path | str,
    generation: dict[str, Any],
    port: int,
    log_handle: Any,
) -> subprocess.Popen[Any]:
    command = build_parallel_server_command(
        server_binary,
        model_path,
        generation,
        port,
    )
    return subprocess.Popen(command, stdout=log_handle, stderr=subprocess.STDOUT)


def _invoke(
    port: int,
    prompt: str,
    schema: dict[str, Any],
) -> tuple[str, str, dict[str, Any]]:
    return post_chat_completion(port, prompt, scout_generation(), schema)


def timed_invoke(
    *,
    role: str,
    port: int,
    prompt: str,
    schema: dict[str, Any],
    invoke: Callable[[int, str, dict[str, Any]], tuple[str, str, dict[str, Any]]] = _invoke,
) -> dict[str, Any]:
    start_ns = time.monotonic_ns()
    content, finish, envelope = invoke(port, prompt, schema)
    end_ns = time.monotonic_ns()
    return {
        "role": role,
        "content": content,
        "finish_reason": finish,
        "envelope": envelope,
        "start_monotonic_ns": start_ns,
        "end_monotonic_ns": end_ns,
        "wall_clock_ms": _duration_ms(start_ns, end_ns),
    }


def concurrency_summary(
    mapper_timing: dict[str, Any],
    critic_timing: dict[str, Any],
) -> dict[str, Any]:
    mapper_start = int(mapper_timing["start_monotonic_ns"])
    mapper_end = int(mapper_timing["end_monotonic_ns"])
    critic_start = int(critic_timing["start_monotonic_ns"])
    critic_end = int(critic_timing["end_monotonic_ns"])
    mapper_wall = _duration_ms(mapper_start, mapper_end)
    critic_wall = _duration_ms(critic_start, critic_end)
    overlap_ns = max(0, min(mapper_end, critic_end) - max(mapper_start, critic_start))
    overlap_ms = overlap_ns // 1_000_000
    parallel_ms = _duration_ms(min(mapper_start, critic_start), max(mapper_end, critic_end))
    serial_ms = mapper_wall + critic_wall
    benefit_pass = serial_ms > 0 and parallel_ms * 10 <= serial_ms * 9
    overlap_pass = overlap_ms >= MIN_OVERLAP_MS
    return {
        "schema_version": 1,
        "server_parallel_slots": SERVER_PARALLEL_SLOTS,
        "mapper_wall_clock_ms": mapper_wall,
        "critic_wall_clock_ms": critic_wall,
        "serial_sibling_ms": serial_ms,
        "parallel_sibling_ms": parallel_ms,
        "overlap_ms": overlap_ms,
        "minimum_overlap_ms": MIN_OVERLAP_MS,
        "minimum_benefit_percent": 10,
        "overlap_pass": overlap_pass,
        "benefit_pass": benefit_pass,
        "acceptance_pass": overlap_pass and benefit_pass,
        "o2_descriptive_baseline": {
            "full_model_ms": O2_FULL_MODEL_BASELINE_MS,
            "mapper_critic_ms": O2_MAPPER_CRITIC_BASELINE_MS,
        },
    }


def grounding_summary(
    artifacts: dict[str, dict[str, Any]],
    evidence_package: dict[str, Any],
) -> dict[str, Any]:
    known_refs = evidence_source_refs(evidence_package)
    ref_bearing = 0
    grounded = 0
    failures: list[dict[str, Any]] = []
    for role in ROLE_ORDER:
        artifact = artifacts.get(role)
        if artifact is None:
            continue
        for family, records in artifact["records"].items():
            for index, record in enumerate(records):
                if "refs" not in record:
                    continue
                ref_bearing += 1
                refs = record["refs"]
                valid = (
                    isinstance(refs, list)
                    and bool(refs)
                    and all(isinstance(ref, str) and ref in known_refs for ref in refs)
                )
                if valid:
                    grounded += 1
                else:
                    failures.append(
                        {
                            "role": role,
                            "family": family,
                            "index": index,
                            "refs": refs,
                        }
                    )
    ratio_bps = 0 if ref_bearing == 0 else grounded * 10_000 // ref_bearing
    return {
        "schema_version": 1,
        "ref_bearing_record_count": ref_bearing,
        "grounded_ref_bearing_record_count": grounded,
        "grounding_ratio_basis_points": ratio_bps,
        "acceptance_pass": ref_bearing > 0 and grounded == ref_bearing and ratio_bps == 10_000,
        "failures": failures,
    }


def _persist_timing(output_dir: Path, timing: dict[str, Any]) -> None:
    _write_json(
        output_dir / "roles" / str(timing["role"]) / "timing.json",
        {
            "start_monotonic_ns": timing["start_monotonic_ns"],
            "end_monotonic_ns": timing["end_monotonic_ns"],
            "wall_clock_ms": timing["wall_clock_ms"],
        },
    )


def _block_role(
    output_dir: Path,
    role_summaries: dict[str, dict[str, Any]],
    role: str,
) -> None:
    summary = blocked_dependency_summary(role)
    role_summaries[role] = summary
    _write_json(output_dir / "roles" / role / "summary.json", summary)


def run_parallel_calls(
    *,
    port: int,
    output_dir: Path,
    evidence_package: dict[str, Any],
    runtime_version: str,
    invoke: Callable[[int, str, dict[str, Any]], tuple[str, str, dict[str, Any]]] = _invoke,
) -> tuple[
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
    int,
]:
    role_summaries: dict[str, dict[str, Any]] = {}
    artifacts: dict[str, dict[str, Any]] = {}
    timings: dict[str, dict[str, Any]] = {}
    model_calls = 0

    scout_prompt = build_scout_prompt(evidence_package)
    scout_timing = timed_invoke(
        role="scout",
        port=port,
        prompt=scout_prompt,
        schema=scout_response_schema_for_evidence(evidence_package),
        invoke=invoke,
    )
    model_calls += 1
    timings["scout"] = scout_timing
    _persist_timing(output_dir, scout_timing)
    scout_result = build_scout_execution_result(
        content=scout_timing["content"],
        finish_reason=scout_timing["finish_reason"],
        evidence_package=evidence_package,
        prompt=scout_prompt,
        runtime_version=runtime_version,
    )
    role_summaries["scout"] = _persist_role(
        output_dir,
        "scout",
        scout_prompt,
        scout_timing["content"],
        scout_timing["finish_reason"],
        scout_timing["envelope"],
        scout_result,
    )
    if (
        scout_result["artifact"] is None
        or role_summaries["scout"]["execution_status"] != "COMPLETED"
    ):
        for role in ("mapper", "critic", "synthesizer"):
            _block_role(output_dir, role_summaries, role)
        return role_summaries, artifacts, timings, model_calls
    artifacts["scout"] = scout_result["artifact"]

    mapper_prompt = build_mapper_prompt(evidence_package, artifacts["scout"])
    critic_prompt = build_parallel_critic_prompt(evidence_package, artifacts["scout"])
    with ThreadPoolExecutor(max_workers=SERVER_PARALLEL_SLOTS) as executor:
        mapper_future = executor.submit(
            timed_invoke,
            role="mapper",
            port=port,
            prompt=mapper_prompt,
            schema=mapper_response_schema(),
            invoke=invoke,
        )
        critic_future = executor.submit(
            timed_invoke,
            role="critic",
            port=port,
            prompt=critic_prompt,
            schema=parallel_critic_response_schema(),
            invoke=invoke,
        )
        mapper_timing = mapper_future.result()
        critic_timing = critic_future.result()
    model_calls += 2
    timings["mapper"] = mapper_timing
    timings["critic"] = critic_timing
    _persist_timing(output_dir, mapper_timing)
    _persist_timing(output_dir, critic_timing)

    mapper_result = build_semantic_role_execution_result(
        role="mapper",
        content=mapper_timing["content"],
        finish_reason=mapper_timing["finish_reason"],
        evidence_package=evidence_package,
        prompt=mapper_prompt,
        upstream_artifacts=[artifacts["scout"]],
        runtime_version=runtime_version,
    )
    critic_result = build_parallel_critic_execution_result(
        content=critic_timing["content"],
        finish_reason=critic_timing["finish_reason"],
        evidence_package=evidence_package,
        prompt=critic_prompt,
        scout_artifact=artifacts["scout"],
        runtime_version=runtime_version,
    )
    role_summaries["mapper"] = _persist_role(
        output_dir,
        "mapper",
        mapper_prompt,
        mapper_timing["content"],
        mapper_timing["finish_reason"],
        mapper_timing["envelope"],
        mapper_result,
    )
    role_summaries["critic"] = _persist_role(
        output_dir,
        "critic",
        critic_prompt,
        critic_timing["content"],
        critic_timing["finish_reason"],
        critic_timing["envelope"],
        critic_result,
    )
    if mapper_result["artifact"] is not None:
        artifacts["mapper"] = mapper_result["artifact"]
    if critic_result["artifact"] is not None:
        artifacts["critic"] = critic_result["artifact"]

    siblings_ready = all(
        role_summaries[role]["execution_status"] == "COMPLETED"
        and role in artifacts
        for role in ("mapper", "critic")
    )
    if not siblings_ready:
        _block_role(output_dir, role_summaries, "synthesizer")
        return role_summaries, artifacts, timings, model_calls

    synth_upstream = [
        artifacts["scout"],
        artifacts["mapper"],
        artifacts["critic"],
    ]
    synth_prompt = build_synthesizer_prompt(evidence_package, synth_upstream)
    synth_timing = timed_invoke(
        role="synthesizer",
        port=port,
        prompt=synth_prompt,
        schema=synthesizer_response_schema(),
        invoke=invoke,
    )
    model_calls += 1
    timings["synthesizer"] = synth_timing
    _persist_timing(output_dir, synth_timing)
    synth_result = build_semantic_role_execution_result(
        role="synthesizer",
        content=synth_timing["content"],
        finish_reason=synth_timing["finish_reason"],
        evidence_package=evidence_package,
        prompt=synth_prompt,
        upstream_artifacts=synth_upstream,
        runtime_version=runtime_version,
    )
    role_summaries["synthesizer"] = _persist_role(
        output_dir,
        "synthesizer",
        synth_prompt,
        synth_timing["content"],
        synth_timing["finish_reason"],
        synth_timing["envelope"],
        synth_result,
    )
    if synth_result["artifact"] is not None:
        artifacts["synthesizer"] = synth_result["artifact"]
    return role_summaries, artifacts, timings, model_calls


def _job_from_summary(
    *,
    role: str,
    summary: dict[str, Any],
    timing: dict[str, Any] | None,
    evidence_sha256: str,
) -> dict[str, Any]:
    if summary["execution_status"] == "BLOCKED_DEPENDENCY":
        return blocked_dependency_job(role, evidence_sha256)
    if timing is None:
        raise ParallelPilotError(f"missing timing for invoked role {role}")
    state = str(summary["execution_status"])
    telemetry = {
        "wall_clock_ms": int(timing["wall_clock_ms"]),
        "cpu_ms": None,
        "peak_rss_bytes": None,
    }
    upstream = list(summary.get("upstream_artifact_sha256", []))
    attempt = {
        "attempt": 1,
        "role": role,
        "terminal_state": state,
        "evidence_sha256": evidence_sha256,
        "upstream_artifact_sha256": upstream,
        "receipt_sha256": summary.get("receipt_sha256", "NONE"),
        "role_artifact_sha256": summary.get("role_artifact_sha256", "NONE"),
        "model_call_count": int(summary.get("model_call_count", 0)),
        "hosted_ai_call_count": int(summary.get("hosted_ai_call_count", 0)),
        "telemetry": telemetry,
    }
    return {
        "role": role,
        "terminal_state": state,
        "evidence_sha256": evidence_sha256,
        "upstream_artifact_sha256": upstream,
        "attempts": [attempt],
        "receipt_sha256": attempt["receipt_sha256"],
        "role_artifact_sha256": attempt["role_artifact_sha256"],
        "telemetry": telemetry,
    }


def build_live_root(
    *,
    target_repository_sha: str,
    evidence_sha256: str,
    role_summaries: dict[str, dict[str, Any]],
    timings: dict[str, dict[str, Any]],
    root_wall_clock_ms: int,
) -> dict[str, Any]:
    jobs = [
        _job_from_summary(
            role=role,
            summary=role_summaries[role],
            timing=timings.get(role),
            evidence_sha256=evidence_sha256,
        )
        for role in ROLE_ORDER
    ]
    return build_parallel_root_provenance(
        target_repository_sha=target_repository_sha,
        evidence_sha256=evidence_sha256,
        jobs=jobs,
        root_wall_clock_ms=root_wall_clock_ms,
        root_peak_rss_bytes=None,
    )


def build_run_summary(
    *,
    harness_repository_sha: str,
    evidence_repository_sha: str,
    release_repository_sha: str,
    evidence_sha256: str,
    role_summaries: dict[str, dict[str, Any]],
    model_calls: int,
    concurrency: dict[str, Any] | None,
    grounding: dict[str, Any],
    root_sha256: str,
) -> dict[str, Any]:
    hosted_calls = sum(
        int(role_summaries[role].get("hosted_ai_call_count", 0))
        for role in ROLE_ORDER
    )
    all_completed = all(
        role_summaries[role].get("execution_status") == "COMPLETED"
        for role in ROLE_ORDER
    )
    concurrency_pass = bool(concurrency and concurrency.get("acceptance_pass"))
    exact_evidence = evidence_sha256 == EXPECTED_EVIDENCE_SHA256
    qualifying = (
        all_completed
        and exact_evidence
        and model_calls == 4
        and hosted_calls == 0
        and concurrency_pass
        and grounding["acceptance_pass"]
        and root_sha256 != "NONE"
    )
    return {
        "schema_version": 1,
        "mode": MODE,
        "scope": SCOPE,
        "harness_repository_sha": harness_repository_sha,
        "evidence_repository_sha": evidence_repository_sha,
        "release_repository_sha": release_repository_sha,
        "evidence_sha256": evidence_sha256,
        "expected_evidence_sha256": EXPECTED_EVIDENCE_SHA256,
        "exact_evidence_match": exact_evidence,
        "role_order": list(ROLE_ORDER),
        "direct_dependencies": {
            role: list(DIRECT_DEPENDENCIES[role]) for role in ROLE_ORDER
        },
        "roles": {role: role_summaries[role] for role in ROLE_ORDER},
        "total_model_call_count": model_calls,
        "total_hosted_ai_call_count": hosted_calls,
        "server_parallel_slots": SERVER_PARALLEL_SLOTS,
        "concurrency_acceptance_pass": concurrency_pass,
        "grounding_acceptance_pass": bool(grounding["acceptance_pass"]),
        "parallel_root_provenance_sha256": root_sha256,
        "final_synthesizer_role_artifact_sha256": role_summaries["synthesizer"].get(
            "role_artifact_sha256", "NONE"
        ),
        "overall_execution_status": "COMPLETED" if all_completed else "FAILED_CLOSED",
        "o3d_acceptance_status": "PASS" if qualifying else "FAIL",
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
    parser.add_argument("--port", type=int, default=39132)
    args = parser.parse_args(argv)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    process = None
    root_start_ns = time.monotonic_ns()
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

        evidence_digest = evidence_package_sha256(control["evidence_package"])
        if evidence_digest != EXPECTED_EVIDENCE_SHA256:
            raise ParallelPilotError(
                "O3-D exact O2 evidence digest mismatch: "
                f"expected {EXPECTED_EVIDENCE_SHA256}, got {evidence_digest}"
            )

        runtime_version = Path(args.runtime_version_file).read_text(
            encoding="utf-8"
        ).strip()
        if not runtime_version:
            raise ParallelPilotError("llama.cpp runtime version is empty")

        server_log_path = output_dir / "llama-server.log"
        calls_start_ns = time.monotonic_ns()
        with server_log_path.open("wb") as server_log:
            process = start_parallel_server(
                Path(args.server_binary),
                Path(args.model_path),
                scout_generation(),
                args.port,
                server_log,
            )
            try:
                wait_for_health(args.port, process)
                role_summaries, artifacts, timings, model_calls = run_parallel_calls(
                    port=args.port,
                    output_dir=output_dir,
                    evidence_package=control["evidence_package"],
                    runtime_version=runtime_version,
                )
            finally:
                stop_server(process)
                process = None
        calls_end_ns = time.monotonic_ns()

        concurrency = None
        if "mapper" in timings and "critic" in timings:
            concurrency = concurrency_summary(timings["mapper"], timings["critic"])
            _write_json(output_dir / "concurrency-summary.json", concurrency)

        grounding = grounding_summary(artifacts, control["evidence_package"])
        _write_json(output_dir / "grounding-summary.json", grounding)

        root = build_live_root(
            target_repository_sha=control["evidence_package"]["target_repository_sha"],
            evidence_sha256=evidence_digest,
            role_summaries=role_summaries,
            timings=timings,
            root_wall_clock_ms=_duration_ms(calls_start_ns, calls_end_ns),
        )
        root_sha = parallel_root_provenance_sha256(root)
        _write_json(output_dir / "parallel-root-provenance.json", root)
        (output_dir / "parallel-root-provenance-sha256.txt").write_text(
            root_sha + "\n", encoding="utf-8"
        )

        summary = build_run_summary(
            harness_repository_sha=args.harness_sha,
            evidence_repository_sha=args.evidence_sha,
            release_repository_sha=args.release_sha,
            evidence_sha256=evidence_digest,
            role_summaries=role_summaries,
            model_calls=model_calls,
            concurrency=concurrency,
            grounding=grounding,
            root_sha256=root_sha,
        )
        summary["root_process_wall_clock_ms"] = _duration_ms(
            root_start_ns, time.monotonic_ns()
        )
        _write_json(output_dir / "summary.json", summary)
        print("O3D_PARALLEL_STATUS:" + summary["overall_execution_status"])
        print("O3D_ACCEPTANCE:" + summary["o3d_acceptance_status"])
        print("O3D_MODEL_CALLS:" + str(summary["total_model_call_count"]))
        print("O3D_HOSTED_AI_CALLS:" + str(summary["total_hosted_ai_call_count"]))
        print("O3D_ROOT_SHA:" + root_sha)
        return 0 if summary["o3d_acceptance_status"] == "PASS" else 3
    except Exception as exc:
        if process is not None:
            stop_server(process)
        _write_json(
            output_dir / "summary.json",
            {
                "schema_version": 1,
                "mode": MODE,
                "overall_execution_status": "FAILED_CLOSED",
                "o3d_acceptance_status": "FAIL",
                "error": str(exc),
            },
        )
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

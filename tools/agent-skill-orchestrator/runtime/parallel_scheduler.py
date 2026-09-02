from __future__ import annotations

import re
from copy import deepcopy
from typing import Any, Iterable

from canonical import canonical_sha256
from runtime.budget_profile import (
    DEFAULT_RUNTIME_BUDGET_PROFILE_ID,
    RuntimeBudgetProfileError,
    runtime_budget_profile,
    runtime_budget_profile_sha256,
)
from schema_validation import ContractValidationError, validate_contract

SCHEMA = "o3-parallel-root-provenance.schema.json"
MODE = "o3c_parallel_scheduler_synthetic"
MEMORY_POLICY_ID = "standard-cpu-two-worker-ceiling-v1"
ROLE_ORDER = ("scout", "mapper", "critic", "synthesizer")
SIBLING_ROLES = ("mapper", "critic")
ATTEMPT_STATES = frozenset({"COMPLETED", "INVALID", "EXECUTION_INCOMPLETE", "FAILED"})
JOB_STATES = ATTEMPT_STATES | {"BLOCKED_DEPENDENCY"}
MAX_ATTEMPTS_PER_JOB = 2
DIGEST_RE = re.compile(r"^[0-9a-f]{64}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")

ATTEMPT_KEYS = frozenset(
    {
        "attempt",
        "role",
        "terminal_state",
        "evidence_sha256",
        "upstream_artifact_sha256",
        "receipt_sha256",
        "role_artifact_sha256",
        "model_call_count",
        "hosted_ai_call_count",
        "telemetry",
    }
)
JOB_KEYS = frozenset(
    {
        "role",
        "terminal_state",
        "evidence_sha256",
        "upstream_artifact_sha256",
        "attempts",
        "receipt_sha256",
        "role_artifact_sha256",
        "telemetry",
    }
)
JOB_TELEMETRY_KEYS = frozenset({"wall_clock_ms", "cpu_ms", "peak_rss_bytes"})
ROOT_TELEMETRY_KEYS = frozenset({"wall_clock_ms", "summed_worker_cpu_ms", "peak_rss_bytes"})


class ParallelSchedulerError(ValueError):
    pass


def _exact_keys(value: Any, expected: frozenset[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != expected:
        raise ParallelSchedulerError(f"{label} fields invalid")
    return value


def _digest(value: Any, label: str, *, allow_none: bool = False) -> str:
    if allow_none and value == "NONE":
        return "NONE"
    if not isinstance(value, str) or DIGEST_RE.fullmatch(value) is None:
        raise ParallelSchedulerError(f"{label} must be a canonical sha256 digest")
    return value


def _commit_sha(value: Any, label: str) -> str:
    if not isinstance(value, str) or COMMIT_RE.fullmatch(value) is None:
        raise ParallelSchedulerError(f"{label} must be a 40-character lowercase git sha")
    return value


def _measurement(value: Any, label: str) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ParallelSchedulerError(f"{label} must be a non-negative integer or null")
    return value


def _job_telemetry(value: Any, label: str) -> dict[str, int | None]:
    raw = _exact_keys(value, JOB_TELEMETRY_KEYS, label)
    return {
        "wall_clock_ms": _measurement(raw["wall_clock_ms"], f"{label}.wall_clock_ms"),
        "cpu_ms": _measurement(raw["cpu_ms"], f"{label}.cpu_ms"),
        "peak_rss_bytes": _measurement(raw["peak_rss_bytes"], f"{label}.peak_rss_bytes"),
    }


def _upstream_digests(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or len(value) > 3:
        raise ParallelSchedulerError(f"{label} must be an array of at most three digests")
    normalized = [_digest(item, f"{label}[{index}]") for index, item in enumerate(value)]
    if len(normalized) != len(set(normalized)):
        raise ParallelSchedulerError(f"{label} contains duplicate digests")
    return normalized


def _normalize_attempt(
    raw: Any,
    *,
    role: str,
    evidence_sha256: str,
    upstream_artifact_sha256: list[str],
    index: int,
) -> dict[str, Any]:
    item = _exact_keys(raw, ATTEMPT_KEYS, f"{role}.attempts[{index}]")
    attempt = item["attempt"]
    if not isinstance(attempt, int) or isinstance(attempt, bool) or attempt < 1:
        raise ParallelSchedulerError(f"{role}.attempts[{index}].attempt must be a positive integer")
    if item["role"] != role:
        raise ParallelSchedulerError(f"{role}.attempts[{index}] role drifted")
    state = item["terminal_state"]
    if state not in ATTEMPT_STATES:
        raise ParallelSchedulerError(f"{role}.attempts[{index}] terminal state invalid")
    if item["evidence_sha256"] != evidence_sha256:
        raise ParallelSchedulerError(f"{role}.attempts[{index}] evidence digest drifted")
    upstream = _upstream_digests(
        item["upstream_artifact_sha256"], f"{role}.attempts[{index}].upstream_artifact_sha256"
    )
    if upstream != upstream_artifact_sha256:
        raise ParallelSchedulerError(f"{role}.attempts[{index}] upstream artifact chain drifted")

    receipt_sha = _digest(item["receipt_sha256"], f"{role}.attempts[{index}].receipt_sha256", allow_none=True)
    artifact_sha = _digest(
        item["role_artifact_sha256"],
        f"{role}.attempts[{index}].role_artifact_sha256",
        allow_none=True,
    )
    model_calls = item["model_call_count"]
    hosted_calls = item["hosted_ai_call_count"]
    if model_calls not in (0, 1) or isinstance(model_calls, bool):
        raise ParallelSchedulerError(f"{role}.attempts[{index}] model call count must be 0 or 1")
    if hosted_calls != 0 or isinstance(hosted_calls, bool):
        raise ParallelSchedulerError(f"{role}.attempts[{index}] hosted AI call count must remain zero")

    if state == "COMPLETED":
        if model_calls != 1 or receipt_sha == "NONE" or artifact_sha == "NONE":
            raise ParallelSchedulerError(
                f"{role}.attempts[{index}] completed state requires one call, receipt, and artifact"
            )
    elif state in {"INVALID", "EXECUTION_INCOMPLETE"}:
        if model_calls != 1 or receipt_sha == "NONE" or artifact_sha != "NONE":
            raise ParallelSchedulerError(
                f"{role}.attempts[{index}] {state} state requires one receipt-bearing call and no artifact"
            )
    else:
        if receipt_sha != "NONE" or artifact_sha != "NONE":
            raise ParallelSchedulerError(
                f"{role}.attempts[{index}] failed scheduler attempt must not fabricate receipt/artifact"
            )

    telemetry = _job_telemetry(item["telemetry"], f"{role}.attempts[{index}].telemetry")
    return {
        "attempt": attempt,
        "role": role,
        "terminal_state": state,
        "evidence_sha256": evidence_sha256,
        "upstream_artifact_sha256": upstream,
        "receipt_sha256": receipt_sha,
        "role_artifact_sha256": artifact_sha,
        "model_call_count": model_calls,
        "hosted_ai_call_count": hosted_calls,
        "telemetry": telemetry,
    }


def _normalize_job(raw: Any, *, evidence_sha256: str) -> dict[str, Any]:
    item = _exact_keys(raw, JOB_KEYS, "job")
    role = item["role"]
    if role not in ROLE_ORDER:
        raise ParallelSchedulerError(f"unknown O3 role: {role!r}")
    state = item["terminal_state"]
    if state not in JOB_STATES:
        raise ParallelSchedulerError(f"{role} terminal state invalid")
    if item["evidence_sha256"] != evidence_sha256:
        raise ParallelSchedulerError(f"{role} evidence digest does not match root evidence")
    upstream = _upstream_digests(item["upstream_artifact_sha256"], f"{role}.upstream_artifact_sha256")
    receipt_sha = _digest(item["receipt_sha256"], f"{role}.receipt_sha256", allow_none=True)
    artifact_sha = _digest(item["role_artifact_sha256"], f"{role}.role_artifact_sha256", allow_none=True)
    telemetry = _job_telemetry(item["telemetry"], f"{role}.telemetry")
    attempts_raw = item["attempts"]
    if not isinstance(attempts_raw, list) or len(attempts_raw) > MAX_ATTEMPTS_PER_JOB:
        raise ParallelSchedulerError(f"{role} attempts must contain at most {MAX_ATTEMPTS_PER_JOB} records")

    if state == "BLOCKED_DEPENDENCY":
        if attempts_raw or receipt_sha != "NONE" or artifact_sha != "NONE" or upstream:
            raise ParallelSchedulerError(
                f"{role} blocked dependency must not claim attempts, upstream inputs, receipt, or artifact"
            )
        if any(value is not None for value in telemetry.values()):
            raise ParallelSchedulerError(f"{role} blocked dependency must not fabricate telemetry")
        return {
            "role": role,
            "terminal_state": state,
            "evidence_sha256": evidence_sha256,
            "upstream_artifact_sha256": [],
            "attempts": [],
            "receipt_sha256": "NONE",
            "role_artifact_sha256": "NONE",
            "telemetry": telemetry,
        }

    if not attempts_raw:
        raise ParallelSchedulerError(f"{role} non-blocked job requires at least one attempt")
    attempts = [
        _normalize_attempt(
            raw_attempt,
            role=role,
            evidence_sha256=evidence_sha256,
            upstream_artifact_sha256=upstream,
            index=index,
        )
        for index, raw_attempt in enumerate(attempts_raw)
    ]
    expected_numbers = list(range(1, len(attempts) + 1))
    actual_numbers = [attempt["attempt"] for attempt in attempts]
    if actual_numbers != expected_numbers:
        raise ParallelSchedulerError(f"{role} retry attempt numbers must be contiguous from 1")
    completed_positions = [index for index, attempt in enumerate(attempts) if attempt["terminal_state"] == "COMPLETED"]
    if len(completed_positions) > 1 or (completed_positions and completed_positions[-1] != len(attempts) - 1):
        raise ParallelSchedulerError(f"{role} retries cannot continue after a completed attempt")

    final = attempts[-1]
    if state != final["terminal_state"]:
        raise ParallelSchedulerError(f"{role} job terminal state must equal final attempt state")
    if receipt_sha != final["receipt_sha256"] or artifact_sha != final["role_artifact_sha256"]:
        raise ParallelSchedulerError(f"{role} job receipt/artifact digest must equal final attempt")
    if telemetry != final["telemetry"]:
        raise ParallelSchedulerError(f"{role} job telemetry must equal final attempt telemetry")

    return {
        "role": role,
        "terminal_state": state,
        "evidence_sha256": evidence_sha256,
        "upstream_artifact_sha256": upstream,
        "attempts": attempts,
        "receipt_sha256": receipt_sha,
        "role_artifact_sha256": artifact_sha,
        "telemetry": telemetry,
    }


def blocked_dependency_job(role: str, evidence_sha256: str) -> dict[str, Any]:
    if role not in ROLE_ORDER:
        raise ParallelSchedulerError(f"unknown O3 role: {role!r}")
    evidence = _digest(evidence_sha256, "evidence_sha256")
    return {
        "role": role,
        "terminal_state": "BLOCKED_DEPENDENCY",
        "evidence_sha256": evidence,
        "upstream_artifact_sha256": [],
        "attempts": [],
        "receipt_sha256": "NONE",
        "role_artifact_sha256": "NONE",
        "telemetry": {"wall_clock_ms": None, "cpu_ms": None, "peak_rss_bytes": None},
    }


def _canonical_jobs(
    jobs: Iterable[dict[str, Any]], *, evidence_sha256: str
) -> tuple[list[dict[str, Any]], str]:
    supplied = list(jobs)
    if len(supplied) != len(ROLE_ORDER):
        raise ParallelSchedulerError("O3 root requires exactly four scheduler job records")
    normalized = [_normalize_job(item, evidence_sha256=evidence_sha256) for item in supplied]
    by_role: dict[str, dict[str, Any]] = {}
    for item in normalized:
        role = item["role"]
        if role in by_role:
            raise ParallelSchedulerError(f"duplicate O3 scheduler job role: {role}")
        by_role[role] = item
    if set(by_role) != set(ROLE_ORDER):
        raise ParallelSchedulerError("O3 scheduler job set must contain scout, mapper, critic, synthesizer")

    scout = by_role["scout"]
    mapper = by_role["mapper"]
    critic = by_role["critic"]
    synthesizer = by_role["synthesizer"]

    if scout["terminal_state"] == "BLOCKED_DEPENDENCY":
        raise ParallelSchedulerError("Scout has no dependency and cannot be BLOCKED_DEPENDENCY")

    if scout["terminal_state"] != "COMPLETED":
        for role in ("mapper", "critic", "synthesizer"):
            if by_role[role]["terminal_state"] != "BLOCKED_DEPENDENCY":
                raise ParallelSchedulerError(
                    f"{role} must be dependency-blocked when Scout is not completed"
                )
        gate = "BLOCKED"
    else:
        scout_sha = _digest(scout["role_artifact_sha256"], "Scout RoleArtifact sha")
        for role in SIBLING_ROLES:
            sibling = by_role[role]
            if sibling["terminal_state"] == "BLOCKED_DEPENDENCY":
                raise ParallelSchedulerError(
                    f"{role} cannot be dependency-blocked after Scout completed"
                )
            if sibling["upstream_artifact_sha256"] != [scout_sha]:
                raise ParallelSchedulerError(
                    f"{role} must bind exactly the completed Scout RoleArtifact sha"
                )

        siblings_ready = all(
            by_role[role]["terminal_state"] == "COMPLETED"
            and by_role[role]["role_artifact_sha256"] != "NONE"
            for role in SIBLING_ROLES
        )
        if siblings_ready:
            expected_synth_upstream = [
                scout_sha,
                mapper["role_artifact_sha256"],
                critic["role_artifact_sha256"],
            ]
            if synthesizer["terminal_state"] == "BLOCKED_DEPENDENCY":
                raise ParallelSchedulerError(
                    "Synthesizer cannot be dependency-blocked when Mapper and Critic completed"
                )
            if synthesizer["upstream_artifact_sha256"] != expected_synth_upstream:
                raise ParallelSchedulerError(
                    "Synthesizer must bind Scout, Mapper, and Critic artifacts in canonical order"
                )
            gate = "READY"
        else:
            if synthesizer["terminal_state"] != "BLOCKED_DEPENDENCY":
                raise ParallelSchedulerError(
                    "Synthesizer must be dependency-blocked when either sibling is non-completed"
                )
            gate = "BLOCKED"

    return [deepcopy(by_role[role]) for role in ROLE_ORDER], gate


def _aggregate_attempts(jobs: list[dict[str, Any]]) -> tuple[int, int, int | None]:
    attempts = [attempt for job in jobs for attempt in job["attempts"]]
    model_calls = sum(attempt["model_call_count"] for attempt in attempts)
    hosted_calls = sum(attempt["hosted_ai_call_count"] for attempt in attempts)
    if not attempts:
        summed_cpu = None
    else:
        cpu_values = [attempt["telemetry"]["cpu_ms"] for attempt in attempts]
        summed_cpu = None if any(value is None for value in cpu_values) else sum(cpu_values)
    return model_calls, hosted_calls, summed_cpu


def _profile_binding(
    profile_id: str,
    *,
    registry_data: dict[str, Any] | None,
) -> dict[str, Any]:
    if profile_id != DEFAULT_RUNTIME_BUDGET_PROFILE_ID:
        raise ParallelSchedulerError(
            f"O3-C requires frozen runtime budget profile {DEFAULT_RUNTIME_BUDGET_PROFILE_ID}"
        )
    try:
        profile = runtime_budget_profile(profile_id, registry_data=registry_data)
        digest = runtime_budget_profile_sha256(profile_id, registry_data=registry_data)
    except RuntimeBudgetProfileError as exc:
        raise ParallelSchedulerError(str(exc)) from exc
    if profile["max_concurrent_model_workers"] != 2:
        raise ParallelSchedulerError("O3-C requires the frozen two-worker concurrency ceiling")
    if profile["max_total_role_calls"] != 4 or profile["max_hosted_ai_calls"] != 0:
        raise ParallelSchedulerError("O3-C runtime budget call ceilings drifted")
    return {
        "profile_id": profile_id,
        "profile_sha256": digest,
        "max_total_role_calls": profile["max_total_role_calls"],
        "max_hosted_ai_calls": profile["max_hosted_ai_calls"],
        "max_concurrent_model_workers": profile["max_concurrent_model_workers"],
    }


def build_parallel_root_provenance(
    *,
    target_repository_sha: str,
    evidence_sha256: str,
    jobs: Iterable[dict[str, Any]],
    root_wall_clock_ms: int | None,
    root_peak_rss_bytes: int | None,
    budget_profile_id: str = DEFAULT_RUNTIME_BUDGET_PROFILE_ID,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    target_sha = _commit_sha(target_repository_sha, "target_repository_sha")
    evidence = _digest(evidence_sha256, "evidence_sha256")
    canonical_jobs, synth_gate = _canonical_jobs(jobs, evidence_sha256=evidence)
    budget = _profile_binding(budget_profile_id, registry_data=registry_data)
    model_calls, hosted_calls, summed_cpu = _aggregate_attempts(canonical_jobs)
    if model_calls > budget["max_total_role_calls"]:
        raise ParallelSchedulerError("O3-C total model call count exceeds runtime budget")
    if hosted_calls > budget["max_hosted_ai_calls"]:
        raise ParallelSchedulerError("O3-C hosted AI call count exceeds runtime budget")
    wall_clock = _measurement(root_wall_clock_ms, "root.telemetry.wall_clock_ms")
    peak_rss = _measurement(root_peak_rss_bytes, "root.telemetry.peak_rss_bytes")

    root = {
        "schema_version": 1,
        "mode": MODE,
        "target_repository_sha": target_sha,
        "evidence_sha256": evidence,
        "budget_profile": budget,
        "runner_memory_policy_id": MEMORY_POLICY_ID,
        "canonical_role_order": list(ROLE_ORDER),
        "jobs": canonical_jobs,
        "synthesizer_dependency_gate": synth_gate,
        "total_model_call_count": model_calls,
        "total_hosted_ai_call_count": hosted_calls,
        "telemetry": {
            "wall_clock_ms": wall_clock,
            "summed_worker_cpu_ms": summed_cpu,
            "peak_rss_bytes": peak_rss,
        },
    }
    try:
        validate_contract(root, SCHEMA)
    except ContractValidationError as exc:
        raise ParallelSchedulerError(f"invalid O3 parallel root provenance: {exc}") from exc
    return root


def validate_parallel_root_provenance(
    root: dict[str, Any],
    *,
    registry_data: dict[str, Any] | None = None,
) -> None:
    try:
        validate_contract(root, SCHEMA)
    except ContractValidationError as exc:
        raise ParallelSchedulerError(f"invalid O3 parallel root provenance: {exc}") from exc
    root_telemetry = root.get("telemetry")
    _exact_keys(root_telemetry, ROOT_TELEMETRY_KEYS, "root.telemetry")
    _measurement(root_telemetry["summed_worker_cpu_ms"], "root.telemetry.summed_worker_cpu_ms")
    expected = build_parallel_root_provenance(
        target_repository_sha=root["target_repository_sha"],
        evidence_sha256=root["evidence_sha256"],
        jobs=root["jobs"],
        root_wall_clock_ms=root_telemetry["wall_clock_ms"],
        root_peak_rss_bytes=root_telemetry["peak_rss_bytes"],
        budget_profile_id=root["budget_profile"]["profile_id"],
        registry_data=registry_data,
    )
    if expected != root:
        raise ParallelSchedulerError("O3 parallel root provenance does not match deterministic recomputation")


def parallel_root_provenance_sha256(
    root: dict[str, Any],
    *,
    registry_data: dict[str, Any] | None = None,
) -> str:
    validate_parallel_root_provenance(root, registry_data=registry_data)
    return canonical_sha256(root)

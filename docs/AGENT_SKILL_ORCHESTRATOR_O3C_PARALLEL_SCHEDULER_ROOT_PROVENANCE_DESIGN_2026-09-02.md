# Agent Skill Orchestrator O3-C Parallel Scheduler + Root Provenance Design — 2026-09-02

## Status

DESIGN_FROZEN_BEFORE_CODE

## Baseline

- repository: `hanmiyoo10-alt/-`
- branch base / O3-B merged main: `21eaf2fba2c423e1f0d03eaacaaba4b75320598d`
- O3-A runtime budget profile: `standard-cpu-v1`
- O3-A runtime budget profile digest: `87ccc9c5c0b86fb146f51a24fa583493673992252d8e3063c2cc85ccdac54ffe`
- O3-B Critic contract: `critic-parallel-compact-wire-v2`
- O3-B exit evidence: issue #1120 comment `5507987033`
- O3-C acceptance freeze: issue #1120 comment `5508010558`

O2-D `runtime/run_sequential_pilot.py` remains the unchanged rollback baseline. O3-C is additive and does not activate a live parallel workflow.

## Goal

Define and mechanically prove the deterministic control-plane semantics required by roadmap O3 before any new live parallel model run:

1. Scout completes first.
2. Mapper and parallel Critic v2 are sibling jobs over the exact same evidence digest and Scout RoleArtifact digest.
3. Sibling arrival/completion order cannot change canonical merge or root provenance.
4. Synthesizer may run only after both sibling terminal states are known and both required sibling RoleArtifacts are valid/COMPLETED.
5. A failed or invalid sibling cannot rewrite, erase, or suppress the other sibling result.
6. Root provenance binds budget identity, dependency state, retry metadata, artifact/receipt digests, and measured telemetry without fabricating unknown values.

## Non-goals

O3-C does not:

- modify O2 role contracts, O2 sequential scheduling, or O2 evidence fixtures;
- change router authority, validated scopes, judge authority, mutation authority, plugin/product/release/device bytes;
- start llama.cpp, download a model, invoke a model, or make a hosted-AI call;
- add or activate a GitHub Actions parallel inference workflow;
- claim O3 phase exit or wall-clock benefit from synthetic scheduling alone.

A later O3 live slice must measure grounding and operational/wall-clock benefit before O3 can exit.

## Frozen topology

Canonical stage order is fixed for hashing and reporting regardless of arrival order:

1. `scout`
2. `mapper`
3. `critic`
4. `synthesizer`

Direct dependencies in O3 are:

- Scout: none
- Mapper: Scout
- Critic v2: Scout
- Synthesizer: Mapper + Critic

Scout is a hard gate. Mapper and Critic are siblings only after a valid Scout artifact exists.

## Scheduler job record

O3-C introduces a scheduler-level job record distinct from model receipts. It does not invent a model receipt for infrastructure failure or dependency blocking.

Required identity fields:

- `role`
- `terminal_state`
- `evidence_sha256`
- `upstream_artifact_sha256`
- `attempts`
- `receipt_sha256`
- `role_artifact_sha256`
- measured telemetry fields

Scheduler terminal states are:

- `COMPLETED`: validated receipt and RoleArtifact are present;
- `INVALID`: a model receipt exists but semantic validation failed, or a supplied completed result is internally inconsistent;
- `EXECUTION_INCOMPLETE`: execution ended under the existing incomplete classification and no valid artifact is claimed;
- `FAILED`: scheduler/infrastructure failure with no fabricated model receipt;
- `BLOCKED_DEPENDENCY`: role was not eligible to run because a required dependency gate failed.

`FAILED` and `BLOCKED_DEPENDENCY` are scheduler states only. They are not added to the frozen O2 semantic receipt schema.

## Retry contract

Retry metadata is explicit and bounded.

- `attempts` is a non-empty ordered list for jobs that actually ran and empty only for `BLOCKED_DEPENDENCY`.
- attempt numbers start at 1, are unique, strictly contiguous, and cannot exceed 2 in O3-C.
- each attempt binds the same role, evidence digest, and upstream artifact digest set.
- at most one terminal attempt may be `COMPLETED`.
- a job-level terminal state must equal the final attempt state unless the job is `BLOCKED_DEPENDENCY`.
- no retry changes evidence, Scout upstream identity, budget profile, or role identity.

O3-C does not itself execute retries; it validates deterministic retry provenance supplied by a synthetic scheduling simulation.

## Sibling identity invariant

For Mapper and Critic:

- `evidence_sha256` must be identical;
- `upstream_artifact_sha256` must contain exactly the same single Scout RoleArtifact SHA;
- role identities must remain distinct (`mapper`, `critic`);
- neither sibling may depend on the other sibling artifact.

Any mismatch fails closed before root provenance is emitted.

## Synthesizer dependency gate

Synthesizer is eligible only when:

- Scout is `COMPLETED` with a valid artifact SHA;
- Mapper is `COMPLETED` with a valid artifact SHA;
- Critic is `COMPLETED` with a valid artifact SHA;
- Mapper/Critic sibling identity invariant passes.

If either sibling is `INVALID`, `EXECUTION_INCOMPLETE`, `FAILED`, or missing, the Synthesizer state is `BLOCKED_DEPENDENCY` and it has:

- zero attempts;
- no receipt SHA;
- no RoleArtifact SHA;
- no fabricated model/hosted call count.

The sibling that did complete remains preserved in root provenance.

## Root provenance contract

The O3 root is canonical control-plane evidence, not a model verdict. It contains:

- schema version and mode;
- target/evidence identity;
- runtime budget profile id and canonical profile digest;
- frozen worker ceiling and call ceilings read from the validated runtime budget profile;
- runner memory policy id;
- canonical role/job records in fixed role order;
- aggregate model-call and hosted-AI-call counts only from explicit attempt records;
- root wall-clock telemetry and worker CPU telemetry;
- deterministic dependency-gate status;
- canonical root digest helper.

The profile values are loaded through `runtime.budget_profile.runtime_budget_profile()` and the digest through `runtime_budget_profile_sha256()`. O3-C does not duplicate those constants as a second source of authority.

## Telemetry and unknown-value rule

Wall-clock and CPU telemetry are distinct quantities.

Per attempted job:

- `wall_clock_ms`: observed elapsed wall time or `null` if unavailable;
- `cpu_ms`: observed worker CPU time or `null` if unavailable;
- `peak_rss_bytes`: observed worker peak RSS or `null` if unavailable.

At root:

- `wall_clock_ms`: observed root elapsed wall time or `null`;
- `summed_worker_cpu_ms`: sum only when every attempted worker has observed CPU telemetry; otherwise `null`;
- `peak_rss_bytes`: observed root/runner peak RSS or `null`.

Unknown telemetry is never coerced to `0`. A literal zero is accepted only as an explicitly supplied measurement and is distinguishable from `null`.

Runner memory policy id for this synthetic contract is frozen as `standard-cpu-two-worker-ceiling-v1`. It identifies the policy/ceiling only; it does not claim that a particular live runner has already demonstrated safe two-model residency.

## Call-count rule

O3-C root aggregation counts only explicit attempt records:

- `model_call_count` per attempt is `0` or `1`;
- `hosted_ai_call_count` must always be `0`;
- total model calls must not exceed `standard-cpu-v1.max_total_role_calls` (`4`);
- total hosted calls must not exceed `standard-cpu-v1.max_hosted_ai_calls` (`0`);
- concurrent sibling eligibility must not exceed `max_concurrent_model_workers` (`2`).

Synthetic unit tests may construct attempt records representing prior calls, but O3-C implementation/test execution performs no inference itself.

## Canonicalization / ordering independence

The caller may provide job records in any arrival order. The validator normalizes them into fixed role order before hashing.

- role order is semantic/canonical, not arrival order;
- attempt order is numeric attempt order;
- upstream digest arrays use the role-specific frozen dependency order;
- no timestamps are part of the canonical identity unless explicitly represented as measured numeric telemetry;
- the same validated semantic job set must produce the same canonical root SHA regardless of input list order.

## Failure localization

A sibling failure is local:

- Mapper failure does not change Critic terminal state, attempts, receipt SHA, artifact SHA, or telemetry.
- Critic failure does not change Mapper terminal state, attempts, receipt SHA, artifact SHA, or telemetry.
- the only downstream effect is deterministic Synthesizer dependency blocking.

No majority vote, inferred recovery, or model-authored resolution is permitted.

## Planned implementation

Keep the implementation additive and narrow:

1. `tools/agent-skill-orchestrator/schemas/o3-parallel-root-provenance.schema.json`
   - closed schema for normalized root/job/attempt/telemetry records;
   - nullable telemetry; digest formats; bounded attempts/states.
2. `tools/agent-skill-orchestrator/runtime/parallel_scheduler.py`
   - validates budget profile/digest;
   - validates/normalizes sibling jobs and retries;
   - enforces Synthesizer dependency gate;
   - canonicalizes fixed role order;
   - computes aggregate counts/telemetry and canonical root digest.
3. `tools/agent-skill-orchestrator/tests/test_o3c_parallel_scheduler.py`
   - synthetic only, zero inference;
   - covers all O3-C acceptance gates.

No O2 file is planned to be modified.

## Required tests

1. Mapper and Critic require identical evidence SHA and identical Scout upstream SHA.
2. Reversing sibling arrival order yields byte-equivalent normalized root content and the same root SHA.
3. Mapper failure preserves Critic result; Critic failure preserves Mapper result.
4. Synthesizer is dependency-blocked unless both required siblings are `COMPLETED` with valid artifact digests.
5. retry attempt numbering, state consistency, evidence/upstream stability, and two-attempt ceiling fail closed.
6. wall-clock/CPU/RSS telemetry remain distinct; missing data remains `null`, never synthetic zero.
7. runtime budget profile id/digest, concurrency ceiling, call ceilings, and runner memory policy are provenance-bound.
8. invalid digest/state/role/duplicate job/root inputs fail closed.
9. Agent Skills full regression and SimCore Required remain green.

## Exit evidence for O3-C

O3-C exits only after:

- design-before-code is visible in branch history;
- focused synthetic tests and full Agent Skills CI pass;
- SimCore Verify/Required pass;
- exact tested-head merge to main;
- merged-main Agent Skills and SimCore pass;
- main read-back confirms the root schema/module/tests;
- exit evidence is recorded centrally in issue #1120.

O3 phase itself remains open after O3-C. A subsequent live parallel scheduling slice must establish grounding no worse than O2 plus measurable wall-clock or operational benefit.
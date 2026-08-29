# OBSERVABILITY-BEST-EFFORT-PROGRESS-CHANNEL

Status: `HOLD`

## Problem / evidence

`PocketRisu-Alter/PocketRisu-Alter@026f7a08de8312c37b4f6f71f90d020e62231efa` adds granular progress reporting to a long-running multi-step server pipeline. Its reusable lesson is that progress is control-plane/observability state, not the authority for work correctness. The source catches progress-sink failures so UI/SSE reporting cannot fail the underlying job.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned long-running job/progress channel and demonstrated need for granular progress
- Priority: `P2`
- Lifecycle status: `HOLD`

## Ownership boundary

1. The job/pipeline owns work success, failure, cancellation, and durable side effects.
2. The progress channel owns only user/diagnostic visibility into phases/subtasks.
3. A progress sink must not be able to throw back into or mutate job correctness.
4. Progress state should be explicit (`init`, `start`, `done`, `error`, `skipped` or equivalent) instead of inferred from event absence.
5. If the set of planned subtasks is known, announce it before execution so the UI can represent pending work deterministically.
6. User-facing progress payloads should not expose unreviewed internal error/secrets merely because the source implementation forwards diagnostics.

## Compatibility / invariants

- Do not introduce Alter's MultiAgent subsystem merely to obtain this pattern.
- Do not change PocketRisu provider/request semantics, storage, save ordering, plugin reload, deployment manager, or Android notification behavior.
- Progress delivery may be dropped, disconnected, or fail locally while the primary job continues according to its own semantics.
- Cancellation remains owned by the primary job; the progress channel only reports it.

## Validation if activated later

- throwing progress callback does not change job result;
- disconnected client/SSE sink does not abort work unless the job's own cancellation policy says so;
- explicit subtask lifecycle ordering is stable under parallel tasks;
- skipped and failed subtasks are distinguishable from never-announced work;
- no sensitive internal diagnostics are exposed in user-facing progress events;
- tests prove progress events are additive and do not become required protocol state for successful completion.

## Risk / blast radius

Localized and easy to revert if implemented as an optional observer. Risk rises if progress events become protocol-authoritative or if internal errors are exposed directly to clients.

## Rollback / fallback

Remove or disable the observer/sink and fall back to coarse existing request status. The underlying job must remain fully functional without granular progress.

## Follow-up / PR decomposition

Keep on `HOLD` until a concrete PocketRisu long-running job/progress owner is identified. If activated, first PR should be a single isolated observer boundary plus failure-isolation tests; UI rendering can be a separate PR. No unrelated cleanup.

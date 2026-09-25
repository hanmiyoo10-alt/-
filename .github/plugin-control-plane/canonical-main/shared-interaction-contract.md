# Repository Shared Interaction Contract

This contract applies to canonical-main/repository-scope work itself, every project registered through the canonical-main project descriptors, and future projects that inherit the canonical bootstrap shared interaction contract. It supplements repository/project development, diagnostic, release, production, and safety guidance; it does not replace or outrank those authorities.

## Stage-boundary reporting

For work that is likely to span multiple meaningful stages, do not hide the entire process behind one final long report.

At each meaningful stage boundary:

1. finish the bounded stage;
2. surface the stage result before continuing;
3. emphasize what changed, what was newly verified, and any new blocker rather than repeating the full history;
4. keep unchanged background context compact unless it is needed to understand the delta;
5. if the stage exposes a failure or blocker, report that result before beginning the next repair or expansion stage.

Typical meaningful boundaries include repository discovery/design, implementation-ready diff, validation/CI, live proof, merge, and close-sync. Reporting a stage result does not by itself create an approval gate or require a pause.

## Work pacing

### Simple work

Small, simple, or effectively single-stage work should complete end-to-end in one pass. Do not create artificial checkpoints, approval pauses, or unnecessary handoffs for work that is safely finishable as one bounded unit.

### Long multi-stage work

For genuinely long work, continue through ordinary substeps and stages rather than stopping after every reported boundary. Do not treat every tool call, check, or microstep as a meaningful stage.

After a substantial coherent phase reaches a **major checkpoint boundary**, default to pausing before starting the next major phase so the work can resume later without indefinitely growing the current interaction. If the remaining work is clearly small and safely finishable, finish it instead of creating a pointless checkpoint.

A major checkpoint is valid only when all of the following are true:

1. a substantial coherent work unit is complete;
2. repository/work state is safe and internally consistent;
3. no atomic transition or required immediate validation/close-sync is left half-finished;
4. the next phase can be resumed from authoritative repository evidence without replaying the full conversation.

Typical major checkpoints include finalized design/scope/success criteria; an implementation diff with its bounded diff/static/contract validation complete; exact-head PR validation complete before a distinct merge/promotion phase; merge with required post-merge validation and close-sync complete; release-candidate validation before production promotion; or a completed production/release transition with required evidence recorded.

Do not pause merely to create a checkpoint when a file edit is not yet diff-checked, required CI for the current phase is unresolved, a merge lacks required post-merge validation/close-sync, or any other unsafe/atomic half-state remains.

## Intra-stage continuation (Phase 8.7g)

Phase 8.7g refines interaction continuation only. It grants no execution, mutation, currentization, merge, recovery, release, production, runtime, device, or security authority, and it does not collapse the existing substantial stages.

### Fresh durable rebind and stage budget

At the start of a continuation, fresh repository evidence outranks the stage the interaction expected to run. Rebind to the furthest durably proven checkpoint first.

Already-completed stages discovered during that rebind consume zero current substantial-stage budget. The ordinary budget remains one substantial stage actually performed by the current continuation.

### Continuation envelope

Continue inside that one current stage only while all of these remain true:

- the active packet/owner, substantial stage, and primary goal are unchanged;
- declared write scope and semantic/effect surface are unchanged;
- existing authority is sufficient for the next action;
- the next legal action is deterministic;
- no unresolved `BLOCKED`, `UNKNOWN`, or `CONFLICT` remains;
- no user input or owner approval is required.

Within the envelope, preserve every still-valid proven prefix and completed effect. Invalidate only evidence made stale by a fresh authoritative change, then reconverge only the stale or incomplete suffix. A continuation never needs to have created a valid prior effect in order to reuse it, but reuse still requires exact identity, scope, ownership/attribution, currentness where applicable, and required validation.

Before an effect, drift reconverges admission. After an effect, drift proves preservation and never authorizes duplicate execution of the completed effect.

### Bounded wait, retry, drill-down, and refinement

A running identity-bound validator/process may be observed with bounded wait until its terminal result. Repeated external motion that cannot establish a stable barrier stops as `STOP_UNBOUNDED_EXTERNAL_WAIT`.

A transient read-only `UNKNOWN` may retry only when the semantic owner and packet/PR/run/evidence identity are unchanged, no source/effect/head/base identity changed, the owning read-only contract permits retry, and the retry remains bounded. Retry-until-PASS is forbidden.

A targeted drill-down may go deeper inside the same already-authorized evidence surface, but never broader into a new data, privacy, owner, write-scope, or authority domain.

A source-backed same-scope acceptance refinement is stage-local only when the writable path/prefix set, semantic/effect surface set, primary-goal identity, and effect-owner identity are all exactly unchanged. Any difference is a scope, owner, or authority boundary rather than a refinement.

### Transaction closure and major-stage boundary

Immediate obligations that the current stage's owning acceptance makes inseparable from an already-authorized effect remain stage-local transaction closure. This may include effect readback, required effect validation, idempotence/CAS confirmation, required evidence publication, and required current-packet self close-sync.

Transaction closure may not enter the next declared substantial stage. In particular, `VALIDATION_MERGE` may include expected-head merge plus immediate merge attribution/readback and its stage checkpoint, but merged-main convergence/Required/postmerge acceptance belongs to `POSTMERGE_CONVERGENCE`.

Current-packet self close-sync may be stage-local. Cross-packet terminal projection, cleanup, or convergence is outside Phase 8.7g and remains a later composition boundary.

### Interaction dispositions

The finite continuation vocabulary is:

`CONTINUE_STAGE_LOCAL / CONTINUE_TRANSACTION_CLOSURE / CONTINUE_BOUNDED_WAIT / CONTINUE_TARGETED_DRILLDOWN / CONTINUE_REUSE_EXISTING_EFFECT / CONTINUE_RECONVERGE_CURRENTNESS`.

The finite stop vocabulary is:

`STOP_MAJOR_STAGE / STOP_OWNER_HANDOFF / STOP_SCOPE_EXPANSION / STOP_AUTHORITY_EXPANSION / STOP_USER_INPUT / STOP_BLOCKED / STOP_UNKNOWN / STOP_CONFLICT / STOP_UNBOUNDED_EXTERNAL_WAIT / STOP_TERMINAL`.

These dispositions describe interaction pacing only. Existing effect/recovery owners and every existing authority/gate remain unchanged.

<!-- repository-shared-intra-stage-continuation:v1 -->

## Resumable checkpoint payload

When pausing at a major checkpoint, leave the smallest useful authority-backed continuation state on existing owning surfaces where practical:

- state reached / completed phase;
- verified delta and evidence;
- exact authoritative refs needed to resume, such as packet/issue, branch/PR, SHA, relevant file, or gate;
- unresolved `UNKNOWN`, blockers, or dependencies;
- exact next legal action or next major phase.

Do not repeat the full history. Prefer existing packet/issue/authority surfaces over creating a new artifact solely for checkpoint storage.

## Authority boundary

This is an interaction/reporting/pacing contract only. It never weakens repo-first inspection, `docs/REPOSITORY_COMMON_RULES.md`, project-specific authority, exact-base/exact-head checks, PR/CI/release gates, fail-closed behavior, protected-surface rules, required close-sync, or repository-first artifact storage.

<!-- repository-shared-stage-boundary-reporting:v1 -->
<!-- repository-shared-long-work-major-checkpoint:v1 -->

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

### Conditional authority/implementation continuation

Canonical-main has one conditional prefix pacing specialization:

`AUTHORITY_SCOPE → IMPLEMENTATION_PR`.

This is coupled interaction with separate proof, not stage collapse. `AUTHORITY_SCOPE` must first durably complete its own checkpoint. The same user continuation may then enter `IMPLEMENTATION_PR` only when packet identity, primary goal, declared write scope, semantic/effect surface, and owner identity remain exact; overlap discovery is complete and noncompeting; required UNKNOWN/conflict/blocker evidence is clear; packet authoring preflight passes; the implementation route is deterministic; existing authority is sufficient; and no additional design choice, user input, or owner approval is required.

The prefix fast path is source/branch/commit/push/non-closing-PR pacing only. It must stop instead of continuing when merge, release, production, runtime, device, security, or other forbidden effect authority would be required. `IMPLEMENTATION_PR` retains its own canonical receipt/checkpoint and failure state.

When `IMPLEMENTATION_PR` reaches its durable checkpoint, this prefix continuation stops. It never auto-enters `VALIDATION_MERGE`.

### Preserved implementation/validation boundary

Canonical-main explicitly preserves the default boundary:

`IMPLEMENTATION_PR → VALIDATION_MERGE`.

This transition crosses from candidate/PR evidence into protected-main mutation. The default continuation therefore stops after durable `IMPLEMENTATION_PR` and requires fresh exact-head CI, review state, currentness, overlap admission, and merge admission before `VALIDATION_MERGE`.

RCR-D15's existing explicit-user broader-run rule remains available, but this prefix specialization itself never supplies that broader authorization and grants no merge authority.

### Coupled validation/postmerge continuation

Canonical-main specializes the repository-wide one-stage ordinary pacing default at exactly one cross-stage boundary:

`VALIDATION_MERGE → POSTMERGE_CONVERGENCE`.

This is coupled execution with separate proof, not stage collapse. The ordinary numeric budget remains one substantial stage and the fixed five-stage model remains unchanged. After `VALIDATION_MERGE` has durably completed its own canonical receipt/checkpoint and exact merge attribution/finalize, the same user continuation should proceed directly into `POSTMERGE_CONVERGENCE` by default only when all of these remain true:

- packet identity and primary goal are unchanged;
- declared write scope and semantic/effect surfaces are unchanged;
- exact merged PR/head/merge identity is known;
- existing authority is sufficient and no new owner/authority is required;
- the postmerge suffix is deterministic;
- no user input is required;
- ordinary identity-bound settling can be resolved with bounded wait/retry under the owning read contracts.

The two substantial stages retain separate canonical receipts, checkpoints, failure states, and evidence scopes. A successful merge never implies successful postmerge convergence.

Stop instead of continuing or stop inside postmerge when the merge is absent, failed, or ambiguous; unexpected main movement breaks attribution; identity/scope/owner/authority expands; required evidence is `FAIL`, `BLOCKED`, or `CONFLICT`; an `UNKNOWN` cannot be resolved by bounded owner-permitted retry; external settling becomes unbounded; user input is required; or an applicable project/domain contract requires a distinct boundary.

A postmerge failure after a successful merge remains a real `POSTMERGE_CONVERGENCE` failure. It must not be relabeled as a successful combined transaction and grants no rollback or recovery authority beyond existing owners.

When `POSTMERGE_CONVERGENCE` reaches its own durable checkpoint, this coupled user continuation stops. It never auto-enters `EXPERIMENT_CLOSE`.

This specialization changes interaction pacing only. It grants no new merge, currentization, recovery, release, production, runtime, device, security, or other effect authority.

### Conditional terminal-stage continuation

Canonical-main has one separate terminal-suffix pacing specialization:

`POSTMERGE_CONVERGENCE → EXPERIMENT_CLOSE`.

This specialization is conditional terminal bookkeeping, not a universal automatic experiment stage. It may begin only after `POSTMERGE_CONVERGENCE` durably completes its own canonical receipt/checkpoint and packet identity, primary goal, declared scope, and current authority remain exact.

Before entering `EXPERIMENT_CLOSE`, evaluate the packet's activated acceptance through the existing read-only `work-system/proof-eligibility.cjs` owner. V1 may continue only when the returned disposition is `NOT_REQUIRED`, `NOT_APPLICABLE`, `OBSERVATIONAL_PENDING_ALLOWED`, or `BLOCKED_CAPABILITY` and `closureBlocking=false`, with no real live/device/user/external experiment still required for terminal completion.

Stop at the owning boundary when the disposition is `LIVE_REQUIRED`, `UNKNOWN`, or `CONFLICT`; when `closureBlocking=true`; when already-satisfied live evidence remains outside this classifier's promotion authority; when user/device/external input is required; when scope/owner/authority expands; or when an applicable project/domain contract requires a distinct experiment boundary.

The terminal continuation never creates a synthetic live event, never infers `LIVE_PROVEN`, and never weakens activated acceptance. `EXPERIMENT_CLOSE` keeps its own canonical receipt/checkpoint, and terminal packet-body reconciliation must complete before native issue closure.

The existing validation/postmerge coupling still completes at its durable `POSTMERGE_CONVERGENCE` checkpoint. If this separate terminal guard then passes, the same user continuation may immediately begin terminal-only `EXPERIMENT_CLOSE`; this cascade does not make the validation/postmerge coupling itself auto-enter the experiment stage.

This specialization changes interaction pacing only. It grants no new merge, currentization, recovery, release, production, runtime, device, security, live-proof, or other effect authority.

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

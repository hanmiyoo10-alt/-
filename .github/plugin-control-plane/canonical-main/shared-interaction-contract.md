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

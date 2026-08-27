# Feature-ID: RECOVERY-CANDIDATE-COMPLETENESS

Status: **DESIGN_NEEDED — assistant-owned draft**

## Problem / evidence

`TripleHwang/RisuVault` commit `47fcb62948d74480c978093400cd58fed18a2a63` fixes a recovery correctness bug: a repair attempt could report that a character was absent from every backup even when only a subset had actually been decoded. The fix distinguishes existing candidates from checked, unreadable, and budget-skipped candidates, and only permits a definitive absence conclusion after exhaustive coverage. It also prevents an oversized candidate from starving smaller affordable candidates and adds a whole-repair time budget.

This is external evidence, not authority. PocketRisu must first prove that it owns an equivalent candidate-based recovery path.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: current PocketRisu recovery/repair candidate enumeration, backup budgets, timeout semantics, and destructive publish/rollback ownership audit
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`

## Minimal safe scope

The first slice is INSPECT_ONLY plus pure decision tests. Do not change backup sizes, repair ordering, startup timing, or destructive publication first.

If PocketRisu has a matching recovery-search boundary, isolate a pure `RecoveryCoverage`/`RecoverySearchResult` contract that can distinguish:

- no candidates exist;
- all existing candidates were checked and no hit exists;
- some candidates were unreadable;
- some candidates were skipped by byte/count/time budget;
- a valid hit was found;
- the search timed out before exhaustive coverage.

A user-visible definitive absence message may only come from the exhaustive-no-hit state.

## Ownership boundaries

- Candidate discovery owns the complete set/census of available recovery sources.
- Budgeting owns count/byte/time admission and must report what it skipped.
- Decoder owns per-candidate validity/readability and must not erase candidate existence from the census.
- Recovery search owns ordering and hit/no-hit/incomplete semantics.
- Publish/restore owner remains solely responsible for mutation and rollback; this feature must not publish partial state.
- UI messaging consumes structured recovery coverage; it does not infer completeness from an empty result list.

## Proposed mechanism

1. Inspect current PocketRisu recovery/repair call sites and identify whether candidate lists can be truncated, filtered, unreadable, or timed out before a result is produced.
2. If such a path exists, separate `candidate census` from `checked results` so budget filtering cannot make unexamined backups disappear semantically.
3. Represent skip/unreadable reasons explicitly and carry totals through to the final recovery result.
4. Only map `checked === total && unreadable === 0 && skipped === 0 && no hit` to definitive absence.
5. For incomplete searches, return an actionable bounded state such as `INCOMPLETE_SEARCH` with checked/skipped/unreadable counts instead of claiming loss.
6. Keep candidate order deterministic. If a large candidate is unaffordable, continue considering smaller candidates when the existing recovery policy safely permits it.
7. Do not copy RisuVault's candidate count, byte, decompressed-size, worker-heap, or timeout constants. Measure PocketRisu data/device behavior before defining budgets.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains no-op unless separately reviewed.
- Existing save/integrity optimizations remain intact.
- Targeted V3 plugin reload remains unchanged.
- runit only; no PM2.
- No server-phone Android notifications.
- Existing successful recovery outcomes must remain successful.
- An unreadable or skipped candidate must never be silently counted as checked-and-absent.
- Failure/incomplete search must never publish partial repaired state.
- Recovery source paths/identifiers must not leak sensitive filesystem or credential/session details in UI/logs.

## Validation / acceptance

Pure tests before any source mutation:

- zero existing backups -> `NO_CANDIDATES`, not exhaustive absence;
- one valid candidate with a hit -> success;
- all candidates readable, exhaustive, no hit -> definitive absence is allowed;
- one unreadable candidate + no hits -> incomplete, definitive absence forbidden;
- one candidate skipped by count budget -> incomplete;
- large candidate skipped but smaller affordable candidate contains the target -> smaller candidate can still be reached when policy permits;
- whole-search timeout -> incomplete and bounded;
- corrupt candidate does not abort census of later candidates;
- checked/skipped/unreadable totals are internally consistent;
- no failure path mutates authoritative state;
- rollback/publish regression suite remains green.

Measurement before choosing limits:

- real candidate count distribution;
- compressed/raw/decompressed candidate sizes;
- decode peak RSS/heap;
- wall-clock recovery latency;
- startup impact if recovery runs during bootstrap.

## Risk / blast radius

Recovery is destructive/high-blast-radius even when the first slice appears to be only accounting or messaging. A mistaken completeness signal can cause users or automation to make bad recovery decisions; widened budgets can increase OOM or startup stalls. Therefore this remains design-only until the current PocketRisu boundary is reproduced and failure semantics are tested.

## Rollback / fallback

The first implementation, if justified, must be pure result-accounting/decision logic with no storage migration. It should be independently revertible. Any later budget/order change lands separately and preserves the previous bounded path as fallback until measurements prove the new policy.

## Dependencies and PR decomposition

1. **INSPECT_ONLY:** map recovery sources, candidate enumeration, filters/budgets, timeout, decoder, UI result mapping, publish/rollback owner.
2. **PR 1 candidate:** pure recovery-coverage type/decision function + exhaustive/incomplete unit tests only.
3. **PR 2 candidate:** wire structured coverage into one existing recovery path without widening budgets or changing writes.
4. **PR 3+ only if measured:** budget/order improvements as separate bounded changes.
5. Any destructive restore/recovery mutation redesign remains outside this feature and requires separate explicit review.

## Promotion gate

Do not move to `READY_TO_PORT` until PocketRisu is shown to have a matching incomplete-search ambiguity, the result-accounting slice is isolated from destructive writes, all dependencies are resolved, focused failure tests exist, and rollback is concrete.

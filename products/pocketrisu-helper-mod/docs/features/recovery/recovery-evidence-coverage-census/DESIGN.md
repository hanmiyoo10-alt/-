# RECOVERY-EVIDENCE-COVERAGE-CENSUS

Status: DESIGN_NEEDED
Source evidence: `TripleHwang/RisuVault@47fcb62948d74480c978093400cd58fed18a2a63`

## Problem / evidence

A bounded recovery search can fail semantically even when its I/O bounds work exactly as intended. If some backup candidates are skipped or unreadable, a result such as “not found in any backup” overstates what was actually proven. The source commit fixes a concrete instance by making recovery carry an explicit coverage census and allowing a global-absence conclusion only after complete coverage.

Evidence is MEDIUM for PocketRisu because the source failure and fix are concrete, but a matching PocketRisu multi-candidate repair owner has not yet been identified.

## Minimal safe scope

If PocketRisu later exposes a recovery path that searches more than one candidate, the first production-capable slice should only add read-only evidence accounting and typed result semantics. It must not alter restore selection, write ordering, storage formats, candidate bytes, DB flush behavior, or destructive recovery actions.

Before that, land test-only fixtures that encode the permitted claims for complete and incomplete coverage.

## Ownership boundaries

- Recovery candidate enumerator owns `total` evidence sources that exist.
- Bounded reader/search loop owns `examined`, `unreadable`, and `skipped` accounting.
- Pure result classifier owns which semantic claim a given census licenses.
- UI/logging may render the classified result but must not infer stronger claims from partial fields.
- Destructive restore/apply remains outside this feature boundary.

## Mechanism

Represent recovery coverage with a small immutable record such as:

- `total`
- `examined`
- `unreadable`
- `skipped`

Require the invariant `total === examined + unreadable + skipped` at the result boundary. Keep result reasons distinct, at minimum:

- no candidates exist;
- candidates exist but none were readable/examined;
- target absent from examined candidates with incomplete coverage;
- target absent after complete coverage;
- target found.

Only the complete-coverage state may authorize language or logic equivalent to “absent from all backups.” Count/byte/time budgets must convert omitted work into `skipped`, never into absence evidence. Candidate iteration should not let a single over-budget candidate hide later candidates that are independently affordable unless ordering itself is a documented invariant.

## Compatibility / invariants

- Preserve all existing PocketRisu save/integrity optimizations.
- Do not add forced DB flush on `visibilitychange` or `pagehide`.
- Preserve `flushServerDbKeepalive()` as a no-op unless separately reviewed.
- Do not change storage format, backup format, migration state, or destructive restore semantics in this feature.
- Resource bounds remain hard bounds; better reporting must not become an excuse for unbounded recovery.
- External RisuVault byte, count, timeout, and heap thresholds are evidence only and must not be copied.

## Validation / acceptance

A future matching owner must have focused tests for:

1. no backups;
2. all candidates unreadable;
3. one examined, one unreadable;
4. one examined, one skipped by count budget;
5. one examined, one skipped by byte budget;
6. time budget expires before complete coverage;
7. all candidates examined and target absent;
8. target found in a later candidate;
9. oversized candidate followed by a smaller affordable candidate;
10. invariant failure when accounting does not sum to `total`.

Acceptance requires that only case 7 can produce a global-absence result, while cases 2–6 expose incomplete evidence explicitly. Existing behavior for successful target recovery must remain unchanged.

## Risk / blast radius

Risk is HIGH because recovery wording and automated decisions can influence destructive user actions. The contained first slice is read-only and rollback-safe, but wiring incorrect accounting into restore logic could create false certainty or suppress valid recovery options.

## Rollback / fallback

Keep the classifier and census behind the existing recovery result boundary so the change can be reverted without touching stored data. If census invariants fail at runtime, fail conservatively to an “incomplete/unknown coverage” result rather than a global-absence result.

## Dependencies

- A concrete PocketRisu multi-candidate recovery/repair owner.
- Explicit candidate inventory semantics.
- Existing or newly defined bounded search/decode budgets.
- Regression fixtures covering skipped and unreadable candidates.

Until those exist, remain `DESIGN_NEEDED`.

## PR decomposition

1. Test-only semantic coverage matrix and pure classifier contract.
2. Read-only candidate census plumbing for one real recovery owner.
3. UI/log wording integration, only after the census is proven stable.

Any destructive restore changes, storage migrations, or recovery-source expansion require a separate narrower instruction and review.

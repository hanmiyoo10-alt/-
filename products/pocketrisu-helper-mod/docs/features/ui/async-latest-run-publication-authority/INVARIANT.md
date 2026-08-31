# ASYNC-LATEST-RUN-PUBLICATION-AUTHORITY

Status: `ADOPTED`
Source evidence: `PocketRisu/PocketRisu@ca52464bb5f143196e0d74d15aa12823baee4cf1`

## Problem / evidence

An asynchronous derived-state operation can resolve out of order. In Prompt Diff, an older diff computation could finish after a newer recomputation and overwrite the latest visible result. The adopted PocketRisu fix uses a monotonic generation id and refuses publication from superseded work.

## Minimal safe scope

Keep the invariant local to replaceable derived UI state: diff results, previews, search-like results, and selection-derived computations where only the newest request owns the visible result. Do not generalize it to authoritative writes or persistence acknowledgements.

## Ownership boundaries

- UI component/request initiator owns the current generation/epoch.
- Async worker/helper computes a candidate result but does not independently own publication.
- Publication is allowed only when the captured generation still equals the current generation.
- Persistence/network write completion semantics remain outside this invariant.

## Mechanism

1. Increment a monotonic generation before starting each recomputation.
2. Capture that generation in the async invocation.
3. Await the expensive computation.
4. Re-check ownership before mutating visible result state.
5. If superseded, drop only the derived result publication.

Cancellation may be added for efficiency, but cancellation alone is insufficient unless publication authority is still explicit against races.

## Compatibility / invariants

- Newer user intent always wins over older derived work.
- Out-of-order completion must not restore stale UI state.
- Both success paths in Prompt Diff (flat text and card view) obey the same rule.
- No forced DB flush, save-path change, plugin reload change, service-manager change, Android notification, or persistence behavior is involved.
- Do not discard authoritative write acknowledgements using a UI generation guard.

## Validation / acceptance

- Start generation N, then N+1; resolve N+1 first and N second; assert the visible result remains N+1.
- Repeat for flat-text and card-view diff paths.
- Change mode/input repeatedly and verify no superseded completion can replace current state.
- If the mechanism is extracted into a helper, retain deterministic out-of-order tests.

## Risk / blast radius

Risk is LOW when scoped to derived UI state. The main failure mode is defining the publication owner too broadly and suppressing a result that should remain authoritative.

## Rollback / fallback

Revert the generation guard locally if it blocks valid derived-state publication. No data migration or persistent rollback is required.

## Dependencies

`NONE`.

## PR decomposition

Already adopted in PocketRisu; no autonomous implementation PR is needed. Future reuse should land per feature, one independently tested async-derived-state boundary per branch/PR when practical.

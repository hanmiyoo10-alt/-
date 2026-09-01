# Feature-ID: PLUGIN-STORAGE-CORRUPT-ROW-QUARANTINE

## Status

Adopted PocketRisu invariant; documentation-only handoff boundary.

## Problem / evidence

A server index can continue to list a plugin-storage key whose serialized value is permanently unreadable. If parse failure merely evicts the key from local cache/index state, every periodic index refresh sees it as missing and top-up re-fetches and re-parses the same corrupt bytes indefinitely.

Official PocketRisu commit `167def7df98e8272dcb179a4e8b4451e29e32604` fixes this and adds a regression test proving repeated refreshes do not re-fetch the corrupt row and that a later rewrite restores readability.

## Minimal safe scope

Treat known parse failure as an explicit per-key reconciliation state. Skip automatic top-up for that key until concrete evidence makes retry useful.

## Ownership boundaries

- Server index owns whether a key currently exists remotely.
- Parser owns whether the current serialized value is readable.
- Reconciliation/top-up owns retry scheduling.
- A local quarantine marker may suppress retries, but may not claim the remote key is deleted or permanently invalid.

## Mechanism

1. On parse failure, mark the key `unparseable` and expose it to callers as missing/failed according to the existing API contract.
2. Exclude quarantined keys from periodic missing-key top-up.
3. Clear quarantine on a successful read or successful local write that repairs the value.
4. If a refreshed authoritative index no longer contains the key, drop its quarantine marker; if the key later reappears, it is eligible for a fresh read.

## Compatibility / invariants

- Known corrupt state is not an ordinary cache miss.
- Quarantine is not deletion authority.
- Quarantine is not permanent negative caching.
- Healthy keys continue to refresh/top-up normally.
- Repair through normal write/read paths must immediately restore observability.
- Existing plugin-storage write ordering, rollback-generation, read-your-writes, preload fail-closed, and partial-write merge semantics remain intact.

## Validation / acceptance

Acceptance coverage should prove:

- two or more index refreshes after the first parse failure perform zero additional reads for the quarantined key;
- unrelated healthy keys remain readable;
- successful write/read clears quarantine;
- authoritative removal clears quarantine so a later recreation is retried;
- reset/test teardown clears quarantine state.

## Risk / blast radius

`LOW`. The state is localized and in-memory. Main failure mode is stale quarantine suppressing recovery; explicit invalidation points contain that risk.

## Rollback / fallback

Remove the quarantine optimization and return to ordinary missing-key top-up. This restores prior behavior without changing persisted data, at the cost of retry churn.

## Dependencies

None.

## PR decomposition

No implementation PR is required now because the invariant is already adopted in official PocketRisu. If refactored later, keep the quarantine behavior and its regression tests in the same narrow storage-reconciliation PR.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`

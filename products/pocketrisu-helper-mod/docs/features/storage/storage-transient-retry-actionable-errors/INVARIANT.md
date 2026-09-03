# Feature-ID: STORAGE-TRANSIENT-RETRY-ACTIONABLE-ERRORS

## Problem / evidence

A transient reverse-proxy or network failure should not abort a safe storage operation on the first attempt, but deterministic failures must remain immediate and visible. `PocketRisu/PocketRisu@e57c0435018646800566f2158fd1a9fa12caa9e2` established this boundary and it remains present on current develop.

## Minimal safe scope

Preserve bounded transient retry and actionable typed error propagation in the existing storage wrapper. Do not extend this dossier to model/provider retries or non-idempotent application operations.

## Ownership boundaries

- storage request wrapper owns retry eligibility and attempt cap;
- auth/session layer regenerates per-attempt request credentials as required;
- save aggregation preserves a concrete underlying failure instead of replacing it with a generic message;
- UI/localization may translate known actionable classes such as request-too-large.

## Mechanism

Retry only transient gateway/network failures with jittered bounded backoff. Abort and non-transient responses fail immediately. Preserve structured operation/status/server-message context in a typed error and carry the first concrete cause through aggregated save failure.

## Compatibility / invariants

- retries remain hard-bounded;
- no forced DB flush on lifecycle events;
- `flushServerDbKeepalive()` behavior is unchanged;
- save/integrity optimizations remain intact;
- no PM2 or device/runtime change;
- retry is not generalized to operations without safe duplicate semantics.

## Validation / acceptance

Focused tests should cover transient recovery, network failure retry, hard attempt limit, immediate non-transient/abort behavior, per-attempt request regeneration where required, and concrete save-error propagation.

## Risk / blast radius

Low when confined to the existing storage wrapper. Main failure mode is accidental retry of a non-safe operation or a widened retry predicate.

## Rollback / fallback

Revert the retry wrapper change while retaining typed diagnostics if a regression appears. Deterministic immediate-failure behavior is always the fallback.

## Dependencies / PR decomposition

No current dependency. This is already adopted upstream, so no autonomous implementation PR is needed. Future changes should remain one storage-retry boundary per PR and preserve the tests above.

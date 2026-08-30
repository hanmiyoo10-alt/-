# BOUNDED-BOOTSTRAP-BEST-EFFORT-FETCH

Status: `ADOPTED`
Source: `PocketRisu/PocketRisu@0afc8f9c82b21024cc8f8be672ee322f706dbcce`

## Problem / evidence

Optional boot-time HTTP dependencies can hang indefinitely. When application readiness waits on them, a non-essential reminder or statistics request can strand the user on the loading screen. PocketRisu fixed this by giving the optional boot-reminder and DB-stats requests a finite AbortController-backed wait budget and treating timeout/unreachable failures as a best-effort skip.

## Minimal safe scope

Preserve finite wait budgets only around explicitly optional boot-time enrichment. Do not extend this fail-open contract to required migrations, integrity checks, recovery, authentication establishment, or durable persistence.

## Ownership boundaries

- Browser bootstrap owns readiness/liveness.
- Optional server reminder/stat endpoints provide enrichment only.
- Required initialization remains authoritative and outside this invariant.

## Mechanism

Use a request-scoped abort controller plus timer; clear the timer in `finally`. Optional call sites catch failure and continue bootstrap without the enrichment result.

## Compatibility / invariants

1. An optional endpoint that never settles cannot block application readiness indefinitely.
2. Normal successful responses retain existing behavior.
3. Timeout/abort of optional enrichment does not mutate durable state.
4. Required initialization must not silently inherit the same fail-open semantics.
5. No changes to DB flush behavior, `flushServerDbKeepalive()`, V3 plugin reload, runit, or server-phone notifications.

## Validation / acceptance

- Hanging optional endpoint: readiness proceeds after the configured finite bound.
- Successful endpoint: reminder/stat behavior is unchanged.
- Failed endpoint: optional UI is omitted, no boot failure.
- Timer is cleared on success and failure.
- Regression fixture distinguishes optional enrichment from a required initialization step.

## Risk / blast radius

Low when limited to optional boot requests. The main hazard is accidental generalization to authoritative work, which could hide incomplete migration/recovery.

## Rollback / fallback

A refactor can revert to per-call request wrappers without altering stored data. Never “fix” regressions by removing the finite bound from optional network work.

## Dependencies

None for preservation. A future shared timeout helper must carry an explicit ownership/call-site policy rather than becoming a universal bootstrap fetch wrapper.

## PR decomposition

No implementation PR is needed: this invariant is already adopted. If later refactoring touches it, keep the preservation test and helper refactor in one narrow feature PR.

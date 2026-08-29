# ASYNC-CACHE-LATEST-GENERATION-WINS

Status: `HOLD`

## Problem / evidence

Historical evidence from `PocketRisu-Alter/PocketRisu-Alter@98a96cf2460b3df98869e848b5cc7ab51c7e8a52` shows a detached post-response cache lifecycle race. An older turn's remote cache create/extend could finish after a newer turn had already invalidated or replaced local cache state. A coarse in-flight lock was not sufficient because it could suppress the newest turn instead of preventing stale completion.

The source moved to a per-key generation: bump before the newest turn's synchronous pre-request mutation; detached work captures that generation and may commit only if it is still current. Stale successful creates are explicitly removed as orphans, and staleness is checked before failure policy so an obsolete 403 cannot disable the newest session.

Evidence is external and therefore `MEDIUM` until reproduced in PocketRisu.

## Minimal safe scope

No implementation now. If PocketRisu later owns a comparable provider/context-cache or detached post-response cache mutation path and the overlap race is reproducible, the first slice is:

1. one focused regression test that makes an older async completion resolve after a newer turn has advanced state; and
2. one generation guard scoped to that single owner/key.

Do not introduce a generic cache framework or copy provider-specific credential/session behavior.

## Ownership boundaries

- Owner: the concrete PocketRisu cache/session state machine that launches detached async mutation.
- Remote cache resource ownership: successful stale creates must have an explicit cleanup owner.
- Session/provider/credential identity: must be part of or otherwise constrained by the authoritative cache key where required.
- UI/observability is not authoritative over generation state.

## Mechanism

For a participating logical key, increment an in-memory generation synchronously before the newest turn performs invalidation/replacement mutations. Detached work captures that generation. Before any later local state commit or failure-policy side effect, verify the captured generation is still current.

If a stale remote create succeeded, clean up only the resource created by that stale operation, then return without touching current session state. If a stale operation failed, ignore that stale failure for current-session policy.

## Compatibility / invariants

- Newest participating turn wins over older detached completion.
- A stale success cannot resurrect state invalidated by a newer turn.
- A stale failure cannot disable or otherwise mutate the newest session.
- Cleanup may target only the stale operation's own remote resource.
- Generation scope must not collide across chats/providers/credentials/sessions that are independent.
- Reset/test isolation must not leak generation state between test cases.
- This invariant does not supersede any PocketRisu save/integrity, keepalive, plugin reload, runit, or server-phone notification guardrail.

## Validation / acceptance

Require deterministic tests for:

- older create resolves after newer invalidation;
- older extend resolves after newer replacement/removal;
- stale successful create is orphan-cleaned and does not become current;
- stale 403/error does not disable current/newer session;
- newest operation can still commit normally;
- independent ownership keys do not suppress each other;
- generation runtime reset between tests.

Acceptance requires a reproducible PocketRisu race plus passing focused tests. External evidence alone is not enough to move this item to `READY_TO_PORT`.

## Risk / blast radius

`MEDIUM`. A wrong key or stale check can suppress valid cache updates, resurrect removed state, leak remote cache resources, or apply obsolete credential/session error policy. Provider credential/session semantics are security-sensitive and remain out of scope for autonomous implementation.

## Rollback / fallback

The first implementation slice must be one-owner and easy to revert. If generation gating causes unexpected misses, remove the guard and retain the overlap regression as evidence while investigating ownership. Do not compensate by broadening cache scope or weakening session boundaries.

## Dependencies

- a matching PocketRisu-owned detached provider/context-cache mutation lifecycle;
- direct reproduction or code-level proof that an older completion can mutate newer state;
- explicit ownership key including all required isolation dimensions;
- explicit stale-success cleanup mechanism.

## PR decomposition

1. Reproduction test only, if practical.
2. One-owner generation guard + stale-success cleanup.
3. Optional observability/metrics only if independently justified.

One feature per PR; no unrelated cleanup.

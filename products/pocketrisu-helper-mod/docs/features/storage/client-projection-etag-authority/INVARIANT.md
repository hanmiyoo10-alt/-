# CLIENT-PROJECTION-ETAG-AUTHORITY

Status: `ADOPTED`

## Problem / evidence

PocketRisu can keep a richer server-internal database representation than the client-visible representation served by `/api/read`, because chats and lazy manifest-backed fields may be stripped/projected before crossing the boundary. In `PocketRisu/PocketRisu@97cdd7a552053cda598ada4eae355b1b052f4705`, the lazy-asset-manifest merge explicitly changed `/api/write` so the persisted ETag is computed from the client view, matching what the next `/api/read` serves. The same merge centralized cold-load stripping and stopped re-stripping warm cache state.

## Invariant

The authoritative optimistic-concurrency identity for a client-visible database must be derived from the same canonical client projection that read APIs expose. A richer internal hydrated/cache representation must not silently define a different ETag for the same logical client state.

Projection/normalization must also have one clear ownership boundary: cold load may normalize persisted state into the canonical cache form, while warm reads must not repeatedly apply a transform whose side effects can reactivate superseded manifests or other side-channel state.

## Compatibility / ownership

- Server internal state may remain richer than the client view.
- Lazy chats/assets/plugin data may remain separately persisted or hydrated.
- ETag comparison remains an optimistic-concurrency mechanism, but both writer publication and subsequent reader observation must agree on the representation being hashed.
- This invariant complements, rather than replaces, current revision/ETag freshness rules after side-channel writes.
- Existing PocketRisu save/integrity optimizations and `flushServerDbKeepalive()` behavior remain unchanged.

## Validation / acceptance

1. A successful write of client projection `P` publishes ETag `E(P)`.
2. The immediately following canonical read of unchanged state returns the same logical projection and ETag.
3. Server-only hydrated fields do not make the read ETag diverge from the write-published ETag.
4. Cold cache load performs required stripping/normalization through one canonical path.
5. Warm reads do not re-strip/rewrite cached state in a way that can resurrect superseded manifest identities.
6. Side-channel manifest/plugin edits still participate in the existing revision/freshness rules.

## Risk / blast radius

Risk is `MEDIUM`: a wrong projection identity can cause false precondition failures, stale overwrite confusion, or cache/manifest state drift, but the invariant is bounded to persistence projection and optimistic-concurrency semantics.

## Rollback / fallback

For future changes, revert to the last known canonical projection/hash path as one unit. Do not independently roll back only the read projection or only the ETag calculation if that would make them disagree.

## Dependencies / PR decomposition

Dependencies: `NONE` for preserving the already-adopted invariant. Future storage changes should keep projection definition, read normalization, write ETag publication, and regression tests in the same feature boundary or explicitly prove compatibility across decomposed PRs.

## Source

- `PocketRisu/PocketRisu@97cdd7a552053cda598ada4eae355b1b052f4705`

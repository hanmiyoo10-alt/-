# SNAPSHOT-SOURCE-EXISTENCE-AUTHORITY

Status: `ADOPTED` invariant reference
Source: `PocketRisu/PocketRisu@a838a95781993d342c96fa36fa3bb87bd2a035d5`

## Problem / evidence

A fresh install may not have an authoritative database payload yet. Before `a838a957`, the snapshot path could silently skip copying the absent database while still publishing plugin-storage snapshot metadata. That created an orphan companion map for a snapshot payload that never existed.

This is a correctness boundary, not merely cleanup hygiene: repair-by-GC is weaker than refusing to publish an invalid snapshot identity.

## Minimal safe invariant

1. Check that the authoritative snapshot payload exists before publishing a snapshot identity or any companion metadata.
2. Missing source means “no snapshot was created,” not “empty successful snapshot.”
3. Payload identity and all required companion metadata must be published atomically or remain absent together.
4. Tests should assert relational identity, not timing-dependent counts: every listed snapshot has exactly the required companion record(s), and no companion-only snapshot identity exists.
5. Preserve intentional rate-limit/cooldown semantics independently from publication success if that behavior is part of the existing contract.

## Ownership boundaries

- Server backup/snapshot coordinator owns whether a snapshot attempt may publish.
- Low-level KV/blob copy helpers may report or encode source absence, but their silent no-op behavior must never be treated as proof that a snapshot exists.
- Plugin-storage or future sidecar snapshot domains are companions to the primary snapshot identity, not independent authorities.
- GC is a last-resort repair mechanism and must not be relied upon as normal consistency enforcement.

## Compatibility / PocketRisu guardrails

- No OS/runtime/service changes.
- Does not alter `flushServerDbKeepalive()` behavior.
- Does not reintroduce visibility/pagehide flushes.
- Does not change targeted V3 plugin reload behavior.
- Does not affect runit or server-phone notification policy.
- Snapshot/import compatibility remains unchanged except that impossible half-snapshots are no longer published.

## Validation / acceptance

- Fresh install with no `database/database.bin`: snapshot attempt creates no database snapshot and no companion snapshot map.
- Normal existing database: snapshot and required companion metadata appear together.
- Enumerated snapshot identities equal companion-map identities for domains that require one-to-one mapping.
- Timing differences between closely spaced snapshot calls do not make tests flaky; assertions are identity/invariant-based.
- GC should find no new orphan companion rows from the guarded path.

## Risk / blast radius

Risk is `MEDIUM`: snapshot and restore correctness are persistence-sensitive, but the adopted fix is narrow and fail-closed. A wrong existence check could suppress valid snapshots; a wrong companion relationship could make restore incomplete.

## Rollback / fallback

If a future refactor cannot prove atomic publication, prefer skipping the snapshot and reporting/recording the failure over creating partial state. Reverting to companion-first publication is not an acceptable fallback.

## Dependencies

`NONE` for preserving the existing invariant. Any new snapshot domain must explicitly define whether it is required companion state and join the same publication boundary.

## PR decomposition for future changes

1. Add/retain invariant tests for source absence and snapshot↔companion identity correspondence.
2. Refactor snapshot coordinator while keeping those tests green.
3. Add new companion domains one at a time with explicit atomicity and restore tests.

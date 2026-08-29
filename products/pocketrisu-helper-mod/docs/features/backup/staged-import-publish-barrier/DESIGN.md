# Feature-ID: STAGED-IMPORT-PUBLISH-BARRIER

## Status

- Lifecycle: `DESIGN_NEEDED`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu-owned backup/import publish boundary; current format/key-authority inventory; failure-atomicity tests across malformed/decryption/parse failures
- Priority: `P1`

## Problem / evidence

`rpaddict/RisuBard` commit `9a8a02f2a0610cc58cc257de4007721c077dfed7` adds an upstream-account-backup compatibility path whose key safety property is independent of the specific AES format: encrypted or otherwise transformed input is staged, decoded/validated completely, and only then allowed to replace the active KV revision. The source plan explicitly calls out the prior failure mode where an undecodable import could leave the active database broken.

This is credible external code-level evidence, but it is not yet a reproduced PocketRisu bug. PocketRisu's current import/restore ownership and authority boundaries must be inspected before any implementation.

## Minimal safe scope

The first PocketRisu slice, if justified, should be a publish-barrier invariant rather than format expansion:

1. identify one existing backup/import path that can replace durable active state;
2. stage candidate bytes/state outside the active revision;
3. perform all deterministic decode/schema/integrity checks required by the current PocketRisu format;
4. publish only after validation succeeds;
5. prove malformed input leaves the prior active revision byte-for-byte or semantically unchanged.

Do **not** add new credential fetches, account-key protocols, encryption formats, or migrations in this slice.

## Ownership boundaries

- **Import/restore parser:** may decode and validate staged candidate state, but must not mutate active durable state while validation is incomplete.
- **Durable storage publisher:** is the sole owner allowed to swap/replace the active revision after a validated candidate is available.
- **Credential/key boundary:** out of scope for autonomous implementation; source-specific account-key retrieval is evidence only.
- **UI/progress layer:** reports validation/publish failure but is never authority for whether state is safe to publish.

## Proposed mechanism

Introduce or verify a two-phase flow around the matching PocketRisu owner:

`receive -> stage -> decode/validate -> build publish candidate -> atomic/serialized publish`

Validation failure must terminate before the publish boundary. Cleanup of staging artifacts must be best-effort and must not change the success/failure semantics of the active revision. If the existing storage layer exposes revision/ETag identity, the publish step should use that existing authority rather than creating a parallel one.

## Compatibility / invariants

- malformed, truncated, unsupported, or wrongly transformed inputs never replace the last known-good active database;
- existing PocketRisu save/integrity optimizations remain intact;
- no forced DB flush on `visibilitychange` / `pagehide`;
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed;
- targeted V3 plugin reload remains unchanged;
- no PM2; runit remains the service manager;
- no server-phone Android notifications;
- external encryption/key-fetch semantics are not copied without a separate security review;
- a staging area is not automatically authoritative and must not become deletion/migration authority on its own.

## Validation / acceptance

Before `READY_TO_PORT`, obtain a concrete PocketRisu owner and add focused tests covering:

1. valid import publishes successfully;
2. malformed decoded payload fails before publish and preserves the old active revision;
3. truncated/corrupt staged input preserves the old active revision;
4. transform/decryption-equivalent failure, if such a current PocketRisu transform exists, preserves the old active revision;
5. publish failure does not leave a partially selected new revision;
6. retry after a failed staged import still reads the original good state;
7. staging cleanup failure cannot convert a failed validation into a publish or corrupt the current revision.

Acceptance requires explicit evidence that every failure path before publish leaves the active state unchanged and that rollback is simply discarding the candidate/staging state.

## Risk / blast radius

Risk is `HIGH` because a wrong implementation sits directly on backup/restore persistence and can destroy or replace durable user data. Even a small diff can have broad blast radius. New parser, crypto, credential, or storage-migration work is outside autonomous implementation gates.

## Rollback / fallback

The design must be revertable to the current PocketRisu import path without data migration. A candidate implementation must keep the previous active revision untouched until the final publish step, so operational fallback is to discard staging and continue serving the previous revision.

## Dependencies

1. locate the actual PocketRisu import/restore path that can replace active durable state;
2. inventory current validation, revision identity, and publish semantics;
3. determine whether current tests already prove failure atomicity;
4. reproduce a concrete malformed-import mutation risk or show a missing invariant test;
5. resolve any credential/parser/security implications before implementation.

## PR decomposition

- **PR 1 (preferred first slice):** failing regression tests demonstrating the current publish-boundary invariant or exposing a concrete gap; no new formats.
- **PR 2:** minimal staging/publish-barrier fix for one existing path, only if PR 1 proves the gap and all dependencies are resolved.
- **Later separate PRs:** any new encryption/account-backup compatibility, credential retrieval, schema migration, or generalized restore architecture. These require explicit narrower review and are not autonomous implementation candidates.

# BACKUP-INTEGRITY-READINESS-VERIFIER

Status: assistant-owned design draft
Lifecycle target: `DESIGN_NEEDED`

## Problem / evidence

Historical evidence: `InoriNatsume/RisuVault@1d0d352fa6d93ba88629e30089bf38accf2c0fd5` added a separate read-only `verify` primitive and required it to succeed before commit/publish. The verifier independently checks several persistence invariants and fails closed when they disagree.

PocketRisu has strong save/ETag/asset/backup guardrails, but this pass did not identify one explicit owner whose contract is “prove this backup/export candidate is internally ready before it is blessed.” The useful pattern is therefore an invariant boundary, not the source encryption/storage implementation.

## Minimal safe scope

First production-capable slice, only if the matching PocketRisu owner is confirmed:

1. add a pure/read-only verification result type;
2. inspect only already-authoritative PocketRisu state/artifact metadata;
3. return structured violations without repairing anything;
4. gate only the single backup/export success boundary being tested;
5. no storage format, runtime, package, device, service-manager, or migration change.

Before production code, add failing tests that construct an incoherent candidate and prove rejection.

## Ownership boundaries

- backup/export entry point: owns when verification is invoked;
- persistence/asset owners: expose read-only facts only; verifier must not seize write ownership;
- verifier: combines facts into a readiness decision, never writes or repairs;
- UI/CLI caller: presents violations and leaves recovery action explicit;
- server/client split: keep existing authority; do not introduce a new cross-device credential/session boundary.

## Proposed mechanism

Define a small `verifyBackupReadiness(...) -> VerificationResult`-style contract whose checks are derived from actual PocketRisu invariants. Candidate checks may include:

- referenced durable entities/assets exist;
- manifest/revision/ETag relationships are self-consistent for the chosen export authority;
- any pending-write condition required by the existing export path is explicitly surfaced rather than silently ignored;
- candidate artifact metadata agrees with the state it claims to represent.

The verifier must be independently readable/testable and should avoid calling mutation/flush/repair functions internally.

## Compatibility / invariants

Must preserve:

- no forced DB flush on `visibilitychange` / `pagehide`;
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed;
- current save/integrity optimizations and ETag semantics;
- targeted V3 plugin reload;
- runit; never PM2;
- no Android notification on the server phone;
- external Risu variants are evidence, not authority.

The verifier must not import RisuVault's SQLCipher/AES/HMAC/Argon2/filesystem layout or require any host/runtime migration.

## Validation / acceptance

Acceptance requires:

- a clean current PocketRisu backup/export candidate passes;
- a deliberately missing referenced entity/asset is rejected when that invariant is authoritative;
- a deliberately incoherent revision/manifest candidate is rejected when relevant;
- verifier performs zero durable writes and zero repair actions;
- a false-positive regression suite covers optional/legacy states that are valid;
- failure message is actionable enough to distinguish “retry after existing pending work” from “state is inconsistent”; no guessing/overwrite;
- focused tests pass against current PocketRisu invariants.

## Risk / blast radius

Risk is `MEDIUM`: read-only logic is contained, but a bad predicate can either bless a broken artifact (false negative) or prevent legitimate backup/export (false positive). Keep the gate narrow and architecture-derived.

## Rollback / fallback

Single-feature rollback: remove the readiness gate and verifier call, restoring the existing backup/export path unchanged. Because the verifier is read-only and introduces no format changes, rollback must not require data migration.

## Dependencies

- map the exact PocketRisu backup/export authority;
- inventory existing integrity checks to avoid duplicate or contradictory truth sources;
- define which pending-write facts are authoritative for export;
- add explicit false-positive and false-negative test fixtures.

## PR decomposition

1. test-only reproduction + invariant inventory;
2. pure read-only verifier and structured result;
3. narrow integration at one backup/export success boundary;
4. optional diagnostics UX only after the contract is stable.

Do not combine this with `BACKUP-SNAPSHOT-DURABLE-STORE-BARRIER` implementation. If both proceed, the barrier should run before snapshot materialization and the verifier should validate readiness/coherence at the blessing boundary; keep responsibilities distinct in code even if one design/PR series coordinates them.

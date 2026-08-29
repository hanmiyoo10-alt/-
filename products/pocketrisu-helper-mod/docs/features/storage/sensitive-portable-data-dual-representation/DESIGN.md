# SENSITIVE-PORTABLE-DATA-DUAL-REPRESENTATION

Status: `DESIGN_NEEDED`

## Problem / evidence

`InoriNatsume/RisuVault` commit `d602bf8d268078a8d425432a217a8bdb12ffdf20` demonstrates a split between encrypted durable/shareable files and a plaintext gitignored working area for vault-wide references. The source also documents that filenames remain public metadata. This is credible evidence for the representation-boundary pattern, not evidence that PocketRisu currently needs the same feature.

No matching PocketRisu-owned encrypted portable/reference-data owner was established in the bounded inspection. Treat this dossier as a reusable security/storage design boundary until a concrete PocketRisu requirement appears.

## Minimal safe scope

Do not begin with encryption or migration code. First slice, if ever activated, is read-only design validation:

1. identify the exact PocketRisu data class that needs portable encrypted representation;
2. write the threat model and source-of-truth contract;
3. define a versioned record envelope and metadata-leakage policy without persisting user data;
4. add format/round-trip fixtures and failure-case tests against synthetic data only.

Persistent mutation, key creation, migration, deletion, or automatic sync is explicitly outside the first slice.

## Ownership boundaries

- Browser/client: may request or display explicitly authorized plaintext; must not become silent durable plaintext authority.
- Shared application code: owns representation/version contracts only if runtime-neutral and testable.
- Server/storage: owns durable encrypted bytes, atomic replacement, conflict detection, and recovery semantics when applicable.
- Key material: separate security boundary; never infer key lifetime from data lifetime.
- Export/backup/source-control surfaces: transport encrypted form only unless the user explicitly requests plaintext export.

## Proposed mechanism

Use two explicit representations only after a real owner is proven:

- durable encrypted representation with a versioned envelope, authenticated encryption, stable identity, and explicit metadata policy;
- transient/local plaintext representation with a narrower lifetime and no implicit authority over durable deletion.

Do not copy the source's `refs-sync` behavior literally. Absence from the plaintext side must not imply deletion unless the operation is explicitly destructive, the plaintext set is proven complete/current, and conflict checks pass. Prefer an explicit manifest/revision identity and compare-before-replace semantics.

## Compatibility / invariants

- Existing PocketRisu save/integrity paths remain authoritative unless a separately reviewed migration changes that.
- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve targeted V3 plugin reload.
- Keep runit; no PM2.
- Server phone creates no Android notifications.
- Encryption must provide integrity/authentication, not confidentiality-only storage.
- Filenames, counts, sizes, timestamps, and repository history are metadata and must be threat-modeled separately.
- Wrong key, corrupt/truncated ciphertext, stale local plaintext, or partial writes must fail closed without overwriting newer durable data.
- Plaintext lifetime, file permissions, cleanup, crash residue, and temporary-file behavior must be explicit.
- Key rotation/recovery cannot silently orphan data.

## Validation / acceptance

Before promotion to `READY_TO_PORT`, require all of the following:

- concrete PocketRisu user/data owner and demonstrated need;
- written threat model covering attacker access to repo/storage, local disk, process memory, and metadata;
- explicit key derivation, storage, rotation, recovery, and loss behavior;
- versioned encrypted envelope with authenticated corruption detection;
- synthetic round-trip tests;
- wrong-key and corrupted/truncated-blob tests;
- interrupted-write and stale-revision tests;
- clone/restore behavior tests;
- metadata-leakage review;
- non-destructive conflict tests proving a missing/stale plaintext view cannot delete newer encrypted data;
- rollback that disables the feature without making existing encrypted data unreadable.

Acceptance is not 'encryption works'; it is preservation of confidentiality/integrity/availability and recovery semantics under failure.

## Risk / blast radius

`Risk: HIGH`. A bad design can lose data, strand encrypted content, leak sensitive metadata/plaintext, or create false confidence in confidentiality. Automatic bidirectional sync is especially dangerous because stale views can become destructive authority.

## Rollback / fallback

Until migration is explicitly approved, keep existing PocketRisu storage untouched. Any experimental reader must be additive and read-only. If a future writer is introduced, retain the previous durable representation until the new write is authenticated, atomically committed, re-read, and verified. Key rotation must preserve the previous decryptable generation until completion is verified.

## Dependencies

- matching PocketRisu-owned sensitive portable/reference-data boundary;
- explicit threat model;
- key lifecycle and recovery design;
- metadata leakage policy;
- authoritative-side/conflict contract;
- atomic write/recovery guarantees;
- test strategy proving non-destructive sync semantics.

## PR decomposition

1. Design/threat-model + synthetic format fixtures only.
2. Read-only parser/validator for the versioned encrypted envelope, if needed.
3. Isolated writer with atomic replace and revision checks, still no migration.
4. Explicit opt-in import/export flow.
5. Migration or automatic synchronization only under separate user authorization and review.

Because this is security-sensitive storage work, steps 2-5 are not authorized by the current autonomous implementation gate.

## Source reference

- `InoriNatsume/RisuVault@d602bf8d268078a8d425432a217a8bdb12ffdf20`
- `src/primitives/refs-sync.ts`
- `src/primitives/refs-pull.ts`

# SimCore Release System v2 — RS2-2C Target Document Mapping & Write-Safety Migration

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
Authority foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
Phase: `RS2-2 — State Synchronization`
Subphase: `RS2-2C — Target Document Mapping & Write-Safety Migration`
Authority class: release-infrastructure design / target ownership migration contract

---

## 1. Purpose

RS2-2C freezes the exact first document mappings and the ownership-transfer mechanics that allow the future `sync-state.mjs` tool to replace regex-driven document synchronization without becoming a release authority or a whole-document generator.

The concrete questions are:

```text
Which exact files are writable?
Which exact byte spans are writable?
Which manifest fields may influence each span?
What exact rendered bytes are expected?
How are current legacy markers converted?
How is the unmarked Guidelines baseline enrolled?
Who owns each target before, during, and after cutover?
How is the old writer prevented from racing the new writer?
How is rollback performed without dual ownership?
```

RS2-2C freezes those answers.

It does **not** implement the sync tool, change SimCore runtime behavior, update `release-simcore`, repair the currently stale manifest, create permanent CI, redesign the permanent release transaction, or retire the legacy release-state path.

---

## 2. Current repository evidence

### 2.1 `CURRENT_DEVELOPMENT.md` already has a legacy managed span

Current main contains:

```text
<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `...`
- Release: `...`
- Release branch: `release-simcore`
- Release commit: `...`
- Release blob: `...`
- Validation status: `...`
- Primary optimization target: `...`
- Provider cache: `...`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->
```

This is already a bounded writer surface, but it predates the canonical RS2 marker namespace and includes fields that RS2-2A intentionally did not authorize as generated current-action authority.

### 2.2 `SIMCORE_GUIDELINES.md` has a version baseline but no managed markers

Current main contains a durable section equivalent to:

````text
## 44. Current Production Baseline

Current production family at the time this document was created:

```text
SimCore vX.Y.Z — Release Name
```

Do not treat this number as permanently current; update this section when production advances.
````

The baseline line is currently updated by a broad regex in the legacy sync script.

That is too implicit for RS2-2 steady-state ownership.

### 2.3 The legacy sync script currently owns three different things

`scripts/simcore-sync-memory.py` currently:

```text
1. mutates product-manifest.json from workflow environment values
2. replaces CURRENT_DEVELOPMENT legacy production snapshot
3. regex-updates the Guidelines production baseline
```

It also contains historical compatibility behavior for old version-specific document migrations.

Therefore the legacy script currently mixes:

```text
release declaration
+ document generation
+ historical migration compatibility
```

### 2.4 The current release-state workflow is already the outer orchestrator

`.github/workflows/simcore-release-state-sync.yml` currently:

```text
resolves release-simcore commit/blob identity
materializes latest.js/install.js
checks syntax and equality
extracts version/release name
invokes simcore-sync-memory.py
commits product-manifest + two docs
uses repo-main-write.py to land the bounded payload on latest main
```

RS2-2C therefore does not invent a second GitHub/main-write mechanism.

### 2.5 Current identity drift remains a real cutover precondition

At this design point:

```text
product-manifest.json
production_version = 0.64.3
release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf
release_blob        = ff481aa904340b844ef29b0d89aa20bd6286286d
```

while `release-simcore` currently resolves to:

```text
version        = 0.64.6
release commit = 47969d24771f6cc188df6e32150fc6fde519182d
latest blob    = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

This remains:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

The drift is useful negative evidence for the new verifier.

It is **not** permission for the new renderer to auto-heal the manifest.

---

## 3. Frozen design principles

```text
one target span -> one active writer
one generated fact -> one explicit source field
one marker spelling -> one registered meaning
no arbitrary regex target discovery
no human reasoning generation
no release identity guessing
no manifest self-heal
no dual-write transition
no whole-document rewrite
no runtime/release-simcore mutation
```

The cutover is a transfer of ownership, not a period in which both systems write the same bytes.

---

## 4. Exact initial target registry

The first permanent registry contains exactly two targets.

Directional path:

```text
products/simcore/state-sync/target-registry.json
```

Frozen logical content:

```json
{
  "registryVersion": 1,
  "targets": [
    {
      "id": "current-development-production-snapshot",
      "path": "docs/CURRENT_DEVELOPMENT.md",
      "blockId": "PRODUCTION_SNAPSHOT",
      "renderer": "current-development-production-snapshot-v1",
      "markerProfile": "canonical-v1",
      "lineEnding": "LF",
      "sourceFields": [
        "product",
        "production_version",
        "release_name",
        "release_branch",
        "release_commit",
        "release_blob",
        "validation_status",
        "major_update_milestone",
        "major_update_phase",
        "major_update_checkpoint"
      ]
    },
    {
      "id": "guidelines-production-baseline",
      "path": "docs/SIMCORE_GUIDELINES.md",
      "blockId": "PRODUCTION_BASELINE",
      "renderer": "guidelines-production-baseline-v1",
      "markerProfile": "canonical-v1",
      "lineEnding": "LF",
      "sourceFields": [
        "production_version",
        "release_name",
        "release_commit"
      ]
    }
  ]
}
```

No other document is initially writable by `sync-state`.

The initial registry explicitly excludes evidence/watch/plan documents, architecture documents, historical diagnostics, README files, and runtime source.

Adding any third target is a reviewed mapping change, not automatic discovery.

---

## 5. Canonical marker strategy

RS2-2C chooses **canonical-only steady-state markers**.

Final markers are:

```text
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->
```

and:

```text
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->
```

### 5.1 Legacy marker policy

The historical markers:

```text
<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->
```

are migration-source markers only.

They are **not** accepted as a permanent alias by the final target registry.

Permanent alias support would leave two spellings for one authority and enlarge the parser surface forever.

### 5.2 Ordinary sync-state never renames markers

The standard CLI remains:

```text
--check
--render
--write
```

Ordinary `sync-state --write` may replace bytes inside registered canonical spans.

It may not rename legacy markers or enroll an unmarked document.

Marker enrollment is a one-time repository migration operation owned by RS2-2C implementation.

---

## 6. Shared source-field validation

Before rendering either target, values must satisfy bounded presentation-safe validation in addition to the identity verification from RS2-2B.

Initial rules:

```text
product
  exact value: SimCore

production_version
  one line
  semantic-version-compatible token
  no control characters
  max 64 bytes

release_name
  one line
  no CR/LF
  no backtick
  no control characters
  max 160 bytes

release_branch
  exact expected value: release-simcore

release_commit
  current repository object format: 40 lowercase hexadecimal characters

release_blob
  current repository object format: 40 lowercase hexadecimal characters

validation_status
  one line
  uppercase ASCII token / underscore / digit compatibility form
  max 80 bytes
  rendered literally; never semantically promoted

major_update_milestone
major_update_phase
major_update_checkpoint
  one line
  bounded safe token
  no Markdown control payload
  max 80 bytes each
```

Unsafe input is not heuristically escaped.

It fails closed as:

```text
RENDER_INPUT_INVALID
```

---

## 7. `CURRENT_DEVELOPMENT` exact mapping

Target:

```text
docs/CURRENT_DEVELOPMENT.md
```

Block:

```text
PRODUCTION_SNAPSHOT
```

Renderer:

```text
current-development-production-snapshot-v1
```

### 7.1 Exact renderer shape

```text
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `X.Y.Z`
- Release: `Release Name`
- Release branch: `release-simcore`
- Release commit: `<commit-sha>`
- Release blob: `<blob-sha>`
- Declared validation status: `<validation-status>`
- Major update milestone: `<milestone>`
- Major update phase: `<phase>`
- Major update checkpoint: `<checkpoint>`

This block is machine-managed from verified declared release state. It does not determine the immediate next action.
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->
```

The rendered block uses LF. The surrounding file retains its own final-newline behavior.

### 7.2 Exact field mapping

```text
Product                     <- manifest.product
Version                     <- manifest.production_version
Release                     <- manifest.release_name
Release branch              <- manifest.release_branch
Release commit              <- manifest.release_commit
Release blob                <- manifest.release_blob
Declared validation status  <- manifest.validation_status
Major update milestone      <- manifest.major_update_milestone
Major update phase          <- manifest.major_update_phase
Major update checkpoint     <- manifest.major_update_checkpoint
```

The production identity record is a verification input, not a second text source.

### 7.3 Deliberately removed generated fields

The old generated block includes:

```text
Primary optimization target
Provider cache
```

The v1 renderer excludes both.

`current_priority` must not become immediate-action authority.

`provider_cache_status` is not part of the RS2-2A initial snapshot allowlist and remains evidence-sensitive.

Exclusion is intentional, not accidental data loss.

### 7.4 Human text remains outside machine authority

The renderer must never rewrite later sections such as:

```text
Production verdict
Current Validation Release prose
live close gates
FIX/WATCH/DEFER/BLOCKER classifications
next-release reasoning
M2/M3 promotion decisions
historical release sections
hard freezes
unknowns
```

Even if human prose becomes stale, normal `sync-state --write` leaves it untouched.

---

## 8. `SIMCORE_GUIDELINES` exact mapping

Target:

```text
docs/SIMCORE_GUIDELINES.md
```

Block:

```text
PRODUCTION_BASELINE
```

Renderer:

```text
guidelines-production-baseline-v1
```

### 8.1 Exact renderer shape

The managed span emits exactly:

````text
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->
```text
SimCore vX.Y.Z — Release Name
Release commit: <commit-sha>
```
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->
````

The `## 44. Current Production Baseline` heading and explanatory paragraphs remain human-owned outside the managed span.

### 8.2 Exact field mapping

```text
X.Y.Z        <- manifest.production_version
Release Name <- manifest.release_name
commit-sha   <- manifest.release_commit
```

No validation status, current priority, provider cache state, milestone, live gate, or next action belongs in the Guidelines generated state.

### 8.3 Why the commit is included

A version string alone is insufficient identity when a same-version production correction can replace the release commit.

The current v0.64.6 line demonstrates this class of update.

Therefore the minimal Guidelines baseline carries:

```text
version
release name
release commit
```

It still does not become a full release record.

---

## 9. Machine-owned vs human-owned bytes

After cutover:

```text
CURRENT_DEVELOPMENT
  canonical PRODUCTION_SNAPSHOT span -> machine-owned
  everything else                    -> human-owned

SIMCORE_GUIDELINES
  canonical PRODUCTION_BASELINE span -> machine-owned
  everything else                    -> human-owned
```

For each registered target:

```text
prefix bytes before BEGIN  unchanged
suffix bytes after END     unchanged
```

For normal sync runs, marker lines themselves are stable.

Only body bytes between canonical markers may differ.

---

## 10. One-time migration — `CURRENT_DEVELOPMENT`

### 10.1 Migration source requirement

Before migration, exactly one legacy pair must exist and zero canonical `PRODUCTION_SNAPSHOT` pairs must exist.

Otherwise:

```text
MIGRATION_SOURCE_AMBIGUOUS
```

and no migration write is allowed.

### 10.2 Migration transform

```text
1. replace legacy BEGIN with canonical BEGIN
2. replace legacy END with canonical END
3. replace only the previously bounded legacy span body with renderer-v1 output
4. leave every byte before old BEGIN and after old END unchanged
```

The heading remains inside the managed span.

This preserves the historical span boundary rather than moving structural text during migration.

### 10.3 Required proof

Let:

```text
OLD_PREFIX = bytes before legacy BEGIN
OLD_SUFFIX = bytes after legacy END
NEW_PREFIX = bytes before canonical BEGIN
NEW_SUFFIX = bytes after canonical END
```

Migration must prove:

```text
OLD_PREFIX == NEW_PREFIX
OLD_SUFFIX == NEW_SUFFIX
```

---

## 11. One-time migration — `SIMCORE_GUIDELINES`

Guidelines has no historical marker, so enrollment requires a stricter anchor proof.

### 11.1 Required unique anchor

Migration accepts exactly one structural sequence:

````text
## 44. Current Production Baseline

<existing human explanatory paragraph>

```text
<exactly one current baseline line>
```

<existing human explanatory paragraph>
````

The implementation must use an explicit bounded parser/anchor contract.

It may not search the whole file for the first `SimCore v` string and wrap it.

### 11.2 Migration transform

```text
1. insert canonical BEGIN immediately before the existing baseline code fence
2. insert canonical END immediately after that code fence
3. replace only the newly enrolled managed span with renderer-v1 output
4. preserve heading and surrounding explanatory paragraphs byte-identically
```

### 11.3 Required proof

Define insertion points around the pre-migration baseline code fence.

Then prove:

```text
all bytes before insertion point A are identical
all bytes after insertion point B are identical
```

The migration report stores hashes/lengths and anchor results, not the full Guidelines body.

### 11.4 Ambiguity handling

If multiple candidate baseline regions exist or the expected section shape is absent:

```text
MIGRATION_SOURCE_AMBIGUOUS
```

No best-effort insertion is permitted.

---

## 12. Migration is not an ordinary sync run

Marker enrollment is a repository-schema migration for documentation ownership.

It happens in an explicit infrastructure work branch/PR.

It is never triggered merely because `sync-state --write` encounters a legacy or unmarked target.

Normal behavior there is fail-closed:

```text
MARKER_MISSING
or
MARKER_UNSUPPORTED
```

This prevents routine releases from silently expanding document authority boundaries.

---

## 13. Current drift must be repaired before ownership cutover

The existing 0.64.3 manifest vs 0.64.6 production mismatch blocks activation of the new writer.

Before cutover, these must agree:

```text
manifest declaration
resolved release-simcore identity
latest/install local blobs
source version/release marker
```

The new tool may demonstrate drift but may not repair the declaration itself.

Required administrative precondition:

```text
existing authoritative release-state path
or explicit bounded administrative state sync
→ bring manifest declaration into agreement with deployed production
```

Only after that independent repair may ownership cutover claim `IDENTITY_VERIFIED`.

---

## 14. Ownership state machine

RS2-2C freezes four operational states:

```text
LEGACY_ACTIVE
→ SHADOW_VERIFIED
→ CUTOVER_READY
→ SYNC_STATE_ACTIVE
```

Rollback is explicit:

```text
SYNC_STATE_ACTIVE
→ CUTOVER_REVERTED
→ LEGACY_ACTIVE
```

There is no `DUAL_WRITE` state.

### 14.1 `LEGACY_ACTIVE`

```text
product-manifest.json                      legacy release-state script/workflow
CURRENT_DEVELOPMENT production snapshot    legacy sync script
GUIDELINES production baseline             legacy sync script
main integration                           repo-main-write.py
release-simcore                             existing release authority
```

### 14.2 `SHADOW_VERIFIED`

Authority remains unchanged.

The new tool may run `--check`/`--render` against fixtures or a candidate migration worktree.

It must not write the active main-owned document spans.

### 14.3 `CUTOVER_READY`

Required:

```text
source identity clean
RS2-2B implementation self-tests PASS
canonical migration candidate exact
registry exact
both renderers golden-tested
unmanaged-byte migration proof PASS
new writer idempotence PASS on candidate worktree
legacy/new active-writer exclusivity verified
rollback patch available
runtime diff NONE
release-simcore diff NONE
```

### 14.4 `SYNC_STATE_ACTIVE`

```text
product-manifest.json                      transitional legacy declaration owner
CURRENT_DEVELOPMENT PRODUCTION_SNAPSHOT    sync-state only
GUIDELINES PRODUCTION_BASELINE             sync-state only
all other doc prose                        human only
main integration                           repo-main-write.py
release-simcore                             existing release authority
```

The legacy full document writer is not active in this state.

---

## 15. Transitional manifest declaration problem

RS2-2 cannot simply stop calling `simcore-sync-memory.py` because that script currently also advances the manifest declaration after a release.

The new renderer is intentionally forbidden from doing so.

Therefore a temporary split is required until RS2-4 replaces the release transaction:

```text
legacy compatibility path may still DECLARE manifest identity
new sync-state exclusively RENDERS registered document blocks
```

This is temporary release infrastructure, not the RS2-4 permanent release model.

---

## 16. Legacy script mode split

RS2-2C freezes the future transitional interface for:

```text
scripts/simcore-sync-memory.py
```

It becomes explicit-mode only during cutover.

Allowed compatibility modes:

```text
--manifest-only
--legacy-full
```

No implicit default mode is accepted after cutover implementation.

### 16.1 `--manifest-only`

May perform only existing release declaration behavior needed before RS2-4:

```text
read VERSION
read RELEASE_NAME
read RELEASE_COMMIT
read RELEASE_BLOB
load product-manifest.json
update existing release identity declaration fields
preserve explicitly defined compatibility fields
write product-manifest.json
```

It must not open/write:

```text
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

### 16.2 `--legacy-full`

Preserves the old combined behavior only as a rollback compatibility path.

It must never be invoked by the primary workflow while `SYNC_STATE_ACTIVE` is true.

```text
new doc writer enabled
→ legacy full writer forbidden

legacy full writer re-enabled
→ new doc writer must first be disabled/reverted
```

### 16.3 Why explicit mode is mandatory

A bare invocation:

```text
python3 scripts/simcore-sync-memory.py
```

must not silently choose the old full writer after cutover.

---

## 17. Transitional release-state workflow order

After cutover, the existing state-sync workflow remains the outer orchestrator but changes its local-write sequence:

```text
1. checkout latest main worktree
2. fetch/resolve release-simcore
3. materialize latest.js + install.js
4. verify syntax + latest/install equality
5. extract VERSION / RELEASE_NAME / COMMIT / BLOB
6. run legacy compatibility declaration with --manifest-only
7. write bounded ephemeral production-identity-v1.json
8. invoke sync-state --write
9. invoke sync-state --check against the just-written worktree
10. git diff --check
11. assert changed-path allowlist
12. create bounded local payload commit
13. repo-main-write.py integrates payload onto latest shared main
14. build/upload project-source snapshot as applicable
```

The production-identity record is ephemeral orchestration data and is not committed merely because the tool consumed it.

---

## 18. Changed-path allowlist after cutover

A normal release-state sync payload may change only:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

Ownership inside that payload is split:

```text
manifest    <- transitional declaration compatibility path
2 doc spans <- sync-state
```

The release run fails if an unexpected path changes.

Repository integration continues to use `repo-main-write.py` with bounded path discipline.

---

## 19. Race prevention

### 19.1 No two writers for one span

```text
legacy full writer active XOR sync-state doc writer active
```

Never both.

### 19.2 Workflow concurrency is useful but not ownership

The existing concurrency group:

```text
simcore-main-state-sync
```

continues to serialize normal jobs.

But serialized writers with different semantics can still overwrite one another incorrectly.

Therefore ownership exclusivity is required even with concurrency.

### 19.3 Shared-main races remain outer orchestration

`repo-main-write.py` continues to handle main movement.

`sync-state` never retries GitHub/main writes.

If replay creates a content conflict, outer integration fails closed and a new local sync plan must be generated from current main.

No force push.

---

## 20. Replay-after-main-move rule

A state-sync payload is valid only against the target bytes it preflighted.

If the payload cannot replay cleanly on newer main:

```text
DO NOT choose ours/theirs automatically
DO NOT force-apply an old machine block
```

Instead:

```text
fetch current main
→ rematerialize targets
→ rerun identity verification
→ rerun sync-state
→ produce a new bounded payload
```

---

## 21. Cutover migration patch boundary

Expected infrastructure/state-sync paths may include:

```text
products/simcore/state-sync/target-registry.json
products/simcore/state-sync/renderers.mjs
products/simcore/tooling/sync-state.mjs
products/simcore/tests/... state-sync fixtures/self-tests
scripts/simcore-sync-memory.py
.github/workflows/simcore-release-state-sync.yml
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

If RS2-2B implementation is already merged separately, 2C implementation touches only the mapping/migration-specific subset.

Forbidden in the same work item:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime modules
prompt behavior
storage schema
Reaction/Community behavior
Broadcast/Time/Frame behavior
M2-3 implementation
unrelated repo-wide release-system refactor
```

---

## 22. Migration candidate must come from verified identity

The renderer body inserted during final cutover must come from:

```text
manifest after independent declaration repair
+
verified materialized production identity
```

not hand-typed current release values.

The migration evidence must show candidate bytes equal renderer output for the verified declared production state.

---

## 23. Unmanaged-byte migration proof report

Conceptual bounded record:

```json
{
  "target": "current-development-production-snapshot",
  "migration": "legacy-marker-to-canonical-v1",
  "prefixBeforeSha256": "...",
  "prefixAfterSha256": "...",
  "suffixBeforeSha256": "...",
  "suffixAfterSha256": "...",
  "prefixEqual": true,
  "suffixEqual": true,
  "canonicalBeginCount": 1,
  "canonicalEndCount": 1,
  "legacyBeginCount": 0,
  "legacyEndCount": 0
}
```

For Guidelines, use insertion-boundary hashes rather than pretending there was a pre-existing managed span.

No report stores the full human document body.

---

## 24. Exact marker postconditions

After cutover:

### `CURRENT_DEVELOPMENT`

```text
legacy BEGIN count     = 0
legacy END count       = 0
canonical BEGIN count  = 1
canonical END count    = 1
```

### `SIMCORE_GUIDELINES`

```text
canonical BEGIN count  = 1
canonical END count    = 1
```

Across both:

```text
no nested blocks
no overlaps
no duplicate block IDs in one file
registered path matches block ID
```

---

## 25. Renderer non-influence tests

For `CURRENT_DEVELOPMENT`, change only:

```text
current_priority
provider_cache_status
source_of_truth
anomaly_watch
current_investigation references
```

Expected:

```text
rendered PRODUCTION_SNAPSHOT bytes unchanged
```

For Guidelines, change any field except:

```text
production_version
release_name
release_commit
```

Expected:

```text
rendered PRODUCTION_BASELINE bytes unchanged
```

---

## 26. Renderer influence tests

Each allowlisted field gets a direct deterministic influence test.

Examples:

```text
change production_version only
→ exactly Version line changes

change release_commit only
→ exactly Release commit line changes

change major_update_checkpoint only
→ exactly Major update checkpoint line changes
```

For Guidelines:

```text
change release_commit only
→ exactly Release commit line changes
```

No unrelated whitespace or line movement is permitted.

---

## 27. Current validation-state compatibility

The current manifest predates the final RS2 state vocabulary and contains values such as:

```text
PENDING_REAL_LONG_CHAT
```

RS2-2C does not infer `LIVE_PENDING` or another replacement token.

Initial rule:

```text
validate declared compatibility token against explicit supported schema
→ render exact declared token
```

Later vocabulary normalization is a state/schema migration, not a renderer trick.

---

## 28. Same-version release corrections

The mapping must not assume:

```text
version changed
==
production changed
```

A same-version correction may change commit/blob identity.

Therefore:

```text
CURRENT_DEVELOPMENT includes commit + blob
GUIDELINES includes commit
```

and identity verification always precedes rendering.

No semantic-version comparison decides freshness.

---

## 29. Historical migration code is not copied into new renderers

The legacy script contains old version-specific document migrations.

The new renderers must not absorb behavior like:

```text
if version == old_version:
  insert old evidence prose
```

Historical evidence stays as already materialized human/history content.

New `sync-state` owns only the two current-state spans.

---

## 30. Legacy full path retention and rollback

RS2-2C does not delete `--legacy-full` during initial cutover.

It is retained only as a bounded rollback path until later disposition.

Rollback:

```text
1. classify sync-state failure
2. stop/disable new doc-writer invocation
3. revert ownership-cutover infrastructure/marker patch or apply reviewed inverse
4. verify legacy markers/old expected shape
5. only then re-enable --legacy-full
```

Forbidden:

```text
new canonical writer still active
+
legacy full writer
```

A document-sync failure does not require runtime/plugin rollback.

---

## 31. Migration-specific outcomes

```text
MIGRATION_SOURCE_MATCH
MIGRATION_ALREADY_CANONICAL
MIGRATION_SOURCE_AMBIGUOUS
MIGRATION_UNMANAGED_BYTES_CHANGED
MIGRATION_RENDER_MISMATCH
MIGRATION_OWNERSHIP_CONFLICT
MIGRATION_IDENTITY_NOT_VERIFIED
```

Cutover disposition:

```text
SOURCE_AMBIGUOUS            -> BLOCKER
UNMANAGED_BYTES_CHANGED     -> BLOCKER
RENDER_MISMATCH             -> BLOCKER
OWNERSHIP_CONFLICT          -> BLOCKER
IDENTITY_NOT_VERIFIED       -> BLOCKER for activation; preserve drift evidence
ALREADY_CANONICAL           -> verify registry/renderer; do not duplicate markers
```

No migration failure mutates `release-simcore`.

---

## 32. Required fixture families

### C1 — Current Development legacy migration

```text
one legacy pair
no canonical pair
known prefix/suffix
→ canonical pair exactly once
→ renderer-v1 body exact
→ prefix/suffix byte-identical
```

### C2 — Current Development ambiguity

```text
duplicate legacy pair
or mixed legacy+canonical
→ MIGRATION_SOURCE_AMBIGUOUS
→ writes NONE
```

### C3 — Guidelines enrollment

```text
exact section-44 baseline shape
→ canonical baseline markers around expected code-fence region
→ human heading/paragraph bytes preserved
```

### C4 — Guidelines ambiguity

```text
multiple candidate code fences
or missing expected section anchor
→ MIGRATION_SOURCE_AMBIGUOUS
→ writes NONE
```

### C5 — Renderer exactness

Golden bytes for both renderers.

### C6 — Field non-influence

Unlisted manifest fields cannot change generated bytes.

### C7 — Field validation

Unsafe release-name/newline/backtick/control payload fails closed.

### C8 — Legacy mode separation

```text
--manifest-only
→ manifest changed as expected
→ both target docs byte-identical

--legacy-full
→ historical combined path only when explicitly invoked
```

### C9 — Writer exclusivity

Configuration enabling both legacy full doc writes and sync-state writes fails migration validation.

### C10 — Idempotent post-cutover state

```text
sync-state --write
sync-state --check
→ clean
second --write
→ zero diff
```

---

## 33. Cutover validation sequence

```text
1. capture legacy baseline fixtures
2. RS2-2B tool/self-tests PASS
3. current source identity independently synchronized and VERIFIED
4. migration anchors validate
5. candidate canonical markers created
6. exact renderers generate candidate blocks
7. unmanaged-byte proof PASS
8. target registry validation PASS
9. --write on isolated candidate worktree PASS
10. immediate --check returns clean
11. second --write produces no diff
12. legacy --manifest-only proves docs unchanged
13. workflow config proves no legacy-full + sync-state dual writer
14. changed-path allowlist PASS
15. runtime/release-simcore diff NONE
16. merge bounded cutover infrastructure through normal main-safe path
17. post-merge read-only canonical-marker/check verification
```

No step is skipped because the final diff looks visually small.

---

## 34. Cutover is infrastructure-only

The ownership migration does not advance:

```text
SimCore version
runtime behavior
M2 milestone
M2 checkpoint
live validation status
release-simcore commit
```

Any such change belongs to a separate release/correctness operation.

---

## 35. Human continuity remains authoritative

After the machine snapshot is correct, human prose may still reference an older release or gate.

The renderer does not rewrite that prose.

```text
machine fact stale
→ sync-state owns repair once source is verified

human continuity stale
→ detect/classify
→ human/documentation update
```

Automatic prose rewriting would recreate the authority ambiguity RS2-2 is meant to remove.

---

## 36. RS2-2D handoff — contradiction detection

RS2-2D must build on these mappings and define how `--check` reports:

```text
canonical machine block stale
manifest vs production identity drift
registered block missing/duplicate
unambiguous current-production structured fact outside managed block contradicts canonical state
legacy marker unexpectedly reappears
legacy writer ownership unexpectedly enabled
```

RS2-2D must distinguish:

```text
historical version reference
!=
current-state contradiction
```

It may report bounded contradictions but may not auto-rewrite human prose.

---

## 37. What RS2-2D must not reopen

Unless implementation evidence proves a blocker, these decisions are frozen:

```text
exact two initial target documents
canonical-only steady-state markers
CURRENT_DEVELOPMENT v1 field allowlist
GUIDELINES v1 field allowlist
renderer shapes
current_priority exclusion
provider_cache exclusion
Guidelines heading remains human-owned
legacy full writer cannot coexist with sync-state writer
transitional manifest-only legacy ownership until RS2-4
repo-main-write remains outer main integration authority
```

---

## 38. Relationship to RS2-3 permanent CI

RS2-2C creates a deterministic target surface that RS2-3 can later check with `sync-state --check`.

RS2-2C does not create permanent CI triggers.

Future CI consumes registry/result codes instead of reproducing renderer logic in YAML.

---

## 39. Relationship to RS2-4 permanent release workflow

The transitional `--manifest-only` declaration is temporary.

RS2-4 later owns replacement of:

```text
release deployment
manifest declaration update
release-state transaction ordering
rollback/atomicity
```

Target future ownership:

```text
RS2-4 release transaction
→ updates release-simcore + manifest authority
→ materializes verified identity
→ invokes RS2-2 sync-state for docs
→ creates one bounded release-state payload
```

Only after that is proven may the legacy manifest compatibility path be retired through an explicit later gate.

---

## 40. Proposed implementation sequence

```text
C0  branch from then-current main
C1  capture legacy marker/renderer fixtures
C2  implement exact target registry
C3  implement/verify v1 renderers
C4  implement migration verifier/helpers
C5  add explicit legacy --manifest-only / --legacy-full mode split
C6  independently resolve current manifest/production identity drift using existing authority
C7  prepare candidate marker migration in isolated worktree
C8  prove unmanaged-byte preservation
C9  prove sync-state write/check/idempotence on candidate
C10 modify transitional state-sync workflow for single doc writer
C11 prove changed-path allowlist and repo-main-write compatibility
C12 merge bounded cutover payload to main
C13 post-merge read-only canonical-marker/check verification
C14 freeze RS2-2C implementation evidence
C15 hand off to RS2-2D
```

C6 is not a side effect of C7-C10.

Evidence before repair remains mandatory.

---

## 41. Implementation evidence record

Future evidence records at minimum:

```text
base main commit
implementation commit(s)
registry blob
renderer version(s)
migration fixture results
legacy marker counts before/after
canonical marker counts before/after
unmanaged prefix/suffix hashes
source identity verification result
legacy mode separation result
writer exclusivity result
idempotence result
changed-path allowlist result
repo-main-write integration result
runtime diff NONE
release-simcore diff NONE
```

Do not store full human document bodies in machine reports merely to prove preservation.

---

## 42. RS2-2C design close gate

```text
initial target count fixed to two                         PASS
exact target registry entries defined                    PASS
CURRENT_DEVELOPMENT renderer-v1 shape defined            PASS
CURRENT_DEVELOPMENT source allowlist defined             PASS
current_priority generated-action exclusion defined      PASS
provider-cache exclusion defined                         PASS
GUIDELINES renderer-v1 shape defined                     PASS
GUIDELINES source allowlist defined                      PASS
same-version correction identity treatment defined       PASS
field presentation safety defined                        PASS
canonical-only steady-state marker policy defined        PASS
legacy marker one-time migration defined                 PASS
Guidelines unmarked enrollment defined                   PASS
ordinary sync marker migration forbidden                 PASS
unmanaged-byte migration proof defined                   PASS
current identity drift cutover prerequisite defined      PASS
ownership state machine defined                          PASS
DUAL_WRITE state forbidden                               PASS
transitional manifest declaration owner defined          PASS
legacy explicit mode split defined                       PASS
post-cutover workflow order defined                      PASS
main-race replay rule defined                            PASS
rollback ownership sequence defined                      PASS
required fixture families defined                        PASS
RS2-2D contradiction-detection handoff defined           PASS
runtime diff                                              NONE
release-simcore diff                                      NONE
manifest change                                           NONE
permanent CI change                                       NONE
legacy full-path retirement                               NONE
```

No implementation is required to close the **design** subphase.

---

## 43. Handoff to RS2-2D

RS2-2D must now freeze the exact **drift / contradiction detection and check-mode contract** over the mappings established here.

At minimum:

```text
machine-block CLEAN vs STALE semantics
source identity drift reporting
structured contradiction classes
historical-reference exclusion rules
legacy-marker resurrection detection
legacy/new writer-configuration conflict detection
bounded check report schema extensions
exit-code precedence when source + target contradictions coexist
which contradictions are BLOCKER vs report-only
how check mode behaves on ordinary PRs vs release-state runs
```

RS2-2D may detect stale human current-state statements where syntax/authority is unambiguous.

It may not synthesize replacement prose.

---

## 44. Frozen final rule

> Move ownership once, prove the byte boundary, and never let two systems own the same span at the same time.

For the first RS2 state-sync cutover:

```text
manifest declaration remains separately owned
CURRENT_DEVELOPMENT exact snapshot span moves to sync-state
GUIDELINES exact baseline span moves to sync-state
human continuity stays human
GitHub/main coordination stays outside sync-state
release deployment stays outside sync-state
```

A safe migration does not ask the new tool to become more powerful.

It makes every existing power boundary smaller and easier to prove.

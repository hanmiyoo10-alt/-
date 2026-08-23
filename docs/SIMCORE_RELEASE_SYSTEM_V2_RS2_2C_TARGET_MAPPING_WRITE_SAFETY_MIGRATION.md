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

The question is no longer merely:

```text
Can sync-state render a block safely?
```

The concrete questions are now:

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

```text
## 44. Current Production Baseline

Current production family at the time this document was created:

```text
SimCore vX.Y.Z — Release Name
```

Do not treat this number as permanently current; update this section when production advances.
```

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

Therefore the legacy script is not just a renderer.

It currently mixes:

```text
release declaration
+ document generation
+ historical migration compatibility
```

### 2.4 The current release-state workflow already has an outer orchestration layer

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

This is useful because RS2-2C does not need to invent a second GitHub/main-write mechanism.

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

RS2-2C follows these rules:

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

The safest cutover is a transfer of ownership, not a period in which both systems write the same bytes.

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

In particular, the initial registry excludes:

```text
SIMCORE_M2_LIVE_EVIDENCE.md
SIMCORE_ANOMALY_WATCH.md
SIMCORE_DEFERRED_LEDGER.md
release plans
incident reports
architecture audits
Contracts documents
historical live evidence
raw diagnostics
README files
runtime source
```

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

Reason:

```text
permanent alias support
→ two spellings for one authority
→ larger parser surface forever
→ easier accidental duplicate ownership
```

The one-time migration is explicit and reviewed instead.

### 5.2 Ordinary sync-state never renames markers

The standard CLI remains exactly the RS2-2B model:

```text
--check
--render
--write
```

Ordinary `sync-state --write` may replace bytes **between** registered canonical markers.

It may not rename legacy markers or enroll an unmarked document.

Marker enrollment is a one-time repository migration operation owned by RS2-2C implementation.

This prevents a routine state update from silently expanding its write boundary.

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
  exact expected value for current product: release-simcore

release_commit
  lowercase current Git object-format commit SHA
  current repository: 40 lowercase hexadecimal characters

release_blob
  lowercase current Git object-format blob SHA
  current repository: 40 lowercase hexadecimal characters

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

A field that fails presentation validation is not escaped heuristically.

The renderer fails closed:

```text
RENDER_INPUT_INVALID
```

This avoids Markdown/code-fence injection becoming an authority bypass.

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

The v1 renderer emits:

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

Trailing file newline behavior is owned by the surrounding file, not invented by the renderer.

The rendered block itself uses LF.

### 7.2 Field mapping

Exact mapping:

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

The production identity record is a verification input, not an additional text source.

It proves the manifest identity before these fields may render.

### 7.3 Deliberately removed generated fields

The old generated block includes:

```text
Primary optimization target
Provider cache
```

The v1 renderer excludes both.

Reason:

`current_priority` must not become immediate-action authority.

The current operational action remains human-owned elsewhere in `CURRENT_DEVELOPMENT.md`.

`provider_cache_status` is not part of the RS2-2A initial production-snapshot allowlist and is an evidence-sensitive diagnostic claim rather than required release identity.

Exclusion is intentional, not accidental data loss.

### 7.4 Human text that remains outside authority

The renderer must never consume or rewrite later sections such as:

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

Even when those sections contain a stale version string, ordinary `sync-state --write` leaves them untouched.

RS2-2D may detect bounded contradictions; repair remains human-owned.

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

```text
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->
```text
SimCore vX.Y.Z — Release Name
Release commit: <commit-sha>
```
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->
```

The `## 44. Current Production Baseline` heading and explanatory paragraphs remain human-owned outside the managed span.

### 8.2 Exact field mapping

```text
X.Y.Z        <- manifest.production_version
Release Name <- manifest.release_name
commit-sha   <- manifest.release_commit
```

No validation status, current priority, provider cache state, milestone, live gate, or next action belongs in Guidelines generated state.

### 8.3 Why the commit is included

A version string alone is insufficient identity when a same-version production correction can replace the release commit.

The current v0.64.6 line itself demonstrates why this matters: production has received same-version correction/hardening commits.

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

The key invariant remains:

```text
for each registered target:
  prefix bytes before BEGIN  unchanged
  suffix bytes after END     unchanged
```

For normal sync runs, marker lines themselves are also stable.

Only body bytes between the canonical marker lines may differ.

---

## 10. One-time migration — `CURRENT_DEVELOPMENT`

The existing legacy span gives a strong migration anchor.

### 10.1 Migration source requirement

Before migration, exactly one pair must exist:

```text
<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->
```

and zero canonical `PRODUCTION_SNAPSHOT` pairs must exist.

Otherwise:

```text
MIGRATION_SOURCE_AMBIGUOUS
```

and no migration write is allowed.

### 10.2 Migration transform

The explicit migration patch:

```text
1. replaces the legacy BEGIN marker with canonical BEGIN
2. replaces the legacy END marker with canonical END
3. replaces only the previously bounded legacy span body with renderer-v1 output
4. leaves every byte before old BEGIN and after old END unchanged
```

The heading remains inside the managed span for this target.

This deliberately preserves the historical span boundary rather than moving the heading during migration.

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

The only authority expansion is marker namespace replacement over the already-managed span.

---

## 11. One-time migration — `SIMCORE_GUIDELINES`

Guidelines has no historical marker, so enrollment requires a stricter anchor proof.

### 11.1 Required unique anchor

Migration accepts exactly one structural sequence:

```text
## 44. Current Production Baseline

<existing human explanatory paragraph>

```text
<exactly one current baseline line>
```

<existing human explanatory paragraph>
```

The implementation must use an explicit bounded parser/anchor contract.

It may not search the whole file for the first `SimCore v` string and wrap it.

### 11.2 Migration transform

The migration patch:

```text
1. inserts canonical BEGIN immediately before the existing baseline code fence
2. inserts canonical END immediately after that code fence
3. replaces only the newly enrolled managed span with renderer-v1 output
4. preserves the heading and surrounding explanatory paragraphs byte-identically
```

### 11.3 Required proof

Define insertion points around the pre-migration baseline code fence.

Then prove:

```text
all bytes before insertion point A are identical
all bytes after insertion point B are identical
```

The migration report records only hashes/lengths and anchor result, not the full Guidelines body.

### 11.4 Ambiguity handling

If the section contains multiple candidate baseline code fences or the expected heading/shape is absent:

```text
MIGRATION_SOURCE_AMBIGUOUS
```

No best-effort insertion is permitted.

---

## 12. Migration is not an ordinary sync run

Marker enrollment is a repository-schema migration for documentation ownership.

It must happen in an explicit infrastructure work branch/PR.

It is never triggered merely because:

```text
sync-state --write
```

encounters a legacy or unmarked target.

Normal behavior in those cases is:

```text
MARKER_MISSING
or
MARKER_UNSUPPORTED
```

This prevents routine releases from silently changing document authority boundaries.

---

## 13. Current drift must be repaired before ownership cutover

The existing 0.64.3 manifest vs 0.64.6 production mismatch blocks activation of the new writer.

Before cutover:

```text
manifest declaration
resolved release-simcore identity
latest/install local blobs
source version/release marker
```

must all verify.

The new tool may demonstrate that the current state is drifted, but it may not repair that declaration itself.

A required administrative precondition is therefore:

```text
existing authoritative release-state path
or explicit bounded administrative state sync
→ bring manifest declaration into agreement with deployed production
```

Only after that independent repair may the ownership cutover claim `IDENTITY_VERIFIED`.

This keeps evidence and repair order intact.

---

## 14. Ownership state machine

RS2-2C freezes four operational states.

```text
LEGACY_ACTIVE
→ SHADOW_VERIFIED
→ CUTOVER_READY
→ SYNC_STATE_ACTIVE
```

Rollback is a separate explicit transition:

```text
SYNC_STATE_ACTIVE
→ CUTOVER_REVERTED
→ LEGACY_ACTIVE
```

There is no state named `DUAL_WRITE`.

### 14.1 `LEGACY_ACTIVE`

Authority:

```text
product-manifest.json                      legacy release-state script/workflow
CURRENT_DEVELOPMENT production snapshot    legacy sync script
GUIDELINES production baseline             legacy sync script
main integration                           repo-main-write.py
release-simcore                             existing release authority
```

New `sync-state` may be developed/tested in isolated fixtures/worktrees only.

### 14.2 `SHADOW_VERIFIED`

Authority remains exactly the same as `LEGACY_ACTIVE`.

The new tool may run:

```text
--check
--render
```

against a candidate migration worktree or fixtures.

It must not `--write` the active main-owned document spans.

Required proof includes exact proposed blocks and unmanaged-byte preservation.

### 14.3 `CUTOVER_READY`

This is a gate, not a writer state.

Requirements include:

```text
source identity clean
RS2-2B implementation self-tests PASS
canonical migration candidate exact
registry exact
both renderers golden-tested
unmanaged-byte migration proof PASS
new writer idempotence PASS on candidate worktree
legacy/new active-writer exclusivity plan verified
rollback patch available
runtime diff NONE
release-simcore diff NONE
```

### 14.4 `SYNC_STATE_ACTIVE`

Authority becomes:

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

Therefore a temporary ownership split is required until RS2-4 replaces the release transaction.

Frozen transitional rule:

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

It must become explicit-mode only during cutover.

Allowed compatibility modes:

```text
--manifest-only
--legacy-full
```

No implicit default mode after the cutover implementation is accepted.

### 16.1 `--manifest-only`

This mode may perform only the existing release declaration behavior needed before RS2-4:

```text
read VERSION
read RELEASE_NAME
read RELEASE_COMMIT
read RELEASE_BLOB
load product-manifest.json
update the existing release identity declaration fields
preserve explicitly defined compatibility fields
write product-manifest.json
```

It must not open/write:

```text
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

It does not invoke `sync-state` itself.

### 16.2 `--legacy-full`

This preserves the old combined behavior only as a rollback compatibility path.

It must never be invoked by the primary workflow while `SYNC_STATE_ACTIVE` is true.

Operational rule:

```text
new doc writer enabled
→ legacy full writer forbidden
```

and:

```text
legacy full writer re-enabled
→ new doc writer must first be disabled/reverted
```

### 16.3 Why explicit mode is mandatory

A bare invocation such as:

```text
python3 scripts/simcore-sync-memory.py
```

must not silently choose the old full writer after cutover.

Accidental no-argument execution is too dangerous when document ownership has moved.

---

## 17. Transitional release-state workflow order

After cutover, the existing state-sync workflow remains the outer orchestrator but changes its internal local-write sequence.

Directional order:

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

But ownership inside that payload is split:

```text
manifest    <- transitional declaration compatibility path
2 doc spans <- sync-state
```

The release run must fail if an unexpected path changes.

The later repository integration continues to use `repo-main-write.py` with the same bounded path discipline.

---

## 19. Race prevention

### 19.1 No two writers for one span

The primary invariant is:

```text
legacy full writer active XOR sync-state doc writer active
```

Never both.

### 19.2 Workflow concurrency remains useful but insufficient alone

The existing workflow concurrency group:

```text
simcore-main-state-sync
```

continues to serialize normal state-sync jobs.

However concurrency serialization does not justify dual ownership.

Two serialized writers with different semantics can still overwrite each other incorrectly.

Therefore ownership exclusivity is required even if workflow concurrency exists.

### 19.3 Shared-main races remain outer orchestration

`repo-main-write.py` continues to handle:

```text
main moved between checkout and push
```

`sync-state` itself never retries GitHub/main writes.

If replaying a payload on new main creates a content conflict in a managed target, outer integration fails closed and a new local sync plan must be produced from the newer main.

No force push.

---

## 20. Replay-after-main-move rule

A state-sync payload is valid only against the exact target bytes it preflighted.

Therefore if `repo-main-write.py` cannot replay the payload cleanly because another writer changed a target document:

```text
DO NOT resolve by taking ours/theirs automatically
DO NOT force-apply the old machine block
```

Instead:

```text
fetch current main
→ rematerialize target documents
→ rerun production identity verification
→ rerun sync-state
→ produce a new bounded payload
```

This preserves the RS2-2B concurrent-local-change philosophy at repository scale.

---

## 21. Cutover migration patch boundary

The future RS2-2C implementation/cutover work item may touch infrastructure/state-sync paths only.

Expected bounded set may include:

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

If the RS2-2B tool implementation is already merged separately, the 2C implementation should touch only the mapping/migration-specific subset.

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

## 22. Migration candidate must be generated from verified identity

The renderer body inserted during final cutover must come from:

```text
manifest after independent declaration repair
+
verified materialized production identity
```

not from hand-typed current release values.

The migration PR may contain static expected bytes, but its evidence must show those bytes are exactly the renderer output for the verified declared production state.

This prevents the migration itself from becoming another manual version-edit event.

---

## 23. Unmanaged-byte migration proof report

The cutover evidence records bounded hashes for each target.

Conceptual record:

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

Across both files:

```text
no nested blocks
no overlaps
no duplicate block IDs in one file
registered path matches block ID
```

---

## 25. Exact renderer non-influence tests

A target renderer must prove that unlisted manifest fields cannot affect output.

For `CURRENT_DEVELOPMENT`:

change only:

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

For Guidelines:

change only any field except:

```text
production_version
release_name
release_commit
```

Expected:

```text
rendered PRODUCTION_BASELINE bytes unchanged
```

This is stronger than merely documenting an allowlist.

---

## 26. Exact renderer influence tests

Each allowlisted field must have a direct deterministic influence test.

Example for `CURRENT_DEVELOPMENT`:

```text
change production_version only
→ exactly Version line changes

change release_commit only
→ exactly Release commit line changes

change major_update_checkpoint only
→ exactly Major update checkpoint line changes
```

Example for Guidelines:

```text
change release_commit only
→ exactly Release commit line changes
```

No unrelated whitespace or line moves are permitted.

---

## 27. Current validation-state compatibility

The current manifest schema predates the final RS2 state vocabulary and contains values such as:

```text
PENDING_REAL_LONG_CHAT
```

RS2-2C does not infer a new state such as `LIVE_PENDING` from that token.

Initial renderer rule:

```text
validate the declared compatibility token against the explicitly supported schema
→ render the exact declared token
```

Any later normalization of manifest state vocabulary is a schema/state-authority migration, not a document-rendering trick.

This preserves the human-judgment firewall.

---

## 28. Same-version release corrections

The mapping must not assume:

```text
version changed
==
production changed
```

A same-version production correction may change:

```text
release_commit
release_blob
possibly release_name metadata if explicitly corrected
```

Therefore:

```text
CURRENT_DEVELOPMENT includes commit + blob
GUIDELINES includes commit
```

and identity verification always occurs before rendering.

No semantic-version comparison is used to decide freshness.

---

## 29. Legacy historical migration code is not copied into new renderers

The current legacy script contains version-specific document migrations from older releases.

Those are historical compatibility actions, not permanent render behavior.

The new target renderers must not absorb blocks such as:

```text
if version == old_version:
  insert old evidence prose
```

Historical evidence remains in the repository as already materialized human/history content.

New `sync-state` owns only the two registered current-state spans.

This is a critical simplification boundary.

---

## 30. Legacy full path retention and rollback

RS2-2C does not delete `--legacy-full` capability during initial cutover.

It is retained only as a bounded rollback path until RS2-2E/RS2-4 disposition.

Rollback procedure is explicit:

```text
1. classify the sync-state failure
2. stop/disable the new doc-writer invocation
3. revert the ownership-cutover infrastructure/marker patch or apply its reviewed inverse
4. verify legacy markers/expected old document shape
5. only then re-enable --legacy-full
```

Forbidden rollback:

```text
new canonical writer still active
+
run legacy full writer anyway
```

Rollback never requires a runtime/plugin rollback merely because document synchronization failed.

---

## 31. Failure classifications during migration

Migration-specific failures are infrastructure failures.

Initial bounded outcomes:

```text
MIGRATION_SOURCE_MATCH
MIGRATION_ALREADY_CANONICAL
MIGRATION_SOURCE_AMBIGUOUS
MIGRATION_UNMANAGED_BYTES_CHANGED
MIGRATION_RENDER_MISMATCH
MIGRATION_OWNERSHIP_CONFLICT
MIGRATION_IDENTITY_NOT_VERIFIED
```

Disposition guidance:

```text
SOURCE_AMBIGUOUS            -> BLOCKER for cutover
UNMANAGED_BYTES_CHANGED     -> BLOCKER for cutover
RENDER_MISMATCH             -> BLOCKER for cutover
OWNERSHIP_CONFLICT          -> BLOCKER for cutover
IDENTITY_NOT_VERIFIED       -> BLOCKER for activation; preserve drift evidence
ALREADY_CANONICAL           -> verify registry/renderer; do not duplicate markers
```

No migration failure should mutate `release-simcore`.

---

## 32. Implementation fixture families

RS2-2C future implementation must add deterministic fixtures/tests covering at minimum:

### C1 — Current Development legacy migration

```text
one legacy marker pair
no canonical pair
known prefix/suffix
→ canonical pair exactly once
→ renderer-v1 body exact
→ prefix/suffix byte-identical
```

### C2 — Current Development ambiguity

```text
duplicate legacy BEGIN/END
or mixed legacy+canonical pair
→ MIGRATION_SOURCE_AMBIGUOUS
→ writes NONE
```

### C3 — Guidelines enrollment

```text
exact section-44 baseline shape
→ canonical baseline markers inserted around expected code-fence region
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

Golden bytes for both v1 renderers.

### C6 — Field non-influence

Unlisted manifest fields cannot change generated bytes.

### C7 — Field validation

Unsafe release name/newline/backtick/control payload fails closed.

### C8 — Legacy mode separation

```text
--manifest-only
→ manifest changed as expected
→ both target docs byte-identical

--legacy-full
→ historical combined path available only when explicitly invoked
```

### C9 — Writer exclusivity

A candidate configuration that enables both legacy full document writes and sync-state writes fails migration validation.

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

Future implementation must validate in this order:

```text
1. legacy baseline fixtures capture current behavior
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
13. active workflow config proves no legacy-full + sync-state dual writer
14. changed-path allowlist PASS
15. runtime/release-simcore diff NONE
16. merge cutover infrastructure through normal main-safe path
17. post-merge read-only check of canonical marker counts
```

No step may be skipped because the final diff looks visually small.

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

If any of those need to change, they belong to a separate release/correctness operation.

The migration must not be bundled with v0.64.x or v0.65.x runtime code.

---

## 35. Human continuity remains authoritative

After the machine snapshot is correct, `CURRENT_DEVELOPMENT.md` may still contain human prose that references an older release or an older immediate gate.

The renderer does not rewrite that prose.

Required handling:

```text
machine fact stale
→ sync-state owns repair once source is verified

human continuity stale
→ detect/classify
→ human/documentation update
```

This is not a weakness.

It is the intended authority split.

Automatic prose rewriting would recreate the exact ambiguity RS2-2 is trying to remove.

---

## 36. RS2-2D handoff — contradiction detection

RS2-2D must build on the mappings frozen here.

At minimum it must decide how `--check` reports:

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

It may report bounded contradictions.

It still must not auto-rewrite human prose.

---

## 37. What RS2-2D must not reopen

The following decisions are frozen by RS2-2C unless implementation evidence proves a blocker:

```text
exact two initial target documents
canonical-only steady-state markers
CURRENT_DEVELOPMENT v1 field allowlist
GUIDELINES v1 field allowlist
renderer shapes
current_priority exclusion
provider_cache exclusion
guidelines heading remains human-owned
legacy full writer cannot coexist with sync-state writer
transitional manifest-only legacy ownership until RS2-4
repo-main-write remains outer main integration authority
```

RS2-2D is detection semantics, not a second mapping redesign.

---

## 38. Relationship to RS2-3 permanent CI

RS2-2C creates a deterministic target surface that RS2-3 can later check.

RS2-3 may eventually run:

```text
sync-state --check
```

on relevant PRs or release-state changes.

But RS2-2C does not create that permanent CI trigger.

The future CI should consume the registry and result codes rather than reproduce renderer logic in YAML.

---

## 39. Relationship to RS2-4 permanent release workflow

The transitional `--manifest-only` legacy declaration is intentionally temporary.

RS2-4 later owns replacement of:

```text
release deployment
manifest declaration update
release-state transaction ordering
rollback/atomicity
```

Target future ownership after RS2-4:

```text
RS2-4 release transaction
→ updates release-simcore + manifest authority
→ materializes verified identity
→ invokes RS2-2 sync-state for docs
→ creates one bounded release-state payload
```

When that is proven, the legacy manifest compatibility path can be retired through an explicit later gate.

RS2-2C does not authorize that retirement now.

---

## 40. Proposed implementation sequence

After implementation is authorized:

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

Do not perform C6 as a side effect of C7-C10.

Evidence before repair remains mandatory.

---

## 41. Implementation evidence record

Future RS2-2C implementation evidence must record at minimum:

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

RS2-2C design is complete when:

```text
initial target count fixed to two                         PASS
exact target registry entries defined                    PASS
CURRENT_DEVELOPMENT renderer-v1 shape defined            PASS
CURRENT_DEVELOPMENT source allowlist defined              PASS
current_priority generated-action exclusion defined      PASS
provider-cache exclusion defined                         PASS
GUIDELINES renderer-v1 shape defined                     PASS
GUIDELINES source allowlist defined                       PASS
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

At minimum it must define:

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

RS2-2C follows one migration rule above all others:

> Move ownership once, prove the byte boundary, and never let two systems own the same span at the same time.

For the first RS2 state-sync cutover, that means:

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

# SimCore Release System v2 — RS2-2A State Authority & Machine-Managed Block Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior phase: `RS2-1 — Durable Tests`
Prior close contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-2 — State Synchronization`
Subphase: `RS2-2A — State Authority & Machine-Managed Block Contract`
Authority class: release-infrastructure design / generated-state authority boundary

---

## 1. Purpose

RS2-2A defines the authority and write boundary for machine-managed SimCore state synchronization.

The problem is not merely that repeated version strings are inconvenient to edit.

The actual safety problem is that several repository documents can contain the same release facts while advancing at different times, causing a new conversation or release task to read a stale production identity or stale operational snapshot.

RS2-2A therefore freezes:

- which source owns each class of fact;
- which facts may be rendered automatically;
- which facts remain human judgment and must never be overwritten by synchronization;
- the verification handshake required before manifest facts may be propagated;
- the exact machine-block marker rules;
- document-level ownership boundaries;
- unmanaged-text preservation requirements;
- idempotence and deterministic rendering requirements;
- failure-closed behavior when source identity, markers, or authority are ambiguous;
- the transition boundary between the current `simcore-sync-memory.py` system and the future RS2 synchronization tool.

This document does **not** implement `sync-state`, modify `product-manifest.json`, repair current stale release metadata, modify `release-simcore`, alter SimCore runtime behavior, create permanent CI, or replace the existing release workflow.

---

## 2. Direct repository evidence motivating RS2-2

At this design point the repository already demonstrates the exact drift class RS2-2 is intended to prevent.

Observed repository state:

```text
release-simcore HEAD
= 6c43c8167375b836a87277c005c63f93b028dde4
= SimCore v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair

product-manifest.json
production_version = 0.64.3
release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf

CURRENT_DEVELOPMENT machine snapshot
Version             = 0.64.3
release commit       = d7fd45cd193ef1ff187c73761ded958d89558ebf
```

Classification:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

This design phase does not repair the drift because RS2-2A is design-only.

The evidence is preserved here because a future synchronization tool must prove that it detects this state and does **not** blindly copy stale manifest data into more documents.

---

## 3. Existing synchronization mechanism and migration boundary

The repository already contains:

```text
scripts/simcore-sync-memory.py
.github/workflows/simcore-release-state-sync.yml
```

The current mechanism combines several responsibilities:

```text
resolve release-simcore identity
→ mutate product-manifest.json
→ update CURRENT_DEVELOPMENT snapshot
→ regex-update guideline production baseline
→ optionally migrate historical version-specific prose
→ commit directly to main
→ build project-source artifact
```

That mechanism remains historical/current infrastructure until a later RS2 phase explicitly replaces it.

RS2-2 does **not** delete or silently repurpose it.

The target RS2 separation is:

```text
RELEASE / IDENTITY OWNER
- publishes or reconciles product-manifest.json

SYNC-STATE
- reads verified manifest state
- renders only declared machine-managed blocks
- checks contradictions/staleness
- never invents release identity

HUMAN DOCUMENT AUTHOR
- owns reasoning, evidence interpretation, next-action decisions, WATCH/FIX/DEFER/BLOCKER judgments
```

The future `sync-state` tool is therefore a state renderer/checker, not a hidden release-identity engine.

---

## 4. Canonical authority matrix

RS2-2A preserves the established project authority split.

| Question | Canonical authority | Synchronization role |
|---|---|---|
| What code actually runs? | `release-simcore` | verification input only |
| What release identity is declared? | `product-manifest.json` | primary generated-fact source |
| What is the immediate next action? | `docs/CURRENT_DEVELOPMENT.md` human-authored sections | never inferred or overwritten |
| What principles are durable? | `docs/SIMCORE_GUIDELINES.md` human-authored sections | never inferred or overwritten |
| What work is deferred? | `docs/SIMCORE_DEFERRED_LEDGER.md` | not generated in RS2-2A |
| What incident/live evidence exists? | dedicated evidence/watch documents | references only; never rewritten from manifest |
| What test-adoption state exists? | RS2 status/evidence records once implemented | later generated/read-only reference where explicitly mapped |

A synchronization tool may render a fact only when the source authority for that fact is explicit.

---

## 5. Two-source verification handshake

A manifest is the release-identity authority, but release-simcore is the runtime-code authority.

Therefore RS2 synchronization must not propagate manifest facts until the identity relationship between those authorities is verified.

Required preflight concept:

```text
read product-manifest.json
        ↓
materialize/inspect declared release-simcore production source
        ↓
verify release branch identity
verify release commit
verify latest/install path
verify latest == install
verify source version marker
verify source release name where deterministic
verify declared release blob
        ↓
VERIFIED_IDENTITY
        ↓
allow machine-block rendering
```

If verification fails:

```text
SOURCE_IDENTITY_DRIFT
→ no document write
→ no manifest rewrite by sync-state
→ bounded report only
```

This is a hard fail-closed rule.

### 5.1 Why manifest authority does not mean blind propagation

`product-manifest.json` is the canonical declaration of release identity.

That does not authorize a tool to replicate an obviously stale or internally inconsistent declaration without checking the runtime-code authority.

Canonical declaration and runtime verification serve different purposes:

```text
manifest        = declared identity authority
release-simcore = executed-code authority
verification    = proof that both refer to the same deployed release
```

Only the verified intersection may become generated documentation state.

### 5.2 Sync-state must not auto-heal identity drift

If the manifest and release branch disagree, `sync-state` must not decide which side is newer and rewrite the other.

Identity reconciliation belongs to:

- the existing verified legacy release/state mechanism during transition; or
- the future permanent release workflow in RS2-4; or
- an explicit bounded administrative repair.

RS2-2 synchronization only detects and reports the contradiction.

---

## 6. Fact classes

RS2-2A defines four fact classes.

```text
A. RELEASE_IDENTITY_FACT
B. DECLARED_VALIDATION_FACT
C. ROADMAP_COORDINATE_FACT
D. HUMAN_JUDGMENT
```

Only A and specifically-authorized subsets of B/C may be machine-rendered.

### 6.1 `RELEASE_IDENTITY_FACT`

Canonical source: `product-manifest.json`, after source verification.

Initial fields:

```text
product
production_version
release_name
release_branch
release_commit
release_blob
production_files.latest
production_files.install
production_files.expected_identical
```

These are the primary RS2-2 generated facts.

### 6.2 `DECLARED_VALIDATION_FACT`

Examples:

```text
validation_status
```

This may be rendered only as the exact declared state.

The synchronization tool must not infer `LIVE_PASS` merely because a test passed or because a release commit exists.

Changing the declared validation state requires an explicit state transition owned outside the renderer.

### 6.3 `ROADMAP_COORDINATE_FACT`

Examples currently present in the manifest include:

```text
major_update_milestone
major_update_phase
major_update_checkpoint
current_priority
```

These fields require stricter treatment.

`major_update_milestone`, `major_update_phase`, and `major_update_checkpoint` may be machine-rendered as declared coordinates when a target block explicitly requests them.

`current_priority` is **not** allowed to overwrite or generate the immediate next-action reasoning in `CURRENT_DEVELOPMENT`.

The immediate next action remains human operational authority.

If `current_priority` is retained in the manifest for compatibility, it may be displayed only in a bounded compatibility/status field that does not masquerade as human promotion reasoning.

### 6.4 `HUMAN_JUDGMENT`

Never generated from manifest.

Examples:

```text
why a bug matters
why a release should or should not be promoted
next candidate reasoning
FIX / WATCH / DEFER / BLOCKER classification
scope decisions
live evidence interpretation
causality claims
risk assessment
hard-freeze rationale
M2/M3 roadmap decisions
```

No generated block may synthesize these from field combinations.

---

## 7. Machine-managed block principle

A generated document is not a generated file.

Only explicit blocks are machine-owned.

Everything outside those blocks remains human-owned text.

Canonical marker shape:

```text
<!-- SIMCORE_SYNC:<BLOCK_ID>:BEGIN -->
... generated content ...
<!-- SIMCORE_SYNC:<BLOCK_ID>:END -->
```

Block IDs use uppercase ASCII with underscores only.

Examples:

```text
SIMCORE_SYNC:PRODUCTION_SNAPSHOT
SIMCORE_SYNC:PRODUCTION_BASELINE
SIMCORE_SYNC:RS2_STATUS
```

### 7.1 Existing marker compatibility

`CURRENT_DEVELOPMENT.md` already contains the historical markers:

```text
<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->
```

RS2-2 implementation must support a controlled one-time migration from this legacy marker to the canonical RS2 marker **or** explicitly preserve it as a registered legacy alias.

The implementation may not silently support arbitrary marker spellings.

The migration decision is finalized in RS2-2C, but RS2-2A freezes these requirements:

```text
exactly one registered marker pair
no overlapping old/new pair
no duplicated block authority
migration must be deterministic
```

---

## 8. Marker invariants

Before any write, every target document must satisfy:

```text
registered BEGIN count = exactly 1
registered END count   = exactly 1
BEGIN occurs before END
no nested managed block
no overlapping managed block
block ID matches target mapping
UTF-8 parse succeeds
```

Any violation produces a fail-closed synchronization error.

Examples:

```text
MARKER_MISSING
MARKER_DUPLICATE
MARKER_REVERSED
MARKER_NESTED
MARKER_OVERLAP
BLOCK_ID_UNREGISTERED
```

No best-effort regex replacement is allowed when markers are ambiguous.

---

## 9. Initial target blocks

RS2-2A authorizes only a minimal initial set.

### 9.1 `CURRENT_DEVELOPMENT` — `PRODUCTION_SNAPSHOT`

Target:

```text
docs/CURRENT_DEVELOPMENT.md
```

Machine-owned facts:

```text
Product
Version
Release
Release branch
Release commit
Release blob
Declared validation status
Major milestone / phase / checkpoint when configured
```

Human-owned and excluded from the block:

```text
production verdict prose
why the release exists
live close-gate interpretation
next release reasoning
current issue classification
roadmap promotion decision
```

The previous field `Primary optimization target` must not automatically become the immediate action authority merely because `current_priority` exists in the manifest.

### 9.2 `SIMCORE_GUIDELINES` — `PRODUCTION_BASELINE`

Target:

```text
docs/SIMCORE_GUIDELINES.md
```

This block is intentionally smaller than `CURRENT_DEVELOPMENT`.

Directional content:

```text
Current verified production baseline:
SimCore vX.Y.Z — Release Name
release commit <sha>
```

The guidelines remain a durable-principles document and must not accumulate release-specific investigation state.

Any current live gate, current bug narrative, or immediate action belongs in `CURRENT_DEVELOPMENT`, not the guideline machine block.

### 9.3 No automatic evidence-document rewriting

Dedicated evidence/watch/plan documents are immutable/human historical records unless a later phase explicitly registers a bounded machine block inside them.

RS2-2A does not authorize that.

---

## 10. Generated-content schema rule

Each block has a registered renderer with an explicit field allowlist.

Conceptual registry:

```text
PRODUCTION_SNAPSHOT
  sources:
    manifest.product
    manifest.production_version
    manifest.release_name
    manifest.release_branch
    manifest.release_commit
    manifest.release_blob
    manifest.validation_status
    manifest.major_update_milestone
    manifest.major_update_phase
    manifest.major_update_checkpoint

PRODUCTION_BASELINE
  sources:
    manifest.production_version
    manifest.release_name
    manifest.release_commit
```

A renderer may not read arbitrary manifest keys and dump them into Markdown.

New generated facts require an explicit mapping update and review.

---

## 11. Unmanaged-text preservation contract

The strongest RS2-2 write safety rule is:

```text
bytes outside registered machine-managed spans
must remain byte-identical
```

Allowed changes:

```text
contents strictly between one registered BEGIN/END marker pair
```

Forbidden changes:

```text
headings outside the block
spacing outside the block
human paragraphs
historical sections
line endings outside the block
unrelated marker text
```

The synchronization implementation must verify this property after rendering and before commit.

A tool that reformats the whole Markdown file is non-compliant.

---

## 12. Deterministic rendering

The same verified input state must produce byte-identical generated blocks.

Generated output must not depend on:

```text
wall-clock time
local timezone
locale-sensitive formatting
random values
GitHub runner identity
current working branch name unless declared input
network ordering
unordered object iteration
```

Timestamps are excluded from initial generated blocks unless a later contract defines an authoritative timestamp source.

Do not add `Last synced: now` merely for convenience because it destroys deterministic no-op behavior.

---

## 13. Idempotence

Required property:

```text
sync(source, document) -> document'
sync(source, document') -> document'
```

A second run against unchanged verified state must produce no diff.

Idempotence is a hard RS2-2 implementation gate.

---

## 14. Validation state rendering

Validation state is declarative and must retain the state-machine distinction established in the parent Release System v2 plan.

Allowed examples:

```text
PLANNED
STATIC_PASS
DEPLOYED
LIVE_PENDING
LIVE_PASS
STATIC_FAILED
DEPLOY_FAILED
LIVE_FAILED
```

The exact accepted enum is finalized in a later state-schema subphase if needed.

Rules frozen now:

1. sync-state renders the declared value only;
2. sync-state never promotes validation state by inference;
3. a missing/unknown required validation value is an input validation failure, not a reason to invent `PENDING`;
4. historical free-form values may require a compatibility mapping, but the mapping must be explicit and bounded.

---

## 15. Identity verification details

Before document synchronization may write, the verifier must establish at minimum:

```text
manifest.release_branch exists
resolved branch commit == manifest.release_commit
latest path exists
install path exists
latest blob == install blob when expected_identical=true
resolved latest blob == manifest.release_blob
latest/install bytes equal when expected_identical=true
source //@version == manifest.production_version
```

Where release-name extraction is deterministic and stable, it should also verify:

```text
source release note name == manifest.release_name
```

If a historical format prevents safe release-name extraction, the verifier reports a bounded compatibility limitation rather than weakening all later checks.

---

## 16. Verification outcome vocabulary

RS2-2A freezes these top-level source outcomes:

```text
IDENTITY_VERIFIED
SOURCE_IDENTITY_DRIFT
SOURCE_UNAVAILABLE
MANIFEST_INVALID
SOURCE_FORMAT_UNSUPPORTED
```

Only:

```text
IDENTITY_VERIFIED
```

may authorize write mode.

All other states are read-only report states.

---

## 17. Drift dimensions

When identity verification fails, the report must identify bounded dimensions rather than emit a giant diff.

Initial dimensions:

```text
VERSION_DRIFT
RELEASE_NAME_DRIFT
RELEASE_BRANCH_DRIFT
RELEASE_COMMIT_DRIFT
RELEASE_BLOB_DRIFT
LATEST_INSTALL_DIVERGED
PRODUCTION_PATH_MISSING
VALIDATION_SCHEMA_DRIFT
```

Multiple dimensions may be present simultaneously.

Raw source files and full Markdown documents must not be embedded in the report.

---

## 18. Current observed drift as a mandatory future fixture

The currently observed repository mismatch must become a deterministic RS2-2 negative fixture during implementation.

Fixture concept:

```text
manifest:
  version 0.64.3
  commit  d7fd45...

resolved production:
  version 0.64.5
  commit  6c43c8...

expected:
  SOURCE_IDENTITY_DRIFT
  VERSION_DRIFT
  RELEASE_COMMIT_DRIFT
  no target document mutation
```

Use bounded synthetic/shape data in the permanent test.

Do not hardcode this historical mismatch as a permanent current-version expectation.

Its purpose is to protect fail-closed synchronization semantics.

---

## 19. Human-judgment firewall

A generated-state tool must never transform fields into human conclusions.

Forbidden examples:

```text
manifest.validation_status = LIVE_PENDING
→ generate "release is healthy"

current_priority = M2_3
→ generate "M2-3 should begin now"

major_update_checkpoint = M2-2
→ generate "M2-2 is fully closed"
```

Those are judgments requiring evidence and explicit promotion reasoning.

Generated blocks contain facts, not conclusions.

---

## 20. Relationship to current development memory

`CURRENT_DEVELOPMENT.md` has two different categories of content:

```text
MACHINE FACTS
- exact current production identity
- declared validation state
- declared architecture coordinates

HUMAN CONTINUITY
- what happened
- why it matters
- next action
- evidence interpretation
- deferred work
- hard freezes
```

RS2-2 must make that boundary visible rather than regenerate the whole file.

This preserves the document's role as long-memory/continuity authority while eliminating stale duplicated identity facts.

---

## 21. Relationship to guidelines

`SIMCORE_GUIDELINES.md` remains constitutional/durable guidance.

RS2-2 may update a minimal current-production-baseline block because that baseline is a repeated factual reference.

It must not use synchronization as a reason to move active investigation prose back into Guidelines.

Canonical separation:

```text
GUIDELINES
= durable principles + minimal verified baseline reference

CURRENT_DEVELOPMENT
= current human reasoning + generated exact production snapshot
```

---

## 22. Relationship to product-manifest.json

RS2-2A narrows the role of the manifest for synchronization purposes.

The manifest is:

```text
canonical release identity declaration
+ bounded declared release/validation coordinates
```

The manifest is not:

```text
full development memory
incident ledger
human roadmap rationale
live evidence store
release script
runtime configuration
```

A future schema cleanup may remove compatibility fields that duplicate human authority, but RS2-2A does not change the schema.

---

## 23. Relationship to RS2-1

RS2-2 may begin only after the RS2-1 close requirements defined in RS2-1E are satisfied during implementation.

RS2-2 design may proceed before implementation because design activity has no runtime effect.

When implemented, RS2-2 tooling itself should become a permanent regression subject under the durable-test principles established in RS2-1.

Required future RS2-2 fixture families include:

```text
verified identity render
identity drift fail-closed
marker missing
marker duplicate
unmanaged-text mutation detection
idempotent second run
human text preservation
```

---

## 24. Relationship to RS2-3

RS2-2 defines the tool and state semantics.

RS2-3 later decides when permanent CI invokes:

```text
sync-state --check
```

and whether a PR is blocked by state drift.

RS2-2 itself does not add permanent CI authority.

---

## 25. Relationship to RS2-4

RS2-4 eventually owns atomic release deployment and manifest update.

Target future flow:

```text
validated candidate
→ release-simcore deployment
→ product-manifest identity update
→ identity verification
→ sync-state render
→ machine blocks updated
```

RS2-2 must not prematurely implement this release transaction.

Until RS2-4 proves replacement, the existing release/state path remains available.

---

## 26. No runtime/release mixing

RS2-2A is release infrastructure only.

It must never be combined in the same implementation work item with:

```text
SimCore runtime correctness change
M2-3 ownership extraction
Reaction behavior change
Broadcast/Time/Frame change
prompt change
persistent schema change
host integration change
```

If an urgent correctness release occurs during RS2-2 work, use the last verified release path and resume RS2 separately.

---

## 27. RS2-2 proposed subphase map

RS2-2 is divided into five detailed-design subphases:

```text
RS2-2A  State Authority & Machine-Managed Block Contract
RS2-2B  Sync-State Tool / Read-Verify-Render Contract
RS2-2C  Target Document Mapping & Write-Safety Migration
RS2-2D  Drift / Contradiction Detection & Check-Mode Contract
RS2-2E  Promotion / Close Gate & RS2-3 Handoff
```

Responsibilities:

### RS2-2A

```text
authority
fact classes
verification handshake
machine-block boundaries
human-judgment firewall
```

### RS2-2B

```text
sync-state CLI
input/output schema
check/render modes
source resolver boundary
atomic local write model
bounded result codes
```

### RS2-2C

```text
CURRENT_DEVELOPMENT mapping
GUIDELINES mapping
legacy marker migration
unmanaged-byte preservation proof
existing sync-script coexistence
```

### RS2-2D

```text
cross-source drift detection
document contradiction checks
stale block detection
exit codes
CI-consumable check mode
```

### RS2-2E

```text
implementation close record
operational authority
fallback
legacy sync retention/retirement status
RS2-3 entry conditions
```

This subdivision is frozen unless implementation evidence exposes a missing boundary.

---

## 28. RS2-2A implementation prerequisites

Before implementation is authorized:

```text
RS2-1 implementation close status available          REQUIRED
existing release path remains available              REQUIRED
no runtime change in same work item                   REQUIRED
current identity drift classified/documented         REQUIRED
```

The existing observed 0.64.3/0.64.5 drift must be treated as input evidence, not silently repaired as a side effect of implementing the tool.

If a repair is needed first for operational correctness, it must be an explicit bounded administrative sync action.

---

## 29. RS2-2A design close gate

RS2-2A design is complete when:

```text
canonical authority matrix defined                    PASS
two-source verification handshake defined            PASS
manifest blind-propagation forbidden                  PASS
sync-state auto-heal forbidden                        PASS
fact classes defined                                  PASS
human-judgment firewall defined                       PASS
machine marker format defined                         PASS
marker ambiguity fail-closed                          PASS
initial target blocks defined                         PASS
unmanaged bytes protected                             PASS
deterministic rendering defined                       PASS
idempotence defined                                   PASS
identity drift dimensions defined                     PASS
current drift preserved as future negative fixture   PASS
RS2-2 subphase map defined                            PASS
runtime diff                                          NONE
release-simcore diff                                  NONE
manifest diff                                         NONE
existing release workflow change                      NONE
```

No implementation is required to close the **design** subphase.

---

## 30. Handoff to RS2-2B

RS2-2B must turn these authority rules into an executable tool contract.

The next design must define at minimum:

```text
node products/simcore/tooling/sync-state.mjs

--check
--render / --write boundary
--manifest <path>
--production-source <path or verified materialized identity input>
--target registry
structured bounded report
exit codes
atomic local file update
no GitHub/API operations inside the tool
```

The tool must preserve the same architectural split used by the permanent test harness:

```text
outer orchestrator resolves repository refs
inner tool receives local immutable inputs
```

No branch push, manifest rewrite, release deployment, or GitHub permission belongs inside `sync-state.mjs`.

---

## 31. Frozen final rule

RS2-2A follows one rule above all others:

> Machine synchronization may remove duplicated facts, but it may never remove human authority.

A stale fact should be detected before it is propagated.

A missing judgment must remain missing until a human/evidence-backed process makes that judgment.

A synchronization tool is safest when it knows exactly which bytes it owns — and refuses everything else.

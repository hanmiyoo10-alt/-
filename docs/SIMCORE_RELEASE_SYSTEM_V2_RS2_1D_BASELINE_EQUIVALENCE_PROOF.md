# SimCore Release System v2 — RS2-1D Baseline Equivalence Proof

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Fixture inventory: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
Harness contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
First pack contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
Phase: `RS2-1 — Durable Tests`
Subphase: `RS2-1D — Baseline Equivalence Proof`
Authority class: release-infrastructure design / migration-equivalence contract

---

## 1. Purpose

RS2-1D defines how SimCore proves that the new permanent regression pack preserves the safety meaning of historical release-specific assertions before those assertions may be retired, narrowed, or replaced.

The core question is not:

```text
Did the new test pass?
```

It is:

```text
Does the new permanent test protect the same bounded contract that the old release-specific evidence protected,
using the same relevant source behavior and the same expected outcome,
without silently dropping an assertion or replacing runtime evidence with a weaker static marker?
```

RS2-1D therefore freezes:

- the unit of equivalence;
- legacy-proof provenance requirements;
- source pinning rules;
- equivalence outcome classes;
- behavioral versus structural assertion matching;
- negative-control matching;
- differential proof rules;
- transitional-suite handling;
- retirement eligibility;
- bounded equivalence records;
- Batch A suite-by-suite proof requirements;
- failure handling;
- the handoff to RS2-1E.

This document does **not** implement the harness, execute the proof, delete historical workflows, change production, change `release-simcore`, change the manifest, create permanent CI, or authorize M2-3.

---

## 2. Non-goals and hard scope

RS2-1D does not authorize:

- rerunning historical write-capable release workflows as-is;
- pushing historical work branches merely to reproduce old CI;
- restoring old production versions to `release-simcore`;
- modifying source under test to make old and new tests agree;
- declaring a static marker equivalent to a dynamic state transition without evidence;
- preserving every historical workflow line forever;
- deleting a whole historical workflow because one assertion inside it was migrated;
- treating live long-chat evidence as reproducible unit-test execution when it is not;
- changing a fixture expectation because the new harness disagrees with the historical contract;
- importing full raw long-chat logs into permanent test assets.

Equivalence proof is read-only migration evidence.

---

## 3. Equivalence is assertion-level, not workflow-level

Historical SimCore workflows often combined several responsibilities:

```text
patch candidate source
+ syntax checks
+ version checks
+ frozen-surface checks
+ behavioral fixtures
+ architecture checks
+ commit/push behavior
```

The permanent harness must not claim equivalence to that entire workflow.

The RS2-1D unit of comparison is one bounded **legacy assertion contract**.

Conceptually:

```text
legacy workflow / script / evidence
        ↓
identify bounded assertion
        ↓
map to stable permanent fixture(s)
        ↓
execute or inspect both under pinned provenance
        ↓
classify equivalence
```

Example:

```text
v0.64.5 one-shot assertion:
multiline bilingual 4+1 section passes under logical-unit validation

maps to:
community-reaction.section-4-top-1-reply-valid
```

The workflow's candidate patching and git push steps are not part of this equivalence unit.

---

## 4. Legacy proof sources

A legacy assertion may originate from one or more of these bounded sources:

```text
LEGACY_WORKFLOW_ASSERTION
LEGACY_RELEASE_SCRIPT_ASSERTION
LEGACY_STATIC_CHECK
LIVE_EVIDENCE_CONTRACT
DESIGN_FROZEN_CONTRACT
```

Each equivalence record must state which source class is being mapped.

### 4.1 `LEGACY_WORKFLOW_ASSERTION`

A deterministic assertion embedded in a historical GitHub Actions workflow.

Examples:

- v0.64.5 `MISSING ×5` historical reproducer;
- valid multiline logical-unit PASS;
- malformed reaction negatives;
- unchanged cardinality checks.

### 4.2 `LEGACY_RELEASE_SCRIPT_ASSERTION`

A deterministic assertion in a historical patch/build script.

Use only when the script assertion itself protected a durable behavior or boundary. Patch mechanics are not automatically migration-worthy.

### 4.3 `LEGACY_STATIC_CHECK`

A source/body/marker/hash assertion that protected a frozen surface.

A static check may map only to another static/source-binding contract unless the permanent test also directly executes the behavior.

Static evidence must never be relabeled as dynamic equivalence.

### 4.4 `LIVE_EVIDENCE_CONTRACT`

A behavior established by natural long-chat evidence.

Live evidence can justify the fixture expectation and golden contract, but it is not itself replayable execution unless a bounded captured shape reproduces the same deterministic decision.

The equivalence record must distinguish:

```text
historical live authority
from
permanent deterministic coverage
```

### 4.5 `DESIGN_FROZEN_CONTRACT`

A contract explicitly frozen for a later architecture checkpoint.

This source class is supplemental. A design statement alone does not prove runtime equivalence if historical runtime evidence exists and disagrees.

---

## 5. Source pinning contract

Equivalence must be attributed to exact source bytes.

Every executable equivalence run records:

```text
source reference
source SHA-256
source byte length
version marker observed in source
```

Historical proof sources are pinned by immutable commit SHA or blob identity where available.

Do not use a moving branch name such as `main` or `release-simcore` as the sole identity of a historical baseline.

### 5.1 Historical source use

Historical source is materialized read-only from an immutable ref.

Examples:

```text
v0.64.4 production source
v0.64.5 production source
v0.63.55 production source where needed for historical relation proof
```

The permanent harness receives local file paths only, consistent with RS2-1B.

### 5.2 Current production use

A second proof may execute the current production source to show the durable contract remains preserved.

This current-production proof is useful but does not replace historical migration attribution.

### 5.3 No historical source mutation

If a historical source cannot be extracted by the current harness without source rewriting, classify the migration limitation explicitly.

Do not patch old code just to make the new harness understand it and then call the result equivalent.

---

## 6. Equivalence dimensions

Each legacy assertion mapping is evaluated across four independent dimensions.

```text
INPUT_EQUIVALENCE
OUTCOME_EQUIVALENCE
NEGATIVE_EQUIVALENCE
EXECUTION_EQUIVALENCE
```

### 6.1 Input equivalence

The permanent fixture must preserve the minimum input shape relevant to the historical assertion.

Allowed reductions:

- anonymize irrelevant names;
- replace unrelated prose with neutral placeholders;
- retain fingerprint relations rather than full assistant bodies;
- retain logical comment structure rather than full COMMUNITY posts.

Forbidden reductions:

- remove the line boundary that caused a multiline defect;
- remove the distinction between canonical and Fresh fingerprints;
- remove B_END terminal timestamp structure when terminal closure is under test;
- remove fallback failure ordering when diagnostic-copy classification is under test.

### 6.2 Outcome equivalence

The permanent assertion must preserve the historical bounded expected outcome.

Examples:

```text
MISSING ×5
PASS
REPRESENTATION_DRIFT_CORRELATED
representation-fast-reconciled
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
COMPLETE / PARTIAL closure classification
COPIED_FALLBACK
```

Equivalent wording is allowed only when the semantic result is exactly mapped and documented.

### 6.3 Negative equivalence

If the historical control distinguished valid from invalid cases, the permanent suite must preserve the meaningful negatives.

A new positive-only test cannot replace an old positive-plus-negative assertion family.

### 6.4 Execution equivalence

The proof must state whether the old and new assertions execute the same production owner surface.

Classes:

```text
DIRECT_OWNER_MATCH
OWNER_MOVED_EQUIVALENTLY
STATIC_TO_STATIC
TRANSITIONAL_PARTIAL
LIVE_ONLY
```

`TRANSITIONAL_PARTIAL` and `LIVE_ONLY` cannot be presented as full dynamic replacement.

---

## 7. Equivalence outcome model

Every mapped legacy assertion receives exactly one outcome:

```text
EXACT_EQUIVALENT
COMPATIBLE_SUPERSET
PARTIAL_TRANSITIONAL
NOT_EQUIVALENT
UNPROVABLE
```

### 7.1 `EXACT_EQUIVALENT`

Use when:

- the relevant input shape is preserved;
- the expected outcome is preserved;
- required negative controls are preserved;
- the same production owner or a formally moved equivalent owner is executed;
- no historical assertion meaning is lost.

This is retirement-eligible for the mapped legacy assertion.

### 7.2 `COMPATIBLE_SUPERSET`

Use when the permanent suite proves every historical requirement and adds stricter compatible checks.

Example:

```text
legacy: multiline bilingual unit must PASS
permanent: same PASS + historical single-line PASS + missing/multiple/final-tail negatives
```

Superset status is allowed only if the original acceptance boundary is unchanged.

This is retirement-eligible for the mapped legacy assertion.

### 7.3 `PARTIAL_TRANSITIONAL`

Use when the permanent suite preserves some deterministic owner behavior but cannot execute the full historical decision path safely under the current architecture.

Typical RS2-1C cases:

```text
representation-fast
genuine-edit
broadcast-closure
```

A `PARTIAL_TRANSITIONAL` result means:

```text
permanent coverage is useful
but historical assertion/live evidence is not yet replaceable
```

This is not retirement-eligible.

### 7.4 `NOT_EQUIVALENT`

Use when the permanent suite tests a materially different contract or misses a required historical distinction.

This blocks replacement and must be fixed before RS2-1E can authorize that suite as a replacement gate.

### 7.5 `UNPROVABLE`

Use when historical evidence is insufficient, source cannot be safely materialized/extracted, or the old assertion cannot be reconstructed without speculation.

Do not convert `UNPROVABLE` to PASS by inference.

The legacy control remains retained until a later explicit disposition.

---

## 8. Whole-pack status

`batch-a` receives one aggregate equivalence status derived from its suites:

```text
FULL_REPLACEMENT_READY
PARTIAL_REPLACEMENT_ONLY
BLOCKED
```

Rules:

### `FULL_REPLACEMENT_READY`

All required mapped assertions are `EXACT_EQUIVALENT` or `COMPATIBLE_SUPERSET`.

### `PARTIAL_REPLACEMENT_ONLY`

At least one required suite is `PARTIAL_TRANSITIONAL`, but no required assertion is `NOT_EQUIVALENT`.

### `BLOCKED`

Any required mapping is `NOT_EQUIVALENT`, or a required proof artifact is missing in a way that makes migration unsafe.

`UNPROVABLE` for an optional historical assertion may be documented without blocking the whole pack, but `UNPROVABLE` for a required contract keeps that suite non-replaceable.

At the current RS2-1C design boundary, the expected initial aggregate status is:

```text
PARTIAL_REPLACEMENT_ONLY
```

because A1, A2, and A4 are intentionally `HYBRID_TRANSITIONAL` until their executable ownership boundaries improve.

---

## 9. Equivalence record schema

RS2-1D implementation must create bounded machine-readable records separate from fixture payloads.

Directional location:

```text
products/simcore/tests/equivalence/
  batch-a.equivalence.json
```

Conceptual record:

```json
{
  "equivalenceVersion": 1,
  "suite": "community-reaction",
  "legacy": {
    "sourceClass": "LEGACY_WORKFLOW_ASSERTION",
    "sourcePath": ".github/workflows/simcore-06405-community-multiline-reaction-unit.yml",
    "sourceCommit": "<immutable commit>",
    "assertionId": "multiline-bilingual-logical-unit-pass"
  },
  "permanent": {
    "fixtureIds": [
      "community-reaction.section-4-top-1-reply-valid"
    ],
    "suite": "community-reaction"
  },
  "sourceUnderTest": {
    "historicalVersion": "0.64.5",
    "sha256": "<computed>"
  },
  "dimensions": {
    "input": "PASS",
    "outcome": "PASS",
    "negative": "PASS",
    "execution": "DIRECT_OWNER_MATCH"
  },
  "result": "COMPATIBLE_SUPERSET",
  "retirementEligible": true
}
```

The implementation may choose a slightly different syntax, but these semantic fields are frozen.

No record may embed full workflow text, full source files, full diagnostic dumps, or raw long-chat transcripts.

---

## 10. Legacy assertion map

The implementation must maintain an explicit assertion map rather than discovering historical tests through globs.

Directional location:

```text
products/simcore/tests/equivalence/legacy-map.json
```

Each entry maps:

```text
legacy assertion ID
→ permanent suite
→ permanent fixture IDs
→ required proof dimensions
→ retirement policy
```

This map is migration authority only.

It is not the ordinary permanent test registry and must not be required on every future release after migration evidence is frozen.

---

## 11. Historical workflow safety

Historical workflows may have write permissions or patch/commit steps.

RS2-1D must never invoke such workflows as the proof mechanism.

Instead:

1. pin the historical workflow/script by immutable commit;
2. identify the bounded assertion logic;
3. reproduce only the read-only deterministic assertion in an equivalence adapter or explicit reference function;
4. materialize historical source read-only;
5. compare results with the permanent suite.

Historical reference functions must be clearly named:

```text
legacyReference...
```

and must live only under equivalence/migration tooling.

They must not be used in ordinary permanent regression execution.

---

## 12. Differential proof contract

Differential proof is mandatory when the historical release fixed a defect by changing an acceptance or decision result that can be safely reproduced.

Canonical shape:

```text
historical baseline source
→ bounded fixture
→ expected old result

fixed source
→ same bounded fixture
→ expected repaired result

current production source
→ durable golden fixture
→ expected current result
```

This proves both:

- the fixture actually represents the old defect; and
- the permanent golden test protects the repaired behavior.

A fixture that passes both old and new source cannot, by itself, prove migration of a defect-specific differential.

---

# 13. Suite A3 — COMMUNITY Reaction equivalence

Expected initial equivalence class:

```text
COMPATIBLE_SUPERSET
```

provided implementation reproduces all required controls.

### Required historical differential

Pinned v0.64.4 source:

```text
bounded bilingual 4 top + 1 reply shape
physical starter-line legacy reference
→ MISSING ×5
```

Pinned v0.64.5 source:

```text
same bounded shape
community.commentUnits
reaction.inspectCommentReactionLine
→ PASS
```

### Required permanent golden proof

Current source:

```text
multiline bilingual TOP        PASS
multiline bilingual REPLY      PASS
4 top + 1 reply section        PASS
historical single-line format  PASS
```

Permanent negatives:

```text
missing             MISSING
multiple            MULTIPLE
tag-before-tail     FINAL_TAIL
visible-after-tag   FINAL_TAIL
unrelated bracket   MISSING
```

### Retirement boundary

After proof PASS, the v0.64.5 one-shot **reaction-unit behavioral assertions** are retirement-eligible.

The entire v0.64.5 workflow is not automatically retirement-eligible because it also contains release/build/frozen-surface responsibilities outside this suite.

---

# 14. Suite A5 — Diagnostic Copy equivalence

Expected initial equivalence class:

```text
EXACT_EQUIVALENT
or
COMPATIBLE_SUPERSET
```

The final class depends on whether the permanent suite adds only compatible extra negative controls.

Required owner functions:

```text
runDiagnosticCopy
fallbackCopyText
```

Required outcomes:

```text
COPIED
COPIED_FALLBACK
REPORT_BUILD_FAILED
CLIPBOARD_WRITE_FAILED
```

Required historical semantics:

```text
builder called exactly once
primary/fallback payload identical
builder failure prevents clipboard attempt
fallback DOM node always cleaned up
focus restoration best-effort contract preserved
clipboard failure distinct from report-build failure
```

### Source-binding caution

The equivalence proof must distinguish `runDiagnosticCopy` transport/state classification from the separately repaired B_END report-builder binding introduced in v0.64.3.

A diagnostic-copy suite PASS does not automatically prove every B_END report-builder free variable is bound.

If a historical builder-binding assertion is migrated, it receives its own legacy assertion ID and source-binding proof.

### Retirement boundary

Only the mapped diagnostic-copy deterministic assertions become retirement-eligible.

Live clipboard/WebView behavior remains separate real-host evidence where applicable.

---

# 15. Suite A1 — Representation Fast equivalence

Expected initial equivalence class:

```text
PARTIAL_TRANSITIONAL
```

Required deterministic permanent proof:

```text
representation.inspectCarryover
→ priorRepresentation OUTPUT_MISMATCH
→ currentMatch FRESH_CHAT
→ FRESH_EXACT_CARRYOVER
```

Required source-binding proof:

```text
outer runtime still consumes those Representation facts
representationFastEligible still requires same-slot/current+trusted canonical guards
success reason remains representation-fast-reconciled
```

Historical live authority additionally established:

```text
REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

The current permanent suite cannot claim full dynamic equivalence until the final decision path is executable without outer runtime boot.

### Retirement boundary

Do not retire historical Representation Fast decision-path assertions or live golden evidence during initial RS2-1D.

After M2-3 exposes `edit-reconcile`, rerun this mapping with direct service execution.

Required target result after M2-3:

```text
EXACT_EQUIVALENT
or COMPATIBLE_SUPERSET
```

---

# 16. Suite A2 — Genuine Edit equivalence

Expected initial equivalence class:

```text
PARTIAL_TRANSITIONAL
```

Required deterministic permanent proof:

```text
priorRepresentation EXACT
currentMatch NONE
NEW_VISIBLE_REPRESENTATION
```

Required source-binding proof:

```text
USER_EDIT_CANDIDATE marker remains bound to the non-Fresh/non-canonical path
MANUAL_EDIT_REBUILT remains the state-changing result
```

Historical live authority additionally established actual rebuild/state acceptance.

The initial permanent suite must not claim dynamic snapshot mutation equivalence when it only executes Representation facts.

### Retirement boundary

Historical genuine-edit live evidence remains authoritative until `edit-reconcile` can be exercised directly with deterministic Store and Session Port stubs.

Post-M2-3 mapping must prove:

```text
USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ expected save/commit path
→ snapshot updated
```

before retirement eligibility becomes true.

---

# 17. Suite A4 — B_END Closure equivalence

Expected initial equivalence class:

```text
PARTIAL_TRANSITIONAL
```

Required deterministic permanent proof:

```text
Time terminal canonical timestamp sequence
Structure valid 2 COMMUNITY × 3 sections
4 top + 1 reply per section where required
valid reaction units produce no COMMUNITY warning
```

Required closure source-binding proof:

```text
runtime mode B_END
terminal EXPLICIT predicate
community-clean predicate
COMPLETE iff terminal explicit + structure clean
PARTIAL otherwise
```

Historical live authority remains necessary for:

```text
stored terminal broadcast airtime
actual unlock behavior
real B_END lifecycle state transition
```

### Required quarantine control

The historical v0.64.4 case must remain represented:

```text
Broadcast end authority ALLOWED
terminal EXPLICIT
stored terminal airtime valid
broadcast UNLOCKED
COMMUNITY warning present
→ closure PARTIAL / structure QUARANTINED
```

This prevents future tests from conflating Broadcast authority with Structure cleanliness.

### Retirement boundary

Do not retire live B_END closure controls or state-transition assertions while the suite remains transitional.

---

## 18. Legacy live evidence treatment

Real long-chat evidence has two roles:

```text
EXPECTATION AUTHORITY
REAL-HOST CLOSE GATE
```

Permanent tests may replace deterministic release-specific assertions, but they do not erase the fact that some contracts require real-host validation.

For example:

```text
representation-fast snapshot unchanged
actual user edit rebuild
broadcast unlock
clipboard behavior inside PocketRisu/WebView
```

may retain live-gate significance even after deterministic unit coverage improves.

RS2-1D must never label a deterministic unit test as proof that a real-host integration gate occurred.

---

## 19. Required equivalence report

The proof run emits a bounded report containing:

```text
pack status
suite status
legacy assertion IDs
historical source identity
permanent fixture IDs
input/outcome/negative/execution dimensions
final equivalence class
retirement eligibility
missing executable surface when transitional
```

Forbidden report contents:

- full source text;
- full workflow YAML;
- full diagnostic reports;
- full long-chat outputs;
- arbitrary stack dumps;
- secrets or provider data.

A failed assertion may include a bounded error code and expected/observed scalar or enum values.

---

## 20. Failure codes

RS2-1D implementation should use bounded failure classes equivalent to:

```text
LEGACY_ASSERTION_NOT_FOUND
LEGACY_SOURCE_UNAVAILABLE
HISTORICAL_SOURCE_HASH_MISMATCH
INPUT_SHAPE_MISMATCH
OUTCOME_MISMATCH
NEGATIVE_CONTROL_MISSING
OWNER_SURFACE_MISMATCH
REFERENCE_ADAPTER_AMBIGUOUS
PERMANENT_FIXTURE_MISSING
TRANSITIONAL_SURFACE_UNRESOLVED
RAW_DATA_POLICY_VIOLATION
```

Failure must not trigger automatic fixture relaxation.

The disposition is evidence-first:

```text
FIX proof tooling
or
retain legacy assertion
or
classify UNPROVABLE
```

---

## 21. Retirement rules

A legacy assertion is retirement-eligible only when:

```text
result = EXACT_EQUIVALENT or COMPATIBLE_SUPERSET
required proof dimensions all PASS
permanent fixture is registered
permanent suite passes on current production baseline
no required real-host authority is being falsely replaced
```

Retirement means the old assertion no longer needs to remain an active release gate.

Retirement does **not** necessarily mean deleting the historical workflow file immediately.

Historical artifacts may remain as evidence until RS2-4 retires the old release mechanism safely.

### 21.1 No whole-file retirement inference

One migrated assertion never authorizes deletion of unrelated checks in the same historical workflow.

Each relevant assertion family must be mapped independently.

### 21.2 Transitional retention

`PARTIAL_TRANSITIONAL` always means:

```text
retain old assertion/live authority
```

until a later mapping upgrades the result.

---

## 22. Expected first RS2-1D result

Given the RS2-1C architecture, the expected initial Batch A matrix is:

| Suite | Expected equivalence | Retirement eligibility |
|---|---|---|
| `community-reaction` | `COMPATIBLE_SUPERSET` | yes, mapped behavioral assertions only |
| `diagnostic-copy` | `EXACT_EQUIVALENT` or `COMPATIBLE_SUPERSET` | yes, mapped deterministic assertions only |
| `representation-fast` | `PARTIAL_TRANSITIONAL` | no |
| `genuine-edit` | `PARTIAL_TRANSITIONAL` | no |
| `broadcast-closure` | `PARTIAL_TRANSITIONAL` | no |

Therefore the expected initial pack status is:

```text
PARTIAL_REPLACEMENT_ONLY
```

This is not a failure of RS2-1D.

It is the honest result of preserving strong attribution boundaries while M2-3 has not yet exposed Edit Reconcile as an independently executable application service and B_END closure remains partly integrated.

---

## 23. M2-3 interaction rule

Release System v2 must not force M2-3 to change its runtime design merely to satisfy the harness.

However, after M2-3 naturally introduces the already-frozen `edit-reconcile` ownership boundary, RS2 should immediately re-evaluate:

```text
representation-fast
genuine-edit
```

using the same stable fixture IDs.

The expected migration is:

```text
HYBRID_TRANSITIONAL
→ EXECUTABLE

PARTIAL_TRANSITIONAL equivalence
→ EXACT_EQUIVALENT / COMPATIBLE_SUPERSET
```

No fixture renaming or evidence reset is required.

B_END closure may remain transitional until its remaining state/lifecycle boundary becomes safely executable; it is not allowed to drag an unrelated refactor into M2-3.

---

## 24. Implementation order for RS2-1D

When implementation is authorized, use this order:

```text
D0 create equivalence work branch from current main
D1 implement legacy assertion map schema
D2 pin immutable historical assertion/source provenance
D3 implement safe read-only legacy reference adapters
D4 prove community-reaction differential/equivalence
D5 prove diagnostic-copy equivalence
D6 record representation-fast transitional mapping
D7 record genuine-edit transitional mapping
D8 record broadcast-closure transitional mapping
D9 run current-production golden pack
D10 emit batch-a equivalence report
D11 record retirement-eligible assertion IDs only
D12 hand result to RS2-1E
```

No active historical workflow is deleted in RS2-1D implementation.

---

## 25. Validation gate for the equivalence implementation

RS2-1D implementation is valid only if:

```text
legacy map schema valid                              PASS
all required Batch A suites mapped                   PASS
historical refs immutable                            PASS
historical source materialization read-only          PASS
no write-capable legacy workflow invoked             PASS
permanent fixture IDs resolve                        PASS
community historical differential                    PASS
diagnostic-copy mapped assertions                    PASS
transitional suites explicitly marked partial        PASS
no partial suite marked retirement-eligible          PASS
current production batch-a run                       PASS or documented transitional result
bounded report policy                                PASS
raw long-chat retention                              NONE
release-simcore diff                                 NONE
SimCore runtime diff                                 NONE
manifest write                                      NONE
release mechanism change                             NONE
```

A mismatch is not repaired by weakening the permanent fixture. It is investigated as either a migration bug, a stale historical assertion, or a real regression.

---

## 26. RS2-1D close gate

RS2-1D design is complete when:

```text
equivalence unit defined                             PASS
legacy source classes defined                        PASS
source pinning contract defined                      PASS
four equivalence dimensions defined                  PASS
five outcome classes defined                         PASS
whole-pack status model defined                      PASS
retirement eligibility defined                       PASS
historical workflow safety defined                   PASS
Batch A suite mapping rules defined                  PASS
transitional suites cannot masquerade as full        PASS
live evidence treatment defined                      PASS
failure codes defined                                PASS
M2-3 upgrade path defined                            PASS
runtime diff                                         NONE
release-simcore diff                                 NONE
```

No equivalence execution is required to close the **design** subphase.

---

## 27. Handoff to RS2-1E

After RS2-1D implementation produces a bounded equivalence report, RS2-1E decides what RS2-1 is actually allowed to claim operationally.

RS2-1E must distinguish at least:

```text
DURABLE_TESTS_AVAILABLE
PARTIAL_REPLACEMENT_AUTHORIZED
FULL_REPLACEMENT_AUTHORIZED
```

The expected first decision, if RS2-1D matches this design, is:

```text
DURABLE_TESTS_AVAILABLE
+
PARTIAL_REPLACEMENT_AUTHORIZED
```

not full historical-release-gate replacement.

Full replacement requires the remaining transitional suites to obtain direct executable equivalence or an explicit later disposition.

RS2-1E also decides whether RS2-2 State Synchronization may begin while those transitional behavioral controls remain retained.

---

## 28. Frozen final rule

RS2-1D follows one rule above all others:

> A permanent test replaces a historical assertion only when it preserves the same evidence meaning, not merely when both happen to be green.

A weaker but cleaner new harness is not an upgrade.

A partial result that is labeled partial is acceptable.

A partial result labeled equivalent is not.

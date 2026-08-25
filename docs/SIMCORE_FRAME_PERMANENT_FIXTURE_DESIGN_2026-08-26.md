# SimCore Frame Permanent Fixture Design — 2026-08-26

Status: `DESIGN FROZEN · IMPLEMENTATION-READY PERMANENT FIXTURE FAMILY · OWNER-SPLIT FRAME/STRUCTURE · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_LIVE_06405_VALIDATION.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tooling/bundle-loader.mjs`
- production authority: `release-simcore` v0.64.7

## 1. Purpose

Define the next implementation-ready permanent regression family:

```text
frame
```

The suite protects two adjacent but distinct product contracts:

```text
FRAME_CONTINUITY
= Frame-owned Volume / Chapter / Chatindex continuity and deterministic repair

FRAME_ENVELOPE_STRUCTURE
= Structure-owned # 응답 / Volume / Chapter / Chatindex / canonical timestamp frame shape
```

The stable suite ID is shared because both sub-families protect the visible response frame, but the suite must preserve the owner split and must not invent a unified runtime Frame authority that does not exist in production.

## 2. Why this must remain separate from `narrative-clock`

The visible canonical timestamp appears inside the response frame, but two independent contracts exist:

```text
Structure frame check
→ is one valid canonical timestamp placed immediately after Chatindex in the frame?

Time / narrative-clock
→ what timestamp is allowed to become current Narrative time?
→ is the timestamp monotonic / floor-compliant / commit-authoritative?
```

Therefore this suite may test timestamp **presence, syntax, and frame position** through Structure.

It must not duplicate:

- Narrative current-time floor semantics;
- Narrative tail promotion;
- post-B_END current-time-floor semantics;
- Broadcast terminal-time commit semantics.

Those remain in `narrative-clock` / `broadcast-closure`.

## 3. Production owner map

### 3.1 Frame owner

Current production `frame` exports:

```text
parseFrame
capturePreviousFrame
enforceContinuity
rewriteVolumeNumber
rewriteChapterNumber
rewriteChatindexNumber
```

Frame owns:

```text
Volume numeric identity
Chapter numeric identity + normalized title identity
Chatindex numeric identity
previous visible assistant frame capture
bounded continuity expectations
deterministic number/header repair
continuity probe facts
```

### 3.2 Structure owner

Current production `structure` exports:

```text
responseEnvelopeScope
responseEnvelopeIntegrity
stateCommitSafety
validateStructure
```

For this suite, the preferred surface is:

```text
responseEnvelopeScope
```

because it isolates the visible frame shape without requiring unrelated COMMUNITY or Knowledge fixtures.

Structure owns the assertion that the active response frame is exactly ordered as:

```text
# 응답
## 볼륨 N: ...
### 챕터 N: ...
#### Chatindex: N ... ∮
⏱️[canonical timestamp]
```

with exactly one valid marker of each class and no non-whitespace content inserted between the frame items.

## 4. Harness feasibility

Both owners are direct `SimCore.define(...)` modules and are loadable through the existing permanent `BundleLoader`.

Therefore expected coverage is:

```text
EXECUTABLE
```

No source-binding regex bridge is required.

No production patch is required for testability.

No new loader capability is required.

No source modularization is required.

## 5. Stable suite identity

Proposed permanent files when implementation is explicitly selected:

```text
products/simcore/tests/suites/frame.test.mjs
products/simcore/tests/fixtures/frame/cases.json
```

Registry concept:

```text
id: frame
coverage: EXECUTABLE
required: true
goldenGate: true
```

Adding the registry row expands the permanent regression surface only. It must not be combined with pack-topology redesign or release-system restructuring.

## 6. Evidence maturity

### 6.1 Deterministic Frame continuity

Contract maturity:

```text
ESTABLISHED
```

The deferred ledger already treats Frame progression / deterministic repair as a protected regression control.

### 6.2 Natural `CHATINDEX_SAME` repair

v0.64.5 provides direct long-chat evidence:

```text
Frame sequence: REPAIRED
Frame guard: REPAIRED · CHATINDEX_SAME
RAW frame continuity: Chatindex 1027→1028 ADVANCED
```

The repaired visible result advanced correctly and no regression persisted into following turns.

Therefore:

```text
frame-continuity.chatindex-same-repair
= DIRECT_LIVE_CONTROL
```

The permanent fixture protects the semantic repair result, not the exact diagnostic sentence wording.

### 6.3 Structure frame-envelope contract

The deterministic production contract is established and directly executable.

Do not claim that every malformed-envelope negative fixture has a dedicated historical live incident unless its evidence document actually says so.

Fixture value may be `GOLDEN_CONTRACT` without fabricating live provenance for every synthetic negative.

## 7. Frame continuity invariants

Current production semantics are intentionally bounded.

### Volume

```text
observed < previous
→ restore previous Volume
→ hold previous Chapter header when available

observed == previous
→ same Volume

observed > previous
→ expected Volume = previous + 1
→ jumps larger than +1 are repaired to +1
```

### Chapter

Within the same Volume:

```text
same normalized Chapter title
→ Chapter number must hold previous value

different normalized Chapter title
→ Chapter number must advance exactly +1

missing/non-comparable titles
→ do not invent title-transition semantics
→ only explicit backward numeric movement may be repaired
```

After Volume advance:

```text
Chapter expected = 1
```

### Chatindex

With a comparable previous Chatindex:

```text
expected = previous + 1
```

Any other observed value is repaired to that exact expected value and attributed as one of:

```text
CHATINDEX_SAME
CHATINDEX_BACKWARD
CHATINDEX_JUMP
```

## 8. Previous-frame capture safety invariant

`capturePreviousFrame(...)` scans backward to the nearest prior assistant/char message.

Critical safety behavior:

```text
nearest prior assistant contains at least one parsable frame component
→ use that assistant as previous-frame source

nearest prior assistant contains no parsable frame component
→ return null
→ do NOT skip it and silently borrow an older assistant frame
```

This prevents a stale older frame from becoming authority merely because the immediately previous assistant is malformed/unframed.

This should be permanent fixture coverage.

## 9. Frame envelope invariants

`Structure.responseEnvelopeScope(...)` owns only visible frame shape.

For a clean frame:

```text
one # 응답 marker
one valid Volume header
one valid Chapter header
one valid Chatindex header
one valid canonical timestamp after Chatindex
strict order
no non-whitespace gap content between those frame items
```

The fixture must distinguish:

```text
frameOk
orderOk
timestampMarkerFound
timestampValid
timestamp
```

The suite must not convert these fields into Narrative clock claims.

## 10. Required initial fixture matrix

The first permanent family should include the following cases.

### A. Frame parsing / capture

#### A1. `parse-basic-frame`

Input:

```text
## 볼륨 3: Test
### 챕터 7: Same Title
#### Chatindex: 1028 ∮
```

Expected bounded parse:

```text
volume      3
chapter     7
chapterTitle "Same Title"
chatindex   1028
```

Purpose: protect direct numeric/title extraction.

#### A2. `capture-nearest-assistant-frame`

Messages contain a valid nearest prior assistant frame.

Expected:

```text
captured sourceAssistantIndex = nearest prior assistant
bounded parsed frame matches that assistant
```

#### A3. `capture-nearest-assistant-unframed-none`

The nearest prior assistant is unframed, while an older assistant contains a valid frame.

Expected:

```text
capturePreviousFrame(...) = null
```

Purpose:

```text
no stale-frame skip-back authority
```

### B. Frame continuity

Use a common previous frame where useful, for example:

```text
Volume 3
Chapter 7
Chapter title "Same Title"
Chatindex 1027
```

#### B1. `continuity-clean-pass`

Observed:

```text
Volume 3
Chapter 7
same normalized title
Chatindex 1028
```

Expected:

```text
applied false
sequenceStatus PASS
repairs []
output unchanged
```

#### B2. `chapter-same-title-hold-repair`

Observed same Volume and same normalized title, but Chapter is `8`.

Expected:

```text
chapterSignal SAME_TITLE_HOLD
expected.chapter 7
repair includes CHAPTER_TITLE_HOLD
output Chapter 7
```

The title may include harmless whitespace/NFKC variation to prove normalized-title identity rather than byte identity.

#### B3. `chapter-title-change-advance-repair`

Observed same Volume, changed title, but Chapter remains `7`.

Expected:

```text
chapterSignal TITLE_CHANGED_ADVANCE
expected.chapter 8
repair includes CHAPTER_TITLE_ADVANCE
output Chapter 8
```

#### B4. `unresolved-title-no-invented-advance`

One side lacks a comparable title while Chapter is not backward.

Expected:

```text
chapterSignal UNRESOLVED_TITLE
no title-based Chapter repair
```

Purpose: fail open rather than invent chapter semantics.

#### B5. `volume-advance-chapter-reset`

Observed Volume advances from `3` to `4`, but Chapter is not `1`.

Expected:

```text
volumeSignal ADVANCED
expected.volume 4
chapterSignal RESET_AFTER_VOLUME_ADVANCE
expected.chapter 1
repair includes CHAPTER_RESET
```

#### B6. `volume-jump-repair`

Observed Volume jumps from `3` to `6`.

Expected:

```text
expected.volume 4
repair includes VOLUME_JUMP
output Volume 4
```

#### B7. `volume-backward-restore`

Observed Volume is below previous.

Expected:

```text
volumeSignal BACKWARD
expected.volume previous.volume
repair includes VOLUME_BACKWARD
previous Volume header restored when available
previous Chapter header held when available
```

#### B8. `chatindex-same-repair`

Observed Chatindex equals previous Chatindex.

Expected:

```text
expected.chatindex = previous + 1
repair includes CHATINDEX_SAME
output Chatindex = previous + 1
sequenceStatus REPAIRED
```

Provenance:

```text
v0.64.5 direct live repair control
```

Do not assert exact human diagnostic wording.

#### B9. `chatindex-backward-repair`

Observed Chatindex is below expected.

Expected:

```text
repair includes CHATINDEX_BACKWARD
output = previous + 1
```

#### B10. `chatindex-jump-repair`

Observed Chatindex is above expected.

Expected:

```text
repair includes CHATINDEX_JUMP
output = previous + 1
```

### C. Structure-owned frame envelope

Use `structure.responseEnvelopeScope(...)` directly.

#### C1. `envelope-valid`

Input begins with exactly:

```text
# 응답
## 볼륨 1: Test
### 챕터 1: Test
#### Chatindex: 100 ∮
⏱️[2031-04-04 (Fri) 10:20 PM]
```

Expected:

```text
frameOk true
orderOk true
timestampMarkerFound true
timestampValid true
```

#### C2. `envelope-duplicate-header-invalid`

Duplicate one frame header class.

Expected:

```text
frameOk false
```

#### C3. `envelope-malformed-header-invalid`

A marker exists but its required format is malformed.

Expected:

```text
frameOk false
```

#### C4. `envelope-wrong-order-invalid`

Move Chapter/Chatindex or another frame item out of canonical order.

Expected:

```text
orderOk false
frameOk false
```

#### C5. `envelope-interstitial-text-invalid`

Insert visible non-whitespace text between two frame headers or between Chatindex and timestamp.

Expected:

```text
orderOk false
frameOk false
```

This freezes the existing clean-gap contract.

#### C6. `envelope-missing-timestamp-invalid`

No canonical timestamp marker after Chatindex.

Expected:

```text
timestampMarkerFound false
frameOk false
```

#### C7. `envelope-invalid-timestamp-invalid`

Timestamp marker exists but canonical syntax does not validate.

Expected:

```text
timestampMarkerFound true
timestampValid false
frameOk false
```

## 11. Fixture payload shape

One grouped fixture file is sufficient.

Conceptual metadata:

```json
{
  "schemaVersion": 1,
  "id": "frame.contract-matrix",
  "suite": "frame",
  "meta": {
    "goldenGate": true,
    "coverageExpectation": "EXECUTABLE",
    "evidenceMaturity": "MIXED_DIRECT_LIVE_AND_GOLDEN_CONTRACT",
    "liveControl": "v0.64.5 CHATINDEX_SAME safe repair"
  }
}
```

No schema revision is required merely to add bounded metadata because fixture-v1 permits additional `meta` properties.

## 12. Suite assertion contract

The suite should load owners once per fixture execution context:

```text
const frame = loader.load('frame')
const structure = loader.load('structure')
```

Then assert bounded semantic fields.

### Frame continuity assertions

Prefer:

```text
probe.applied
probe.regression
probe.sequenceStatus
probe.volumeSignal
probe.chapterSignal
probe.repairs
probe.previous
probe.observed
probe.expected
probe.output
reparsed output frame
```

Do not snapshot the entire rendered response string when bounded fields and parsed output are sufficient.

### Structure envelope assertions

Prefer:

```text
frameOk
orderOk
timestampMarkerFound
timestampValid
timestamp
```

Do not require COMMUNITY / Knowledge fixtures merely to test frame shape.

## 13. Semantic output, not diagnostic prose, is the golden authority

A historical diagnostic can say:

```text
Frame sequence: REPAIRED
Frame guard: REPAIRED · CHATINDEX_SAME
RAW frame continuity: Chatindex 1027→1028 ADVANCED
```

The permanent fixture should protect:

```text
observed 1027
expected 1028
repair CHATINDEX_SAME
output 1028
```

It should not fail merely because future diagnostic wording changes from `Frame guard` to another reader-facing phrase while the semantic probe remains equivalent.

Diagnostic wording belongs to diagnostic conformance work, not Frame product behavior.

## 14. Forbidden fixture expansion

Do not use `frame` fixtures to test unrelated semantics:

```text
Narrative timestamp floor / chronology
Broadcast terminal airtime
COMMUNITY block count
Knowledge tail placement
preamble recovery
output compatibility candidate selection
Summary Scope
Representation/Edit Reconcile
host-history/cache behavior
```

If a Frame test requires those systems to decide PASS, the fixture boundary is probably too broad.

## 15. No output-generation judge

The fixture does not ask a model to render a response and grade whether the chosen Chapter title was aesthetically appropriate.

It tests only deterministic SimCore-owned behavior:

```text
existing visible frame
+ previous visible frame
→ bounded continuity decision / repair
```

and Structure-owned frame-shape validity.

Main Model remains renderer.

## 16. Implementation sequence when selected

Normal SimCore workflow remains mandatory:

```text
main design/evidence record      COMPLETE by this document
→ dedicated work branch
→ add frame fixture + suite + registry row
→ run targeted frame suite
→ run full permanent harness / static checks
→ no release-simcore deployment required if production bytes are unchanged
→ merge main only after regression infrastructure validation
```

This is regression-infrastructure expansion, not a runtime feature release.

Do not mix it with M2-3 runtime ownership movement, warning-widget implementation, Store optimization, or release-system restructuring.

## 17. Promotion / retirement policy

Fixture IDs are behavior identities, not version identities.

Retire or alter a case only when an explicit product contract changes.

Examples:

```text
Frame ownership moves mechanically
→ fixture IDs remain
→ adapter may change

human diagnostic wording changes
→ fixture IDs remain

Chapter semantic rule intentionally changes
→ explicit contract change + fixture update/retirement evidence required
```

## 18. Current classification

```text
SIMCORE_FRAME_PERMANENT_FIXTURE
= DESIGN FROZEN
= IMPLEMENTATION READY
= EXECUTABLE
= STABLE SUITE ID frame
= FRAME_CONTINUITY + FRAME_ENVELOPE_STRUCTURE
= OWNER SPLIT PRESERVED
= CHATINDEX_SAME DIRECT LIVE CONTROL
= NO STALE OLDER FRAME SKIP-BACK
= NO NARRATIVE-CLOCK DUPLICATION
= NO BROADCAST-CLOSURE DUPLICATION
= SEMANTIC PROBE GOLDEN / DIAGNOSTIC WORDING FLEXIBLE
= NO RUNTIME CHANGE
= NO RELEASE-SIMCORE CHANGE
= NO RELEASE-SYSTEM RESTRUCTURE
```

## 19. Next regression-expansion question

After `summary-scope`, `narrative-clock`, and `frame` designs, the next useful audit should not automatically invent another suite.

Re-check the promotion map and existing registry to decide whether the highest-value next step is:

```text
A. Broadcast lifecycle expansion inside existing broadcast-closure
B. implement one of the now-frozen EXECUTABLE families
C. wait for M2-3 and upgrade representation-fast / genuine-edit from HYBRID_TRANSITIONAL
D. completeness audit of the regression-expansion design set
```

Prefer extending an existing owner-aligned suite over creating a redundant parallel suite.
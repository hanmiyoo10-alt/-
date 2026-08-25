# SimCore Summary Scope Permanent Fixture Design — 2026-08-26

Status: `DESIGN FROZEN · IMPLEMENTATION-READY PERMANENT FIXTURE FAMILY · CONTRACT_ESTABLISHED · NATURAL SEMANTIC CLOSE STILL VALIDATION_ONLY · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_M2_LIVE_06400_SCOPE_COMPARE.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tests/schema/fixture-v1.schema.json`
- `products/simcore/tooling/bundle-loader.mjs`
- production authority: `release-simcore` v0.64.7

## 1. Purpose

Define the first implementation-ready expansion candidate after the existing permanent regression pack:

```text
summary-scope
```

The suite protects the deterministic Lifecycle-owned request classifier introduced by v0.64.1:

```text
request text + current mode
→ Lifecycle.classifySummaryScope(...)
→ NONE / ANNUAL_ONLY / CUMULATIVE_YOY
→ bounded target/comparison/authority/reason facts
```

This fixture family does not judge or repair generated response bodies.

It does not attempt to prove that every future model-rendered annual summary is semantically correct.

It protects only the deterministic SimCore authority decision that constrains the renderer.

## 2. Evidence maturity must remain separate from executable maturity

Current evidence has two different strengths.

### Deterministic contract

Established:

```text
v0.64.1 Summary Scope Authority shipped
Lifecycle classifier exists in current production
classifier/CI behavior is preserved through v0.64.7
current production exports classifySummaryScope
```

Therefore executable fixture maturity may be:

```text
EXECUTABLE
```

### Dedicated post-fix natural semantic close

The current deferred sweep explicitly says dedicated natural `ANNUAL_ONLY` and `CUMULATIVE_YOY` semantic close evidence is not established in the reviewed ledger.

Therefore evidence maturity remains:

```text
CONTRACT_ESTABLISHED
NATURAL_SEMANTIC_CLOSE = VALIDATION_ONLY
```

Do not relabel this family `LIVE_GOLDEN_ESTABLISHED` merely because a deterministic fixture passes.

Canonical distinction:

```text
goldenGate=true
= mandatory deterministic regression gate

LIVE_GOLDEN_ESTABLISHED
= separate natural production evidence claim
```

These are not synonyms.

## 3. Production source authority

Current production authority remains `release-simcore` v0.64.7.

The current Lifecycle implementation exports:

```text
classifySummaryScope
```

and uses exactly three result scopes:

```text
NONE
ANNUAL_ONLY
CUMULATIVE_YOY
```

The classifier is request-scoped and C-mode-only.

Conceptually the current source performs:

```text
if mode != C
→ NONE

collect explicit 19xx / 20xx / 21xx year mentions
if no years
→ NONE

targetYear = maximum mentioned year
comparisonYear = targetYear - 1

if comparisonYear is explicitly mentioned
AND explicit comparison / previous-year / baseline / increase signal exists
→ CUMULATIVE_YOY

else if an explicit multi-year range exists
→ NONE

else if annual-summary signal exists
→ ANNUAL_ONLY

else
→ NONE
```

The fixture must invoke this production implementation directly.

It must not copy this algorithm into suite code.

## 4. Current bounded output contract

### `NONE`

Expected shape:

```text
scope          NONE
targetYear     null
comparisonYear null
authority      NONE
reason         INELIGIBLE
```

### `ANNUAL_ONLY`

Expected shape:

```text
scope          ANNUAL_ONLY
targetYear     <detected target year>
comparisonYear null
authority      TARGET_YEAR
reason         SINGLE_YEAR_SUMMARY
               or BOUNDED_SINGLE_YEAR
```

`BOUNDED_SINGLE_YEAR` is used when the request contains the current recognized explicit Jan-1 → Dec-31 full-year window.

### `CUMULATIVE_YOY`

Expected shape:

```text
scope          CUMULATIVE_YOY
targetYear     <latest requested year>
comparisonYear targetYear - 1
authority      YEAR_END_BASELINE_COMPARE
reason         EXPLICIT_PREVIOUS_YEAR_BASELINE
```

No fixture should infer additional semantic fields not emitted by the production owner.

## 5. Owner boundary

Canonical owner:

```text
Lifecycle
```

The fixture tests:

```text
Lifecycle.classifySummaryScope
```

It does not test:

```text
Recurrence matching
Lineage roots
Source Handoff
output prose quality
arithmetic correctness inside generated prose
retrieval quality
provider cache
history mutation
```

The v0.64.0 natural evidence showed Recurrence/Lineage signals near the failing summaries, but v0.64.1 intentionally solved the authority gap without making those systems factual owners.

Permanent fixtures must preserve that boundary.

## 6. Harness feasibility

Current permanent harness already supports direct `SimCore.define(...)` module loading.

`BundleLoader.load(name)` recursively resolves local `./module` dependencies from the source under test.

Therefore the intended suite implementation is simply:

```text
const lifecycle = loader.load('lifecycle')
assert typeof lifecycle.classifySummaryScope === 'function'
for each fixture case:
  actual = lifecycle.classifySummaryScope(input.text, input.mode)
  assert bounded result fields
```

Expected coverage:

```text
EXECUTABLE
```

No source-binding regex bridge is required.

No new loader feature is required.

No source modularization is required.

No production-code modification is required for testability.

## 7. Stable suite identity

Proposed stable suite ID:

```text
summary-scope
```

Proposed files when implementation is explicitly selected:

```text
products/simcore/tests/suites/summary-scope.test.mjs
products/simcore/tests/fixtures/summary-scope/cases.json
```

Registry entry concept:

```text
id: summary-scope
coverage: EXECUTABLE
required: true
goldenGate: true
```

`goldenGate: true` means the deterministic classifier contract becomes a mandatory permanent regression gate.

It must not be presented as proof that dedicated post-fix natural semantic validation has been completed.

## 8. Fixture design principle

Use short neutral request shapes.

Do not preserve the original long-chat user message verbatim merely to test the classifier.

Evidence conversion:

```text
real long-chat failure family
→ identify bounded classification signal
→ neutral synthetic/captured shape
→ exact classifier result
```

No output body, personal name, platform dataset, stock value, or long historical response is needed.

## 9. Required case matrix

The initial permanent family should cover positive authority, fail-closed boundaries, mode boundary, and precedence.

### Case 1 — ordinary single-year annual summary

Stable case ID:

```text
annual-only-single-year
```

Input concept:

```text
mode: C
text: "2030년 연말 결산을 해줘"
```

Expected:

```text
scope          ANNUAL_ONLY
targetYear     2030
comparisonYear null
authority      TARGET_YEAR
reason         SINGLE_YEAR_SUMMARY
```

Purpose:

```text
protect the primary ANNUAL_ONLY path
```

Evidence provenance:

```text
v0.64.0 paired year-end-summary evidence
v0.64.1 Summary Scope Authority contract
```

### Case 2 — explicit full-year bounded annual window

Stable case ID:

```text
annual-only-full-year-window
```

Input concept:

```text
mode: C
text: "2030.1.1.~12.31. 활동 성과 총정리"
```

Expected:

```text
scope          ANNUAL_ONLY
targetYear     2030
comparisonYear null
authority      TARGET_YEAR
reason         BOUNDED_SINGLE_YEAR
```

Purpose:

```text
protect explicit full-year-window recognition
```

The fixture should use one exact currently supported window spelling.

Additional equivalent spellings are not required merely to increase case count.

### Case 3 — explicit adjacent previous-year YoY baseline

Stable case ID:

```text
cumulative-yoy-explicit-baseline
```

Input concept:

```text
mode: C
text: "2029년 말 수치를 기준으로 2030년 연말 누적 수치와 증가율을 비교해줘"
```

Expected:

```text
scope          CUMULATIVE_YOY
targetYear     2030
comparisonYear 2029
authority      YEAR_END_BASELINE_COMPARE
reason         EXPLICIT_PREVIOUS_YEAR_BASELINE
```

Purpose:

```text
protect the primary CUMULATIVE_YOY path
protect previous-year baseline identity
```

This is the key classifier-side regression control for the historical stale-baseline/coverage failure family.

It does not validate model-generated arithmetic.

### Case 4 — ambiguous non-adjacent multi-year range fails closed

Stable case ID:

```text
ambiguous-multiyear-range-none
```

Input concept:

```text
mode: C
text: "2028~2030 연말 결산을 총정리해줘"
```

Expected:

```text
scope          NONE
targetYear     null
comparisonYear null
authority      NONE
reason         INELIGIBLE
```

Purpose:

```text
protect fail-closed behavior for a broad multi-year range
```

Do not turn this into CUMULATIVE_YOY merely because more than one year appears.

### Case 5 — previous-year mention alone is not YoY authority

Stable case ID:

```text
previous-year-mention-without-yoy-signal
```

Input concept:

```text
mode: C
text: "2029년과 2030년 연말 결산을 정리해줘"
```

Expected under current production semantics:

```text
scope          ANNUAL_ONLY
targetYear     2030
comparisonYear null
authority      TARGET_YEAR
reason         SINGLE_YEAR_SUMMARY
```

Purpose:

```text
prove that mentioning targetYear-1 does not by itself create CUMULATIVE_YOY authority
```

This fixture protects current precedence and must not be rewritten to an aspirational classification.

If product semantics later intentionally change, that requires an explicit contract change and fixture retirement/update evidence.

### Case 6 — adjacent-year range plus explicit comparison remains YoY

Stable case ID:

```text
adjacent-year-range-with-compare
```

Input concept:

```text
mode: C
text: "2029~2030 연말 수치를 비교해줘"
```

Expected:

```text
scope          CUMULATIVE_YOY
targetYear     2030
comparisonYear 2029
authority      YEAR_END_BASELINE_COMPARE
reason         EXPLICIT_PREVIOUS_YEAR_BASELINE
```

Purpose:

```text
freeze current precedence:
explicit valid previous-year comparison is recognized before the generic multi-year-range fail-closed branch
```

This subtle control prevents an overly broad future `multiYearRange -> NONE` refactor from breaking legitimate YoY requests.

### Case 7 — non-adjacent years plus compare do not fabricate previous-year baseline

Stable case ID:

```text
nonadjacent-comparison-none
```

Input concept:

```text
mode: C
text: "2028년과 2030년 수치를 비교해줘"
```

Expected:

```text
scope          NONE
targetYear     null
comparisonYear null
authority      NONE
reason         INELIGIBLE
```

Purpose:

```text
comparison signal alone cannot manufacture targetYear-1
```

### Case 8 — identical annual text outside C mode is ineligible

Stable case ID:

```text
non-c-mode-none
```

Input concept:

```text
mode: A
text: "2030년 연말 결산을 해줘"
```

Expected:

```text
NONE / INELIGIBLE
```

Purpose:

```text
protect C-mode ownership boundary
```

One non-C control is sufficient; separate A/B duplicates are unnecessary unless future source semantics diverge.

### Case 9 — annual wording without explicit year is ineligible

Stable case ID:

```text
missing-year-none
```

Input concept:

```text
mode: C
text: "이번 연말 결산을 해줘"
```

Expected:

```text
NONE / INELIGIBLE
```

Purpose:

```text
do not invent a target year from ambient state inside this classifier
```

The classifier owns explicit request authority, not world-year inference.

## 10. Minimum fixture payload shape

A single fixture file may follow the current grouped-family pattern already used by permanent suites.

Conceptual shape:

```json
{
  "schemaVersion": 1,
  "id": "summary-scope.contract-matrix",
  "suite": "summary-scope",
  "input": {
    "cases": [
      {
        "id": "annual-only-single-year",
        "mode": "C",
        "text": "2030년 연말 결산을 해줘"
      }
    ]
  },
  "expected": {
    "annual-only-single-year": {
      "scope": "ANNUAL_ONLY",
      "targetYear": 2030,
      "comparisonYear": null,
      "authority": "TARGET_YEAR",
      "reason": "SINGLE_YEAR_SUMMARY"
    }
  },
  "meta": {
    "goldenGate": true,
    "coverageExpectation": "EXECUTABLE",
    "migrationFrom": "v0.64.0 natural failure family -> v0.64.1 deterministic Summary Scope Authority",
    "evidenceMaturity": "CONTRACT_ESTABLISHED",
    "naturalSemanticClose": "VALIDATION_ONLY"
  }
}
```

Exact JSON formatting may follow existing fixture conventions.

Do not require a schema revision for these additional metadata fields; fixture-v1 already allows additional `meta` properties.

## 11. Suite assertion contract

The permanent suite should assert the entire bounded classifier tuple for every case:

```text
scope
targetYear
comparisonYear
authority
reason
```

Do not assert only `scope`.

Reason:

```text
ANNUAL_ONLY with wrong targetYear
or
CUMULATIVE_YOY with wrong comparisonYear
```

would still be a meaningful authority regression even if the top-level scope string stayed unchanged.

Recommended suite behavior:

```text
load lifecycle once per fixture execution context
verify classifySummaryScope export exists
execute every case directly
compare all five bounded output fields
emit one PASS assertion row per case
return coverage EXECUTABLE
```

## 12. No reverse/string/source-marker testing as primary authority

Do not make the suite pass by checking only that source contains:

```text
ANNUAL_ONLY
CUMULATIVE_YOY
TARGET_YEAR
```

Those strings already existed as one-shot static guards in historical release checks.

Permanent coverage must invoke the owner function.

Source-marker checks are unnecessary because direct module execution is available.

## 13. No output-body semantic judge

The original live defect family involved generated output contamination/omission.

Do not respond by adding a permanent test that parses arbitrary model prose and tries to judge whether every achievement belongs to 2030.

That would create a second semantic renderer/judge and exceed the deterministic contract.

Permanent suite authority stops at:

```text
request classification + authority metadata
```

Natural semantic validation remains a separate live-evidence question.

## 14. Relationship to Recurrence and Lineage

The historical evidence showed:

```text
ANNUAL_ONLY candidate
→ recurrence FIRST

CUMULATIVE_YOY sample
→ recurrence REPEATED / MATCH
```

and also a repeated lineage over-chain WATCH.

These are useful provenance facts but not Summary Scope fixture inputs.

Do not create dependencies such as:

```text
summary scope requires recurrence state
summary scope requires lineage root
```

The deterministic classifier should remain independently executable from request text + mode.

## 15. Relationship to renderer boundary

Constitutional ownership remains:

```text
SimCore
= classify request scope
= provide authority/boundary facts

Main Model
= render the actual annual/cumulative summary prose
```

The fixture verifies the first side only.

It must not migrate prose authorship into SimCore.

## 16. Relationship to M2-3

M2-3 Edit Reconcile remains a separate active architecture workstream.

Summary Scope fixture expansion:

```text
must not change edit-reconcile design
must not change Session ownership
must not modify Representation controls
must not become an M2-3 acceptance substitute
```

This fixture family is mechanically independent and may be implemented as a separate regression-infrastructure task when selected.

## 17. Registry / pack impact must be intentional

Current registry contains nine permanent suites and currently derives pack aliases from registry membership.

Therefore adding `summary-scope` is not merely adding an unused fixture file.

Once registered as:

```text
required: true
goldenGate: true
```

it becomes part of the normal permanent regression surface exposed by the registry/pack aliases.

This is intended when implementation is explicitly selected.

Do not silently add the suite while claiming release-gate membership is unchanged.

Likewise, do not redesign pack alias semantics in the same task.

Canonical scope:

```text
add one regression suite + fixtures + registry row
!= redesign release/test pack topology
```

If pack topology itself needs redesign, that is a separate release-system task.

## 18. Implementation validation plan when selected

This document authorizes design only, not implementation.

If the fixture family is later selected for implementation, use a dedicated non-runtime work branch and perform at least:

```text
fixture-v1 validation
summary-scope suite direct execution
full permanent test pack
current main SimCore source control
materialized release-simcore production source control
architecture/static checks applicable to test-only changes
```

No production runtime byte should change as part of this fixture-only task.

Do not modify:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
runtime version
SnapshotStore
prompt bytes
release-simcore production plugin
```

solely to add this test family.

## 19. Promotion / retirement rules

After implementation, the deterministic fixture remains mandatory unless one of these occurs:

```text
explicit Summary Scope semantic contract change
Lifecycle ownership transfer with proven equivalent semantics
feature retirement
fixture proven to encode an incorrect historical expectation
```

Ownership movement alone does not require fixture IDs to change.

If the classifier later moves out of Lifecycle while behavior remains equivalent:

```text
same fixture IDs
same expected semantic tuples
new direct owner adapter
```

should be preferred.

## 20. Natural validation debt remains open after fixture implementation

Even after all deterministic cases pass:

```text
Summary Scope natural semantics
= VALIDATION_ONLY / NATURAL_SAMPLE
```

remains until a matching production request supplies post-fix evidence for the actual rendered semantics.

A natural sample may close questions such as:

```text
ANNUAL_ONLY target-year achievements remain target-year scoped
CUMULATIVE_YOY uses the explicit previous-year baseline
requested YoY deltas are covered without stale older values replacing baseline authority
```

That live evidence should be preserved separately.

Do not edit the fixture expected values merely to make a generated response look better.

## 21. Current classification

```text
SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE
= IMPLEMENTATION-READY DESIGN
= DIRECT LIFECYCLE OWNER EXECUTION
= EXECUTABLE COVERAGE
= NINE-CASE INITIAL MATRIX
= FAIL-CLOSED CONTROLS INCLUDED
= PRECEDENCE CONTROL INCLUDED
= NO SOURCE-MARKER BRIDGE REQUIRED
= NO OUTPUT BODY JUDGE
= NO RUNTIME CHANGE
= CONTRACT_ESTABLISHED
= NATURAL_SEMANTIC_CLOSE STILL VALIDATION_ONLY

runtime change: NONE
prompt byte change: NONE
SnapshotStore change: NONE
renderer responsibility change: NONE
release-simcore change: NONE
release-system topology redesign: NONE
```

## 22. Recommended next decision

The fixture design itself is now narrow enough for implementation.

However, because this conversation track is currently exploring regression-evidence architecture rather than executing product/repository changes, the next research/design choice should be one of:

```text
A. freeze the next candidate: Narrative / Current Timeline fixture design
B. audit existing Broadcast fixture expansion opportunities
C. stop design and explicitly select Summary Scope fixture implementation as its own non-runtime work item
```

Do not create another generic fixture framework before selecting one of those concrete paths.

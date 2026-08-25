# SimCore Diagnostic Surface Conformance Matrix — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC SURFACE SEMANTIC CONFORMANCE · CI-FIRST · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY_CONTRACT_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_GUIDELINES.md`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tests/suites/diagnostic-copy.test.mjs`
- `products/simcore/tests/fixtures/diagnostic-copy/cases.json`

## 1. Purpose

Define a golden conformance contract for SimCore diagnostic surfaces so one underlying diagnostic fact cannot silently acquire different meaning depending on where it is rendered.

Primary surfaces:

```text
DIAGNOSTIC PANEL
COPIED DIAGNOSTIC REPORT
WARNING BADGE
WARNING → DIAGNOSTIC DETAIL NAVIGATION
```

The goal is not textual identity.

The goal is:

```text
same observation identity
+ same underlying owner facts
→ same semantic result / reason / owner / source / freshness

while
surface-specific formatting density may differ
```

This document is CI/design-only research.

It does not authorize runtime/UI implementation.

## 2. Existing test-system grounding

SimCore already has a permanent fixture harness under:

```text
products/simcore/tooling/test.mjs
products/simcore/tests/registry.mjs
products/simcore/tests/fixtures/*
products/simcore/tests/suites/*
```

The registry already contains an executable `diagnostic-copy` suite, and the current suite verifies copy-path behavior such as:

```text
primary clipboard success
fallback copy success
report-build failure
clipboard-write failure
DOM cleanup / focus restoration
immutable report reuse between primary/fallback
```

Therefore any future Diagnostic Surface Conformance suite should extend the existing harness family rather than creating a second testing framework.

Do not add an empty suite/fixture placeholder before executable diagnostic attribution/freshness surfaces exist.

## 3. Core conformance invariant

Canonical invariant:

```text
SURFACE MAY CHANGE PRESENTATION
SURFACE MAY NOT CHANGE SEMANTIC FACT
```

For one shared diagnostic observation:

```text
subject
result
reasonId
reasonSourceClass
semanticOwner
observationSource
freshness/binding
warning occurrence identity where applicable
```

must remain semantically compatible across every surface that claims to represent that fact.

Formatting differences are allowed.

Examples of allowed differences:

```text
panel:
  Probe context: STALE
  reason PROBE_VISIBLE_INDEX_MISMATCH

copy:
  Probe context: STALE · reason PROBE_VISIBLE_INDEX_MISMATCH

compact UI:
  details hidden until expansion/click
```

Example of forbidden divergence:

```text
panel:
  STALE / PROBE_VISIBLE_INDEX_MISMATCH

copy:
  CURRENT TURN

for the same observation identity
```

## 4. Conformance is observation-scoped, not wall-clock-scoped

The Diagnostic Snapshot Freshness Contract distinguishes:

```text
PANEL_OPEN_SNAPSHOT
COPY_ACTION_SNAPSHOT
RUNTIME_PROBE_SNAPSHOT
CURRENT_VISIBLE_CHAT
```

A future copy action may intentionally capture a newer snapshot than an already-open panel.

Therefore:

```text
panel value != copy value
```

is not automatically a conformance failure.

First compare observation identity.

Rule:

```text
SAME OBSERVATION IDENTITY
→ semantic conformance required

DIFFERENT OBSERVATION IDENTITY / REVISION
→ semantic values may legitimately differ
→ both surfaces must expose/retain enough bounded identity to explain that they refer to different observations
```

This prevents the matrix itself from reintroducing the stale-snapshot confusion it is meant to detect.

## 5. Conceptual observation identity

For fixture/conformance purposes, one observation identity may be represented by bounded metadata such as:

```ts
{
  captureKind,
  runtimeGeneration,
  locationKeyDigest,
  currentUserIndex,
  currentAssistantIndex,
  probeUserIndex,
  probeAssistantIndex,
  observationRevision
}
```

This is a fixture/design shape, not a runtime schema requirement.

Important:

```text
identity is based on diagnostic observation position
not random UUID
not raw body equality
```

Timestamps may be recorded as operational metadata but should not be the sole semantic identity.

Do not retain raw chat bodies merely to compare surfaces.

## 6. Surface capability profiles

Conformance does not mean every surface must display every field.

Different surfaces have different intentional information budgets.

### 6.1 PANEL_DETAIL

Expected capability:

```text
result
reason where available
owner where useful
source/freshness where relevant
warning details
current diagnostic context
```

May use expandable sections or concise formatting.

### 6.2 COPIED_REPORT

Expected capability:

```text
bounded text representation of the same diagnostic observation
sufficient result/reason/source/freshness detail for repo evidence
stable machine-readable reason IDs where implemented
```

It may be more verbose than the panel.

### 6.3 WARNING_BADGE

Expected capability is deliberately shallow:

```text
current warning occurrence exists
bounded count/category
current-output occurrence identity
```

It is NOT required to expose:

```text
full reason chain
semantic owner
observation-source details
raw warning body
```

Omission due to this frozen capability profile is conformant.

Inventing a new reason/severity in the badge is not.

### 6.4 WARNING_CLICK_DETAIL

The badge click should navigate to the existing diagnostic detail surface.

The clicked detail must represent the same current warning occurrence when it is still current.

If a newer clean output supersedes the warning before click/detail materialization, stale warning detail must not be falsely presented as current.

## 7. Semantic dimensions under test

The matrix should treat these dimensions independently:

```text
SUBJECT
RESULT
REASON_ID
REASON_SOURCE_CLASS
SEMANTIC_OWNER
OBSERVATION_SOURCE
FRESHNESS_BINDING
WARNING_COUNT / WARNING_OCCURRENCE
APPLICABILITY / UNKNOWN STATE
```

Do not collapse them into one rendered string comparison.

Example:

```text
result = NOT_EXERCISED
reason = PROBE_VISIBLE_INDEX_MISMATCH
freshness = STALE
```

must remain distinguishable from:

```text
result = NOT_EXERCISED
reason = NO_CURRENT_REQUEST_CONTEXT
freshness = UNAVAILABLE
```

Even if a compact UI uses the same short display label for both until expanded.

## 8. Result / reason / owner authority preservation

The matrix must verify that presentation consumers do not become producers.

Canonical flow:

```text
semantic owner / diagnostic-binding owner
→ canonical attribution fact
→ surface formatter
```

Forbidden:

```text
surface formatter
→ parse human string
→ reconstruct reason/result
→ publish a competing semantic fact
```

Specific negative assertions:

```text
panel cannot invent owner-internal cause
copy cannot infer reason from nearby prose
warning badge cannot invent severity
warning click handler cannot re-run validator to create a new warning meaning
```

## 9. Stable reason-code conformance

When a canonical `reasonId` exists:

```text
same semantic observation
→ same canonical reasonId across capable surfaces
```

Human wording may differ.

Allowed:

```text
panel label: "prior Fresh representation matched"
copy label:  "reason PRIOR_FRESH_REPRESENTATION_MATCH"
```

Forbidden:

```text
panel reasonId = PRIOR_FRESH_REPRESENTATION_MATCH
copy reasonId  = PRIOR_OUTPUT_EXACT_MATCH
```

for the same semantic fact.

Deprecated aliases may be accepted only at a compatibility boundary defined by the Reason-Code Stability Contract.

Current producers/formatters should emit the canonical active ID.

## 10. Freshness conformance

The strongest negative regression control is the v0.64.2 stale diagnostic family.

For the same stale observation:

```text
probe index != visible snapshot index
```

all capable surfaces must preserve the safety consequence:

```text
no false CURRENT TURN claim
no current-turn semantic fields synthesized
no runtime failure inferred merely from stale binding
```

A future panel-open vs copy-action difference is valid only when the observation identities differ explicitly.

Example:

```text
panel:
PANEL_OPEN_SNAPSHOT @2060/@2061 · PANEL_STALE

copy after recapture:
COPY_ACTION_SNAPSHOT @2064/@2065 · CURRENT_BOUND
```

This is not a conformance failure.

It is two valid observations.

## 11. Warning-surface conformance

The warning widget is governed by existing finalized `lastCore.issues` only.

Conformance expectations:

```text
Warnings 0
→ badge hidden

Warnings 1
→ one badge occurrence with count 1

Warnings N
→ one badge occurrence with count N

compatibility diagnostics only + Warnings 0
→ badge hidden

same current output observed repeatedly
→ no duplicate warning occurrence

same warning text on later output
→ later output may produce a new occurrence

next clean output
→ old badge removed
```

The matrix must also verify:

```text
badge count/category
= projection of existing warning authority
!= separately parsed warning count
```

## 12. Surface divergence classes

Future CI/reporting may use narrow classes such as:

```text
DIAG_SURFACE_RESULT_DIVERGENCE
DIAG_SURFACE_REASON_DIVERGENCE
DIAG_SURFACE_OWNER_DIVERGENCE
DIAG_SURFACE_FRESHNESS_DIVERGENCE
DIAG_SURFACE_OBSERVATION_IDENTITY_COLLAPSE
DIAG_SURFACE_STALE_UPGRADED_TO_CURRENT
DIAG_SURFACE_UNKNOWN_UPGRADED
DIAG_SURFACE_CAPABILITY_OVERCLAIM
DIAG_SURFACE_WARNING_COUNT_DIVERGENCE
DIAG_SURFACE_WARNING_OCCURRENCE_DIVERGENCE
DIAG_SURFACE_PRIVATE_REASON_VOCABULARY
DIAG_SURFACE_REVERSE_PARSE_DEPENDENCY
DIAG_SURFACE_RAW_CONTENT_LEAK
```

These are CI/design failure names, not runtime warnings.

## 13. UNKNOWN / UNATTRIBUTED / UNAVAILABLE conformance

Weak or absent evidence must remain weak or absent across surfaces.

Examples:

```text
owner result known + internal cause unknown
→ UNATTRIBUTED everywhere capable of showing attribution

required observation source absent
→ UNAVAILABLE

fact does not apply
→ NOT_APPLICABLE
```

Forbidden:

```text
panel shows UNATTRIBUTED
copy guesses HOST_BACKEND_SLOW
```

or:

```text
panel shows UNAVAILABLE
widget implies validator failure
```

No surface may strengthen evidence authority for readability.

## 14. Presentation differences are not failures by themselves

The conformance target is semantic, not byte-for-byte UI text.

Allowed differences include:

```text
line wrapping
localized labels
compact vs expanded formatting
field ordering where semantic order is irrelevant
omitting optional detail on capability-limited surfaces
human wording improvements under same stable reasonId
```

Do not freeze accidental whitespace or prose as semantic ABI.

Byte identity remains relevant only for separately defined artifacts that explicitly require it.

## 15. Candidate golden fixture families

If implementation is later promoted, build sanitized deterministic fixtures from existing natural controls and synthetic bounded states.

Initial matrix candidates:

```text
1. CURRENT_BOUND healthy request
   panel/copy result + freshness conform

2. STALE probe vs visible snapshot
   reason PROBE_VISIBLE_INDEX_MISMATCH
   no false current-turn facts

3. NO_CURRENT_REQUEST_CONTEXT
   NOT_EXERCISED remains non-failure

4. REPRESENTATION_FAST_RECONCILED
   reason PRIOR_FRESH_REPRESENTATION_MATCH
   owner edit-reconcile after canonical ownership lands

5. genuine visible edit
   MANUAL_EDIT_REBUILT / divergence reason
   no formatter reinterpretation

6. explicit B_END authority
   owner-direct reason preserved

7. post-B_END direct-C ineligible control
   NOT_DIRECT_POST_B_END_C preserved

8. known result / unknown cause
   UNATTRIBUTED remains explicit

9. one warning
   badge count matches diagnostic warning authority

10. multiple warnings
    one badge / bounded count

11. compatibility diagnostic only
    no warning badge

12. quarantine/current warning
    stronger bounded widget label only if existing authority supports it

13. panel-open old snapshot + copy-time fresh recapture
    DIFFERENT observation identities
    no false conformance failure

14. same observation rendered with different human wording
    canonical reasonId unchanged

15. deprecated reason alias input
    canonical current output only

16. raw-body privacy control
    attribution/conformance metadata contains no raw user/assistant/system bodies
```

## 16. Negative assertions are first-class

Each golden fixture should assert both what must appear and what must never appear.

Examples:

```text
STALE specimen
MUST NOT emit CURRENT_BOUND
MUST NOT infer runtime failure
MUST NOT infer durable chat rewind

UNATTRIBUTED Store spike
MUST NOT emit PocketRisu/browser/IPC-specific cause

compatibility-only diagnostic
MUST NOT surface warning badge

warning badge
MUST NOT expose raw warning body
MUST NOT create independent reasonId
```

Negative assertions are especially important because diagnostic overclaim can look plausible while remaining semantically wrong.

## 17. Existing harness integration — future only

The current test registry already supports suite rows with:

```text
id
module
fixtureDir
coverage
required
goldenGate
```

A future implementation could add a suite conceptually named:

```text
diagnostic-surface-conformance
```

with fixtures under the existing fixture tree.

Do NOT add this suite now while the underlying shared attribution/freshness projection is not implemented.

Do NOT create a second runner.

Reuse:

```text
products/simcore/tooling/test.mjs
products/simcore/tests/registry.mjs
existing fixture schema / goldenGate discipline
```

The current `diagnostic-copy` suite remains valid and separate:

```text
diagnostic-copy
= clipboard/report-copy execution resilience

diagnostic-surface-conformance
= semantic equivalence across diagnostic presentation surfaces
```

Neither subsumes the other.

## 18. Differential testing role

The existing harness supports baseline/candidate differential execution.

When diagnostic attribution/freshness implementation is eventually selected, differential comparison should prove:

```text
semantic runtime outputs unchanged
existing diagnostic-copy behavior unchanged except declared attribution/freshness presentation changes
reason identity changes only when declared
warning authority unchanged
```

Do not use changed snapshots as self-approval.

Candidate output must be compared against frozen fixtures/contracts and explicit declared changes.

## 19. Architecture-change handling

M2 ownership work may move producer ownership without changing diagnostic meaning.

Example:

```text
Session/Runtime edit decision tree
→ edit-reconcile application service
```

If semantic equivalence is proven:

```text
result remains same
reasonId remains same
owner field may change to new canonical owner
```

The Matrix should allow an explicitly declared owner transition only when the architecture contract says authority moved.

It must reject accidental mixed ownership such as:

```text
panel says EDIT_RECONCILE
copy says SESSION
```

for one post-transfer observation.

## 20. Privacy / boundedness

Conformance fixtures and future diagnostic metadata should use:

```text
enums
indices
small reason IDs
owner IDs
freshness states
bounded fingerprints where already authorized
warning counts
```

Do not require:

```text
raw user text
raw assistant text
system prompt
full host objects
full warning bodies in badge fixtures
unbounded provenance chain
```

Natural evidence converted into permanent fixtures should be sanitized and bounded under existing SimCore fixture discipline.

## 21. Runtime overhead boundary

This Matrix is not a runtime component.

Forbidden as a consequence of this design:

```text
per-request matrix traversal
runtime conformance engine
new event bus
new network observer
second validator pass
polling panel/copy consistency
persistent conformance history
```

Preferred future implementation:

```text
one canonical bounded attribution/snapshot projection
→ ordinary formatters
→ static/CI fixture assertions
```

Runtime overhead attributable solely to the Matrix target: effectively zero.

## 22. Promotion gate

Do not implement this suite merely because the design exists.

Implementation becomes worthwhile when at least one adjacent runtime/UI item is actually promoted, such as:

```text
Diagnostic Snapshot Freshness repair
shared diagnostic attribution projection
warning floating widget
M2 ownership transition that exposes owner/reason metadata
explicit diagnostic-maintenance mini
```

At that point, add only the minimum executable surfaces needed to verify the chosen work.

## 23. Relationship to neighboring contracts

```text
Diagnostic Snapshot Freshness Contract
= WHICH observation/revision is current, stale or unbound

Diagnostic Attribution Clarity
= WHAT / WHY / WHO / SOURCE / FRESHNESS

Diagnostic Reason-Code Stability Contract
= stable machine identity for WHY

Diagnostic Surface Conformance Matrix
= prove capable surfaces do not diverge in meaning for the same observation

Warning Notification Surface
= shallow exceptional UI projection consuming existing warning authority
```

The Matrix consumes these contracts as test expectations.

It does not replace their semantic authority.

## 24. Current classification

```text
SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX
= HIGH VALUE DIAGNOSTIC CI CONTRACT
= SEMANTIC EQUIVALENCE, NOT TEXT IDENTITY
= OBSERVATION-IDENTITY AWARE
= SURFACE-CAPABILITY AWARE
= FRESHNESS / ATTRIBUTION / REASON-ID CONSISTENCY
= WARNING-AUTHORITY PRESERVING
= NEGATIVE-ASSERTION FIRST
= EXISTING HARNESS REUSE
= NO SECOND TEST SYSTEM
= CI-FIRST IF PROMOTED
= NEAR-ZERO RUNTIME OVERHEAD

runtime change: NONE
prompt byte change: NONE
SnapshotStore change: NONE
renderer responsibility change: NONE
release-system change: NONE
```

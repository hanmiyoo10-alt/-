# SimCore Diagnostic Observation Envelope — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC DATA CONTRACT · CI/DOCS-FIRST · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define the minimum bounded data contract for one SimCore diagnostic observation so panel, copied report, future warning-detail navigation, fixtures, and repository evidence can share the same semantic fact without each surface reconstructing it independently.

The adjacent contracts already define:

```text
Snapshot Freshness
= which observation is current / stale / unbound

Attribution Clarity
= result / reason / owner / source / freshness

Reason-Code Stability
= durable machine identity for reason semantics

Surface Conformance Matrix
= same observation must keep the same semantic meaning across surfaces
```

This document answers the remaining data-shape question:

```text
What is the smallest bounded object that can carry one diagnostic fact
from its existing owner/binding source to presentation consumers
without becoming a second semantic authority?
```

This is a CI/docs-first design only.

It does not authorize:

```text
new validators
new runtime decisions
new warning authority
new SnapshotStore schema
new semantic persistence
new event bus
new network calls
new polling/timers
raw chat/body retention
work-branch implementation
release-simcore deployment
```

## 2. Constitutional boundary

Canonical flow remains:

```text
existing semantic owner / diagnostic-binding owner
        ↓
owned result + already-authorized evidence
        ↓
bounded DiagnosticObservationEnvelope projection
        ↓
panel / copied report / optional detail surface / fixtures
```

The envelope is:

```text
transport / projection contract
```

The envelope is NOT:

```text
semantic authority
validator
state machine
incident classifier
repository WATCH/FIX/BLOCKER owner
renderer instruction
```

If an envelope disagrees with the underlying canonical owner result, the envelope is wrong.

The envelope never overrides the owner.

## 3. Diagnostic envelope is separate from Cache Fact Schema

SimCore already has a distinct Gemini Cache Fact Schema Contract.

Do not collapse the two systems.

```text
CacheFactEnvelope
= cache-observability evidence ABI
= sample/revision/provider/evidence-chain semantics

DiagnosticObservationEnvelope
= UI/report diagnostic projection ABI
= observation identity + owned diagnostic fact + attribution
```

A diagnostic envelope may display a bounded cache diagnostic fact if that fact already exists, but it must not become the cache fact's producer or duplicate cache evidence semantics.

Version domains remain separate.

## 4. Core shape

Conceptual v1 shape:

```ts
{
  envelopeVersion: 1,

  observation: {
    captureKind,
    observationRevision,
    runtimeGeneration,
    locationKeyDigest,
    currentUserIndex,
    currentAssistantIndex,
    probeUserIndex,
    probeAssistantIndex
  },

  subject,
  result,

  attribution: {
    reasonId,
    reasonSourceClass,
    semanticOwner,
    observationSources,
    freshness
  },

  applicability,
  detailRefs,
  presentationHints
}
```

This is a design shape, not a frozen runtime schema.

The implementation should include only fields actually needed by promoted diagnostic work.

Do not materialize every optional field merely because it appears in this research contract.

## 5. Observation identity

The observation block exists to prevent panel/copy/widget facts from floating without a defensible diagnostic moment.

Identity should be based on bounded semantic observation position rather than random identity.

Candidate fields:

```text
captureKind
= PANEL_OPEN / COPY_ACTION / CURRENT_OUTPUT / other explicitly defined capture class

observationRevision
= bounded revision when the same logical diagnostic observation is recaptured/refined

runtimeGeneration
= runtime boundary discriminator

locationKeyDigest
= bounded chat/location scope identity

currentUserIndex / currentAssistantIndex
= visible snapshot position when available

probeUserIndex / probeAssistantIndex
= request/output probe lineage when available
```

Important:

```text
same runtime generation
!= same observation

same wall-clock second
!= same observation

same random UUID
!= proof of semantic observation equality
```

## 6. `capturedAt` is operational metadata, not primary semantic identity

A timestamp may be useful for human diagnostics and ordering.

Conceptually:

```text
capturedAt
= optional operational metadata
```

But by default:

```text
capturedAt
!= sole observation identity
capturedAt
!= semantic equality key
capturedAt change alone
!= diagnostic semantic change
```

This prevents harmless recapture timing from creating fake semantic divergence.

## 7. Subject is stable diagnostic identity

`subject` names what diagnostic fact is being represented.

Candidate examples:

```text
PROBE_CONTEXT
CORE_HANDSHAKE
RUNTIME_STATUS
TURN_BINDING
EDIT_RECONCILE
OUTPUT_REPRESENTATION
DEFERRED_MIRROR
BROADCAST_END_AUTHORITY
POST_BEND_CLOCK_HANDOFF
STRUCTURE_RESULT
WARNING_SET
TELEMETRY_CONTINUITY
```

Subject IDs describe diagnostic meaning, not formatter labels or helper names.

Avoid:

```text
PANEL_LINE_17
COPY_SECTION_4
SESSION_HELPER_STATUS
```

Do not create a huge global subject registry before implementation needs it.

## 8. Result remains owner-owned

`result` is the already-owned semantic/diagnostic outcome.

Examples:

```text
CURRENT_BOUND
STALE
ACTIVE
INACTIVE
NOT_EXERCISED
REPRESENTATION_FAST_RECONCILED
MANUAL_EDIT_REBUILT
COMMITTED
OUTPUT_MISMATCH
APPLIED
INELIGIBLE
```

The envelope must not derive `result` by parsing rendered text.

Forbidden:

```text
"Probe context: STALE"
→ formatter regex
→ envelope.result = STALE
```

Correct direction:

```text
canonical bounded fact
→ envelope.result
→ rendered text
```

## 9. Attribution block

Attribution fields are governed by the existing Attribution Clarity and Reason-Code Stability contracts.

Conceptual fields:

```text
reasonId
reasonSourceClass
semanticOwner
observationSources[]
freshness
```

Rules:

```text
reasonId
= canonical stable ID when defensibly available

reasonSourceClass
= OWNER_DIRECT / MECHANICAL_DERIVED / UNATTRIBUTED

semanticOwner
= component owning the underlying meaning

observationSources
= where the diagnostic evidence was observed

freshness
= binding authority under the shared Freshness Contract
```

No field grants more authority than the underlying source evidence.

## 10. UNKNOWN / UNATTRIBUTED / UNAVAILABLE / NOT_APPLICABLE must stay distinct

Do not overload `null`, empty string or `n/a` for all weak states.

Conceptual distinction:

```text
UNKNOWN
= relevant fact expected, current evidence cannot determine it

UNATTRIBUTED
= result known, defensible cause not known

UNAVAILABLE
= required observation source absent

NOT_APPLICABLE
= subject/path does not apply

NOT_EXERCISED
= path was not exercised; reason should explain why when known
```

Example:

```text
result = NOT_EXERCISED
reasonId = PROBE_VISIBLE_INDEX_MISMATCH
freshness = STALE
```

must remain different from:

```text
result = NOT_EXERCISED
reasonId = NO_CURRENT_REQUEST_CONTEXT
freshness = UNAVAILABLE
```

## 11. `detailRefs` prefer references over duplicated payloads

If one diagnostic fact has already-authorized detailed evidence elsewhere, prefer a small reference rather than copying the evidence into every envelope.

Conceptually:

```text
detailRefs = [
  "warning-set/current-output",
  "representation/current-prior",
  "runtime-probe/current-request"
]
```

Exact representation is implementation-time work.

Do not duplicate:

```text
full warning arrays
raw assistant bodies
full host chat objects
full provider/cache payloads
```

solely so each surface has a self-contained envelope.

## 12. Presentation hints are non-semantic

A surface may benefit from bounded hints such as:

```text
compactEligible
showOwnerByDefault
showFreshnessByDefault
warningCount
category
```

These must remain presentation metadata.

They may not alter:

```text
result
reasonId
semanticOwner
freshness
warning authority
```

A changed presentation hint must not appear as a semantic result change.

## 13. Surface capability projection

Consumers should project from the same envelope according to their capability profile.

```text
PANEL_DETAIL
→ may show result + reason + owner + source/freshness

COPIED_REPORT
→ may show richer bounded attribution for repository evidence

WARNING_BADGE
→ may consume only existing current warning occurrence/count/category

WARNING_CLICK_DETAIL
→ opens a capable diagnostic detail projection
```

Important:

```text
field omitted because surface capability is intentionally shallow
= allowed

surface invents a replacement semantic fact because field was omitted
= forbidden
```

## 14. Envelope equality vs presentation equality

Do not compare rendered strings as diagnostic semantic equality.

For the same observation identity, semantic comparison should focus on fields such as:

```text
subject
result
reasonId
reasonSourceClass
semanticOwner
observationSources
freshness
applicability
warning occurrence identity where applicable
```

Ignore presentation-only differences such as:

```text
line wrapping
localized human label
expanded/collapsed UI
field display ordering
capturedAt when semantics are unchanged
```

This is the data foundation for the Diagnostic Surface Conformance Matrix.

## 15. Observation revision

A diagnostic observation may be refined without pretending a new request occurred.

Example:

```text
observation R1
= panel-open snapshot

later explicit recapture
= different captureKind / observation identity
```

or, if the same logical capture is retried/refined under a bounded contract:

```text
R1
→ R2
```

A revision must not be counted as a second runtime request/output event.

Do not build a persistent revision ledger by default.

The envelope only needs enough revision information to prevent accidental same-observation conflation.

## 16. No cross-observation merge

Never build one envelope by silently selecting the newest value for each individual field from different moments.

Forbidden:

```text
chat indices from PANEL_OPEN
+ Core state from COPY_ACTION
+ runtime probe from later request
+ warning count from current output
→ label entire object CURRENT_BOUND
```

Instead:

```text
one coherent diagnostic observation
→ envelope
```

If multiple sources participate in the same envelope, their relation must be defensibly bound by the Freshness Contract.

Otherwise degrade to STALE / UNBOUND / UNAVAILABLE as appropriate.

## 17. Privacy and boundedness

Hard default exclusions:

```text
raw user body
raw assistant body
system prompt
full chat history
full host object
full provider response
unbounded exception text
unbounded attribution chain
```

Preferred material:

```text
enums
indices
small stable IDs
owner IDs
freshness states
counts
bounded fingerprints/digests already authorized
short reason IDs
```

The envelope must not become a convenient excuse for duplicating runtime data.

## 18. Runtime cost boundary

This contract does not justify a new per-request pipeline.

Reject:

```text
dynamic envelope registry service
new event bus
second validator pass
second full-history scan
polling to keep envelopes fresh
persistent envelope history
SnapshotStore writes solely for diagnostic envelopes
```

Preferred future shape:

```text
existing facts
→ one small pure projection helper
→ surface formatter(s)
```

When no diagnostic surface needs an envelope for a turn, implementation should not manufacture heavy unused structures merely for architectural purity.

## 19. Schema/version discipline

If a machine-readable envelope is implemented, keep its version domain narrow.

Conceptual:

```text
diagnosticEnvelopeVersion
```

It is NOT:

```text
SimCore runtime version
SnapshotStore schema version
reason semantic version
Prompt Cache ABI
Gemini Cache Fact ABI
release-system version
```

Additive optional presentation metadata may be compatible.

Breaking changes include:

```text
field meaning changes
required semantic field removed
freshness meaning changed
same reason identity reinterpreted
observation identity semantics changed
```

Reason semantic changes remain governed separately by the Reason-Code Stability Contract.

## 20. Architecture ownership transfer

M2 work may move a semantic owner while preserving result/reason meaning.

Example:

```text
Session / Runtime edit reconcile decisions
→ edit-reconcile application service
```

If equivalence is proven:

```text
subject = EDIT_RECONCILE
result = same
reasonId = same
semanticOwner = new canonical owner
```

The envelope must update ownership after authority transfer.

It must not preserve a stale owner merely for diagnostic compatibility.

## 21. Candidate CI/schema failures

Future CI may use narrow classes such as:

```text
DIAG_ENVELOPE_SCHEMA_INVALID
DIAG_ENVELOPE_REQUIRED_FIELD_MISSING
DIAG_ENVELOPE_OWNER_MISMATCH
DIAG_ENVELOPE_REASON_MISMATCH
DIAG_ENVELOPE_FRESHNESS_MISMATCH
DIAG_ENVELOPE_OBSERVATION_IDENTITY_COLLAPSE
DIAG_ENVELOPE_CROSS_OBSERVATION_MERGE
DIAG_ENVELOPE_UNKNOWN_UPGRADED
DIAG_ENVELOPE_PRESENTATION_FIELD_SEMANTIC_LEAK
DIAG_ENVELOPE_RAW_CONTENT_LEAK
DIAG_ENVELOPE_REVERSE_PARSE_DEPENDENCY
DIAG_ENVELOPE_UNBOUNDED_PAYLOAD
DIAG_ENVELOPE_DUPLICATE_SEMANTIC_PROJECTION
```

These are CI/design failures, not runtime warnings.

## 22. Candidate fixtures

When implementation is actually promoted, useful fixtures include:

```text
1. CURRENT_BOUND healthy observation
   → one envelope shared by panel/copy projections

2. stale probe vs visible snapshot
   → result/freshness remains stale
   → reason PROBE_VISIBLE_INDEX_MISMATCH

3. no current request context
   → NOT_EXERCISED + NO_CURRENT_REQUEST_CONTEXT

4. same semantic envelope with different panel/copy human wording
   → semantic comparison PASS

5. panel-open old observation vs copy-time new recapture
   → two observation identities
   → no false divergence

6. representation-fast reconcile
   → stable result/reason
   → current canonical owner

7. genuine edit
   → MANUAL_EDIT_REBUILT remains owner-produced

8. warning badge
   → consumes only allowed shallow fields
   → no private reason/severity

9. known result / unknown cause
   → UNATTRIBUTED preserved

10. cross-observation field merge attempt
    → FAIL

11. raw body inserted into envelope
    → FAIL

12. presentation hint change only
    → semantic equality unchanged
```

Do not add empty runtime fixtures before executable envelope/projection code exists.

## 23. Promotion gate

Do not implement an envelope solely because this document exists.

Implementation becomes justified when one adjacent diagnostic item is actually promoted, for example:

```text
copy-time freshness recapture
shared attribution projection
warning mini-widget detail navigation
M2 owner transition exposes canonical reason/owner metadata
diagnostic-maintenance mini explicitly selected
```

At that point:

```text
implement the minimum fields needed by the chosen work
→ reuse existing harness
→ add Surface Conformance fixtures
→ preserve all semantic/runtime controls
```

Do not build the complete speculative schema in advance.

## 24. Relationship to neighboring diagnostic contracts

```text
Diagnostic Snapshot Freshness Contract
= WHEN / WHICH observation is safely bound

Diagnostic Attribution Clarity
= WHAT / WHY / WHO / SOURCE / FRESHNESS

Diagnostic Reason-Code Stability
= durable identity of WHY

Diagnostic Observation Envelope
= bounded data shape carrying those facts to consumers

Diagnostic Surface Conformance Matrix
= verifies consumers preserve the envelope's semantics

Warning Notification Surface
= intentionally shallow exceptional UI projection
```

## 25. Current classification

```text
SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE
= HIGH VALUE DIAGNOSTIC DATA CONTRACT
= CI / DOCS FIRST
= OBSERVATION-SCOPED
= RESULT / REASON / OWNER / SOURCE / FRESHNESS PRESERVING
= NO SECOND SEMANTIC AUTHORITY
= NO CROSS-OBSERVATION MERGE
= UNKNOWN / UNATTRIBUTED PRESERVING
= CONTENT-FREE / BOUNDED
= SURFACE-CAPABILITY AWARE
= ARCHITECTURE-TRANSFER AWARE
= NO RUNTIME SERVICE REQUIRED
= IMPLEMENTATION TRIGGERED, NOT AUTOMATIC

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```

# SimCore Diagnostic Observation Ownership Registry — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC SINGLE-PRODUCER OWNERSHIP CONTRACT · CI/DOCS-FIRST · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define a static ownership registry for the diagnostic-observation pipeline so one semantic diagnostic fact has one canonical producer while any number of presentation consumers may reuse it.

The preceding Diagnostic UX contracts now define:

```text
Snapshot Freshness
= which observation is current / stale / unbound

Attribution Clarity
= result / reason / owner / source / freshness

Reason-Code Stability
= stable machine identity for reason semantics

Observation Envelope
= bounded data projection for one diagnostic observation

Observation Lifecycle
= current / stale-displayable / superseded / retired behavior

Surface Conformance
= same observation keeps the same semantic meaning across surfaces
```

This document answers the ownership question:

```text
Who is allowed to produce each diagnostic meaning,
and which components are consumers only?
```

This registry is an architecture/CI contract only.

It does not authorize a new runtime registry service.

## 2. Core invariant

Canonical invariant:

```text
ONE SEMANTIC FACT
→ ONE CANONICAL PRODUCER

MANY SURFACES
→ MANY CONSUMERS ALLOWED
```

A consumer may:

```text
format
compact
expand
localize
copy
navigate
```

A consumer may not:

```text
re-run the semantic validator
re-derive owner-internal causes
parse human text back into machine facts
create a competing freshness classifier
create a competing warning parser
mutate another owner's result
```

## 3. Registry is not semantic authority

The registry describes ownership; it does not create ownership.

Authority comes from existing SimCore architecture and the component that already owns the underlying behavior.

Example:

```text
EDIT_RECONCILE result
→ owned by edit-reconcile application responsibility when that ownership is canonical

registry row
→ records that ownership
→ does not itself decide reconciliation
```

If the registry conflicts with the canonical architecture or production semantics:

```text
registry is stale / invalid
```

Do not use the registry to override production meaning.

## 4. Ownership classes

Use a small conceptual ownership vocabulary.

```text
SEMANTIC_OWNER
= owns the underlying runtime/result meaning

OBSERVATION_CAPTURE_OWNER
= captures bounded observation metadata

BINDING_FRESHNESS_OWNER
= determines whether observation/probe/chat positions can be bound safely

REASON_OWNER_DIRECT
= owns an existing reason discriminator

REASON_MECHANICAL_OWNER
= maps an explicit bounded diagnostic predicate to a stable reasonId

PROJECTION_OWNER
= constructs DiagnosticObservationEnvelope from already-owned facts

LIFECYCLE_OWNER
= manages presentation-observation current/stale/superseded/retired state

SURFACE_CONSUMER
= renders or transports facts only

EXTERNAL_AUTHORITY
= fact originates outside the diagnostic pipeline and must not be recreated locally
```

These are contract roles, not necessarily one runtime class each.

## 5. Initial ownership map

### 5.1 Semantic result facts

Examples:

```text
RUNTIME_STATUS
→ RUNTIME

EDIT_RECONCILE
→ EDIT_RECONCILE after canonical M2 ownership transfer

OUTPUT_REPRESENTATION
→ REPRESENTATION / output compatibility according to canonical contract

DEFERRED_MIRROR
→ existing mirror/session authority

BROADCAST_END_AUTHORITY
→ LIFECYCLE / BROADCAST authority

POST_BEND_CLOCK_HANDOFF
→ TIME / lifecycle authority

FRAME_STATE
→ FRAME

STRUCTURE_RESULT
→ STRUCTURE

REACTION_RESULT
→ REACTION

TELEMETRY_CONTINUITY
→ RUNTIME_TELEMETRY
```

The diagnostic layer consumes these facts.

It does not recompute them.

### 5.2 Diagnostic observation capture

Conceptual owner:

```text
DIAGNOSTIC_CAPTURE
```

Responsibility:

```text
captureKind
runtime generation
bounded location identity
current user/assistant indices
probe indices when available
bounded state/source metadata
```

This owner captures observation position only.

It must not become:

```text
Session owner
history reconciler
semantic validator
warning authority
```

### 5.3 Freshness / binding

Canonical diagnostic owner:

```text
DIAGNOSTIC_BINDING
```

Inputs may include:

```text
captured visible indices
runtime probe indices
observation capture identity
current visible chat metadata
```

Outputs conceptually include:

```text
CURRENT_BOUND
STALE
PROBE_AHEAD
PROBE_BEHIND
UNBOUND
UNAVAILABLE
```

Panel, copy and warning surfaces must not implement private freshness predicates.

### 5.4 Reason ownership

Reason ownership follows the Reason-Code Stability Contract.

```text
OWNER_DIRECT
→ underlying semantic owner owns the discriminator

MECHANICAL_DERIVED
→ one registered bounded diagnostic rule owns the mapping

UNATTRIBUTED
→ no specific cause producer exists
```

Example:

```text
not-direct-post-b-end-c
→ owner-direct Time/Lifecycle reason

probe index != visible index
→ DIAGNOSTIC_BINDING owns mechanical reason
  PROBE_VISIBLE_INDEX_MISMATCH

Store backend.set spike internal cause
→ UNATTRIBUTED
```

A formatter must never upgrade UNATTRIBUTED into a guessed host/backend cause.

### 5.5 Observation envelope projection

Conceptual owner:

```text
DIAGNOSTIC_PROJECTION
```

It may combine references to already-owned facts into one bounded `DiagnosticObservationEnvelope`.

It owns:

```text
transport shape
field normalization
content-free bounded projection
```

It does not own:

```text
semantic result meaning
freshness predicate meaning
owner-direct reasons
warning authority
```

### 5.6 Observation lifecycle

Conceptual owner:

```text
DIAGNOSTIC_PRESENTATION_LIFECYCLE
```

It may manage:

```text
CURRENT_ACTIVE
STALE_DISPLAYABLE
SUPERSEDED
RETIRED
```

for diagnostic presentation objects.

It must not mutate old semantic observation facts to manufacture currentness.

A fresh current observation requires a new capture/revision.

### 5.7 Warning occurrence authority

This registry MUST preserve the frozen warning authority.

```text
current finalized output
+ existing lastCore.issues
→ warning occurrence authority
```

Diagnostic projection / panel / copy / floating badge are consumers.

Forbidden:

```text
warning badge parses output independently
DiagnosticObservationEnvelope creates warning count
reason registry assigns warning severity
lifecycle registry decides whether a semantic warning exists
```

The lifecycle may only track whether an already-authorized warning occurrence remains current for presentation.

## 6. Surface ownership profiles

### PANEL_DETAIL

Role:

```text
SURFACE_CONSUMER
```

Allowed:

```text
render result/reason/owner/source/freshness
show CURRENT_ACTIVE or STALE_DISPLAYABLE observation
expand/collapse details
```

Forbidden:

```text
private reason dictionary
private freshness classifier
semantic revalidation
```

### COPIED_REPORT

Role:

```text
SURFACE_CONSUMER
```

May request a fresh capture at copy time if that future implementation is promoted.

The copy formatter itself remains a consumer.

### WARNING_BADGE

Role:

```text
SHALLOW SURFACE_CONSUMER
```

Consumes current authorized warning occurrence/count only.

It must not own attribution details or severity.

### WARNING_CLICK_DETAIL

Role:

```text
NAVIGATION / DETAIL CONSUMER
```

Must bind to the current authorized occurrence when claiming current detail.

It must not re-run warning validation.

## 7. Single-producer does not mean one giant diagnostic module

This registry does NOT propose a central diagnostic god-object.

Correct interpretation:

```text
one fact meaning
→ one semantic producer
```

Different facts may have different producers.

Example:

```text
EDIT_RECONCILE result
→ edit-reconcile

freshness binding
→ diagnostic binding

warning occurrence
→ finalized output / lastCore.issues authority

observation lifecycle
→ diagnostic presentation lifecycle
```

Centralizing all of these into one runtime diagnostic service would violate the intended architecture.

## 8. No private recomputation fallback

If an authoritative fact is absent:

```text
consumer must degrade to UNKNOWN / UNAVAILABLE / UNATTRIBUTED
```

A consumer must not silently recompute the missing fact.

Examples:

```text
freshness fact missing
→ copy formatter cannot compare indices privately

reason missing
→ panel cannot regex old text to infer reasonId

warning occurrence identity missing
→ badge cannot invent one from warning text
```

This preserves single ownership and avoids semantic drift.

## 9. Ownership transfer protocol

Architecture work may legitimately move ownership.

Primary known example:

```text
Session / Runtime edit-reconcile decision tree
→ edit-reconcile application service
```

When ownership moves:

```text
old producer
→ new candidate producer
→ differential/equivalence proof
→ architecture contract update
→ registry owner update
→ old semantic calculation removed
```

Do not leave permanent dual producers.

During temporary migration testing, one path may be shadow/comparison-only, but exactly one path remains authoritative.

## 10. Reason ownership during architecture transfer

Code movement does not automatically require a new reasonId.

If semantics remain identical:

```text
reasonId remains stable
semantic owner may change to new canonical owner
```

Example:

```text
PRIOR_FRESH_REPRESENTATION_MATCH
```

may remain stable across the Session/Runtime → edit-reconcile extraction if differential evidence proves the predicate is unchanged.

The registry must reject mixed post-transfer ownership such as:

```text
panel owner = EDIT_RECONCILE
copy owner  = SESSION
```

for the same observation.

## 11. Observation source is not owner

Do not confuse where evidence was observed with who owns its meaning.

Example:

```text
semantic owner:
EDIT_RECONCILE

observation source:
RUNTIME_PROBE_SNAPSHOT
```

Likewise:

```text
observation source = CURRENT_VISIBLE_CHAT
```

does not make the host adapter the semantic owner of every fact shown from that snapshot.

## 12. Owner does not mean blame

Diagnostic owner identifies semantic responsibility only.

It must not be presented as fault attribution.

Example:

```text
owner = DIAGNOSTIC_BINDING
reason = PROBE_VISIBLE_INDEX_MISMATCH
```

means the binding component owns the diagnostic classification.

It does not prove that the host, browser, runtime or user caused a defect.

## 13. Registry row concept

If this work is later promoted to machine-readable CI material, a conceptual row may look like:

```ts
{
  factId: "DIAG_FRESHNESS_BINDING",
  producer: "DIAGNOSTIC_BINDING",
  role: "BINDING_FRESHNESS_OWNER",
  sourceInputs: [
    "DIAGNOSTIC_CAPTURE",
    "RUNTIME_PROBE"
  ],
  consumers: [
    "DIAGNOSTIC_PROJECTION",
    "PANEL_DETAIL",
    "COPIED_REPORT"
  ],
  recomputePolicy: "PRODUCER_ONLY",
  fallback: "UNAVAILABLE",
  privacyClass: "BOUNDED_METADATA_ONLY"
}
```

This is a CI/docs representation candidate, not a runtime schema requirement.

## 14. Candidate registered fact families

Do not create hundreds of empty fact types.

Initial useful families, only when corresponding implementation exists, may include:

```text
DIAG_OBSERVATION_CAPTURE
DIAG_FRESHNESS_BINDING
DIAG_REASON_ATTRIBUTION
DIAG_OBSERVATION_ENVELOPE
DIAG_OBSERVATION_LIFECYCLE
DIAG_WARNING_OCCURRENCE_REF
```

Underlying semantic results remain owned by their existing subsystem facts rather than being duplicated as new diagnostic-owned semantic facts.

## 15. Relationship to Cache Observer Ownership Registry

The Gemini cache research has a separate ownership registry for cache-observability facts.

Keep the two domains separate.

```text
Cache Observer Ownership Registry
= cache evidence production ownership

Diagnostic Observation Ownership Registry
= diagnostic presentation/capture/binding ownership
```

A diagnostic envelope may display a cache fact by reference.

It must not become a second cache fact producer.

Do not merge these registries solely because both use the word `ownership`.

## 16. Static CI checks — future only

If implementation is promoted, useful checks include:

```text
DIAG_OWNER_DUPLICATE_PRODUCER
DIAG_OWNER_UNREGISTERED_PRODUCER
DIAG_OWNER_PRIVATE_RECOMPUTE
DIAG_OWNER_SEMANTIC_PROJECTION_COLLAPSE
DIAG_OWNER_FRESHNESS_DUPLICATED
DIAG_OWNER_REASON_DUPLICATED
DIAG_OWNER_WARNING_AUTHORITY_DUPLICATED
DIAG_OWNER_SURFACE_BECAME_PRODUCER
DIAG_OWNER_SOURCE_AUTHORITY_CONFUSED
DIAG_OWNER_TRANSFER_INCOMPLETE
DIAG_OWNER_STALE_ARCHITECTURE_MAPPING
DIAG_OWNER_UNKNOWN_RECOMPUTED
DIAG_OWNER_REVERSE_PARSE_DEPENDENCY
```

These are CI/design failure names, not runtime warnings.

## 17. Candidate golden controls

If machine-readable ownership checks are later implemented, validate at least:

```text
1. panel/copy consume one shared freshness fact
2. panel/copy do not re-evaluate freshness independently
3. stable reasonId comes from registered owner/direct mechanical mapper
4. missing reason remains UNATTRIBUTED/UNKNOWN
5. warning badge consumes finalized warning authority only
6. same warning text on new output receives new occurrence authority upstream
7. lifecycle does not create semantic warning existence
8. envelope does not override subsystem result
9. M2 edit-reconcile owner transfer updates registry only after equivalence proof
10. same post-transfer observation cannot expose mixed SESSION/EDIT_RECONCILE ownership
11. cache facts remain externally/cache-owned and diagnostic layer consumes by reference
12. no raw body retention
13. no SnapshotStore semantic writes
14. no second validator pass
15. no runtime registry service required
```

## 18. Runtime overhead boundary

The registry should be effectively free at runtime.

Preferred implementation, if ever needed:

```text
static constants/types
+ CI checks
+ ordinary direct module calls
```

Do not add:

```text
dynamic ownership lookup per request
global service locator
event bus
graph traversal
network calls
persistent ownership store
```

The registry is primarily a design and validation artifact.

## 19. Promotion gate

Do not implement a machine-readable registry merely because this document exists.

Promotion becomes useful when at least one adjacent diagnostic implementation actually lands, such as:

```text
shared diagnostic capture/binding helper
Diagnostic Observation Envelope projection
Snapshot Freshness repair
Warning floating widget
M2 ownership transition exposing reason/owner metadata
Diagnostic Surface Conformance suite
```

Then register only facts that have real producers/consumers.

No empty framework scaffolding.

## 20. Relationship to the full Diagnostic UX track

```text
Snapshot Freshness
= WHICH observation can claim currentness

Attribution Clarity
= WHAT / WHY / WHO / SOURCE / FRESHNESS

Reason-Code Stability
= stable identity of WHY

Observation Envelope
= bounded data projection

Observation Lifecycle
= how long the projection remains current/displayable

Observation Ownership Registry
= WHO may produce each diagnostic meaning

Surface Conformance Matrix
= surfaces cannot alter those meanings

Warning Notification Surface
= compact consumer of existing warning authority
```

This closes the main ownership gap in the current Diagnostic UX design stack.

## 21. Current classification

```text
SIMCORE_DIAGNOSTIC_OBSERVATION_OWNERSHIP_REGISTRY
= HIGH VALUE DIAGNOSTIC ARCHITECTURE CONTRACT
= SINGLE SEMANTIC PRODUCER / MANY CONSUMERS
= EXISTING SUBSYSTEM AUTHORITY PRESERVED
= FRESHNESS / REASON / PROJECTION / LIFECYCLE OWNERSHIP SEPARATED
= WARNING AUTHORITY PRESERVED
= M2 OWNER-TRANSFER AWARE
= NO PRIVATE RECOMPUTE FALLBACK
= CI/DOCS-FIRST
= NEAR-ZERO RUNTIME OVERHEAD TARGET
= NO RUNTIME SERVICE REQUIRED

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```

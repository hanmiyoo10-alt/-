# SimCore Diagnostic UX Completeness Audit — 2026-08-25

Status: `BROAD RESEARCH COMPLETE · ONE NARROW PRE-IMPLEMENTATION CONTRACT REMAINS · NO RUNTIME CHANGE`

Scope:
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Audit question

Determine whether the current Diagnostic / Operator UX research is complete enough to stop broad idea generation and move toward narrow phased implementation once the existing production/live gates permit it.

Primary questions:

```text
Are semantic authorities separated?
Is observation freshness defined?
Is attribution bounded and non-speculative?
Are reason identities stable?
Is there a shared bounded projection shape?
Is observation lifecycle defined?
Are presentation surfaces consumers rather than producers?
Is warning authority preserved?
Can same-observation surface divergence be tested?
What exact contract remains ambiguous before implementation?
```

This audit does not authorize runtime implementation.

## 2. Executive conclusion

The broad Diagnostic UX architecture is sufficiently complete.

No additional broad framework, general event system, persistent diagnostic store, severity model, or new semantic validator is justified.

The current stack already covers:

```text
WHAT TIME / SNAPSHOT?
→ Diagnostic Snapshot Freshness

WHAT HAPPENED / WHY / WHO OWNS IT?
→ Diagnostic Attribution Clarity

HOW IS THE WHY IDENTIFIED STABLY?
→ Diagnostic Reason-Code Stability

WHAT BOUNDED DATA MOVES BETWEEN SURFACES?
→ Diagnostic Observation Envelope

HOW LONG IS THAT OBSERVATION ACTIVE?
→ Diagnostic Observation Lifecycle

WHO MAY PRODUCE EACH MEANING?
→ Diagnostic Observation Ownership Registry

DO PANEL / COPY / WARNING SURFACES KEEP THE SAME MEANING?
→ Diagnostic Surface Conformance Matrix

HOW IS A REAL WARNING SURFACED NON-BLOCKINGLY?
→ Warning Notification Surface
```

Audit classification:

```text
BROAD_DIAGNOSTIC_UX_RESEARCH
= COMPLETE

PRE_IMPLEMENTATION_GAP
= ONE NARROW CONTRACT

IMPLEMENTATION
= NOT YET AUTHORIZED BY THIS AUDIT
```

## 3. Authority graph is coherent

The reviewed contracts converge on one non-circular authority flow:

```text
existing semantic subsystem owner
        ↓
owned result / owner-direct reason
        ↓
diagnostic capture
        ↓
diagnostic binding / freshness
        ↓
bounded attribution / envelope projection
        ↓
presentation lifecycle
        ↓
panel / copied report / warning detail
```

Warning authority remains a parallel externally-owned input to the presentation path:

```text
current finalized output
+ lastCore.issues
→ warning occurrence authority
→ warning badge projection
```

The warning badge does not become a validator, warning parser, or severity owner.

No architecture-level producer cycle was found.

## 4. Responsibility boundary remains intact

All reviewed Diagnostic UX research preserves the constitutional split:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= final renderer
```

Diagnostic work is observational/presentational only.

The research does not authorize:

```text
prompt semantic changes
renderer responsibility changes
history rewriting
Core state mutation
Session decision changes
SnapshotStore semantic writes
retry generation
new network calls
unbounded polling
```

Therefore the Diagnostic UX track does not create a renderer-responsibility boundary risk in its current form.

## 5. Freshness coverage — COMPLETE, vocabulary not yet fully frozen

The Freshness Contract correctly distinguishes:

```text
PANEL_OPEN_SNAPSHOT
COPY_ACTION_SNAPSHOT
RUNTIME_PROBE_SNAPSHOT
CURRENT_VISIBLE_CHAT
```

and preserves the key safety rule:

```text
no defensible coherent binding
→ no CURRENT TURN claim
```

It also defines a strong future capture model with bounded consistency guards rather than polling.

However, the documents still use slightly different shorthand vocabularies for the same binding family.

Examples include:

```text
PANEL_STALE
STALE

PROBE_AHEAD
PROBE_AHEAD_OF_SNAPSHOT

PROBE_BEHIND
SNAPSHOT_AHEAD_OF_PROBE

NO_REQUEST_CONTEXT
UNAVAILABLE / NOT_EXERCISED + reason
```

This is not a runtime defect because none of these research contracts is implemented.

It is a pre-implementation vocabulary freeze gap.

Classification:

```text
DIAGNOSTIC_BINDING_VOCABULARY
= NEEDS NARROW FREEZE
= NON_RUNTIME
= NON_BLOCKING FOR CURRENT PRODUCTION
```

## 6. Attribution coverage — COMPLETE

The Attribution Clarity contract correctly separates:

```text
SUBJECT
RESULT
REASON
OWNER
SOURCE
FRESHNESS
```

and recognizes three reason-source classes:

```text
OWNER_DIRECT
MECHANICAL_DERIVED
UNATTRIBUTED
```

This prevents timing correlation, stale snapshots, or neighboring prose from becoming invented semantic causes.

Important negative semantics are also preserved:

```text
UNKNOWN
UNAVAILABLE
UNATTRIBUTED
NOT_APPLICABLE
NOT_EXERCISED
```

No additional broad attribution model is needed.

## 7. Reason-code stability coverage — COMPLETE

The Reason-Code Stability Contract correctly separates:

```text
reasonId
= stable semantic machine identity

humanLabel / description
= presentation wording
```

It also preserves:

```text
reasonId != semantic result
reasonId != severity
reasonId != repo WATCH / DEFER / FIX / BLOCKER classification
```

Alias/deprecation/ownership-transfer handling is already sufficiently designed for phased implementation.

No additional broad reason vocabulary research is needed before the narrow identity/binding freeze.

## 8. Observation envelope coverage — COMPLETE AS A DESIGN SHAPE

The Observation Envelope provides a bounded projection contract containing candidate fields for:

```text
observation identity metadata
subject
result
reason attribution
semantic owner
observation source
freshness
applicability
bounded detail references
presentation hints
```

It explicitly remains:

```text
transport / projection contract
!= semantic authority
```

and rejects raw chat/body retention, a new event bus, new persistence, and a second validator pass.

The envelope should not be expanded into a universal diagnostic event schema before implementation needs prove individual fields necessary.

No broader envelope research is needed.

## 9. Observation lifecycle coverage — COMPLETE EXCEPT IDENTITY/REVISION EXACTNESS

The Lifecycle Contract correctly separates:

```text
freshness
!= lifecycle
```

and defines the intentionally small lifecycle family:

```text
CURRENT_ACTIVE
STALE_DISPLAYABLE
SUPERSEDED
RETIRED
```

The strongest invariant is correct:

```text
OLD OBSERVATION MAY REMAIN DISPLAYABLE
OLD OBSERVATION MAY NOT REGAIN CURRENT AUTHORITY BY MUTATION
```

Fresh recapture must create a newer observation rather than mutating stale evidence into current evidence.

The lifecycle also handles:

```text
panel open across later turns
copy-time recapture
warning supersession / clean-output retirement
runtime generation boundaries
bounded retention
warning-click races
```

The remaining ambiguity is exact identity/revision mechanics.

The lifecycle currently states conceptually:

```text
same logical capture lineage
+ materially newer coherent capture
→ higher observationRevision
```

and:

```text
supersession key
≈ surface/capture lineage + subject + observation lineage
```

but leaves the exact machine comparison rule to implementation time.

That comparison rule is needed before Surface Conformance can become executable without private equality logic.

## 10. Ownership coverage — COMPLETE

The Ownership Registry establishes:

```text
ONE SEMANTIC FACT
→ ONE CANONICAL PRODUCER

MANY SURFACES
→ MANY CONSUMERS ALLOWED
```

The ownership classes are sufficient:

```text
SEMANTIC_OWNER
OBSERVATION_CAPTURE_OWNER
BINDING_FRESHNESS_OWNER
REASON_OWNER_DIRECT
REASON_MECHANICAL_OWNER
PROJECTION_OWNER
LIFECYCLE_OWNER
SURFACE_CONSUMER
EXTERNAL_AUTHORITY
```

It also correctly treats the registry as descriptive architecture/CI metadata rather than semantic authority.

The M2 ownership-transfer rule is compatible with future `edit-reconcile` canonical ownership without requiring duplicate permanent producers.

No new runtime ownership service is needed.

## 11. Surface conformance coverage — COMPLETE, dependent on identity freeze

The Surface Conformance Matrix defines the correct invariant:

```text
SURFACE MAY CHANGE PRESENTATION
SURFACE MAY NOT CHANGE SEMANTIC FACT
```

and correctly scopes equality to one observation:

```text
SAME OBSERVATION IDENTITY
→ semantic conformance required

DIFFERENT OBSERVATION IDENTITY / REVISION
→ values may differ legitimately
```

This prevents a fresh copy-time snapshot from being falsely compared as equal to an older panel-open snapshot.

It also correctly defines shallow warning-badge capability and reuses the existing SimCore fixture harness rather than proposing a second test system.

The matrix becomes implementation-ready once observation identity/revision equality has one canonical definition.

## 12. Warning surface coverage — COMPLETE FOR V1 DESIGN

The frozen warning v1 remains appropriately narrow:

```text
MINI_WARNING_WIDGET_V1
= FIXED_COMPACT_FLOATING_BADGE
= HIDDEN_WHEN_HEALTHY
= CLICK_TO_DIAGNOSTIC
```

Trigger authority is already frozen to:

```text
current finalized output
AND lastCore.issues.length > 0
AND exact output-warning occurrence not already surfaced
```

Occurrence identity is separately bounded by output position plus a warning fingerprint.

The warning track does not need to wait for a universal diagnostic framework.

If selected after its existing production gate, it should implement only the warning-surface lifecycle/projection pieces it actually needs.

Do not expand it into historical warning storage or a general notification center.

## 13. The one remaining narrow contract

Before shared Diagnostic Observation infrastructure is implemented, freeze one final small contract:

```text
DIAGNOSTIC OBSERVATION IDENTITY / REVISION / BINDING CONTRACT
```

It should answer only these questions:

```text
1. Which bounded fields define observation structural identity?
2. Which field changes mean SAME OBSERVATION, presentation-only change?
3. Which field changes mean SAME LINEAGE, NEW REVISION?
4. Which changes mean NEW OBSERVATION entirely?
5. What is the canonical subject-local supersession key?
6. How do PANEL_OPEN and COPY_ACTION lineages compare?
7. How does runtimeGeneration participate in currentness/equality?
8. Which exact binding/freshness enum vocabulary is canonical?
9. How are UNKNOWN / UNAVAILABLE / NO_REQUEST_CONTEXT represented without overlap?
10. What may Surface Conformance use as the sole observation comparator?
```

Keep it static/typed/CI-first.

Do not create:

```text
runtime identity registry service
random UUID authority
persistent observation ledger
second freshness calculator
wall-clock-only identity
raw-body equality
```

This is a narrow normalization contract, not another broad research program.

## 14. Anti-overbuild finding

The current research is already deep enough that additional broad documents are more likely to create duplicate abstractions than useful clarity.

Reject default proposals for:

```text
Diagnostic Event Bus
Diagnostic Incident Manager
Diagnostic Severity Framework
Persistent Diagnostic History Store
Global Diagnostic State Machine
Cross-plugin Diagnostic Registry Service
Generic UI Notification Framework
Second diagnostic test harness
```

unless future natural evidence independently proves a need.

The current architecture intentionally prefers:

```text
existing owner facts
+ bounded capture/binding
+ small projection
+ local surface lifecycle
+ existing fixture harness
```

## 15. Phased implementation recommendation

Do not land the full research stack as one release.

Preserve SimCore's one-primary-goal release discipline.

Recommended ordering after the current production/live gates permit Diagnostic UX work:

```text
Phase 0 — docs/CI only
freeze Observation Identity / Revision / Binding Contract

Phase 1 — whichever narrow product need is promoted first
A. Warning Widget v1
OR
B. Diagnostic Snapshot Freshness repair

Phase 2 — only if needed by the selected product item
minimal DiagnosticObservationEnvelope projection
+ canonical binding helper

Phase 3
Surface Conformance fixtures for implemented surfaces only

Phase 4
Reason/owner attribution expansion only when a natural ambiguity,
M2 ownership transfer, or explicit diagnostic wording cleanup justifies it
```

Do not make Phase 1 conditional on implementing every later abstraction.

The research contracts are guardrails, not a mandate to instantiate every named concept as a runtime module.

## 16. Existing production sequencing remains authoritative

This audit does not supersede existing release ordering.

In particular:

```text
v0.64.7 real-long-chat live close
→ deferred/WATCH re-check
→ then decide/promote warning or other Diagnostic UX mini
```

M2-3 remains a separate workstream and must not be mixed into a Diagnostic UX feature release.

Functional Diagnostic UX changes must still follow the frozen workflow:

```text
main design/evidence
→ dedicated work branch implementation
→ static/CI validation
→ release-simcore deployment
→ real long-chat validation
→ main evidence / durable-memory synchronization
```

`latest.js` and `install.js` remain identical for any runtime implementation.

## 17. Audit findings classification

```text
DIAGNOSTIC_UX_ARCHITECTURE
= COMPLETE

DIAGNOSTIC_UX_BROAD_RESEARCH
= STOP

DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING
= FINAL NARROW PRE-IMPLEMENTATION CONTRACT

DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH
= WATCH / OBSERVABILITY
= existing fail-closed safety preserved

WARNING_WIDGET_V1
= FROZEN DESIGN CANDIDATE
= existing promotion sequence unchanged

RUNTIME_CHANGE
= NONE

PROMPT_BYTE_CHANGE
= NONE

SNAPSHOTSTORE_SEMANTIC_CHANGE
= NONE

RENDERER_RESPONSIBILITY_CHANGE
= NONE

RELEASE_SYSTEM_CHANGE
= NONE
```

## 18. Stop rule

After the narrow Observation Identity / Revision / Binding Contract is frozen:

```text
STOP broad Diagnostic UX idea generation
```

Resume design only when one of these occurs:

```text
natural long-chat evidence exposes an uncovered diagnostic failure class
implementation reveals a concrete contract conflict
new host/UI capability materially changes the observation model
M2 ownership landing requires a specific attribution migration
```

Otherwise move to phased implementation only when the existing production gates permit it.

## 19. Final verdict

```text
DIAGNOSTIC UX RESEARCH
= ARCHITECTURALLY COMPLETE
= SAFE TO STOP BROAD IDEATION
= ONE NARROW IDENTITY/BINDING FREEZE REMAINS
= PHASED IMPLEMENTATION READY AFTER THAT FREEZE AND EXISTING LIVE GATES
```

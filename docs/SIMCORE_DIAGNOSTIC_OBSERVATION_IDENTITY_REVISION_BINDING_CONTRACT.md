# SimCore Diagnostic Observation Identity / Revision / Binding Contract

Date: 2026-08-25
Status: `PRE-IMPLEMENTATION CONTRACT FROZEN · DIAGNOSTIC UX FINAL NARROW CONTRACT · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_UX_COMPLETENESS_AUDIT_2026-08-25.md`
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

## 1. Purpose

Freeze the last narrow pre-implementation contract required by the Diagnostic / Operator UX research track.

The preceding contracts already define freshness safety, attribution, stable reason IDs, bounded envelopes, observation lifecycle, ownership, surface conformance, and warning projection. The remaining ambiguity is narrower:

```text
What exactly counts as the same diagnostic observation?
When is a recapture a new revision of that observation?
When is it a completely new observation?
How are two observations compared for conformance/supersession?
Which binding/freshness machine states are canonical?
```

This document answers those questions without authorizing runtime implementation.

## 2. Constitutional boundary

Permanent responsibility split remains unchanged:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= final renderer
```

Observation identity, revision, and binding are diagnostic metadata only.

They must never:

```text
change Core state
change Session or Edit Reconcile decisions
change Broadcast lifecycle
change SnapshotStore semantic state
rewrite history
alter generated output
retry generation
change warning authority
change prompt bytes
```

If diagnostic identity or binding cannot be established, observability degrades fail-closed.
Runtime correctness does not.

## 3. Three canonical identity concepts

Do not use `observation identity` as an overloaded phrase after this contract.

Use three distinct concepts.

### 3.1 `observationIdentity`

`observationIdentity` identifies one semantic diagnostic capture position.

Conceptually it answers:

```text
Which bounded chat/runtime/capture position does this observation belong to?
```

It is immutable for the lifetime of that observation lineage.

### 3.2 `observationRevision`

`observationRevision` identifies a materially newer bounded recapture/refinement of the SAME `observationIdentity`.

It is local diagnostic lineage metadata only.
It is NOT a Core state version, SnapshotStore version, runtime epoch, or generation counter.

### 3.3 `observationInstance`

Exact observation equality uses:

```text
observationInstance
= observationIdentity + observationRevision
```

This is the exact unit used by Diagnostic Surface Conformance.

Canonical rule:

```text
same observationIdentity
+ same observationRevision
= EXACT SAME OBSERVATION INSTANCE
```

A different revision of the same identity is related, but it is NOT the same exact instance.

## 4. Canonical identity fields

`observationIdentity` must derive only from bounded semantic observation-position fields.

Conceptual identity tuple:

```ts
{
  identitySchemaVersion,
  locationKeyDigest,
  runtimeGeneration,
  captureKind,
  visibleUserIndex,
  visibleAssistantIndex,
  probeUserIndex,
  probeAssistantIndex
}
```

An implementation may omit fields that are genuinely unavailable for a capture class, but the comparator must then fail toward `UNKNOWN_COMPARISON` rather than inventing equality.

### Included by default

```text
identitySchemaVersion
location/chat scope digest
runtime generation
capture kind
visible user/assistant position when available
probe user/assistant position when available
```

### Excluded from semantic identity by default

```text
capturedAt timestamps
random UUIDs
DOM node identity
panel coordinates
localized labels
human wording
presentationHints
reasonId
semantic result
warning text
raw user/assistant bodies
full chat history
machine paths
```

`capturedAt` may help ordering/debugging but is not semantic identity.

## 5. Canonical capture kinds

Initial capture-kind vocabulary is intentionally small:

```text
PANEL_OPEN
PANEL_REFRESH
COPY_ACTION
CURRENT_OUTPUT
```

Additional capture kinds require an explicit design reason.
Do not create aliases such as `COPY`, `COPY_NOW`, `PANEL_CURRENT`, or `LIVE_OUTPUT` privately in individual surfaces.

Important:

```text
PANEL_OPEN @2060
and
COPY_ACTION @2060
```

are different `observationIdentity` values because capture intent is different, even if visible indices happen to match.

If copied text simply formats the exact same already-captured envelope without a fresh capture, it carries the original observation instance rather than inventing `COPY_ACTION` identity.

## 6. When to keep the same revision

Presentation-only changes do NOT create a new revision.

Examples:

```text
panel expand/collapse
line wrapping
localization
human label change
copy formatting
DOM placement
warning badge layout
sorting presentation-only sections
```

Canonical rule:

```text
same semantic capture facts
+ presentation-only change
→ same observationIdentity
→ same observationRevision
```

## 7. When to create a new revision

Create a higher `observationRevision` only when a new bounded capture/refinement refers to the same semantic identity tuple but materially changes the available diagnostic evidence or binding result.

Examples may include:

```text
one bounded retry resolves a capture race while semantic position stays identical
same position is recaptured with an owner fact that was previously unavailable
same position receives a corrected bounded diagnostic projection without changing capture position
```

Conceptual rule:

```text
same observationIdentity
+ materially newer coherent diagnostic evidence
→ observationRevision + 1
```

Old revisions remain truthful about what they observed.
Do not mutate an old envelope in place and pretend it always contained the newer evidence.

## 8. When to create a new observation identity

Any material change in the identity tuple creates a new `observationIdentity`.

Examples:

```text
location/chat scope changes
runtime generation changes
captureKind changes
visible user index changes
visible assistant index changes
probe user index changes
probe assistant index changes
```

Therefore:

```text
panel remains open across a new turn
→ old PANEL_OPEN observation does not become the new turn

copy click performs fresh COPY_ACTION capture
→ new observation identity

reload/new runtime generation
→ new observation identity
```

A stale observation must never become current by editing its identity fields.

## 9. Observation lineage and supersession

Exact identity and presentation supersession are separate concepts.

A future implementation may need a small bounded `surfaceLineageKey` to answer:

```text
Does this newer observation replace an older observation for this active surface/subject?
```

Conceptual supersession key:

```text
location scope
+ surface lineage
+ subject
```

Examples:

```text
same open diagnostic panel refreshed
→ newer panel observation may supersede older panel observation

new current-output warning occurrence
→ newer warning occurrence supersedes prior current badge occurrence

COPY_ACTION observation
→ does not automatically supersede the still-visible historical PANEL_OPEN observation
```

Do not create a global `latest diagnostic wins everything` rule.

Exact physical encoding of `surfaceLineageKey` is implementation-time work and should remain bounded/in-memory.
No persistent diagnostic lineage database is authorized.

## 10. Canonical observation comparison outcomes

All future panel/copy/widget conformance and lifecycle code should share one conceptual comparator contract.

```text
EXACT_INSTANCE
SAME_IDENTITY_DIFFERENT_REVISION
SAME_LINEAGE_DIFFERENT_OBSERVATION
DIFFERENT_LINEAGE
INCOMPATIBLE_SCOPE
UNKNOWN_COMPARISON
```

### `EXACT_INSTANCE`

```text
same observationIdentity
same observationRevision
```

Surface Conformance requires semantic equivalence across every capable surface representing this instance.

### `SAME_IDENTITY_DIFFERENT_REVISION`

```text
same observationIdentity
different observationRevision
```

The observations are related revisions.
They must not be treated as byte/text identical evidence.
A newer revision may legitimately contain more complete bounded evidence.

### `SAME_LINEAGE_DIFFERENT_OBSERVATION`

Different observation identities, but the same active surface/subject lineage says the newer one supersedes the older one.

### `DIFFERENT_LINEAGE`

Valid observations that belong to different surface/subject lineages.
No automatic supersession.

### `INCOMPATIBLE_SCOPE`

Different location/chat scope or otherwise structurally non-comparable.

### `UNKNOWN_COMPARISON`

Required identity data or schema compatibility is unavailable.

Fail closed.
Do not choose the nearest-looking observation.

## 11. Surface Conformance interpretation freeze

Where earlier research documents use the shorthand:

```text
same observation identity
→ semantic conformance required
```

canonical interpretation after this contract is:

```text
EXACT_INSTANCE
→ semantic conformance required
```

Different revisions of the same identity are NOT exact-instance equality.
They require revision-aware comparison and may legitimately differ where newer bounded evidence was added/corrected.

This contract supersedes ambiguous shorthand only; it does not invalidate the existing Surface Conformance design.

## 12. Canonical binding-state vocabulary

Freeze one machine vocabulary for diagnostic request/output binding:

```text
CURRENT_BOUND
PROBE_AHEAD
PROBE_BEHIND
NO_REQUEST_CONTEXT
UNBOUND
UNAVAILABLE
```

Do not create separate machine enums such as:

```text
PANEL_STALE
STALE
PROBE_AHEAD_OF_SNAPSHOT
SNAPSHOT_AHEAD_OF_PROBE
COPY_STALE
```

Those may exist as human wording or legacy documentation labels only.

## 13. Binding-state semantics

### `CURRENT_BOUND`

The captured visible position and usable runtime probe refer to the same defensible current request/output lineage.

This is the only binding state that may support a direct `CURRENT TURN` claim.

### `PROBE_AHEAD`

The usable runtime probe refers to a later request/output lineage than the captured visible diagnostic snapshot.

Human presentation may say `STALE` or `probe ahead`, but the machine state remains `PROBE_AHEAD`.

### `PROBE_BEHIND`

The captured visible chat position is later than the latest usable request/output probe.

Human presentation may say `STALE` or `probe behind`, but the machine state remains `PROBE_BEHIND`.

### `NO_REQUEST_CONTEXT`

The diagnostic capture itself is valid, but no request-bound current-turn context exists or applies.

This is not a failure.
It may pair with `NOT_EXERCISED` for request-specific diagnostic subjects.

### `UNBOUND`

Relevant bounded inputs exist, but no defensible ordering/equality relation can be established.

Examples:

```text
mixed/inconsistent indices
capture race not resolved by the bounded policy
identity schema incompatible
relationship cannot be established without guessing
```

### `UNAVAILABLE`

A required observation source could not be obtained.

Examples:

```text
host chat/state read unavailable
runtime probe source absent where required
capture helper failure
```

Do not use `UNAVAILABLE` to mean `NO_REQUEST_CONTEXT`.

## 14. Binding state vs reason code

Binding state and reason remain separate dimensions.

Examples:

```text
binding = PROBE_AHEAD
reasonId = PROBE_VISIBLE_INDEX_MISMATCH

binding = NO_REQUEST_CONTEXT
reasonId = NO_CURRENT_REQUEST_CONTEXT

binding = UNBOUND
reasonId = CAPTURE_RACE
```

Reason IDs explain the binding/result.
They do not replace the binding enum.

Likewise, `STALE` is not a reason ID.

## 15. Binding state vs lifecycle

Binding and lifecycle remain independent.

Examples:

```text
binding = CURRENT_BOUND
lifecycle = CURRENT_ACTIVE
```

or later:

```text
same old instance
binding remains what it originally observed
lifecycle = STALE_DISPLAYABLE / SUPERSEDED
```

A lifecycle transition must not rewrite the historical binding result of the old observation.

A new current binding requires a new coherent observation/revision according to this contract.

## 16. Panel / copy / warning rules

### Panel

```text
panel open
→ PANEL_OPEN observation

new turn occurs
→ old observation may remain displayable
→ lifecycle degrades/supersedes as appropriate
→ identity is not rewritten
```

### Copy

Preferred future behavior:

```text
copy click
→ fresh COPY_ACTION capture
→ new observation identity
```

If copy instead formats an existing observation without recapture, it must retain that original exact observation instance.

### Warning badge

Warning occurrence authority remains:

```text
current finalized output + lastCore.issues
```

Warning occurrence identity is subject-specific metadata and is NOT a replacement for diagnostic observation identity.

A warning badge may consume a `CURRENT_OUTPUT` observation but must not recreate warning semantics.

## 17. Runtime-generation rule

`runtimeGeneration` is part of observation identity.

Canonical consequence:

```text
runtime generation changes
→ new observationIdentity
```

A prior-generation memory-only observation may remain historical/stale-displayable if a surface intentionally retains it, but it cannot remain `CURRENT_ACTIVE` solely by carrying its old identity across reload.

Do not reuse v0.64.7 cache-telemetry handoff as generic diagnostic-observation persistence authority.

## 18. Canonical serialization / digest rule

If implementation uses an identity digest, it must be deterministic over the canonical semantic identity tuple.

Exclude:

```text
timestamps
random values
machine paths
presentation wording
raw message bodies
object insertion-order accidents
```

A digest is an implementation representation of the identity tuple.
It is not independent semantic authority.

Unknown/unsupported identity schema must produce `UNKNOWN_COMPARISON`, not silent best-effort equality.

## 19. Single comparator ownership

Diagnostic Observation Ownership Registry remains authoritative for ownership structure.

Future conceptual owner:

```text
DIAGNOSTIC_BINDING / diagnostic observation comparison helper
```

Panel, copy, warning detail, and fixtures must consume the same comparator semantics.

Forbidden:

```text
panel private identity comparator
copy private revision rules
warning private stale matcher
fixture-only equality semantics that differ from runtime
human-string parsing to recover identity
```

No dynamic registry service is required.
A small pure helper/static contract is preferred if implementation is promoted.

## 20. Privacy / boundedness

Identity and binding must remain content-free and bounded.

Allowed:

```text
small enums
turn indices
runtime generation identifier
bounded scope digest
small deterministic identity digest
revision integer
comparison/binding enum
reasonId references
```

Forbidden solely for identity/binding:

```text
raw user text
raw assistant output
system prompt
full chat history
full host object snapshots
unbounded provenance chains
persistent per-turn diagnostic ledger
```

## 21. Candidate CI / golden controls

When implementation is later promoted, at minimum prove:

```text
1. same exact envelope projected to panel and copy
   → EXACT_INSTANCE
   → semantic conformance required

2. presentation-only formatting change
   → same identity + same revision

3. bounded recapture at identical semantic position with additional valid evidence
   → same identity + higher revision

4. visible turn advances
   → new observation identity

5. runtime generation changes
   → new observation identity

6. PANEL_OPEN vs fresh COPY_ACTION at same indices
   → different observation identities

7. probe later than captured visible position
   → PROBE_AHEAD
   → no CURRENT TURN claim

8. visible position later than probe
   → PROBE_BEHIND
   → no CURRENT TURN claim

9. valid general snapshot with no request context
   → NO_REQUEST_CONTEXT
   → not failure

10. required source missing
    → UNAVAILABLE

11. mixed/incomparable bounded facts
    → UNBOUND / UNKNOWN_COMPARISON
    → no guessing

12. stale observation cannot regain currentness by identity mutation

13. same-lineage newer observation supersedes only its local subject/surface lineage

14. warning occurrence remains owned by finalized output + lastCore.issues

15. no raw-body retention

16. no SnapshotStore semantic writes

17. no timers/polling/network calls

18. latest.js == install.js if runtime implementation eventually occurs
```

## 22. Candidate CI failure vocabulary

Future validation may use narrow failures such as:

```text
DIAG_OBSERVATION_IDENTITY_MUTATED
DIAG_OBSERVATION_REVISION_PRESENTATION_ONLY_BUMP
DIAG_OBSERVATION_REVISION_NOT_BUMPED_ON_REFINEMENT
DIAG_OBSERVATION_NEW_POSITION_REUSED_IDENTITY
DIAG_OBSERVATION_CAPTURE_KIND_COLLAPSED
DIAG_OBSERVATION_RUNTIME_GENERATION_COLLAPSED
DIAG_OBSERVATION_COMPARATOR_DIVERGENCE
DIAG_OBSERVATION_UNKNOWN_COMPARISON_GUESSED
DIAG_BINDING_PRIVATE_ENUM
DIAG_BINDING_FALSE_CURRENT
DIAG_BINDING_NO_REQUEST_CONTEXT_COLLAPSED
DIAG_BINDING_UNAVAILABLE_COLLAPSED
DIAG_BINDING_REASON_STATE_COLLAPSE
DIAG_SURFACE_REVISION_IGNORED
DIAG_SUPERSESSION_GLOBALIZED
```

These are CI/design failure names, not runtime warning strings.

## 23. Implementation gate

This contract completes the broad Diagnostic UX pre-implementation architecture.

It does NOT itself authorize implementation.

Implementation still waits for an explicitly selected product work item and the normal SimCore workflow:

```text
main design/evidence
→ dedicated work branch
→ static/CI
→ release-simcore
→ real long-chat validation
→ main evidence/continuity sync
```

Likely first narrow implementation candidates remain:

```text
Warning Notification Surface v1
or
Diagnostic Snapshot Freshness repair
```

Whichever is selected must implement only the minimum identity/binding machinery it actually needs.

Do not build a general diagnostic framework merely because the contracts now exist.

## 24. Final classification

```text
SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING
= FINAL NARROW PRE-IMPLEMENTATION CONTRACT
= OBSERVATION IDENTITY / REVISION SEMANTICS FROZEN
= EXACT INSTANCE = IDENTITY + REVISION
= CANONICAL COMPARATOR VOCABULARY FROZEN
= CANONICAL BINDING VOCABULARY FROZEN
= FAIL-CLOSED / CONTENT-FREE / BOUNDED
= SINGLE-COMPARATOR / NO PRIVATE SURFACE LOGIC
= NO RUNTIME SERVICE REQUIRED

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```

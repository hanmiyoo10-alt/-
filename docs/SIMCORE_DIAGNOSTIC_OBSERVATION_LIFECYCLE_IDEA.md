# SimCore Diagnostic Observation Lifecycle — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC OBSERVATION LIFECYCLE CONTRACT · CI/DOCS-FIRST · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY_CONTRACT_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define the bounded lifecycle of one diagnostic observation after it has been captured and projected into a `DiagnosticObservationEnvelope`.

The adjacent contracts already define:

```text
Snapshot Freshness
= whether an observation is current / stale / unbound

Attribution Clarity
= result / reason / owner / source / freshness

Reason-Code Stability
= stable machine identity for reason semantics

Observation Envelope
= bounded transport/projection shape for one diagnostic fact

Surface Conformance Matrix
= same observation keeps the same semantic meaning across surfaces
```

This document answers the remaining lifecycle question:

```text
How long may one diagnostic observation remain active,
when must it become stale or superseded,
and when must surfaces stop consuming it as current?
```

This lifecycle belongs only to diagnostic observations and UI/report projections.

It is NOT a new SimCore runtime semantic state machine.

## 2. Constitutional boundary

Permanent responsibility split remains unchanged:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Diagnostic observation lifecycle may change only whether an old diagnostic projection is still considered current or displayable.

It must never:

```text
change Core state
change Session decisions
change Edit Reconcile decisions
change Broadcast lifecycle
change SnapshotStore semantic state
rewrite history
alter generated output
retry generation
change warning authority
change prompt bytes
```

If lifecycle bookkeeping fails, diagnostics degrade.

Runtime correctness does not.

## 3. Lifecycle is not freshness

Keep these concepts distinct.

```text
Freshness
= relation between one observation and the current visible/runtime context

Lifecycle
= whether that observation remains active, stale-displayable, superseded, or retired
```

Example:

```text
PANEL_OPEN snapshot @2060/@2061
new request advances visible chat to @2062/@2063
```

The old observation may become:

```text
freshness = STALE
lifecycle = STALE_DISPLAYABLE
```

It may still be shown as historical panel state.

It may NOT be presented as current.

## 4. Core lifecycle invariant

Canonical invariant:

```text
OLD OBSERVATION MAY REMAIN DISPLAYABLE
OLD OBSERVATION MAY NOT REGAIN CURRENT AUTHORITY BY MUTATION
```

If a newer coherent capture is required:

```text
capture new observation
→ new observation identity / revision
→ new envelope
```

Do NOT mutate an old stale envelope back into current state merely because the UI refreshed.

This prevents identity collapse and hidden evidence replacement.

## 5. Candidate lifecycle states

Keep the lifecycle vocabulary intentionally small.

```text
CURRENT_ACTIVE
STALE_DISPLAYABLE
SUPERSEDED
RETIRED
```

Optional implementation-time states should be added only if real surface behavior requires them.

### CURRENT_ACTIVE

The observation is the active observation for its surface/subject and its freshness contract permits current presentation.

This does not mean every diagnostic result is healthy.

It means only that the observation itself is active and defensibly current.

### STALE_DISPLAYABLE

The observation is no longer current but may remain visible for operator context.

Rules:

```text
must preserve its original observation identity
must expose stale/non-current freshness
must not drive current warning authority
must not be copied as current without recapture
```

### SUPERSEDED

A newer observation has replaced this observation for the same active subject/surface lineage.

A superseded observation may remain in strictly bounded provenance or an already-visible historical panel representation, but current consumers must prefer the newer observation.

### RETIRED

The observation is no longer consumed by active diagnostic surfaces.

Retirement may occur because:

```text
panel closed
new observation replaced old one and old provenance is no longer needed
warning occurrence cleared/superseded
bounded retention window ended
runtime generation invalidated the observation for current use
```

Retired does not mean deleted from repository evidence if a natural specimen was already promoted there.

## 6. No stale-to-current resurrection

Forbidden transition on the same observation identity:

```text
STALE_DISPLAYABLE
→ CURRENT_ACTIVE
```

when achieved by merely changing metadata on the same envelope.

Correct behavior:

```text
old observation
STALE_DISPLAYABLE

fresh recapture
→ new observationRevision / identity
→ new envelope
→ CURRENT_ACTIVE
```

This is one of the strongest lifecycle invariants.

A stale observation remains truthful about what it observed at its original capture point.

## 7. Observation revision semantics

`observationRevision` is local diagnostic lineage metadata, not a new Core state version.

Conceptual rule:

```text
same logical diagnostic capture lineage
+ materially newer coherent capture
→ higher observationRevision
```

Do not increment revision for presentation-only changes such as:

```text
panel expansion
line wrapping
localization
human label wording
copy formatting
DOM position
```

Do increment or replace identity when the underlying observation position changes materially, for example:

```text
visible turn indices advance
runtime probe lineage changes
copy action recaptures current state
warning occurrence changes to a new output occurrence
```

Exact revision mechanics are implementation-time work.

## 8. Panel lifecycle

An opened diagnostic panel may intentionally remain anchored to its open-time observation.

Preferred conceptual behavior:

```text
panel open
→ capture PANEL_OPEN observation
→ CURRENT_ACTIVE if bound

new request/output occurs
→ old panel observation becomes STALE_DISPLAYABLE
→ panel may remain visually open
→ must not imply CURRENT TURN
```

A future panel refresh action may create a new observation.

Do not silently overwrite the old observation's identity while preserving UI text that implies it is the same snapshot.

No continuous polling is required.

## 9. Copy lifecycle

Copy has a different user expectation from an open panel.

Future preferred candidate:

```text
copy click
→ bounded fresh capture
→ create COPY_ACTION observation
→ build copied report from that observation
```

If fresh capture succeeds:

```text
new copy observation may be CURRENT_ACTIVE
old panel observation remains STALE_DISPLAYABLE
```

This is not a conflict because they are different observation identities.

If fresh capture fails:

```text
fail closed
→ copied report must preserve explicit stale/unbound status
→ do not promote old panel observation to current
```

## 10. Warning occurrence lifecycle

Warning lifecycle remains governed by the existing warning authority and frozen occurrence semantics.

Existing design:

```text
current finalized output + lastCore.issues
→ warning occurrence
```

Lifecycle expectations:

```text
warning occurrence W1 current
→ badge active

same output observed repeatedly
→ same W1, no duplicate occurrence

later output with same warning text
→ new occurrence W2 allowed
→ W1 SUPERSEDED/RETIRED for current badge purposes

next clean output
→ current warning badge removed
→ prior warning occurrence not presented as current
```

The diagnostic lifecycle must not invent warning occurrence identity or warning severity.

It only tracks whether an already-authorized warning projection remains current.

## 11. Warning-click race

A specific race must be handled fail-closed.

Example:

```text
W1 warning badge visible
→ newer clean output arrives
→ user clicks old DOM node / queued handler
```

Forbidden:

```text
open W1 detail and label it current
```

Allowed future strategies:

```text
A. old node already removed; click has no effect
B. handler checks bounded occurrence identity and refuses current claim
C. opens historical/stale detail only if UI explicitly supports that mode
```

Default v1 preference remains simple:

```text
current warning only
next clean output removes badge
```

No warning history UI is required.

## 12. Runtime generation boundary

A reload/new runtime generation does not automatically prove every diagnostic observation is semantically invalid, but it breaks assumptions about memory-only currentness.

Default conservative rule:

```text
observation captured in prior runtime generation
→ cannot remain CURRENT_ACTIVE solely from memory
```

Depending on subject:

```text
may remain STALE_DISPLAYABLE
or
RETIRE
```

A new coherent capture in the new runtime generation creates a new observation identity/revision.

Do not reinterpret v0.64.7 telemetry handoff as generic diagnostic-observation persistence authority.

The two mechanisms remain separate.

## 13. Subject-local supersession

Supersession should be scoped narrowly.

A new observation for one subject should not automatically retire unrelated diagnostic subjects.

Example:

```text
new EDIT_RECONCILE observation
```

does not by itself mean:

```text
old STORE latency observation must disappear
```

if a surface intentionally displays historical store timing from the same report snapshot.

Preferred rule:

```text
supersession key
≈ surface/capture lineage + subject + observation lineage
```

Exact machine key is implementation-time work.

Do not create a global "latest diagnostic wins everything" rule.

## 14. Surface capability and lifecycle

Different surfaces may consume different lifecycle states.

### PANEL_DETAIL

May display:

```text
CURRENT_ACTIVE
STALE_DISPLAYABLE
```

if freshness is explicit.

### COPIED_REPORT

Preferred default:

```text
fresh copy-time observation
```

If unavailable, stale/unbound observation may be copied only with explicit lifecycle/freshness wording.

### WARNING_BADGE

May consume only the current active warning occurrence.

It must not show a stale historical badge.

### WARNING_CLICK_DETAIL

Must bind to the current warning occurrence when current-detail semantics are claimed.

## 15. Lifecycle does not equal retention

Keep lifecycle and storage/retention separate.

```text
Lifecycle
= may active surfaces still consume this observation and with what currentness?

Retention
= does some bounded copy still exist for diagnostics/evidence?
```

An observation may be:

```text
SUPERSEDED
but temporarily retained for bounded provenance
```

or:

```text
RETIRED from runtime surfaces
but permanently preserved as sanitized repository evidence
```

Do not create runtime history storage merely because lifecycle states exist.

## 16. Boundedness rule

No unbounded diagnostic observation ledger.

Hard default:

```text
one active observation per relevant surface lineage
+ at most narrowly justified previous observation while needed for stale display / handoff
```

Exact count is implementation-dependent and should remain minimal.

Forbidden solely for lifecycle:

```text
full per-turn diagnostic history
persistent SnapshotStore observation ledger
unbounded warning history
raw message retention
background cleanup timers
```

## 17. Cleanup triggers

Prefer deterministic event-driven cleanup.

Possible future cleanup triggers:

```text
panel close
new observation replaces old active observation
new finalized output clears warning occurrence
runtime unload / named hook cleanup
explicit diagnostic refresh
bounded copy action completion
```

Avoid timer-driven cleanup unless a concrete host lifecycle gap proves it necessary.

## 18. Failure behavior

Lifecycle bookkeeping must fail toward weaker observability.

Examples:

```text
cannot prove observation is still current
→ STALE_DISPLAYABLE / UNBOUND / RETIRE according to surface

occurrence identity missing
→ do not retain warning badge as current

revision comparison unavailable
→ do not merge observations

runtime generation changed unexpectedly
→ current authority degrades
```

Never recover lifecycle certainty by guessing from wall-clock proximity alone.

## 19. Relationship to semantic result changes

A new observation may legitimately have a different semantic result.

Example:

```text
Observation O1
POST_BEND_CLOCK_HANDOFF = APPLIED

later Observation O2
POST_BEND_CLOCK_HANDOFF = INELIGIBLE
```

This is not result drift if they refer to different requests.

Lifecycle must preserve:

```text
O1 semantics stay O1
O2 semantics stay O2
```

Do not mutate O1 to contain O2's result.

This is why identity/revision and Surface Conformance must remain observation-scoped.

## 20. Relationship to reason-code stability

Reason IDs remain stable semantic identities across observation lifecycles.

Lifecycle state must not be encoded into reason IDs.

Bad:

```text
PROBE_VISIBLE_INDEX_MISMATCH_STALE
PROBE_VISIBLE_INDEX_MISMATCH_SUPERSEDED
```

Preferred:

```text
reasonId = PROBE_VISIBLE_INDEX_MISMATCH
freshness = STALE
lifecycle = STALE_DISPLAYABLE
```

Result/reason/freshness/lifecycle remain independent dimensions.

## 21. Candidate lifecycle transition matrix

Conceptual allowed transitions:

```text
CAPTURED
→ CURRENT_ACTIVE
→ STALE_DISPLAYABLE
→ SUPERSEDED
→ RETIRED
```

Alternative valid paths:

```text
CAPTURED
→ UNBOUND/failed-currentness
→ STALE_DISPLAYABLE
→ RETIRED
```

and:

```text
CURRENT_ACTIVE
→ SUPERSEDED
→ RETIRED
```

Forbidden same-identity transition:

```text
STALE_DISPLAYABLE
→ CURRENT_ACTIVE
```

Fresh recapture must create a new observation.

`CAPTURED` is a conceptual construction phase and does not need to become a durable runtime enum.

## 22. Candidate CI / fixture controls

If implementation is later promoted, useful fixtures include:

```text
1. panel open/current
   → CURRENT_ACTIVE

2. panel remains open across one new turn
   → old observation STALE_DISPLAYABLE
   → no false CURRENT TURN

3. copy after stale panel
   → new COPY_ACTION observation
   → old panel observation unchanged

4. failed fresh recapture
   → no stale-to-current resurrection

5. warning W1 repeated on same output callback
   → no duplicate occurrence

6. later output creates W2
   → W1 no longer current

7. clean output after W1
   → badge removed / W1 retired from current surface

8. click race after warning superseded
   → no stale current-detail claim

9. runtime generation changes
   → prior memory-only observation loses current authority

10. presentation-only change
    → no observation revision increment required

11. semantic new capture
    → new observation identity/revision

12. reasonId unchanged while lifecycle changes

13. no raw body retained

14. no SnapshotStore semantic writes

15. no timers/polling

16. latest.js == install.js if runtime implementation eventually occurs
```

## 23. Candidate CI failure vocabulary

Future static/behavior validation may use narrow classes such as:

```text
DIAG_LIFECYCLE_STALE_RESURRECTED
DIAG_LIFECYCLE_SUPERSEDED_STILL_CURRENT
DIAG_LIFECYCLE_RETIRED_STILL_CONSUMED
DIAG_LIFECYCLE_OBSERVATION_IDENTITY_MUTATED
DIAG_LIFECYCLE_CROSS_OBSERVATION_MERGE
DIAG_LIFECYCLE_WARNING_OCCURRENCE_REUSED
DIAG_LIFECYCLE_WARNING_STALE_CURRENT_CLAIM
DIAG_LIFECYCLE_GENERATION_BOUNDARY_IGNORED
DIAG_LIFECYCLE_UNBOUNDED_RETENTION
DIAG_LIFECYCLE_TIMER_DEPENDENCY_ADDED
DIAG_LIFECYCLE_SNAPSHOTSTORE_SEMANTIC_WRITE
DIAG_LIFECYCLE_REASON_STATE_COLLAPSE
```

These are CI/design failure names, not runtime warning strings.

## 24. Implementation shape — future only

Do not create a diagnostic lifecycle service merely because this design exists.

Preferred future shape if promoted:

```text
bounded observation object
+ existing panel/widget lifecycle callbacks
+ tiny pure transition helper if necessary
```

Likely unnecessary:

```text
global lifecycle event bus
persistent observation database
background scheduler
reactive stream framework
second runtime state store
```

Lifecycle logic should remain local to diagnostic presentation ownership.

## 25. Promotion gate

Do not implement this contract by itself.

Implementation becomes worthwhile only when an adjacent runtime/UI item is selected, such as:

```text
Diagnostic Snapshot Freshness repair
Diagnostic Observation Envelope projection implementation
Warning floating widget
shared diagnostic attribution implementation
panel/copy refresh behavior cleanup
```

Then implement only the lifecycle transitions required by the selected surface.

No broad diagnostic framework rewrite.

## 26. Relationship to neighboring contracts

```text
Diagnostic Snapshot Freshness Contract
= is this observation current / stale / unbound relative to visible/runtime context?

Diagnostic Attribution Clarity
= what happened and who/why/source supports it?

Reason-Code Stability Contract
= stable identity for the reason dimension

Diagnostic Observation Envelope
= bounded data object carrying one observation

Diagnostic Observation Lifecycle
= whether that envelope is active, stale-displayable, superseded or retired

Surface Conformance Matrix
= surfaces preserve the same semantics for the same observation

Warning Notification Surface
= exceptional current-output signal with its own occurrence authority
```

No contract in this stack becomes a second semantic validator.

## 27. Current classification

```text
SIMCORE_DIAGNOSTIC_OBSERVATION_LIFECYCLE
= HIGH VALUE DIAGNOSTIC UX / DATA-LIFECYCLE CONTRACT
= OBSERVATION-SCOPED
= CURRENT / STALE-DISPLAYABLE / SUPERSEDED / RETIRED
= NO STALE-TO-CURRENT RESURRECTION
= FRESH RECAPTURE CREATES NEW OBSERVATION
= WARNING-OCCURRENCE AWARE
= RUNTIME-GENERATION CONSERVATIVE
= BOUNDED / EVENT-DRIVEN CLEANUP
= NO UNBOUNDED HISTORY
= NO SECOND RUNTIME STATE MACHINE
= CI/DOCS-FIRST
= IMPLEMENTATION TRIGGERED, NOT AUTOMATIC

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
warning authority change: NONE
release-system change: NONE
```

# SimCore v0.70.8 Repeat-Send Representation Rewind Guard Design

Date: 2026-09-06 KST
Status: **DESIGN FROZEN · VERSION RESERVED · IMPLEMENTATION NOT STARTED**
Release: **v0.70.8 Repeat-Send Representation Rewind Guard**
Release class: **CORRECTNESS / REPRESENTATION + EDIT-RECONCILE MINI**
Tracking: `#1544`
Root-cause evidence: `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_ROOT_CAUSE_EVIDENCE_2026-09-06.md`
Three-lens live authority: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`

## 1. Version reservation

Fresh production at design freeze:

```text
production version = 0.70.7
production release = Output Snapshot Set Cost Attribution
release-simcore commit = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
```

Repository search found no existing `0.70.8` reservation.

The next fresh monotonic runtime identity is therefore reserved as:

```text
0.70.8
Repeat-Send Representation Rewind Guard
```

This reservation is for the exact #1544 repair only. It does not authorize implementation while an active R2.11 release-system transaction still owns the implementation lane.

## 2. Problem statement

The live #1544 repeat-send specimen proves a bounded correctness-path defect:

```text
prior Representation = OUTPUT_MISMATCH
visible current = exact prior Fresh
operator action = repeat-send / reroll
expected = REPRESENTATION_FAST_RECONCILED / snapshot UNCHANGED
observed = MANUAL_EDIT_REBUILT / snapshot UPDATED
```

The root cause is request-time temporal skew:

```text
sendIndex = S
lastPreparedSendIndex = S
Session currentOutputIndex = S + 1
Host-visible lastAssistant after reroll removal = S - 1
```

The ordinary Fresh alias guard correctly rejects a Session current slot that does not equal the visible assistant slot, but it currently has no separate authority for this exact same-session repeat-send rewind geometry.

## 3. Design objective

Repair exactly one decision:

```text
PROVEN_REPEAT_SEND_REWIND
+ prior OUTPUT_MISMATCH
+ current exact prior Fresh
→ treat as proven host representation carryover
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

Do not change how a genuine third representation is classified or rebuilt.

## 4. Chosen repair shape

Keep the existing ordinary same-slot guard unchanged.

Add a second, independently bounded **repeat-send rewind authority** to Edit Reconcile.

The common representation facts remain mandatory:

```text
priorProvenance exists for exact visible assistant slot + location
priorRepresentation == OUTPUT_MISMATCH
currentMatch == FRESH_CHAT
priorCanonical exists
priorFresh exists
priorCanonical != priorFresh
visibleFingerprint == priorFresh
```

Then exactly one canonical authority must hold.

### Authority A — existing same-slot authority

Unchanged:

```text
cs.currentOutputIndex == lastAssistant
cs.current.outputFingerprint == priorCanonical
cs.trustedOutputFingerprint == priorCanonical
```

### Authority B — new repeat-send rewind authority

All conditions required:

```text
sendIndex is an integer >= 0
cs.lastPreparedSendIndex == sendIndex
cs.currentOutputIndex == sendIndex + 1
lastAssistant == sendIndex - 1
priorProvenance.outIndex == lastAssistant
priorProvenance.locationKey == current location when location is present
```

Conceptually:

```text
representationFastEligible = commonFreshAliasFacts
  && (sameSlotAuthority || repeatSendRewindAuthority)
```

No individual repeat-send condition is sufficient by itself.

## 5. Why this is safer than weakening the old guard

The existing current/trusted canonical guard protects against stale provenance being applied to the wrong Session slot.

v0.70.8 does not remove or loosen that guard.

Instead it recognizes one second topology that proves why Session is ahead of the visible chat:

```text
prepared user S
completed output S+1 exists in Session
Host reroll removes S+1 before request preparation
visible prior assistant becomes S-1
same user S is being prepared again
```

The new path therefore requires exact index geometry plus exact Representation provenance.

Unknown, partial, cross-location, or non-repeat-send geometry fails closed to existing reconciliation.

## 6. Data flow change

The outer request path already knows `sendIndex` before Edit Reconcile.

v0.70.8 may pass that integer as bounded request context:

```text
prepareCoreRequest(..., sendIndex, ...)
→ reconcileManualEdit(..., { sendIndex })
→ editReconcile.reconcileVisiblePreviousAssistant(..., { sendIndex, ... })
```

No new Host read is required.

Edit Reconcile may inspect only existing ephemeral Session facts:

```text
currentOutputIndex
lastPreparedSendIndex
current.outputFingerprint
trustedOutputFingerprint
```

and the existing Representation provenance row.

## 7. Diagnostic provenance

The new rewind path must remain distinguishable from the ordinary same-slot path without creating a new diagnostic subsystem.

Preferred bounded marker:

```text
path = representation-fast-reconciled
compatibilitySource = fresh-exact-repeat-send-rewind
editOrigin = REPRESENTATION_DRIFT_CORRELATED
snapshot = UNCHANGED
```

Existing ordinary path keeps:

```text
compatibilitySource = fresh-exact-carryover
```

The marker is diagnostic provenance only. It adds no persistent state.

## 8. Required permanent regression

The v0.70.8 implementation must add a direct executable permanent Edit Reconcile regression that models the missing live dimension.

A marker-only/static assertion is insufficient.

### Positive A — existing ordinary same-slot Fresh carryover

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
currentOutputIndex = lastAssistant
current/trusted canonical = priorCanonical
→ representation-fast-reconciled
→ delegate count 0
→ snapshot/save count 0
→ compatibilitySource fresh-exact-carryover
```

### Positive B — target repeat-send rewind

Use bounded indices such as:

```text
lastAssistant = 0
sendIndex = 1
lastPreparedSendIndex = 1
currentOutputIndex = 2
priorProvenance.outIndex = 0
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
visible = priorFresh
```

Expected:

```text
representation-fast-reconciled
representationFastReconciled = true
delegate count = 0
snapshot/save count = 0
compatibilitySource = fresh-exact-repeat-send-rewind
editOrigin = REPRESENTATION_DRIFT_CORRELATED
```

### Negative C — incomplete rewind geometry

At least these independent negatives must fail closed:

```text
lastPreparedSendIndex != sendIndex
currentOutputIndex != sendIndex + 1
lastAssistant != sendIndex - 1
priorProvenance.outIndex != lastAssistant
location mismatch when location identity exists
```

None may take the new rewind fast path.

### Negative D — genuine user edit

```text
currentMatch != FRESH_CHAT
or visibleFingerprint != priorFresh
→ new rewind authority cannot apply
→ existing USER_EDIT_CANDIDATE / MANUAL_EDIT_REBUILT semantics preserved where otherwise eligible
```

### Control E — clean reroll / prior EXACT

The independent healthy control remains:

```text
priorRepresentation = EXACT
→ no new OUTPUT_MISMATCH rewind exception
→ existing SAME_FAST / SAME_SNAPSHOT / HOST_COMPATIBLE behavior unchanged
```

## 9. Static/CI invariants

Implementation qualification must prove:

```text
latest.js == install.js
version identity = 0.70.8 consistently
existing ordinary representation-fast guard still present
new rewind guard is conjunctive and bounded
sendIndex context is passed explicitly
no extra storage read/write
no network operation
no timer / polling / retry
no persistent schema change
no raw body retention
no change to Representation registry retention policy
no change to Deferred Mirror transport authority
no change to provider cache posture
```

Permanent tests must execute the production owner rather than copy its boolean algorithm into test-only code.

## 10. Frozen unaffected surfaces

The following are frozen for v0.70.8:

```text
Core / Prompt semantics
Current Task Primacy
Broadcast lifecycle
Frame / Continuity / Narrative clock
Evidence / Lineage / Handoff / Recurrence / Summary
COMMUNITY classifier / Structure / Reaction
Output Compat envelope behavior
Deferred Mirror gates and transport
SnapshotStore schema / retention policy
Host-local telemetry schema
provider cache = UNVERIFIED
output-storage optimization
repeat-send pre-snapshot latency optimization
release-system / R2.11 architecture
```

Specific separate findings remain separate:

```text
#1545 CURRENT_DEVELOPMENT drift = NON_RUNTIME FIX / separate admin transaction
#1546 맘스홀릭베이비 alias gap = COMMUNITY FIX CANDIDATE / separate runtime mini
#1556 repeat-send pre-snapshot READ HIT latency = WATCH / separate performance lane
REPEATED_OUT_STORAGE_LATENCY = WATCH / separate performance lane
```

v0.70.8 must not opportunistically repair any of them.

## 11. R2.11 separation

R2.11 is currently being implemented as a separate non-runtime release-system transaction.

This v0.70.8 work is currently **DESIGN-ONLY**.

```text
R2.11 transaction = may continue independently
v0.70.8 runtime source implementation = NOT STARTED
shared implementation transaction = FORBIDDEN
```

Normal policy remains to serialize runtime implementation/publication behind durable R2.11 closure unless a later explicit authority proves a safe independent write schedule.

R2.11 completion does not automatically authorize v0.70.8 implementation. Implementation authorization must still be recorded separately.

## 12. Real long-chat acceptance

After implementation, CI, and normal `release-simcore` publication, v0.70.8 requires real long-chat validation.

The new three-lens protocol is mandatory.

### Lens 1 — version/release contract

Required verdict question:

```text
Did v0.70.8 repair the bounded repeat-send rewind misclassification without weakening genuine edit semantics?
```

Minimum controls:

```text
ordinary exact carryover = PASS
clean repeat-send / reroll = PASS
genuine manual edit = PASS
no new snapshot rewrite on healthy controls
no new correctness warning/blocker
```

If a natural `OUTPUT_MISMATCH + exact Fresh + repeat-send rewind` target specimen occurs, it must report:

```text
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
compatibilitySource fresh-exact-repeat-send-rewind
```

The deterministic direct-owner fixture is the primary proof of the exact target geometry if Host representation mismatch cannot be naturally reproduced on demand. Natural target recurrence, when available, upgrades confidence but must never be fabricated.

### Lens 2 — coherent set / transition

Review the supplied long-chat specimens as causal sequences, especially:

```text
ordinary → output commit → reroll/repeat-send
OUTPUT_MISMATCH provenance → later repeat-send rewind
clean reroll → regenerated output
genuine manual edit → next request
```

Operator declarations such as reroll or manual edit remain first-class evidence.

### Lens 3 — exhaustive element inventory

Every active `raw-lineage-v2` diagnostic element must receive one explicit disposition:

```text
PASS / WATCH / DEFER / FIX / BLOCKER / NOT_EXERCISED / NOT_APPLICABLE
```

No blank cells and no silent PASS for unobserved elements.

Existing unrelated storage latency may remain WATCH if correctness stays intact.

## 13. Release advancement rule

v0.70.8 is a repair release for the unresolved FIX itself.

Therefore the existing rule:

```text
unresolved FIX/BLOCKER stops unrelated advancement
```

does not forbid this dedicated repair design. It forbids skipping #1544 in favor of an unrelated performance or feature release.

Terminal closure requires:

```text
implementation matches frozen design
static/permanent CI PASS
release-simcore publication from normal authority
real long-chat controls complete
three-lens review complete
no new unresolved correctness FIX/BLOCKER
#1544 closed or explicitly evidence-reclassified by durable authority
main continuity/docs synchronized
```

## 14. Implementation sequence when authorized

```text
1. fresh main + release-simcore readback
2. verify production still 0.70.7 and reservation still fresh
3. dedicated v0.70.8 implementation branch
4. implement only repeat-send rewind authority + bounded provenance marker
5. add direct-owner positive/negative permanent regression
6. static/permanent SimCore CI
7. normal release-simcore candidate/publication transaction
8. verify latest.js == install.js and exact deployed identity
9. real long-chat validation
10. Lens 1 review
11. Lens 2 review
12. Lens 3 element inventory
13. close/reclassify #1544 from evidence
14. main docs / long-term continuity sync
```

## 15. Current disposition

```text
V07008_VERSION = RESERVED
V07008_DESIGN = FROZEN
V07008_IMPLEMENTATION = NOT STARTED
ROOT_CAUSE = ATTRIBUTED
TARGET = #1544 ONLY
RELEASE_NAME = Repeat-Send Representation Rewind Guard
R2.11_COUPLING = FORBIDDEN
RELEASE_SIMCORE_MUTATION = NONE
PRODUCTION = v0.70.7 UNCHANGED
```

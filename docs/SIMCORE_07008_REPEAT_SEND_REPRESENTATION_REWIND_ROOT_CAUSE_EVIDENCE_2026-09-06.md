# SimCore v0.70.8 Repeat-Send Representation Rewind Root-Cause Evidence

Date: 2026-09-06 KST
Status: **ROOT CAUSE ATTRIBUTED · FIX #1544 · DESIGN INPUT · RUNTIME SOURCE UNCHANGED**
Classification: **SIMCORE · REPRESENTATION / EDIT-RECONCILE · REPEAT-SEND**
Tracking: `#1544`
Production inspected: `v0.70.7 Output Snapshot Set Cost Attribution`
Production commit: `434df54760bc997b1bcd9223eeaff428aeee66d3`
Production blob: `6f7cae5b5a8ade66e20beaaf253e365ba035cc18`

## 1. Observed defect

The live defect is the earlier repeat-send specimen preserved in `#1544`:

```text
Pre snapshot: REPEAT-SEND · READ HIT · 853.0 ms
Prior representation: OUTPUT_MISMATCH
canonical 4302:8162b9a4
fresh 4300:5d8a429d
current 4300:5d8a429d
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
Edit origin REPRESENTATION_DRIFT_CORRELATED
History mutation NONE
Cache topology STABLE · 54/54 · 100%
Edit reconcile MANUAL_EDIT_REBUILT · 2.280 s
snapshot UPDATED
```

Frozen expected behavior:

```text
Prior OUTPUT_MISMATCH + current exact prior Fresh
→ proven representation alias
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

A later independent operator-confirmed clean reroll proved the generic reroll path is not broadly broken:

```text
Pre snapshot REPEAT-SEND · READ HIT · 1.839 s
Prior representation EXACT
canonical == fresh == current
Edit origin NONE
Edit reconcile SAME_SNAPSHOT
snapshot UNCHANGED
History mutation NONE
Cache topology 100% STABLE
SimCore contribution NO_BREAK
```

Therefore the active defect is bounded to `OUTPUT_MISMATCH + exact Fresh` under repeat-send/rewind state or an immediately adjacent state.

## 2. Exact deployed owner

The deployed owner is the `edit-reconcile` application service:

```text
reconcileVisiblePreviousAssistant(...)
reconcileSessionEditedOutput(...)
```

Representation supplies bounded provenance through `representationRegistry.latest(...)` and `inspectCarryover(...)`.

Session remains the owner of ephemeral request/output indices:

```text
currentOutputIndex
lastPreparedSendIndex
```

No Host read is performed by the representation classifier itself.

## 3. Existing fast guard

The exact v0.70.7 guard requires all of the following:

```text
priorProvenance exists
priorRepresentation == OUTPUT_MISMATCH
currentMatch == FRESH_CHAT
priorCanonical exists
priorFresh exists
priorCanonical != priorFresh
visibleFingerprint == priorFresh
cs.currentOutputIndex == lastAssistant
cs.current.outputFingerprint == priorCanonical
cs.trustedOutputFingerprint == priorCanonical
```

This guard is correct for an ordinary same-slot carryover and must not be weakened globally.

The same-slot/current/trusted canonical requirements prevent an old or unrelated Representation row from being treated as authority for a different current Session slot.

## 4. Request ordering creates a repeat-send temporal skew

The exact deployed request sequence is:

```text
load Core Session
→ bootstrap if needed
→ reconcileManualEdit / Edit Reconcile
→ alias migration
→ cs.onSend(...)
```

`cs.onSend(...)` is where repeat-send restoration is currently recognized:

```text
previousOutputIndex = this.currentOutputIndex
mustRestorePre = sendIndex <= previousOutputIndex || sendIndex == this.lastPreparedSendIndex
existingPre = mustRestorePre ? store.load('pre', sendIndex) : null
base = existingPre || this.current
```

Therefore Edit Reconcile runs **before** the request path consumes the existing `pre` snapshot for the repeat-send.

## 5. Live index geometry

For the preserved defect, the operator rerolled/repeated the same user request after a completed output.

Conceptual indices:

```text
previous visible assistant before the user = S - 1
current user request                    = S
first completed output for that user    = S + 1
```

When the Host begins the repeat-send/reroll, the just-completed `S + 1` assistant is removed from the visible chat before the model request hook is prepared.

At that moment:

```text
visible chat lastAssistant = S - 1
Session currentOutputIndex = S + 1   // still points at the just-completed output
Session lastPreparedSendIndex = S
request sendIndex = S
```

The Representation registry lookup is correctly performed for visible slot `S - 1`, and the live relation is correctly classified as:

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
visibleFingerprint = priorFresh
```

But the ordinary same-slot guard necessarily fails at:

```text
cs.currentOutputIndex == lastAssistant
```

because:

```text
S + 1 != S - 1
```

This is not evidence that the Fresh representation is unknown. It is evidence that the current Session is temporarily one completed request/output pair ahead of the visible rewind point.

## 6. Why the diagnostic looked contradictory

The live diagnostic showed both:

```text
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Edit reconcile = MANUAL_EDIT_REBUILT
```

This is internally consistent with the deployed code.

`Edit origin` is assigned after the reconciliation result. If the fast guard fails and the fallback reports `changed`, the diagnostic still classifies:

```text
priorRepresentation == OUTPUT_MISMATCH
&& currentMatch == FRESH_CHAT
→ REPRESENTATION_DRIFT_CORRELATED
```

Therefore `REPRESENTATION_DRIFT_CORRELATED` does not prove that the fast branch executed.

The actual path marker `MANUAL_EDIT_REBUILT` proves that the fast eligibility guard returned false and the Session fallback ran.

## 7. Why the Session fallback can rebuild

Once the outer fast guard fails, Edit Reconcile delegates:

```text
reconcileSession(lastAssistant, visibleContent, ...)
```

At repeat-send entry, Session memory still belongs to the later `S + 1` output while `lastAssistant` is the earlier `S - 1` slot.

The fallback then loads the persisted `out` snapshot for `S - 1` and compares the visible Fresh representation against persisted canonical/host fingerprints and compatibility replay.

The Representation registry is memory-only provenance and its `priorFresh` alias is not itself a persisted output fingerprint.

Consequently a proven Fresh alias can miss the Session snapshot fast paths and fall through to the manual rebuild branch, producing the observed `snapshot UPDATED`.

## 8. Why existing regression did not catch it

The existing direct Edit Reconcile fixture already proves the ideal relation:

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
visible = priorFresh
currentOutputIndex = lastAssistant
current canonical = trusted canonical = priorCanonical
→ representation-fast-reconciled
```

That fixture correctly protects the ordinary same-slot path.

It does **not** model the live repeat-send geometry:

```text
lastPreparedSendIndex = S
currentOutputIndex = S + 1
visible lastAssistant = S - 1
```

The missing test dimension is therefore **request rewind geometry**, not the basic Fresh-carryover relation.

## 9. Root-cause statement

```text
ROOT CAUSE = repeat-send request-time temporal skew between visible chat and Session currentOutputIndex

Host removes the just-completed rerolled output before request preparation
→ visible lastAssistant rewinds to S-1
→ Session still points at S+1
→ ordinary same-slot Fresh-alias guard fails
→ fallback compares/rebuilds the older slot
→ proven representation drift is misrouted through MANUAL_EDIT_REBUILT
```

Classification:

```text
#1544 = FIX
root cause confidence = HIGH / SOURCE-BOUND + LIVE-BOUND
visible output corruption = NOT OBSERVED
snapshot correctness = WRONG PATH / REDUNDANT STATE UPDATE
generic reroll = HEALTHY
```

## 10. Repair constraint derived from the evidence

The repair must **not** globally relax the existing same-slot guard.

A safe repair may add a second bounded authority only when the request geometry itself proves a same-session repeat-send rewind:

```text
request sendIndex = S
lastPreparedSendIndex = S
currentOutputIndex = S + 1
visible lastAssistant = S - 1
Representation provenance belongs exactly to visible lastAssistant/location
prior OUTPUT_MISMATCH
current exact prior Fresh
```

Under that exact conjunction, the current Session being ahead is expected repeat-send state rather than evidence against the older slot's Representation provenance.

Any incomplete geometry must fail closed to the existing path.

## 11. Production boundary

This evidence record changes no runtime source.

```text
release-simcore mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
persistent schema mutation = NONE
runtime behavior mutation = NONE
```

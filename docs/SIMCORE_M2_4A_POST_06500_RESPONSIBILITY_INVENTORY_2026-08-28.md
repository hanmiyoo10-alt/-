# SimCore M2-4A — Post-v0.65.0 Responsibility Inventory

Date: 2026-08-28

Status: **POST-M2-3 SOURCE REBASE COMPLETE · DESIGN EVIDENCE · NO RUNTIME CHANGE · M2-4 IMPLEMENTATION BLOCKED UNTIL v0.65.0 LIVE CLOSE**

## 1. Purpose

This document performs the mandatory M2-4A source rebase that the earlier M2-4B/C/D/E predesign documents required after M2-3 physically landed.

The question is not whether the old pre-M2-3 design looked reasonable. The question is whether the actual v0.65.0 production artifact still contains the same ownership boundaries and debts after Edit Reconcile was physically extracted.

This inventory therefore reads the actual production source and answers:

```text
what M2-3 actually moved
what Session still legitimately owns
what Session still owns only by transition history
what Runtime Mirror still observes vs interprets
what Recovery facade callers remain
whether output-finalize remains a real independent transaction
whether the provisional M2-4B/C/D/E decisions survive source reality
```

No runtime implementation is authorized by this document.

---

## 2. Production authority used for the rebase

Actual production authority at review time:

```text
release-simcore
v0.65.0 — M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence
release commit: c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest.js == install.js blob: 1b38e2b2874f2581edae8f1080edc39558febefa
```

The installed artifact exposes converged runtime identity:

```text
//@version              0.65.0
SIMCORE_RUNTIME_VERSION 0.65.0
HOST_COMPAT_VERSION     0.65.0
```

M2-4 design uses this exact production shape rather than the older v0.64.7 predesign baseline.

Important live-gate constraint:

```text
v0.65.0 Subgate A post-refresh adoption = not yet closed at design time
v0.65.0 Subgate B M2-3 acceptance        = not yet authorized/closed at design time
```

Therefore M2-4 may be designed now but must not enter implementation/release execution until the current v0.65.0 live gate is closed or a newly discovered blocker explicitly changes the plan.

---

## 3. M2-3 physical result — confirmed

The production artifact now contains a physical Application module:

```text
edit-reconcile
```

The old Session/outer ownership sites are delegates.

Session shape:

```js
async reconcileEditedOutput(outIndex, content, perfDetail = null) {
  return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail, {
    kernel, time, recovery, finalizePreparedOutput, sessionNow, sessionElapsed,
  });
}
```

The outer manual-edit entry point likewise delegates to the extracted service.

Classification:

```text
M2_3_PHYSICAL_EXTRACTION
= CONFIRMED IN PRODUCTION SOURCE

SESSION_EDIT_DECISION_OWNERSHIP
= REMOVED

OUTER_RUNTIME_EDIT_DECISION_OWNERSHIP
= REMOVED
```

This satisfies the source precondition for a real M2-4 rebase. M2-4 must not move the Edit Reconcile decision tree back into Session or Runtime Mirror.

---

## 4. Session field inventory after M2-3

Actual `CoreRulesetSession` still initializes:

```text
store
current
initSource
needsHistoryBootstrap
loadedFromLegacySnapshot
trustedOutputFingerprint
trustedHostOutputFingerprint
currentOutputIndex
lastPreparedSendIndex
deferredPruneIndex
deferredPruneRunning
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

### 4.1 Legitimate long-lived Session anchors

These still match the provisional M2-4B state-holder contract:

```text
store
current
trustedOutputFingerprint
trustedHostOutputFingerprint
currentOutputIndex
lastPreparedSendIndex
initSource / needsHistoryBootstrap as bounded initialization lifecycle
```

They represent per-chat application identity, persistence sequencing anchors, or bounded request/output coordination.

Target classification:

```text
SESSION_STATE_HOLDER_CORE
= KEEP
```

### 4.2 Transition/receipt fields still requiring narrowing review

The following remain physically Session-owned:

```text
loadedFromLegacySnapshot
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

These are not automatically defects. They are migration/diagnostic receipts whose final location must follow the actual owner producing them.

M2-4 rule:

```text
move only when the producing owner has a bounded receipt boundary
otherwise keep temporarily rather than invent a new state container
```

Do not turn M2-4 into broad diagnostic-state relocation merely for aesthetic purity.

---

## 5. Session still owns Store housekeeping state — debt confirmed

The actual production Session still owns:

```text
deferredPruneIndex
deferredPruneRunning
```

and `scheduleDeferredPrune(outIndex)` still performs bounded retention housekeeping with the existing policy:

```text
outIndex >= 17
outIndex % 17 == 0
same outIndex dedupe
single running prune guard
setTimeout(run, 750)
store.prune()
retention failure isolated from committed output/state
```

This confirms the M2-4B ownership debt survives M2-3.

Architectural interpretation:

```text
Session may decide WHEN output sequencing reaches a housekeeping trigger
Store should own HOW retention housekeeping is deduped/run against persistence
```

M2-4 target:

```text
Session
→ invoke one Store housekeeping operation after the same output condition

Store housekeeping owner
→ cadence/dedupe/running state + prune execution mechanics
```

Frozen equivalence:

```text
cadence 17 unchanged
750 ms deferred delay unchanged
no extra timer
no extra prune call
no output-critical await added
failure isolation unchanged
retention semantics unchanged
```

This is an ownership move, not Store latency optimization.

---

## 6. Output finalization transaction — extraction remains justified

The actual v0.65.0 source still contains one independent helper inside the Session module:

```js
function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) { ... }
```

The transaction still coordinates deterministic output-state finalization and is not merely a Session identity helper.

Actual post-M2-3 call-site inventory confirms it is reused by:

```text
ordinary Session.processOutput
Edit Reconcile compatibility replay
Edit Reconcile repaired-envelope replay
Edit Reconcile manual rebuild replay
```

Some Edit Reconcile calls use:

```text
{ normalizeReactions: false }
```

for behavior-equivalent deterministic replay.

This is stronger post-M2-3 evidence for the provisional M2-4D decision:

```text
OUTPUT_FINALIZATION_COMPOSITION
= REAL INDEPENDENT APPLICATION TRANSACTION
= REUSED ACROSS SESSION + EDIT_RECONCILE
= EXTRACTION STILL JUSTIFIED
```

M2-4 target remains a physical Application module provisionally/finally named:

```text
output-finalize
```

Target responsibility:

```text
prepared output + base semantic state
→ deterministic finalized output + finalized semantic state + bounded receipts
```

It must not gain persistence, host, mirror, Edit Reconcile policy, or Output Compat policy ownership.

---

## 7. Recovery facade call-site rebase — direct-owner migration remains justified

The production Session module still imports:

```js
const recovery = require('./recovery');
```

The physical `recovery` module remains a forwarding facade over:

```text
output-compat
bootstrap-migration
```

### 7.1 Actual post-M2-3 output-compat calls still routed through Recovery

Observed current uses include:

```text
recovery.prepareOutput(...)
recovery.buildSafeEnvelopeBoundaryConfirmation(...)
```

These are Output Compat responsibilities.

### 7.2 Actual post-M2-3 bootstrap/migration calls still routed through Recovery

Observed current uses include:

```text
recovery.bootstrapFromHistory(...)
recovery.repairLegacyClockState(...)
recovery.repairLatestGlobalFloorContamination(...)
```

These are Bootstrap Migration responsibilities.

### 7.3 M2-3 changed the caller topology in an important way

The newly extracted `edit-reconcile` service receives the transitional Recovery dependency by injection and uses both:

```text
prepareOutput
repairLegacyClockState
```

Therefore the post-M2-3 source confirms the direct-owner destination more clearly than the old audit:

```text
edit-reconcile
→ output-compat for output compatibility
→ bootstrap-migration for legacy repair
→ output-finalize for deterministic replay
```

Session likewise should call the physical owners directly for surviving Session-owned sequencing.

### 7.4 Facade deletion decision

Contracts v2 places transition-code removal in M2-5+ after equivalence evidence.

Therefore M2-4 should distinguish:

```text
runtime caller migration away from recovery = M2-4 target
physical recovery facade deletion           = NOT REQUIRED IN v0.66.0
```

Preferred v0.66.0 state:

```text
production runtime callers of recovery = 0
recovery facade = retained deprecated/compatibility shim with zero new policy
```

Physical deletion belongs to a later M2-5 transition-debt retirement gate unless stronger repository authority explicitly changes that order.

---

## 8. Runtime Mirror ownership debt after M2-3 — confirmed unchanged

Actual `runtime-mirror` still owns legitimate Runtime execution facts:

```text
Fresh host observation
runtime epoch/currentness
location identity
latest schedule sequence
output slot readiness
strict stale/superseded guards
mirror transport/write
bounded timing
```

Those remain Runtime Mirror responsibilities.

However the current source also still receives compatibility candidate metadata and directly interprets policy meaning.

Current processing still derives values equivalent to:

```text
normalMatch = CANONICAL / HOST_RAW / MISMATCH
exactFreshConfirmed
boundaryMatch
freshConfirmed
recoveryPolicy = FRESH_CONFIRMED_SUFFIX / BOUNDARY_CONFIRMED_SUFFIX
safeBoundaryConfirmed
fingerprintMatch = SAFE_BOUNDARY_CONFIRMED / recoveryPolicy / base match
representationConfirmed
```

When compatibility is accepted it may promote the observed Fresh identity into:

```text
snapshot.outputFingerprint
live Session current.outputFingerprint
live Session trustedOutputFingerprint
portable mirror state
```

and when mismatch is not accepted it preserves `OUTPUT_MISMATCH` and blocks unsafe mirror transport.

Classification:

```text
RUNTIME_MIRROR_HOST_OBSERVATION
= KEEP

RUNTIME_MIRROR_ASYNC_GUARDS
= KEEP / FROZEN

RUNTIME_MIRROR_TRANSPORT
= KEEP

RUNTIME_MIRROR_OUTPUT_COMPAT_POLICY_INTERPRETATION
= OWNERSHIP DEBT CONFIRMED AFTER M2-3
```

This directly validates the M2-4C extraction target.

---

## 9. Runtime Mirror safety order — frozen source reality

Actual runtime still uses a monotonic sequence plus location/epoch guards:

```text
sequence
latestByLocation
runtime epoch
shouldApply = runtimeIsCurrent(epoch)
              && latestByLocation.get(locationKey) === currentSequence
```

The deferred transaction rejects stale/superseded work before applying unsafe state and classifies final stale/superseded outcomes after execution.

M2-4C must preserve:

```text
at most one Fresh host read per mirror operation
no second verification read by Output Compat or Representation
no accepted candidate may bypass epoch/location/sequence/outIndex checks
no accepted policy result may survive supersession into a later output slot
no extra mirror write
no new asynchronous acceptance window
```

Compatibility interpretation may move down to Output Compat, but safe application remains Runtime-owned.

---

## 10. Representation remains coupled to Output Compat labels — secondary debt confirmed

Production `representation` still defines exact-prior recognition through policy-shaped values including:

```text
CANONICAL
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

This is validated behavior, not a current correctness defect.

Post-M2-3 classification remains:

```text
REPRESENTATION_OUTPUT_COMPAT_LABEL_COUPLING
= SECONDARY OWNERSHIP DEBT
```

M2-4 target:

```text
Representation receives bounded identity facts:
original canonical fingerprint
host-raw fingerprint
fresh fingerprint
accepted canonical fingerprint
acceptedCanonicalEquivalent boolean
transport/provenance facts
```

and should classify exact carryover from identity equivalence rather than knowing every Output Compat policy label.

Operator-facing policy labels may remain unchanged for diagnostic compatibility, but their semantic producer must be Output Compat.

---

## 11. Rebase verdict for the provisional M2-4 documents

### M2-4B — Session State Holder Contract

```text
REBASE RESULT = CONFIRMED
```

The legitimate identity anchors and the identified housekeeping/receipt debts still exist after M2-3.

### M2-4C — Runtime Mirror Observation Receipt Contract

```text
REBASE RESULT = CONFIRMED
```

Runtime Mirror still interprets Output Compat candidate meaning and promotes accepted Fresh identity while also owning legitimate Runtime guards/transport.

### M2-4D — Output Finalization Ownership Decision

```text
REBASE RESULT = STRONGLY CONFIRMED
```

`finalizePreparedOutput` remains one reusable deterministic transaction with ordinary-output and Edit Reconcile call sites.

### M2-4E — Recovery Facade Call-Site Audit

```text
REBASE RESULT = CONFIRMED WITH ONE BOUNDARY REFINEMENT
```

Direct-owner caller migration remains justified. Physical facade retirement is deferred to M2-5+ by the current staged Contracts v2 order; M2-4 should not delete transition code merely because callers can be migrated.

---

## 12. Recommended M2-4 / v0.66.0 implementation slices

The actual source supports one M2-4 checkpoint with separately attributable mechanical slices:

```text
Slice A — Output Finalize Extraction
  finalizePreparedOutput
  → physical output-finalize Application service
  → same transaction order/results

Slice B — Session State-Holder Narrowing
  deferred prune cadence/dedupe/running mechanics
  → Store housekeeping boundary
  → Session retains sequencing/identity anchors

Slice C — Recovery Direct-Owner Migration
  output compatibility calls → output-compat
  bootstrap/legacy calls     → bootstrap-migration
  edit-reconcile replay      → output-finalize + physical owners
  recovery facade retained as zero-policy compatibility shim

Slice D — Runtime Mirror Observation / Interpretation Boundary
  runtime-mirror observes Fresh + exact opaque fingerprint matches + guards/transport
  output-compat interprets candidate meaning/acceptance
  representation records identity-equivalence/provenance facts
  Session trusted identity update only after current outIndex/session + runtime guards still match
```

All four slices are ownership moves. None authorizes new generation semantics.

---

## 13. Explicit non-goals from this rebase

Do not mix into M2-4:

```text
PARTIAL_PREVIOUS_TURN_REPLAY repair
GENERATION_SEMANTIC_EXCURSION repair
provider-cache claims or tuning
host/history stabilization
Store latency optimization
new retention policy
Reaction/COMMUNITY semantics
new envelope candidate families
new whitespace/newline tolerance
persistent schema change
raw Fresh retention
new host read/write
new network call
new polling/interval
release-system redesign
M2-3 decision changes
```

Any anomaly discovered during implementation/live review must be preserved and classified separately before changing scope.

---

## 14. Activation prerequisite

M2-4 implementation remains blocked until the active v0.65.0 combined live gate is dispositioned.

Required before opening the v0.66.0 implementation branch:

```text
v0.65.0 Subgate A
→ compatible same-tab Host-local adoption proven
→ first bounded PREFIX_FLOOR reobserve behavior truthful
→ second same-generation request resumes normal observer behavior

v0.65.0 Subgate B
→ M2-3 exact carryover preserved
→ genuine hand edit preserved
→ representation-fast control preserved when available / otherwise existing frozen evidence remains explicitly bounded
→ no active blocker attributed to M2-3
```

If v0.65.0 produces a blocker that changes Session/Edit/Runtime Mirror source or contract, rebase this document again before implementation.

---

## 15. M2-4A closure

```text
POST_M2_3_SOURCE_READ          COMPLETE
SESSION_FIELD_INVENTORY       COMPLETE
STORE_HOUSEKEEPING_DEBT       CONFIRMED
OUTPUT_FINALIZE_BOUNDARY      CONFIRMED
RECOVERY_CALLER_AUDIT         CONFIRMED
RUNTIME_MIRROR_POLICY_DEBT    CONFIRMED
REPRESENTATION_LABEL_COUPLING CONFIRMED
M2_4_IMPLEMENTATION           NOT AUTHORIZED YET
NEXT DESIGN TARGET            v0.66.0 / M2-4
```

This document is the source-reality bridge between the provisional pre-M2-3 M2-4 design set and the v0.66.0 activation design.
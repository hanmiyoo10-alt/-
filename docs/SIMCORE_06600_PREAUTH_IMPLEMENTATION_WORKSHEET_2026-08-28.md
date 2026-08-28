# SimCore v0.66.0 Pre-Authorization Implementation Worksheet

Date: 2026-08-28

Status: **PREAUTH WORKSHEET · DESIGN/EVIDENCE ONLY · IMPLEMENTATION NOT AUTHORIZED · NON_RUNTIME**

Parent activation:

`docs/SIMCORE_06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_ACTIVATION.md`

Entry-gate record:

`docs/SIMCORE_06600_IMPLEMENTATION_ENTRY_GATE_2026-08-28.md`

Post-v0.65.0 source inventory:

`docs/SIMCORE_M2_4A_POST_06500_RESPONSIBILITY_INVENTORY_2026-08-28.md`

## 1. Purpose

Prepare the bounded ownership surfaces and proof obligations for v0.66.0 without opening an implementation branch or changing runtime before the v0.65.0 live gate closes.

This worksheet is intentionally executable-looking but non-executing. It exists so that once `06600_IMPLEMENTATION_AUTHORIZED = YES`, work can begin without re-discovering scope.

## 2. Frozen release identity

```text
version       0.66.0
checkpoint    M2-4
release name  Session / Runtime Mirror Boundary Completion
change class  RUNTIME_ARCHITECTURE / MECHANICAL_OWNERSHIP
new semantics NONE
```

## 3. Slice A — output-finalize extraction

Current physical source reality:

```text
Session physical module owns finalizePreparedOutput(baseState, prepared, outIndex, opts)
```

Confirmed caller families:

```text
ordinary Session.processOutput
Edit Reconcile compatibility replay
Edit Reconcile repaired-envelope replay
Edit Reconcile manual rebuild replay
```

Frozen target:

```text
new physical Application module: output-finalize
Session -> output-finalize
edit-reconcile -> output-finalize
```

Must preserve exactly:

```text
finalization operation ordering
normalizeReactions option behavior including false replay paths
pending completion/clear behavior
Frame/time/Structure/Reaction/B_END state transitions
bounded finalization receipts
no persistence/host/mirror/Edit policy ownership added
```

Required slice proof:

```text
A1 static call-site inventory before/after
A2 ordinary output differential fixture
A3 edit compatibility replay differential fixture
A4 repaired-envelope replay differential fixture
A5 manual edit rebuild differential fixture
A6 B_START/B_CONTINUE/B_END differential coverage
A7 output-finalize has no Store/host/network/timer authority
```

## 4. Slice B — Store retention-housekeeping ownership

Current Session-owned debt:

```text
deferredPruneIndex
deferredPruneRunning
scheduleDeferredPrune(outIndex)
```

Frozen behavior:

```text
minimum outIndex 17
outIndex % 17 == 0
same-index dedupe
single-running guard
750 ms deferred execution
same Store.prune mechanics
failure isolation
no output-critical await
```

Target ownership:

```text
Session keeps sequencing trigger point
Store owns cadence/dedupe/running/prune mechanics
```

Required slice proof:

```text
B1 exact trigger-index matrix
B2 duplicate same-index call count unchanged
B3 concurrent-running call count unchanged
B4 timer count unchanged
B5 delay remains 750 ms
B6 prune failure remains isolated
B7 no retention/key/keepN/batching policy changes
```

## 5. Slice C — Recovery direct-owner migration

Current physical-owner calls still routed through Recovery:

```text
Output Compat
- prepareOutput
- buildSafeEnvelopeBoundaryConfirmation

Bootstrap Migration
- bootstrapFromHistory
- repairLegacyClockState
- repairLatestGlobalFloorContamination
```

Edit Reconcile currently receives transitional Recovery/finalization operations by injection.

Frozen target dependency shape:

```text
Session
- output-compat
- bootstrap-migration
- output-finalize
- Store

edit-reconcile
- representation
- output-compat
- bootstrap-migration
- output-finalize
```

Recovery disposition:

```text
runtime require('./recovery') callers = 0
runtime recovery.* calls = 0
recovery physical module retained as deprecated compatibility shim
new Recovery policy forbidden
physical deletion deferred to M2-5+
```

Required slice proof:

```text
C1 pre/post Recovery caller census
C2 direct-owner dependency cycle check
C3 Output Compat differential fixtures
C4 bootstrap/legacy repair differential fixtures
C5 Edit Reconcile M2-3 regression pack
C6 recovery shim zero-policy static assertion
```

## 6. Slice D — Runtime Mirror observation / Output Compat interpretation / Representation relation

Runtime Mirror keeps:

```text
one Fresh host observation
exact fingerprint matching
runtime epoch/currentness
location/outIndex/schedule sequence
stale/superseded guards
safe mirror transport/write
bounded observation timing/status
```

Runtime Mirror must stop interpreting Output Compat candidate meaning.

Frozen conceptual bridge:

```text
Output Compat creates bounded CandidateObservationPlan
-> Runtime Mirror performs Fresh observation + opaque exact candidate matching
-> Runtime Mirror emits bounded observation receipt
-> Output Compat interprets candidate meaning/acceptance
-> Runtime applies accepted identity only while all live guards still match
-> Representation records identity relation/provenance facts
```

Candidate plan constraints:

```text
opaque candidateId
fingerprints only
no candidate body retained by Runtime Mirror
no Fresh body retained
no new candidate families
same candidate-count bounds
```

Acceptance safety:

```text
accepted only where v0.65.0 accepted
ambiguous multiple match fails closed
interpreter failure fails closed
persistent mutation remains NONE on compatibility-confirmation paths
no accepted result survives stale/superseded/session/outIndex mismatch
```

Required slice proof matrix:

```text
D1 canonical exact
D2 host-raw exact
D3 one exact compatibility candidate
D4 no candidate match
D5 multiple candidate match -> fail closed
D6 stale epoch -> no unsafe mutation
D7 superseded sequence -> no unsafe mutation
D8 location/outIndex/session change before apply -> no unsafe mutation
D9 interpreter malformed/throws -> no candidate promotion
D10 Representation receipt callback failure -> no unsafe authorization
D11 at most one Fresh host read per mirror operation
D12 host write count not increased
D13 no raw Fresh/candidate body retention
D14 no new timer/polling/network surface
```

## 7. Whole-candidate frozen regressions

After all four slices pass separately, the combined candidate must still prove:

```text
latest.js == install.js
metadata/runtime/host version identity equality
M2-3 SAME_FAST exact carryover
REPRESENTATION_FAST_RECONCILED path unchanged
USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT path unchanged
Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/COMMUNITY semantics unchanged
telemetry COMPACT_V2/Host-local contract unchanged
persistent Core schema unchanged
provider cache remains UNVERIFIED
no new host/network/polling surface
```

## 8. Implementation order once authorized

```text
1. record 06600 implementation authorization on main
2. freeze implementation evidence baseline against exact production parent
3. create one dedicated runtime work branch
4. Slice A implementation + proof
5. Slice B implementation + proof
6. Slice C implementation + proof
7. Slice D implementation + full mirror differential proof
8. combined candidate regression
9. builder/candidate transaction under then-current release system authority
10. Candidate Required / permanent release verification
11. release-simcore publication
12. real long-chat Stage A-E validation
13. main docs/long-term state synchronization
```

No release-system redesign may be merged into the runtime work item.

## 9. Stop/re-design triggers

Immediately stop and preserve evidence as WATCH / DEFER / FIX / BLOCKER if implementation requires any of:

```text
new finalization semantics
retention policy change
new Recovery policy
second Fresh host read
new compatibility candidate family
gate weakening
persistent schema change
new host/network/timer authority
M2-3 classification change
source-changing v0.65.0 live blocker
```

## 10. Authorization latch

Current durable latch:

```text
06500_SUBGATE_A = PENDING
06500_SUBGATE_B = PENDING
06600_DESIGN_FROZEN = YES
06600_IMPLEMENTATION_AUTHORIZED = NO
06600_RUNTIME_BRANCH = NOT_OPENED
06600_RUNTIME_MUTATION = NONE
06600_RELEASE_SIMCORE_MUTATION = NONE
```

This worksheet becomes active implementation guidance only after the predecessor live-gate closure is durably recorded.
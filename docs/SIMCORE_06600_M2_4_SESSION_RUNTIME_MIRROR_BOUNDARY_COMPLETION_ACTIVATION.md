# SimCore v0.66.0 — M2-4 Session / Runtime Mirror Boundary Completion Activation

Date: 2026-08-28

Status: **DESIGN FROZEN · POST-v0.65.0 SOURCE REBASED · IMPLEMENTATION BLOCKED UNTIL v0.65.0 LIVE GATE CLOSES · NO RUNTIME CHANGE**

Planned version: `0.66.0`

Planned release name:

```text
M2-4 Session / Runtime Mirror Boundary Completion
```

Production parent at design time:

```text
v0.65.0 — M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence
release-simcore commit c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

Primary source-rebase authority:

`docs/SIMCORE_M2_4A_POST_06500_RESPONSIBILITY_INVENTORY_2026-08-28.md`

Parent contracts:

- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`
- `docs/SIMCORE_M2_4E_RECOVERY_FACADE_CALL_SITE_AUDIT.md`

---

## 1. Activation decision

The next planned structural SimCore checkpoint after v0.65.0 is:

```text
v0.66.0
M2-4
Session / Runtime Mirror Boundary Completion
```

This is an ownership/mechanical architecture release, not a feature release.

The release narrows the remaining high-value orchestration debt that survived M2-3:

```text
Session still hosts deterministic output finalization
Session still owns Store retention housekeeping execution state
Session/Edit Reconcile still route physical-owner calls through Recovery facade
Runtime Mirror still interprets Output Compat compatibility policy
Representation still recognizes exact carryover partly through Output Compat policy labels
```

The post-v0.65.0 source rebase confirms all of those are real current-source boundaries rather than speculative pre-M2-3 ideas.

---

## 2. Implementation authorization gate

Design may freeze now. Runtime implementation may not begin merely because the source map is ready.

Required activation sequence:

```text
v0.65.0 real long-chat Subgate A closes
+
v0.65.0 real long-chat Subgate B closes
+
no active blocker requires changing the v0.65.0 Session/Edit/Runtime Mirror contract
→ v0.66.0 implementation authorized
```

At design time:

```text
v0.65.0 pre-refresh natural bounded Host-local write = proven
post-refresh compatible adoption                         = pending
M2-3 full live acceptance                               = pending
```

Therefore:

```text
06600_IMPLEMENTATION_AUTHORIZED = NO
06600_DESIGN_FROZEN             = YES
```

If current live evidence discovers a source-changing FIX/BLOCKER, rebase M2-4A and this activation before coding.

---

## 3. Architectural goal

M2-4 target shape:

```text
Session
= per-chat application identity/current-state holder
+ bounded sequencing around persistence

output-finalize
= deterministic output-state transition service

Store
= persistence mechanics + retention housekeeping mechanics

edit-reconcile
= previous-assistant reconciliation policy/orchestration

output-compat
= envelope/candidate compatibility policy + candidate meaning

bootstrap-migration
= history bootstrap + legacy migration/repair

Runtime Mirror
= Fresh host observer
+ exact opaque fingerprint matcher
+ async safety guard
+ mirror transport
+ bounded observation receipt

Representation
= canonical / host-raw / Fresh identity relation
+ accepted canonical-equivalence provenance
```

The convenience/coordination surfaces project these authorities. They do not create new semantic authorities.

---

## 4. Slice A — physical `output-finalize` extraction

### 4.1 Triggering source reality

v0.65.0 still has:

```js
function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) { ... }
```

inside the Session physical module.

The same deterministic transaction is used by:

```text
ordinary Session.processOutput
Edit Reconcile compatibility replay
Edit Reconcile repaired-envelope replay
Edit Reconcile manual rebuild replay
```

Therefore the transaction has a real independently reusable Application boundary.

### 4.2 Target

Create one physical module:

```text
output-finalize
```

Target semantic operation:

```text
finalize(baseState, preparedOutput, outIndex, options)
→ finalized state + finalized content + bounded finalization receipts
```

Exact exported function spelling may follow repository conventions during implementation, but the physical owner and responsibility are frozen.

### 4.3 Owns

Only the existing deterministic composition order, including the current equivalents of:

```text
clone/reconcile base state
inactive/no-pending handling
Frame continuity application
Timestamp canonicalization
Structure state-commit safety judgement
Reaction normalization / maxima-only replay mode
quarantine bookkeeping
Narrative/current-time floor application where currently sequenced
world-year synchronization
Narrative/Broadcast clock commit
B_END closure/unlock state transition
lastMode update
pending completion/clear
bounded receipts
```

Domain modules keep the meaning of each step.

### 4.4 Does not own

```text
Store I/O
Session identity
host I/O
Runtime Mirror
Output Compat envelope/candidate policy
Edit Reconcile policy
diagnostic rendering
provider cache
```

### 4.5 Frozen call behavior

Edit Reconcile replay must preserve current options, including the existing `normalizeReactions: false` paths.

No finalization ordering cleanup is allowed during the mechanical move unless a separately recorded defect is promoted first.

---

## 5. Slice B — Session state-holder narrowing / Store housekeeping ownership

### 5.1 Keep Session identity anchors

Keep Session-owned:

```text
store reference
current semantic state
currentOutputIndex
trustedOutputFingerprint
trustedHostOutputFingerprint
lastPreparedSendIndex
bounded init/bootstrap lifecycle identity
```

Session remains a real stateful Application orchestrator. M2-4 must not reduce it to an arbitrary pass-through shell.

### 5.2 Move retention housekeeping mechanics

Current Session-owned:

```text
deferredPruneIndex
deferredPruneRunning
scheduleDeferredPrune(...)
```

Target:

```text
Store / Store-owned housekeeping boundary
```

Session may trigger the same housekeeping point after output sequencing, but Store owns dedupe/running/prune mechanics.

### 5.3 Byte/behavior frozen policy

The initial ownership move must preserve:

```text
minimum output index 17
outIndex % 17 == 0 cadence
same-index dedupe
single-running guard
750 ms deferred execution
same Store.prune mechanics
same failure isolation
no output-critical await
```

Do not combine latency tuning, batching redesign, keepN changes, key changes, or new retention policy.

### 5.4 Migration/diagnostic receipts

Fields such as:

```text
loadedFromLegacySnapshot
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

may move only if their physical producing owners expose a bounded receipt without increasing coupling.

They are **not mandatory move targets** for v0.66.0. If a clean mechanical destination is not proven, leave them in Session and preserve the debt for M2-5+.

---

## 6. Slice C — Recovery direct-owner migration, facade retained

### 6.1 Current debt

v0.65.0 still routes physical-owner calls through the transition facade.

Output Compat family:

```text
prepareOutput
buildSafeEnvelopeBoundaryConfirmation
```

Bootstrap Migration family:

```text
bootstrapFromHistory
repairLegacyClockState
repairLatestGlobalFloorContamination
```

M2-3 Edit Reconcile also receives transitional Recovery + finalization operations by injection.

### 6.2 Target direct dependency shape

```text
Session
├─ output-compat
├─ bootstrap-migration
├─ output-finalize
└─ Store

edit-reconcile
├─ representation
├─ output-compat
├─ bootstrap-migration
└─ output-finalize
```

Use direct import or explicit injected operation according to Contracts v2 dependency direction and cycle avoidance. Do not preserve Recovery indirection merely to avoid updating a now-clear physical-owner dependency.

### 6.3 Recovery physical facade disposition

v0.66.0 target:

```text
runtime `require('./recovery')` callers = 0
runtime `recovery.` call sites         = 0
recovery module                         = retained compatibility/deprecated shim
new Recovery policy                     = forbidden
```

Do **not** physically delete Recovery in this release merely because callers are gone.

Current Contracts v2 stages transition-code removal under M2-5+ after equivalence evidence. Physical facade deletion therefore remains a later debt-retirement step unless a separate architecture decision explicitly advances it.

---

## 7. Slice D — Runtime Mirror observation / compatibility interpretation split

This is the highest-risk M2-4 slice and requires the strongest differential proof.

### 7.1 Runtime Mirror keeps Runtime facts

Runtime Mirror continues to own:

```text
one Fresh host observation
Fresh fingerprint computation
exact comparison against supplied fingerprints
runtime epoch/currentness
location identity
schedule sequence
expected output slot/index
stale/superseded guard
safe mirror write
bounded timing/status
```

### 7.2 Runtime Mirror stops owning candidate meaning

It must no longer independently invent/derive compatibility-policy meanings such as:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

Those meanings belong to Output Compat.

### 7.3 Bounded candidate observation plan

Output Compat may prepare a bounded ephemeral plan before Deferred Mirror observation.

Required conceptual shape:

```text
CandidateObservationPlan
- schema/version
- bounded plan identity
- bounded candidate list
  - opaque candidateId
  - exact fingerprint
```

Rules:

```text
candidateId opaque to Runtime Mirror
fingerprints only
no candidate bodies retained by Runtime Mirror
no Fresh body retention
no new candidate families
same current candidate count bounds
```

### 7.4 Runtime Mirror bounded observation receipt

Runtime Mirror returns observation facts only, conceptually including:

```text
outIndex
locationKey
runtimeEpoch
scheduleSequence
freshFingerprint
baseMatch = CANONICAL_EXACT / HOST_RAW_EXACT / NONE / UNKNOWN
matchedCandidateIds
candidateMatchCount
guard/transport status
bounded timing
```

It must preserve zero/one/multiple exact candidate matches explicitly and never resolve ambiguous candidate meaning itself.

### 7.5 Output Compat interpretation

Output Compat consumes:

```text
CandidateObservationPlan
+
Mirror observation facts
```

and returns a bounded decision preserving the existing acceptance contract and existing externally meaningful labels.

Conceptual decision facts:

```text
accepted
acceptedCandidateId
acceptedCanonicalFingerprint
compatibilityStatus
compatibilityPolicy
compatibilitySource
boundaryKind
boundaryDeltaChars
persistentMutation
```

Frozen rule:

```text
accepted only where v0.65.0 would accept
no new normalization
multiple ambiguous matches fail closed
interpreter failure fails closed to no candidate promotion
persistent mutation remains NONE on current compatibility confirmation paths
```

### 7.6 Safe application remains Runtime-controlled

Even an accepted Output Compat decision cannot bypass Runtime guards.

Target transaction:

```text
capture scheduled identity
→ pre-read guard
→ Fresh host read once
→ exact base/opaque-candidate match
→ bounded observation facts
→ Output Compat interpretation
→ if accepted, apply trusted identity only if expected live Session/outIndex still matches
→ rerun strict async guard
→ mirror write only if still safe
→ publish Representation receipt
```

No new asynchronous window or cached policy result may survive supersession.

---

## 8. Representation label decoupling inside Slice D

Current Representation recognizes exact prior carryover partly through Output Compat policy labels.

Target input should instead include identity-equivalence facts such as:

```text
originalCanonicalFingerprint
hostRawFingerprint
freshFingerprint
acceptedCanonicalFingerprint
acceptedCanonicalEquivalent
outIndex
location
transport status
```

Representation then owns the relation/provenance classification from those facts.

Operator-facing diagnostics may continue to display the existing compatibility policy labels, but:

```text
Output Compat = policy label authority
Representation = identity relation authority
Runtime Mirror = host/transport fact authority
OPS/runtime-probe = rendering authority only
```

This must not change the visible meaning of:

```text
Output provenance
Output representation
Envelope recovery
Envelope boundary
Safe-envelope reconcile
Safe-envelope boundary
Representation ownership
```

---

## 9. Slice implementation order inside one v0.66.0 work item

One release may carry all M2-4 slices, but implementation and proof must remain separately attributable.

Preferred work-branch order:

```text
A. extract output-finalize
→ differential/static proof

B. move Store retention housekeeping mechanics
→ timing/call-count/static proof

C. migrate Recovery callers to physical owners
→ zero-caller proof while retaining shim

D. split Runtime Mirror observation from Output Compat interpretation
→ full mirror differential matrix

then
combined whole-candidate regression
```

A failure in one slice must not be hidden by the combined candidate passing unrelated tests.

If actual implementation evidence shows a slice cannot be safely completed without new semantics, stop and re-design that slice. Do not silently drop behavior or widen authority simply to keep the single-version plan.

A later decision may split M2-4 across v0.66.x mechanical releases only if implementation evidence demands it; the default design target remains one v0.66.0 M2-4 checkpoint.

---

## 10. Permanent differential/static matrix

### 10.1 General release identity / artifact

```text
//@version == SIMCORE_RUNTIME_VERSION == HOST_COMPAT_VERSION == 0.66.0
latest.js == install.js
node syntax valid
Contracts v2 / architecture check PASS
no undeclared dependency edge
no persistent schema delta
```

### 10.2 Output-finalize equivalence

At minimum:

```text
inactive/no-pending output
ordinary Mode A
ordinary Mode C
B_START
B_CONTINUE
B_END
B_END unlock
Frame continuity repair
Timestamp canonicalization
Narrative clock SAME / ADVANCED / seeded
Broadcast airtime commit
Structure-safe COMMUNITY
Structure-unsafe quarantine
Reaction normalization enabled
Reaction maxima-only replay / normalizeReactions=false
lastMode update
pending clear
caller base-state non-mutation
bounded receipt equivalence
```

Edit Reconcile replay must produce the same output/state fingerprints for the same fixtures before/after extraction.

### 10.3 Store housekeeping equivalence

```text
outIndex < 17                       → no prune schedule
outIndex >=17 and %17 != 0          → no prune schedule
eligible index                      → one deferred prune
same eligible index repeated        → no duplicate
prune already running               → no overlapping duplicate
750 ms scheduling contract          → unchanged
prune rejection/throw               → committed output/state unaffected
no extra storage key/read/write
```

### 10.4 Recovery direct-owner migration

```text
ordinary prepareOutput equivalent
Thoughts compatibility equivalent
boundary-normalized compatibility equivalent
safe-envelope boundary candidate equivalent
history bootstrap equivalent
legacy clock repair equivalent
legacy contamination repair equivalent
Edit Reconcile compatibility/manual rebuild equivalent
runtime Recovery callers = 0
Recovery shim aliases remain exact pass-throughs
```

### 10.5 Runtime Mirror differential matrix

Required cases:

```text
Fresh == canonical
→ same commit/write result

Fresh == host-raw
→ same commit/write result

Fresh == exact raw suffix candidate
→ same FRESH_CONFIRMED_SUFFIX meaning
→ same trusted canonical identity promotion

Fresh == unique CR/LF boundary candidate
→ same BOUNDARY_CONFIRMED_SUFFIX meaning/telemetry

Fresh == unique safe-envelope structural candidate
→ same SAFE_BOUNDARY_CONFIRMED meaning/telemetry

Fresh matches no base/candidate
→ OUTPUT_MISMATCH
→ no unsafe mirror write

Fresh matches multiple candidates where unique match is required
→ no broadened acceptance

stale epoch
→ stale drop / no unsafe mutation

newer sequence supersedes task
→ superseded / no unsafe mutation

location/outIndex/session identity changes before apply/write
→ guard drop / no unsafe mutation

Output Compat interpreter malformed/throws
→ no candidate promotion

Representation receipt callback failure
→ cannot authorize unsafe mutation
```

Permanent assertions must also prove:

```text
one mirror operation -> at most one Fresh host read
host write count not increased
no raw Fresh/candidate body retained
no new timer/polling
```

---

## 11. Frozen M2 regression controls

v0.66.0 must preserve M2-3 behavior:

```text
ordinary exact carryover
→ SAME_FAST
→ snapshot UNCHANGED
→ Edit origin NONE

prior OUTPUT_MISMATCH + current exact prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

prior EXACT + genuine user-visible change matching neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

No M2-4 ownership move may relax identity/location/staleness/fingerprint gates to make those tests easier.

---

## 12. Frozen product/domain behavior

M2-4 does not authorize changes to:

```text
Broadcast lifecycle semantics
Frame semantics
Time/current timeline semantics
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Community parsing/platform taxonomy
Reaction grammar/normalization semantics
Structure judge-only semantics
Prompt placement / TAIL_AFTER_CURRENT_USER
cache/history observation policy
provider cache = UNVERIFIED
telemetry capsule schema/budgets/Host-local semantics
persistent Core schema
output envelope compatibility rules
M2-3 edit classification rules
```

Any defect found during M2-4 is classified separately as PASS / WATCH / FIX / BLOCKER and does not enter runtime scope without an explicit activation decision.

---

## 13. Explicit anomaly exclusions

The following preserved observations do not automatically become v0.66.0 code scope:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
GENERATION_SEMANTIC_EXCURSION
PRE_SIMCORE_HOST_HISTORY_FRONTIER
STORE_LATENCY_DOMINANCE
RELOAD_BOUNDARY_PROVENANCE_UNAVAILABLE_REBUILD
provider-cache behavior
```

In particular, `PARTIAL_PREVIOUS_TURN_REPLAY` already exists before M2-4. If it appears after v0.66.0, attribution must compare against the pre-M2-4 baseline rather than treating temporal order as causality.

---

## 14. v0.66.0 live acceptance plan

Static equivalence is primary for rare mirror compatibility branches. Real long-chat acceptance still must prove the changed architecture behaves safely in production.

### Stage A — ordinary Session/finalization continuity

Use natural requests to prove:

```text
Version 0.66.0
binding BOUND
output COMMITTED
mirror safe
ordinary RAW input/output semantically correct
Frame/chronology appropriate
COMPACT_V2 remains bounded
HOST_LOCAL checkpoint remains healthy
```

At least one clean ordinary forward request must show:

```text
SAME_FAST
Prior representation EXACT
Edit origin NONE
```

### Stage B — M2-3 positive control

Perform one genuine visible edit when operationally safe:

```text
Prior EXACT
current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Do not infer this path from timing alone.

### Stage C — Deferred Mirror / compatibility observation

For ordinary natural outputs require:

```text
Fresh observation remains bounded
mirror COMMITTED when exact/safe
no stale/superseded unsafe apply
Representation ownership remains representation
```

If a natural THOUGHTS/output-compat confirmation path appears, preserve it as high-value evidence that the external compatibility labels and trusted-identity result remain equivalent.

Do not manufacture malformed model output solely to force a rare candidate family; permanent differential fixtures remain the authority for branches not naturally encountered.

### Stage D — reload continuity regression

Because M2-4 touches Session/identity wiring, retain the proven v0.65.0 durable telemetry/reload contract as a regression gate:

```text
pre-refresh COMPACT_V2 <= 16384 + HOST_LOCAL WRITTEN
same-tab refresh
compatible Host-local adoption
bounded first reobserve precision truthful
second same-generation request proceeds normally
fresh bounded checkpoint written again
```

This does not make telemetry transport a new M2-4 owner. It is a cross-runtime regression control.

### Stage E — broadcast/COMMUNITY coverage when naturally available

Prefer one natural B lifecycle specimen during the live window, especially B_END if available, to cover the extracted finalization transaction:

```text
terminal authority unchanged
Structure behavior unchanged
Reaction behavior unchanged
B_END unlock unchanged
Frame/clock progression unchanged
```

If no natural B sequence occurs during the bounded validation window, permanent static B_START/B_CONTINUE/B_END differential fixtures remain mandatory and the unexercised natural coverage is recorded explicitly rather than faked.

---

## 15. Mandatory diagnostic review discipline for v0.66.0

Every supplied live diagnostic packet must be reviewed under `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md` before a release-level verdict.

Required order:

```text
packet 1 full field sweep
packet 2 full field sweep
...
then cross-packet comparison
then slice-level verdicts
then v0.66.0 release verdict
```

For every packet inspect all applicable:

```text
identity/binding
request timing/path
edit/representation/mirror
output timing/path
warnings/compat/preamble
prompt/cache/history
telemetry/reload
mode/lifecycle/recurrence
frame/evidence/chronology
RAW user intent vs visible assistant output
```

One subsystem PASS never makes the packet globally healthy.

A v0.66.0 release PASS is forbidden while a supplied packet contains an undispositioned material contradiction or while a packet review is incomplete.

---

## 16. Stop conditions

Stop candidate advancement and preserve evidence if any of these appear:

```text
output-finalize differential mismatch
new Store/prune call count or retention behavior
Recovery direct-owner migration changes compatibility/migration behavior
second Fresh host read appears
Runtime Mirror guard order weakens
ambiguous candidate becomes accepted
trusted identity applies after stale/superseded/session mismatch
Representation loses genuine-edit discrimination
M2-3 positive control regresses
persistent schema changes unexpectedly
new host/network/timer surface appears
RAW semantic regression plausibly tied to changed ownership path
```

A separate pre-existing anomaly without new M2-4 attribution remains a separate WATCH/investigation item; it does not get silently folded into this release.

---

## 17. Release-system requirements

Normal SimCore release discipline remains authoritative:

```text
main = design/evidence/roadmap authority
release-simcore = actual production authority
latest.js == install.js
exact approved candidate == exact published artifact
real long-chat evidence after publication
```

Do not combine release-system redesign with this runtime architecture checkpoint.

The builder must fail if release identity surfaces diverge, preserving the permanent v0.65.0 identity-convergence regression guard.

---

## 18. Relationship to M2-5+

v0.66.0 completes/narrows ownership boundaries but does not attempt to erase every transition artifact.

After M2-4 live closure, M2-5+ may consider:

```text
physical Recovery facade retirement after zero-caller proof
remaining Session migration/diagnostic receipt relocation
stale Contracts v2 transition-exception removal
other transition code deletion backed by equivalence evidence
```

M2-5 must not be pre-implemented inside v0.66.0 merely because a shim looks unused.

---

## 19. Activation verdict

```text
NEXT_PLANNED_VERSION
= 0.66.0

CHECKPOINT
= M2-4

RELEASE
= Session / Runtime Mirror Boundary Completion

SLICE_A
= output-finalize physical extraction

SLICE_B
= Session state-holder narrowing + Store retention-housekeeping ownership

SLICE_C
= Recovery caller migration to physical owners; facade retained

SLICE_D
= Runtime Mirror observe / Output Compat interpret / Representation record boundary

BEHAVIORAL_SCOPE
= MECHANICAL / EQUIVALENCE-FIRST

NEW_FEATURE_SEMANTICS
= NONE

IMPLEMENTATION_NOW
= BLOCKED UNTIL v0.65.0 LIVE GATE CLOSES
```

This document is the frozen activation design for the next structural SimCore version unless v0.65.0 live evidence produces a source-changing blocker that requires rebase.
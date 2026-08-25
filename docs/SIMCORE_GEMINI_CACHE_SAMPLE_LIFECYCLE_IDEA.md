# SimCore Gemini Cache Sample Lifecycle — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · SAMPLE GOVERNANCE / IDEMPOTENCY · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define the bounded lifecycle of one cache-relevant request sample from local observation through receipt correlation, compatibility evaluation, evidence admission, downstream consumption, correction, and retirement.

The lifecycle exists to prevent:

```text
one request being learned twice by the Baseline Profile
late provider receipts silently mutating an already-finalized sample
an anomaly sample later slipping into the healthy baseline without explicit re-evaluation
heuristic/ambiguous receipt evidence becoming trusted after reload merely because it survived longer
corrections erasing the provenance of earlier decisions
superseded evidence continuing to influence Verdict / Sentinel / Regime decisions
```

This is sample-governance and idempotency policy only. It is not a cache controller or semantic state owner.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Sample Lifecycle may govern bounded cache telemetry. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt sections automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

No lifecycle transition may mutate the prompt or renderer behavior.

## 3. Architecture decision — do not use one giant state enum

A cache sample can have several independent facts at the same time.

Example:

```text
local Prefix Map available
provider receipt still pending
compatibility descriptor already known
Baseline Profile has not consumed the sample
Sentinel may already have a local diagnostic view
```

Therefore do not model everything as one sequence such as:

```text
PENDING -> CORRELATED -> ADMITTED -> BASELINE_USED -> ...
```

That would create a combinatorial state explosion.

Preferred model:

```text
CacheSampleRecord
= stable sample identity
+ evidence phase
+ admission disposition
+ per-consumer use receipts
+ revision / supersession state
```

These dimensions are orthogonal and auditable.

## 4. Stable sample identity

One main-model request should map to one logical cache sample identity.

Candidate bounded identity inputs:

```text
localEvidenceId
local request sequence
chatScopeDigest
requestIdentityDigest when authoritative
request-family metadata
```

Requirements:

```text
same logical request across late receipt arrival / reload continuity
→ same sample identity

new main-model request
→ new sample identity
```

Do not use raw prompt text as sample identity.

Do not use Cache Compatibility Key as request identity:

```text
same compatibility key
!=
same request
```

Compatibility describes a comparison population, not request uniqueness.

## 5. Evidence phase

Candidate evidence-phase vocabulary:

```text
LOCAL_OBSERVED
RECEIPT_PENDING
RECEIPT_ATTACHED
RECEIPT_AMBIGUOUS
RECEIPT_EXPIRED_UNVERIFIED
EVIDENCE_COMPLETE_FOR_CURRENT_POLICY
```

This phase describes evidence availability, not whether the sample is healthy or trusted.

Important:

```text
RECEIPT_PENDING
!= cache miss
!= healthy
!= regression
```

A late receipt may move a sample from `RECEIPT_PENDING` to `RECEIPT_ATTACHED` without creating a new logical sample.

## 6. Admission disposition

Admission remains owned by the shared Cache Evidence Admission Policy.

The lifecycle only records the resulting disposition for this sample/consumer context.

Candidate disposition vocabulary:

```text
NOT_EVALUATED
ADMIT_STRONG
ADMIT_BOUNDED
ADMIT_DIAGNOSTIC_ONLY
HOLD_PENDING
QUARANTINED
REJECT_AMBIGUOUS
REJECT_UNVERIFIED
REJECT_SUPERSEDED
```

`QUARANTINED` is useful for samples that should remain visible for forensic diagnostics but must not train/update a trusted baseline until a specific evidence problem is resolved.

Do not reinterpret admission locally inside the lifecycle component.

## 7. Per-consumer use receipts

A sample may be eligible for several consumers with different policies.

Do not represent this as one global `USED` flag.

Candidate bounded map:

```text
consumerUse:
  baseline: UNUSED | CONSUMED | REVOKED
  verdict: UNUSED | CONSUMED | RECOMPILED
  transition: UNUSED | CONSUMED | SUPERSEDED
  diagnostics: UNUSED | OBSERVED
  regimeCandidate: UNUSED | REFERENCED
```

Exact names are implementation-time details. The invariant matters:

```text
one consumer
+ one sample revision
→ at-most-once side-effectful consumption
```

Pure read-only diagnostics may observe repeatedly without changing lifecycle state.

## 8. Baseline idempotency is mandatory

The Baseline Profile must never count the same logical sample twice because:

```text
provider receipt arrived late
observer reloaded
correlation was recomputed
same Evidence Chain was replayed
sample was rehydrated from bounded telemetry
```

Required conceptual gate:

```text
baselineConsumptionKey
= sampleIdentity + admittedRevisionIdentity + compatibilityDescriptorVersion
```

If that exact consumption has already succeeded:

```text
replay
→ NO-OP
```

not:

```text
replay
→ add another baseline observation
```

The exact key encoding is implementation-time design and must remain bounded/deterministic.

## 9. Classify before learning

Preserve the Baseline Profile anti-poisoning order:

```text
1. assemble current evidence
2. compare current sample against the prior compatible baseline
3. compile current verdict
4. decide admission / healthy-sample eligibility
5. only then update baseline if allowed
```

Forbidden order:

```text
add sample to baseline
→ recompute normal
→ decide whether sample was anomalous
```

A current regression must not normalize itself into the baseline before it is judged.

## 10. Late provider receipt handling

Late receipt arrival is expected in an asynchronous gateway/log environment.

Conceptual flow:

```text
request X
→ LOCAL_OBSERVED
→ RECEIPT_PENDING

later:
provider receipt arrives
→ Correlator evaluates
→ same sample X receives new evidence revision
→ compatibility/admission/verdict may be re-evaluated
```

Rules:

```text
late receipt
→ may strengthen or weaken evidence
→ may not create a duplicate sample
→ may not silently duplicate baseline consumption
```

If the prior sample was only diagnostic/unverified, stronger exact evidence may make it newly baseline-eligible.

If it was already consumed under an earlier accepted revision, correction semantics below apply rather than blind second insertion.

## 11. Revision model — preserve provenance

Do not mutate a trusted historical sample in place with no trace.

Preferred conceptual model:

```text
sampleId: S42
revision 1
→ local-only / pending

revision 2
→ exact receipt attached
→ revision 1 SUPERSEDED for current conclusions
```

The logical sample identity remains stable while evidence revisions are append/supersede aware.

Each revision should be able to reference:

```text
previousRevisionId
reasonCode
new evidence refs
superseded evidence refs
```

Do not retain raw prompt/log bodies.

## 12. Corrections after baseline consumption

Hard case:

```text
sample revision R1
→ admitted
→ consumed into baseline

later correction R2 proves:
R1 should not have been baseline-eligible
```

Never solve this by pretending R1 never existed.

Preferred policy candidates:

```text
A. if Baseline Profile supports bounded sample removal/rebuild:
   revoke R1 consumption
   rebuild affected bounded window deterministically

B. if safe removal is not supported:
   mark current baseline STALE / REBUILD_REQUIRED
   reconstruct from the bounded admitted sample window
```

Do not attempt an ad-hoc arithmetic subtraction unless the statistical model proves that operation is semantically valid for every stored statistic.

The exact recovery method is implementation-time design, but silent contamination is forbidden.

## 13. Quarantine semantics

Quarantine means:

```text
keep bounded evidence for diagnosis
+
do not let it influence trusted learning / persistent transition claims
```

Candidate quarantine reasons:

```text
Q_CORRELATION_AMBIGUOUS
Q_COMPATIBILITY_UNKNOWN
Q_PROVIDER_SOURCE_UNVERIFIED
Q_EVIDENCE_CONTRADICTION
Q_CORRECTION_PENDING
Q_ANOMALY_NOT_BASELINE_ELIGIBLE
```

A quarantined sample may later be re-evaluated when new evidence arrives.

It must never age into `ADMIT_STRONG` merely because time passed.

## 14. Superseded / dismissed semantics

Use the existing evidence discipline:

```text
new stronger evidence
→ old revision SUPERSEDED

later proof shows earlier defect interpretation was wrong
→ related finding may become DISMISSED_NO_DEFECT
```

Do not delete the earlier chain.

Consumers must ignore superseded/rejected revisions for new decisions while diagnostics may still show why the earlier conclusion existed.

## 15. Verdict recompilation

Verdict Compiler is pure and request-local.

If a sample gets a materially stronger evidence revision:

```text
old admitted evidence snapshot
→ old verdict V1

new admitted evidence snapshot
→ deterministic recompile
→ verdict V2
```

The lifecycle may record:

```text
V1 SUPERSEDED_BY V2
```

but it must not itself invent the new verdict.

Transition Model / Sentinel must receive correction-aware events so a superseded request verdict is not counted twice in temporal persistence.

## 16. Transition/Sentinel correction handling

A corrected sample must not create two temporal observations for one request.

Conceptual:

```text
request S42 V1 counted as regression candidate
later V1 superseded by V2 = UNVERIFIED
```

The Sentinel must be able to:

```text
revoke / rebuild the bounded incident window
or mark temporal state REEVALUATION_REQUIRED
```

according to the implemented reducer design.

Do not append V2 as if it were a second independent request.

The Conformance Matrix must cover this case before live activation.

## 17. Regime Ledger protection

One corrected sample must not rewrite historical regimes directly.

A regime boundary is already required to depend on repeated trusted evidence and established baseline changes.

If a correction invalidates evidence that materially supported a regime candidate:

```text
candidate may become REJECTED / SUPERSEDED
```

If it undermines an already confirmed regime, open a bounded correction review rather than silently deleting the ledger entry.

Repo evidence should preserve the correction if it affects an engineering conclusion.

## 18. Reload continuity

A small pending lifecycle capsule may survive reload only if it follows the existing continuity rules:

```text
same chat/location
compatible schema
bounded TTL
no raw prompt/body/log content
```

Reload must preserve logical identity/idempotency where possible.

It must not:

```text
turn HEURISTIC into EXACT
reset an already-consumed baseline marker and re-add the sample
erase quarantine/supersession state
infer provider cache reset
```

## 19. Retention / retirement

The lifecycle is operational cache telemetry, not permanent per-turn history.

Preferred retention classes:

```text
recent active/pending samples
recent admitted samples required by bounded Baseline window
samples referenced by active Sentinel incident
small correction/supersession evidence needed for provenance
```

Retire samples once no active bounded consumer needs them.

Do not create an unbounded long-chat sample archive.

Long-lived conclusions belong in:

```text
Cache Regime Ledger
repo evidence / design docs
```

not every request sample forever.

## 20. Suggested sample record shape

Conceptual only:

```text
sampleSchemaVersion
sampleId
revisionId
previousRevisionId
chatScopeDigest
compatibilityDescriptorDigest
requestFamily

evidencePhase
correlationClass
admissionDisposition

providerReceiptSummary
localPrefixSummary
cacheAbiSummary
baselineComparisonSummary
compiledVerdictRef

consumerUse{}
quarantineReasonCodes[]
supersededBy
createdAt
updatedAt
```

Timestamps are lifecycle telemetry only and must not enter prompt bytes or Cache ABI identities.

No raw user/assistant text, raw prompt, or full gateway rows.

## 21. Core invariants

```text
I1. one logical main-model request -> one logical cache sample
I2. late evidence creates a new revision, not a duplicate request sample
I3. sample replay cannot double-update Baseline Profile
I4. classify current sample before deciding healthy-baseline admission
I5. ambiguous/unverified evidence never becomes trusted by age alone
I6. superseded evidence cannot influence new verdicts/transitions
I7. corrections preserve provenance
I8. corrected request verdict does not count as a second temporal request
I9. Compatibility Key is not request identity
I10. lifecycle state is observability metadata, not semantic Core state
I11. reload cannot strengthen evidence class by itself
I12. no raw prompt/body/log retention
I13. no prompt byte mutation
I14. no renderer responsibility change
```

## 22. Conformance Matrix fixture families

Future implementation should add golden rows for at least:

```text
1. local request -> pending receipt -> exact receipt
   → same sampleId, new revision

2. replay exact same admitted sample
   → baseline update at most once

3. reload rehydrates already-consumed sample
   → no duplicate baseline sample

4. heuristic sample
   → diagnostic-only, no trusted baseline consumption

5. heuristic later replaced by EXACT_ID
   → re-evaluate same sample, no duplicate request

6. ambiguous sample quarantined
   → time passing alone does not admit it

7. anomaly classified before baseline learning
   → anomaly cannot normalize itself

8. consumed sample later corrected invalid
   → revoke/rebuild or baseline stale path, never silent contamination

9. old verdict superseded by corrected verdict
   → temporal reducer does not count two requests

10. superseded evidence excluded from Verdict Compiler input

11. incompatible request family
   → no baseline/transition cross-consumption

12. same Compatibility Key but different request identities
   → two samples, never one merged request

13. same request identity across late receipt/reload
   → one logical sample

14. bounded retention
   → retired samples disappear when no consumer requires them

15. no raw text/log payload retained

16. renderer boundary unchanged
```

## 23. Ownership / implementation posture

The lifecycle contract is useful, but it should not automatically become a new heavyweight runtime service.

Preferred implementation question:

```text
Which existing bounded cache-observability / telemetry owner can host sample records
without creating a second semantic store or provider observer?
```

Do not put this into semantic SnapshotStore merely because it has a lifecycle.

Do not duplicate Usage Dashboard gateway observation.

The exact runtime owner remains intentionally unfrozen until the cache receipt integration path is proven.

## 24. Relationship to surrounding cache stack

```text
Receipt Correlator
= attach provider evidence to the right request

Compatibility Key
= decide what comparison population the request belongs to

Evidence Admission Policy
= decide which claims/consumers may use the evidence

Cache Sample Lifecycle
= keep that request sample idempotent, revision-aware, quarantinable, and correction-safe

Baseline Profile
= learn current normal from admitted healthy samples

Verdict Compiler
= compile one request's admitted evidence

Transition Model / Sentinel
= interpret compatible request verdicts over short time

Regime Ledger
= preserve confirmed long-horizon normal-state changes
```

The Sample Lifecycle does not replace any of these authorities.

## 25. Current classification

```text
GEMINI_CACHE_SAMPLE_LIFECYCLE
= HIGH VALUE FOR ASYNC / LONG-CHAT EVIDENCE SAFETY
= SAMPLE GOVERNANCE + IDEMPOTENCY
= REVISION / CORRECTION AWARE
= ANTI-BASELINE-POISONING
= OBSERVABILITY-ONLY
= IDEA / DESIGN CANDIDATE

runtime change:
NONE today

prompt byte change:
NONE

semantic SnapshotStore change:
NONE

renderer responsibility change:
NONE
```

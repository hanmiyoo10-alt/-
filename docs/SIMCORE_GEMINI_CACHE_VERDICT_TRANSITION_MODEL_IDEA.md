# SimCore Gemini Cache Verdict Transition Model — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · SENTINEL TEMPORAL CONTRACT · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Architecture decision

A verdict transition contract is useful and should be designed separately, but it should **not** become a separate runtime service, persistence authority, or cache-state owner.

Required split:

```text
Cache Verdict Compiler
= one request -> one deterministic request-local verdict

Cache Verdict Transition Model
= short-horizon temporal contract over compatible request verdicts

Cache Regression Sentinel
= owns the temporal state/reducer and operational surfacing policy

Cache Regime Ledger
= owns confirmed long-horizon changes in what counts as normal
```

Therefore:

```text
separate design contract: YES
separate runtime authority/service: NO
separate persistence owner: NO
```

The Transition Model is the state-machine specification the Sentinel must follow.

## 2. Purpose

Define how standardized request-level cache verdicts may evolve over a short sequence of compatible requests without allowing each consumer to invent its own temporal semantics.

It answers:

```text
Does one degraded request create a persistent incident?
Does one healthy request erase a prior regression?
What does an UNVERIFIED gap do to an existing candidate?
When is recovery only tentative?
When has a repeated regression become persistent enough for the Sentinel to escalate?
When should a short-horizon incident be handed to the Regime Ledger as a possible long-horizon transition?
```

The model does not decide provider cache facts, first-break ownership, Cache ABI state, or baseline statistics. Those remain owned by their existing evidence producers.

## 3. Constitutional boundary

Permanent responsibility split:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Transition Model may define temporal cache-observation state. It must never:

```text
write or rewrite model prose
rewrite chat history
move prompt sections automatically
change model instructions because of a transition
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Temporal cache state is observability state only.

## 4. Why this should not live inside the Verdict Compiler

The Verdict Compiler is deliberately:

```text
request-local
stateless
deterministic
side-effect free
```

A transition model requires prior compatible verdict context.

Putting transition state into the compiler would destroy replay simplicity and mix two different questions:

```text
Compiler:
"What does THIS request prove?"

Transition Model:
"What does the SEQUENCE of compatible verdicts mean?"
```

Keep them separate.

## 5. Why this should not become a second Regime Ledger

The Transition Model is intentionally short-horizon and incident-oriented.

The Regime Ledger is long-horizon and records only meaningful changes in established normal behavior.

```text
one regression candidate
→ Transition Model cares
→ Regime Ledger does not

repeated regression followed by recovery
→ Transition Model closes/rejects incident
→ Regime Ledger may record nothing

sustained new compatible baseline
→ Baseline Profile establishes new normal
→ Regime Ledger may confirm a new CACHE_REGIME
```

The Transition Model must not maintain a second statistical baseline or historical archive.

## 6. Sentinel ownership

The Sentinel should own the live reducer/state instance.

Conceptual shape:

```text
nextSentinelTemporalState(previousTemporalState, currentCompiledVerdict, compatibilityContext)
→ nextTemporalState + transitionEvent
```

The Transition Model document defines the legal transitions and invariants. The Sentinel implements and owns them.

Do not create a second state store whose only job is to mirror Sentinel state.

## 7. Initial temporal states

Keep the vocabulary small.

Candidate states:

```text
QUIET
CANDIDATE
PERSISTENT
RECOVERY_PENDING
EVIDENCE_GAP
```

`RECOVERED` is better treated as a transition event back to `QUIET`, not necessarily a permanent state.

### QUIET

No active short-horizon cache incident is supported by the current compatible evidence sequence.

This does not mean cache is globally optimal.

### CANDIDATE

One admitted request-level regression verdict or a small amount of compatible evidence suggests a real regression, but persistence is not yet established.

### PERSISTENT

Repeated compatible admitted verdicts establish that the regression pattern is continuing strongly enough for Sentinel escalation policy to consider repeated WATCH / engineering review.

This state does not itself mean FIX.

### RECOVERY_PENDING

A prior `CANDIDATE` or `PERSISTENT` sequence has begun producing compatible healthy verdicts, but there is not yet enough recovery evidence to close the incident.

### EVIDENCE_GAP

The current request cannot update the temporal conclusion because required evidence is unavailable, ambiguous, incompatible, or otherwise not admitted strongly enough.

`EVIDENCE_GAP` must not silently mean healthy or degraded.

## 8. Request verdicts are not temporal states

Do not reuse request verdict names as persistent state names.

Example:

```text
request verdict:
PRE_SIMCORE_PREFIX_BREAK

sentinel temporal state:
CANDIDATE or PERSISTENT

operational classification:
WATCH / HOST_HISTORY
```

These are three different layers.

Likewise:

```text
request verdict:
SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE
```

must not automatically imply:

```text
PERSISTENT
FIX
```

Temporal repetition and operational policy remain required.

## 9. Compatibility gate before every transition

A verdict may update an existing temporal sequence only when it is compatible with that sequence.

Compatibility should be delegated to existing Baseline/Admission concepts and may include:

```text
same chat/location scope
compatible request family
compatible Gemini/model family
compatible cache regime
compatible Cache ABI context where relevant
```

An incompatible request must not be counted as either regression persistence or recovery.

Conceptual:

```text
C/steady regression
→ B_START healthy
```

must not automatically close the C/steady incident merely because a different request family looked healthy.

## 10. Core transition principles

### 10.1 One bad request does not establish persistence

```text
QUIET
+ admitted material regression verdict
→ CANDIDATE
```

Never jump directly from `QUIET` to `PERSISTENT` from one request solely because the cache ratio is dramatic.

### 10.2 One healthy request does not erase a persistent incident

```text
PERSISTENT
+ one compatible CACHE_HEALTHY
→ RECOVERY_PENDING
```

not:

```text
PERSISTENT
+ one healthy request
→ QUIET
```

### 10.3 Missing evidence is not recovery

```text
PERSISTENT
+ UNVERIFIED_PROVIDER
→ EVIDENCE_GAP preserving prior incident context
```

not:

```text
→ QUIET
```

### 10.4 Missing evidence is not further degradation either

An `UNVERIFIED` request must not increase persistence counters as if it were another regression.

### 10.5 Contradictory evidence freezes escalation

```text
CANDIDATE or PERSISTENT
+ CONTRADICTORY_EVIDENCE
→ EVIDENCE_GAP / contradiction hold
```

The Sentinel must not escalate severity while the required evidence chain is contradictory.

### 10.6 Recovery requires compatible admitted healthy evidence

Recovery should be based on compatible, admitted request verdicts such as `CACHE_HEALTHY`, not simply absence of a warning.

## 11. Proposed transition skeleton

Conceptual only; exact repetition thresholds are evidence-gated and not frozen here.

```text
QUIET
  + compatible regression
  → CANDIDATE

CANDIDATE
  + compatible repeated regression
  → PERSISTENT

CANDIDATE
  + sufficient compatible healthy evidence
  → QUIET / RECOVERED event

CANDIDATE
  + evidence unavailable/ambiguous
  → EVIDENCE_GAP preserving candidate context

PERSISTENT
  + compatible regression
  → PERSISTENT

PERSISTENT
  + first compatible healthy result
  → RECOVERY_PENDING

PERSISTENT
  + evidence unavailable/ambiguous
  → EVIDENCE_GAP preserving persistent context

RECOVERY_PENDING
  + sufficient compatible healthy evidence
  → QUIET / RECOVERED event

RECOVERY_PENDING
  + regression returns
  → CANDIDATE or PERSISTENT depending on preserved incident context

EVIDENCE_GAP
  + defensible compatible evidence resumes
  → restore/advance prior held context according to the new verdict
```

The implementation should retain a compact `heldStateBeforeGap` or equivalent rather than treating `EVIDENCE_GAP` as a fresh start.

## 12. Avoid fixed magic counts at idea stage

Do not freeze rules such as:

```text
2 bad turns = PERSISTENT
2 healthy turns = RECOVERED
```

before real long-chat evidence exists.

Potential implementation policy may later use:

```text
bounded compatible verdict window
minimum admitted sample count
consecutive requirement where justified
recent-window proportion where consecutive-only is too brittle
```

The threshold policy belongs to Sentinel implementation evidence and must be fixture/live validated.

The Transition Model freezes the qualitative invariants first.

## 13. Incident identity / attribution continuity

Repeated verdicts should only strengthen one incident when their attribution families are compatible.

Example:

```text
request 1: PRE_SIMCORE_PREFIX_BREAK
request 2: PRE_SIMCORE_PREFIX_BREAK
request 3: PRE_SIMCORE_PREFIX_BREAK
→ one coherent incident family
```

But:

```text
request 1: PRE_SIMCORE_PREFIX_BREAK
request 2: ROUTE_OR_SCOPE_CHANGE
```

should not blindly count as two confirmations of the same root cause.

The Sentinel may keep a bounded incident attribution summary such as:

```text
primaryVerdictFamily
supportingVerdictCounts
contradictoryVerdictCount
```

No raw prompt/history retention.

## 14. Degradation can persist while attribution changes

Separate:

```text
provider degradation persistence
```

from:

```text
root-cause attribution stability
```

Example:

```text
three exact provider regressions
but local attribution changes:
PRE_SIMCORE
UNKNOWN_EXTERNAL
PRE_SIMCORE
```

The degradation may become temporally persistent while root-cause certainty remains bounded.

Do not force a stable cause merely because the incident itself persists.

## 15. Recovery semantics

Recovery should mean:

```text
compatible provider/cache behavior returned to admitted healthy range
+
no unresolved stronger contradictory evidence
```

It does not mean:

```text
root cause was fixed
SimCore was correct all along
provider cache resource was reset
```

A recovery event may close a short incident while preserving its evidence in the Evidence Chain / bounded diagnostics.

If the old baseline no longer becomes healthy but a new stable baseline emerges instead, that may be a Regime transition rather than simple recovery.

## 16. Transition events

Candidate machine-readable events:

```text
T_CANDIDATE_OPENED
T_CANDIDATE_REPEATED
T_PERSISTENCE_ESTABLISHED
T_RECOVERY_STARTED
T_RECOVERED
T_EVIDENCE_GAP_OPENED
T_EVIDENCE_RESUMED
T_CONTRADICTION_HOLD
T_REGIME_HANDOFF_CANDIDATE
```

These are temporal events, not WATCH/FIX severities.

## 17. Sentinel operational mapping remains separate

The Sentinel may later map transition state/events to operational classifications.

Conceptual only:

```text
CANDIDATE
→ often single WATCH / quiet diagnostic depending policy

PERSISTENT + PRE_SIMCORE family
→ repeated WATCH / HOST_HISTORY

PERSISTENT + strong SIMCORE_CACHE_ABI_REGRESSION_CANDIDATE family
→ FIX CANDIDATE eligibility

RECOVERED
→ close/resolve without noisy popup by default
```

This mapping belongs to Sentinel policy and must not be baked into the request-level Verdict Compiler.

Correctness/state defects remain independent and outrank cache performance classifications.

## 18. Regime Ledger handoff

The Transition Model may emit only a proposal event:

```text
T_REGIME_HANDOFF_CANDIDATE
```

when short-horizon evidence suggests the old baseline may no longer describe reality.

It must not confirm a new `CACHE_REGIME`.

Required handoff remains conceptually:

```text
persistent compatible shift
→ Baseline Profile establishes a defensible new normal
→ Regime Ledger evaluates/records confirmed boundary
```

A persistent incident is not automatically a new regime.

## 19. Reload behavior

A reload/runtime generation boundary must not automatically reset temporal incident state if the bounded observer-continuity contract can safely restore it.

But restored state must remain local observability only.

```text
reload
→ does not prove provider cache reset
→ does not prove recovery
→ does not create persistence by itself
```

If continuity metadata is unavailable or incompatible, prefer an evidence gap / cold temporal reconstruction rather than inventing a clean state.

## 20. Bounded state candidate

A future Sentinel implementation may need only a tiny structure such as:

```text
temporalState
heldStateBeforeGap
incidentFamily
compatibleRegressionCount
compatibleHealthyCount
recentVerdictClasses[]  // bounded
openedAtRequestSequence
lastStrongEvidenceAt
```

Exact fields/counts are implementation-time design.

No raw prompt bodies, user/assistant text, or full provider receipts.

This is operational telemetry, not semantic Core SnapshotStore state.

## 21. Deterministic reducer requirement

Given:

```text
previous normalized temporal state
+
current normalized compiled verdict
+
normalized compatibility result
```

then the transition result should be deterministic and replayable.

Preferred testable shape:

```text
reduceCacheVerdictTransition(previousState, currentVerdict, compatibility)
→ nextState + transitionEvents[]
```

No wall-clock reads inside the reducer unless timing has already been normalized into admitted bounded input.

No network calls, prompt mutation, UI, provider polling, or baseline mutation.

## 22. Required future fixtures

A future implementation should prove at least:

```text
1. QUIET + one regression
   → CANDIDATE, never PERSISTENT

2. CANDIDATE + repeated compatible regression
   → PERSISTENT only after configured evidence threshold

3. PERSISTENT + one healthy request
   → RECOVERY_PENDING, not QUIET

4. RECOVERY_PENDING + sufficient compatible healthy evidence
   → QUIET + T_RECOVERED

5. PERSISTENT + UNVERIFIED_PROVIDER
   → EVIDENCE_GAP preserving persistent context

6. EVIDENCE_GAP + regression resumes
   → prior incident context restored/continued

7. EVIDENCE_GAP + healthy evidence resumes
   → recovery evaluated from held context, not fresh-started blindly

8. contradictory admitted evidence
   → contradiction hold; no severity escalation

9. incompatible request family
   → does not count as persistence or recovery

10. degradation repeats but attribution family changes
    → persistence may increase while attribution certainty does not

11. reload alone
    → no recovery/persistence claim

12. persistent short incident
    → may emit regime handoff candidate, cannot confirm regime

13. one healthy request after long regression
    → no instant recovery

14. no raw prompt/body retention

15. deterministic replay of same state+verdict sequence

16. renderer boundary unchanged
```

## 23. Non-goals

```text
provider cache control
explicit Gemini cache resource management
second Baseline Profile
second Regime Ledger
second Verdict Compiler
independent alert severity system
prompt/history rewrite
provider route switching
renderer behavior
semantic Core state
```

## 24. Current classification

```text
GEMINI_CACHE_VERDICT_TRANSITION_MODEL
= HIGH VALUE AS SENTINEL CONTRACT
= SHORT-HORIZON TEMPORAL LAYER
= SEPARATE DESIGN SPEC
= NOT A SEPARATE RUNTIME AUTHORITY
= NOT A SEPARATE PERSISTENCE OWNER
= DETERMINISTIC REDUCER CANDIDATE
= NO RUNTIME CHANGE TODAY
= NO PROMPT BYTE CHANGE
```

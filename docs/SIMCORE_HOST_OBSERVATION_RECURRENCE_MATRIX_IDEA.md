# SimCore Host Observation Recurrence Matrix — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · EXISTING-EVIDENCE RECURRENCE MATRIX · SEPARATE WATCH FAMILIES · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_HOST_HISTORY_OBSERVATION_AUTHORITY_MAP_IDEA.md`
- `docs/SIMCORE_HOST_HANDSHAKE_ATTRIBUTION_CONTRACT_IDEA.md`
- `docs/SIMCORE_HOST_HISTORY_FRONTIER_CLAIM_CONTRACT_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Compare the two strongest current Host / History WATCH families using only already-preserved natural evidence:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
PRE_SIMCORE_HOST_HISTORY_FRONTIER
```

The purpose is not to invent a common host failure theory. It is to determine whether current evidence supports:

```text
one shared observation family
one correlated mechanism candidate
or two separate WATCH families that merely occurred in the same long-chat runtime
```

No new instrumentation, runtime implementation, host mutation, history repair, provider-cache claim, or release is authorized by this matrix.

## 2. Current evidence set

Both families were observed in production v0.64.2 under runtime generation:

```text
mt4bcgc3-5556z8
```

### Family H — transient handshake miss

Affected request:

```text
user @2062
Request hook: SEEN
Core handshake: NOT FOUND
Runtime status: INACTIVE · output BYPASSED
binding: REQUEST_ONLY
mirror: NOT_EXERCISED
```

Nearest directly confirmed recovery:

```text
user @2064 → assistant @2065
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stability: PASS
```

Current attribution:

```text
HANDSHAKE_MISS_UNATTRIBUTED
FAIL-CLOSED CORRECT
RECURRENCE NOT ESTABLISHED
SAME-RUNTIME RECOVERY CONFIRMED
```

### Family F — marching host-history frontier

Beginning on the same recovered `@2064` request and continuing through the subsequent B session:

```text
@2064 → first change @23
@2066 → first change @25
@2068 → first change @27
@2070 → first change @29
@2072 → first change @31
@2074 → first change @33
@2076 → first change @35
```

Shared bounded characteristics:

```text
break owner: PRE_SIMCORE
break zone: CHAT_HISTORY
shape: SAME_SLOT_CHANGED
previous compact signature: assistant/text 21:4a852496
host prefix: STABLE / SAME_FAMILY
request mutation: NONE
history stabilization: OBSERVE_ONLY
Representation correlation: NO_MATCH
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

Current attribution:

```text
SAME_RUNTIME_SERIES
FRONTIER_MARCHING_FORWARD
REUSE_WINDOW_GROWING
ROOT CAUSE UNESTABLISHED
CORRECTNESS DEFECT NOT ESTABLISHED
```

## 3. Comparison matrix

| Dimension | Handshake miss family | History-frontier family | Current relationship |
|---|---|---|---|
| Production | v0.64.2 | v0.64.2 | shared context |
| Runtime generation | `mt4bcgc3-5556z8` | `mt4bcgc3-5556z8` | shared context |
| Earliest preserved turn | `@2062` | `@2064` | adjacent, not same affected request |
| Request hook | SEEN | active request observations available | host-facing request context shared broadly |
| Primary observation | handshake scan result | bounded request-topology comparison | different local observer question |
| Primary result | `NOT FOUND` | `PRE_SIMCORE / CHAT_HISTORY / SAME_SLOT_CHANGED` | semantically different |
| Activation impact | SimCore INACTIVE / output BYPASSED | SimCore ACTIVE / outputs COMMITTED | strongly different |
| Fail-closed relevance | direct | none | handshake-only |
| Recurrence | not established | seven-sample same-runtime series | strongly different |
| Recovery behavior | next directly confirmed request healthy | no recovery required; pattern continues during healthy turns | strongly different |
| User-visible correctness impact | one request lacked SimCore activation | not established | different impact class |
| Host-prefix family on affected specimen | insufficient paired evidence preserved | STABLE / SAME_FAMILY | not comparable for @2062 |
| History frontier on affected specimen | unavailable / not preserved strongly enough | directly measured | not comparable for @2062 |
| SimCore request/history mutation | no evidence of causal mutation | explicit NONE / OBSERVE_ONLY | shared negative evidence only |
| External root cause | unknown | unknown | shared uncertainty only |
| Provider-cache claim | none | UNVERIFIED | no causal bridge |

## 4. Core finding — current evidence does not support one shared mechanism

Canonical conclusion:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
and
PRE_SIMCORE_HOST_HISTORY_FRONTIER

= SAME_RUNTIME_CONTEXT
= ADJACENT NATURAL OBSERVATIONS
= BOTH HOST/REQUEST-BOUNDARY-ADJACENT

but

!= SAME OBSERVATION PLANE
!= SAME FAILURE MODE
!= SAME CAUSE PROVEN
!= ONE COMBINED DEFECT
```

The strongest current relationship is therefore:

```text
COINCIDENT_CONTEXT_ONLY
```

The two families remain separate WATCH entries.

## 5. Important negative control — history frontier coexists with healthy handshake

The recovered `@2064 → @2065` request is especially valuable because it simultaneously establishes:

```text
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
```

and:

```text
PRE_SIMCORE
CHAT_HISTORY
SAME_SLOT_CHANGED
first change @23
```

Therefore current evidence directly shows:

```text
HISTORY_FRONTIER_PRESENT
+ HANDSHAKE_FOUND_NORMAL
```

on the same healthy request family.

This rules out the simple sufficiency hypothesis:

```text
PRE_SIMCORE CHAT_HISTORY frontier
→ necessarily causes handshake miss
```

That hypothesis is contradicted by the `@2064` control.

It does NOT prove:

```text
the two phenomena can never share an upstream context factor
```

because the affected `@2062` request lacks enough preserved topology evidence to evaluate whether the frontier was present there.

Canonical statement:

```text
history-frontier presence is NOT SUFFICIENT for handshake failure
necessity / upstream correlation remain UNESTABLISHED
```

## 6. Why same runtime is not enough

Same runtime generation is useful because it rules out one obvious reload boundary between the two nearby observations.

It supports:

```text
same plugin generation
same broad runtime lifetime
no runtime reload required for handshake recovery
```

It does not support:

```text
same host-composition event
same request projection
same hidden preset/toggle timing
same upstream cause
```

Therefore:

```text
SAME_RUNTIME
= context compatibility
!= causal identity
```

## 7. Correlation-strength vocabulary

Use the following research-only levels when comparing Host / History anomaly families.

```text
UNRELATED_CONTEXT
COINCIDENT_CONTEXT_ONLY
SHARED_DISCRIMINATOR
CORRELATED_OBSERVATION
CAUSAL_CANDIDATE
CAUSAL_REPRODUCTION
```

### `UNRELATED_CONTEXT`

Samples do not share enough runtime/location/temporal context to compare usefully.

### `COINCIDENT_CONTEXT_ONLY`

Samples share context such as runtime generation or neighboring turns, but no bounded discriminator connects their occurrence.

Current handshake/frontier relationship belongs here.

### `SHARED_DISCRIMINATOR`

A bounded factor is repeatedly present in both affected families and absent in healthy controls.

Examples of possible future discriminators:

```text
same host-prefix reset family
same request-topology shape
same prompt-placement anomaly
same host message-content accessor class
same externally verified source/preset state transition
```

One shared discriminator is correlation evidence, not root cause.

### `CORRELATED_OBSERVATION`

Multiple natural paired specimens establish that the two anomaly results repeatedly appear/disappear together under comparable contexts.

Requires healthy controls.

### `CAUSAL_CANDIDATE`

A bounded mechanism can plausibly explain both observations and survives contrary controls.

Still requires direct proof before repair.

### `CAUSAL_REPRODUCTION`

A deterministic mechanism reproduces both effects under controlled input and removes both when the mechanism is absent/fixed.

Only this level strongly supports one shared defect model.

## 8. Current discriminator audit

### Runtime generation

Shared:

```text
mt4bcgc3-5556z8
```

Verdict:

```text
CONTEXT ONLY
```

Reason: healthy frontier requests occur in the same runtime after handshake recovery.

### Temporal adjacency

Shared:

```text
@2062 miss
→ @2064 healthy + frontier
```

Verdict:

```text
CONTEXT ONLY
```

Adjacency alone is not mechanism evidence.

### Host-prefix behavior

Handshake affected request:

```text
insufficient preserved paired topology evidence
```

Frontier family:

```text
STABLE / SAME_FAMILY
```

Verdict:

```text
NOT COMPARABLE
```

Do not backfill the @2062 host-prefix state from @2064.

### History-frontier behavior

Handshake affected request:

```text
not preserved with sufficient authority
```

Healthy recovered request:

```text
frontier PRESENT
```

Verdict:

```text
FRONTIER NOT SUFFICIENT FOR HANDSHAKE MISS
```

### SimCore mutation

Handshake family:

```text
no direct SimCore mutation cause established
```

Frontier family:

```text
request mutation NONE
history stabilization OBSERVE_ONLY
SimCore NOT_FIRST_BREAK
```

Verdict:

```text
SHARED NEGATIVE EVIDENCE
```

This narrows SimCore-owned explanations but does not establish one external owner.

### Correctness impact

Handshake:

```text
activation absent for one request
```

Frontier:

```text
healthy outputs and state; correctness impact not established
```

Verdict:

```text
DIFFERENT IMPACT PROFILE
```

## 9. Do not create a combined Host Failure umbrella defect

Reject:

```text
"both happened around the same time"
→ HOST_COMPOSITION_BUG
```

Reject:

```text
"both are PRE/host-facing"
→ same mechanism
```

Reject:

```text
history frontier observed after handshake recovery
→ frontier repaired handshake
```

Reject:

```text
handshake miss occurred before frontier series
→ handshake miss caused frontier
```

No direction of causality is currently established.

## 10. Future correlation packet

If another natural handshake miss occurs, the highest-value evidence is not a new generic observer. Preserve the affected request plus nearest healthy controls using existing bounded fields where available:

```text
version
runtime generation
location/chat scope
request index
hook SEEN
handshake FOUND / NOT FOUND
prompt scan stats
runtime prompt presence/placement
request topology family
first-change index / owner / zone / shape
host-prefix family/delta
repeated-break signature
frontier movement state
SimCore request mutation
telemetry continuity
output BYPASSED / COMMITTED
reload boundary
externally known preset/toggle continuity, only if actually known
```

Then ask separately:

```text
A. did handshake status change?
B. did history-frontier status change?
C. did host-prefix family change?
D. did one bounded discriminator move with BOTH A and B?
```

Do not retain raw full prompts/history solely to correlate these families.

## 11. Useful future controls

The strongest future evidence would include at least one of each:

```text
handshake miss + frontier present
handshake miss + frontier absent
handshake healthy + frontier present
handshake healthy + frontier absent
```

Current evidence already supplies one useful quadrant:

```text
handshake healthy + frontier present
= @2064 and following healthy frontier series
```

This is why the frontier cannot currently be treated as a sufficient cause of handshake failure.

The other quadrants remain missing or insufficiently preserved.

## 12. Relationship to Host Prefix Reset family

A separate historical family exists for:

```text
PRE_SIMCORE / HOST_PREFIX @0
family reset
```

Do not silently merge that family into either:

```text
handshake miss
or
CHAT_HISTORY marching frontier
```

A future handshake recurrence that coincides with a host-prefix reset would be valuable `SHARED_DISCRIMINATOR` evidence, but one paired specimen would still not prove causality.

## 13. Relationship to cache research

The history-frontier observer includes local common-prefix/cache-effect terminology, but this matrix is not a provider-cache study.

Freeze:

```text
local topology correlation
!= Gemini cached-token correlation
```

Provider cache remains:

```text
UNVERIFIED
```

unless authoritative receipt evidence is separately available.

Do not reopen broad cache architecture from this matrix.

## 14. Relationship to Diagnostic UX and M2

Diagnostic UX broad research is closed and should not be reopened here.

M2-3 remains a separate active ownership workstream.

This matrix does not authorize:

```text
new diagnostic framework
new host dependency in Core modules
Edit Reconcile behavior change
Session ownership change
runtime prompt change
```

If future natural evidence promotes a host/history issue, it must enter the normal SimCore workflow separately from M2 mechanical ownership work.

## 15. Runtime-cost boundary

Current matrix conclusion requires zero new runtime work.

Default:

```text
reuse existing handshake probe
reuse existing request topology
reuse existing host-prefix sketches
reuse existing mutation attribution
reuse existing telemetry continuity
```

Before adding any new discriminator, prove that a new natural recurrence cannot be resolved from those existing fields.

## 16. Current classification

```text
SIMCORE_HOST_OBSERVATION_RECURRENCE_MATRIX
= EXISTING-EVIDENCE COMPLETE
= HANDSHAKE / FRONTIER CURRENTLY SEPARATE WATCH FAMILIES
= RELATIONSHIP COINCIDENT_CONTEXT_ONLY
= SAME RUNTIME / ADJACENT CONTEXT ESTABLISHED
= HISTORY FRONTIER NOT SUFFICIENT FOR HANDSHAKE MISS
= NECESSITY / COMMON UPSTREAM FACTOR UNESTABLISHED
= NO SHARED DISCRIMINATOR YET
= NO COMBINED HOST DEFECT
= NO NEW INSTRUMENTATION JUSTIFIED
= OBSERVE-ONLY

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
request/history mutation: NONE
renderer responsibility change: NONE
release-system change: NONE
```

## 17. Next research decision

Do not continue horizontally inventing generic Host / History contracts merely because this matrix exists.

The current evidence supports two reasonable next moves:

```text
A. Host / History completeness audit
   → check whether Authority Map + Handshake Attribution + Frontier Claim + Recurrence Matrix are enough to close broad research

B. stop and wait for a new natural host/history specimen
   → use the frozen contracts immediately when it appears
```

Recommended next move:

```text
HOST / HISTORY RESILIENCE COMPLETENESS AUDIT
```

because the broad observation authority, both existing anomaly families, and their cross-family relationship are now explicitly defined. The audit should identify only genuine remaining gaps; if none exist, broad Host / History research should close and return to evidence-triggered WATCH.

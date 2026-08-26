# SimCore History Frontier Confidence Surface — Frozen Design

Date: 2026-08-26
Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-08 COMPLETE · DOC_NOT_REQUIRED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-08`
Importance: `2 / LOW`
Design difficulty: `2 / EASY`
Runtime class: `RUNTIME`
Design gate at selection: `NOW`
Doc Apply Class: `DOC_NOT_REQUIRED`
Open design questions: `0`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_HOST_HISTORY_FRONTIER_CLAIM_CONTRACT_IDEA.md`
- `docs/SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- production `release-simcore` v0.64.7 request-topology/history observers

---

## 1. Problem

SimCore already observes bounded request-prefix/history-frontier facts such as:

```text
first-change position
break owner
break zone
mutation shape
common-prefix extent
repeated compact predecessor signatures
Host-prefix family
Representation correlation
SimCore first-break contribution
provider cache = UNVERIFIED
```

The existing research correctly separates direct positional evidence from external provenance claims, but the current diagnostic surface can still be easy to over-read.

Examples of unsafe operator interpretation:

```text
PRE_SIMCORE
→ host definitely caused it

CHAT_HISTORY
→ one durable history message was definitely rewritten

SAME_SLOT_CHANGED
→ host edited the exact same message object

REUSE_WINDOW_GROWING
→ provider cache definitely hit

Mutation attribution LOW
→ arbitrary probability-like score
```

S-08 defines one bounded **History Frontier Confidence Surface** that makes the evidence ceiling explicit.

It does not add provenance discovery, history mutation, provider inference, repair, or new request scanning.

---

## 2. Product / debugging value

Primary value:

```text
existing history/topology observations
→ one compact evidence-strength surface
→ operator sees what is directly observed
→ operator sees what is only recurrence-supported
→ operator sees what remains unverified
→ causal overclaim becomes harder
```

The surface is especially useful for the known compact-assistant/marching-frontier family, where the local frontier pattern is strong but the external causal owner remains unproven.

---

## 3. Constitutional boundary

Canonical principle:

```text
HISTORY FRONTIER CONFIDENCE
= CLAIM-STRENGTH / EVIDENCE-CEILING PRESENTATION
!= ROOT-CAUSE DETECTOR
!= PROVENANCE ENGINE
!= HISTORY REPAIR
!= PROVIDER CACHE VERDICT
!= GENERIC HEALTH SCORE
```

Canonical flow:

```text
existing request-topology/history observer facts
+ existing bounded recurrence/regime facts
+ existing negative SimCore-attribution facts
        ↓
claim-layer projector
        ↓
History Frontier Confidence Surface
```

Forbidden flow:

```text
rendered history diagnostics
→ parse human strings
→ guess a cause
→ assign confidence score
```

The surface consumes canonical bounded fields only.

---

## 4. Frozen v1 surface identity

S-08 v1 is one diagnostic presentation block named conceptually:

```text
HISTORY FRONTIER CONFIDENCE
```

It is shown only when enough bounded request-topology/history metadata exists to make at least the direct-observation layer meaningful.

If required source facts are absent:

```text
surface may show UNAVAILABLE
or be omitted according to the parent diagnostic capability profile
```

Omission must never be interpreted as a healthy frontier.

---

## 5. Confidence is claim-scoped, not global

S-08 MUST NOT output one aggregate value such as:

```text
History confidence: 82%
Host cause confidence: 0.73
Overall provenance confidence: HIGH
```

Reason: the underlying claims have different evidence classes.

The same observation may legitimately have:

```text
frontier position        = strong direct evidence
regime recurrence        = strong bounded series evidence
SimCore first-break role = strong negative local evidence
external mutation cause  = unverified
provider cache cause     = unverified
```

Therefore confidence is attached to individual claim layers.

---

## 6. Frozen claim layers

Exactly five claim layers exist in v1:

```text
1. FRONTIER
2. REGIME
3. SIMCORE_CONTRIBUTION
4. EXTERNAL_PROVENANCE
5. PROVIDER_CACHE
```

No sixth generic `HEALTH` or `CAUSE` layer is part of v1.

### 6.1 FRONTIER

Represents direct local request-comparison facts only.

Candidate facts already owned by request-topology/history observation:

```text
firstChangeIndex
common-prefix messages/chars
break owner
break zone
mutation shape
previous/current bounded signatures
```

### 6.2 REGIME

Represents bounded multi-sample pattern evidence only.

Examples:

```text
single observation
paired recurrence
same-runtime series
cross-runtime family recurrence
frontier movement state
repeated bounded predecessor signature
```

### 6.3 SIMCORE_CONTRIBUTION

Represents only directly defensible local SimCore relationship facts, such as:

```text
FIRST_BREAK
NOT_FIRST_BREAK
REQUEST_MUTATION_OBSERVED
REQUEST_MUTATION_NONE
UNKNOWN
```

This is not a claim that SimCore can have no indirect influence anywhere outside observed boundaries.

### 6.4 EXTERNAL_PROVENANCE

Represents whether an authoritative external/Host provenance source actually explains the observed changed history representation.

Current expected normal state for the known family:

```text
UNVERIFIED
```

or an existing bounded no-match state such as:

```text
NO_PROVENANCE_MATCH
```

when that is directly produced by the existing observer.

### 6.5 PROVIDER_CACHE

Represents only authoritative provider/gateway cache receipt evidence if one exists.

Without authoritative external receipt:

```text
UNVERIFIED
```

Always.

Prompt-shape, common-prefix extent, REUSE_WINDOW_GROWING, or local cache trajectory may not upgrade this layer.

---

## 7. Frozen evidence-strength vocabulary

S-08 v1 uses one small presentation vocabulary:

```text
DIRECT
SUPPORTED
WEAK
UNVERIFIED
UNAVAILABLE
```

These are evidence-strength labels, not probabilities.

### `DIRECT`

The claim is mechanically produced from bounded current observation facts without causal inference.

Examples:

```text
firstChangeIndex = 35
break owner = PRE_SIMCORE
break zone = CHAT_HISTORY
shape = SAME_SLOT_CHANGED
SimCore contribution = NOT_FIRST_BREAK
```

where the corresponding owner already produced those facts.

### `SUPPORTED`

The claim requires multiple comparable bounded samples or coherent recurrence/regime evidence, but still does not cross into external root-cause attribution.

Examples:

```text
SAME_RUNTIME_SERIES
FRONTIER_MARCHING_FORWARD
repeated compact predecessor signature family
REUSE_WINDOW_GROWING as local request-prefix observation
```

### `WEAK`

Some bounded correlation exists, but the evidence does not justify a stronger claim.

Examples may include an existing low-confidence/no-provenance-match attribution surface.

`WEAK` must never be used to fill a missing source.

### `UNVERIFIED`

The claim is meaningful but no authoritative evidence currently supports it.

Canonical examples:

```text
external mutation root cause
provider cache hit/miss
host compaction/summarization owner
```

### `UNAVAILABLE`

The required bounded observation source was not available.

Do not convert `UNAVAILABLE` to `UNVERIFIED` merely for prettier output.

---

## 8. Evidence strength is derived from claim class, not guessed numerically

S-08 does not invent percentages or arbitrary heuristics.

Preferred implementation model:

```text
canonical fact/result class
+ source presence
+ existing recurrence state
→ deterministic evidence-strength label
```

Example:

```text
break owner = PRE_SIMCORE
source = request-topology direct comparison
→ FRONTIER strength = DIRECT

recurrence = SAME_RUNTIME_SERIES
movement = FRONTIER_MARCHING_FORWARD
→ REGIME strength = SUPPORTED

mutation attribution = NO_PROVENANCE_MATCH
→ EXTERNAL_PROVENANCE strength = WEAK or UNVERIFIED according to canonical source semantics

provider receipt absent
→ PROVIDER_CACHE strength = UNVERIFIED
```

Do not derive strength from elapsed time, user-visible severity, message count alone, or an LLM judgment.

---

## 9. Frontier state vocabulary

S-08 reuses the frozen Host-History Frontier Claim Contract movement vocabulary:

```text
FRONTIER_BASELINE
FRONTIER_STABLE
FRONTIER_MARCHING_FORWARD
FRONTIER_REGRESSING
FRONTIER_COLLAPSED
FRONTIER_RESET
FRONTIER_NOT_COMPARABLE
```

S-08 does not create aliases such as:

```text
GOOD_FRONTIER
BAD_FRONTIER
CACHE_HEALTHY
HOST_COMPACTING
```

Movement describes local observation shape only.

---

## 10. Recurrence strength vocabulary

S-08 reuses the existing bounded evidence progression:

```text
SINGLE_OBSERVATION
PAIRED_RECURRENCE
SAME_RUNTIME_SERIES
CROSS_RUNTIME_FAMILY_RECURRENCE
USER_VISIBLE_IMPACT_CORRELATED
CAUSAL_REPRODUCTION
```

These values are not collapsed into one numeric score.

Important current boundary:

```text
SAME_RUNTIME_SERIES
!= CAUSAL_REPRODUCTION
```

Repeated evidence strengthens the pattern claim, not the external owner claim.

---

## 11. PRE_SIMCORE / CHAT_HISTORY wording discipline

Frozen machine meanings remain mechanical.

```text
PRE_SIMCORE
= first locally observed request difference occurs before the SimCore runtime block

CHAT_HISTORY
= first observed difference is positioned in the request-history region
```

S-08 must not render those as:

```text
Host caused mutation
Host rewrote history
PocketRisu compacted history
provider changed the request
```

Preferred compact human wording:

```text
First break: PRE_SIMCORE · CHAT_HISTORY
Evidence: DIRECT
External cause: UNVERIFIED
```

---

## 12. SAME_SLOT_CHANGED wording discipline

`SAME_SLOT_CHANGED` remains a structural comparison classification only.

It does not prove durable-object mutation.

Preferred wording:

```text
Compared slot signature changed
```

Avoid:

```text
Historical message was edited
Host replaced this exact message
```

unless a future authoritative provenance surface proves that stronger claim.

---

## 13. SimCore contribution discipline

For the known natural family, facts such as:

```text
first break = PRE_SIMCORE
request mutation = NONE
history stabilization = OBSERVE_ONLY
persistent mutation = NONE
Representation correlation = NO_MATCH
```

can support:

```text
SimCore observed as NOT_FIRST_BREAK
```

with `DIRECT` local evidence when those canonical facts exist.

They do NOT support:

```text
SimCore has zero indirect influence on every upstream component
```

S-08 must preserve this ceiling.

---

## 14. Provider-cache discipline

Frozen rule:

```text
provider/gateway cache result
= UNVERIFIED
```

unless authoritative provider/gateway telemetry is actually correlated.

The following MUST NOT upgrade provider confidence:

```text
COMMON_PREFIX
REUSE_WINDOW_GROWING
FRONTIER_MARCHING_FORWARD
stable host prefix
large common-prefix chars
same compact predecessor signature
local cache candidate trajectory
```

These are local request-shape observations only.

---

## 15. Observation identity / coherence

The S-08 surface belongs to one coherent diagnostic observation instance.

Canonical rule:

```text
observationInstance
= observationIdentity + observationRevision
```

All current-observation S-08 facts must refer to that same instance.

If recurrence/regime uses prior samples, the surface must distinguish:

```text
CURRENT OBSERVATION
vs
REGIME HISTORY
```

and must not merge prior sample fields into the current observation as if they were current-turn facts.

No global latest-history fact may silently overwrite historical observations.

---

## 16. Frozen v1 presentation fields

Preferred bounded presentation order:

```text
History frontier
Observation
Frontier
Regime
SimCore
External provenance
Provider cache
```

Conceptual example:

```text
History frontier
Observation: PRE_SIMCORE · CHAT_HISTORY · SAME_SLOT_CHANGED
Frontier: @35 · FRONTIER_MARCHING_FORWARD · evidence DIRECT
Regime: SAME_RUNTIME_SERIES · seen 7 · evidence SUPPORTED
SimCore: NOT_FIRST_BREAK · request mutation NONE · evidence DIRECT
External provenance: NO_PROVENANCE_MATCH · evidence WEAK
Provider cache: UNVERIFIED
```

Exact prose/line wrapping is implementation detail.

No raw request/history bodies are required.

---

## 17. Surface availability

S-08 is not shown as a false healthy row when the request topology is absent.

Cases:

```text
required current topology observation exists
→ render bounded surface

current observation exists but no history break applies
→ render applicable NONE/NOT_APPLICABLE state if the parent diagnostic profile needs explicitness

required source unavailable
→ UNAVAILABLE or omit according to parent capability profile
```

Do not show:

```text
History frontier: PASS
```

merely because no history observer data exists.

---

## 18. No new history scan / provenance probe

S-08 is presentation-only over existing bounded observers.

Forbidden:

```text
new full-history scan
raw-body comparison solely for confidence
Host chat reread solely for S-08
provider/network request
history object identity probing
DOM inspection
polling
background recurrence reconstruction
persistent provenance ledger
request/history mutation
history repair
```

If an existing owner did not observe a fact, S-08 leaves it weak/unverified/unavailable.

---

## 19. State / persistence boundary

S-08 may consume already-existing bounded request-topology/regime memory.

It does not authorize new semantic persistence.

```text
Core semantic state write        FORBIDDEN
SnapshotStore write              FORBIDDEN
pluginStorage write              FORBIDDEN
Host chat write                  FORBIDDEN
new request mutation             FORBIDDEN
new history stabilization        FORBIDDEN
raw history body retention       FORBIDDEN
network/provider query           FORBIDDEN
```

If a future implementation needs one tiny in-memory presentation snapshot for panel coherence, it must remain diagnostic-only and bounded by the existing observation lifecycle contract.

---

## 20. Relationship to S-07 Host Capability Receipt

S-07 answers:

```text
which Host/browser surfaces were present or naturally exercised?
```

S-08 answers:

```text
how strong is each bounded history-frontier claim?
```

They must not merge.

Examples:

```text
S-07 HOST_CHAT_READ = PRESENT
```

must not cause:

```text
S-08 external provenance = VERIFIED
```

because Host read availability is not provenance authority.

---

## 21. Relationship to S-03 / S-04

S-03 compact copy profiles may omit the full S-08 block in v1.

`FULL_CURRENT` may include it once S-08 runtime implementation is promoted.

S-04 evidence packets may later carry bounded S-08 facts as observation evidence, but S-04 does not classify their causal meaning beyond the frozen handoff rules.

S-08 does not become an `EVIDENCE` copy profile or repository classification engine.

---

## 22. Surface conformance

When multiple capable surfaces render S-08 for the exact same observation instance:

```text
frontier owner/zone/shape
movement
recurrence strength
SimCore contribution
external provenance status
provider verification state
```

must remain semantically compatible.

A compact surface may omit details.
It may not strengthen evidence.

Forbidden example:

```text
panel: External provenance = UNVERIFIED
copy:  Host cause = HIGH confidence
```

---

## 23. Unknown / weak-state discipline

Weak evidence stays weak.

Frozen no-upgrade rules:

```text
UNAVAILABLE  → DIRECT       FORBIDDEN
UNVERIFIED   → WEAK         only if bounded correlation actually exists
WEAK         → SUPPORTED    requires explicit stronger evidence
SUPPORTED    → DIRECT       forbidden when claim is inherently recurrence-derived
UNVERIFIED   → VERIFIED     impossible without authoritative source
```

`DIRECT` means direct evidence for that local claim, not direct proof of root cause.

---

## 24. Failure / anomaly handling

S-08 itself does not create ordinary SimCore warnings merely because confidence is weak.

Examples:

```text
External provenance = UNVERIFIED
Provider cache = UNVERIFIED
```

are expected observation states, not warnings.

Potential separate anomaly evidence may exist when:

```text
frontier regresses/collapses
SimCore becomes first break unexpectedly
request mutation changes from NONE to observed
```

but the existing owner/diagnostic policy decides whether that becomes WATCH/FIX/BLOCKER.

S-08 only reports the bounded evidence strength.

---

## 25. Performance contract

S-08 must add effectively no new observation cost.

Preferred implementation:

```text
existing topology/regime facts already computed
→ pure bounded projection on diagnostic render/copy
```

Forbidden:

```text
second topology comparison
history rescan
hashing raw history solely for S-08
background timers
network
provider query
per-request formatted string generation when panel/copy is not used
```

---

## 26. Future implementation location

Exact physical placement is implementation-time work, but the preferred dependency shape is:

```text
runtime-topology/history observer facts
+ diagnostic observation projection
        ↓
pure S-08 projector / formatter
        ↓
existing diagnostic panel / FULL_CURRENT report
```

Do not put history-frontier confidence logic into:

```text
Store
Prompt
Representation
Edit Reconcile
Lifecycle
Time
Structure
```

These owners must not gain presentation/provenance responsibilities because of S-08.

---

## 27. Verification / golden controls

Future implementation must prove at minimum:

```text
1. direct PRE_SIMCORE / CHAT_HISTORY observation
   → FRONTIER evidence DIRECT

2. SAME_SLOT_CHANGED
   → does not render durable-message edit claim

3. first sample
   → recurrence SINGLE_OBSERVATION / frontier baseline

4. matching second sample
   → paired recurrence without causal upgrade

5. same-runtime coherent 3+ series
   → SAME_RUNTIME_SERIES / SUPPORTED

6. marching-forward sequence
   → FRONTIER_MARCHING_FORWARD
   → no provider-cache claim

7. runtime-generation change
   → no silent same-runtime regime continuity

8. host-prefix family reset
   → regime reset/not comparable according to existing contract

9. SimCore NOT_FIRST_BREAK + mutation NONE
   → local SimCore contribution evidence DIRECT
   → no global no-influence claim

10. external provenance absent/no match
    → WEAK/UNVERIFIED according to canonical source result
    → never guessed host cause

11. provider receipt absent
    → UNVERIFIED

12. required topology source absent
    → UNAVAILABLE / no false PASS

13. same observation panel/full-copy
    → semantic conformance

14. no new Host read/write
15. no history scan
16. no SnapshotStore/pluginStorage writes
17. no raw-body retention
18. no timers/polling/network
19. latest.js == install.js if runtime implementation later occurs
```

The known v0.64.2 compact-assistant marching-frontier specimen should remain a primary natural control.

---

## 28. Explicit non-goals

S-08 v1 does NOT provide:

```text
provider cache hit/miss
provider cached-token estimate
PocketRisu internal provenance
host compaction detection
history summarization detection
context-window size inference
raw-body diff UI
history repair
request mutation
persistent frontier database
aggregate health score
probability percentages
machine-learning confidence
LLM attribution
```

---

## 29. DOC APPLY verdict

Freeze-time verdict:

```text
DOC_NOT_REQUIRED
```

Reason:

The already-existing Host-History Frontier Claim Contract plus this frozen S-08 design together contain the complete durable-memory contract needed before runtime implementation:

```text
claim layers
evidence-strength vocabulary
frontier/regime semantics
PRE_SIMCORE / CHAT_HISTORY wording ceiling
provider-cache prohibition
SimCore negative-attribution ceiling
surface field order
failure/weak-state rules
verification controls
```

A second pre-runtime confidence matrix or manual baseline document would duplicate these semantics.

More importantly, a document claiming current per-host confidence values before the runtime surface exists would manufacture current runtime facts from design and violate R_PREP_NON_RUNTIME policy.

Therefore no additional document-only prep artifact is useful now.

---

## 30. Implementation stop point

Current status after this design:

```text
S-08 DESIGN = FROZEN
OPEN DESIGN QUESTIONS = 0
DOC APPLY CLASS = DOC_NOT_REQUIRED
RUNTIME IMPLEMENTATION = PARKED FOR STABILIZATION
```

No plugin/runtime implementation is authorized by this document.

---

## 31. Production boundary

This design changes repository memory only.

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
Host behavior        = UNCHANGED
history behavior     = UNCHANGED
provider claims      = UNCHANGED
v0.64.7 LIVE GATE    = STILL PENDING
```

---

## 32. Frozen verdict

```text
S-08 HISTORY FRONTIER CONFIDENCE SURFACE
= bounded claim-strength projection over existing Host/history topology evidence

CONFIDENCE
= claim-scoped evidence strength
!= probability
!= generic health
!= root-cause confidence

v1 layers
= FRONTIER
+ REGIME
+ SIMCORE_CONTRIBUTION
+ EXTERNAL_PROVENANCE
+ PROVIDER_CACHE

strength vocabulary
= DIRECT / SUPPORTED / WEAK / UNVERIFIED / UNAVAILABLE

new history scan
= FORBIDDEN

history/request mutation
= FORBIDDEN

provider inference
= FORBIDDEN

DOC APPLY
= DOC_NOT_REQUIRED

DESIGN FROZEN
→ STOP
```

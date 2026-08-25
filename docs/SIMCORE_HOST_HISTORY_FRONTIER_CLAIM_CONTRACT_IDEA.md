# SimCore Host-History Frontier Claim Contract — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · PRE_SIMCORE HISTORY-FRONTIER CLAIM CONTRACT · OBSERVE-ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_HOST_HISTORY_OBSERVATION_AUTHORITY_MAP_IDEA.md`
- `docs/SIMCORE_HOST_HANDSHAKE_ATTRIBUTION_CONTRACT_IDEA.md`
- `docs/SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Freeze what the recurrent long-chat request-prefix pattern may and may not mean:

```text
PRE_SIMCORE
+ CHAT_HISTORY
+ SAME_SLOT_CHANGED
+ stable host-prefix family
+ repeated compact predecessor signature
+ forward-moving first-change frontier
```

The existing v0.64.2 evidence establishes a real same-runtime recurrence. It does not establish an external root cause.

This contract defines:

```text
what PRE_SIMCORE means mechanically
what CHAT_HISTORY means mechanically
what SAME_SLOT_CHANGED means mechanically
how repeated-break signatures are scoped
when multiple samples may be treated as one observation regime
what "marching frontier" means
what REUSE_WINDOW_GROWING does and does not prove
what counts as a regime reset
what evidence would justify promotion beyond WATCH
```

This is observability / attribution research only.

It does not authorize:

```text
request/history rewriting
history normalization
compact-slot replacement
provider-cache inference
new full-history scans
new persistent history ledgers
host blame
M2 behavior changes
runtime optimization or repair
```

## 2. Source-grounded current behavior

Production authority remains `release-simcore` v0.64.7.

Current request-topology logic computes first-break attribution from already-built request signatures.

Conceptually:

```text
firstChangeIndex < runtimeIndex
→ owner PRE_SIMCORE

firstChangeIndex == runtimeIndex
→ owner SIMCORE_RUNTIME

firstChangeIndex > runtimeIndex
→ owner POST_SIMCORE
```

The break zone is positional:

```text
before shared leading-system boundary
→ HOST_PREFIX

before current-user position
→ CHAT_HISTORY

at current-user position
→ CURRENT_USER

at runtime block
→ SIMCORE_RUNTIME

later
→ POST_CURRENT_USER / equivalent later zone
```

Therefore:

```text
PRE_SIMCORE
```

means:

```text
the first locally observed difference occurs before the SimCore runtime block
```

It does not mean:

```text
a host subsystem is proven causal
```

Likewise:

```text
CHAT_HISTORY
```

means the first observed difference is positioned in the request's history region between the shared leading-system prefix and current user.

It is not a semantic claim about why that history representation differs.

## 3. `SAME_SLOT_CHANGED` mechanical meaning

Current topology classification distinguishes several structural shapes before falling back to `SAME_SLOT_CHANGED`:

```text
LIKELY_INSERTION
LIKELY_REMOVAL
ROLE_OR_KIND_CHANGED
SAME_SLOT_CHANGED
```

`SAME_SLOT_CHANGED` therefore means only:

```text
at the compared first-change position,
both requests have an entry,
role/kind did not trigger the stronger role/kind class,
and simple adjacent-signature insertion/removal heuristics did not explain the difference
```

It does not prove:

```text
an in-place durable chat edit
host mutation of one canonical history object
a model response rewrite
compaction
summarization
truncation
replacement by one particular subsystem
```

Preferred wording:

```text
same compared request slot changed signature
```

Avoid:

```text
host rewrote the message in place
```

unless separately proven.

## 4. Repeated-break signature authority

The current bounded repeated-break ledger tracks the `previousBreakSignature` for `CHAT_HISTORY` breaks within one location scope.

The signature is bounded identity evidence such as:

```text
role / kind / length / hash-derived signature
```

The known natural family repeatedly exposed:

```text
assistant/text 21:4a852496
```

as the compact predecessor signature.

Canonical rule:

```text
SAME SIGNATURE
= same bounded request-signature identity

SAME SIGNATURE
!= proof of same raw body instance
!= proof of same host object identity
!= proof of same durable chat turn
```

No raw history body should be retained merely to strengthen this identity.

## 5. Natural v0.64.2 recurrence

Same runtime generation:

```text
mt4bcgc3-5556z8
```

Observed sequence:

```text
C @2064       → first change @23 · seen 1
B_START @2066 → first change @25 · seen 2
B_CONT @2068  → first change @27 · seen 3
B_CONT @2070  → first change @29 · seen 4
B_CONT @2072  → first change @31 · seen 5
B_CONT @2074  → first change @33 · seen 6
B_CONT @2076  → first change @35 · seen 7
```

Across the captured family:

```text
break owner: PRE_SIMCORE
break zone: CHAT_HISTORY
shape: SAME_SLOT_CHANGED
previous compact signature: assistant/text 21:4a852496
Host prefix: STABLE · SAME_FAMILY
History alignment: OBSERVE_ONLY
History stabilization: OBSERVE_ONLY · persistent NONE
Representation correlation: NO_MATCH
Mutation attribution: NO_PROVENANCE_MATCH · LOW
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

Common-prefix chars increased:

```text
@23  83,732
@25  89,735
@27  94,649
@29 100,659
@31 105,702
@33 110,067
@35 118,558
```

This is the frozen positive specimen for a `MARCHING_FORWARD` history-frontier regime.

## 6. Claim layers

Keep four claim layers separate.

### Layer A — direct request comparison

Strong local claims:

```text
firstChangeIndex = N
previous/current bounded signatures differ at N
common prefix messages/chars = X/Y
```

### Layer B — positional attribution

Mechanical local claims:

```text
owner = PRE_SIMCORE
zone = CHAT_HISTORY
shape = SAME_SLOT_CHANGED
```

### Layer C — recurrence/regime claim

Requires multiple comparable samples:

```text
same bounded family characteristics
+ repeated signature and/or stable structural pattern
+ coherent frontier movement
```

### Layer D — causal/root-cause claim

Requires external or stronger provenance not currently available.

Examples currently unsupported:

```text
host compaction caused the frontier
context-window pruning caused the frontier
PocketRisu rewrote one historical assistant
provider cache strategy caused the frontier
SimCore caused the host to rebuild history differently
```

Do not collapse Layer C into Layer D.

## 7. Observation-regime key

For research comparison, define a conceptual bounded regime key.

```ts
{
  locationKey,
  runtimeGeneration,
  breakOwner,
  breakZone,
  mutationShape,
  previousBreakSignature,
  hostPrefixFamily,
  simcoreMutationClass
}
```

This is a research comparison key, not a required runtime schema.

Minimum same-regime expectations:

```text
same location/chat scope
same runtime generation for strongest claim
same PRE_SIMCORE owner
same CHAT_HISTORY zone
same structural mutation shape
same repeated predecessor signature when tracking the compact family
host prefix remains same family / no reset
SimCore request mutation remains NONE
```

Mode does NOT have to remain the same.

The v0.64.2 specimen crosses:

```text
C
→ B_START
→ B_CONTINUE
```

while preserving the same observed frontier family.

Therefore:

```text
MODE CHANGE
!= regime reset by itself
```

## 8. Cross-runtime comparison

A runtime-generation change weakens recurrence authority.

Canonical rule:

```text
same runtime generation
→ SAME_RUNTIME_REGIME evidence possible

new runtime generation
→ new cohort by default
```

A later generation may be classified as:

```text
CROSS_RUNTIME_FAMILY_MATCH
```

if bounded characteristics match, but it should not be silently merged into the same exact regime.

Reason:

```text
reload/plugin generation/host composition timing may change observation conditions
```

Cross-runtime similarity is useful recurrence evidence, not exact continuity proof.

## 9. Frontier-movement vocabulary

Use a small conceptual vocabulary for consecutive comparable samples.

```text
FRONTIER_BASELINE
FRONTIER_STABLE
FRONTIER_MARCHING_FORWARD
FRONTIER_REGRESSING
FRONTIER_COLLAPSED
FRONTIER_RESET
FRONTIER_NOT_COMPARABLE
```

These are research vocabulary; future runtime implementation is not authorized by this document.

### `FRONTIER_BASELINE`

No prior comparable sample in the cohort.

### `FRONTIER_STABLE`

The request signatures are stable or the same first-change frontier remains at the same bounded position without evidence of a reset.

### `FRONTIER_MARCHING_FORWARD`

For consecutive comparable samples:

```text
current firstChangeIndex > previous firstChangeIndex
```

and the surrounding regime remains coherent.

Increasing common-prefix chars/messages strengthens this classification.

Exact `+2 messages` movement is NOT required by contract.

The natural v0.64.2 run happened to move approximately two messages per request, but that is specimen shape, not protocol law.

### `FRONTIER_REGRESSING`

For comparable samples:

```text
current firstChangeIndex < previous firstChangeIndex
```

or reusable common-prefix extent materially shrinks without a full reset.

This is a stronger anomaly than the known marching-forward family and should be preserved separately.

### `FRONTIER_COLLAPSED`

The usable common prefix becomes zero/near-zero under the existing local topology definition.

Do not infer provider cache miss from this state.

### `FRONTIER_RESET`

A material cohort boundary invalidates direct marching comparison.

Potential reset evidence includes:

```text
host-prefix family reset
break zone changes away from CHAT_HISTORY
break owner changes
previous-break signature family changes materially
mutation shape changes materially
location/chat changes
runtime generation changes for strict same-runtime comparison
observer begins mutating request/history
```

Not every reset is a defect.

### `FRONTIER_NOT_COMPARABLE`

Required bounded metadata is missing or samples are not from a defensible comparison cohort.

Prefer this over inventing movement.

## 10. `MARCHING_FORWARD` is pattern evidence, not root-cause evidence

Freeze:

```text
FRONTIER_MARCHING_FORWARD
= observed reusable prefix boundary moved later in the request
```

It may support:

```text
prefix window did not progressively collapse
SimCore remained after the first observed break
same compact predecessor signature recurred at later positions
```

It does not prove:

```text
sliding-window truncation
context compaction
host summarization
provider prefix-cache reuse
provider cache hit
one specific host/history algorithm
```

Preferred causal wording remains:

```text
consistent with a moving host/history projection boundary
```

not:

```text
proves host sliding-window compaction
```

## 11. `REUSE_WINDOW_GROWING` authority

Current production computes local cache-effect wording from request-topology measurements.

Conceptually:

```text
frontier moved later
or common prefix chars/messages increased
→ REUSE_WINDOW_GROWING
```

Canonical meaning:

```text
the locally observable request common-prefix window grew between comparable samples
```

Explicitly NOT:

```text
provider cache hit
provider cached-token count grew
provider billing improved
Gemini reused exactly this prefix
```

Provider result remains:

```text
UNVERIFIED
```

unless authoritative provider/gateway receipt evidence is separately correlated.

## 12. Host-prefix stability role

`Host prefix: STABLE / SAME_FAMILY` is a useful negative discriminator.

It supports:

```text
the compared leading system-prefix sketch did not exhibit the known reset family
```

It does not prove:

```text
all upstream host composition was byte-identical
all hidden host state was stable
history construction was stable
```

Within the known compact history-frontier specimen, stable host-prefix family helps distinguish it from the separate `HOST_PREFIX @0 / family-reset` anomaly family.

Therefore:

```text
HOST_PREFIX_RESET
and
CHAT_HISTORY_MARCHING_FRONTIER
```

must remain separate observation families unless future evidence directly connects them.

## 13. SimCore negative attribution

For the current specimen, the following facts matter together:

```text
SimCore contribution = NOT_FIRST_BREAK
request mutation = NONE
history stabilization = OBSERVE_ONLY
persistent history mutation = NONE
Representation correlation = NO_MATCH
host prefix = SAME_FAMILY
```

These support a narrow conclusion:

```text
no observed SimCore request/history mutation explains the first break
```

They do not prove:

```text
SimCore can have no indirect influence anywhere upstream
```

A future SimCore-owned claim requires a direct causal bridge, such as:

```text
SimCore mutation occurs
→ affected request signature changes at that boundary
→ deterministic reproduction
```

Current evidence does not provide this.

## 14. Same signature + moving index

The known specimen has an unusual but useful shape:

```text
same compact predecessor signature
+ latest break index advances
```

Canonical interpretation:

```text
a bounded signature family is recurring at a moving request position
```

Do not interpret automatically as:

```text
the exact same source message is physically moved by host
```

That stronger claim requires host-side source identity or raw-provenance evidence not currently retained.

## 15. Recurrence strength levels

Use the following conceptual evidence levels.

```text
SINGLE_OBSERVATION
PAIRED_RECURRENCE
SAME_RUNTIME_SERIES
CROSS_RUNTIME_FAMILY_RECURRENCE
USER_VISIBLE_IMPACT_CORRELATED
CAUSAL_REPRODUCTION
```

### `SINGLE_OBSERVATION`

One request shows the family.

### `PAIRED_RECURRENCE`

Two comparable requests show the same bounded family.

### `SAME_RUNTIME_SERIES`

Three or more comparable samples in one runtime show coherent recurrence/movement.

The v0.64.2 @2064→@2076 series qualifies here.

### `CROSS_RUNTIME_FAMILY_RECURRENCE`

Later runtime generations independently reproduce matching bounded characteristics.

### `USER_VISIBLE_IMPACT_CORRELATED`

A user-visible correctness problem repeatedly coincides with the frontier family while controls without the frontier do not.

Not currently established.

### `CAUSAL_REPRODUCTION`

A deterministic mechanism reproduces the frontier and impact.

Not currently established.

## 16. Promotion from WATCH

Current classification remains:

```text
WATCH_ONLY
OBSERVABILITY
NO CORRECTNESS DEFECT ESTABLISHED
```

Promotion requires at least one strong new discriminator.

### Promotion A — user-visible correctness correlation

Repeated natural evidence shows:

```text
frontier family present
+ specific user-visible state/prompt correctness failure
+ healthy control family without the same failure
```

Then investigate the causal bridge before repair.

### Promotion B — SimCore-owned first break

Evidence changes to:

```text
first break = SIMCORE_RUNTIME
```

and is not explained by an expected declared runtime-prompt change.

This becomes a separate SimCore prompt-stability/correctness investigation.

### Promotion C — SimCore request/history mutation

A SimCore mutation path is directly observed and correlated with the frontier.

This would violate the current observe-only baseline and is high priority.

### Promotion D — host composition provenance

An authoritative host-side surface exposes exact provenance for the changed history representation.

Then external attribution may be narrowed accordingly.

### Promotion E — frontier regression/collapse with impact

The known growing regime changes into a recurrent shrinking/collapsed regime with material user impact.

This is a new evidence family, not automatically the same defect.

## 17. Non-promotion events

Do NOT promote merely because:

```text
the same compact signature is seen again
frontier moves by a different number of messages
mode changes C ↔ B
request grows larger
local cache integrity says DEGRADED
provider dashboard happens to show a low cached-token result on one turn
one cross-runtime sample resembles the family
host prefix remains stable
```

These may enrich evidence but do not establish a correctness defect or external owner.

## 18. Future natural-sample preservation

For future specimens, preserve only bounded evidence already available where possible:

```text
version / runtime generation
chat/location key or bounded digest
mode / request index
firstChangeIndex
common-prefix message count
common-prefix char count
request total messages/chars
break owner
break zone
mutation shape
previous/current bounded break signatures
repeated-break count / first/latest index
host-prefix family / reset status
frontier movement Δmessages / Δchars
cache-effect local classification
Representation correlation
SimCore request-mutation flag
history stabilization mode
user-visible correctness status
provider cache = UNVERIFIED unless authoritative receipt exists
```

Do not preserve raw full request/history bodies solely for this research.

## 19. Comparison procedure

When a new natural sample arrives:

```text
1. identify exact sample and nearest comparable predecessor
2. confirm location/chat scope
3. confirm runtime generation
4. compare break owner / zone / shape
5. compare predecessor signature family
6. check host-prefix family/reset status
7. check SimCore mutation/stabilization status
8. compute/inspect frontier movement
9. inspect user-visible correctness independently
10. classify regime before discussing cause
```

Only after these steps should attribution language be chosen.

## 20. Canonical classification examples

### Known v0.64.2 family

```text
HOST_HISTORY_FRONTIER
= SAME_RUNTIME_SERIES
= PRE_SIMCORE
= CHAT_HISTORY
= SAME_SLOT_CHANGED
= REPEATED_COMPACT_SIGNATURE
= FRONTIER_MARCHING_FORWARD
= REUSE_WINDOW_GROWING
= HOST_PREFIX_SAME_FAMILY
= SIMCORE_NOT_FIRST_BREAK
= OBSERVE_ONLY
= USER_VISIBLE_CORRECTNESS_IMPACT_NOT_ESTABLISHED
= PROVIDER_CACHE_UNVERIFIED
```

### Hypothetical stable frontier

```text
same cohort
same firstChangeIndex
same signature family
→ FRONTIER_STABLE
```

No defect implied.

### Hypothetical earlier break

```text
same cohort
firstChangeIndex moves backward
→ FRONTIER_REGRESSING
```

Preserve as new evidence; do not call it the existing marching regime.

### Hypothetical system @0 reset

```text
break zone HOST_PREFIX
host-prefix family RESET
→ FRONTIER_RESET / DIFFERENT FAMILY
```

Do not merge with the compact CHAT_HISTORY series.

## 21. Relationship to handshake attribution

Handshake attribution and history-frontier attribution share the Host/History authority map but are separate phenomena.

```text
Handshake miss
= activation marker absent from scanner result for one request

History frontier
= bounded difference between consecutive request-history representations
```

No evidence currently proves that the v0.64.2 handshake miss and compact history-frontier series share one cause.

Do not create a combined `HOST_GLITCH` family.

## 22. Relationship to cache research

The history frontier is useful request-prefix evidence, but broad Gemini cache research remains paused/closed pending authoritative receipt evidence.

Canonical separation:

```text
Host-History Frontier
= where local request representations first differ

Provider Cache Outcome
= what Gemini/gateway actually reused
```

`REUSE_WINDOW_GROWING` is local structural opportunity/effect telemetry only.

Do not reopen broad cache architecture from this contract.

## 23. Relationship to M2-3

M2-3 Edit Reconcile ownership work remains separate.

This contract must not alter:

```text
Edit Reconcile decision semantics
Representation taxonomy
Runtime Mirror safety
SnapshotStore state
request/output sequencing
```

The known frontier is a frozen observability control while M2-3 moves ownership mechanically.

If M2-3 changes topology diagnostics accidentally, preserve and compare the existing specimen before treating the difference as intentional.

## 24. Runtime-cost boundary

No new runtime cost is authorized.

Default:

```text
reuse existing request signatures
reuse existing first-change topology
reuse existing repeated-break ledger
reuse existing frontier movement probe
reuse existing host-prefix sketch
reuse existing observe-only stabilization facts
zero second full-history scan
zero raw history retention
zero new pluginStorage history state
zero timers/polling
zero request mutation
```

A new discriminator must first prove that the current bounded evidence cannot answer a concrete promoted question.

## 25. Current conclusion

```text
SIMCORE_HOST_HISTORY_FRONTIER_CLAIM_CONTRACT
= SOURCE-GROUNDED
= RECURRENCE ESTABLISHED
= SAME-RUNTIME MARCHING-FORWARD POSITIVE SPECIMEN EXISTS
= FIRST BREAK != ROOT CAUSE
= PRE_SIMCORE != HOST DEFECT
= SAME_SLOT_CHANGED != DURABLE IN-PLACE EDIT
= SAME SIGNATURE != SAME RAW OBJECT
= REUSE_WINDOW_GROWING != PROVIDER CACHE HIT
= OBSERVE_ONLY
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```

Current evidence classification:

```text
HOST_HISTORY_PREFIX_BREAK / COMPACT_ASSISTANT_SIGNATURE
= WATCH
= RECURRENT OBSERVABILITY FAMILY
= EXTERNAL OWNER UNESTABLISHED
= USER-VISIBLE CORRECTNESS DEFECT NOT ESTABLISHED
= M2 BLOCKER NO
```

## 26. Recommended next slice

After this contract, do not invent a host-history repair.

The highest-value next research slice is one of:

```text
A. Host Observation Recurrence Matrix
   → compare handshake miss vs history-frontier specimens without assuming shared cause

B. Host/History Resilience Completeness Check
   → audit Authority Map + Handshake Contract + Frontier Contract and decide whether broad research can pause
```

Because the current history-frontier family already has a strong same-runtime series but no correctness impact, preference should be:

```text
HOST OBSERVATION RECURRENCE MATRIX
```

only if it can reuse existing evidence without new runtime instrumentation.

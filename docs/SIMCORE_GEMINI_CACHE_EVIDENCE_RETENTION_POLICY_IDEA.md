# SimCore Gemini Cache Evidence Retention Policy — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · BOUNDED CACHE EVIDENCE RETENTION · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one bounded retention policy for cache-relevant evidence so extremely long chats do not accumulate an unbounded telemetry archive while still preserving enough provenance for:

```text
late receipt correlation
baseline recomputation
active Sentinel incidents
correction / supersession handling
regime-boundary forensics
repo-level long-term evidence
```

The policy answers:

```text
Which cache evidence must remain live?
Which evidence can be compacted?
Which evidence can be dropped?
Which retention condition is time-based, count-based, dependency-based, or state-based?
What must survive a reload?
What must never be retained at all?
```

This is an observability-retention contract only. It is not semantic Core state and is not a cache controller.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Retention policy may preserve bounded cache telemetry. It must never:

```text
write or rewrite model prose
rewrite chat history
change prompt placement
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Retention must not create prompt bytes, renderer work, or semantic SnapshotStore authority.

## 3. Core decision — no universal TTL

Do not apply one global rule such as:

```text
all cache evidence expires after N minutes
```

Different evidence exists for different reasons.

Preferred model:

```text
TIME-BOUND
COUNT-BOUND
DEPENDENCY-BOUND
STATE-BOUND
SUMMARY-PERSISTENT
```

A retention class may combine more than one bound.

Examples:

```text
pending receipt
→ time/horizon bound

baseline samples
→ count/window bound

active incident evidence
→ state bound until incident closes

correction lineage
→ dependency bound until affected consumers are reconciled

confirmed regime history
→ summary-persistent, heavily compacted
```

The policy should minimize retained rawness first, not merely minimize object count.

## 4. Existing reload TTLs are local contracts, not global policy

A TTL used by an existing specific mechanism must not silently become the retention rule for all future cache evidence.

For example, v0.64.7 cross-reload telemetry continuity currently uses a bounded handoff TTL for that observer capsule.

That means only:

```text
that continuity capsule
= valid for its own bounded handoff window
```

It does not mean:

```text
all provider receipts
all baseline samples
all incidents
all correction evidence
all regime history
```

must use the same TTL.

Every retention horizon must be justified by the evidence role it serves.

## 5. Retention tiers

Initial conceptual tiers:

```text
R0_EPHEMERAL_RAW
R1_PENDING_CORRELATION
R2_ACTIVE_SAMPLE_WINDOW
R3_ACTIVE_INCIDENT
R4_CORRECTION_LINEAGE
R5_REGIME_SUMMARY
R6_REPO_EVIDENCE
```

These are policy classes, not storage backends.

### R0_EPHEMERAL_RAW

Raw or highly linkable material needed only momentarily for parsing/correlation.

Examples:

```text
raw gateway row
raw requestId when unavoidable
raw provider payload fragment
```

Policy:

```text
retain as briefly as possible
normalize/extract bounded fields
then discard
```

Never retain raw prompt bodies, chat history, user text, assistant text, or full gateway logs merely for cache analysis.

### R1_PENDING_CORRELATION

Bounded metadata for a local request whose provider receipt has not yet been defensibly matched.

Examples:

```text
localEvidenceId
requestIdentityDigest when available
request family
bounded timestamps/window
model family
input-token hint when authoritative
compatibility descriptor digest
```

Retention ends when one of these occurs:

```text
exact/accepted correlation completed
correlation becomes ambiguous and no further resolution path exists
correlation horizon expires
sample is otherwise invalidated/superseded
```

The exact horizon must be measured from real gateway/log latency. Do not freeze a magic number at idea stage.

### R2_ACTIVE_SAMPLE_WINDOW

Trusted or diagnostically relevant cache samples needed by the current Baseline Profile and recent request analysis.

Policy:

```text
bounded rolling window
+ sample identity / revision
+ compact provider metrics
+ compatibility identity
+ verdict/admission refs
```

Retention should be count/window based rather than lifetime-per-chat.

When a sample falls outside every active consumer window and has no unresolved correction dependency, it may be compacted or retired.

### R3_ACTIVE_INCIDENT

Evidence supporting an active Sentinel temporal state:

```text
CANDIDATE
PERSISTENT
RECOVERY_PENDING
EVIDENCE_GAP
```

Policy:

```text
retain the minimum bounded evidence needed to replay the active transition state
```

An incident must not be forgotten merely because its oldest sample has aged out of the ordinary baseline window.

After closure, keep only a compact incident summary if future regime/correction logic still needs it.

### R4_CORRECTION_LINEAGE

Evidence required to explain or repair a superseded sample/verdict/baseline contribution.

Policy is dependency-bound:

```text
retain correction edge
until all affected live consumers have either:
- recomputed,
- invalidated,
- rebuilt,
- or recorded a compact supersession summary
```

Do not delete the old revision first and then discover that Baseline/Sentinel still depends on it.

Do not retain the full old payload merely because the correction edge survives.

### R5_REGIME_SUMMARY

Confirmed or historically useful `CACHE_REGIME` boundaries.

Policy:

```text
small summary may survive far longer than individual samples
```

Retain only bounded metadata such as:

```text
regime id
previous regime id
compatibility population identity
baseline-before summary
baseline-after summary
transition class
Cache ABI/model-family evidence
classification / correction state
repo evidence ref when promoted
```

The Regime Ledger must remain tiny relative to chat length.

### R6_REPO_EVIDENCE

High-value findings promoted into GitHub according to normal SimCore evidence discipline.

Examples:

```text
confirmed regression
important dismissed false positive
new regime boundary relevant to engineering
cache optimization experiment result
provider/gateway contract discovery
```

GitHub remains the long-term human/design evidence authority.

Runtime telemetry is not a substitute for repo evidence.

## 6. Rawness hierarchy

Prefer preserving the least sensitive and least expensive representation that still supports the required claim.

Conceptual hierarchy:

```text
raw provider/log/request material
↓ normalize immediately
bounded typed evidence fields
↓ derive when possible
fingerprints / digests / counts / enums
↓ compact after closure
incident/regime summary
↓ promote only meaningful findings
repo evidence
```

Do not move upward again after compaction by reconstructing raw content from hidden caches or persistent snapshots.

## 7. Consumer pins

A sample/evidence node may not be retired while a live consumer still depends on it.

Potential consumer pins:

```text
PENDING_CORRELATOR
BASELINE_WINDOW
ACTIVE_SENTINEL_INCIDENT
VERDICT_REEVALUATION
CORRECTION_REBUILD
REGIME_CANDIDATE
DIAGNOSTIC_EXPANSION
```

Conceptual rule:

```text
retire eligible
only when
all required pins are released
```

Pins must be bounded and typed. Do not implement general reference-counting across arbitrary objects unless evidence shows that complexity is required.

## 8. Baseline retention

Baseline Profile is a rolling statistical owner, not a historical archive.

Therefore:

```text
current compatible healthy window
→ retain compact samples / sufficient recomputation data

older compatible samples outside bounded window
→ drop unless pinned by correction/incident/regime work
```

If the chosen statistics cannot safely remove a superseded sample incrementally, retain enough bounded recent sample data to rebuild the baseline rather than storing an unbounded lifetime history.

Never solve correction difficulty by keeping every request forever.

## 9. Incident retention

Sentinel needs enough recent compatible verdict history to evaluate persistence/recovery, but not the entire chat.

Rules:

```text
active incident
→ keep bounded transition-supporting sample refs

incident closed as transient
→ compact to small close summary or discard if no forensic value

incident closed with meaningful WATCH/FIX/EXTERNAL conclusion
→ compact summary + evidence refs
→ preserve significant result in repo when warranted
```

One closed incident must not leave behind all constituent provider receipts forever.

## 10. Evidence gaps and pending receipts

`PENDING` is not permission for indefinite retention.

A pending correlation record should eventually become:

```text
CORRELATED
AMBIGUOUS
UNMATCHED
EXPIRED_UNVERIFIED
SUPERSEDED
```

and release its pending-retention pin.

The exact correlation horizon should be based on measured gateway/log arrival behavior and may differ from reload continuity TTL.

A later receipt arriving after the ordinary pending horizon should not silently resurrect a retired sample as if nothing happened.

Possible future behavior:

```text
late receipt after retirement
→ create bounded correction/late-evidence event
→ re-evaluate only if sample identity can be proven and relevant dependent state still exists
→ otherwise preserve as diagnostic-only / repo research evidence
```

Exact semantics require fixture-driven design.

## 11. Reload retention

Reload continuity may carry only the minimum state needed to resume bounded work.

Potential carryover:

```text
small pending-correlation capsule
active incident summary
baseline compact state/window identity
sample revision identities needed for idempotency
```

Do not carry:

```text
raw prompt bodies
full gateway rows
large per-request archives
unbounded historical samples
```

Reload must not upgrade evidence quality.

```text
HEURISTIC before reload
→ HEURISTIC after reload
```

unless genuinely new authoritative evidence arrives.

## 12. Correction and supersession retention

Corrections must preserve history without preserving unnecessary payload.

Example:

```text
sample S42 revision 1
→ baseline consumed

revision 2 proves correlation was wrong
```

Required durable relationship while repair is active:

```text
S42/r1 SUPERSEDED_BY S42/r2
affected consumers:
- baseline
- verdict
- sentinel transition
```

After consumers are reconciled, compact to:

```text
sample identity
old revision id
new revision id
correction reason code
rebuild/revocation outcome
```

rather than retaining the entire original evidence bundle.

## 13. Regime retention

Regime history is the intentional long-lived runtime summary layer.

Because regimes are rare compared with requests:

```text
request samples = aggressively bounded
regime summaries = comparatively durable
```

Still, do not let candidate regimes accumulate indefinitely.

Candidate lifecycle:

```text
CANDIDATE
→ CONFIRMED
or REJECTED
```

Old rejected candidates may be compacted heavily unless they explain a recurring false positive or important forensic event.

Confirmed/superseded regimes may be retained as a small ordered history.

## 14. Repo promotion boundary

Runtime evidence should not be treated as permanent simply because it is interesting.

Use normal SimCore evidence discipline:

```text
meaningful live anomaly/finding
→ preserve in repo
→ classify WATCH / DEFER / FIX / BLOCKER / DISMISS as appropriate
```

Once the durable engineering conclusion exists in GitHub, runtime retention may compact the detailed evidence if no live consumer still needs it.

The repo stores the engineering history; runtime stores only what ongoing computation requires.

## 15. Memory-pressure behavior

Retention policy must fail toward less telemetry, never toward correctness damage.

If telemetry pressure exceeds the intended bound:

```text
1. drop/compact expired diagnostic-only samples
2. compact closed incidents
3. trim oldest unpinned baseline samples
4. compact rejected/superseded correction detail
5. preserve active incident / pending exact-correlation / current baseline essentials
```

Never respond to memory pressure by:

```text
weakening semantic state
changing prompt content
skipping core validation
rewriting history
changing renderer behavior
```

If bounded cache observability cannot be maintained safely, cache evidence should become partially `UNVERIFIED` rather than harming core runtime behavior.

## 16. Deterministic compaction

Compaction should be deterministic and replay-testable.

Conceptual:

```text
compactCacheEvidence(record, retentionContext)
→ compactRecord | DROP
```

Avoid compaction decisions based on:

```text
randomness
unordered object traversal
wall-clock access hidden inside pure reducers
provider network access
```

Time may be an input fact, but it should be explicit and testable.

## 17. Suggested retention reason codes

Candidate vocabulary:

```text
RET_PENDING_CORRELATION
RET_BASELINE_WINDOW
RET_ACTIVE_INCIDENT
RET_CORRECTION_DEPENDENCY
RET_REGIME_SUMMARY
RET_REPO_PROMOTION_PENDING

DROP_EXPIRED_PENDING
DROP_OUTSIDE_BASELINE_WINDOW
DROP_CLOSED_TRANSIENT_INCIDENT
DROP_UNPINNED_DIAGNOSTIC
COMPACT_CORRECTION_RESOLVED
COMPACT_REGIME_HISTORY
KEEP_ACTIVE_DEPENDENCY
KEEP_IDEMPOTENCY_KEY
```

Reason codes explain retention decisions and make Conformance fixtures readable.

## 18. Conformance Matrix integration

Future Cache Conformance Matrix rows should cover at least:

```text
1. raw gateway row normalized then discarded
2. pending receipt retained before correlation horizon
3. expired pending sample releases correlation pin
4. old baseline sample drops when outside window and unpinned
5. active incident sample survives ordinary baseline eviction
6. closed transient incident compacts
7. correction keeps supersession edge until all affected consumers reconcile
8. reconciled correction drops old heavy payload but preserves compact lineage
9. confirmed regime survives request-sample eviction as small summary
10. rejected regime candidate does not accumulate forever
11. reload preserves bounded idempotency/pending metadata only
12. reload never upgrades HEURISTIC evidence
13. memory pressure drops diagnostic telemetry before active/core-critical observability
14. no raw prompt/chat text is retained
15. provider evidence loss degrades cache observability to UNVERIFIED, never core correctness
16. same retention input produces deterministic decision
```

## 19. No exact global numbers yet

Do not freeze arbitrary values at idea stage for:

```text
pending receipt minutes
baseline window sample count
incident retained sample count
number of regime summaries
correction retention horizon
```

These should be measured using real long-chat behavior and gateway/log latency.

The design freezes the retention semantics first; numerical bounds come from evidence later.

## 20. Non-goals

```text
full telemetry warehouse
per-turn permanent cache archive
raw prompt logging
full gateway log persistence
semantic SnapshotStore expansion
explicit Gemini cache lifecycle management
provider cache TTL management
renderer changes
prompt rewriting
history rewriting
new network observer
```

## 21. Target relationship

```text
Cache Sample Lifecycle
= what state/revision/use phase a sample is in

Cache Evidence Retention Policy
= how long each part of that sample/provenance is allowed to survive and why

Baseline Profile
= owns current statistical window

Sentinel / Transition Model
= own current short-horizon incident semantics

Regime Ledger
= owns compact long-horizon cache history

GitHub main
= owns durable engineering/design evidence
```

## 22. Current classification

```text
GEMINI_CACHE_EVIDENCE_RETENTION_POLICY
= HIGH VALUE FOR EXTREME LONG CHATS
= MEMORY / PRIVACY BOUNDARY
= TIME + COUNT + DEPENDENCY + STATE BOUNDED
= COMPACTION-FIRST
= FAILS TOWARD UNVERIFIED TELEMETRY, NOT CORE DEGRADATION
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
```

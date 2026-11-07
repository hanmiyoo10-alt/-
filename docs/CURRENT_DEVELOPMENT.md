# SimCore Current Development Memory

> Living operational memory for SimCore.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file is the **continuity document for active development**: current production state, immediate next release, major roadmap, evidence ledger, deferred work, hard freezes, unknowns, and completed milestones.
>
> A new conversation should be able to read this file and answer four questions quickly:
>
> 1. What is production now?
> 2. What are we doing next, and why?
> 3. What larger work is planned after that?
> 4. What must not be changed without new evidence?

---

<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.70.11`
- Release: `Operator Release Card Metadata Repair`
- Release branch: `release-simcore`
- Release commit: `01769eb6db7244e3682bb8ba6001d89aea4e0ed8`
- Release blob: `a1721dcdd9a34f3398c0c5899e8981ba1143ead4`
- Declared validation status: `LIVE_PASS`
- Major update milestone: `2.0M`
- Major update phase: `M2`
- Major update checkpoint: `M2-6`

This block is machine-managed from verified declared release state. It does not determine the immediate next action.
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->

<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:BEGIN -->
## Current Release Terminal State

- Release transaction: `simcore-v0.70.11-new-03`
- Production commit: `01769eb6db7244e3682bb8ba6001d89aea4e0ed8`
- Validation status: `LIVE_PASS`
- Current priority: `POST_07011_NEXT_STEP_REVIEW`
- Terminal disposition: `LIVE_PASS`
- R lifecycle: `REAL_RELEASE_LIVE_PASS`

This block is the terminal administrative state backed by accepted real long-chat evidence and production reobservation.
<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:END -->

---

# 1. Current Operational State

## How to read current operational state

The machine-managed blocks above are authoritative for current production identity, validation status, and terminal release state. For active work after a terminal handoff, `product-manifest.json` is the machine-readable current operational-priority authority; the terminal block's `Current priority` records the handoff selected by the terminal evidence transaction. Human-authored sections below record interpretation, historical evidence, constraints, and follow-up decisions; they do not override machine authority.

The machine-managed blocks and `product-manifest.json` above own the mutable current release identity, terminal validation, and operational priority. Their terminal handoff does not by itself authorize a new runtime release, feature, architecture change, or performance optimization. Independent runtime, performance, cache, and other anomaly lanes remain owned by their separate repository records and must be freshly read before promotion. Provider cache remains `UNVERIFIED`.

## Historical validated precursor — v0.63.55

This marker remains in the living document because current SimCore closure/state-sync tooling uses it as the boundary after active human current-state prose.

Full point-in-time release/evidence detail has rolled over to:

- `docs/history/SIMCORE_RELEASE_HISTORY_063.md`

The still-operative regression residue is intentionally compact here:

```text
known exact prior Fresh carryover
→ may use the proven representation fast-reconcile path

genuine user edit evidence
→ must preserve manual-edit rebuild semantics

ambiguous / stale / third-representation evidence
→ fail safe; do not broaden the fast path
```

Historical production identities, timings, incidents, and old next-action prose in the history file are evidence only and do not override the machine-managed current blocks above.

---

# 2. Historical Validation Release Ledger

Detailed point-in-time release contracts have rolled over by release family:

- `0.64.x` → `docs/history/SIMCORE_RELEASE_HISTORY_064.md`
- `0.63.x` → `docs/history/SIMCORE_RELEASE_HISTORY_063.md`

These files are historical evidence/navigation only. They do not own current production, validation, priority, or authorization.


# 3. Major Roadmap

The roadmap records intended future work so it survives long chats and conversation changes. It is **directional, not a promise**: production evidence may reorder phases.

## Phase A — Representation & Edit Reconcile

**Exact Fresh-carryover exit condition satisfied; behavior is now frozen as an M2 regression control.**

Objectives:

- eliminate false `MANUAL_EDIT_REBUILT` caused by confirmed host/Fresh representation carryover;
- retain strict detection of genuine user edits;
- keep output-side Deferred Mirror conservative;
- make provenance sufficient to distinguish canonical identity, Fresh identity, user edits, and ambiguous bodies.

Planned work:

- **A1 / v0.63.55:** Representation Fast Reconcile — deployed and real long-chat validated in runtime `mt1g8kbx-3qd6s0`.
- **A2:** If needed, improve representation-drift diagnostics for cases that do not exactly match a known Fresh fingerprint.
- **A3:** Only after repeated evidence, consider whether specific `SILENT_COMPAT` representation families deserve their own narrowly proven output-side reconcile. Do not infer this from the `-80` case alone.

Exit condition:

- confirmed Fresh carryover no longer causes multi-second manual-edit rebuilds;
- real user edits still rebuild correctly;
- ambiguous representation changes still fail safe.

## Phase B — Envelope & Structural Compatibility

Objectives:

- finish real-world validation of v0.63.53/v0.63.54 special recovery paths;
- isolate genuinely independent Structure / COMMUNITY failures instead of conflating them with envelope representation drift.

Existing work:

- v0.63.53 `Boundary-Normalized Envelope Recovery` exists for compatible unresolved Thoughts suffixes.
- v0.63.54 `Safe-Envelope Structural Boundary Reconcile` exists for one exact known structural LF variant after `SAFE_ENVELOPE_COMPAT` acceptance.

Future trigger conditions:

- if `BOUNDARY_CONFIRMED_SUFFIX` or `SAFE_BOUNDARY_CONFIRMED` naturally fires, record the exact following-turn behavior;
- if recovery succeeds but COMMUNITY warnings remain, promote **Community Structural Compatibility** as an isolated release target;
- if recovery repeatedly fails with a stable small delta, add diagnostics before broadening normalization.

Do not schedule a structural compatibility release merely because one warning appears.

## Phase C — Request Latency Reduction

Begin only after Phase A removes false rebuild noise.

Known latency buckets to investigate independently:

```text
Edit reconcile false rebuild     confirmed 4–6+ s class
Turn storage                     commonly hundreds of ms; occasionally ~1 s
Session / character cold init    occasional hundreds of ms
Deferred mirror setChat          off critical path but can occasionally exceed 1 s
```

Goals:

- separate host/storage variance from SimCore computation;
- optimize only bottlenecks that are repeatedly attributable to SimCore;
- preserve correctness before chasing small millisecond gains.

Do not treat model generation time as SimCore request-preparation latency.

## Phase D — Provider Cache Investigation

Status: **EVIDENCE BLOCKED**.

What is known:

- local reusable-prefix telemetry is not authoritative provider cache telemetry;
- externally observed cache hit/miss can diverge from SimCore's local prefix model;
- rolling chat-history frontier movement does not imply a provider miss;
- representation mismatch, manual rebuild, and mode switch are not sufficient explanations for cache hit/miss by themselves;
- host system0 has shown both stable-family behavior and reset-correlated changes.

Recent useful host-prefix event:

```text
system0 301057:305d2968
→ 308014:1e3d66da
Δchars +6957
family 2cd672fc → fa691663
shape INSERTION_LIKE
cache topology → PREFIX_COLLAPSE @0
SimCore contribution NOT_FIRST_BREAK
```

This is valuable host telemetry but must remain separate from representation reconcile work.

Resume cache engineering only when authoritative provider evidence becomes available, preferably cached-token metadata/counts from the host/provider layer.

Until then:

```text
provider cache UNVERIFIED
History stabilization OBSERVE_ONLY
no cache request-logic changes
```

## Phase E — Runtime Architecture Hardening

Longer-term maintenance work after current correctness/latency issues settle.

Potential areas:

- long-chat state-size growth and storage cost;
- reload/session handoff durability;
- stale callback/drop guarantees under prolonged runtimes;
- provenance-ledger boundedness;
- product-specific state ownership as repository isolation matures;
- diagnostic size/retention discipline.

Any architecture change must preserve the current no-raw-body-retention principle unless explicitly justified.

---

# 4. Deferred / Waiting for Evidence

Items stay here when they are plausible but not justified enough to schedule.

## v0.63.54 special-path validation

Waiting for a natural:

```text
THOUGHTS_COMPAT
STRIPPED
SAFE_ENVELOPE_COMPAT
CANONICAL != FRESH
exactly one known structural-LF variant == FRESH
```

Desired evidence:

```text
Safe-envelope reconcile: CONFIRMED
policy SAFE_BOUNDARY_CONFIRMED
confirmation FRESH_EXACT
Deferred mirror COMMITTED

next request:
Prior representation EXACT
SAME_FAST
Edit origin NONE
```

Until observed, classify v0.63.54 special recovery as `NOT_EXERCISED`, not failed.

## v0.63.53 unresolved suffix validation

Waiting for a natural unresolved compatible response suffix where exact Fresh confirmation fails but a bounded CR/LF-only suffix variant matches.

Desired evidence:

```text
Envelope recovery: RECOVERED
policy BOUNDARY_CONFIRMED_SUFFIX
confirmation FRESH_EXACT
```

Do not force malformed output just to exercise it.

## Community Structural Compatibility

Possible independent issue seen historically:

```text
COMMUNITY blocks 1/2
platform sections 6/3
separator mismatch
state quarantine
```

Promotion trigger:

- envelope representation is proven recovered/exact;
- the same structural warning persists independently.

Until then, do not weaken Structure acceptance or COMMUNITY quarantine.

## SILENT_COMPAT output mismatch family

A natural `SILENT_COMPAT` output produced:

```text
CANONICAL 4180
FRESH 4100
Δ -80
```

The next request proved exact Fresh carryover, but this does **not** identify what changed inside the output. v0.63.55 may safely eliminate the next-turn false rebuild without claiming the output-side `-80` cause is understood.

Do not add SILENT_COMPAT normalization until repeated evidence identifies a deterministic, bounded representation rule.

---

# 5. Current Hard Freeze

Unless a future production diagnostic provides direct contrary evidence, do not modify these while working on the current phase:

```text
Broadcast End Authority
Broadcast lifecycle / modes
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
compiler tiers
Deferred Mirror strict output gates
History stabilization OBSERVE_ONLY
Host Prefix Attribution
Cache trajectory
provider cache UNVERIFIED
persistent schema
network / timers / provider routing
raw-body retention policy
```

Edit Origin Attribution itself is **not** frozen against a narrowly proven fast-reconcile extension, but its genuine-user-edit semantics are frozen.

---

# 6. Verified Evidence Ledger

The detailed `E-LIVE-055` / `E1`–`E7` point-in-time evidence has rolled over to:

- `docs/history/SIMCORE_RELEASE_HISTORY_063.md`

Use that file for historical reproduction/timing evidence. Current decisions still require fresh authority and current evidence; archive recency does not imply current truth.

---

# 7. Known Unknowns

- Exact host transformation that produced the `SILENT_COMPAT` `-80` body difference.
- Whether v0.63.54's `SAFE_BOUNDARY_CONFIRMED` path will naturally occur in long chat.
- Whether v0.63.53's `BOUNDARY_CONFIRMED_SUFFIX` path will naturally occur again.
- Whether historical COMMUNITY grouping warnings are independent after successful representation recovery.
- Authoritative provider cache hit/miss and cached-token counts.
- Why host system0 occasionally receives large reset-correlated insertions; current evidence says SimCore is not the first break.
- How much turn-storage and cold-init latency is optimizable versus host/environment variance after false edit rebuilds are removed.

Unknown means **do not silently fill the gap with a broader heuristic**.

---

# 8. Roadmap Governance Rules

These rules exist specifically so future long conversations do not lose development intent or accidentally broaden a release.

1. **Roadmap is intent, not a promise.** Production diagnostics may reorder phases.
2. **One release should solve one narrowly scoped problem whenever possible.** Adjacent discoveries go to the roadmap/deferred sections instead of being bundled automatically.
3. **Evidence promotes work.** A candidate moves from Deferred → Immediate Next only when production evidence is strong enough to define a safe gate and a measurable success condition.
4. **A safe non-match is not a regression.** Special recovery paths may remain `NOT_APPLICABLE` until their exact condition occurs naturally.
5. **Do not erase failed hypotheses.** Record why they were rejected so a later conversation does not repeat them.
6. **Do not infer provider behavior from local proxies.** Provider cache stays `UNVERIFIED` without authoritative telemetry.
7. **Preserve positive controls.** Every optimization of edit/reconcile behavior must keep the known genuine-user-edit case correct.
8. **Fresh is evidence, not an untrusted body source.** Prefer exact fingerprints/provenance; do not start retaining or copying raw Fresh bodies merely for convenience.
9. **After every production release:**
   - refresh Current Operational State;
   - promote or replace Immediate Next;
   - move completed work into Completed Major Milestones;
   - record new evidence in the Verified Evidence Ledger;
   - move unsupported ideas to Deferred / Waiting for Evidence;
   - review Hard Freeze explicitly.
10. **Before a new major phase:** read this document first and reconcile it with the latest production diagnostic instead of relying on chat memory alone.

---

# 9. Completed Major Milestones

Detailed `v0.63.52`–`v0.63.55` milestone history has rolled over to:

- `docs/history/SIMCORE_RELEASE_HISTORY_063.md`

The broader repository/infrastructure pointers below remain here for a later separately reviewed modularization pass.

## Repository Product Root Isolation — Phase 1

The repository now has explicit product ownership roots while preserving compatibility runtime paths:

```text
products/simcore/
products/usage-dashboard/
```

Main-writing workflows use the shared `repo-main-write` concurrency contract where applied. Runtime/install paths were intentionally not relocated in phase 1.

---

## Historical infrastructure plan — Release System v2

Status: **SUPERSEDED BY ACTIVE R v2 / R2.1 IMPLEMENTATION · HISTORICAL PLAN POINTER**

Canonical plan:

- [SIMCORE_RELEASE_SYSTEM_V2_PLAN.md](./SIMCORE_RELEASE_SYSTEM_V2_PLAN.md)

This subsection preserves the original infrastructure-plan pointer as historical continuity. Release System v2 has since executed the first genuine v0.64.7 publication, and R2.1 delegated operation is now implemented and permanent-CI qualified. Its remaining operational proof is intentionally deferred to the next genuine runtime release after the current v0.64.7 real-long-chat gate. Do not use this historical subsection to override the Current Operational State or Quick Resume action.

---

# 10. Quick Resume Checklist

When continuing development in a new conversation:

```text
1. Read Current Production Snapshot.
2. Read Current Operational State.
3. Read the current priority from the manifest and terminal release-state block.
4. Check whether newer production diagnostics change the evidence.
5. Check Hard Freeze before editing code.
6. Perform only the promoted review, design, or separately authorized implementation scope.
7. After any release or administrative convergence, update this file again.
```

Current promoted next action:

```text
Review `POST_07011_NEXT_STEP_REVIEW` against fresh repository authority before promoting any next SimCore transaction.
Preserve v0.70.11 `LIVE_PASS` and the closed #2006 PR_RECOVERY projection contract unless new independent evidence contradicts them.
Do not infer or invent a next runtime version, feature, architecture change, or optimization from terminal convergence alone.
Fresh-read independent runtime, performance, cache, and anomaly issue lanes before deciding which one, if any, is legally promotable.
Any runtime change still requires its own design/evidence record, implementation branch, CI, release-simcore deployment, real long-chat validation, and main continuity synchronization.
```

Current bounded state:

```text
production identity = 0.70.11 / 01769eb6db7244e3682bb8ba6001d89aea4e0ed8 / a1721dcdd9a34f3398c0c5899e8981ba1143ead4
validation = LIVE_PASS
R lifecycle = REAL_RELEASE_LIVE_PASS
current priority = POST_07011_NEXT_STEP_REVIEW
accepted HUMAN_EVIDENCE = products/simcore/releases/live-evidence/simcore-v0.70.11-new-03.json
R2.8 terminal convergence = PASS / run 34547337280 attempt 3
#2006 PR_RECOVERY verifier projection = FIX RESOLVED / CLOSED CONTRACT
provider cache = UNVERIFIED
latest.js == install.js = mandatory / verified

next legal administrative path
→ review POST_07011_NEXT_STEP_REVIEW against fresh repository authority
→ choose at most one separately authorized next transaction
→ do not infer a next runtime version from LIVE_PASS alone

runtime work
→ no runtime change is authorized by this terminal administrative convergence
→ fresh-read each independent runtime/performance/anomaly issue before promotion
→ any runtime change requires its own design/evidence, work branch, CI, release-simcore deployment, real long-chat validation, then main documentation/continuity synchronization

observed anomaly
→ preserve evidence immediately
→ classify WATCH / DEFER / FIX / BLOCKER
→ keep unrelated topics in separate repository records
```

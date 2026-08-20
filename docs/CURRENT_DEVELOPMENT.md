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

<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.55`
- Release: `Representation Fast Reconcile`
- Release branch: `release-simcore`
- Release commit: `6156685a3edf0ec0c5017900a82990d4f17dfb49`
- Release blob: `8c42851df34831465403d12fc57c7499923bdbc6`
- Validation status: `VALIDATED_REAL_LONG_CHAT`
- Primary optimization target: `2M_MAJOR_M2_MECHANICAL_BOUNDARY_REFACTOR`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->

---

# 1. Current Operational State

## Production verdict

`v0.63.55` is the current production release. Static release gates passed and the request-side Representation Fast Reconcile has now passed real long-chat validation.

Observed in runtime `mt19j4wz-2a7t5e`:

```text
C                  → EXACT · mirror COMMITTED
B_START            → SAFE_ENVELOPE_COMPAT · EXACT · mirror COMMITTED
B_CONTINUE         → SAFE_ENVELOPE_COMPAT · EXACT · mirror COMMITTED
B_CONTINUE         → SAFE_ENVELOPE_COMPAT · EXACT · mirror COMMITTED
B_END              → SAFE_ENVELOPE_COMPAT · EXACT · mirror COMMITTED
C                  → SILENT_COMPAT · CANONICAL 4180 / FRESH 4100 · Δ -80 · OUTPUT_MISMATCH
next C request     → REPRESENTATION_DRIFT_CORRELATED · MANUAL_EDIT_REBUILT 6.257 s
```

Important interpretation:

- v0.63.54 shows no regression on ordinary `SAFE_ENVELOPE_COMPAT` output.
- `SAFE_BOUNDARY_CONFIRMED` has **not yet naturally fired** in production; the special repair path remains `NOT_EXERCISED`.
- The new `-80` case is outside the v0.63.54 gate because its policy was `SILENT_COMPAT`, not `SAFE_ENVELOPE_COMPAT`.
- Deferred Mirror correctly rejected that mismatch with `OUTPUT_MISMATCH` and `setChat 0`.
- The following request proved that the visible previous assistant message exactly matched the prior `FRESH_CHAT`, not the prior canonical representation.
- The resulting `MANUAL_EDIT_REBUILT` consumed `6.257 s`, or `97.2%` of the request preparation time.

## Current highest-value problem

The most expensive confirmed avoidable path is now:

```text
previous output:
CANONICAL != FRESH_CHAT
→ Deferred Mirror correctly blocks persistence

next request:
current visible == previous FRESH_CHAT EXACT
current visible != previous canonical
→ Edit Origin = REPRESENTATION_DRIFT_CORRELATED
→ MANUAL_EDIT_REBUILT
→ multi-second request delay
```

This has been reproduced with both a tiny and a larger representation delta:

```text
Δ -1  → next-turn rebuild 4.091 s
Δ -80 → next-turn rebuild 6.257 s
```

v0.63.55 has now validated this **next-turn false manual-edit rebuild** fix in natural long chat. The next task is the 2.0M Major M2 mechanical boundary refactor, with the validated fast path and genuine-user-edit behavior frozen as regression controls.

---

# 2. Current Validation Release

## v0.63.55 — Representation Fast Reconcile

Status: **PRODUCTION · VALIDATED REAL LONG-CHAT**

### Goal

When the previous output was already classified as an `OUTPUT_MISMATCH`, and the next request sees that the current visible assistant message is **exactly the previous `FRESH_CHAT` representation**, recognize this as confirmed representation carryover and avoid the expensive full manual-edit rebuild.

This is a reconcile optimization. It must not weaken the output-side Deferred Mirror gate.

### Evidence motivating the release

#### Same-runtime `-1` case

```text
B_CONTINUE output:
CANONICAL 4238:79ba988
FRESH_CHAT 4237:88402e3
Δchars -1
OUTPUT_MISMATCH
setChat 0

next B_END request:
Prior representation OUTPUT_MISMATCH
current == prior FRESH_CHAT
vs canonical -1
vs fresh +0
shape FRESH_EXACT_CARRYOVER
Edit origin REPRESENTATION_DRIFT_CORRELATED
MANUAL_EDIT_REBUILT 4.091 s
```

#### Same-runtime `-80` case

```text
C output:
CANONICAL 4180:931843fc
FRESH_CHAT 4100:ee834c48
Δchars -80
OUTPUT_MISMATCH
setChat 0

next C request:
Prior representation OUTPUT_MISMATCH
current 4100:ee834c48
match FRESH_CHAT
vs canonical -80
vs fresh +0
shape FRESH_EXACT_CARRYOVER
Edit origin REPRESENTATION_DRIFT_CORRELATED
MANUAL_EDIT_REBUILT 6.257 s
```

The `-80` rebuild dominated request preparation:

```text
request total       6.437 s
edit reconcile      6.257 s
share               97.2%
handshake           18 ms
onSend              152 ms
```

### Proposed fast-path gate

The fast path may run only when all required provenance is available and all of the following are true:

1. Previous assistant slot/location identity is the expected prior output.
2. Previous representation state is `OUTPUT_MISMATCH`.
3. Previous canonical fingerprint exists.
4. Previous Fresh fingerprint exists.
5. Current visible assistant fingerprint equals **previous Fresh exactly**.
6. Current visible assistant fingerprint does not represent an unproven third body.
7. Edit attribution resolves to `REPRESENTATION_DRIFT_CORRELATED` / `FRESH_EXACT_CARRYOVER`.
8. No explicit user-edit evidence supersedes the representation evidence.

If every gate passes, accept the already-recorded Fresh identity as a request-side representation alias for that exact slot/location and skip the expensive full manual-edit reconstruction. The canonical CoreSession state is intentionally left untouched.

### Desired diagnostic shape

```text
Edit reconcile: REPRESENTATION_FAST_RECONCILED · <small cost> · snapshot UNCHANGED · representation fresh-exact-carryover
Prior representation: OUTPUT_MISMATCH
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit delta: vs canonical <delta> · vs fresh +0 · shape FRESH_EXACT_CARRYOVER
```

Exact naming may change during implementation, but the diagnostic must make it obvious that:

- this was not a user edit;
- Fresh exact carryover was the proof;
- the full rebuild was skipped;
- no output-side safety gate was relaxed.

### Fail-safe behavior

Any ambiguity must keep the existing path:

```text
MANUAL_EDIT_REBUILT
```

In particular, do **not** fast-reconcile when:

- current visible matches neither prior canonical nor prior Fresh;
- prior Fresh is unavailable;
- location/slot identity is uncertain;
- provenance is stale;
- a genuine user edit is indicated;
- multiple competing representations exist without an exact provenance match.

### Genuine user edit control that must remain intact

Confirmed hand-edit positive control from v0.63.52:

```text
Prior representation EXACT
prior canonical == prior Fresh
current != canonical
current != Fresh
Edit origin USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT 4.753 s
```

v0.63.55 must **not** make this fast.

### v0.63.55 validation target

Reproduce a natural output mismatch followed by an unedited next request.

Desired result:

```text
previous output:
OUTPUT_MISMATCH
CANONICAL != FRESH_CHAT

next request:
current == previous FRESH_CHAT EXACT
Prior representation OUTPUT_MISMATCH
Edit origin REPRESENTATION_DRIFT_CORRELATED
Edit reconcile REPRESENTATION_FAST_RECONCILED
```

The next request should avoid the previous `4–6 s` rebuild class while preserving ordinary user-edit rebuild behavior.

### v0.63.55 scope freeze

Do not mix these into the release:

```text
output envelope recovery
SAFE_ENVELOPE_COMPAT normalization
SILENT_COMPAT normalization
COMMUNITY structure recovery
cache request behavior
provider cache logic
history stabilization writes
Broadcast / Frame / Continuity / Evidence / Lineage
persistent schema
network / timers / provider routing
```

---

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

## E-LIVE-055 — Representation Fast Reconcile validated

Runtime `mt1g8kbx-3qd6s0`, same boot/generation throughout:

```text
@1870→1871 output:
Deferred mirror OUTPUT_MISMATCH
CANONICAL 3715:2983182f
FRESH_CHAT 3714:5329a62f
Δchars -1

@1872 request:
Edit reconcile REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
representation fresh-exact-carryover
Prior representation OUTPUT_MISMATCH
Edit origin REPRESENTATION_DRIFT_CORRELATED
current == prior FRESH_CHAT EXACT
vs canonical -1 · vs fresh +0
```

Result: the former `4–6 s` false `MANUAL_EDIT_REBUILT` class was avoided exactly as designed. Output @1873 returned to `CANONICAL == FRESH_CHAT`, and subsequent requests @1874/@1876/@1878/@1880/@1882/@1884/@1886 remained `SAME_FAST` at 0–2 ms with `snapshot UNCHANGED`.

The same run also strengthens the later storage-latency target without changing current M2 scope:

```text
Turn storage observed: 286–616 ms
Output storage observed: 305 ms–1.007 s
request hotspot: TURN_STORAGE ~81–90%
output hotspot: OUT_STORAGE ~93–95%
```

This storage evidence belongs to later latency work; do not mix it into the M2 mechanical modularization. Provider cache remains `UNVERIFIED`.


This section stores the compact evidence that future conversations should not have to rediscover.

## E1 — Genuine user edit positive control

Runtime `mt13xe18-bkr7rf`:

```text
Prior representation EXACT
prior canonical == prior Fresh
user hand-edited visible assistant
current != canonical
current != Fresh
Edit origin USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT 4.753 s
```

Conclusion: genuine user edits can be distinguished from exact representation carryover.

## E2 — Unedited output-side unresolved-envelope failure

B_END @1842 entered cleanly:

```text
SAME_FAST 1 ms
Prior EXACT
Edit origin NONE
current == prior FRESH
```

Then output produced:

```text
THOUGHTS_COMPAT
UNRESOLVED
candidate 1
envelope offset 4252
HOST_RAW 11328
CANONICAL 11321
FRESH 7074
Δ canonical→fresh -4247
OUTPUT_MISMATCH
setChat 0
```

`HOST_RAW chars - envelope offset = 7076`, two chars longer than Fresh. This motivated v0.63.53 but did not prove the characters were CR/LF.

## E3 — `-1` representation drift → expensive next-turn rebuild

Same runtime `mt16584l-0okmn1`:

```text
output:
SAFE_ENVELOPE_COMPAT
CANONICAL 4238
FRESH 4237
Δ -1
OUTPUT_MISMATCH

next request:
current == prior FRESH
vs canonical -1
vs fresh +0
REPRESENTATION_DRIFT_CORRELATED
MANUAL_EDIT_REBUILT 4.091 s
```

Following an exact output, the next request instead returned `SAME_FAST 0 ms`.

Conclusion: strong same-runtime A/B evidence links Fresh representation drift to the expensive reconcile path.

## E4 — `-80` representation drift → expensive next-turn rebuild

Same runtime `mt19j4wz-2a7t5e`:

```text
output:
SILENT_COMPAT
CANONICAL 4180:931843fc
FRESH 4100:ee834c48
Δ -80
OUTPUT_MISMATCH

next request:
Prior representation OUTPUT_MISMATCH
current 4100:ee834c48
match FRESH_CHAT
vs canonical -80
vs fresh +0
shape FRESH_EXACT_CARRYOVER
Edit origin REPRESENTATION_DRIFT_CORRELATED
MANUAL_EDIT_REBUILT 6.257 s
```

Conclusion: the false rebuild mechanism is not limited to the earlier one-character family.

## E5 — v0.63.54 ordinary-path regression check

Same runtime produced four consecutive `SAFE_ENVELOPE_COMPAT` broadcast outputs with:

```text
CANONICAL == FRESH
Safe-envelope reconcile NOT_APPLICABLE
Deferred mirror COMMITTED
next request SAME_FAST
```

Conclusion: no observed false-positive structural-boundary reconcile on ordinary exact output.

## E6 — Deferred Mirror strict safety remains correct

Across mismatch cases:

```text
CANONICAL != FRESH
→ OUTPUT_MISMATCH
→ setChat 0
```

No current roadmap item should weaken identity/location/staleness/fingerprint acceptance gates merely to reduce latency.

## E7 — trailing-document-newline hypothesis was invalidated before v0.63.54 release

Source inspection showed:

```text
fingerprintText
→ CRLF normalized to LF
→ trimEnd()

safe canonical envelope
→ trim()
```

Therefore document-end CR/LF cannot explain a fingerprint-level `-1` difference. v0.63.54 instead tests only known internal structural separators.

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

## v0.63.52 — Edit Origin Attribution

Added provenance needed to distinguish:

```text
USER_EDIT_CANDIDATE
REPRESENTATION_DRIFT_CORRELATED
AMBIGUOUS_CHANGE
UNKNOWN
NONE
```

Verified with a real hand-edit positive control and later Fresh-drift controls.

## v0.63.53 — Boundary-Normalized Envelope Recovery

Extended Fresh-confirmed unresolved-envelope recovery with an extremely narrow trailing CR/LF variant test after exact suffix confirmation fails.

Safety properties:

- no raw-body retention;
- no new read/network/timer;
- Fresh only confirms fingerprint identity;
- non-match remains `FRESH_MISMATCH` / `OUTPUT_MISMATCH`.

Natural special-path activation remains pending.

## v0.63.54 — Safe-Envelope Structural Boundary Reconcile

After source inspection rejected the document-end newline theory, added a narrow internal-structural-separator check only after an already safe `SAFE_ENVELOPE_COMPAT` candidate exists.

Known boundary classes:

```text
BASE_TO_COMMUNITY
COMMUNITY_TO_COMMUNITY
COMMUNITY_TO_KNOWLEDGE
BASE_TO_KNOWLEDGE
```

Only one canonical-derived `\n\n → \n` structural variant may be confirmed, and only by exact existing Fresh fingerprint identity. Ambiguity stays `OUTPUT_MISMATCH`.

Ordinary long-chat regression check passed; natural special-path activation remains pending.

## v0.63.55 — Representation Fast Reconcile

Added a request-side fast reconcile for one fully proven representation case:

```text
previous output = OUTPUT_MISMATCH
current visible == prior FRESH_CHAT EXACT
same assistant slot/location provenance
live CoreSession still anchored to prior canonical identity
```

When all gates hold, SimCore reports `REPRESENTATION_FAST_RECONCILED`, keeps the canonical state untouched, performs no snapshot write, and skips the full manual-edit rebuild. Any missing/stale/third representation still falls back to the existing path.

Frozen positive control:

```text
genuine user edit
current != prior canonical
current != prior Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Release identity:

```text
release-simcore commit 6156685a3edf0ec0c5017900a82990d4f17dfb49
production blob 8c42851df34831465403d12fc57c7499923bdbc6
```

Real long-chat activation remains the current validation target.

## Repository Product Root Isolation — Phase 1

The repository now has explicit product ownership roots while preserving compatibility runtime paths:

```text
products/simcore/
products/usage-dashboard/
```

Main-writing workflows use the shared `repo-main-write` concurrency contract where applied. Runtime/install paths were intentionally not relocated in phase 1.

---

# 10. Quick Resume Checklist

When continuing development in a new conversation:

```text
1. Read Current Production Snapshot.
2. Read Current Operational State.
3. Read Immediate Next Release.
4. Check whether a newer production diagnostic changes the evidence.
5. Check Hard Freeze before editing code.
6. Implement only the promoted Immediate Next scope.
7. After release, update this file again.
```

Current promoted next action:

```text
2.0M Major M2 — Mechanical Boundary Refactor
```

Current success condition:

```text
prior OUTPUT_MISMATCH + current == prior FRESH_CHAT EXACT
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
→ no 4–6 s MANUAL_EDIT_REBUILT

genuine user edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT preserved
```

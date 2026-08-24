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
- Version: `0.64.6`
- Release: `Post-B_END C Clock Handoff Authority`
- Release branch: `release-simcore`
- Release commit: `47969d24771f6cc188df6e32150fc6fde519182d`
- Release blob: `34da01aa131f760b92d65d961a7843e9cc0d37d6`
- Declared validation status: `LIVE_PASS`
- Major update milestone: `2.0M`
- Major update phase: `M2`
- Major update checkpoint: `M2-2`

This block is machine-managed from verified declared release state. It does not determine the immediate next action.
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->

---

# 1. Current Operational State

## Production verdict

`v0.64.6` is the current production release and has completed the full natural long-chat close gate. Direct production evidence is preserved in `docs/SIMCORE_LIVE_06406_VALIDATION.md` with status `FULL NATURAL LIVE CLOSE PASS`. The post-B_END first-C clock-authority gap is resolved, Source Handoff independence is preserved, ordinary second-C narrative inheritance passed, Broadcast unlock remained correct, warnings were zero, and Representation/edit frozen controls remained intact.

The runtime is intentionally frozen while Release System v2 (`R`) is finished. RS2-3 is `CLOSED_AMENDED` under the project-authority gateway model; RS2-4 A/B/C/D shadow qualification is complete; the RS2-4E controller primitive, exact C/P authority negatives, sandbox NEW_VERSION/SAME_VERSION_CORRECTION publication, forward-history rollback, repository-bound P1 NOOP evidence, and the approved v0.64.5 rollback source are qualified. The active work item is the bounded administrative state repair followed by activation of the permanent `RS2_4_RELEASE` caller and the final `REAL_RELEASE_READY` gate.

Do not start v0.64.7 or M2-3 inside this R infrastructure work item. The next genuine runtime release remains a separate product work item and will be the first real operational exercise of R after `REAL_RELEASE_READY`.

## Validated precursor problem — v0.63.55

The most expensive confirmed avoidable path was:

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

This was reproduced with both a tiny and a larger representation delta:

```text
Δ -1  → next-turn rebuild 4.091 s
Δ -80 → next-turn rebuild 6.257 s
```

v0.63.55 validated the next-turn false manual-edit rebuild fix in natural long chat and remains a frozen regression control. Current production v0.64.6 preserves that fast path and the genuine-user-edit control; both remain mandatory controls for later M2-3 extraction.

---

# 2. Current Validation Release

## v0.64.6 — Post-B_END C Clock Handoff Authority

Status: **PRODUCTION · FULL NATURAL LIVE CLOSE PASS**

```text
Version: 0.64.6
Release: Post-B_END C Clock Handoff Authority
Release commit: 47969d24771f6cc188df6e32150fc6fde519182d
Release blob: 34da01aa131f760b92d65d961a7843e9cc0d37d6
Major checkpoint: M2-2 unchanged
```

Natural sequence validated:

```text
B_START
→ several B_CONTINUE
→ B_END
→ immediate C
→ second ordinary C
```

Direct evidence in `docs/SIMCORE_LIVE_06406_VALIDATION.md` proves the B_END terminal clock floor is handed to the immediate C independently of Source Handoff eligibility, the second ordinary C resumes normal Narrative authority, broadcast unlock remains correct, warnings are zero, and Representation/edit controls remain intact.

## v0.64.3 — B_END Diagnostic Builder Binding Repair

Status: **SUPERSEDED BY v0.64.6 · HISTORICAL REGRESSION EVIDENCE**

```text
Version: 0.64.3
Release: B_END Diagnostic Builder Binding Repair
Release commit: d7fd45cd193ef1ff187c73761ded958d89558ebf
Release blob: ff481aa904340b844ef29b0d89aa20bd6286286d
Parent: v0.64.2 Diagnostic Copy Resilience
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
outer runtime binds existing Kernel + Time modules
buildLastTurnDiagnosticReport body byte-identical
B_END terminal coverage expression byte-identical
COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED unchanged
no request/output hot-path behavior change
no Broadcast/Time semantic change
no persistent schema or host/storage/network/timer surface change
M2-3 design remains frozen for v0.65.0
```

Its natural B_END close work and the subsequent post-B_END clock-authority follow-up are now superseded by the fully validated v0.64.6 production baseline.

## v0.64.2 — Diagnostic Copy Resilience

Status: **SUPERSEDED BY v0.64.6 · HISTORICAL REGRESSION EVIDENCE**

```text
Version: 0.64.2
Release: Diagnostic Copy Resilience
Release commit: 7a1f1692920abbc890c6663b40e38a24676c3de9
Release blob: 3058e5bafa7f3abd15277ceabd0bd9d8518f52dc
Parent: v0.64.1 Summary Scope Authority
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
BUILD exactly once
primary Clipboard API
fallback temporary textarea + execCommand('copy')
results: COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED
bounded memory-only probe; no raw report retention
builder body byte-identical; runtime semantics unchanged
```

Static CI verified report build count, primary/fallback exact payload identity, builder-failure short circuit, fallback cleanup/focus restoration, latest/install equality, architecture contracts, Summary Scope fixtures, frozen M2 markers, and unchanged storage/chat/network/timer call counts.

## v0.64.1 — Summary Scope Authority

Status: **SUPERSEDED BY v0.64.6 · HISTORICAL REGRESSION EVIDENCE**

Production identity:

```text
Version: 0.64.1
Release: Summary Scope Authority
Release commit: 0cd0b01440e0d8654a84b64362541a9fbfcb03b3
Release blob: 2d5d0acf4d2da52874aafaa5bbd074a81c7f7b52
Parent production baseline: v0.64.0 M2-2 Representation Ownership Split
Major checkpoint remains: M2-2
```

Direct triggering evidence came from paired year-end C requests in runtime `mt2qjgt5-9oi0sk`:

```text
ANNUAL_ONLY candidate @2020:
- target-year achievements may be omitted while earlier achievements can bleed into the annual summary
- standalone summary remained over-chained to root A@2014 (WATCH; Lineage not patched)

CUMULATIVE_YOY @2022:
- explicit 2029.12.31 -> 2030.12.31 baseline/current comparison
- visible COSMIC section used 3,400만 as the 2029 baseline, while a later comment reused 720만
- several requested per-metric absolute/percentage YoY deltas were omitted
- recurrence matched an older template; correlation preserved, causality not assumed
```

Patch boundary:

```text
Lifecycle request classifier: NONE / ANNUAL_ONLY / CUMULATIVE_YOY
pending metadata only; no persistent schema
Prompt compiler v3 serializes scope authority
Summary factual authority > Recurrence factual carryover
Recurrence/Lineage implementation unchanged
no output-body parser or semantic repair
```

Static release gate:

```text
python helper compile            PASS
node --check latest/install      PASS
latest == install               PASS
Contracts v2 checker             PASS
summary classifier fixtures 9/9 PASS
M2-2 frozen markers retained     PASS
```

## v0.64.0 — M2-2 Representation Ownership Split

Status: **SUPERSEDED BY v0.64.6 · HISTORICAL REGRESSION EVIDENCE**

Production identity:

```text
Version: 0.64.0
Release: M2-2 Representation Ownership Split
Release commit: d0407c5cd7441a978f815db068344219f8c15027
Release blob: 6d7ed75b14ad042cc8bfab1be16fc3c97069f5bb
Parent production baseline: v0.63.59 Broadcast End Closure Contract
```

This is a mechanical ownership checkpoint, not a feature release.

```text
Before
Runtime Mirror
├─ Fresh observation / mirror transport
└─ bounded representation provenance ledger

Outer request shell
└─ prior/current representation taxonomy + carryover shape

After M2-2
Representation
├─ bounded fingerprint-only provenance ledger
├─ CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
├─ prior representation classification
├─ current exact carryover classification
└─ fingerprint-length deltas / carryover shape

Runtime Mirror
├─ Fresh chat observation
├─ strict identity/location/staleness guards
└─ mirror write scheduling
```

Static checkpoint evidence:

```text
node syntax latest/install          PASS
latest.js == install.js             PASS
Contracts v2 architecture checker   PASS
representation module present       PASS
runtime-mirror provenance API gone  PASS
Fresh raw body retention             NONE
persistent schema change             NONE
new host/network/timer surfaces      NONE
```

Frozen behavioral controls that must remain unchanged in later ownership work:

```text
Prior OUTPUT_MISMATCH + current == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT

Deferred Mirror unknown representation
→ conservative OUTPUT_MISMATCH / no unsafe mirror write
```

## v0.63.59 — Broadcast End Closure Contract

Status: **SUPERSEDED BY v0.64.0 · DIRECT PARENT / FROZEN REGRESSION CONTRACT**

`v0.63.59` is the direct production parent of M2-2. It closed the B_END terminal-airtime/structure contract before Representation ownership movement resumed.

```text
Version: 0.63.59
Release: Broadcast End Closure Contract
Release commit: 7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d
Release blob: da47e5d8123c0abfe9902f016c84ac758f766032
```

The motivating long-chat B_END showed an explicit allowed broadcast end and visible progression to the terminal airtime while persisted airtime remained at the opening frame. The release requires an explicit canonical terminal timestamp for B_END and keeps the COMMUNITY closure contract at exactly two blocks with three platform sections each. M2-2 does not alter this behavior.

## v0.63.58 — Narrative Tail Time Contract

Status: **SUPERSEDED BY v0.64.0 · HISTORICAL CONTRACT / REGRESSION EVIDENCE**

Direct triggering evidence came from a non-broadcast live-scene turn that began with a canonical `01:00 AM` frame but explicitly reached and ended at `03:00 AM` only in prose. The renderer emitted no later canonical timestamp line, so Time observed:

```text
Narrative clock: SAME
frame: 01:00 AM
committed: 01:00 AM
scenes: 0
tail: FRAME_ONLY
```

The following C turn inherited the stale `01:00 AM`. A later hand-edit changing the visible prior timestamp to `03:00 AM` was correctly classified as a genuine edit (`USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`) and the rebuilt state then used `03:00 AM` as the previous narrative anchor. This proves the missing piece is terminal timestamp observability, not inability of the existing commit path to accept a valid later canonical timestamp.

The v0.63.58 patch is intentionally narrow:

```text
non-broadcast rendering
→ if current scene time advances beyond frame time
→ emit canonical timestamp line at transition or terminal current point
→ if the user states a later current/end time, render it as canonical current timestamp
→ do not leave terminal current-time advancement only in prose

Time commit
→ existing v0.63.28 line-level monotonic sequence unchanged
→ no arbitrary prose-time auto-commit

Diagnostics
→ FRAME_ONLY explicitly reports that no terminal timestamp beyond frame was observable
→ copied RAW prose must be cross-checked for elapsed/current/end-time cues
```

Frozen:

- v0.63.57 current-timeline authority behavior;
- M2-1 Recovery / output-compat / bootstrap-migration ownership;
- Representation Fast Reconcile and genuine-user-edit semantics;
- Deferred Mirror;
- Broadcast and Frame behavior;
- Evidence / Lineage / Handoff / Recurrence;
- Structure / COMMUNITY;
- cache/history, storage/API/network/timer surfaces, persistent schema.

## v0.63.57 — Current Timeline Authority Guard

Status: **SUPERSEDED BY v0.64.0 · HISTORICAL CONTRACT / REGRESSION EVIDENCE**

This mini update was inserted before further M2 ownership movement because a natural Mode-A turn exposed a continuity coverage gap: the canonical narrative clock remained in 2030, but the visible response emitted unrequested 2017 scene timestamps and also reverted current character age/state to the historical era.

The patch is intentionally narrow:

```text
pre-generation:
known non-broadcast narrative timestamp
→ inject current_timeline_anchor
→ current timeline is authoritative
→ historical context is reference-only unless the user explicitly requests a past scene / flashback
→ current character age/status follows the current timeline

post-generation diagnostics:
non-monotonic visible timestamp sequence
→ existing persisted-state floor remains protected
→ visible chronology is reported explicitly
→ generated body is not semantically/date-rewritten by SimCore
```

## M2-1 — Recovery Boundary Split

Status: **SUPERSEDED BY M2-2 · SUPPORTED REAL LONG-CHAT REGRESSION BASELINE**

`v0.63.56` is the first physical code-movement checkpoint of the 2.0M Major. It is intentionally mechanical:

```text
old Recovery
├─ output envelope / tail / Fresh-confirmation candidate logic
├─ history bootstrap
└─ legacy migration/repair

new
├─ output-compat
├─ bootstrap-migration
└─ recovery compatibility facade
```

Frozen behavior target:

- all moved function bodies are preserved verbatim by the release patch;
- Session/runtime callers still import `recovery`, so orchestration order is unchanged;
- `REPRESENTATION_FAST_RECONCILED` remains the validated v0.63.55 request-side control;
- genuine user edits must remain `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`;
- Structure remains judge-only; History remains `OBSERVE_ONLY`; provider cache remains `UNVERIFIED`;
- storage/API/network/timer surfaces and persistent state schema are unchanged.

## v0.63.55 — Representation Fast Reconcile

Status: **SUPERSEDED BY v0.63.56 · VALIDATED REAL LONG-CHAT**

### Goal

When the previous output was already classified as an `OUTPUT_MISMATCH`, and the next request sees that the current visible assistant message is **exactly the previous `FRESH_CHAT` representation**, recognize this as confirmed representation carryover and avoid the expensive full manual-edit reconstruction.

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
Δ -80
OUTPUT_MISMATCH

next C request:
current == prior FRESH_CHAT
vs canonical -80
vs fresh +0
shape FRESH_EXACT_CARRYOVER
Edit origin REPRESENTATION_DRIFT_CORRELATED
MANUAL_EDIT_REBUILT 6.257 s
```

### Confirmed fast-path contract

The fast path may run only when required provenance is available, the previous representation is `OUTPUT_MISMATCH`, and the current visible assistant fingerprint equals the prior Fresh fingerprint exactly for the same slot/location. Any ambiguity keeps the full existing rebuild path.

Confirmed hand-edit positive control:

```text
Prior representation EXACT
prior canonical == prior Fresh
current != canonical
current != Fresh
Edit origin USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT 4.753 s
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

## E-LIVE-06406 — Full natural close PASS

`docs/SIMCORE_LIVE_06406_VALIDATION.md` is the production authority evidence for the current release. It validates B_END terminal authority, immediate-C clock handoff, Source Handoff independence, second-C ordinary Narrative inheritance, broadcast unlock, zero warnings, and preserved Representation/edit controls.

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

Result: the former `4–6 s` false `MANUAL_EDIT_REBUILT` class was avoided exactly as designed. Output @1873 returned to `CANONICAL == FRESH_CHAT`, and subsequent requests remained `SAME_FAST` with `snapshot UNCHANGED`.

The same run also strengthens the later storage-latency target without changing current M2 scope:

```text
Turn storage observed: 286–616 ms
Output storage observed: 305 ms–1.007 s
request hotspot: TURN_STORAGE ~81–90%
output hotspot: OUT_STORAGE ~93–95%
```

This storage evidence belongs to later latency work; do not mix it into current R or M2 mechanical modularization. Provider cache remains `UNVERIFIED`.

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

B_END @1842 entered cleanly, then output produced an unresolved Thoughts-compatible suffix and `OUTPUT_MISMATCH`. This motivated v0.63.53 but did not prove the exact characters were CR/LF.

## E3 — `-1` representation drift → expensive next-turn rebuild

Same runtime `mt16584l-0okmn1` proved a Fresh-exact carryover could cause the prior 4.091 s rebuild before v0.63.55.

## E4 — `-80` representation drift → expensive next-turn rebuild

Same runtime `mt19j4wz-2a7t5e` proved the same false rebuild class was not limited to the earlier one-character family.

## E5 — v0.63.54 ordinary-path regression check

Four consecutive `SAFE_ENVELOPE_COMPAT` broadcast outputs remained canonical/Fresh exact, with no false-positive structural-boundary reconcile.

## E6 — Deferred Mirror strict safety remains correct

Across mismatch cases:

```text
CANONICAL != FRESH
→ OUTPUT_MISMATCH
→ setChat 0
```

No roadmap item should weaken identity/location/staleness/fingerprint acceptance gates merely to reduce latency.

## E7 — trailing-document-newline hypothesis invalidated

Source inspection showed fingerprint normalization and canonical trimming make document-end CR/LF insufficient to explain a fingerprint-level `-1` difference. v0.63.54 therefore tests only known internal structural separators.

---

# 7. Known Unknowns

- Exact host transformation that produced the historical `SILENT_COMPAT` `-80` body difference.
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
9. **After every production release:** refresh Current Operational State, promote/replace Immediate Next, record evidence, review Deferred and Hard Freeze.
10. **Before a new major phase:** read this document first and reconcile it with the latest production diagnostic instead of relying on chat memory alone.

---

# 9. Completed Major Milestones

## v0.63.52 — Edit Origin Attribution

Added provenance needed to distinguish `USER_EDIT_CANDIDATE`, `REPRESENTATION_DRIFT_CORRELATED`, `AMBIGUOUS_CHANGE`, `UNKNOWN`, and `NONE`. Verified with a real hand-edit positive control and later Fresh-drift controls.

## v0.63.53 — Boundary-Normalized Envelope Recovery

Extended Fresh-confirmed unresolved-envelope recovery with an extremely narrow trailing CR/LF variant test after exact suffix confirmation fails. Natural special-path activation remains pending.

## v0.63.54 — Safe-Envelope Structural Boundary Reconcile

Added a narrow internal-structural-separator check only after an already safe `SAFE_ENVELOPE_COMPAT` candidate exists. Ordinary long-chat regression check passed; natural special-path activation remains pending.

## v0.63.55 — Representation Fast Reconcile

Added and live-validated a request-side fast reconcile for one fully proven Fresh-exact carryover case while preserving the genuine-user-edit rebuild control.

## Repository Product Root Isolation — Phase 1

The repository now has explicit product ownership roots while preserving compatibility runtime paths:

```text
products/simcore/
products/usage-dashboard/
```

Main-writing workflows use the shared `repo-main-write` coordination contract where applied. Runtime/install paths were intentionally not relocated in phase 1.

---

## Release System v2 — ACTIVE R-FIRST WORK

Status: **RS2-4E REPOSITORY-BOUND QUALIFIED · ADMIN FIX / CALLER ACTIVATION REMAIN**

Canonical operating principle:

- [SIMCORE_RELEASE_SYSTEM_V2_FEEDBACK_LOOP_OPERATING_PRINCIPLE.md](./SIMCORE_RELEASE_SYSTEM_V2_FEEDBACK_LOOP_OPERATING_PRINCIPLE.md)

Current R state:

```text
RS2-1 durable tests                         complete
RS2-2 state synchronization                 complete
RS2-3 permanent CI                          CLOSED_AMENDED
RS2-4 A/B/C/D shadow                        verified
RS2-4E controller primitive                 CI verified
P1 current-production NOOP                  requalified
P2 NEW_VERSION sandbox                      PASS
P3 SAME_VERSION_CORRECTION sandbox          PASS
N1-N10 fail-closed coverage                 PASS / permanently owned
rollback safe source v0.64.5                qualified
forward-history rollback rehearsal          verified
MAIN_ADMIN_STATE_DRIFT                      current FIX
RS2_4_RELEASE production caller             not yet active
REAL_RELEASE_READY                          not yet declared
```

R prefers project-owned, testable enforcement over manual GitHub platform governance. Platform branch protection/rulesets are optional defense-in-depth rather than a correctness dependency.

After the admin repair passes permanent CI/state validation, activate the exact C/P `RS2_4_RELEASE` caller, run final repository-bound qualification, and mark `REAL_RELEASE_READY`. Only then begin the next legitimate SimCore runtime release as a separate work item.

---

# 10. Quick Resume Checklist

When continuing development in a new conversation:

```text
1. Read Current Production Snapshot.
2. Confirm v0.64.6 LIVE_PASS and release-simcore identity.
3. Read RS2_4E_QUALIFICATION_STATUS.json.
4. Continue only the current R gate until REAL_RELEASE_READY.
5. Keep runtime/plugin code frozen during R infrastructure work.
6. Preserve every failure as WATCH / DEFER / FIX / BLOCKER evidence.
7. After REAL_RELEASE_READY, start the next legitimate runtime release separately and execute it through R.
```

Current promoted next action:

```text
repair MAIN_ADMIN_STATE_DRIFT
→ permanent CI + sync-state check
→ activate RS2_4_RELEASE exact C/P caller
→ final repository-bound qualification
→ REAL_RELEASE_READY
```

Current success condition:

```text
v0.64.6 declared lifecycle = LIVE_PASS
current_priority = RS2_4E_REAL_RELEASE_READY_QUALIFICATION
registered machine blocks = current
permanent state check = PASS
production release caller = exact C/P Required-bound and fail-closed
rollback rehearsal = VERIFIED
release-simcore mutation before real release = NONE
→ REAL_RELEASE_READY
```

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
- Version: `0.70.1`
- Release: `Cold First-Turn Tail Attribution`
- Release branch: `release-simcore`
- Release commit: `861100f4771967aa5b8ab8811d06f11702c0d3ff`
- Release blob: `8f332cfceed316d35954e353c2eaca38c2f34d95`
- Declared validation status: `PENDING_REAL_LONG_CHAT`
- Major update milestone: `2.0M`
- Major update phase: `M2`
- Major update checkpoint: `M2-6`

This block is machine-managed from verified declared release state. It does not determine the immediate next action.
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->

<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN -->
## Current Release Live Gate

- Release transaction: `simcore-v0.70.1-new-01`
- Production commit: `861100f4771967aa5b8ab8811d06f11702c0d3ff`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Current priority / live gate: `07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_REAL_LONG_CHAT`
- R lifecycle: `REAL_RELEASE_LIVE_PENDING`

This block is machine-managed by `release-state-converge` from immutable publication evidence.
<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->

---

# 1. Current Operational State

## How to read current operational state

The machine-managed blocks above are authoritative for current production identity, validation status, terminal release state, and current priority. Human-authored sections below record interpretation, historical evidence, constraints, and follow-up decisions; they do not override those blocks.

The current product live gate is closed with accepted human evidence and the durable major checkpoint is M2-5. The selected Community Parent-Local Alias Classification Repair design has passed exact deployed-source re-audit and explicit implementation authorization. The immediate product action is a dedicated runtime work branch constrained to the frozen Community classifier and bounded migration envelope. Provider cache remains `UNVERIFIED`. R2.6 activation/status convergence and unrelated WATCH items remain separate non-runtime/investigation lanes.

## Historical validated precursor — v0.63.55

The subsection below is preserved as historical regression evidence. Any point-in-time current-production wording inside it is historical and does not override the machine-managed current-state blocks above.

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

v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat and now serves as a frozen regression control. The active major checkpoint remains M2-2, while current production is the v0.64.2 Diagnostic Copy Resilience hardening release; preserve the validated Representation fast path, Summary Scope authority, and genuine-user-edit behavior while capturing the single ordinary diagnostic-copy live result before M2-3.

---

# 2. Historical Validation Release Ledger

The entries below preserve point-in-time release contracts and statuses for regression history. They do not override the machine-managed current-state blocks above.

## v0.64.3 — B_END Diagnostic Builder Binding Repair

Status: **PRODUCTION · PENDING NATURAL B_END LIVE CLOSE GATE**

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

Static release gate requires syntax, latest/install identity, Contracts v2, B_END report-builder binding fixture, unchanged builder body, unchanged protected side-effect counts, and unchanged diagnostic-copy stage fixtures.

Natural live close gate:

```text
current runtime mode B_END
output COMMITTED
report build succeeds
Broadcast closure / terminal coverage lines present
copy result COPIED or COPIED_FALLBACK
```

After the live close gate, review `POST_BEND_C_CLOCK_DOMAIN_GAP` as a separate correctness contract. Do not fold it into v0.64.3 or M2-3; if confirmed, release a narrow post-B_END clock-authority mini before v0.65.0. M2-3 remains blocked until that review is resolved.

## v0.64.2 — Diagnostic Copy Resilience

Status: **PRODUCTION · PENDING ONE LIVE COPY RESULT**

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

Static CI verifies report build count, primary/fallback exact payload identity, builder-failure short circuit, fallback cleanup/focus restoration, latest/install equality, architecture contracts, Summary Scope fixtures, frozen M2 markers, and unchanged storage/chat/network/timer call counts.

Live routing:

```text
COPIED or COPIED_FALLBACK -> v0.64.2 live gate PASS; proceed with M2-3
REPORT_BUILD_FAILED       -> separate builder-repair mini before M2-3
CLIPBOARD_WRITE_FAILED    -> PocketRisu/WebView clipboard transport scope
```

## v0.64.1 — Summary Scope Authority

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

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

Live targets:

```text
ANNUAL_ONLY input -> Summary scope ANNUAL_ONLY / target 2030
- target-year achievements stay target-year scoped
- earlier facts only labeled context/metadata
- cumulative counters labeled year-end snapshot

CUMULATIVE_YOY input -> Summary scope CUMULATIVE_YOY / target 2030 / comparison 2029
- every requested comparable metric gets previous/current/absolute delta/percentage delta
- older historical values cannot replace the requested 2029 baseline

Lineage over-chain remains WATCH and is intentionally unchanged for attribution isolation.
```

## v0.64.0 — M2-2 Representation Ownership Split

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

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

Frozen behavioral controls that must remain unchanged in live validation:

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

New diagnostic ownership line:

```text
Representation ownership: REPRESENTATION · ledger <N> · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED
```

Live gate before M2 advances to Edit Reconcile extraction:

1. ordinary A/C/B turns keep stable request/output/binding/mirror behavior;
2. a normal exact carryover remains `SAME_FAST` / `Edit origin NONE`;
3. when a natural CANONICAL↔FRESH mismatch occurs, exact Fresh carryover still reaches `REPRESENTATION_FAST_RECONCILED` without the old multi-second rebuild;
4. a genuine user edit still reaches `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`;
5. no regression appears in Recovery, timeline, Broadcast closure, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history observation, or persistent schema.

Do not start physical `edit-reconcile` extraction until this checkpoint has direct real-long-chat evidence.

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

Real long-chat validation target:

1. a natural scene whose current time advances inside one response emits an explicit later canonical timestamp and commits it;
2. the next natural turn inherits that terminal time instead of the opening frame time;
3. ordinary single-time responses may remain `FRAME_ONLY` without being treated as faults, but RAW must be checked when prose contains time advancement;
4. v0.63.57 current-era authority and v0.63.55 representation/edit controls remain unchanged.

The separate COMMUNITY platform-family warning observed during v0.63.57 validation is not repaired in v0.63.58; keep it as an independent recurrence watch.

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

Frozen in this mini release:

- M2-1 `output-compat` / `bootstrap-migration` / Recovery facade boundaries;
- Representation Fast Reconcile and genuine-user-edit semantics;
- Deferred Mirror mismatch safety;
- Broadcast lifecycle and end authority;
- Frame sequencing;
- Evidence / Lineage / Handoff / Recurrence / Structure / COMMUNITY;
- cache/history behavior, storage/API/network/timer surfaces, and persistent schema.

Real long-chat validation should confirm three cases before M2 advances:

1. ordinary current-timeline A/C output stays in the current era;
2. an explicit user-requested historical scene/flashback remains possible;
3. if another non-monotonic visible sequence occurs, diagnostics report `Visible chronology: NON_MONOTONIC_VISIBLE_SEQUENCE` while the persisted narrative floor remains protected.

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

Live validation should first prove ordinary A/C/B turns remain stable and then, when naturally available, reconfirm the representation fast path / genuine-edit controls. Do not mix storage-latency optimization into this checkpoint.


## v0.63.55 — Representation Fast Reconcile

Status: **SUPERSEDED BY v0.63.56 · VALIDATED REAL LONG-CHAT**

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
Start the dedicated v0.68.0 runtime work branch from exact live-complete v0.67.0 production bytes.
Implement only the frozen Community parent/local descriptor repair, classifier v2→v3 transition, and bounded migration behavior.
Preserve Structure as judge-only and retain all required negative controls and unrelated regressions.
Keep R2.6 control-plane convergence and unrelated WATCH items in separate lanes.
```

Current success condition:

```text
v0.67.0 real long-chat evidence = LIVE_PASS
durable major checkpoint = M2-5
current product priority = 06800_COMMUNITY_PARENT_LOCAL_ALIAS_IMPLEMENTATION
next proposed version = v0.68.0 Community Parent-Local Alias Classification Repair
implementation authorization = YES
production remains v0.67.0 until a normal approved release transaction publishes a candidate
latest.js == install.js remains mandatory

product runtime work
→ dedicated v0.68 runtime branch from exact deployed v0.67 bytes
→ implement frozen Community classifier repair and bounded v2→v3 migration only
→ static/differential proof and permanent CI before release transaction

release-system work
→ remain non-runtime and separately attributable
→ close R2.6 activation/status truth separately
→ preserve the single publisher and existing main-write authority

observed anomaly
→ preserve evidence immediately
→ classify WATCH / DEFER / FIX / BLOCKER
→ unresolved FIX or BLOCKER stops advancement
```
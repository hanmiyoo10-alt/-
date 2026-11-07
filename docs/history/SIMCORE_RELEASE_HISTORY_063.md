# SimCore Release History — 0.63.x

> Lifecycle role: `POINT_IN_TIME_EVIDENCE`.
>
> Historical evidence only. Nothing in this file owns current production identity, current release state, current priority, release authorization, or runtime truth. Read `docs/CURRENT_DEVELOPMENT.md` and the current SimCore authority chain for live state.

## Migration provenance

- Source path: `docs/CURRENT_DEVELOPMENT.md`
- Source main commit: `53005f0fdeecf7801f594fbfd41418330788a389`
- Migration packet: #4346
- Migration status: `ROLLED_OVER`
- Source identities: historical ledger `v0.63.59` through `v0.63.55`; `# 6. Verified Evidence Ledger`; completed milestones `v0.63.52` through `v0.63.55`
- Preservation rule: migrated source prose below is copied verbatim; surrounding provenance/navigation is new migration metadata only.

---

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

---

# 9. Completed Major Milestones — migrated v0.63.x entries

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

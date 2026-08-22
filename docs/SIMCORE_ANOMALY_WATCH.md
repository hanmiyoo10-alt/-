# SimCore Anomaly Watch

This file preserves low-confidence anomalies that are worth correlating if they recur. An entry here is not a confirmed SimCore bug and must not be used to justify a runtime change without repeated evidence.

## GENERATION_SEMANTIC_EXCURSION — WATCH_ONLY

First observed: 2026-08-20
Production: `v0.63.56 — M2-1 Recovery Boundary Split`
Runtime: `mt1kk4ax-jdnwks`
Turn: user `@1898` → assistant `@1899`, first generation before regeneration

### Observable symptom

The user explicitly bounded the requested output to the supplied behind-the-scenes interview video only. The first generation ignored that source/scene boundary and instead produced an unrelated private domestic continuation, including an additional character and scene material outside the requested interview.

A regeneration of the exact same user turn returned to the requested behind-the-scenes interview scope.

### Diagnostic state of the anomalous first generation

```text
Version: 0.63.56
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Warnings: 0
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS
Output process recovery: 1.0 ms
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

No captured diagnostic supports attributing this event to the M2-1 Recovery boundary split, output compatibility, representation reconciliation, state corruption, or frame/continuity failure.

### Current classification

```text
GENERATION_SEMANTIC_EXCURSION
confidence: LOW / WATCH_ONLY
M2-1 attribution: UNPROVEN
runtime repair: NONE
```

Treat the event as a preserved one-off semantic-generation anomaly unless it recurs.

### Correlation trigger — “찾았다 이녀석” condition

Promote this from WATCH_ONLY to an active investigation if another natural turn shows the same family of behavior, especially when:

- the user gives an explicit source-only / scene-only / `~만 보여줘` boundary;
- generation abandons that boundary and invents a different continuation or unrelated scene;
- SimCore diagnostics remain otherwise healthy (`Warnings 0`, continuity/frame pass, no state/recovery fault);
- regeneration or a neighboring turn returns to the requested scope.

If recurrence is confirmed, investigate Prompt/instruction adherence, long-chat semantic pressure, context selection and generation semantics as a separate attribution track. Do not silently blame Recovery/Representation or change M2 architecture merely because the anomaly happened during M2.

### Preservation rule

Do not delete this entry when M2 advances. Future similar events should be appended with runtime ID, turn indices, exact scope restriction category, relevant diagnostics, and whether regeneration reproduced or corrected the excursion.

---

## VISIBLE_SCENE_TIME_REGRESSION_GUARD_GAP — WATCH / DIRECT EVIDENCE

First observed: 2026-08-21
Production: `v0.63.56 — M2-1 Recovery Boundary Split`
Runtime: `mt2cejv0-fcumha`
Turn: user `@1920` → assistant `@1921`

### Observable symptom

The visible response header correctly remained in the current narrative year:

```text
⏱️[2030-08-07 (Wed) 06:00 PM]
```

but two later visible scene timestamps regressed approximately thirteen years:

```text
⏱️[2017-09-09 (Sat) 07:15 PM]
⏱️[2017-10-15 (Sun) 02:00 PM]
```

The user request described activity during the current Wanna One reunion period; it did not request a flashback to 2017. Therefore the visible output contains a real non-monotonic scene-time regression.

There is also a deeper semantic-time inconsistency before the explicit 2017 timestamps appear. The first body section is stamped `2030-08-07`, but its prose describes original debut-era activity and resets the protagonist to the earlier-era `15살` state even though that is not the protagonist's age in the current 2030 timeline. This is chronology/state rollback evidence, not a separate content-category anomaly.

In other words, the response contains all three:

```text
explicit timestamp regression: 2030 → 2017
implicit semantic regression:  2030 timestamp + 2017-era body facts
age/state regression:           current 2030 state → earlier-era 15-year-old state
```

The current diagnostic only proves detection of the explicit parsed scene-time regression. It does not show a semantic chronology validator capable of rejecting debut-era facts or age/state resets embedded under a 2030 timestamp.

### Diagnostic evidence

The continuity subsystem detected the non-monotonic scene-time material and protected persisted state:

```text
Continuity summary: REPAIRED
Narrative clock: FLOOR CLAMPED
previous:  ⏱️[2030-08-07 (Wed) 06:00 PM]
frame:     ⏱️[2030-08-07 (Wed) 06:00 PM]
committed: ⏱️[2030-08-07 (Wed) 06:00 PM]
scenes: 2
tail: SKIPPED_NON_MONOTONIC
Frame sequence: PASS
Frame guard: PASS
RAW frame regression: NONE
Warnings: 0
```

This proves two distinct outcomes at once:

1. **State continuity safety succeeded.** SimCore did not persist the regressed 2017 scene times as the canonical narrative clock.
2. **Visible-output continuity failed.** The already-generated 2017 scene timestamps and earlier-era semantic state remained in the user-visible response; the guard only prevented state advancement/regression and did not repair or quarantine the visible body.

It does **not** prove that semantic chronology inside a same-timestamp scene is safe. The first 2030-stamped body already contains debut-era semantics and an earlier-era age/state reset, which lie outside what this clock-only repair demonstrated.

### Current classification

```text
VISIBLE_SCENE_TIME_REGRESSION_GUARD_GAP
confidence: HIGH for symptom
state corruption: PREVENTED
visible output repair: NOT PERFORMED
semantic chronology validation: NOT DEMONSTRATED
age/state chronology validation: NOT DEMONSTRATED
M2-1 Recovery attribution: UNPROVEN
continuity coverage gap: CONFIRMED FOR THIS SAMPLE
```

Do not misclassify `Continuity summary: REPAIRED` as complete user-visible repair. In this diagnostic shape, `REPAIRED` means the canonical narrative clock was protected; it does not guarantee that every scene timestamp in the visible output was made monotonic, nor that prose under a current timestamp is semantically anchored to the current era or current character state.

### Mitigation release

`v0.63.57 — Current Timeline Authority Guard` was released as a narrow pre-M2-2 mitigation. It adds current-timeline authority guidance before generation and makes non-monotonic visible scene-time sequences explicit in copied diagnostics.

Status after release:

```text
issue evidence: DIRECT / HIGH
production mitigation: DEPLOYED
real long-chat validation: PENDING
M2-1 attribution: still UNPROVEN
```

The mitigation does not claim to semantically rewrite a malformed visible response. Success means preventing the unrequested era rollback in ordinary current-timeline generation while preserving explicit user-requested historical scenes, and retaining the existing persisted-state floor if generation still misbehaves.

### Correlation / promotion trigger

If another natural response emits an unrequested scene timestamp earlier than the current narrative floor and diagnostics again show `FLOOR CLAMPED` / `SKIPPED_NON_MONOTONIC`, promote this to an active continuity-output investigation. Also correlate cases where the timestamp stays current but body facts or age/state clearly belong to an earlier era.

Compare:

- header/frame timestamp;
- every parsed visible scene timestamp;
- current narrative floor;
- same-timestamp semantic era cues;
- age/state continuity cues;
- `scenes` count;
- tail disposition;
- whether the visible response is rewritten, rejected, quarantined, or merely state-clamped.

Any future repair should be scoped separately from M2 mechanical modularization unless evidence shows the refactor caused it. Preserve the current state-safety behavior while investigating whether visible scene-time validation belongs before commit, during output validation, or in a dedicated renderer/continuity boundary.
---

## INTRA_TURN_NARRATIVE_TIME_ADVANCEMENT_GAP — DIRECT EVIDENCE / MITIGATED

First confirmed: 2026-08-21
Production at discovery: `v0.63.57 — Current Timeline Authority Guard`
Runtime: `mt2fgh3v-6ti55c`

A non-broadcast response began at a canonical `01:00 AM` frame and explicitly reached a `03:00 AM` ending in prose, but emitted no later canonical timestamp line. Time therefore reported `scenes 0 / FRAME_ONLY` and persisted the opening time. The next C turn inherited the stale `01:00 AM`.

A hand edit that changed the prior visible canonical timestamp to `03:00 AM` was correctly detected as `USER_EDIT_CANDIDATE`, rebuilt, and became the next narrative anchor. This isolates the gap to **terminal time observability** rather than the commit mechanism itself.

`v0.63.58 — Narrative Tail Time Contract` mitigates this by requiring the renderer to emit a canonical timestamp line whenever current scene time advances beyond the frame, especially when the user explicitly states a later current/end time. Arbitrary prose-time auto-commit remains forbidden.

Promotion / recurrence check:

- if RAW prose clearly advances current time but `Narrative tail coverage` remains `FRAME_ONLY`, treat it as recurrence;
- if a later canonical timestamp is emitted and `Narrative clock` commits it, record a positive live validation;
- always verify the next turn inherits the terminal time.

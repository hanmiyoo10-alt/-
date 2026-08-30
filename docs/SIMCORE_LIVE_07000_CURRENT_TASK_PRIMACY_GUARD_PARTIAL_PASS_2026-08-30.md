# SimCore v0.70.0 Current Task Primacy Guard — real long-chat partial pass

Date: 2026-08-30 KST

Status: **LIVE EVIDENCE RECORDED · STAGES A/B/D PASS · STAGE C STILL REQUIRED · LIVE_PASS NOT YET AUTHORIZED**

Classification: **REAL LONG-CHAT VALIDATION · PRODUCT LIVE GATE · RUNTIME UNCHANGED**

Release:

```text
Version: 0.70.0
Name: Current Task Primacy Guard
Production commit: 13179cff70feaf7d12fe53c56e4735155fcf3eaa
Validation gate: 07000_CURRENT_TASK_PRIMACY_GUARD_REAL_LONG_CHAT
```

Design authority:

`docs/SIMCORE_07000_CURRENT_TASK_PRIMACY_GUARD_REBASED_DESIGN_2026-08-30.md`

## 1. Evidence packet

One natural long-chat sequence was supplied from runtime generation `mtfc7tze-9mosvb`:

```text
C @2576 -> assistant @2577
A @2578 -> assistant @2579
C @2580 -> assistant @2581
```

All three turns report:

```text
Version 0.70.0
Runtime ACTIVE
binding BOUND
output COMMITTED
stale 0
hooks NAMED
Warnings 0
RAW frame regression NONE
Continuity summary PASS
Frame sequence PASS
Frame guard PASS
```

The sequence is especially useful because it crosses from a completed Mode C Community frame into a materially different Mode A task and then explicitly asks for Community reaction to the new A source.

## 2. Stage A — ordinary continuity control

The first supplied C turn continues naturally from the immediately preceding Community context.

Observed:

```text
Mode C
request user @2576 -> assistant @2577
Prior representation UNAVAILABLE for this capture
Edit reconcile SAME_FAST
output COMMITTED
mirror COMMITTED
CANONICAL == FRESH_CHAT EXACT
RAW frame 87/2/1258 -> 87/3/1259
Continuity PASS
Warnings 0
```

Visible output remains on the user's current Community request while preserving the established world/topic facts.

Disposition:

```text
STAGE_A_ORDINARY_CONTINUITY = PASS
CONTEXT_AMNESIA = NOT OBSERVED
```

## 3. Stage B — task-shift replay control

The next request @2578 materially changes the generation task:

```text
previous completed task/frame = Mode C Community reaction block
current task = Mode A narrative/live scene about scheduling disclosure and a Wegovy rumor response
```

The assistant @2579 immediately switches to the requested Mode A narrative scene. It does not reintroduce the previous `<COMMUNITY>` category/frame and does not append the completed prior Community task after satisfying the current request.

Diagnostics:

```text
Mode A
Request lineage ROOT · root A@2578 · parent A@2578 · depth 0
Prior representation EXACT
current prior assistant match FRESH_CHAT exact
Edit reconcile SAME_FAST
Runtime prompt stable tier SAME
RAW frame 87/3/1259 -> 87/4/1260
Narrative clock ADVANCED
Continuity PASS
Warnings 0
```

This is direct live evidence for the v0.70 contract:

```text
current input task = primary generation authority
prior assistant output = continuity/reference context, not automatic current-task authority
```

Disposition:

```text
STAGE_B_TASK_SHIFT = PASS
PARTIAL_PREVIOUS_TURN_REPLAY = NOT OBSERVED
PRIOR_COMPLETED_COMMUNITY_FRAME_REPLAY = NOT OBSERVED
```

## 4. Stage D — explicit reuse / continuation positive control

The following request @2580 is intentionally short and explicitly asks:

```text
[커뮤니티] 라이브 반응
```

This requires reuse/transformation of the immediately previous A response rather than suppression of prior context.

Observed diagnostics:

```text
Mode C
Short-C source lock ON
Source handoff NEW SOURCE · same-short-request-new-source
Request lineage CHAIN · root A@2578 · parent A@2578 · depth 1
Evidence mode DUAL
Evidence root fence APPLIED
Evidence source fence APPLIED
RAW frame 87/4/1260 -> 87/5/1261
Continuity PASS
Warnings 0
```

The visible @2581 response correctly converts the immediately preceding A scene into Community reactions about the scheduling explanation and Wegovy rumor response.

Disposition:

```text
STAGE_D_EXPLICIT_REUSE = PASS
SHORT_C_FOLLOWUP_SEMANTICS = PRESERVED
CURRENT_TASK_PRIMACY_DID_NOT_CAUSE_CONTEXT_AMNESIA = PASS
```

## 5. Natural representation mismatch on @2581

The @2581 output also produced an independent representation event:

```text
Stability OBSERVED
Deferred mirror OUTPUT_MISMATCH
HOST_RAW   5438:ff9b28d
CANONICAL  2781:a7bbd36
FRESH_CHAT 2781:ba932c3
CANONICAL <-> FRESH delta chars +0
identity DIFFERENT
Warnings 0
Compatibility diagnostics 0
```

The exact differing bytes cannot be reconstructed because raw bodies are intentionally not retained.

Visible semantic review does not establish a Current Task Primacy regression. The response is on-topic, the Short-C source lock selects the new A source, continuity/frame checks pass, and no warning is emitted.

The Representation layer also fails safe: Deferred Mirror reports `OUTPUT_MISMATCH` and does not claim a false exact mirror commit.

Classification:

```text
WATCH · NATURAL_OUTPUT_REPRESENTATION_MISMATCH
not a v0.70 blocker from this packet
no semantic cause assigned
no cache/history cause assigned
no runtime patch authorized
```

This matches the existing conservative Representation contract: a natural Canonical/Fresh mismatch is evidence to preserve, not permission to invent the differing substring or weaken mirror guards.

If an immediate follow-up is performed for extra Representation evidence, preserve the natural state:

```text
DO NOT reroll
DO NOT manually edit the previous assistant
DO NOT reload
send one ordinary natural request
capture the next diagnostic
```

This follow-up is optional for v0.70 product acceptance but useful for checking the previously proven mismatch-to-Fresh fast-reconcile family.

## 6. Cache and performance observations remain separate

The three supplied turns show no evidence that SimCore is the first cache break:

```text
@2577 SimCore contribution NOT_FIRST_BREAK
@2579 SimCore contribution NOT_FIRST_BREAK
@2581 SimCore contribution NO_BREAK
provider cache UNVERIFIED
```

The first packet has a large `POST_ONSEND` interval (`8.997 s`), while later request preparation is much shorter. Storage/host-local write latency also varies materially between turns.

These are performance observations only. They are not causally tied to Current Task Primacy correctness and are not folded into this product verdict.

## 7. Remaining v0.70 live gate

The frozen design requires a second independent task-shift pair in Stage C.

Current status:

```text
Stage A ordinary continuity       PASS
Stage B first task shift          PASS
Stage C second independent shift  REQUIRED / NOT YET RECORDED
Stage D explicit reuse            PASS
Stage E MamsHolic natural control NOT EXERCISED / OPTIONAL WHEN NATURAL
```

Therefore:

```text
V07000_REAL_LONG_CHAT = STRONG_PARTIAL_PASS
HUMAN_EVIDENCE_LIVE_PASS = NOT YET AUTHORIZED
R2.8_TERMINAL_CONVERGENCE = DO NOT RUN YET
```

## 8. Recommended next live control

Use one more ordinary long-chat task shift with a materially different present job while retaining the same world/topic context.

Preferred shape:

```text
turn N = completed structured/narrative task
turn N+1 = narrower or different task that does not ask to continue/reuse the old frame
```

Acceptance:

```text
current task answered directly
completed prior frame/categories do not return unless explicitly requested
continuity facts remain usable
Warnings attributable to v0.70 = 0
frame/state continuity remains PASS
```

If that independent Stage C passes, the supplied packet plus that control is sufficient to move to explicit human LIVE_PASS review, subject to no new BLOCKER.

## 9. Final disposition

```text
CURRENT_TASK_PRIMACY_GUARD = LIVE POSITIVE
STAGE_A = PASS
STAGE_B = PASS
STAGE_D = PASS
STAGE_C = STILL REQUIRED
OUTPUT_MISMATCH = WATCH / SAFE-FAIL REPRESENTATION EVENT
RUNTIME CHANGE = NONE
RELEASE-SIMCORE CHANGE = NONE
LIVE_PASS = NOT YET
```

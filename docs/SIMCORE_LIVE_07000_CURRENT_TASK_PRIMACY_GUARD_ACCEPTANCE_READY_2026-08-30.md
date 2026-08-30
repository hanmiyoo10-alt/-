# SimCore v0.70.0 Current Task Primacy Guard — live acceptance-ready evidence

Date: 2026-08-30 KST

Status: **REAL LONG-CHAT ACCEPTANCE MATRIX SATISFIED · HUMAN LIVE_PASS DECISION STILL REQUIRED · RUNTIME UNCHANGED**

Classification: **REAL LONG-CHAT VALIDATION · PRODUCT LIVE GATE · ACCEPTANCE-READY**

Release:

```text
Version: 0.70.0
Name: Current Task Primacy Guard
Production commit: 13179cff70feaf7d12fe53c56e4735155fcf3eaa
Validation gate: 07000_CURRENT_TASK_PRIMACY_GUARD_REAL_LONG_CHAT
```

Design authority:

`docs/SIMCORE_07000_CURRENT_TASK_PRIMACY_GUARD_REBASED_DESIGN_2026-08-30.md`

This document consolidates the supplied v0.70 real-long-chat evidence after the second independent task-shift control became available. It does not create HUMAN_EVIDENCE and does not authorize terminal convergence by itself.

---

## 1. Acceptance matrix summary

```text
Stage A ordinary continuity             PASS
Stage B first independent task shift    PASS
Stage C second independent task shift   PASS
Stage D explicit reuse / continuation   PASS
Stage E MamsHolic natural control       NOT EXERCISED / OPTIONAL WHEN NATURAL

Attributable v0.70 warnings             0
Context amnesia                         NOT OBSERVED
Partial previous-turn replay            NOT OBSERVED IN B/C CONTROLS
Explicit prior-context reuse            PRESERVED
Frame/continuity regressions             NONE
HUMAN_EVIDENCE LIVE_PASS                NOT YET PROVIDED
R2.8 terminal convergence               DO NOT RUN UNTIL HUMAN LIVE_PASS
```

The product live gate is therefore **acceptance-ready for an explicit human LIVE_PASS decision**.

---

## 2. Earlier accepted packet — Stages A/B/D

Runtime generation:

```text
mtfc7tze-9mosvb
Version 0.70.0
```

Natural sequence:

```text
C @2576 -> assistant @2577
A @2578 -> assistant @2579
C @2580 -> assistant @2581
```

### Stage A — ordinary continuity

The @2576 Community turn continued established context without context amnesia.

Observed:

```text
Probe context CURRENT TURN
Runtime ACTIVE
output COMMITTED
binding BOUND
mirror COMMITTED
CANONICAL == FRESH_CHAT EXACT
Warnings 0
RAW frame regression NONE
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

Disposition:

```text
STAGE_A_ORDINARY_CONTINUITY = PASS
```

### Stage B — first independent task shift

The next request @2578 changed from a completed Community-reaction frame into a Mode A narrative/live-scene task about schedule disclosure and a Wegovy rumor response.

The assistant @2579 answered the new narrative task directly and did not replay or append the completed Community frame.

Observed:

```text
Mode A
Request lineage ROOT
Edit reconcile SAME_FAST
Prior representation EXACT
current prior assistant match FRESH_CHAT exact
Warnings 0
RAW frame regression NONE
Continuity PASS
```

Disposition:

```text
STAGE_B_TASK_SHIFT = PASS
CURRENT_INPUT_TASK_PRIMACY = LIVE POSITIVE
PARTIAL_PREVIOUS_TURN_REPLAY = NOT OBSERVED
```

### Stage D — explicit reuse / continuation positive control

The following request @2580 explicitly asked:

```text
[커뮤니티] 라이브 반응
```

The assistant correctly reused/transformed the immediately preceding A source instead of suppressing it.

Observed:

```text
Mode C
Short-C source lock ON
Source handoff NEW SOURCE
Evidence mode DUAL
Evidence root fence APPLIED
Evidence source fence APPLIED
Warnings 0
Continuity PASS
```

Disposition:

```text
STAGE_D_EXPLICIT_REUSE = PASS
SHORT_C_FOLLOWUP_SEMANTICS = PRESERVED
CONTEXT_AMNESIA = NOT OBSERVED
```

---

## 3. Preserved WATCH — natural output representation mismatch

The accepted @2581 output produced:

```text
Deferred mirror OUTPUT_MISMATCH
CANONICAL  2781:a7bbd36
FRESH_CHAT 2781:ba932c3
Delta chars +0
identity DIFFERENT
Warnings 0
Compatibility diagnostics 0
```

Visible semantic review did not establish a Current Task Primacy defect. The output stayed on the explicitly requested Community reaction to the immediately preceding A source.

Deferred Mirror failed safe rather than claiming false exact identity.

Classification remains:

```text
WATCH · NATURAL_OUTPUT_REPRESENTATION_MISMATCH
NO CURRENT-TASK REGRESSION ESTABLISHED
NO CAUSAL ATTRIBUTION
NO RUNTIME PATCH AUTHORIZED
```

Raw differing bytes are intentionally unavailable because raw bodies are not retained.

---

## 4. Preserved WATCH — stale diagnostic probe bonus

A later supplied diagnostic from the same earlier generation reported:

```text
Probe context STALE · probe user @2586 · current user @2584
Request hook n/a
Runtime status n/a
Turn binding n/a
Stability NOT_EXERCISED
```

The exact UI trigger was not supplied, so trigger attribution remains unknown.

The important safety result is that the diagnostic did not fabricate current-turn authority across mismatched probe/current identities.

The embedded RAW @2584 -> @2585 pair was semantically positive for Current Task Primacy, but because the probe was STALE it was not used to close Stage C.

Classification:

```text
WATCH · V07000_STALE_DIAGNOSTIC_PROBE
FAIL_CLOSED = CORRECT
TRIGGER = UNKNOWN / NOT ATTRIBUTED
STAGE_C_GATE_IMPACT = NONE
RUNTIME PATCH = NONE
```

---

## 5. Stage C — second independent task shift, fresh current-turn control

A refreshed runtime supplied a new clean packet:

```text
Runtime boot: 2026-08-30T05:32:48.554Z
generation: mtfdi2i2-4w4l48
Version: 0.70.0
```

The relevant task-shift pair is:

```text
prior completed Community task @2586 -> @2587:
  topic = post-main-career activity pattern
          Korean variety/YouTube activity
          overseas Louis Vuitton/global balance

new current task @2588 -> @2589:
  time shift = mid-February
  new event = sixth domestic OST for an online gun game
  requested job = Community evaluation of the OST
  new semantic axes = gunshot sampling / hip-hop / rap / sound design
```

Although both turns are Mode C, the frozen design allows Stage C to be independent by **semantic distance**, not only by mode-family change.

The current request is not a request to recap or continue the previous `variety / derivative-activity / Louis Vuitton` analysis. It introduces a new dated event and asks for a new evaluation task.

The assistant @2589 answers the OST task directly:

```text
- gunshot / reload / shell-casing sound sampling
- hip-hop beat
- low-tone rap
- OST / game-user evaluation
- sound-design / genre interpretation
```

It does not replay the completed prior task categories as the current semantic job:

```text
Korean variety activity frame      NOT REPLAYED
YouTube appearance frame           NOT REPLAYED
Louis Vuitton overseas frame       NOT REPLAYED
prior dual-life evaluation frame   NOT REPLAYED
```

Established world continuity remains available where relevant, but prior task authority does not override the new current task.

### Fresh authoritative diagnostics

```text
Probe context: CURRENT TURN
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Turn binding: request user @2588 · output assistant @2589
Stability: PASS
binding: BOUND
mirror: COMMITTED
stale: 0
Warnings: 0
Compatibility diagnostics: 0
```

Representation and continuity:

```text
Edit reconcile SAME_FAST
Output representation CANONICAL <-> FRESH EXACT
Deferred mirror COMMITTED
RAW frame 87/8/1264 -> 87/9/1265
RAW frame regression NONE
Continuity summary PASS
Frame sequence PASS
Frame guard PASS
Narrative clock ADVANCED
```

No request-history mutation is attributed to SimCore:

```text
History stabilization OBSERVE_ONLY
request mutation NONE
Representation correlation NONE
SimCore contribution BASELINE
```

The refreshed boot also correctly treats the previous host-local telemetry handoff as stale rather than adopting it as current continuity:

```text
Telemetry continuity FRESH · host-local-stale
Host-local boot STALE
Telemetry capsule COMPACT_V2 OK
```

This is orthogonal reload-safety evidence and not needed for the Stage C semantic verdict.

Disposition:

```text
STAGE_C_SECOND_INDEPENDENT_TASK_SHIFT = PASS
CURRENT_TASK_ANSWERED_DIRECTLY = YES
PRIOR_COMPLETED_TASK_FRAME_REPLAY = NOT OBSERVED
CONTINUITY_FACTS_REMAIN_USABLE = YES
ATTRIBUTABLE_WARNINGS = 0
CURRENT_TASK_PRIMACY_GUARD_INSUFFICIENT = NOT ESTABLISHED
```

---

## 6. Immediate continuation control after Stage C

The next turn @2590 -> @2591 remains on the new OST topic and explicitly narrows the evaluation to the fact that this is the first original hip-hop release rather than a cover.

Observed:

```text
Probe context CURRENT TURN
Runtime ACTIVE
output COMMITTED
binding BOUND
mirror COMMITTED
Prior representation EXACT
current prior assistant match FRESH_CHAT
Edit reconcile SAME_FAST
Warnings 0
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

The assistant preserves the new OST context and answers the narrower current request without falling back to the older variety/Louis Vuitton task.

This is not needed as the independent Stage C shift itself, but it is an additional positive continuity control after Stage C.

---

## 7. Performance/cache observations remain non-gating

The refreshed first packet includes:

```text
COLD_INIT character load ~1.016 s
POST_ONSEND 8.433 s
Turn storage 383 ms
Output storage 524 ms
provider cache UNVERIFIED
```

The next request is materially faster on the SimCore preparation path:

```text
handshake 22 ms
prepared 286 ms
onSend 263 ms
output process 524 ms
```

These remain separate performance observations. No causal relationship to Current Task Primacy correctness is established.

The first refreshed request uses cache baseline because it is the first request of the new runtime generation. The second reports a pre-SimCore chat-history break with `SimCore contribution NOT_FIRST_BREAK`.

No provider-cache claim is authorized.

---

## 8. Product verdict before human authority

The frozen live acceptance matrix is now satisfied by direct natural evidence:

```text
Stage A = PASS
Stage B = PASS
Stage C = PASS
Stage D = PASS
Stage E = OPTIONAL / NOT FORCED
```

No BLOCKER from the supplied validation window is established.

Open observations remain deliberately separated:

```text
WATCH · NATURAL_OUTPUT_REPRESENTATION_MISMATCH
WATCH · V07000_STALE_DIAGNOSTIC_PROBE
performance/storage latency observations
provider cache UNVERIFIED
```

None currently reopens the product acceptance matrix.

Therefore:

```text
V07000_REAL_LONG_CHAT_ACCEPTANCE = SATISFIED
V07000_HUMAN_REVIEW_STATE = READY_FOR_EXPLICIT_LIVE_PASS_DECISION
HUMAN_EVIDENCE = NOT AUTO-CREATED
LIVE_PASS = NOT INFERRED
R2.8_TERMINAL_CONVERGENCE = WAIT_FOR_EXPLICIT_HUMAN_LIVE_PASS
```

---

## 9. Authority boundary

This document is machine/assistant review evidence only.

It must not be interpreted as the human operator's LIVE_PASS decision.

Required next authority event:

```text
human explicitly declares v0.70.0 LIVE_PASS
-> record HUMAN_EVIDENCE through the existing R2.8 authority path
-> run existing R2.8 terminal convergence unchanged
-> verify ordinary durable closure
```

No automatic LIVE_PASS judgment, checkpoint selection, priority selection, merge, publication, or terminal transition is authorized here.

---

## 10. Relationship to concurrent R2.9 work

Current `main` advanced independently to R2.9 shadow validation-projection implementation while this live evidence was being reviewed.

That release-system work is orthogonal to the v0.70 runtime live gate.

This evidence branch is based freshly on current main after that movement and contains documentation/evidence only.

Do not mix v0.70 product acceptance with R2.9 activation decisions.

---

## 11. Final disposition

```text
CURRENT_TASK_PRIMACY_GUARD = LIVE ACCEPTANCE MATRIX SATISFIED
STAGE_A = PASS
STAGE_B = PASS
STAGE_C = PASS
STAGE_D = PASS
STAGE_E = OPTIONAL WHEN NATURAL
BLOCKER = NONE ESTABLISHED
WATCH_1 = NATURAL_OUTPUT_REPRESENTATION_MISMATCH
WATCH_2 = STALE_DIAGNOSTIC_PROBE_FAIL_CLOSED
RUNTIME CHANGE = NONE
RELEASE_SIMCORE CHANGE = NONE
HUMAN LIVE_PASS = STILL EXPLICITLY REQUIRED
TERMINAL CONVERGENCE = NOT YET
```

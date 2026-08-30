# SimCore v0.70.1 Cold First-Turn Tail Attribution — live validation protocol

Date: 2026-08-30 KST

Status: **PROTOCOL FROZEN · LIVE EVIDENCE NOT YET SUPPLIED · HUMAN LIVE DECISION NOT INFERRED**

Classification: **REAL LONG-CHAT VALIDATION · PRODUCT LIVE GATE · OBSERVABILITY ATTRIBUTION**

## 1. Exact production identity

```text
Release: simcore-v0.70.1-new-01
Version: 0.70.1
Name: Cold First-Turn Tail Attribution
Production commit: 861100f4771967aa5b8ab8811d06f11702c0d3ff
Previous production: 13179cff70feaf7d12fe53c56e4735155fcf3eaa
Production blob: 8f332cfceed316d35954e353c2eaca38c2f34d95
Permanent Release run: 33297991331
release-simcore latest.js == install.js: YES
main post-publish state: LIVE_PENDING
main state commit: 43004aba23e19ff0414d3a342a46704b9cefc55d
Live scenario: 07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_REAL_LONG_CHAT
Close authority: HUMAN_EVIDENCE
```

Authority:
- `docs/SIMCORE_07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_DESIGN_2026-08-30.md`
- `docs/SIMCORE_07001_IMPLEMENTATION_EVIDENCE_2026-08-30.md`
- `products/simcore/releases/records/simcore-v0.70.1-new-01.json`

This document freezes the capture procedure only. It does not create HUMAN_EVIDENCE, infer LIVE_PASS, choose the next checkpoint, or authorize a successor optimization.

## 2. What this release is testing

v0.70.1 is not a speed fix. It adds read-only timing checkpoints to the existing post-onSend residual so a recurrent cold first-request delay can be attributed conservatively.

The live result must eventually be classified as exactly one of:

```text
SIMCORE_NAMED_TAIL
HOST_OR_SCHEDULER_GAP
MIXED_OR_UNRESOLVED
```

No provider/host subsystem may be named beyond what the diagnostic directly observes.

## 3. Exact diagnostic line

The production runtime emits this bounded line in `SimCore Last Turn Diagnostic`:

```text
Post-onSend attribution: named <ms> · history <ms> · prompt <ms> · topology <ms> · candidate <ms> · unattributed <ms> · first-request <sessionPath> · confidence <BOUNDED|UNRESOLVED> [· checkpoint FAIL_CLOSED]
```

The fields are:

```text
named        = history + prompt + topology + candidate exact named spans
history      = HISTORY_STABILIZATION span
prompt       = PROMPT_ACCOUNTING span
topology     = existing CACHE_TOPOLOGY span
candidate    = existing CACHE_CANDIDATE span
unattributed = authoritative postOnSend total minus named spans
first-request= session path observed by the existing runtime
confidence   = BOUNDED only when non-negative closure is valid
```

`postOnSendMs` remains the authoritative total. If checkpoints fail or closure is impossible, attribution must degrade to `UNRESOLVED`; request correctness must remain unaffected.

For every live sample, preserve the entire `SimCore Last Turn Diagnostic`, not only this line. The surrounding generation, request timing, runtime status, binding, warnings, session path, continuity/frame state and storage/cache observations are needed to validate that the sample is usable.

## 4. Stage A — fresh runtime first request

Create one true fresh runtime generation. A normal full refresh/new runtime boundary is sufficient. Then send one ordinary long-chat request.

Required evidence:

```text
Version 0.70.1
new runtime boot/generation identity
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
Warnings attributable to v0.70.1 = 0
continuity/frame/state correctness PASS
Post-onSend attribution present
```

Capture:

```text
request total
handshake
prepared/onSend
post-onSend total
Post-onSend attribution line
session load / first-request path
turn storage / output storage when present
generation id
warnings / compatibility diagnostics
```

Do not refresh again before Stage B.

## 5. Stage B — same-generation warm request

In the exact same runtime generation, send the next ordinary request without refresh/reload.

Required evidence:

```text
same generation as Stage A
LOCATION_REUSE or equivalent warm session state where naturally reported
Runtime ACTIVE / output COMMITTED / binding BOUND
correctness PASS
Post-onSend attribution present
Warnings attributable to v0.70.1 = 0
```

The warm control exists to compare whether the same named span that was large on the cold request materially collapses, or whether the dominant residual remains outside named SimCore spans.

## 6. Stage C — independent second fresh runtime

Create a second independent fresh runtime generation and send one ordinary long-chat request.

Required evidence is the same as Stage A, but the generation must differ from Stage A/B.

This second fresh control is mandatory because the target is a recurrent cold-first-turn class. One isolated cold sample cannot justify a SimCore optimization owner.

A warm follow-up in the second generation is useful if naturally available, but the frozen minimum gate is:

```text
fresh sample #1
same-generation warm sample #1
fresh sample #2
```

## 7. Usability gate for each sample

A sample is usable for attribution only when:

```text
current-turn authority is not stale
runtime/request/output binding is established
no v0.70.1 correctness regression is present
post-onSend total is available
Post-onSend attribution is present
session/generation identity is known
```

A `confidence UNRESOLVED` sample is still valid evidence, but it cannot by itself establish `SIMCORE_NAMED_TAIL`.

A stale diagnostic probe may be preserved as WATCH evidence but must not replace a required current-turn sample.

## 8. Attribution verdict rules

### SIMCORE_NAMED_TAIL

Use only if both independent fresh samples show the dominant first-turn delay repeatedly enclosed by the same named exact SimCore span or spans, and the same named ownership materially collapses in the same-generation warm control.

Result:

```text
attribution = SIMCORE_NAMED_TAIL
follow-up optimization design MAY be justified against that exact owner
v0.70.1 itself still makes no speed claim
```

### HOST_OR_SCHEDULER_GAP

Use when the dominant first-turn delay repeatedly remains in `unattributed` time between exact SimCore checkpoints, with no named SimCore span accounting for the delay.

Result:

```text
attribution = HOST_OR_SCHEDULER_GAP
no SimCore optimization release authorized from this lane
retain host/platform performance WATCH
```

This verdict does not identify a specific host subsystem.

### MIXED_OR_UNRESOLVED

Use when:

```text
fresh samples disagree materially
confidence/closure is unresolved
multiple named and unattributed spans contribute without one repeatable owner
or evidence is insufficient for a bounded owner claim
```

Result:

```text
attribution = MIXED_OR_UNRESOLVED
WATCH / further investigation
no speculative optimization
```

## 9. Failure and anomaly classification

### BLOCKER

```text
instrumentation changes request/output semantics
new warning/quarantine attributable to v0.70.1
current-task/continuity/frame/state regression
checkpoint code causes request failure
persistent schema/state behavior changes unexpectedly
latest.js != install.js
```

### FIX / DESIGN REVISION

```text
post-onSend accounting no longer closes against the previous authoritative total
measurement cannot remain read-only and bounded
required attribution cannot be obtained without invasive cross-owner mutation
```

### WATCH

```text
one isolated timing anomaly with correctness intact
stale diagnostic probe that fails closed correctly
host/scheduler-like gap without enough evidence for stronger attribution
```

Any observed anomaly must be preserved in the repo before continuing to the next release step.

## 10. Human authority boundary

Completing the Stage A/B/C matrix does not automatically create LIVE_PASS.

The sequence is:

```text
raw live diagnostics supplied
-> preserve/review evidence on main
-> classify attribution outcome
-> determine whether the frozen live acceptance matrix is satisfied
-> present acceptance-ready result to human operator
-> human explicitly declares LIVE_PASS or other disposition
-> only then create HUMAN_EVIDENCE through the existing release authority path
-> run existing terminal convergence unchanged
```

The assistant/automation must not infer:

```text
LIVE_PASS
checkpoint selection
next priority
optimization authorization
```

## 11. Operator capture packet

The smallest acceptable packet to send back for review is:

```text
A. Fresh generation #1
   full SimCore Last Turn Diagnostic

B. Warm request in the same generation
   full SimCore Last Turn Diagnostic

C. Fresh generation #2
   full SimCore Last Turn Diagnostic
```

If a visible semantic anomaly occurs, include the immediately relevant user request/assistant response context as well. Do not intentionally force unrelated optional controls merely to manufacture evidence.

## 12. Current disposition

```text
V07001_PRODUCTION = PUBLISHED_IDENTITY_VERIFIED
V07001_RELEASE_STATE = LIVE_PENDING
V07001_LIVE_EVIDENCE = NOT YET SUPPLIED
V07001_HUMAN_EVIDENCE = NOT CREATED
ATTRIBUTION_VERDICT = NOT YET DETERMINED
BLOCKER = NONE CURRENTLY RECORDED
NEXT = REAL LONG-CHAT FRESH -> WARM -> INDEPENDENT FRESH CAPTURE
```

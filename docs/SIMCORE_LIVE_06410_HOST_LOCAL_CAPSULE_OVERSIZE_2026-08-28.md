# SimCore v0.64.10 — Host-Local Capsule Oversize Live Evidence

Date: 2026-08-28
Status: **DIRECT LIVE EVIDENCE · LIVE FAIL BEFORE REFRESH · HOST SURFACE PROVEN · CAPSULE SIZE CONTRACT MISMATCH**
Scenario: `06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.10 — Host-Local One-Shot Telemetry Handoff`
Release authority: `release-simcore` commit `e43ace74241984f21f69299eff690d0c4f483381`
Release blob: `b7d76bd03a435356eeea6948968b0d33ac564ae7`
Runtime boot: `2026-08-28T06:03:57.249Z`
Runtime generation: `mtcjqf29-y47yst`

## 1. Executive finding

Three consecutive ordinary natural outputs in one real long-chat v0.64.10 runtime establish the pre-refresh result.

All three packets report the same usable Host-local capability surface:

```text
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
```

but every eligible OUTPUT_COMMIT checkpoint fails the common 16,384-character capsule bound before a Host-local write is attempted:

```text
@2182 -> @2183: HOST_LOCAL OVERSIZE · serialization OVERSIZE · 44,660 chars
@2184 -> @2185: HOST_LOCAL OVERSIZE · serialization OVERSIZE · 40,291 chars
@2186 -> @2187: HOST_LOCAL OVERSIZE · serialization OVERSIZE · 59,965 chars
```

Therefore:

```text
Host API existence                  = PROVEN
Host store acquisition              = PROVEN
Host store getItem/setItem surface  = PROVEN
Host clear mode                     = REMOVE
boot mailbox read                   = PROVEN / EMPTY
browser session transport           = UNAVAILABLE in this Host
common telemetry serialization      = OVERSIZE in 3/3 natural specimens
Host-local real checkpoint write    = NOT REACHED
same-tab refresh prerequisite       = FAIL
```

The live failure is **not** evidence that Host-local plugin storage is unavailable or too small. The writer intentionally refuses to call Host-local `setItem` when the common telemetry capsule exceeds the frozen 16,384-character privacy/size contract.

Per the v0.64.10 operator contract, same-tab refresh must not be performed after this pre-refresh result.

## 2. Diagnostic Review Episode

Episode boundary:

```text
v0.64.10 installed / production runtime generation mtcjqf29-y47yst
→ natural C request @2182 → output @2183
→ natural A request @2184 → output @2185
→ natural C request @2186 → output @2187
→ no refresh between the three supplied specimens
```

Shared invariants:

```text
Version: 0.64.10
Runtime boot: 2026-08-28T06:03:57.249Z
generation: mtcjqf29-y47yst
epoch: 1
stale drops: 0
UI parts: 2
hook cleanup: NAMED
request hook: SEEN
Core handshake: FOUND
runtime: ACTIVE
output: COMMITTED
binding: BOUND
mirror: COMMITTED
Warnings: 0
Telemetry continuity: FRESH · host-local-empty
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
provider cache: UNVERIFIED
```

The material telemetry invariant is:

```text
Host-local capability remains usable
while
serialized capsule remains above 16,384 chars
```

This separates the failure from Host acquisition/surface availability.

## 3. Specimen A — C @2182 → @2183

Checkpoint:

```text
Telemetry checkpoint:
MEMORY WRITTEN
· SESSION UNAVAILABLE
· HOST_LOCAL OVERSIZE
· serialization OVERSIZE
· 44,660 chars
· trigger OUTPUT_COMMIT
```

Other material facts:

```text
Stability PASS
mirror COMMITTED
Warnings 0
Compatibility 0
runtime prompt 2,164 chars / 38 lines
cache break PRE_SIMCORE · CHAT_HISTORY
SimCore contribution NOT_FIRST_BREAK
```

RAW semantic review:

The user asks for community reactions to the expected wedding guest lineup, emphasizing both Siwoo and Miwoo's broad domestic networks and Siwoo's overseas network. The visible C response directly follows that frame across Korean and English-facing community sections and does not replay an unrelated previous request.

```text
CURRENT_INPUT_FIT = PASS
VISIBLE_RESPONSE_FRAME = CURRENT_REQUEST_REACTION
PREVIOUS_TURN_SEMANTIC_REPLAY = NOT OBSERVED
```

The PRE_SIMCORE history-prefix observation is separate from the telemetry oversize failure because the common capsule size gate is explicitly reported and no Host-local write is reached.

## 4. Specimen B — A @2184 → @2185

Checkpoint:

```text
Telemetry checkpoint:
MEMORY WRITTEN
· SESSION UNAVAILABLE
· HOST_LOCAL OVERSIZE
· serialization OVERSIZE
· 40,291 chars
· trigger OUTPUT_COMMIT
```

Other material facts:

```text
Stability PASS
mirror COMMITTED
Warnings 0
Compatibility 1
Compatibility detail: Thoughts 호환 preamble 제거
runtime prompt 1,756 chars / 33 lines
cache break PRE_SIMCORE · CHAT_HISTORY
SimCore contribution NOT_FIRST_BREAK
```

RAW semantic review:

The user provides a detailed Running Man scene request centered on the mock wedding press conference, proposal story, handmade storybook/ring, the `UNIVERSE` title, and the cast's attendance response. The visible A output follows those requested beats in sequence and advances chapter/Chatindex/time consistently.

```text
CURRENT_INPUT_FIT = PASS
VISIBLE_RESPONSE_FRAME = CURRENT_SCENE
PREVIOUS_TURN_SEMANTIC_REPLAY = NOT OBSERVED
FRAME_SEQUENCE = PASS
```

The single Compatibility diagnostic is the already-supported Thoughts compatibility preamble removal and has no demonstrated relation to the telemetry capsule size failure.

## 5. Specimen C — C @2186 → @2187

Checkpoint:

```text
Telemetry checkpoint:
MEMORY WRITTEN
· SESSION UNAVAILABLE
· HOST_LOCAL OVERSIZE
· serialization OVERSIZE
· 59,965 chars
· trigger OUTPUT_COMMIT
```

Other material facts:

```text
Stability PASS
mirror COMMITTED
Warnings 0
Compatibility 0
runtime prompt 3,531 chars / 53 lines
Short-C source lock ON
Source handoff NEW SOURCE
Evidence mode ROOT_ONLY
Evidence root fence APPLIED
Evidence source fence SKIPPED · source TRANSFORMED · unsafe-source-boundary
```

RAW semantic review:

The short C request asks for community reaction to the immediately preceding Running Man scene. The visible output reacts specifically to the proposal story, `UNIVERSE` naming, handmade ring/book, teasing questions, and cast attendance response from that source.

```text
CURRENT_INPUT_FIT = PASS
VISIBLE_RESPONSE_FRAME = CURRENT_SOURCE_REACTION
PREVIOUS_TURN_SEMANTIC_REPLAY = NOT OBSERVED
```

`Evidence source fence: SKIPPED` is preserved as a scoped evidence-shape observation. In this packet the source is classified `TRANSFORMED` with an unsafe source boundary while the root fence is applied; no visible semantic correctness consequence is established by this specimen.

## 6. Adjacent delta review

Across A → B → C:

```text
A. turn/request identity                 CHANGED
B. operator action                       CHANGED · ordinary next natural request
C. user-intent summary                   CHANGED
D. output semantic frame                 CHANGED · follows each current request
E. runtime generation / epoch            UNCHANGED
F. edit / representation                 UNCHANGED in health · SAME_FAST / EXACT carryover controls
G. history mutation / stabilization      CHANGED locally · PRE_SIMCORE observations continue
H. cache topology / trajectory           CHANGED · common frontier grows 21→23→25 msgs
I. stable/slow runtime identity tiers     UNCHANGED
J. lifecycle / frame / chronology         HEALTHY / expected per mode
K. telemetry handoff state               UNCHANGED in verdict · FRESH / SESSION unavailable / HOST_LOCAL oversize
L. warnings / compatibility               warnings unchanged 0; compatibility 0→1→0
M. timing / hotspots                      CHANGED · storage latency varies
```

The attribution anchor is K:

```text
intent/mode/output/cache details change
while
Host-local surface stays USABLE
and
common serialization stays OVERSIZE
```

## 7. Source-level cause boundary

Production v0.64.10 builds the capsule from three live observer exports:

```text
runtimePromptCache: runtimePromptCache.exportState()
requestTopology: requestTopology.exportState()
cacheCandidates: cacheCandidates.exportState()
```

and `runtime-telemetry.capture()` retains those export objects directly inside the schema-1 capsule before one `JSON.stringify` size check.

A confirmed scaling source is the runtime-prompt cache sketch:

```text
function cacheSketch(text) {
  const prefixHashes = new Array(value.length);
  ...
  prefixHashes[i] = h >>> 0;
  ...
  return { version: 1, chars: value.length, prefixHashes, lineHashes, lineReasons };
}
```

The export then carries that sketch:

```text
exportState() {
  ...
  return {
    version: 1,
    key: previousKey,
    sketch: previousSketch,
    ...
  };
}
```

Therefore runtime-prompt telemetry contains an integer `prefixHashes` entry for every runtime-prompt character. This is metadata-only and does not retain raw prompt text, but its serialized representation scales with prompt length rather than remaining within the 16,384-character capsule budget.

The request-topology export also carries per-message signatures and a system-prefix sketch, and the cache-candidate export carries its bounded trajectory state. Exact per-component serialized contribution is **not measured by the supplied live diagnostic**, so do not claim that `prefixHashes` is the sole contributor.

Supported source-level conclusion:

```text
common capsule export shape is not guaranteed to fit the frozen 16,384-char serialized contract in a real long chat
```

This is stronger and more accurate than attributing the failure to Host-local storage capacity.

## 8. Permanent test gap exposed

The permanent v0.64.10 Host-local suite correctly tests:

- a small synthetic capsule that reaches `HOST_LOCAL WRITTEN`;
- a deliberately huge synthetic payload that reaches `HOST_LOCAL OVERSIZE` with no Host I/O;
- serialization failure, Host acquisition/write/consume behaviors, priority, and one-shot semantics.

However, the small positive fixture uses tiny hand-authored stand-ins for `runtimePromptCache`, `requestTopology`, and `cacheCandidates`. It does not compose a checkpoint from realistic exporter states produced by a long-chat-shaped runtime and assert that the resulting common capsule remains under the 16,384-character bound.

Thus CI proved the **OVERSIZE policy** but did not prove that the normal production exporter composition can satisfy the size prerequisite in the intended real-long-chat operating envelope.

Classification:

```text
06410_REAL_EXPORT_CAPSULE_SIZE_GAP
= FIX / RUNTIME_TELEMETRY_EXPORT_SHAPE / LIVE_GATE_BLOCKING
= DIRECT_LIVE_EVIDENCE
= HOST_SURFACE_PROVEN
= HOST_WRITE_NOT_REACHED
= TEST_COVERAGE_GAP_CONFIRMED
```

## 9. What is and is not proven

Proven:

```text
Risuai.getLocalPluginStorage exists in this production Host
Host store acquisition succeeds
getItem/setItem surface is usable
removeItem clear path is available
boot mailbox read executes and returns EMPTY
browser sessionStorage remains unavailable through both authorized roots
three ordinary natural checkpoints execute
common telemetry capsule is oversized in all three supplied checkpoints
output semantics remain healthy despite telemetry failure
```

Not proven:

```text
Host-local persistence across a same-tab refresh
Host-local setItem success for the real long-chat capsule
Host-local consume/adopt success after refresh
exact Host-local storage capacity
exact per-export byte/character contribution
provider cache behavior
```

## 10. Gate disposition

The v0.64.10 live contract requires a real durable pre-refresh checkpoint before refresh:

```text
SESSION WRITTEN
or
HOST_LOCAL WRITTEN
```

The supplied runtime instead gives three independent ordinary checkpoints with:

```text
SESSION UNAVAILABLE
HOST_LOCAL OVERSIZE
```

Therefore:

```text
06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
= LIVE FAIL
= CLASSIFIED BEFORE REFRESH

refresh experiment
= STOP / NOT ELIGIBLE

Host-local capability objective
= LIVE PROVEN THROUGH ACQUIRE/READ SURFACE

Host-local durable checkpoint objective
= NOT REACHED

blocking defect
= REAL EXPORT CAPSULE SIZE CONTRACT MISMATCH

M2-3
= BLOCKED
```

Do not refresh merely to see what happens; there is no durable Host-local capsule to adopt.

## 11. Next bounded repair requirement

The next runtime repair must preserve the existing privacy boundary while making the **actual exported observer state** fit a deliberately bounded capsule contract.

It must not solve this by silently raising/removing the size cap without a separate privacy/performance design.

Required design questions include:

```text
which observer facts are actually necessary for first-post-refresh continuity?
how can runtime-prefix comparison be represented without one hash per prompt character?
what exact per-component and whole-capsule serialized bounds are frozen?
what graceful degradation occurs when one component exceeds its budget?
what permanent fixture composes realistic long-chat exporter states and proves the complete capsule bound?
```

The Host-local transport itself should remain available as the already-proven candidate durable surface unless new evidence contradicts it.

## 12. Review completion

```text
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
```

No additional pre-refresh natural packet is required to establish the v0.64.10 gate failure. Three supplied specimens already reproduce the same blocking serialization disposition across C, A, and C with otherwise healthy Core/output controls.

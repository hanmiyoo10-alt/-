# SimCore v0.64.9 — Session Transport Root Access Error Live Evidence

Date: 2026-08-28
Status: **DIRECT LIVE EVIDENCE · LIVE FAIL BEFORE REFRESH · ROUTE C · NEXT DURABLE TRANSPORT REQUIRED**
Scenario: `06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.9 — Session Transport Root Resolution`
Release authority: `release-simcore` commit `1c1037e44d6b3e903b3d622b579095b1f315758e`
Release blob: `7d2731d256b8aa18598c389fd919550cf3bbf146`
Runtime boot: `2026-08-28T04:12:59.337Z`
Runtime generation: `mtcfrps9-1i6487`

## 1. Executive finding

Two consecutive ordinary natural outputs in the same real long-chat v0.64.9 runtime resolve the v0.64.8 ambiguity.

Both authorized session roots were inspected and both produced the same passive surface result:

```text
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · 0 chars · <0-1 ms> · trigger OUTPUT_COMMIT
```

Therefore the v0.64.9 root-resolution feature has done its intended attribution job:

```text
WINDOW root binding exists / was addressable enough to inspect
GLOBAL_THIS root binding exists / was addressable enough to inspect
reading sessionStorage through WINDOW      = ACCESS_ERROR
reading sessionStorage through GLOBAL_THIS = ACCESS_ERROR
usable qualifying session candidate        = NONE
real session checkpoint write               = NOT REACHED
memory checkpoint                           = WRITTEN
output commit                               = HEALTHY
```

The exact underlying Host/browser policy that causes the property-access exception is still not identified because the frozen diagnostic contract intentionally retains no exception message or stack.

However, the release-level routing question is resolved: neither authorized root exposes a usable `sessionStorage` transport in this actual runtime.

Per the activated v0.64.9 Route C and live-gate contract, no refresh is required or useful after this pre-refresh result.

## 2. Diagnostic Review Episode

Episode boundary:

```text
v0.64.9 installed / new production runtime
→ natural C request @2176 → output @2177
→ natural C request @2178 → output @2179
→ no refresh / retry / reroll / manual edit between specimens
```

Both packets share:

```text
Version: 0.64.9
Runtime boot: 2026-08-28T04:12:59.337Z
generation: mtcfrps9-1i6487
epoch: 1
stale drops: 0
UI parts: 2
hook cleanup: NAMED
Runtime status: ACTIVE
output: COMMITTED
Mode: C
Warnings: 0
Compatibility diagnostics: 0
Telemetry continuity: FRESH · no-compatible-handoff
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · trigger OUTPUT_COMMIT
provider cache: UNVERIFIED
```

No boundary action occurred between the packets, so the second packet is confirmation of the same pre-refresh capability outcome, not a cross-reload observation and not an independent anomaly recurrence claim.

## 3. Specimen A — request @2176 → output @2177

Capture:

```text
Captured: 2026-08-28T04:17:16.139Z
Mode: C
Stability: PASS
binding: BOUND
output: COMMITTED
mirror: COMMITTED
Edit reconcile: SAME_FAST · 0.0 ms
Cache topology: BASELINE · messages 46 · chars 490,306
Cache trajectory: BASELINE · family 9a251081 · distinct 1 · attempts 1
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · 0 chars · 1.0 ms · trigger OUTPUT_COMMIT
Continuity summary: PASS
Frame sequence: PASS
```

### RAW semantic review

Current user intent:

```text
[커뮤니티] 비하인드 영상 반응
```

The immediately preceding A output was the Netflix behind-the-scenes interview about:

- the purple hair being color spray rather than permanent dye;
- Ash being prepared as an intentionally unreal / gray-zone character;
- forget-me-not as the prop anchoring that unreal character to reality;
- Siwoo's overseas/Hollywood ambition.

The C response directly turns those facts into community reactions across Korean and English-facing platforms. It does not reopen an unrelated prior response frame and does not visibly violate the requested community scope.

Semantic result:

```text
CURRENT_INPUT_FIT = PASS
VISIBLE_RESPONSE_FRAME = CURRENT_SOURCE_REACTION
PREVIOUS_TURN_SEMANTIC_REPLAY = NOT OBSERVED
```

Short-C source handling also behaved consistently with this request:

```text
Short-C source lock: ON
Source handoff: NEW SOURCE · reason same-short-request-new-source
Evidence mode: DUAL
Evidence root fence: APPLIED
Evidence source fence: APPLIED
```

No new semantic anomaly is introduced by specimen A.

## 4. Specimen B — request @2178 → output @2179

Capture:

```text
Captured: 2026-08-28T04:24:03.371Z
Mode: C
Stability: OBSERVED
binding: BOUND
output: COMMITTED
mirror: OUTPUT_MISMATCH
Edit reconcile: SAME_FAST · 0.0 ms
Output representation: CANONICAL↔FRESH Δchars +2 · DIFFERENT
Cache topology: COMMON_PREFIX · 17/48 msgs · 436,899/493,612 chars · 88.5%
Cache break: PRE_SIMCORE · CHAT_HISTORY · @17 assistant→assistant
SimCore contribution: NOT_FIRST_BREAK
Cache trajectory: OBSERVING · family 9a251081 · distinct 2 · attempts 2
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · 0 chars · 0.0 ms · trigger OUTPUT_COMMIT
Continuity summary: PASS
Frame sequence: PASS
```

### RAW semantic review

Current user intent asks for community reactions to three points:

```text
1. gray-zone roles are difficult but future overseas works using them are exciting
2. Siwoo's acting is trusted
3. people hope the overseas career goes well
```

The visible response directly follows those points:

- gray-zone acting difficulty;
- expectation for the overseas positioning;
- established trust in the acting;
- explicit support / hope for Hollywood success.

Semantic result:

```text
CURRENT_INPUT_FIT = PASS
VISIBLE_RESPONSE_FRAME = CURRENT_REQUEST
PREVIOUS_TURN_SEMANTIC_REPLAY = NOT OBSERVED
```

### Representation/cache separation

Specimen B has a real local representation observation:

```text
Deferred mirror: OUTPUT_MISMATCH
CANONICAL 3194:af04235
FRESH_CHAT 3196:8e7b5ae
Δchars +2
```

and a PRE_SIMCORE history-prefix break:

```text
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
```

These are preserved but are **not** attributed to the session transport failure because:

1. specimen A already showed both-root `ACCESS_ERROR` with ordinary `mirror COMMITTED` and baseline cache topology;
2. the session surface result is identical across A and B;
3. v0.64.9 passive root inspection occurs independently of the visible-response representation relation;
4. RAW semantics remain healthy in both packets.

Classification for these side observations remains separate unless later evidence establishes a correctness consequence.

## 5. Adjacent delta review

Material pair: specimen A → specimen B.

```text
A. turn/request identity                 CHANGED
B. operator action                       CHANGED · ordinary next natural request
C. user-intent summary                   CHANGED
D. output semantic frame                 CHANGED · tracks current request
E. runtime generation / epoch            UNCHANGED
F. edit / representation                 CHANGED · exact/committed → Fresh mismatch +2
G. history mutation / stabilization      CHANGED · baseline → PRE_SIMCORE observed break
H. cache topology / trajectory           CHANGED · baseline → observing common prefix
I. stable/slow runtime identity tiers     UNCHANGED
J. lifecycle / frame / chronology         UNCHANGED in health · Chatindex advanced normally
K. telemetry handoff state               UNCHANGED · FRESH / both roots ACCESS_ERROR / SESSION UNAVAILABLE
L. warnings / compatibility               UNCHANGED · 0 / 0
M. timing / hotspot                       CHANGED · storage latency varies
```

The most important attribution invariant is K:

```text
material representation/cache state changed
while
WINDOW ACCESS_ERROR + GLOBAL_THIS ACCESS_ERROR + SESSION UNAVAILABLE remained unchanged
```

That invariance further argues against attributing the transport failure to the specimen-B representation/cache observations.

## 6. Meaning of `ACCESS_ERROR`

The v0.64.9 frozen surface vocabulary defines:

```text
ROOT_ABSENT
STORAGE_ABSENT
ACCESS_ERROR
METHODS_INCOMPLETE
USABLE
```

`ACCESS_ERROR` specifically means the root object is present but attempting to read its `sessionStorage` property throws.

Therefore the current evidence is stronger than the v0.64.8 result.

v0.64.8 could only conclude:

```text
usable sessionStorage not obtained through current binding
```

v0.64.9 now concludes:

```text
WINDOW.sessionStorage property access      -> throws
GLOBAL_THIS.sessionStorage property access -> throws
```

Because both roots fail before a usable storage object is returned:

```text
relation NONE
serialized chars 0
session write attempt count effectively 0
SESSION UNAVAILABLE
```

No synthetic write was needed to reach this conclusion.

## 7. Memory transport positive control

Both packets expose:

```text
Telemetry checkpoint: MEMORY WRITTEN
```

This proves the checkpoint itself is running and the bounded `globalThis` memory sidecar can be written in the current runtime.

It does **not** satisfy the same-tab full-page refresh contract because a page refresh cannot rely on the old JavaScript global surviving.

Therefore:

```text
checkpoint execution          = PASS
memory sidecar write           = PASS
session sidecar availability   = FAIL
full-page refresh prerequisite = FAIL
```

## 8. v0.64.9 route classification

The activated v0.64.9 design defines Route C as:

```text
WINDOW != USABLE
GLOBAL_THIS != USABLE
→ current runtime exposes no qualifying sessionStorage surface through the two authorized roots
→ refresh gate remains blocked
→ next architecture must evaluate a different durable same-tab transport
```

The live packets match Route C exactly, with the more specific per-root state `ACCESS_ERROR` on both roots.

Release-level verdict:

```text
06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT
= LIVE FAIL
= CLASSIFIED BEFORE REFRESH

pre-refresh surface attribution
= WINDOW ACCESS_ERROR
= GLOBAL_THIS ACCESS_ERROR
= relation NONE

checkpoint
= MEMORY WRITTEN
= SESSION UNAVAILABLE

full-page refresh
= DO NOT PERFORM FOR THIS RELEASE

root-resolution objective
= ACHIEVED / LIVE PROVEN

sessionStorage-based durable transport objective
= NOT AVAILABLE IN ACTUAL HOST THROUGH AUTHORIZED ROOTS
```

This is not a claim that the Host has no possible persistence mechanism. It is only a direct claim about the two v0.64.9-authorized `sessionStorage` surfaces.

## 9. Attribution maturity

Supported:

```text
symptom confidence: HIGH
surface attribution: DIRECT
both authorized roots: ACCESS_ERROR
usable session candidate: NONE
session write: NOT REACHED
memory write: WRITTEN
release gate effect: LIVE FAIL
```

Not supported:

```text
exact browser/WebView exception type
security-policy name
origin/sandbox cause
whether another Host storage API survives same-tab full refresh
whether pluginStorage/localStorage/IndexedDB/filesystem would be appropriate
provider-cache behavior
```

Do not expose or infer exception messages/stacks merely to sharpen the label.

A future transport design must choose an alternative only after evaluating its lifecycle, privacy, performance, cleanup, and same-tab-refresh semantics.

## 10. Normal Core controls observed

Across the two packets:

```text
request hook: SEEN
Core handshake: FOUND
runtime: ACTIVE
output: COMMITTED
binding: BOUND
stale drops: 0
UI parts: 2
hook cleanup: NAMED
Warnings: 0
Compatibility: 0
RAW current-request semantic fit: PASS
Frame regression: NONE
Frame sequence: PASS
Continuity summary: PASS
provider cache: UNVERIFIED
```

Specimen A additionally provides a clean ordinary mirror control:

```text
Deferred mirror: COMMITTED
Output representation: EXACT
```

Therefore the session-access failure is bounded and does not demonstrate a general SimCore semantic/output failure.

## 11. Performance observations

The packets continue to show existing storage latency:

```text
Specimen A request Turn storage: 837 ms
Specimen A output storage: 1.267 s

Specimen B request Turn storage: 2.043 s
Specimen B output storage: 1.173 s
```

The session surface/checkpoint work itself remains tiny:

```text
Telemetry checkpoint: 0-1 ms
```

No correctness consequence from the larger existing storage latency is established by this episode.

Keep performance as a separate observed axis.

## 12. Gate and sequencing disposition

```text
v0.64.9 live gate: CLOSED / FAIL
failure class: PRE_REFRESH_DURABLE_SESSION_TRANSPORT_UNAVAILABLE
specific observed surface: BOTH_AUTHORIZED_ROOTS_ACCESS_ERROR
root-resolution implementation: LIVE PROVEN
refresh experiment: STOP / NOT ELIGIBLE
M2-3: BLOCKED
next runtime work: DIFFERENT_DURABLE_SAME_TAB_TRANSPORT_DESIGN_REQUIRED
```

Do not repeat the same WINDOW/GLOBAL_THIS sessionStorage experiment in another patch without new evidence; v0.64.9 already resolved that boundary.

Do not start M2-3 while this continuity chain remains unresolved.

## 13. Review completion

```text
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
```

No additional packet is required to establish the v0.64.9 pre-refresh Route C result.

A future release will require its own explicitly designed live scenario.

## 14. Related authority

- `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_ACTIVATION.md`
- `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_06409_OPERATOR_RELEASE_CARD_ADJUNCT_DESIGN.md`
- `docs/SIMCORE_LIVE_06408_PRE_REFRESH_SESSION_UNAVAILABLE_2026-08-28.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- release work item `#660`
- `release-simcore/plugins/simcore/latest.js`

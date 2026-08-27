# SimCore v0.64.7 — Output Checkpoint Cross-Reload Live Failure

Date: 2026-08-27
Status: **DIRECT LIVE EVIDENCE · CONFIRMED BLOCKING · RUNTIME FIX REQUIRED**
Scenario: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.7 — Cross-Reload Cache Observer Continuity`
Release authority: `release-simcore` commit `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`

## 1. Executive finding

The required same-tab refresh experiment reached a genuinely new runtime generation, but the released v0.64.7 runtime did **not** adopt the pre-refresh cache-observer telemetry state.

Observed boundary:

```text
pre-refresh runtime
boot:       2026-08-27T11:42:11.881Z
generation: mtbgdju1-fwtefm
trajectory: ESTABLISHED
last known stable retry topology: STABLE · 60/60 · 100%

same-tab page refresh

post-refresh runtime
boot:       2026-08-27T13:12:46.965Z
generation: mtbjm1kl-1lbkiq
```

First natural request after refresh:

```text
request user @2162 → assistant @2163
Telemetry continuity: FRESH · no-compatible-handoff
Prompt prefix: BASELINE
Cache topology: BASELINE
Cache integrity: BASELINE
Cache break: BASELINE
History mutation: BASELINE
Runtime identity: ... BASELINE
Cache trajectory: BASELINE · family 2a715208 · distinct 1 · attempts 1
SimCore contribution: BASELINE
provider cache: UNVERIFIED
Warnings: 0
Continuity summary: PASS
```

Second natural request in the same new generation:

```text
request user @2164 → assistant @2165
runtime generation: mtbjm1kl-1lbkiq (same new generation)
Telemetry continuity: FRESH · no-compatible-handoff
Cache trajectory: OBSERVING · family 2a715208 · distinct 2 · attempts 2
Cache topology: COMMON_PREFIX · 33/64 · 63.5%
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
Warnings: 0
Continuity summary: PASS
```

The second request demonstrates a fresh observer establishing naturally inside the new runtime; it is not continuation from an adopted pre-refresh capsule.

Therefore the v0.64.7 live claim fails.

## 2. RAW / semantic controls

The first post-refresh request was a natural Mode C community turn. Its visible output directly answered the new input about the protagonist's childhood-to-present appearance, adult alcohol-mixing behavior, and soft-face/masculine-action contrast. No previous-turn semantic-frame replay is observed in this output.

The second post-refresh request was a natural Mode A scene request with a forward calendar/chapter transition. Its visible output followed the requested neo-noir bartender scene, advanced Chapter 10→11 and Chatindex 1053→1054, and diagnostics reported `Continuity summary: PASS` / `Frame sequence: PASS`.

Thus the cross-reload failure is not established by a general request/output semantic collapse. Normal Core request/output behavior remained usable while the observer handoff itself restarted fresh.

The first post-refresh `MANUAL_EDIT_REBUILT` is not treated as evidence of a user edit. `Prior representation: UNAVAILABLE` after a new runtime boot means the fresh runtime lacked the old in-memory Representation ledger and conservatively rebuilt from the visible host state. This behavior is outside the v0.64.7 transport ownership boundary and is not the cause of the telemetry handoff failure.

## 3. Frozen design requirement

`docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md` requires two checkpoint opportunities:

```text
completed request/output
→ output state commits
→ bounded telemetry checkpoint written to sessionStorage

and

onUnload
→ refresh both memory + session transports as a last-chance handoff
```

The natural live gate requires:

```text
A. healthy v0.64.7 trajectory
B. session telemetry checkpoint WRITTEN
C. same-tab refresh/runtime update
D. first new-generation natural request adopts SESSION/GLOBAL capsule
E. second request continues restored trajectory without re-adoption/reset
```

The supplied experiment satisfies the physical refresh and D/E observation opportunity, but D fails because no compatible capsule is adopted.

## 4. Source-level implementation finding

Source inspection of the released v0.64.7 code and its deterministic builder finds a design/implementation omission.

The builder correctly extends `runtime-telemetry.publish(...)` so that a publish operation writes both:

```text
globalThis memory
window.sessionStorage __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
```

and it correctly changes the boot-time claim to read both transports.

However the builder only replaces the **one pre-existing outer-shell publish call**:

```text
runtimeTelemetryRules.publish(...)
```

inside the existing `Risuai.onUnload(...)` handler.

There is no released outer-shell publish/checkpoint call after each completed output/state commit.

Source-backed finding:

```text
frozen design:
OUTPUT-COMPLETE CHECKPOINT + ONUNLOAD LAST-CHANCE CHECKPOINT

released v0.64.7:
ONUNLOAD PUBLISH ONLY

classification:
DESIGN_IMPLEMENTATION_DRIFT / OUTPUT_CHECKPOINT_CALLSITE_OMITTED
```

This omission independently violates the activated checkpoint-timing contract. It also makes ordinary same-tab browser refresh continuity depend on the host/plugin unload callback successfully running and writing the sidecar at refresh time, which the live experiment did not demonstrate.

The exact browser/host reason the unload-only write did not produce an adoptable capsule is not claimed from the available evidence. The narrower confirmed fact is sufficient: the required completed-output checkpoint was never implemented, and the released unload-only path failed to provide continuity in the required live scenario.

## 5. Attribution boundary

Confirmed:

```text
new runtime generation after same-tab refresh: YES
pre-refresh healthy observer trajectory: YES
post-refresh SESSION/GLOBAL adoption: NO
first post-refresh observer state: BASELINE / FRESH
second post-refresh observer: fresh OBSERVING progression
released output-complete session checkpoint callsite: ABSENT
frozen design required that callsite: YES
v0.64.7 cross-reload live contract: FAILED
```

Not claimed:

```text
provider cache miss: NOT CLAIMED / UNVERIFIED
Core semantic state corruption: NOT OBSERVED
host sessionStorage globally unavailable: NOT PROVEN
Risuai.onUnload callback never fired: NOT PROVEN
browser-specific root cause beyond unload-only insufficiency: NOT PROVEN
M2-3 attribution: NONE
```

## 6. Gate disposition

```text
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
= FAIL

classification
= CONFIRMED_BLOCKING
= RUNTIME_FIX_REQUIRED
= OUTPUT_CHECKPOINT_CALLSITE_OMITTED

M2-3 physical implementation
= BLOCKED

next unrelated runtime release
= BLOCKED
```

This gate is **classified and closed as FAIL**, not left `PENDING` and not mislabeled `PASS`.

The immutable v0.64.7 production evidence must remain available as the failed release specimen. Do not rewrite `release-simcore` in place.

## 7. Narrow repair boundary

The next repair should remain a transport/observability mini and must not absorb M2-3.

Required repair surface:

```text
1. add a bounded current-observer capture + session checkpoint after completed output/state commit
2. keep the checkpoint off the request→provider critical path
3. preserve the existing onUnload publish as last-chance redundancy
4. expose the bounded write probe in Last Turn Diagnostic:
   Telemetry checkpoint: SESSION · WRITTEN/SKIPPED/UNAVAILABLE ...
5. preserve single-consumption claim semantics
6. preserve 10-minute location/schema compatibility bounds
7. preserve 16,384-char bound and metadata-only privacy contract
8. preserve provider cache UNVERIFIED wording
9. add a permanent fixture/static check proving the OUTPUT-COMPLETE callsite exists, not only the helper behavior
10. repeat the same real long-chat refresh experiment after the repair release
```

Expected versioning posture: a new narrow repair release after immutable v0.64.7, before M2-3. Exact version/release authorization belongs to the repair work item.

## 8. Related evidence

- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `docs/SIMCORE_06407_TELEMETRY_CHECKPOINT_DIAGNOSTIC_GAP_2026-08-27.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `products/simcore/tooling/build-06407-reload-cache-continuity.py`
- `release-simcore/plugins/simcore/latest.js`

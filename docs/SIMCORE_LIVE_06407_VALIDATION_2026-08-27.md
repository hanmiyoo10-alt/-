# SimCore v0.64.7 Real Long-Chat Validation — 2026-08-27

Status: **CLOSED · FAIL · CONFIRMED BLOCKING · REPAIR RELEASE REQUIRED**
Scenario: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.7 — Cross-Reload Cache Observer Continuity`
Release authority: `release-simcore` commit `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Release blob: `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0` (`latest.js == install.js`)
Evidence source: user-supplied `SimCore Last Turn Diagnostic` packets from a real long chat

## 1. Final classification

```text
06407 live gate:
FAIL

classification:
CONFIRMED_BLOCKING / RUNTIME_FIX_REQUIRED

confirmed implementation gap:
OUTPUT_CHECKPOINT_CALLSITE_OMITTED

M2-3 physical implementation:
BLOCKED

next unrelated runtime release:
BLOCKED
```

The gate is now **classified and closed as FAIL**. It is no longer `OPEN / INCOMPLETE_EVIDENCE`.

The released v0.64.7 production identity remains immutable evidence. Do not mutate `release-simcore` in place.

## 2. Healthy pre-boundary baseline

The pre-refresh long-chat runtime was:

```text
boot:       2026-08-27T11:42:11.881Z
generation: mtbgdju1-fwtefm
version:    0.64.7
```

Observed baseline controls included:

```text
B_END closure: COMPLETE / terminal EXPLICIT / structure PASS
post-B_END C clock handoff: APPLIED
representation-fast reconcile: observed healthy
genuine manual edit: MANUAL_EDIT_REBUILT / expected positive control
cache trajectory: ESTABLISHED
last repeat-send topology: STABLE · 60/60 · 100%
cache break: NONE on the stable repeat-send control
SimCore contribution: NO_BREAK on that control
Warnings: 0
provider cache: UNVERIFIED
```

The intentional same-length manual edit remains resolved as:

```text
EXPECTED_USER_EDIT_BEHAVIOR / POSITIVE_CONTROL / NON_06407
```

The same-input retry that cleared a partial previous-turn semantic replay remains a separate generation-semantic evidence track and is not attributed to v0.64.7.

## 3. Actual refresh boundary

The user performed the required same-tab page refresh after the healthy pre-boundary baseline.

The new runtime was:

```text
boot:       2026-08-27T13:12:46.965Z
generation: mtbjm1kl-1lbkiq
```

This is a genuine runtime boundary because the boot time and generation identifier both changed from the pre-refresh runtime.

## 4. First natural post-refresh request — FAIL point

Packet:

```text
capture: 2026-08-27T13:25:37.514Z
user @2162 → assistant @2163
mode C
new generation mtbjm1kl-1lbkiq
```

Key observations:

```text
Telemetry continuity: FRESH · no-compatible-handoff
Prompt prefix: BASELINE
Cache topology: BASELINE · messages 62 · chars 201,708
Cache integrity: BASELINE
Cache break: BASELINE
History mutation: BASELINE
Runtime identity: COMPILER_TIERS · all BASELINE
SimCore contribution: BASELINE
Cache trajectory: BASELINE · family 2a715208 · distinct 1 · attempts 1
provider cache: UNVERIFIED
Warnings: 0
Continuity summary: PASS
```

Required result was an adopted SESSION/GLOBAL handoff with compatible tracker restoration. Instead every observer began from a fresh baseline.

Therefore the first post-boundary pass condition failed.

The first post-refresh request itself remained semantically healthy: the visible Mode C response directly answered the current community input rather than replaying the previous turn's response frame.

The first post-refresh `MANUAL_EDIT_REBUILT` is not classified as a user-edit anomaly. `Prior representation: UNAVAILABLE` is expected after a fresh runtime has no previous in-memory Representation ledger; this conservative rebuild is outside the v0.64.7 telemetry-transport ownership boundary.

## 5. Second natural post-refresh request — confirms fresh restart

Packet:

```text
capture: 2026-08-27T13:31:37.917Z
user @2164 → assistant @2165
mode A
same new generation mtbjm1kl-1lbkiq
```

Key observations:

```text
Telemetry continuity: FRESH · no-compatible-handoff
Cache trajectory: OBSERVING · family 2a715208 · distinct 2 · attempts 2
Cache topology: COMMON_PREFIX · 33/64 · 63.5%
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
Warnings: 0
Continuity summary: PASS
Frame sequence: PASS
```

This is a newly established trajectory inside the new runtime, not continuation from the pre-refresh `ESTABLISHED` trajectory.

The second visible response also followed its current Mode A scene request and advanced Chapter 10→11 / Chatindex 1053→1054 normally. Normal Core semantics therefore remained usable while the local observer continuity feature failed.

## 6. Source-level implementation finding

The activation design requires:

```text
completed output/state commit
→ bounded telemetry checkpoint to sessionStorage

plus

onUnload
→ last-chance memory + session checkpoint
```

Source inspection of released v0.64.7 and `products/simcore/tooling/build-06407-reload-cache-continuity.py` shows:

```text
runtime-telemetry helper:
sessionStorage transport implemented
boot-time claim implemented

outer-shell checkpoint callsites:
onUnload publish only
output-complete publish/checkpoint absent
```

The deterministic builder replaces the one pre-existing outer `runtimeTelemetryRules.publish(...)` call, which is inside `Risuai.onUnload(...)`. It does not add the frozen completed-output checkpoint callsite.

Classification:

```text
DESIGN_IMPLEMENTATION_DRIFT
OUTPUT_CHECKPOINT_CALLSITE_OMITTED
CONFIRMED RUNTIME FIX
```

The exact host/browser reason the unload-only fallback failed to leave an adoptable sidecar is not claimed. That narrower unknown does not prevent classification because the released runtime independently omitted a required checkpoint callsite and the required same-tab live scenario failed end-to-end.

## 7. Diagnostic-surface co-finding

The activation design also requires a bounded line such as:

```text
Telemetry checkpoint: SESSION · WRITTEN · <chars> · <ms>
```

The released runtime retains `lastWriteProbe` internally but does not expose it in Last Turn Diagnostic.

This was previously a non-blocking WATCH. It is now a repair co-finding because the failed live gate demonstrates why pre-boundary checkpoint visibility is needed to distinguish `WRITTEN`, `UNAVAILABLE`, `FAILED`, and `OVERSIZE` before a refresh.

The missing diagnostic line is not itself the root cause of lost continuity; it is an observability gap that should travel with the repair.

## 8. Final verdict matrix

```text
healthy same-generation long-chat baseline: PASS / OBSERVED
B_END closure regression control: PASS
post-B_END C regression control: PASS
genuine manual-edit positive control: PASS
normal post-refresh Core semantics: PASS / OBSERVED
new runtime generation: PASS / OBSERVED
post-refresh telemetry adoption: FAIL
pre-refresh trajectory restoration: FAIL
second-request restored continuation: FAIL (fresh OBSERVING instead)
provider cache claim: UNVERIFIED (correct)

06407 live gate: FAIL / CLOSED
```

## 9. Required repair boundary

The next repair work item must remain narrow and must not absorb M2-3:

```text
- add completed-output telemetry checkpoint to sessionStorage
- keep onUnload as last-chance redundancy
- expose bounded Telemetry checkpoint diagnostics
- preserve metadata-only / 16,384-char / 10-minute / same-location contracts
- preserve single-consumption claim semantics
- preserve provider cache UNVERIFIED
- add permanent verification of the actual output-complete callsite
- release as a new immutable repair version
- repeat the same real long-chat refresh experiment
```

Exact repair version and release authorization belong to the next runtime work item.

## 10. Authority references

- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `docs/SIMCORE_06407_TELEMETRY_CHECKPOINT_DIAGNOSTIC_GAP_2026-08-27.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `products/simcore/tooling/build-06407-reload-cache-continuity.py`
- `release-simcore/plugins/simcore/latest.js`

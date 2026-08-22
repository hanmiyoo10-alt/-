# SimCore v0.64.1 — Broadcast Live Evidence Inbox

Purpose: preserve the first natural B-mode sequence spanning the `v0.64.0 -> v0.64.1` runtime reload and the available B_END panel evidence. This is evidence-first and intentionally distinguishes what the copied diagnostics prove from what the screenshot cannot expose.

## Sequence identity

Broadcast root: `B@2048`

Observed sequence:

```text
v0.64.0 runtime mt2v88ex-ipa3x7
@2048 -> @2049  B_START
@2050 -> @2051  B_CONTINUE

runtime reload / plugin update

v0.64.1 runtime mt2xigp5-47xw1n
@2052 -> @2053  B_CONTINUE
@2054 -> @2055  B_CONTINUE
@2056 -> @2057  B_CONTINUE
@2058 -> @2059  B_CONTINUE
... one later B parent visible as B@2060 ...
B_END screenshot  Chatindex 1001 -> 1002
```

The B_END full copied diagnostic was unavailable because the panel copy action failed, so the screenshot is treated as partial evidence only.

## B_START — v0.64.0

Request `@2048` -> output `@2049`:

```text
Mode: B_START
Stability: PASS
Edit reconcile: SAME_FAST · 1 ms · snapshot UNCHANGED
Prior representation: EXACT
Edit origin: NONE
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Representation ownership: REPRESENTATION · ledger 5 · mirror TRANSPORT_ONLY
Broadcast lifecycle: OPEN · mode B_START
Broadcast end authority: DENIED · active-broadcast
End boundary: PROSE+COMMUNITY+KNOWLEDGE · explicit B_END required
Request lineage: ROOT · root B@2048 · parent B@2048 · depth 0
Frame sequence: PASS
Frame guard: PASS
Stored broadcast: LOCKED · airtime 2031-02-28 08:50 PM · start 08:50 PM
```

Warnings:

```text
- 열린 방송 장면에 종결 표현이 있음
- Reaction normalization X: stale_scale_fallback
```

The first warning did not close or unlock the broadcast. The visible response ended with a scene-transition style phrase, so the warning is preserved as a possible heuristic/wording false-positive or conservative warning rather than a lifecycle defect. The next request remained B_CONTINUE.

The X reaction fallback was monotonic against the recorded family floor and is an existing WATCH family, not a new B lifecycle failure.

## B_CONTINUE — v0.64.0

Request `@2050` -> output `@2051`:

```text
Mode: B_CONTINUE
Stability: PASS
Edit reconcile: SAME_FAST · 0 ms · snapshot UNCHANGED
Prior representation: EXACT
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Broadcast lifecycle: OPEN
Broadcast end authority: DENIED
Request lineage: ROOT · root B@2048 · parent B@2050 · depth 0
Frame sequence: PASS
Stored broadcast: LOCKED · airtime 09:05 PM · start 08:50 PM
```

A host-history topology contraction occurred on this request:

```text
frontier 37 -> 10
common chars 107,646 -> 63,621
67 messages -> 39 messages in the observed request topology
Host prefix family 2a715208 remained SAME_FAMILY
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

Classification: `HOST/HISTORY WINDOW WATCH / NONBLOCKING`. It is not evidence of a SimCore B lifecycle regression.

## Mid-broadcast reload into v0.64.1 — strong continuity control

The plugin/runtime restarted before request `@2052`:

```text
old runtime: mt2v88ex-ipa3x7
new runtime: mt2xigp5-47xw1n
```

The first v0.64.1 B_CONTINUE request showed the expected memory-only Representation reset:

```text
Prior representation: UNAVAILABLE
Representation ownership: ledger 1
shape: NEW_VISIBLE_REPRESENTATION
```

while persistent/session broadcast continuity survived:

```text
Session load: LOCATION_REUSE
Mode: B_CONTINUE
Broadcast lifecycle: OPEN
Broadcast end authority: DENIED
Request lineage: ROOT · root B@2048 · parent B@2052 · depth 0
Stored broadcast: LOCKED · airtime 09:15 PM · start 08:50 PM
Frame sequence: PASS
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Warnings: 0
```

Interpretation: **direct live evidence that the bounded Representation registry can restart empty without losing the already-open B lifecycle, B root, or stored broadcast start/airtime.** This is consistent with M2-2's memory-only Representation contract and reload safety.

`Summary scope` is correctly `NONE` on v0.64.1 B turns, proving the new Summary Scope classifier does not leak into ordinary B mode.

## Subsequent v0.64.1 B_CONTINUE controls

The next copied requests remained stable:

```text
@2054 -> @2055
  SAME_FAST · EXACT · mirror COMMITTED
  Summary scope: NONE
  Stored airtime 09:25 PM

@2056 -> @2057
  SAME_FAST · EXACT · mirror COMMITTED
  THOUGHTS_COMPAT / SAFE_ENVELOPE_COMPAT stripped safely
  Compatibility diagnostics: 1
  Summary scope: NONE
  Stored airtime 09:35 PM

@2058 -> @2059
  SAME_FAST · EXACT · mirror COMMITTED
  Summary scope: NONE
  Stored airtime 09:42 PM
```

Across these turns:

```text
Broadcast lifecycle: OPEN
Broadcast end authority: DENIED
root: B@2048
Frame sequence: PASS
Frame guard: PASS
stale drops: 0
hooks: NAMED
```

The v0.64.1 host-prefix family `9f1e9910` stayed stable and the local common-prefix frontier grew `13 -> 15 -> 17` messages. Provider cache remains `UNVERIFIED`.

Do not directly compare the old runtime's `system0 1277 chars / family 2a715208` with the new runtime's baseline `system0 341265 chars / family 9f1e9910` as a SimCore-caused delta: telemetry continuity explicitly restarted `FRESH · no-compatible-handoff`, and the v0.64.1 SimCore runtime prompt itself was only about 2.3k chars.

## B_END screenshot — v0.64.1

The available panel screenshot directly shows:

```text
SimCore v0.64.1
Mode: B_END
Stored last mode: B_END
Broadcast: UNLOCKED
Last broadcast airtime: 2031-02-28 09:55 PM
Episode: 44
Warnings: 2
Compatibility diagnostics: 0

Continuity at a glance:
ROOT B@2048 -> PARENT B@2060 -> B@current
Volume 77 -> 77 SAME
Chapter 3 -> 3 SAME
Chatindex 1001 -> 1002 ADVANCED
FRAME REGRESSION: NONE
```

The two visible latest warnings are both COMMUNITY comment-reaction-tag format warnings for `COMMUNITY 2-2` and `COMMUNITY 2-3`. No lifecycle/closure warning is visible in the panel summary.

The panel also shows:

```text
Runtime prompt budget: 2,670 chars · 52 lines · mode B_END
Narrative anchor: 2031-02-21 06:30 PM
World year: 2031
```

The older Narrative anchor and the current Broadcast airtime are separate clocks. In Mode B the broadcast clock is authoritative for broadcast progression; the non-broadcast narrative anchor remaining at its prior value is not by itself a stale-broadcast defect.

### Important panel-field clarification

The screenshot displays:

```text
Community blocks: 866
```

This is **not** the number of COMMUNITY blocks in the current B_END response. Release code renders that field from:

```text
state.community.activationCount
```

so it is a cumulative activation counter. Do not misclassify `866` as a malformed current B_END structure.

## What the B_END screenshot proves

```text
B root survived through closure                    PASS
B_END mode recognized                              PASS
broadcast changed from LOCKED/OPEN to UNLOCKED     PASS
broadcast airtime advanced to 09:55 PM             PASS
Volume/Chapter held correctly                      PASS
Chatindex advanced                                  PASS
frame regression                                   NONE
only visible warnings are COMMUNITY comment tags   OBSERVED
```

This is strong positive B lifecycle evidence, including a mid-broadcast v0.64.0 -> v0.64.1 reload.

## What the screenshot does NOT prove

The Advanced diagnostics section was collapsed and the full B_END copy failed. Therefore the screenshot does not expose the exact lines for:

```text
Broadcast closure
Broadcast terminal coverage
terminal canonical timestamp candidate
current-output COMMUNITY block/section count
Representation / Deferred Mirror details on the B_END turn
```

Accordingly, the old v0.63.59 natural B_END terminal-coverage revalidation should be classified:

`PARTIAL POSITIVE / STILL NOT FULLY CLOSED`.

Unlock + advanced airtime are encouraging, and the absence of extra visible structure warnings is useful, but they are not a substitute for the explicit `Broadcast closure` and `Broadcast terminal coverage` diagnostics required by the .59 contract.

## Current verdict

```text
v0.64.1 B-mode Summary Scope isolation              PASS
B_START lifecycle                                   PASS
B_CONTINUE lifecycle                                PASS
mid-broadcast runtime reload persistence            PASS — strong control
M2-2 Representation memory reset behavior           PASS
ordinary B Representation exact carryover           PASS
SAFE_ENVELOPE_COMPAT B_CONTINUE                      PASS
broadcast airtime monotonic sequence                 PASS (08:50 -> 09:05 -> 09:15 -> 09:25 -> 09:35 -> 09:42 -> screenshot 09:55)
B_END unlock/root/frame continuity                  PASS from panel
v0.63.59 explicit terminal coverage revalidation   PARTIAL POSITIVE / NOT FULLY OBSERVED
B_START open-scene closure-expression warning       WATCH / no state harm observed
COMMUNITY comment-tag warnings                      TRUE POSITIVE quality warnings / non-lifecycle
host-history window contraction                     WATCH / PRE_SIMCORE
provider cache                                      UNVERIFIED
```

No current evidence from this sequence blocks returning to M2 work. The remaining hard M2-2 positive control is still a genuine visible user edit on the v0.64.x line (`USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`).

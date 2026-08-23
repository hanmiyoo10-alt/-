# SimCore v0.64.5 — M2-3 Genuine Manual-Edit Live Control

Captured: 2026-08-23
Production runtime: `v0.64.5`
Runtime generation: `mt5f2ppq-s4v9mn`
Observed request/output: user `@2120` → assistant `@2121`
Edited prior assistant: `@2119`
User confirmation: the prior visible assistant was manually edited before request `@2120`.

Purpose: preserve a second independent real-long-chat genuine-visible-edit positive control for the frozen M2-3 Edit Reconcile contract. This sample is especially useful because it occurs in the same v0.64.5 runtime family that also exercised ordinary SAME_FAST, B_END closure, and post-B_END C behavior.

## Direct diagnostic evidence

Before the manual edit, the prior visible representation was exact and trusted:

```text
Prior representation: EXACT
mirror CANONICAL
canonical 3917:baebe371
fresh     3917:baebe371
```

After the user manually changed the visible prior assistant body, the visible body kept the same character count but changed fingerprint and matched neither trusted representation:

```text
current 3917:d8fc8f4c
match NONE
Edit delta: vs canonical +0 · vs fresh +0
shape NEW_VISIBLE_REPRESENTATION
```

SimCore correctly classified this as a genuine user edit:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 12.012 s
snapshot UPDATED
representation n/a
```

Request preparation was rebuild-dominated:

```text
prepared 12.356 s
edit 12.012 s
Request hotspot: EDIT_RECONCILE · 12.012 s · 97.1%
```

This is the expected expensive slow path for a genuine visible edit, not the representation-drift false-rebuild defect addressed by v0.63.55.

## Post-rebuild output control

The request completed normally after the rebuild:

```text
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stability: PASS
binding BOUND
mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 0
```

The newly produced output returned to exact representation agreement:

```text
CANONICAL 3973:ca9c7c1
FRESH_CHAT 3973:ca9c7c1
match CANONICAL
Output representation: EXACT
```

The non-broadcast narrative state was also stable:

```text
Narrative clock: SAME
previous  2031-03-28 11:30 PM
frame     2031-03-28 11:30 PM
committed 2031-03-28 11:30 PM
```

The completed broadcast state remained independently preserved:

```text
Stored broadcast: UNLOCKED
airtime 2031-03-28 10:15 PM
start   2031-03-28 09:00 PM
```

## M2-3 protected contract

This sample independently reconfirms the genuine-edit side of the frozen M2-3 differential contract:

```text
Prior EXACT
current visible fingerprint != canonical
current visible fingerprint != Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

It must remain distinct from the representation-drift carryover path:

```text
Prior OUTPUT_MISMATCH
current == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

M2-3 may move ownership into the `edit-reconcile` application service, but it must not collapse these predicates, rename the paths, or convert genuine visible edits into the fast representation-carryover path.

## Performance note

`12.012 s` is a second direct long-chat sample showing that genuine manual rebuild is extremely expensive. The earlier v0.64.2 genuine-edit control measured `11.678 s`.

This is valuable baseline evidence, but it is not permission to optimize the rebuild algorithm inside the mechanical M2-3 ownership extraction. Keep performance optimization separate unless a later checkpoint explicitly scopes it.

## Host/history observer note

The same request reported:

```text
Cache break: PRE_SIMCORE · CHAT_HISTORY · @19 assistant→assistant
Representation correlation: NO_MATCH · ledger 6
Mutation attribution: NO_PROVENANCE_MATCH · LOW
Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH · edit manual-edit-rebuilt
SimCore contribution: NOT_FIRST_BREAK
```

These host/history observer signals do not override the direct latest-visible-message evidence. The user explicitly confirmed a manual edit, and the trusted prior representation plus unmatched visible fingerprint directly support `USER_EDIT_CANDIDATE`.

## Classification

```text
status: DIRECT LIVE PASS
control: GENUINE_USER_EDIT
classification: REGRESSION_CONTROL / M2-3 GOLDEN
edit origin: USER_EDIT_CANDIDATE
path: MANUAL_EDIT_REBUILT
snapshot: UPDATED
rebuild latency: 12.012 s
post-rebuild output: PASS / EXACT
M2-3 blocker: NO
M2-3 protected behavior: DIRECTLY RECONFIRMED
performance optimization: DEFER / SEPARATE CHECKPOINT
```

Related evidence:

- `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06402.md`
- `SIMCORE_M2_LIVE_EVIDENCE.md`
- `SIMCORE_CONTRACTS_V2.md`
- `SIMCORE_06406_POST_BEND_C_CLOCK_HANDOFF_ACTIVATION.md`

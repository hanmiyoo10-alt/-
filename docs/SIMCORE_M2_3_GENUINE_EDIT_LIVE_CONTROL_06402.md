# SimCore v0.64.2 — M2-3 Genuine Manual-Edit Live Control

Captured: 2026-08-22
Production runtime: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Observed request/output: user `@2082` → assistant `@2083`
Edited prior assistant: `@2081`

Purpose: preserve a direct real-long-chat genuine-visible-edit control while M2-3 Edit Reconcile Ownership Extraction is already being implemented. This is a behavioral regression fixture, not authorization to alter the decision tree.

## Trigger

The prior visible assistant `@2081` had previously been observed with the stale timestamp:

```text
2031-02-28 10:45 PM
```

The user then manually corrected that visible prior response to:

```text
2031-03-07 10:45 PM
```

The edited text kept the same visible length class but changed its fingerprint. On the next natural request, the prior persisted representation was still exact canonical/Fresh for the pre-edit body:

```text
Prior representation: EXACT
mirror CANONICAL
canonical 2610:97a6e447
fresh     2610:97a6e447

current visible 2610:75f98cb5
match NONE
Edit delta: vs canonical +0 · vs fresh +0
shape NEW_VISIBLE_REPRESENTATION
```

## Correct genuine-edit classification

SimCore correctly classified the changed visible body as a real user edit rather than representation drift:

```text
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 11.678 s
snapshot UPDATED
representation n/a
```

Request preparation was intentionally rebuild-dominated:

```text
prepared 11.974 s
edit 11.678 s
Request hotspot: EDIT_RECONCILE · 11.678 s · 97.5%
```

This is expensive, but it is the expected slow path for a genuine visible edit. It is not the false-rebuild defect that v0.63.55 eliminated.

## Rebuilt state consumed the edit

After the rebuild, the corrected timestamp became the active non-broadcast narrative state:

```text
Narrative clock: SAME
previous  2031-03-07 10:45 PM
frame     2031-03-07 10:45 PM
committed 2031-03-07 10:45 PM
```

The completed broadcast state remained independently preserved:

```text
Stored broadcast: UNLOCKED
start   2031-03-07 08:50 PM
airtime 2031-03-07 09:55 PM
```

This is an important positive control for the existing clock/edit architecture: once a valid corrected canonical timestamp exists in a genuine edited visible response, the current rebuild path can absorb it into the trusted snapshot/state.

## Output-side control

The new output remained healthy after the expensive request rebuild:

```text
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stability: PASS
binding BOUND
mirror COMMITTED
CANONICAL == FRESH_CHAT · EXACT
Warnings: 1
Compatibility diagnostics: 0
```

The warning was an independent COMMUNITY reaction-tag shape warning and is not part of Edit Reconcile.

## M2-3 regression contract

This sample establishes the genuine-edit side of the M2-3 differential contract in the same long-chat runtime that already produced multiple Representation Fast Reconcile controls.

M2-3 must preserve both sides:

```text
A. representation drift carryover
Prior OUTPUT_MISMATCH
current == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
→ no manual rebuild

B. genuine visible user edit
Prior EXACT
current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

The implementation may move ownership into the new `edit-reconcile` application module, but must not collapse these predicates, change path/result labels, or turn genuine edits into fast carryover.

## Performance note

`11.678 s` is direct evidence that the genuine rebuild path is very expensive in a long chat. This is useful performance baseline data, but M2-3 is a mechanical ownership extraction and must not opportunistically optimize rebuild semantics in the same change.

## Host/history observer note

The same request also reported:

```text
Cache break: PRE_SIMCORE · CHAT_HISTORY · @11
Representation correlation: CANONICAL@2069,FRESH_CHAT@2069
Mutation attribution: AMBIGUOUS_HISTORY_MATCH · MEDIUM
Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH
SimCore contribution: NOT_FIRST_BREAK
```

This observer data must not override the direct latest-visible-message edit evidence above. The Edit Reconcile classification is supported by the exact prior representation plus the new unmatched visible fingerprint.

## Classification

```text
status: DIRECT LIVE PASS
control: GENUINE_USER_EDIT
edit origin: USER_EDIT_CANDIDATE
path: MANUAL_EDIT_REBUILT
snapshot: UPDATED
rebuild latency: 11.678 s
corrected narrative state consumed: YES
M2-3 fixture priority: GOLDEN / CRITICAL
M2-3 implementation status: ALREADY IN PROGRESS
```

Related evidence:

- `SIMCORE_POST_BEND_C_EVIDENCE_06402.md`
- `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`
- `SIMCORE_M2_LIVE_EVIDENCE.md`

# SimCore v0.70.5 Human Live Evidence — Partial / HOLD — 2026-09-04

Date: 2026-09-04 KST
Status: **HUMAN_EVIDENCE · PARTIAL · LIVE_GATE HOLD · NON-RUNTIME**
Classification: **SIMCORE · v0.70.5 · REAL-LONG-CHAT EVIDENCE · MANUAL EDIT COMMIT BOUNDARY ATTRIBUTION**

## 1. Authority

This record evaluates operator-supplied real-long-chat diagnostics from production SimCore v0.70.5 against the frozen live matrix in:

- `docs/SIMCORE_07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_07005_PUBLICATION_EVIDENCE_2026-09-04.md`

Fresh repository readback before this record:

```text
main = 32583bbd4da5e09400191afb767c159822728de5
release-simcore = 4374bef29e28804750c05115258cc80f055a26f7
production release = SimCore v0.70.5 Manual Edit Commit Boundary Attribution
```

This document records evidence only. It does not change runtime bytes, release authority, production, or machine-owned release state.

## 2. Frozen live acceptance being evaluated

Minimum v0.70.5 live matrix:

### A. Normal control

```text
SAME_FAST or equivalent exact carryover
no Manual edit breakdown line
no Manual edit commit line
no new warning
```

### B. Genuine manual edit positive control

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit breakdown present
Manual edit commit present
serialize/set/prune each numeric or n/a according to source contract
total consistent with existing aggregate commit bucket
```

One genuine-edit live sample is sufficient for projection correctness only when the complete frozen positive-control identity is present.

## 3. Clean normal-control evidence

Multiple ordinary turns in the same runtime generation showed the expected non-manual paths without manual attribution lines.

Representative clean control:

```text
Version = 0.70.5
Mode = B_CONTINUE
Turn binding = user @2982 -> assistant @2983
Stability = PASS
Edit reconcile = REPRESENTATION_FAST_RECONCILED
snapshot = UNCHANGED
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Warnings = 0
Compatibility diagnostics = 0
Output representation = CANONICAL↔FRESH EXACT
Deferred mirror = COMMITTED
Continuity summary = PASS
Frame sequence = PASS
Frame guard = PASS
```

Other ordinary turns also showed `SAME_FAST` or `REPRESENTATION_FAST_RECONCILED` with snapshot unchanged and no manual-edit attribution lines.

Disposition:

```text
NORMAL_CONTROL = PASS
```

## 4. v0.70.5 manual commit projection observed live

A production diagnostic captured at `2026-09-04T03:59:28.050Z` exercised the manual rebuild path:

```text
Version = 0.70.5
Mode = C
Turn binding = user @2978 -> assistant @2979
Stability = PASS
Edit reconcile = MANUAL_EDIT_REBUILT · 4.838 s
snapshot = UPDATED
Warnings = 0
Compatibility diagnostics = 0
```

The v0.70.4 aggregate breakdown remained present:

```text
Manual edit breakdown:
classify = 1.0 ms
prepare = 5.0 ms
recovery = 0.0 ms
finalize = 1.0 ms
commit = 2.527 s
other = 2.304 s
confidence = BOUNDED
```

The new v0.70.5 commit decomposition was present and closed exactly:

```text
Manual edit commit:
serialize = 0.0 ms
set = 1.009 s
prune = 1.518 s
total = 2.527 s
confidence = EXACT

0.000 + 1.009 + 1.518 = 2.527 s
```

Therefore the target projection itself is live and internally consistent:

```text
MANUAL_COMMIT_LINE_PRESENT = YES
COMPONENT_VALUES_PRESERVED = YES
KNOWN_ZERO_PRESERVED_AS_ZERO = YES
TOTAL_CLOSES_TO_AGGREGATE_COMMIT = YES
PROJECTION_ACCOUNTING = PASS
```

## 5. Terminal acceptance gap

The same manual-rebuild diagnostic reported:

```text
Prior representation = UNAVAILABLE
Edit origin = UNKNOWN
current = 2973:f450a561
match = NONE
raw bodies = NOT RETAINED
```

The frozen v0.70.5 positive-control acceptance requires the explicit classification:

```text
Edit origin = USER_EDIT_CANDIDATE
```

`UNKNOWN` must remain `UNKNOWN`; it may not be promoted by inference to `USER_EDIT_CANDIDATE` merely because `MANUAL_EDIT_REBUILT` and `snapshot UPDATED` occurred.

Disposition:

```text
MANUAL_REBUILD_EXECUTED = YES
MANUAL_COMMIT_PROJECTION = PASS
EXPLICIT_USER_EDIT_CANDIDATE = MISSING
GENUINE_EDIT_POSITIVE_CONTROL = INCOMPLETE
LIVE_PASS = NOT AUTHORIZED
LIVE_GATE = HOLD
```

This HOLD is narrow. It does not invalidate the observed commit decomposition.

## 6. Separate B_END structural observation

The same long-chat run also exercised a broad broadcast lifecycle:

```text
B_START
-> repeated B_CONTINUE
-> B_END
-> post-B_END C
```

The B lifecycle preserved binding, frame progression, stored broadcast locking during the broadcast, and stored broadcast unlock at B_END.

However the B_END generation at `user @2996 -> assistant @2997` was structurally malformed:

```text
Broadcast lifecycle = ENDING
Broadcast end authority = ALLOWED · explicit-b-end
Broadcast closure = PARTIAL
terminal = MISSING_OR_INVALID
structure = QUARANTINED
Warnings = 7
Preamble action = UNRESOLVED
Envelope recovery = FRESH_MISMATCH
Stored broadcast = UNLOCKED
```

The immediately following Mode C turn correctly remained fail-closed with respect to the incomplete B_END:

```text
Broadcast lifecycle = CLOSED
Stored broadcast = UNLOCKED
Post-B_END clock handoff = INELIGIBLE
reason = previous-b-end-closure-incomplete
Warnings = 0
Output representation = EXACT
Continuity summary = PASS
```

This is recorded as a separate structure/output observation. It is not used to manufacture a v0.70.5 manual-edit failure or pass. The existing closure contract intentionally denies post-B_END clock authority to incomplete/malformed closures.

## 7. Performance disposition

The one v0.70.5 manual-edit commit sample attributes:

```text
serialize = 0.0 ms       (~0.0%)
set = 1.009 s            (~39.9%)
prune = 1.518 s          (~60.1%)
total = 2.527 s
```

One sample with this split does not establish the frozen optimization threshold for a stable dominant subphase.

Therefore:

```text
OPTIMIZATION = HOLD
STORE BEHAVIOR CHANGE = NOT AUTHORIZED
RETENTION CHANGE = NOT AUTHORIZED
BACKEND SET CHANGE = NOT AUTHORIZED
```

Ordinary `TURN_STORAGE` / `OUT_STORAGE` latency remains a separate performance lane.

## 8. Exact remaining evidence

One bounded positive control remains:

```text
start from a prior EXACT assistant representation
-> perform a genuine manual edit to that visible assistant output
-> send the next request
-> require Edit origin USER_EDIT_CANDIDATE
-> require MANUAL_EDIT_REBUILT
-> require snapshot UPDATED
-> require Manual edit breakdown
-> require Manual edit commit
-> require serialize/set/prune/total contract closure
-> require no new warning attributable to the target path
```

No reroll, representation-only drift, or `UNKNOWN` origin substitutes for this control.

## 9. Current disposition

```text
V07005_PRODUCTION = PUBLISHED
NORMAL_CONTROL = PASS
MANUAL_COMMIT_PROJECTION = PASS
POSITIVE_CONTROL_IDENTITY = INCOMPLETE
MISSING = USER_EDIT_CANDIDATE
LIVE_GATE = HOLD / PENDING HUMAN EVIDENCE
LIVE_PASS = NO
OPTIMIZATION = HOLD
PROVIDER CACHE = UNVERIFIED
NEXT = ONE GENUINE MANUAL EDIT FROM PRIOR EXACT
```

Under the standing SimCore evidence autoclose convention, once that remaining positive-control evidence is supplied and no unresolved blocker remains, terminal close should proceed in the same workstream without requiring a separate operator command.

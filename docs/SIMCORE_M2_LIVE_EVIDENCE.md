# SimCore 2.0M Major — Live Evidence Ledger

This file records production diagnostics gathered during the staged 2.0M Major refactor. It is evidence-only: do not infer behavior that the captured diagnostics did not exercise.

## M2-1 — v0.63.56 Recovery Boundary Split

Production baseline:

```text
Version: 0.63.56
Release: M2-1 Recovery Boundary Split
Release commit: 222d6bd0c589c9dd4c469979daa42cefbd512a3e
Release blob: 6c828d5dadeb8a49f256afe1e54674cf5bd81803
```

### Sample 1 — first post-reload ordinary output path

Runtime:

```text
boot 2026-08-20T13:41:35.049Z
generation mt1kk4ax-jdnwks
request @1898 → output @1899
```

Observed:

```text
Session load: COLD_INIT
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Output process recovery: 1.0 ms
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Warnings: 0
Continuity: PASS
Frame sequence: PASS
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

Interpretation: the newly physical `output-compat` path executed successfully in production after the Recovery split. No M2-1 structural regression was observed. The history-bootstrap portion of `bootstrap-migration` was not meaningfully exercised in this sample (`bootstrap 0.0 ms`).

### Sample 2 — same-runtime regeneration / repeat-send path

Same runtime and same user/output slot:

```text
request @1898 → regenerated output @1899
Session load: LOCATION_REUSE
Pre snapshot: REPEAT-SEND · READ HIT
Edit reconcile: SAME_SNAPSHOT · snapshot UNCHANGED
```

Output compatibility remained active:

```text
Output process recovery: 1.0 ms
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
Warnings: 0
Continuity: PASS
Frame sequence: PASS
```

The regenerated output naturally produced a conservative representation mismatch:

```text
CANONICAL 3787:234db05
FRESH_CHAT 3788:6240060
Δchars +1
Deferred mirror: OUTPUT_MISMATCH
Safe-envelope reconcile: REJECTED
setChat 0
```

Interpretation: M2-1 preserved the output-side fail-safe. The known structural confirmation gate did not falsely accept an unproven +1 representation, and Deferred Mirror remained conservative.

### Immediate next validation gate

Do not regenerate the same turn again. Send one new natural request in the same runtime.

If the visible prior assistant is exactly the recorded `FRESH_CHAT 3788:6240060`, the next request should preserve the v0.63.55 regression control:

```text
Prior representation: OUTPUT_MISMATCH
current match: FRESH_CHAT
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
```

A return to `MANUAL_EDIT_REBUILT` for this exact-Fresh carryover would be an M2-1 regression signal and must be investigated before M2-2.

### Still not exercised by these samples

```text
bootstrap-migration history-bootstrap cold path
natural B-mode cross-check after M2-1
genuine user-edit positive control
```

The genuine-user-edit control is mandatory again when M2 moves the Edit Reconcile implementation itself. It is not inferred from these samples.

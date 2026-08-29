# SimCore v0.67.0 M2-5 real long-chat operator card

Date: 2026-08-29
Status: READY FOR HUMAN LIVE VALIDATION · v0.67.0 PUBLISHED · MACHINE STATE PENDING_REAL_LONG_CHAT

## Release identity

```text
Version:             0.67.0
Release:             M2-5 Recovery Transition Debt Retirement
Scenario:            06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT
release-simcore:     01a4204981191968ba22ba6ad161c1053d6bc7d0
latest/install blob: 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
latest == install:   YES
```

Machine-managed main state intentionally remains:

```text
validation_status       PENDING_REAL_LONG_CHAT
major_update_checkpoint M2-4
current_priority        06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT
```

Do not advance M2-5 until accepted human live evidence exists.

## Purpose

M2-5 removed only the zero-runtime-caller physical Recovery compatibility facade. Output Compat, Bootstrap Migration, Output Finalize and Edit Reconcile remain the physical owners.

The live gate therefore does not need to prove the absence of a module by UI inspection. Static/candidate verification already proved physical Recovery absence. Live validation must instead prove that the published artifact boots and ordinary direct-owner paths remain healthy without a Recovery-related missing-reference or bootstrap fault.

## Stage A — ordinary warm continuity

Use an existing useful long chat after the userscript has updated to v0.67.0.

1. Send one ordinary natural request. Do not edit/reroll the assistant output for this control.
2. Copy the SimCore Last Turn Diagnostic.
3. Send a second ordinary natural request in the same tab/generation.
4. Copy the second diagnostic.

Required healthy evidence across the pair:

```text
Version 0.67.0
Request hook SEEN
Turn binding BOUND
Runtime output COMMITTED
stale drops 0
no missing-module / undefined Recovery / bootstrap initialization exception
```

When the request is eligible for exact ordinary carryover, additionally expect:

```text
Edit reconcile SAME_FAST
Prior representation EXACT
Edit origin NONE
snapshot UNCHANGED
```

Deferred Mirror may be `COMMITTED` when exact/safe. A conservative mismatch/block is not automatically an M2-5 failure and must be interpreted from the full packet.

Warnings or anomalies that are not plausibly caused by the deleted Recovery seam must be preserved separately and classified `WATCH / DEFER / FIX / BLOCKER` before continuing.

## Stage B — same-tab reload/bootstrap regression

After Stage A is healthy:

1. Copy one healthy pre-refresh diagnostic if not already retained.
2. Perform an ordinary same-tab page refresh. Do not create a new chat solely for this test.
3. After the page is usable, send the first natural request.
4. Copy its diagnostic.
5. Send one more natural request in the same post-refresh generation.
6. Copy its diagnostic.

Acceptance:

```text
published Version 0.67.0 still active
runtime initializes normally
no Recovery missing-reference/runtime exception
no Bootstrap Migration initialization failure
no unsafe stale-state application
first post-refresh request truthfully reports whatever bounded adoption/cold outcome is actually eligible
second same-generation request continues normally
binding BOUND
output COMMITTED
stale drops 0
```

If Host-local continuity is eligible under the existing identity/TTL rules, `ADOPTED via host-local` is welcome evidence. If it is not eligible, a truthful safe cold/fail-closed result is acceptable. Do not force or fake an adoption outcome.

## Stage C — optional high-value M2 regression specimens

These are not required to close M2-5 if ordinary Stage A/B evidence is clean.

If naturally observed, preserve:

```text
prior OUTPUT_MISMATCH + exact Fresh carryover
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

A deliberate one-character genuine visible edit may also be retained as an optional positive control:

```text
prior EXACT
→ current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Do not manufacture malformed output solely to exercise rare compatibility branches.

## Stage D — optional domain coverage

Natural B / COMMUNITY / THOUGHTS specimens are useful cross-domain regressions but are not mandatory within a bounded M2-5 live window.

Any known pre-v0.67 WATCH family must remain separately attributed unless new evidence directly links it to the Recovery retirement.

## Stop conditions

Stop live advancement and preserve the packet immediately as `FIX` or `BLOCKER` if any of these occur:

```text
Recovery missing-module / undefined reference at runtime
bootstrap/load/reload initialization failure after v0.67 publication
ordinary request cannot bind or commit because of deleted-seam dependency
Output Compat behavior changes in a way attributable to Recovery retirement
Edit Reconcile direct-owner path fails because Recovery is absent
unsafe stale-state or mirror application appears with plausible M2-5 attribution
persistent schema/key mutation unexpectedly appears
```

A pre-existing unrelated quality warning is not automatically a blocker. Preserve it and classify separately.

## Minimum close packet

The minimum human evidence set for M2-5 closure is:

```text
A1 ordinary natural request diagnostic
A2 second same-generation ordinary request diagnostic
B1 first natural request after same-tab refresh diagnostic
B2 second same-generation post-refresh diagnostic
```

The visible assistant outputs for those controls should also be retained when they contain information needed to interpret warnings, lifecycle state, or output provenance.

## Close condition

```text
Stage A ordinary warm continuity PASS
+
Stage B same-tab reload/bootstrap continuity PASS
+
no M2-5-attributable FIX/BLOCKER
→ v0.67.0 M2-5 human live acceptance may close
```

Only after that accepted evidence should the normal release-state convergence path update durable main state from `PENDING_REAL_LONG_CHAT` / M2-4 to M2-5 live-complete. Do not hand-edit machine-managed state.

# SimCore Next Release Gate — v0.64.3

Date: 2026-08-22
Current production: `v0.64.2 — Diagnostic Copy Resilience`
Major checkpoint: M2-2 complete; M2-3 detailed design frozen and ready for later implementation.

## Gate fired

A natural current-turn B_END diagnostic-copy attempt returned the v0.64.2 UI result:

```text
진단 생성 실패
```

This is `REPORT_BUILD_FAILED`, not `CLIPBOARD_WRITE_FAILED`.

The source-correlated B_END-only failure is the unbound report-builder expression:

```js
time.narrativeTimestampSequence(kernel.textOfMessage(...))
```

inside the outer runtime scope where neither `time` nor `kernel` is bound.

The v0.64.2 release contract explicitly declared a natural `REPORT_BUILD_FAILED` to be the gate for a separate narrow builder-repair mini before M2-3.

## Immediate release order

```text
CURRENT: v0.64.2 Diagnostic Copy Resilience
NEXT:    v0.64.3 B_END Diagnostic Builder Binding Repair
THEN:    v0.65.0 M2-3 Edit Reconcile Ownership Extraction
```

`v0.65.0` detailed design remains valid and should not be reopened because of this diagnostic-only defect.

## v0.64.3 scope

Allowed:

```text
bind the existing Kernel/Time dependencies needed by the B_END report builder
or route the same calculation through an already-owned exported helper
add a static/current-turn B_END report-build fixture
retain COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED transport contract
```

Frozen:

```text
request/output hot paths
Broadcast/Time semantics
Frame
Structure/COMMUNITY/Reaction
Representation / v0.63.55 fast reconcile
Edit Reconcile decision tree
Recovery / output-compat / bootstrap-migration
Prompt and TAIL_AFTER_CURRENT_USER
Store schema/call semantics
Runtime Mirror / Deferred Mirror
host/history/cache observers
network/timer/host API surfaces
```

## Required validation

Static:

```text
node syntax PASS
latest == install PASS
Contracts v2 PASS
B_END report builder fixture PASS
non-B_END report body unaffected
copy result stage tests remain PASS
no new storage/chat/network/timer calls
```

Natural live close gate:

```text
current runtime mode B_END
output COMMITTED
report build succeeds
Broadcast closure / terminal coverage lines are present
copy result COPIED or COPIED_FALLBACK
```

Only after this mini passes should M2-3 implementation begin.

Evidence: `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md` and `SIMCORE_DIAGNOSTIC_COPY_WATCH_06401.md`.

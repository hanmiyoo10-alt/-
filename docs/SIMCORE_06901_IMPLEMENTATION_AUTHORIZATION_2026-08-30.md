# SimCore v0.69.1 Implementation Authorization

Date: 2026-08-30 KST
Status: **IMPLEMENTATION AUTHORIZED · RUNTIME WORK BRANCH REQUIRED**

Release: `v0.69.1 — Refreshless Targeted Update Liveness Repair`

## Authority chain

Design authority:

`docs/SIMCORE_06901_REFRESHLESS_TARGETED_UPDATE_LIVENESS_REPAIR_DESIGN_2026-08-30.md`

Trigger evidence:

- `docs/SIMCORE_06900_REFRESHLESS_PLUS_UPDATE_RECHECK_2026-08-30.md`
- `docs/SIMCORE_06900_M2_6_REAL_LONG_CHAT_EVIDENCE_2026-08-30.md`

Human implementation authorization was explicitly granted on 2026-08-30 KST.

## Exact parent authority

Runtime implementation must begin from exact current production:

```text
version                = 0.69.0
release-simcore commit = 31b4c5075659a55861731c6fd73f999402321e94
latest/install blob    = 86954f4d7ff7dec9119e2a8c047bfbfa6f801d56
checkpoint             = M2-6
```

## Authorized runtime transform

Only the frozen targeted-unload liveness repair is authorized:

1. bump runtime identities `0.69.0 -> 0.69.1`;
2. preserve `OUTPUT_COMMIT` durable Host-local telemetry behavior;
3. make targeted `UNLOAD` Host-local-free and bounded;
4. retire named old beforeRequest/output hooks immediately after disposed/epoch invalidation;
5. unregister old SimCore UI before unload completion;
6. permit only existing local synchronous telemetry publication during `UNLOAD`;
7. add deterministic targeted-replacement regression coverage;
8. update only release-sensitive metadata/tests made stale by this patch.

## Frozen no-change contract

```text
M2 checkpoint unchanged
M2-7 NONE
State Reconcile architecture unchanged
STATE_VERSION unchanged
CORE_STATE_VERSION unchanged
persistent state/storage keys unchanged
telemetry schema unchanged
network surface unchanged
new timer/retry/polling NONE
background old-runtime writer NONE
release-system R2.x change NONE
unrelated WATCH fixes NONE
```

Any discovery requiring a broader lifecycle redesign, schema/key change, timer/retry, detached Host write, architecture movement, or unrelated repair is a **BLOCKER** and requires redesign.

## Required qualification

Before publication:

```text
latest.js == install.js byte-for-byte
node --check both PASS
metadata/runtime/HOST identity = 0.69.1
UNLOAD Host-local acquire/write count = 0
old hook removal before optional local telemetry
old UI retirement before unload completion
captured stale old callback cannot commit/register/recreate UI
replacement runtime leaves exactly one active hook pair/UI surface
OUTPUT_COMMIT Host-local durable path unchanged
full-page refresh telemetry continuity preserved
M2-6 architecture/state differential controls PASS
no storage/schema/network/timer/polling surface expansion
```

## Release and live path

After implementation qualification:

```text
candidate materialization
-> exact approval transaction
-> RS2_4_PERMANENT publish to release-simcore
-> verify latest.js == install.js
-> genuine same-tab `+` update without page refresh
-> first post-update natural request
-> second same-generation request
-> ordinary full-page refresh control
-> classify every anomaly WATCH / DEFER / FIX / BLOCKER
-> HUMAN_EVIDENCE only after acceptance
-> R2.8 terminal convergence
-> main docs / long-term state synchronization
```

## Verdict

```text
V06901_IMPLEMENTATION = AUTHORIZED
RUNTIME_BRANCH         = REQUIRED
SOURCE_PARENT          = EXACT_V06900_RELEASE_SIMCORE
SCOPE                  = REFRESHLESS_TARGETED_UPDATE_LIVENESS_REPAIR_ONLY
M2_TARGET              = M2-6_UNCHANGED
M2_7                    = NOT_AUTHORIZED
RELEASE_SYSTEM_CHANGE  = NONE
```

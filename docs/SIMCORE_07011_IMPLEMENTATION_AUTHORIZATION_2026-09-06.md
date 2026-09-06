# SimCore v0.70.11 Implementation Authorization

Date: 2026-09-06 KST
Status: **AUTHORIZED · DESIGN READY · IMPLEMENTATION MAY BEGIN**
Classification: **RUNTIME-SOURCE MINI RELEASE · OPERATOR RELEASE CARD METADATA REPAIR**
Tracking: `#1657`

## 1. Operator authorization

The operator explicitly authorized the next SimCore update after the v0.70.11 design was merged to `main`.

```text
Operator instruction = 심코어 새버전 설계 완료됨 / 내가 허락했으니 업데이트ㄱ
Authorization = GRANTED
Design expansion = NOT GRANTED
Release-system restructuring = NOT GRANTED
```

Canonical design:

```text
docs/SIMCORE_07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_DESIGN_2026-09-06.md
Design PR = #1678
Design merge main = 472e265b631fcf63ebea4753017081f80abb01b4
Version = 0.70.11
Release = Operator Release Card Metadata Repair
Primary FIX owner = #1657
```

## 2. Fresh implementation-time authority preflight

Observed immediately before this authorization transaction:

```text
main = 472e265b631fcf63ebea4753017081f80abb01b4
production version = 0.70.10
production release = Host-Local Telemetry Set Cost Attribution
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
production blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
validation = PENDING_REAL_LONG_CHAT
current priority = 07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
major checkpoint = 2.0M / M2 / M2-6
provider cache = UNVERIFIED
#1657 = OPEN FIX / product advancement hold
#1660 = OPEN FIX / EXCLUDED FROM THIS RELEASE
```

`release-simcore` remains runtime/deployment authority. `main` remains design/evidence/roadmap/administrative authority.

## 3. Authorized implementation boundary

Implement exactly the frozen metadata repair:

```text
1. materialize 0.70.11 from exact 0.70.10 production bytes
2. advance userscript/runtime/Host compatibility identity to 0.70.11
3. add the 0.70.11 release note header
4. replace the complete OPERATOR_RELEASE_CARD release-local unit
5. set scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
6. keep validation = PENDING_REAL_LONG_CHAT
7. make summary/checks describe only this metadata repair
8. add deterministic regression proving version/name/scenario/body are one release family
9. reject historical 06900 / State Reconcile / Kernel Inversion guidance in the 0.70.11 card
10. preserve release-spec live-gate scenario parity
11. preserve latest.js == install.js at candidate and production
```

The implementation may use a dedicated builder, validation profile, fixture, permanent executable regression, and registry entry consistent with recent SimCore mini releases.

## 4. Explicit non-changes

The following are forbidden by this authorization:

```text
#1660 internal: alias repair
#1588 Host-local latency optimization
provider-cache work
request/output hook semantic change
Session / Mirror / Representation / Edit Reconcile behavior change
Host-local telemetry attribution behavior change
persistent state schema change
mailbox/key/TTL/cap change
storage/network/timer/retry/polling/queue/worker behavior change
new Host I/O
new chat/history mutation
runtime architecture refactor
release-system refactor
release-channel/ref-routing change
```

This authorization does not permit opportunistic cleanup outside the card repair.

## 5. Qualification contract

Before publication, required evidence includes:

```text
builder deterministic PASS
syntax / permanent SimCore CI PASS
latest == install PASS
module inventory/order preserved
require graph preserved
protected side-effect counts unchanged
metadata/runtime/Host identity = 0.70.11
operator card version/name/scenario/validation release-local
operator card summary/checks release-local
historical 06900 / State Reconcile / Kernel Inversion guidance absent from current card
release-spec liveGate scenario parity PASS
existing architecture/contracts PASS
```

If any implementation or CI anomaly appears, record it immediately as WATCH / DEFER / FIX / BLOCKER before proceeding.

## 6. Required publication sequence

```text
this repo authorization evidence
-> fresh implementation branch
-> static + permanent CI qualification
-> implementation evidence on main
-> separate candidate request
-> immutable candidate materialization
-> exact release approval
-> Permanent Release publication to release-simcore
-> production byte/readback verification
-> real operator-card + ordinary long-chat HUMAN_EVIDENCE
-> #1657 closure only after live acceptance
-> final main documentation / durable continuity synchronization
```

`latest.js` and `install.js` must remain byte-identical. Feature/runtime work must not be mixed with release-system restructuring.

## 7. Authorization verdict

```text
V07011_DESIGN = READY / KEEP
V07011_IMPLEMENTATION = AUTHORIZED
V07011_SINGLE_TARGET = #1657
V07011_SCOPE_EXPANSION = FORBIDDEN
V07011_RELEASE_SYSTEM_REFACTOR = FORBIDDEN
NEXT = IMPLEMENT AFTER THIS AUTHORIZATION PASSES REQUIRED CI AND MERGES TO MAIN
```

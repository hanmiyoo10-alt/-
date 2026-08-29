# SimCore post-v0.66 architecture-contract convergence evidence

Date: 2026-08-29

Status: **IMPLEMENTED ON NON-RUNTIME WORK BRANCH · EXACT PRODUCTION RE-AUDIT SUPPORTS M2-5 RECOVERY RETIREMENT · PERMANENT PR CI PENDING · release-simcore UNCHANGED**

Work branch:

`simcore/arch-contract-convergence-066`

Branch base:

`main@2e28d345e2335e5b7ac782cdbffa48066c5c84b0`

Production authority:

```text
Version: 0.66.0
Release: M2-4 Session / Runtime Mirror Boundary Completion
release-simcore commit: 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
latest/install blob: f0da13d4c47fd98e9065d7dbf253a3296151ee16
latest/install size: 563040 bytes
validation: LIVE_PASS
checkpoint: M2-4
```

## 1. Purpose

Close `POST_06600_ARCH_CONTRACT_DRIFT`, the non-runtime pre-M2-5 blocker recorded after v0.66 terminal closure.

Before this transaction:

```text
product-manifest / CURRENT_DEVELOPMENT = v0.66.0 LIVE_PASS / M2-4
config/simcore-architecture-v2.json     = v0.65 / M2-3 / M2-4 pending-publication language
docs/SIMCORE_CONTRACTS_V2.md           = older v0.64/M2 planning language
```

This transaction changes architecture authority only. It does not mutate plugin runtime bytes, release tooling, release transaction state, or `release-simcore`.

## 2. Production-source authority boundary

`main/plugins/simcore/latest.js` is intentionally an old v0.63.2 source mirror and is not current production authority.

Permanent architecture CI explicitly:

```text
git fetch origin release-simcore
→ materialize release-simcore/plugins/simcore/latest.js
→ materialize release-simcore/plugins/simcore/install.js
→ node --check both
→ cmp latest/install
→ run scripts/simcore-architecture-check.py --source on both production files
```

Therefore the Contracts/config convergence is based on exact `release-simcore` v0.66 production, not the historical main plugin mirror.

## 3. Exact production identity re-check

The production directory reports:

```text
install.js blob = f0da13d4c47fd98e9065d7dbf253a3296151ee16
latest.js blob  = f0da13d4c47fd98e9065d7dbf253a3296151ee16
size            = 563040 / 563040
latest == install by Git blob identity
```

The exact production header reports `//@version 0.66.0` and describes the M2-4 Session / Runtime Mirror Boundary Completion release.

## 4. Recovery exact-source audit

Exact v0.66 production contains the physical facade:

```js
SimCore.define("recovery", function (require, module, exports) {
  const outputCompat = require('./output-compat');
  const bootstrapMigration = require('./bootstrap-migration');
  ... forwarding exports ...
});
```

The production module contract itself describes Recovery as:

```text
deprecated M2 compatibility facade over output-compat + bootstrap-migration
with zero runtime callers
```

Exact production resource search finds:

```text
require('./recovery') runtime consumer = 0
```

Broad `recovery.` matches resolve to historical comments/diagnostic wording, generic recovery terminology, or the facade declaration surface; no live `recovery.*` consumer paired with a Recovery import is present.

Repository search for Recovery-module definition/compatibility references is concentrated in historical v0.66 builders and evidence/design documents. No permanent runtime test surfaced as an intentional direct Recovery consumer during this bounded audit.

Classification:

```text
V066_RECOVERY_FACADE
= PHYSICAL PRESENT
= FORWARDING ONLY
= ZERO RUNTIME IMPORT CONSUMERS
= ZERO OWN POLICY/STATE/I/O
= DEPRECATED TRANSITION SHIM
= M2_5 RETIREMENT PRECONDITION SUPPORTED
```

This is authorization evidence for a later separate M2-5 implementation transaction, not the deletion itself.

## 5. Machine contract convergence

`config/simcore-architecture-v2.json` now declares:

```text
production_baseline = exact v0.66.0 release identity
major_update.status = M2_4_LIVE_PASS_M2_5_TRANSITION_DEBT_REVIEW
checkpoint = M2-4
M2-4 release = PASS / LIVE_PASS
completed checkpoints = M2-1 through M2-4
```

Current module statuses now reflect production truth:

```text
recovery
= required physical deprecated shim
= zero-runtime-caller M2-5 retirement candidate

output-finalize
= required current M2-4 physical owner

session
= current M2-4 narrowed state-holder/orchestrator

runtime-mirror
= current M2-4 observe/guard/transport owner

representation
= current identity/provenance + accepted canonical-equivalence owner

output-compat
= current envelope + Fresh candidate planning/interpretation owner

edit-reconcile
= current direct-owner dependency shape
```

Frozen provider-cache/history/TAIL/Fresh-retention contracts remain unchanged.

## 6. Human-readable Contracts v2 convergence

`docs/SIMCORE_CONTRACTS_V2.md` is rebased from future-tense pre-M2-4 language to current post-v0.66 authority.

It now explicitly records:

- exact v0.66 production identity and LIVE_PASS/M2-4 checkpoint;
- M2-1 through M2-4 as completed structural checkpoints;
- current Representation, Edit Reconcile, Output Finalize, Session and Runtime Mirror ownership;
- Recovery as a deprecated physical shim with zero runtime callers;
- the exact deletion gate required before M2-5 implementation;
- the fact that architecture CI validates materialized `release-simcore` production rather than the historical main source mirror;
- WATCH/DEFER tracks remain separate from M2-5.

## 7. Scope exclusions

This transaction does not:

```text
change v0.66 runtime bytes
change latest.js/install.js
mutate release-simcore
remove Recovery
change M2 behavior
change COMMUNITY/Broadcast/Frame/Time semantics
optimize the 40.224 s genuine-edit WATCH
repair PARTIAL_PREVIOUS_TURN_REPLAY
change release-system R2.x machinery
change provider-cache policy
```

Unrelated R2.6 main activity present before branch creation remains outside this SimCore architecture transaction.

## 8. Validation and authorization gate

Current local/repository evidence supports the target architecture state, but permanent PR CI remains authoritative for the non-runtime convergence.

Required close sequence:

```text
branch changes
→ PR to current main
→ SimCore Architecture Contracts CI against exact release-simcore PASS
→ required repository CI PASS where applicable
→ merge to main
→ re-read merged authority
→ record 06700 implementation authorization
```

Until that succeeds:

```text
POST_06600_ARCH_CONTRACT_DRIFT = FIX IMPLEMENTED / CI PENDING
06700_RUNTIME_IMPLEMENTATION_AUTHORIZED = NO
release-simcore mutation = FORBIDDEN
```

If permanent CI exposes an undeclared edge, stale exception, missing module, graph mismatch, invalid JSON, or other contradiction, classify it before proceeding and repair only the architecture-authority transaction.

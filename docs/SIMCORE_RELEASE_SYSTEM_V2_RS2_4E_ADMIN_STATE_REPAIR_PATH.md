# SimCore Release System v2 — RS2-4E Administrative State Repair Path

Date: 2026-08-24
Status: **IMPLEMENTED PENDING PERMANENT CI · NON-RUNTIME**
Scope: project-owned repair of `MAIN_ADMIN_STATE_DRIFT` before permanent release caller activation

## 1. Finding

The current production identity is already correct:

```text
SimCore v0.64.6
release-simcore = 47969d24771f6cc188df6e32150fc6fde519182d
latest == install blob = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

But main administrative state remains stale:

```text
product-manifest.validation_status = PENDING_REAL_LONG_CHAT
actual live evidence                = FULL NATURAL LIVE CLOSE PASS

product-manifest.current_priority   = 06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION
actual active work                  = RS2-4E / REAL_RELEASE_READY qualification

CURRENT_DEVELOPMENT human verdict   = v0.64.3 is current production
actual production                   = v0.64.6
```

Classification:

```text
MAIN_ADMIN_STATE_DRIFT
= FIX / DOCUMENT+STATE / NON_RUNTIME
```

## 2. Repair ownership

Do not use `sync-state` to invent human operational judgment.

The repair is an explicit project-owned administrative transition with exact expected old state and exact approved new state.

Registered transition:

```text
products/simcore/state-sync/active-admin-transition.json
```

Executor:

```text
products/simcore/tooling/admin-state-transition.mjs
```

The executor may mutate only:

```text
product-manifest.validation_status
product-manifest.current_priority
explicit exact-text replacements in docs/CURRENT_DEVELOPMENT.md
```

It may not mutate production version, release name, release branch, release commit, release blob, plugin runtime files, or release-simcore.

## 3. Fail-closed rules

The transition requires:

```text
manifest.release_commit == expectedProductionCommit
all manifest fields are either exact expected-old or exact desired-new values
each document replacement is either exact old text once or exact new text once
document path is explicitly allowlisted
unknown transition fields are denied
```

Unexpected mixed/foreign state fails closed.

Already-applied state is idempotent.

A partial prior application consisting only of known expected/desired states is recoverable by applying the remaining expected-old targets.

## 4. Explicit human/admin text repair

The transition does not infer prose from manifest fields.

It explicitly records the approved replacement text that:

- identifies v0.64.6 as current production;
- records its direct `FULL NATURAL LIVE CLOSE PASS` evidence;
- records R / RS2-4E as current infrastructure work;
- states that v0.64.7 and M2-3 have not started;
- relabels older release sections as historical ledger material so historical point-in-time statuses cannot masquerade as current state.

This remains outside the normal `sync-state` renderer authority and is allowed only because the administrative transition itself is the explicit human/project decision record.

## 5. State-sync integration

The active state writer now performs:

```text
resolve exact release-simcore identity
→ transitional release identity declaration
→ apply registered admin transition
→ sync-state --write
→ git diff --check
→ bounded state payload commit
→ repo-main-write project gateway
→ MAIN_HEALTH / Required
→ main fast-forward only if exact candidate passes
```

The generated main payload remains bounded to:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

The transition spec itself is not part of the generated state payload.

## 6. Permanent regression owner

Permanent CI self-test now requires:

```text
admin transition tool/test classified as STATE_SYNC
state writer classified CI_SELF + HARNESS + STATE_SYNC + SHARED_MAIN_COORDINATION
admin transition runs before sync-state rendering
state writer retains MAIN_HEALTH / Required project gateway
transition spec is not in writer payload allowlist
admin transition deterministic test passes
```

Deterministic test covers:

```text
dry-run no mutation
normal apply
idempotent re-run
known partial-state recovery
unexpected manifest state fail
production identity mismatch fail
release-identity field mutation denied
document path escape denied
```

## 7. Activation sequence

This implementation PR does not itself repair main state.

After permanent CI PASS and merge:

```text
open explicit durable-memory sync command PR
→ main state writer executes registered transition
→ project gateway MAIN_HEALTH / Required verifies exact generated candidate
→ main state lands
→ re-read manifest + CURRENT_DEVELOPMENT + sync-state status
→ classify MAIN_ADMIN_STATE_DRIFT = FIXED
```

Only after that evidence may RS2-4E activate the permanent `RS2_4_RELEASE` caller and move toward `REAL_RELEASE_READY`.

## 8. Safety boundary

```text
runtime mutation        NONE
plugins/simcore change  NONE
release-simcore change  NONE
version bump            NONE
production publication  NONE
```

This work is Release System v2 administrative infrastructure only.

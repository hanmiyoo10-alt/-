# SimCore Release System v2 — RS2-4E Administrative State Repair Path

Date: 2026-08-24
Status: **IMPLEMENTED · APPLIED · VERIFIED · NON-RUNTIME**
Scope: project-owned repair of `MAIN_ADMIN_STATE_DRIFT` before permanent release caller activation
Direct result evidence: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_ADMIN_STATE_REPAIR_EVIDENCE.md`

## 1. Finding

Before repair, the production identity was already correct:

```text
SimCore v0.64.6
release-simcore = 47969d24771f6cc188df6e32150fc6fde519182d
latest == install blob = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

But main administrative state was stale:

```text
product-manifest.validation_status = PENDING_REAL_LONG_CHAT
actual live evidence                = FULL NATURAL LIVE CLOSE PASS

product-manifest.current_priority   = 06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION
actual active work                  = RS2-4E / REAL_RELEASE_READY qualification

CURRENT_DEVELOPMENT human verdict   = v0.64.3 is current production
actual production                   = v0.64.6
```

Classification before repair:

```text
MAIN_ADMIN_STATE_DRIFT
= FIX / DOCUMENT+STATE / NON_RUNTIME
```

Current classification:

```text
MAIN_ADMIN_STATE_DRIFT
= FIXED / DIRECT_REPOSITORY_EVIDENCE / PROJECT_GATEWAY_VERIFIED
```

## 2. Repair ownership

`sync-state` did not invent human operational judgment.

The repair used an explicit project-owned administrative transition with exact expected old state and exact approved new state.

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

It may not mutate production version, release name, release branch, release commit, release blob, plugin runtime files, or `release-simcore`.

The one-shot registration used for this repair was:

```text
products/simcore/state-sync/active-admin-transition.json
```

and was retired after successful application so a future production commit cannot be blocked by a stale v0.64.6 transition.

## 3. Fail-closed rules

The transition requires:

```text
manifest.release_commit == expectedProductionCommit
manifest targets are exact expected-old or exact desired-new values
each document replacement is exact old text once or exact new text once
document path is explicitly allowlisted
unknown transition fields are denied
```

Unexpected foreign state fails closed.

Already-applied state is idempotent.

A partial prior application consisting only of known expected/desired states is recoverable by applying the remaining expected-old targets.

## 4. Explicit human/admin text repair

The transition does not infer prose from manifest fields.

It explicitly recorded approved replacement text that:

- identifies v0.64.6 as current production;
- records direct `FULL NATURAL LIVE CLOSE PASS` evidence;
- records R / RS2-4E as current infrastructure work;
- states that v0.64.7 and M2-3 have not started;
- relabels older release sections as historical ledger material so point-in-time statuses cannot masquerade as current state.

This remains outside normal `sync-state` renderer authority and is valid because the administrative transition itself is the explicit project decision record.

## 5. State-sync integration

The active state writer performs:

```text
resolve exact release-simcore identity
→ transitional release identity declaration
→ apply registered admin transition when one exists
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

A transition registration itself is never part of the generated state payload.

## 6. Permanent regression owner

Permanent CI self-test requires:

```text
admin transition tool/test classified as STATE_SYNC
state writer classified CI_SELF + HARNESS + STATE_SYNC + SHARED_MAIN_COORDINATION
admin transition runs before sync-state rendering
state writer retains MAIN_HEALTH / Required project gateway
transition spec is not in writer payload allowlist
admin transition deterministic test passes
```

Deterministic coverage includes:

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

Implementation qualification:

```text
PR                    #226
merge                  6e1d2f9f90e721476ce561192173336d49088262
SimCore CI             32733715053
Verify                 SUCCESS
Required               SUCCESS
```

## 7. Actual repair execution

The registered transition was executed by command-only PR #227 and the active state writer.

```text
state-sync run              32733857877
admin transition            APPLIED
sync-state                  CHECK_CLEAN
blockers / drifts / obs     0 / 0 / 0
generated main commit       64aa4c8caf5b145fec3e1d4cba56907b61686fdd
project Required run        32733878499
project Required result     PASS
main write                  MAIN_WRITE_LANDED attempt=1
```

Canonical main readback confirms:

```text
validation_status = LIVE_PASS
current_priority  = RS2_4E_REAL_RELEASE_READY_QUALIFICATION
current production verdict = v0.64.6
historical release material = explicitly labelled historical
```

Command PR #227 was closed without merge after successful execution.

## 8. One-shot transition retirement

A successful one-shot administrative registration must not remain active indefinitely.

This repair was bound to production commit:

```text
47969d24771f6cc188df6e32150fc6fde519182d
```

If left active after a later legitimate release, it would correctly reject the new production identity and block state sync. Therefore `active-admin-transition.json` is removed as part of the verified repair closure.

The reusable executor and tests remain. A future admin repair must register a new transition with its own exact state/evidence and retire it after application.

## 9. Operational WATCH

The successful state-sync run emitted a GitHub-hosted Actions warning that `actions/checkout@v4` and `actions/upload-artifact@v4` target Node.js 20 while the platform forced them to run on Node.js 24.

```text
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
= WATCH / HOST_TOOLCHAIN / NON_RUNTIME / NON_BLOCKING
```

The transaction completed successfully. This observation does not justify a runtime or release-semantic change; correlate it only if action/runner behavior changes or it becomes an execution failure.

## 10. Safety boundary

```text
runtime mutation        NONE
plugins/simcore change  NONE
release-simcore change  NONE
version bump            NONE
production publication  NONE
```

Production remains v0.64.6 at commit `47969d24771f6cc188df6e32150fc6fde519182d` with identical release blob `34da01aa131f760b92d65d961a7843e9cc0d37d6`.

## 11. Resulting activation sequence

The administrative prerequisite is now closed.

```text
controller primitive qualification   PASS
repository P1/rollback qualification PASS
administrative state repair          PASS
one-shot transition retirement       PASS

next:
activate canonical RS2_4_RELEASE caller
→ qualify activation without production write
→ mark REAL_RELEASE_READY
```

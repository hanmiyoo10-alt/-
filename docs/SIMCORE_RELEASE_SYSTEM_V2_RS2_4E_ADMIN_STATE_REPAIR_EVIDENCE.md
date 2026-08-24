# SimCore Release System v2 — RS2-4E Administrative State Repair Evidence

Date: 2026-08-24
Status: **FIX VERIFIED · NON-RUNTIME · ONE-SHOT TRANSITION RETIRED**
Finding: `MAIN_ADMIN_STATE_DRIFT`

## 1. Repair mechanism qualification

The bounded repair mechanism was implemented in PR #226 and validated by permanent SimCore CI before merge.

```text
PR                         #226
implementation head        7bb033c060dc30fd48acafc65db6819ab1a45f07
merge commit               6e1d2f9f90e721476ce561192173336d49088262
SimCore CI run             32733715053
Verify job                 97451544993  SUCCESS
Required job               97451647410  SUCCESS
runtime mutation           NONE
release-simcore mutation   NONE
```

The qualified mechanism consists of:

```text
products/simcore/tooling/admin-state-transition.mjs
products/simcore/tests/admin-state-transition.test.mjs
products/simcore/state-sync/active-admin-transition.json   [one-shot; retired after use]
.github/workflows/simcore-release-state-sync.yml integration
permanent CI classifier/self-test ownership
```

## 2. Actual repair transaction

The repair was executed through command-only PR #227 titled exactly:

```text
SimCore durable memory sync command
```

The command payload was transport only and was closed without merge after successful execution.

```text
command PR                  #227
command head                83361d201341d2468d733ab1d059b3b186316da8
state-sync run              32733857877
state-sync job              97452001196  SUCCESS
admin transition result     APPLIED
sync-state result           CHECK_CLEAN
sync-state blockers         0
sync-state drifts           0
sync-state observations     0
```

`sync-state` independently reverified production truth before allowing the state payload:

```text
resolved branch             release-simcore
resolved production commit  47969d24771f6cc188df6e32150fc6fde519182d
latest blob                 34da01aa131f760b92d65d961a7843e9cc0d37d6
install blob                34da01aa131f760b92d65d961a7843e9cc0d37d6
version                     0.64.6
release name                Post-B_END C Clock Handoff Authority
identity status             IDENTITY_VERIFIED
writer policy               WRITER_POLICY_CLEAN
```

## 3. Project-authority gateway proof

The generated state payload was committed by `github-actions[bot]`, then replayed onto the exact latest main base through `scripts/repo-main-write.py`.

```text
generated candidate commit  64aa4c8caf5b145fec3e1d4cba56907b61686fdd
base main                    6e1d2f9f90e721476ce561192173336d49088262
required workflow            simcore-ci.yml
required profile             MAIN_HEALTH
required job                 Required
nested Required run          32733878499
required gate result         PASS
main write result            MAIN_WRITE_LANDED
attempt                      1
```

The production branch was not written by this transaction.

## 4. Main state after repair

Direct readback from canonical main confirms:

```text
product-manifest.production_version  0.64.6
product-manifest.release_commit      47969d24771f6cc188df6e32150fc6fde519182d
product-manifest.release_blob        34da01aa131f760b92d65d961a7843e9cc0d37d6
product-manifest.validation_status   LIVE_PASS
product-manifest.current_priority    RS2_4E_REAL_RELEASE_READY_QUALIFICATION
```

`docs/CURRENT_DEVELOPMENT.md` now:

- declares v0.64.6 as current production;
- references the direct `FULL NATURAL LIVE CLOSE PASS` evidence;
- identifies R / RS2-4E as current infrastructure work;
- explicitly states v0.64.7 and M2-3 have not started;
- labels older point-in-time release sections as historical ledger material;
- has a machine-managed production snapshot whose declared validation state is `LIVE_PASS`.

Classification:

```text
MAIN_ADMIN_STATE_DRIFT
= FIXED / DIRECT_REPOSITORY_EVIDENCE / PROJECT_GATEWAY_VERIFIED
```

## 5. One-shot transition retirement

The registered transition was intentionally one-shot.

Leaving it active would create a future failure after the next real release because its exact expected production commit is v0.64.6. After `release-simcore` advances, the stale transition would correctly fail its production-identity guard.

Therefore this evidence work retires:

```text
products/simcore/state-sync/active-admin-transition.json
```

before permanent release caller activation.

The executor and permanent regression tests remain reusable infrastructure. Future administrative transitions must be separately registered with their own exact expected state and evidence, then retired after application.

## 6. Operational observation

The successful state-sync run emitted a GitHub-hosted Actions warning that `actions/checkout@v4` and `actions/upload-artifact@v4` still target Node.js 20 and were forced to execute on Node.js 24 by the platform.

Classification:

```text
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
= WATCH / HOST_TOOLCHAIN / NON_RUNTIME / NON_BLOCKING
```

The run completed successfully and no SimCore correctness failure was observed. Do not change runtime or release semantics for this warning. Re-evaluate when action versions or GitHub runner behavior change, or if the warning becomes an execution failure.

## 7. Safety boundary

```text
production runtime version  0.64.6 unchanged
release-simcore commit       47969d24771f6cc188df6e32150fc6fde519182d unchanged
release blob                 34da01aa131f760b92d65d961a7843e9cc0d37d6 unchanged
plugins/simcore mutation     NONE
version bump                 NONE
production publication       NONE
```

## 8. Resulting RS2-4E next step

The administrative prerequisite is closed.

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

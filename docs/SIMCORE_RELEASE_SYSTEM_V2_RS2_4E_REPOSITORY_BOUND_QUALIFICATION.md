# SimCore Release System v2 — RS2-4E Repository-Bound Qualification

Date: 2026-08-24
Status: **P1 REQUALIFIED · ROLLBACK SAFE SOURCE QUALIFIED · NON-RUNTIME**
Scope: repository-bound current-production qualification before permanent release activation
Parent evidence: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_QUALIFICATION_EVIDENCE.md`

## 1. Purpose

This work closes the repository-bound evidence that does not require another artificial publication attempt.

R should reuse durable direct evidence when the exact identities and frozen evaluator remain unchanged rather than manufacturing a second fake release merely to repeat an already-proven condition.

Production mutation from this work item:

```text
release-simcore = NONE
plugins/simcore/latest.js = NONE
plugins/simcore/install.js = NONE
runtime semantics = NONE
```

## 2. Current production re-observation

Current production authority remains:

```text
release-simcore HEAD
= 47969d24771f6cc188df6e32150fc6fde519182d

version
= 0.64.6

release blob latest == install
= 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

This is the same production parent used by the earlier RS2-4 live NOOP proof.

## 3. P1 current-production NOOP requalification

Existing direct repository-bound proof candidate:

```text
C = 08af3d2aac63b85c699bf264ebb2c207018a1e22
P = 47969d24771f6cc188df6e32150fc6fde519182d
```

Git evidence re-observed on 2026-08-24:

```text
parent(C) == P
changed files == 0
candidate tree == production tree
candidate latest/install blob == 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

Original live shadow qualification:

```text
run       32723671966
mode      NOOP_IDENTICAL
result    WOULD_NOOP
before    47969d24771f6cc188df6e32150fc6fde519182d
after     47969d24771f6cc188df6e32150fc6fde519182d
production mutation NONE
```

The permanent controller primitive merged through PR #221 now wraps the same frozen `evaluateShadow` semantics while adding exact Required-report / C / P / authority / verifier binding.

Controller CI qualification:

```text
run      32731077286
Verify   97443243549 = SUCCESS
Required 97443348273 = SUCCESS
```

Therefore P1 is requalified by composed identity-preserving evidence:

```text
same exact current P
+ same exact zero-diff C
+ prior direct repository-bound WOULD_NOOP proof
+ frozen release semantic evaluator retained
+ new authority binding permanently CI verified
= P1 REQUALIFIED
```

No new proof-only release attempt is required.

This is an intentional R simplification: once a failure/safety class has exact durable evidence and a permanent regression owner, routine qualification may reuse that evidence as long as the bound identities remain unchanged.

## 4. Approved rollback safe source

Selected prior-safe source:

```text
version = 0.64.5
release = COMMUNITY Multiline Reaction Unit Validation Repair
S commit = 6c43c8167375b836a87277c005c63f93b028dde4
S blob   = a4b4633343cd856954857e7c490528fc713620da
```

Direct live evidence:

```text
docs/SIMCORE_LIVE_06405_VALIDATION.md
Status: LIVE PASS · RELEASE CONTRACT SATISFIED
```

Repository ancestry re-observation:

```text
base S = 6c43c8167375b836a87277c005c63f93b028dde4
head P = 47969d24771f6cc188df6e32150fc6fde519182d
status = ahead
P ahead of S by 4 commits
merge base == S
```

Thus the selected safe source is a real prior production ancestor with direct long-chat PASS evidence.

## 5. Rollback model qualification

RS2-4 rollback never rewinds `release-simcore` backward to S with force.

Required model remains:

```text
current production P
→ create new rollback candidate C_R as a direct child of P
→ C_R latest/install bytes exactly equal approved safe S blob
→ immutable ROLLBACK release spec binds S commit/blob and reason
→ CANDIDATE_REQUIRED(C_R,P)
→ ordinary fast-forward publish P -> C_R
```

The controller primitive permanent harness already proves this forward-history rollback mechanism in sandbox R1.

Repository-bound source qualification now adds the missing Level-2 fact:

```text
approvedSafeCommit = 6c43c8167375b836a87277c005c63f93b028dde4
approvedSafeBlob   = a4b4633343cd856954857e7c490528fc713620da
source live status = PASS
source ancestry    = real prior production ancestor of current P
```

Verdict:

```text
ROLLBACK_SAFE_SOURCE_QUALIFIED = YES
ROLLBACK_FORWARD_HISTORY_MECHANISM = CI_VERIFIED
ROLLBACK_REHEARSAL_VERIFIED = YES
```

This does not perform a production rollback.

## 6. Administrative drift remains a FIX gate

Current production identity is correct on main, but lifecycle/active-work administration is stale:

```text
product-manifest.validation_status
= PENDING_REAL_LONG_CHAT

actual v0.64.6 live evidence
= FULL NATURAL LIVE CLOSE PASS

product-manifest.current_priority
= 06403_B_END_DIAGNOSTIC_BUILDER_LIVE_VALIDATION

actual active project priority
= RS2-4E / REAL_RELEASE_READY qualification
```

Classification:

```text
MAIN_ADMIN_STATE_DRIFT
= FIX / DOCUMENT+STATE / NON_RUNTIME
```

This must be repaired through a bounded project-owned administrative transition before permanent release authority is marked READY.

Do not use `declare-production` to rewrite `current_priority`; RS2-4D intentionally excludes human/admin roadmap judgment from production declaration authority.

## 7. Next gate

```text
P1 repository-bound NOOP       REQUALIFIED
rollback safe source           QUALIFIED
rollback mechanism R1          CI VERIFIED
admin drift                    FIX REQUIRED
RS2_4_RELEASE workflow caller  NOT ACTIVE
REAL_RELEASE_READY              NO
```

Next work item:

```text
project-owned bounded admin-state transition
→ current v0.64.6 lifecycle truth + active R priority
→ sync-state current machine block
→ permanent CI/state check
→ then activate RS2_4_RELEASE caller in the canonical release controller
```

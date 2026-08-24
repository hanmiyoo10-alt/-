# SimCore Release System v2 — RS2-4E Activation Amendment

Date: 2026-08-24
Status: **DESIGN FROZEN · NON-RUNTIME · ACTIVATION BOUNDARY AMENDMENT**
Parent design: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_PROMOTION_REAL_RELEASE_ROLLBACK_RETIREMENT.md`
Current machine state: `products/simcore/releases/RS2_4_SHADOW_STATUS.json`

## 1. Why this amendment exists

RS2-4 A/B/C/D shadow implementation is now verified, but the frozen RS2-4E design requires repository-level required-check enforcement before operational promotion:

```text
RS2_3_CLOSED = YES
REQUIRED_CI_ACTIVE = YES
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
```

Current repository truth remains:

```text
RS2-3                     PROMOTION_READY
permanentCiAvailable      true
permanentCiShadowVerified true
requiredCiActive          false
requiredCiEnforcementVerified false
blocker                    REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
```

The currently available GitHub automation/tool surface cannot configure branch protection or rulesets.

This is an administrative capability gap, not a failure of the permanent verifier itself.

## 2. Amendment decision

Do not weaken or falsely close RS2-3.

Instead, separate two enforcement scopes that were previously coupled:

```text
A. repository-wide merge governance enforcement
B. release-transaction candidate enforcement
```

Repository-wide governance enforcement remains deferred and unclaimed:

```text
requiredCiActive = false
requiredCiEnforcementVerified = false
rs2_3Closed = false
```

Release-transaction enforcement may be promoted independently **only if** the permanent release controller itself makes authoritative `CANDIDATE_REQUIRED` success on the exact `(C,P)` tuple a non-bypassable precondition of every production write.

This amendment therefore permits:

```text
CANDIDATE_REQUIRED_RELEASE_AUTHORITY = ACTIVE
```

without claiming:

```text
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
```

provided every gate below is satisfied.

## 3. Safety rationale

The release-simcore production authority does not require an unsafe inference from a merged PR state if the publisher independently re-verifies the exact immutable candidate before publication.

Required invariant:

```text
release-simcore write
MUST be causally downstream of
CANDIDATE_REQUIRED(C,P) == PASS
```

The release controller must fail closed if:

```text
candidate C changes
production parent P changes
verifier identity changes unexpectedly
required result is absent/skipped/fail
release authorization identity differs
latest/install differ
candidate contains unauthorized paths
```

Thus repository-wide branch protection remains desirable governance hardening, but production publication safety is enforced inside the release transaction itself.

## 4. What this amendment does NOT do

It does not:

```text
close RS2-3
claim GitHub branch protection exists
retire permanent CI
allow manual bypass of CANDIDATE_REQUIRED
allow direct release-simcore writes outside the controller
allow runtime changes inside R infrastructure work
activate a fake/productless release
```

The existing blocker remains durable:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= DEFER / ADMIN_GOVERNANCE / NON_RUNTIME
```

It is no longer a blocker to **release-transaction authority activation** once the controller proves non-bypassable candidate enforcement.

It remains a blocker to `RS2_3_CLOSED` under the original RS2-3 contract.

## 5. Amended RS2-4E promotion prerequisites

Before `PERMANENT_RELEASE_AVAILABLE = YES`, require:

```text
RS2_1_CLOSED = YES
RS2_2_CLOSED = YES
STATE_SYNC_AVAILABLE = YES
DOCUMENT_SYNC_CUTOVER_COMPLETE = YES
PERMANENT_CI_AVAILABLE = YES
PERMANENT_CI_SHADOW_VERIFIED = YES
CANDIDATE_REQUIRED_INTERFACE_READY = YES

release-controller exact C/P required-check binding PASS
release-controller required-check bypass negative test PASS
current production state identity synchronized
sync-state current-production check PASS
RS2-4 A/B/C/D implementation self-tests PASS
runtime mutation from R implementation NONE
release-simcore mutation from shadow qualification NONE
```

The following remain explicitly false and do not block release-transaction promotion under this amendment:

```text
RS2_3_CLOSED
REQUIRED_CI_ACTIVE
REQUIRED_CI_ENFORCEMENT_VERIFIED
```

## 6. Required new qualification evidence

Before the first real release, add explicit controller-level proofs:

```text
E-A1 exact C/P required PASS permits plan
E-A2 missing Required result blocks publication
E-A3 failed Required blocks publication
E-A4 Required success for different C blocks publication
E-A5 production parent movement after Required blocks publication
E-A6 verifier/authority marker mismatch blocks publication
```

These are release-authority tests, not repository-governance tests.

## 7. Current state-drift requirement remains

This amendment does not waive the existing main administrative drift.

Before real authority activation:

```text
product-manifest actual production identity must equal release-simcore
validation status must reflect completed v0.64.6 live proof
registered machine blocks must be current
sync-state --check against actual production must PASS
```

The drift repair must be performed as an administrative/state work item, not mixed with runtime feature semantics.

## 8. First real release rule remains unchanged

The first permanent-controller production publication must still be a legitimate separately designed SimCore product/correctness release.

Forbidden:

```text
fake version bump
comment-only runtime mutation to test R
mixing R implementation and runtime feature in one work item
```

The first real release remains both:

```text
normal SimCore product release
+
real operational qualification of R
```

and must reach real long-chat `LIVE_PASS` before legacy release authority retirement and RS2-4 closure.

## 9. Resulting R completion path

Amended path:

```text
A/B/C/D shadow verified
→ implement E controller-level activation qualification
→ repair current main administrative production drift
→ run positive/negative/rollback qualification
→ mark REAL_RELEASE_READY
→ use next legitimate SimCore release as first real R release
→ real long-chat LIVE_PASS
→ close release record/main state
→ retire legacy release authority
→ RS2_4_CLOSED
```

Until the first genuine product release reaches LIVE_PASS, R may be called **implementation/qualification ready**, but not fully operationally closed.

## 10. Long-term admin hardening

If GitHub branch-protection/ruleset configuration becomes available later:

```text
configure SimCore CI / Required
verify enforcement
close RS2-3 through its original P4/P5 contract
```

This later governance hardening must not silently rewrite historical claims.

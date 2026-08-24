# SimCore Release System v2.1 — Delegated Operator Activation Evidence

Date: 2026-08-25
Status: **CLOSED · DELEGATED OPERATOR POLICY ACTIVE · AWAITING GENUINE RELEASE PROOF · NON-RUNTIME**

## Closure verdict

The user-selected delegated operator policy is implemented, permanent-CI qualified, merged to durable `main`, production-preserving, and documented.

```text
explicit release work item required = YES
standing/background release authority = NO
user manual pre-live GitHub actions = 0
assistant delegated through LIVE_PENDING = YES
human real-long-chat LIVE_PASS = STILL REQUIRED
```

The next genuine runtime release is still required to prove the complete steady-state flow end to end. This closure therefore means **policy active / infrastructure qualified**, not “production operation already proven.”

## Decision

Steady-state operator experience:

```text
explicit SimCore update/release request
→ assistant performs all repository/release work through LIVE_PENDING
→ user performs no manual GitHub approval/button action
→ user next acts only when applying the plugin with `+` and running real long-chat validation
```

This is bounded delegation for an explicitly requested release work item, not permission for autonomous/background releases.

## Implementation

### Approval package materializer

`products/simcore/tooling/release-approval-package.mjs`

The package materializer accepts only the durable candidate receipt and its bound `SHADOW_ONLY` spec. It emits:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

The approval object does not contain C/P/blob. The spec is copied from the already validated machine-derived shadow through the exact approval resolver. Packaging has no publication primitive.

### Exact approval activation adapter

`.github/workflows/simcore-release-pr-activation.yml`

The historical activation-file trigger is replaced by an approval-package trigger. A merged exact approval PR must change exactly two files:

```text
1 approval JSON
1 matching authorized release spec
```

The adapter then requires:

- exact PR merge checkout;
- each approval/spec path is first/only authorized at that merge;
- exact approval schema and title;
- receipt PASS and exact release binding;
- live candidate ref re-observation equals receipt C;
- live `release-simcore` re-observation equals receipt P;
- `release-approval-resolve.mjs` PASS;
- committed spec semantically equals the resolver-derived machine spec;
- `RS2_4_RELEASE` marker;
- existing permanent caller dispatch and successful observation.

The adapter still has no `contents: write`, publisher call, main writer, direct production push, or force primitive. The permanent caller remains the sole publisher.

## Permanent regression

`release-approval` batch-a additionally proves:

```text
NEW_VERSION package == machine shadow
SAME_VERSION_CORRECTION package == machine shadow
ROLLBACK package == machine shadow
package shadow-path mismatch blocks
approval tooling contains no publication primitive
active adapter path is approvals/**, not activations/**
approval PR must contain exactly approval + spec
adapter must run exact resolver before dispatch
committed spec must equal derived spec
adapter contains no publication authority
```

The old broad self-test still searches for two historical activation strings. They are temporarily retained only as clearly marked non-executable comments while the dedicated release-approval suite enforces the real active path.

```text
LEGACY_ACTIVATION_SELF_TEST_SENTINELS
= DEFER / TEST_HARNESS_CLEANUP / NON_OPERATIONAL / NON_BLOCKING
```

## Tooling anomalies preserved

Before the work branch existed, an attempted write returned 404 with no repository mutation:

```text
R2_1_OPERATOR_POLICY_PREWRITE_BRANCH_MISSING
= FIX / TOOLING / PREWRITE / NON_RUNTIME
```

A subsequent tool-selection mistake briefly created `noop.tmp` on main. It was immediately deleted in the next main commit.

```text
R2_1_OPERATOR_POLICY_ACCIDENTAL_MAIN_NOOP_MARKER
= FIX / TOOLING / MAIN_ADMIN_ONLY / NO_RUNTIME_IMPACT
```

No runtime, release state, or `release-simcore` identity was touched by either anomaly.

## Permanent CI evidence

Implementation PR: `#292`

First proposed-head permanent CI:

```text
run      32769662790
Verify   97566934048  PASS
Required 97567062169  PASS
```

Final evidence/status head permanent CI:

```text
run      32769840775
Verify   97567528932  PASS
Required 97567646673  PASS
```

PR `#292` merged to durable main as:

`ff3d2233b8acac795aa1d62d219c4ef6538427f2`

Durable main was reobserved at that exact merge after publication of the infrastructure change.

## Production preservation

After #292 merged:

```text
release-simcore = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
version = 0.64.7
latest.js blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
install.js blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
latest == install = PASS
```

Therefore:

```text
runtime mutation = NONE
release-simcore mutation = NONE
current product gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

## Authority boundary after activation

The delegated approval adapter is active, but it is not a publisher. The actual publication chain remains:

```text
exact approval merge
→ approval adapter revalidation
→ existing SimCore Permanent Release caller
→ Candidate Required
→ single permanent publisher
→ LIVE_PENDING state convergence
```

The policy does not authorize unattended/background releases. A concrete release work item must first be explicitly requested by the user in the active work session.

## Completion boundary

This infrastructure/policy work item is complete once this closure document and machine status are merged through permanent CI.

The next genuine runtime release must provide the remaining operational proof:

```text
PR1 product + intent
→ generic candidate + receipt
→ PR2 delegated exact approval package
→ permanent publication
→ LIVE_PENDING convergence
→ handoff to user
→ `+` / real long-chat
→ human evidence
→ LIVE_PASS closure
```

Until that occurs, use the phrase:

**`ACTIVE · AWAITING GENUINE RELEASE PROOF`**

and do not claim R2.1 delegated operation is already end-to-end production-proven.

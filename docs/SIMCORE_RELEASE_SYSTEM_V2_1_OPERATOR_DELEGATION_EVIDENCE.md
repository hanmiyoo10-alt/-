# SimCore Release System v2.1 — Delegated Operator Activation Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · FIRST PERMANENT CI PASS · PENDING FINAL MERGE/CLOSURE · NON-RUNTIME**

## Decision

The user selected the following steady-state operator experience:

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

The approval object does not contain C/P/blob. The spec is copied from the already validated machine-derived shadow via the exact approval resolver. Packaging has no publication primitive.

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

`release-approval` batch-a now additionally proves:

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

## First permanent CI

PR: `#292`

```text
run      32769662790
Verify   97566934048  PASS
Required 97567062169  PASS
```

This proves the proposed delegated operator adapter, package helper, classifier change, and permanent release-approval regression together against the current SimCore verifier.

## Remaining closure

Before this work is COMPLETE:

1. record this CI evidence in machine status;
2. run permanent CI again on the evidence/status head;
3. merge PR #292;
4. reobserve durable main and frozen v0.64.7 production;
5. land a docs/admin closure recording the merge and setting delegated operator policy active-but-awaiting-genuine-release-proof.

The next genuine runtime release is still required to prove the complete two-PR-to-LIVE_PENDING operational path in production.

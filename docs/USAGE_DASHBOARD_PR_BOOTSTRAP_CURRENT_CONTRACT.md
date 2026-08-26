# Local Usage Dashboard — Current Release PR Bootstrap Contract

Status: **CANONICAL CURRENT CONTRACT — E13-era**

Idea: `NV-RELEASE-PR-BOOTSTRAP`  
Historical issue: #254  
Design re-baseline: `docs/USAGE_DASHBOARD_NV_RELEASE_PR_BOOTSTRAP_DESIGN.md`  
Real-release proof: 5.80 durable request #395 + PR #397

## Resolution

The original E6-era #254 problems are resolved by later architecture:

- E7 removed Actions-token PR creation/dispatch from the normal candidate stage path and moved deterministic PR ensure/reuse to the authorized connected GitHub control surface.
- authoritative validation no longer depends on close/reopen PR-event choreography;
- E13 removed remaining stage/validation handoff ambiguity with canonical reducer wake behavior;
- the 5.80 real release proved the current boundary on durable request #395 and deterministic PR #397.

This contract intentionally does **not** create a new E14 generation.

## Current handoff

When the durable release reducer reaches candidate-ready state without a recorded PR number, it emits a PR-required handoff. The external authorized assistant/control surface then ensures exactly one deterministic release PR and records/reuses that PR on the same durable request.

The reducer subsequently re-reads and verifies the PR/candidate identity before authoritative exact-SHA validation proceeds.

## Deterministic PR identity

For one durable Local Usage Dashboard release request, the release PR must satisfy all of the following:

1. **Base:** `main`.
2. **Head:** `stage/usage-dashboard-<product-version>`.
3. **Same repository:** the head branch belongs to `hanmiyoo10-alt/-`.
4. **Exact head SHA:** PR head SHA equals the current deterministic candidate SHA.
5. **Durable request marker:** PR body contains `Usage-Dashboard-Release-Request: #<request-number>`.
6. **One PR per durable request:** repair/restage reuses the same deterministic branch and same PR rather than opening parallel PRs.
7. **Current candidate only:** stale head or ambiguous identity fails closed.

## 5.80 operational proof

Durable request #395 recorded:

- `UD_E9_CANDIDATE_READY` with `stage/usage-dashboard-3.0.0-alpha.5.80`;
- `UD_E9_PR_REQUIRED` with the instruction that the assistant ensure exactly one deterministic PR;
- validation dispatch after PR #397 was recorded;
- a RED exact-SHA validation was repaired on the same durable request/PR rather than bypassed;
- the repaired candidate proceeded through authoritative validation, expected-head merge and trusted exact-byte production promotion under the later E13 wake contract.

PR #397 used:

- base `main`;
- head `stage/usage-dashboard-3.0.0-alpha.5.80`;
- durable request marker `Usage-Dashboard-Release-Request: #395`;
- candidate SHA recorded in the PR body;
- no user GitHub UI/settings step.

The temporary RED validation in the 5.80 transaction is positive safety evidence: the bootstrap contract did not weaken exact-SHA validation and the same durable transaction supported repair/revalidation.

## Ordinary PR CI vs authoritative validation

Ordinary `pull_request` workflow results are defense in depth. They are not the release authority.

Authoritative release validation must remain bound to the exact candidate SHA and durable request identity. A PR event must not become a substitute for:

- candidate SHA equality;
- full authoritative registry validation;
- current merge-guard receipt;
- expected-head squash merge;
- monotonic exact-byte production promotion.

## Repair / restage semantics

If source repair creates a new deterministic candidate head for the same release request:

- keep the same durable request;
- fast-forward/update the same deterministic stage branch according to current stage authority;
- reuse the same release PR;
- re-record/reconcile the current exact candidate SHA;
- require fresh exact-SHA validation;
- never treat validation of an older candidate as authority for the repaired head.

## Assistant-owned boundary

The connected authorized assistant/control surface owns only the bounded GitHub operations that cannot safely be delegated to candidate/untrusted code, including:

- deterministic PR ensure/reuse;
- recording the PR number on the durable request;
- expected-head squash merge after authoritative receipts are current.

Candidate code never receives repository-write credentials merely to create its own PR.

## Trusted promotion boundary

After merge, production promotion remains the trusted monotonic exact-byte path. This contract does not authorize:

- rebuilding release artifacts during promotion;
- force-writing production refs outside the trusted contract;
- version rollback;
- byte drift between validated candidate and promoted artifacts.

## Explicitly retired choreography

The following are **not** part of the current normal contract:

- Actions-token initial PR creation from the stage/candidate job;
- Actions dispatch used merely to compensate for PR bootstrap;
- closing/reopening a PR to manufacture a trusted validation event;
- making ordinary PR-event CI the release authority;
- requiring the user to click GitHub settings/UI controls.

## Fail-closed conditions

Do not validate/merge when any of these are ambiguous or stale:

- more than one plausible release PR for the same request/head;
- PR base not `main`;
- PR head branch not the deterministic stage branch;
- PR head SHA != current candidate SHA;
- missing/wrong durable request marker;
- head repository mismatch;
- stale validation or merge-guard receipt;
- expected-head mismatch at merge time.

## Product impact

This document is repository-only authority documentation. It changes no Plugin, Engine, Manager, contract, workflow or product behavior by itself and consumes no product version.

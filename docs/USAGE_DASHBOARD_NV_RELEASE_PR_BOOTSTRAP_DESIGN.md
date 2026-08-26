# Local Usage Dashboard — NV-RELEASE-PR-BOOTSTRAP Design

Status: **DESIGN READY — repository-only resolution/contract documentation, implementation not started**

Idea ID: `NV-RELEASE-PR-BOOTSTRAP`

Classification:
- version update: none
- importance: 높음
- difficulty: 중간
- historical authority: Issue #254

## Fresh baseline

Production authority rechecked before this design:

- Product `3.0.0-alpha.5.80`
- Engine `1.6.22`
- Manager `1.3.0`
- contracts `1 / 1`
- release branch `release-usage-dashboard`

The current release-control generation is E13-compatible and the 5.80 real release emitted `E13_REAL_RELEASE_PROOF` with exact candidate/validated SHA parity and exact-byte production parity.

## Why the original idea must be re-baselined

Issue #254 was opened from the 5.73 E6 operational proof and named two control-plane frictions:

1. an Actions-token PR-management job received HTTP 403 when attempting initial release-PR creation;
2. bot/controller-authored candidate advances could leave ordinary PR workflows `action_required`, forcing close/reopen event choreography.

Those exact problems are no longer the current architecture.

E7 moved deterministic PR create/reuse out of the Actions candidate/stage authority and into the authorized connected GitHub control surface. Exact-SHA validation became reducer-controlled rather than dependent on ordinary PR-event trust choreography.

E13 then removed remaining handoff ambiguity by adding the canonical authority-free reducer wake after stage and validation and by deleting the disproven validation `workflow_run` normal edge. The 5.80 real release proved this current chain end to end.

Therefore this idea must **not** reintroduce Actions-token PR creation or PR-event validation authority merely to satisfy an outdated description.

## Current actual boundary

The current durable reducer intentionally stops at `UD_E9_PR_REQUIRED` when the deterministic candidate exists but the durable request has no `pr_number`.

The remaining external-control-surface responsibility is:

1. ensure exactly one deterministic release PR;
2. base must be `main`;
3. head must be `stage/usage-dashboard-<product-version>`;
4. head SHA must equal the exact current candidate SHA;
5. head repository must be the same repository;
6. PR body must contain `Usage-Dashboard-Release-Request: #<request-number>`;
7. record/reuse the PR number on the same durable release request;
8. let the reducer re-read and verify all PR/candidate identity before authoritative validation.

Repair releases keep the same deterministic candidate branch and same PR. Candidate fast-forward changes do not authorize a second parallel PR.

## Design decision

`NV-RELEASE-PR-BOOTSTRAP` is a **resolution + canonical handoff-contract task**, not a new release-control generation.

No E14 is justified by current evidence.

### Implementation artifact

Create or promote a canonical current-boundary document:

`docs/USAGE_DASHBOARD_PR_BOOTSTRAP_CURRENT_CONTRACT.md`

The document will be the assistant/operator reference for deterministic PR ensure/reuse.

### Required contract contents

The implementation document must record:

- exact PR base/head rules;
- exact candidate-SHA equality rule;
- same-repository rule;
- durable request marker rule;
- one-PR-per-durable-release rule;
- repair/restage reuse semantics;
- distinction between ordinary PR CI and authoritative exact-SHA validation;
- assistant expected-head squash merge ownership;
- trusted monotonic exact-byte production promotion ownership;
- no-user-GitHub-UI requirement;
- fail-closed behavior when PR identity is ambiguous or stale.

## #254 resolution rule

Implementation should close #254 as **completed by later architecture**, citing at least:

- E7 structural implementation evidence already recorded on #254;
- E13 stage/validation wake contract;
- 5.80 `E13_REAL_RELEASE_PROOF`;
- the successful 5.80 deterministic PR #397 and authoritative validation/promotion chain.

The closure reason is not “won't fix.” It is **resolved by E7/E13 and proven on a real 5.80 release**.

## Idea-list update

After implementation evidence is recorded, update `docs/USAGE_DASHBOARD_IDEA_LIST.md`:

- `NV-RELEASE-PR-BOOTSTRAP` -> `IMPLEMENTED / RESOLVED_BY_E7_E13`;
- link Issue #254 and the current bootstrap contract document;
- keep classification no-version / medium / high.

## Explicit non-goals

Do not:

- add Actions `pull-requests: write` solely to recreate automatic PR creation;
- create PRs from candidate/untrusted code;
- make ordinary `pull_request` events release authority;
- restore close/reopen trust choreography;
- create a new E14 generation without a newly observed unresolved release-control problem;
- add a new reducer, queue, state machine, polling loop, token class, or secret;
- auto-merge main;
- change candidate materialization, exact-SHA validation, merge guard, monotonic promotion, or exact-byte parity rules;
- modify Plugin/Engine/Manager/bootstrap/product artifacts;
- consume a product version.

## Acceptance

Implementation is complete when:

1. `docs/USAGE_DASHBOARD_PR_BOOTSTRAP_CURRENT_CONTRACT.md` exists on main;
2. it accurately describes the current E13-era deterministic PR handoff and repair/reuse semantics;
3. Issue #254 is closed completed with E7 + E13 + 5.80 real-release evidence;
4. the idea-list row is marked `IMPLEMENTED / RESOLVED_BY_E7_E13`;
5. no workflow/runtime/release-control behavior is changed merely for closure;
6. main and `release-usage-dashboard` shipped Plugin/Engine/Manager artifacts remain byte-identical to the pre-task product baseline;
7. Product/Engine/Manager/contracts remain `3.0.0-alpha.5.80 / 1.6.22 / 1.3.0 / 1/1`;
8. no PocketRisu physical action is required.

## Batch note

This is the fourth DESIGN READY item in the no-version / medium / high batch.

Already designed:
- `NV-FUNDING-AUTH`
- `NV-FALLBACK-INVENTORY`
- `NV-PARSER-INVENTORY`
- `NV-RELEASE-PR-BOOTSTRAP`

Remaining same-group design before implementation batch:
- `NV-STATE-LIFECYCLE`

## Tool-operation note

During this design turn, several accidental `tmp/*` sentinel files were created while selecting GitHub write actions and were immediately deleted. They never touched `plugins/usage-dashboard/**` or `release-usage-dashboard`. The net main tree from those sentinel pairs is unchanged; the only intentional persistent write from this turn is this design document. Product artifact parity must still be rechecked before any later implementation.

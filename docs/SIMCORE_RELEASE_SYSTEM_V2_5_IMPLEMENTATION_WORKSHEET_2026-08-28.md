# SimCore Release System v2.5 — Implementation Worksheet

Date: 2026-08-28 KST
Status: **IMPLEMENTATION AUTHORIZED · NON_RUNTIME · WORK BRANCH ONLY**
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_5_APPROVAL_BOUNDARY_CONVERGENCE_DESIGN.md`
Primary trigger: `docs/SIMCORE_RELEASE_SYSTEM_V2_1_V06500_OPERATIONAL_RETROSPECTIVE_2026-08-28.md`

## Requested behavior

Implement R2.5 Approval Boundary Convergence while preserving R2.4/R2.1/RS2-4 authority and operating costs.

## Primary owner(s)

- `products/simcore/tooling/release-approval-envelope.mjs` — new shared exact-approval semantic validator owner
- `products/simcore/tooling/release-approval-package.mjs` — canonical package materialization and operator summary
- existing SimCore permanent PR Verify classification/check path — PR2 premerge qualification
- `.github/workflows/simcore-release-pr-activation.yml` — postmerge orchestration + merge-only checks, shared validator consumer

## Immediate dependency owner(s)

- `products/simcore/tooling/release-approval-resolve.mjs`
- `products/simcore/tests/suites/release-approval.test.mjs`
- `products/simcore/tooling/ci/classify.mjs`
- `products/simcore/tooling/check.mjs`
- release test registry / fixtures required for permanent regression

## Cross-cutting invariants

- `release-simcore` remains sole runtime/deployment authority.
- `main` remains design/evidence/admin authority.
- RS2-4 Permanent Release remains sole publisher.
- Generic Candidate remains durable candidate authority.
- Exact Approval remains bounded authorization object.
- Candidate Required and postmerge activation remain mandatory.
- append-only recovery remains mandatory after committed failed authorization transactions.
- `latest.js == install.js` remains mandatory for actual product releases.
- human real-long-chat LIVE_PASS authority remains unchanged.
- clean-path cost remains 2 PRs to LIVE_PENDING, 3 through terminal closure, 0 user manual pre-live GitHub operations.

## Target implementation region(s)

- add one pure/non-publishing shared approval-envelope validator.
- remove manual `--approval-out` / `--spec-out` authority from normal package CLI; derive canonical paths.
- emit canonical title and normalized transaction summary from machine-known release identity.
- add PR2 activation-equivalent premerge qualification to the existing Verify/Required model, not a new required job.
- reduce activation YAML to merge-only/history/reobservation/orchestration plus invocation of the same shared validator.
- remove PR title from release authorization semantics while retaining optional presentation guidance.

## Target tests / diagnostics / evidence

Permanent replay must cover:

- wrong authorized spec path fails premerge;
- noncanonical PR title does not fail authorization;
- valid v0.65.0 new-05 transaction shape passes package + PREMERGE + POSTMERGE semantic validation;
- production parent change after PREMERGE causes POSTMERGE failure;
- third-file approval PR fails;
- existing approval/spec output refuses overwrite;
- new package/validator contain no publication primitives;
- existing release-approval, R2.4 preflight-compression, architecture, closure/stability and applicable permanent suites remain green.

## Initial excluded modules

- SimCore plugin/runtime code including `plugins/simcore/latest.js` and `plugins/simcore/install.js`
- `release-simcore`
- runtime module ownership
- Permanent Release publication semantics / Candidate Required implementation except interface compatibility
- R2.4-C terminal debt seal
- release-run discovery polling
- issue automation / HUMAN_EVIDENCE automation

## Escalation triggers

Expand read scope only if:

- existing PR classification cannot distinguish exact-approval PRs safely;
- shared validator integration exposes a resolver contract mismatch;
- permanent CI fails outside the expected approval/check/activation surfaces;
- existing release suite proves another duplicated semantic owner must be converged;
- repository history checks require an additional bounded activation helper.

Any scope expansion must be recorded before implementation scope expands.

## Validation rule

```text
READ SCOPE       = ownership bounded
IMPLEMENT SCOPE  = R2.5 approval-boundary stabilization only
VALIDATION SCOPE = full applicable permanent SimCore / release-system guards
```

`release-simcore` mutation from this work item: **FORBIDDEN**.

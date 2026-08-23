# Local Usage Dashboard — Release Pipeline v2 Stage D

Status: DESIGN — Generic Single Release Controller

Canonical repository: `hanmiyoo10-alt/-`

Canonical product path: `plugins/usage-dashboard/`

Production release branch: `release-usage-dashboard`

Baseline: Product `3.0.0-alpha.5.69`, Bridge Engine `1.6.20`, Bridge Manager `1.3.0`, snapshot/recent-request contracts `1/1`.

This document extends `docs/USAGE_DASHBOARD_RELEASE_PIPELINE_V2.md` after Stages A, B and C.

## 1. Goal

Remove version-specific active release workflows and make every future Local Usage Dashboard release use the same generic controller contract.

After Stage D, creating a new release must not require adding a new workflow such as:

- `.github/workflows/release-command-usage-dashboard-569.yml`
- `.github/workflows/release-usage-dashboard-569-*.yml`

Release-specific information belongs in release specs and candidate artifacts, not in workflow filenames or duplicated workflow logic.

Primary rule remains:

> Build once → test once → merge once → promote exact bytes.

Stage D adds:

> One release contract → every version.

## 2. Preserve A/B/C authority boundaries

Stage D must not weaken the earlier v2 stages.

Required invariants:

1. PR validation remains read-only.
2. PR merge remains the only normal Usage Dashboard write to `main`.
3. Promotion never rebuilds or rematerializes.
4. Production is promoted from exact Git blobs of one immutable merged main commit.
5. Release writes remain limited to the explicit deployable-artifact allowlist.
6. Release updates are monotonic, fast-forward only, and fail closed on same-version divergence.
7. PocketRisu `+` remains the user-facing update path.

Do not combine validation and release write authority merely to reduce workflow file count.

## 3. Controller shape

“Single controller” means one generic release decision model, not one over-privileged workflow token.

Use two thin event entrypoints with separate least-privilege authority:

### Generic validation entrypoint

Suggested path:

`.github/workflows/usage-dashboard-validate.yml`

Trigger:

- pull requests targeting `main` that touch Local Usage Dashboard candidate/source/release-spec infrastructure.

Permissions:

```yaml
permissions:
  contents: read
```

Responsibility:

- resolve the candidate release spec;
- call the reusable read-only validation contract from Stage A;
- never mutate refs, branches, PR contents, main or release.

### Generic promotion entrypoint

Suggested path:

`.github/workflows/usage-dashboard-promote.yml`

Trigger:

- a merge/push to `main` that changes deployable Usage Dashboard artifacts or the production manifest.

Permissions:

- only the minimum repository write authority needed to fast-forward `release-usage-dashboard`.

Responsibility:

- freeze `MAIN_SHA` to the triggering merged main commit;
- resolve exactly one release spec matching that immutable candidate;
- run only post-merge release-contract checks;
- invoke the Stage C exact-byte promoter;
- verify published blob identity before reporting success.

The validation and promotion entrypoints may share pure resolver/contract code, but must not share write authority.

## 4. Generic release-spec resolution

Do not hard-code a current version or current release-spec path into the generic workflows.

The controller derives the candidate tuple from `plugins/usage-dashboard/runtime/product-manifest.json` at the immutable candidate commit.

Candidate tuple:

- `productVersion`
- Bridge Engine required version
- Bridge Manager version
- snapshot contract
- recent-request contract

Then scan `.github/usage-dashboard/releases/*.json` at the same candidate commit and require exactly one spec whose declared tuple matches the candidate tuple.

Required outcomes:

- zero matching specs: fail `RELEASE_SPEC_NOT_FOUND`;
- more than one matching spec: fail `RELEASE_SPEC_AMBIGUOUS`;
- one matching version but mismatched component/contracts tuple: fail `RELEASE_SPEC_MANIFEST_MISMATCH`;
- exactly one full tuple match: continue.

Historical specs remain immutable data and are not active workflow definitions.

## 5. No stable current-version pointer unless evidence requires it

Do not introduce a manually maintained `current-release-spec` pointer in Stage D by default.

A separate pointer creates another state that can drift from the production manifest.

Prefer deriving the active spec from the immutable candidate manifest + unique matching release spec.

Only add a pointer later if repository evidence shows tuple discovery is inadequate, and protect it with explicit drift regressions.

## 6. Generic validation trigger

The generic PR validator should cover the candidate inputs that can affect a release, including conceptually:

- `plugins/usage-dashboard/src/**`
- `plugins/usage-dashboard/runtime-src/**`
- `plugins/usage-dashboard/runtime/**`
- `plugins/usage-dashboard/latest.js`
- `plugins/usage-dashboard/tools/**` relevant to materialization/release validation
- `plugins/usage-dashboard/tests/**`
- `.github/usage-dashboard/releases/**`
- generic Usage Dashboard release workflow/controller files
- durable Usage Dashboard release-engineering docs when their tests require validation

Avoid version-number-specific path filters.

The validator resolves the spec from the PR candidate itself.

## 7. Generic promotion trigger

Promotion should trigger only when a merged main commit could represent a deployable candidate.

Prefer stable path filters around deployable state, such as:

- `plugins/usage-dashboard/latest.js`
- `plugins/usage-dashboard/runtime/**`
- `plugins/usage-dashboard/runtime/product-manifest.json`

A maintenance change that does not alter deployable artifacts should not create a production release commit.

Even when triggered, the controller must be safe to return `NOOP_IDENTICAL`.

Do not depend on an Actions-authored push triggering another workflow.

The triggering main merge/push is the release event source; release-branch writes do not initiate another required stage.

## 8. Post-merge promotion is not a second full CI

The generic promoter must not rerun materializers or the full P1–Pn regression suite after merge.

Those checks belong to the validated PR HEAD from Stage A/B.

Post-merge checks are bounded to release safety:

- resolve exact matching release spec;
- verify candidate manifest tuple;
- verify declared runtime SHA256 values;
- collect exact allowlisted Git blob SHAs from frozen `MAIN_SHA`;
- run monotonic release guard;
- build the Stage C release-tree promotion plan;
- verify release base has not moved before ref update;
- fast-forward production;
- verify final release blob identity and changed-path allowlist.

## 9. Release specs become the only version-specific release metadata

A new release may add a new file under:

`.github/usage-dashboard/releases/<release>.json`

That spec contains version-specific release metadata and the materializer identity required by candidate validation.

A new release must not require:

- a new active stage workflow;
- a new release-command workflow;
- a workflow containing the new product version literal;
- a retry-marker workflow edit solely to trigger deployment.

Future release workflow:

`source/design change`
→ materialize final candidate on development branch
→ add/update release spec
→ generic read-only validation
→ merge
→ generic exact-byte promotion
→ production verification.

## 10. Retirement of version-specific workflows

After the generic paths are proven, retire active files matching the old release-specific model, including current equivalents of:

- `.github/workflows/release-command-usage-dashboard-*.yml`
- `.github/workflows/release-usage-dashboard-<version>-*.yml`

Do not lose historical release provenance.

Record retired workflow identities in `.github/usage-dashboard/archived-release-workflows.json` or the repository’s established archive mechanism.

Release specs remain retained as historical release contracts.

## 11. Static regressions

Add/adjust release-infrastructure tests so Stage D fails if the old architecture regrows.

Required assertions:

- no active `release-command-usage-dashboard-*.yml` workflow exists after retirement;
- no active version-specific Usage Dashboard stage workflow is required for the current release;
- generic workflow/controller source contains no current product-version literal;
- generic resolver searches release specs and requires exactly one tuple match;
- PR validation path remains `contents: read` and contains no write primitives;
- promotion path contains no materializer/build-write/full-regression execution;
- promotion continues to use the Stage C explicit artifact allowlist;
- no force update of `release-usage-dashboard` is allowed;
- same-version artifact divergence still fails closed;
- archived release workflow provenance remains present.

## 12. Resolver regressions

Create fixtures/tests for at least:

1. one exact spec match → resolve successfully;
2. zero matches → `RELEASE_SPEC_NOT_FOUND`;
3. duplicate full-tuple matches → `RELEASE_SPEC_AMBIGUOUS`;
4. same product version but component/contracts mismatch → fail closed;
5. historical older specs present → do not confuse the active candidate;
6. candidate version newer than release → promotion plan eligible;
7. candidate identical to release → `NOOP_IDENTICAL`;
8. candidate older than release → stale/no publish;
9. same-version divergent artifacts → fail closed.

## 13. Rollout sequence

Do not delete old workflows first.

### D1 — Generic resolver in shadow mode

Implement the generic spec resolver and controller contract with no production writes.

Against the current 5.69 baseline, prove:

- exactly one 5.69 spec resolves from the candidate manifest tuple;
- the production promotion plan resolves to `NOOP_IDENTICAL` against current 5.69 release;
- no current version literal is needed in controller code.

### D2 — Generic read-only validator alongside legacy stage

Enable the generic PR validator while keeping the current version-specific stage temporarily.

Run both against one maintenance candidate and require equivalent successful release-quality validation.

### D3 — Generic promoter shadow plan

On a main candidate event, run the generic promotion path in plan-only mode.

Require that its candidate spec, allowlisted blob SHAs, monotonic result and expected release tree are identical to Stage C expectations.

Do not write release in this substage.

### D4 — Retire version-specific stage/command workflows

Once D1–D3 are proven:

- activate the generic validator as the only active release PR entrypoint;
- activate the generic promoter as the only active production promotion entrypoint;
- archive/remove active version-specific Usage Dashboard release workflows;
- update infrastructure regressions to prevent their return.

### D5 — First live generic release

The next actual product release becomes the first live proof of the generic controller.

The release PR should add no new workflow file.

Success is:

- generic read-only CI GREEN;
- merge is main materialization;
- generic promoter selects the matching spec automatically;
- exact merged-main blobs are promoted monotonically;
- post-publish main/release blob identity passes;
- user still only uses PocketRisu `+` for device update.

## 14. Rollback

During D1–D3, existing active version-specific paths remain available as fallback.

Do not allow both legacy and generic promoters to write production for the same candidate.

Before D4, generic promotion remains plan-only or otherwise mutually exclusive with legacy production write authority.

After D4, rollback means reverting the Stage D maintenance change to the last known-good A/B/C publisher architecture; it must not mean restoring workflow chaining or Actions-authored main materialization.

## 15. Non-goals

Stage D does not change:

- Product version solely for infrastructure migration;
- Bridge Engine behavior/version solely for infrastructure migration;
- Bridge Manager behavior/version solely for infrastructure migration;
- runtime source semantics;
- updater protocol;
- diagnostics;
- cache/scheduler/CLI behavior;
- snapshot/recent-request contracts;
- release artifact allowlist established by Stage C;
- unrelated repository products.

## 16. Completion criteria

Stage D is complete only when all are true:

1. Future releases require no version-specific workflow file.
2. Generic spec resolution is deterministic and fail-closed.
3. PR validation remains read-only and generic.
4. PR merge remains main materialization.
5. Release promotion remains exact-byte and generic.
6. No full rebuild/regression occurs in promotion.
7. No required workflow chaining depends on Actions-authored pushes.
8. Historical release specs/provenance remain retained.
9. Static regressions prevent version-specific active workflow proliferation from returning.
10. The first live generic release succeeds without adding/editing a version-specific workflow.

## 17. Final Stage D architecture

`development branch`
→ materialize source + final artifacts + release spec
→ `usage-dashboard-validate.yml` (read-only, generic)
→ squash merge = `main`
→ `usage-dashboard-promote.yml` freezes merged `MAIN_SHA`
→ generic resolver selects exactly one matching release spec
→ Stage C exact-byte tree promotion
→ monotonic fast-forward of `release-usage-dashboard`
→ post-publish exact blob verification
→ real-device `+` validation.

No version-numbered release workflow participates in the active path.

Combined v2 principle:

> Build once → test once → merge once → promote exact bytes → reuse the same controller for every version.

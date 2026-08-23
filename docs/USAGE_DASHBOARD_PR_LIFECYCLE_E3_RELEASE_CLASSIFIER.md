# Local Usage Dashboard — PR Lifecycle Simplification E3: Release / Maintenance Classification

Status: DESIGN — recorded before implementation

Baseline at design time:

- Product: `3.0.0-alpha.5.70`
- Bridge Engine: `1.6.21`
- Bridge Manager: `1.3.0`
- Snapshot contract: `1`
- Recent-request contract: `1`
- Production release branch: `release-usage-dashboard`

This is a maintenance-only design. It must not change production runtime behavior, product version, Engine version, Manager version, contract versions, or release artifacts.

## 1. Problem

The current merged-PR promotion entrypoint is triggered by a broad Usage Dashboard path set and starts with repository write permission. This means a merged maintenance PR can wake the production promotion path even when none of the production artifacts changed.

The exact-byte promoter already has a strict production artifact allowlist. E3 uses that artifact identity as the classification authority so production write permission is acquired only when a merged PR actually changes production bytes.

## 2. Goal

> Production bytes changed → release candidate. Production bytes unchanged → maintenance only.

Classification must be derived from immutable Git object identity, not PR title, labels, branch names, commit messages, or version-like strings.

Target merged-PR flow:

```text
MERGED PR
   |
   v
READ-ONLY CLASSIFIER
   |
   +-- production allowlist blob changed
   |       |
   |       v
   |   RELEASE_CANDIDATE
   |       |
   |       v
   |   write-scoped exact-byte promotion
   |
   +-- production allowlist unchanged
           |
           v
       MAINTENANCE_ONLY
           |
           +-- release control plane changed → read-only smoke
           |
           +-- otherwise → done, no production writer
```

## 3. Immutable comparison boundary

The classifier compares:

```text
merged commit SHA
vs
that merged commit's first parent SHA
```

It must not compare the merged commit against the moving `main` ref.

Reason: this repository contains other products, and `main` may move after the Usage Dashboard PR merges. The merged commit and its first parent form an immutable pair describing the exact delta introduced by that PR.

If the parent cannot be resolved, classification fails closed.

## 4. Production artifact authority

E3 must reuse the production allowlist exported by:

`plugins/usage-dashboard/tools/promote_release_blobs.cjs`

Current authority at design time:

- `plugins/usage-dashboard/latest.js`
- `plugins/usage-dashboard/runtime/bridge-engine.mjs`
- `plugins/usage-dashboard/runtime/bridge-manager.cjs`
- `plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh`
- `plugins/usage-dashboard/runtime/product-manifest.json`

The classifier must not duplicate this list in a second independently maintained constant.

One allowlist must serve:

- classification,
- exact-byte promotion,
- regression coverage.

## 5. Classification rule

For every allowlisted production artifact, read the Git blob SHA at:

- merged candidate SHA,
- first-parent SHA.

If all five blob SHAs are identical:

```text
MAINTENANCE_ONLY
```

If one or more blob SHAs differ:

```text
RELEASE_CANDIDATE
```

Examples:

- tests only → `MAINTENANCE_ONLY`
- docs only → `MAINTENANCE_ONLY`
- validator-only change → `MAINTENANCE_ONLY`
- promoter verifier-only change → `MAINTENANCE_ONLY`
- source-only change without generated production artifact change → `MAINTENANCE_ONLY` at this stage; candidate completeness remains E2/PR-validator responsibility
- `latest.js` changed → `RELEASE_CANDIDATE`
- manifest changed → `RELEASE_CANDIDATE`
- Engine changed → `RELEASE_CANDIDATE`

Classification says whether production bytes changed. It does not replace materialization, version, hash, monotonic, or release-spec validation.

## 6. Fail closed

Unknown classifier states must never silently become maintenance.

Required separately diagnosable failures include at minimum:

```text
CLASSIFIER_PARENT_MISSING
CLASSIFIER_ARTIFACT_MISSING
CLASSIFIER_INVALID_TREE
```

Equivalent stable diagnostics are acceptable if implementation evidence justifies a naming refinement.

Forbidden fallback:

```text
cannot classify → MAINTENANCE_ONLY
```

If production identity cannot be established exactly, the workflow fails.

## 7. Permission separation

The top-level merged-PR control path should default to:

```yaml
permissions:
  contents: read
```

The classifier job remains read-only.

The maintenance path remains read-only and never invokes a production writer.

Only the release promotion job receives:

```yaml
permissions:
  contents: write
```

and only when classification is `RELEASE_CANDIDATE`.

The implementation should prefer job-level write permission rather than granting write permission to the whole workflow.

## 8. Maintenance-only behavior

For a normal maintenance merge with unchanged production blobs:

```text
MAINTENANCE_ONLY:NO_PRODUCTION_ARTIFACT_CHANGE
```

or an equivalent stable result should be emitted.

No release ref read-modify-write cycle is needed beyond any read-only evidence required by control-plane smoke checks.

The following must not occur on the normal maintenance path:

- release commit creation,
- release tree creation,
- release ref PATCH,
- force push,
- exact-byte publisher invocation with write authority.

## 9. Release-control maintenance smoke

Some maintenance PRs change the release control plane itself while leaving production artifacts unchanged. Examples include:

- `.github/workflows/usage-dashboard-promote.yml`
- `.github/workflows/reusable-usage-dashboard-promote.yml`
- `plugins/usage-dashboard/tools/promote_release_blobs.cjs`
- `plugins/usage-dashboard/tools/resolve_release_spec.cjs`
- classifier implementation or classifier regression contracts

For such a merge, E3 should set a second signal such as:

```text
releaseControlChanged=true
```

and run a read-only promotion smoke check.

The smoke check may prove that current main production artifacts and release production artifacts are exactly identical and that the current release decision would be a no-op, producing a result such as:

```text
WOULD_NOOP_IDENTICAL:3.0.0-alpha.5.70
```

The smoke check must not:

- create Git trees,
- create Git commits,
- update release refs,
- require `contents: write`.

This preserves release-control confidence without waking the production writer.

## 10. Release-candidate behavior

When classification is `RELEASE_CANDIDATE`, the existing exact-byte promotion authority remains responsible for:

- candidate manifest validation,
- release-spec resolution,
- SHA256 validation,
- monotonic version decision,
- same-version artifact divergence failure,
- explicit production allowlist,
- Git-tree exact-byte promotion,
- `force:false`,
- release-ref race protection,
- post-publish Git blob identity verification,
- `runtime-src` absence,
- unexpected release path rejection.

E3 does not weaken or replace P32/P33 release safety.

## 11. Relationship to E1 and E2

E1 removes test-list knowledge from GitHub Actions.

E2 establishes that a release PR is opened only after an exact-SHA candidate-ready preflight.

E3 operates only after merge and answers one question:

> Does this merged PR require a production write?

These responsibilities must remain separate.

## 12. Regression strategy

E3 should add an infrastructure-level regression such as:

`release-candidate-classifier-contract.cjs`

It should not consume the next product P-number.

Coverage must include at minimum:

- 0 production blob changes → maintenance,
- 1 production blob change → release candidate,
- all production blobs changed → release candidate,
- docs/tests/source-only changes → maintenance,
- missing artifact → fail closed,
- missing first parent → fail closed,
- classifier imports the promoter's `ALLOWLIST` rather than duplicating it,
- classification is stable even if the live `main` ref moves,
- maintenance path has no write-scoped production job,
- release promotion job alone receives write permission,
- release-control-only maintenance triggers read-only smoke,
- normal maintenance does not invoke exact-byte production promotion.

Existing P32 and P33 should be updated only where their workflow-shape assertions conflict with the new permission/classification contract. Product behavior assertions remain untouched.

## 13. Acceptance criteria

E3 is complete when:

1. A merged docs/tests-only Usage Dashboard PR is classified `MAINTENANCE_ONLY`.
2. That merge does not invoke any write-scoped production promotion job.
3. A release-control-only maintenance merge receives read-only smoke coverage without production ref mutation.
4. A synthetic or real candidate with one changed production artifact is classified `RELEASE_CANDIDATE`.
5. Only the release candidate path can reach the existing exact-byte promoter with write permission.
6. Classification is based on merged SHA vs first parent, never moving `main`.
7. Missing/invalid Git artifact identity fails closed.
8. The production allowlist has one authority shared with the promoter.
9. Product/runtime versions remain unchanged during the E3 maintenance implementation.

## 14. Non-goals

E3 does not:

- implement candidate materialization automation,
- open PRs automatically,
- replace E2 candidate-ready preflight,
- change production artifact composition,
- change product/runtime behavior,
- change release versioning policy,
- redesign branch protection repository-wide,
- affect SimCore or PocketRisu host release logic.

## 15. Handoff to E4

After E1 + E2 + E3, the remaining major PR-lifecycle friction is candidate preparation itself.

E4 should design a safe, product-local candidate preparation mechanism that lets ChatGPT materialize and commit the finished Usage Dashboard candidate before PR creation without introducing a broad repository writer or allowing untrusted candidate code to hold write authority.

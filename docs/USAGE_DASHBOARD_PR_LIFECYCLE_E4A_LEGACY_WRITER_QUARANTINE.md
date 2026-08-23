# Local Usage Dashboard — PR Lifecycle Simplification E4-A: Legacy Release Writer Quarantine

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

Release Pipeline v2 established the generic exact-byte promoter as the intended production release writer for Local Usage Dashboard, but repository inspection after E3 found legacy Usage Dashboard workflows that still retain repository write authority.

The most important example is:

`.github/workflows/release-local-usage-dashboard.yml`

At design time it still:

- triggers automatically on `push` to `main` for current Usage Dashboard paths,
- declares `permissions: contents: write`,
- checks out and switches to `release-usage-dashboard`,
- copies product artifacts through the filesystem,
- commits and directly pushes to the release branch.

This overlaps the authority boundary of the generic exact-byte promoter even though the verified 5.70 production release commit was produced by the new promoter.

Other older version-specific workflows remain in `.github/workflows/` with write permission and/or manual dispatch. Some are dormant because their automatic path trigger only watches their own historical workflow file, but they still represent callable historical writers.

E4-A removes ambiguity before any new candidate-preparation writer is introduced.

## 2. Goal

> Local Usage Dashboard production release write authority converges to one active mechanism: the generic exact-byte promoter.

After E4-A there must be no legacy Usage Dashboard workflow capable of independently publishing, rebuilding, copying, committing, or pushing production artifacts to `release-usage-dashboard`.

Target authority model:

```text
PR validator                 READ
Candidate-ready preflight    READ
Maintenance release smoke    READ
Generic exact-byte promoter  WRITE -> release-usage-dashboard only
Legacy production writer     0
Version-specific writer      0
Main materialization writer  0
```

## 3. Scope

E4-A is a release-control maintenance stage only.

It does not:

- change plugin/runtime product bytes,
- change Product / Engine / Manager versions,
- create the candidate-preparation writer planned for E4-B,
- redesign the generic exact-byte promoter,
- change SimCore release infrastructure,
- change PocketRisu behavior.

## 4. Inventory before mutation

Implementation must derive an inventory from the then-current `main` rather than relying only on filenames listed in this document.

The audit scope is `.github/workflows/` plus any Usage Dashboard scripts directly invoked by those workflows.

A workflow is relevant when its source demonstrates Local Usage Dashboard release authority through signals such as:

- Usage Dashboard paths,
- `release-usage-dashboard`,
- Usage Dashboard release/materializer tools,
- publication of `plugins/usage-dashboard/latest.js` or runtime artifacts.

The audit must not classify SimCore workflows as Usage Dashboard release authority.

## 5. Classification

Each relevant legacy workflow is classified as exactly one of:

### 5.1 ACTIVE_LEGACY_WRITER

A workflow that can automatically react to current repository/product activity and has a path capable of changing `main` or `release-usage-dashboard`.

Examples of qualifying behavior:

- `push: main` over current Usage Dashboard paths,
- `contents: write`,
- direct `git push`,
- ref update to the release branch,
- filesystem copy + commit publication.

These must be retired.

### 5.2 DORMANT_LEGACY_WRITER

A historical workflow that is not normally triggered by current product changes but remains callable or write-capable, for example through `workflow_dispatch` or a self-file trigger.

These must not remain as active write-capable release workflows after E4-A.

Historical provenance may be preserved through Git history and a machine-readable retirement registry.

### 5.3 SAFE_ARCHIVE

A historical workflow may remain only when it is demonstrably non-authoritative:

- manual-only if retained as a workflow,
- `contents: read`,
- no branch/ref mutation,
- no direct push,
- no production publication path,
- no competition with the generic validator/promoter.

Deletion plus registry provenance is preferred when keeping the workflow provides no operational value.

## 6. Primary active writer to retire

At design time `.github/workflows/release-local-usage-dashboard.yml` is an `ACTIVE_LEGACY_WRITER`.

It must not remain an executable production writer after E4-A.

Preferred implementation:

1. delete the active workflow file from `.github/workflows/`,
2. preserve its historical Git identity in a retirement inventory,
3. permanently regress against reintroduction of its authority pattern.

Changing only `contents: write` to `contents: read` is not sufficient if the obsolete release workflow remains misleadingly executable.

## 7. Retirement inventory

E4-A should add or extend a machine-readable Usage Dashboard release-authority inventory under `.github/usage-dashboard/`.

Recommended information per retired authority:

```text
path
classification
retiredAtStage
historicalBlobSha when available
reason
replacementAuthority
```

The inventory is provenance, not execution authority.

It must identify the generic exact-byte promoter as the current production writer.

## 8. Single production writer contract

After E4-A, repository-wide static inspection must establish:

- no legacy Usage Dashboard workflow contains an active direct push to `release-usage-dashboard`,
- no legacy Usage Dashboard workflow performs `git switch`/checkout + filesystem-copy publication to the release branch,
- no version-specific Usage Dashboard workflow has active write publication authority,
- no Usage Dashboard workflow writes `main` as part of normal release materialization,
- the generic exact-byte promoter remains the only production release writer.

The existing generic promoter safety properties remain authoritative:

- immutable candidate SHA,
- exact production allowlist,
- Git blob/tree promotion,
- monotonic release checks,
- `force:false`,
- release-ref race guard,
- post-publish exact-byte verification.

## 9. Static regression

E4-A should add an infrastructure-level contract test such as:

`release-authority-contract.cjs`

It should not consume the next product regression number.

Minimum coverage:

- generic promoter is identified as the only active Usage Dashboard production writer,
- `.github/workflows/release-local-usage-dashboard.yml` is absent or permanently non-authoritative according to the final implementation contract,
- legacy Usage Dashboard workflows cannot contain the combination of write permission and release publication primitives,
- direct `git push ... release-usage-dashboard` from legacy workflows is forbidden,
- legacy `git switch` / filesystem-copy publisher patterns are forbidden,
- version-specific release-command workflows remain retired,
- retirement inventory parses and references only known historical authorities,
- SimCore workflows are explicitly outside the contract scope.

## 10. Fail closed

The audit/test must not silently classify an ambiguous write-capable Usage Dashboard workflow as safe.

If a relevant workflow contains production mutation primitives but cannot be mapped to the current generic authority or a retired historical entry, validation fails with a stable diagnostic such as:

```text
UNCLASSIFIED_USAGE_DASHBOARD_WRITER:<path>
```

Likewise, a newly introduced direct release push should fail with a distinct diagnostic such as:

```text
LEGACY_RELEASE_PUSH_AUTHORITY:<path>
```

Exact strings may be refined during implementation, but ambiguous write authority must remain separately diagnosable and fail closed.

## 11. Anomaly review

Any failing workflow encountered during E4-A implementation remains subject to `USAGE_DASHBOARD_PR_CI_ANOMALY_REVIEW.md`.

A later GREEN run does not erase an earlier RED. Expected path-filter skips are not anomalies.

## 12. Acceptance criteria

E4-A is complete when all of the following hold on `main`:

1. the current production manifest remains `3.0.0-alpha.5.70 / Engine 1.6.21 / Manager 1.3.0 / contracts 1/1`,
2. no production artifact bytes changed,
3. active/dormant legacy Usage Dashboard writers have been inventoried,
4. obsolete production writers have been removed or reduced to non-authoritative archive state,
5. a permanent infrastructure regression prevents their authority from returning,
6. the generic exact-byte promoter is the single production release writer,
7. full Usage Dashboard validation remains GREEN,
8. no PocketRisu real-device validation is required because production bytes are unchanged.

## 13. Relationship to E4-B

E4-A is a prerequisite for E4-B Safe Candidate Preparation.

No new candidate write authority should be introduced while unaccounted legacy production writers remain.

Required order:

```text
E1 Test Registry Authority
 -> E2 Candidate-Ready PR Entry Gate
 -> E3 Release / Maintenance Classification
 -> E4-A Legacy Release Writer Quarantine
 -> E4-B Safe Candidate Preparation
```

E4-B must inherit E4-A's principle that candidate branch write authority is separate from production release write authority.
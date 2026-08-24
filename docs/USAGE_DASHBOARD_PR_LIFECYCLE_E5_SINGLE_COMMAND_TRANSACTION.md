# Local Usage Dashboard — PR Lifecycle Simplification E5: Single-Command Candidate Transaction

Status: **PROPOSED DESIGN — implementation not started**

Recorded: `2026-08-24`

Current production baseline:

- Product `3.0.0-alpha.5.71`
- Bridge Engine `1.6.22`
- Bridge Manager `1.3.0`
- snapshot/recent-request contracts `1/1`
- production branch `release-usage-dashboard`

This is release-infrastructure maintenance design only. It must not change Local Usage Dashboard runtime behavior, product/runtime versions, contracts, or production release bytes by itself.

## 1. Problem proven by the 5.71 release

The E4-B/E2/E4-C security model worked, but the normal assistant-side path still has too many coordination steps:

```text
create candidate source branch
 -> discover exact source SHA
 -> /usage-dashboard prepare <branch> <sha> <spec>
 -> wait for materialized branch SHA
 -> rediscover materialized SHA
 -> /usage-dashboard ready-branch <branch>
 -> wait for E2
 -> open PR
 -> full PR CI
 -> merge
 -> E3 classify
 -> exact-byte promotion
```

5.71 also showed three preparation defects that should have been rejected before PR creation:

- generated artifacts and manifest/Manager hashes could become temporarily inconsistent;
- materializer target-version reconciliation was not fully idempotent after Engine-source edits;
- concurrency-sensitive behavior could pass one run and fail a later run.

The goal is to remove coordination, not remove safety.

## 2. Primary rule

> One candidate branch + one trusted stage command should produce one exact CANDIDATE_READY SHA.

Normal pre-PR flow becomes:

```text
assistant writes source/tests/spec/materializer
 -> /usage-dashboard stage <candidate-branch>
 -> trusted transaction freezes source SHA
 -> pre-materialization diff gate
 -> safe E4-B materialization
 -> exact materialized SHA
 -> generic idempotency reconciliation
 -> focused behavior smoke
 -> E2-equivalent read-only readiness
 -> CANDIDATE_READY:<sha>:<version>
 -> assistant opens PR
```

No second `ready` comment is required in the normal path.

The existing `prepare`, `ready`, `ready-branch`, and manual `workflow_dispatch` entrypoints remain emergency/debug fallbacks during migration.

## 3. Control surface

Add one strict command to issue `#197`:

```text
/usage-dashboard stage <release/usage-dashboard-...>
```

The command intentionally contains only the candidate branch name.

The main-trusted controller resolves all other identity itself:

1. verify issue `#197` and repository-owner actor,
2. verify the candidate branch namespace,
3. read the branch ref once,
4. freeze `SOURCE_SHA`,
5. determine the release spec from the immutable candidate diff,
6. never trust a later moving branch ref as candidate identity.

The exact source SHA is therefore still authoritative even though the assistant does not need to pass it manually.

## 4. Release-spec discovery

A pre-materialized branch may still contain the previous product manifest, so release-spec discovery cannot rely only on the runtime manifest.

For a feature release transaction, compare:

```text
current main base -> frozen SOURCE_SHA
```

under:

```text
.github/usage-dashboard/releases/*.json
```

Require exactly one candidate release spec to be added or intentionally modified for the transaction.

Fail closed when:

- zero candidate release specs exist,
- more than one candidate release spec exists,
- the path leaves the release-spec namespace,
- the spec points to a denied materializer path,
- the declared target version is not a valid monotonic feature target.

This removes the `release_spec` field from the normal control command without guessing it.

## 5. Pre-materialization diff gate

Before candidate code runs, classify every changed path against the frozen source SHA.

Allowed source-of-intent classes include:

- `plugins/usage-dashboard/src/**`
- `plugins/usage-dashboard/runtime-src/**`
- release-specific tests
- release materializer/tool changes
- the single release spec
- deliberate Usage Dashboard docs/guideline-source changes

Production-generated outputs must not be hand-maintained before the transaction:

- `plugins/usage-dashboard/latest.js`
- generated `plugins/usage-dashboard/runtime/**` artifacts
- generated manifest hashes
- Manager embedded Engine identity

Unexpected temporary markers, staging workflows, unrelated product paths, or unexplained generated-output edits fail before E4-B begins.

The purpose is not a rigid line-count limit. It is a semantic diff budget: every path must have an allowed ownership class.

## 6. Preserve E4-B privilege separation

E5 must not merge candidate execution with repository write authority.

The transaction still has the E4-B boundary:

```text
read-only materialize job
  checkout exact SOURCE_SHA
  persist-credentials: false
  execute candidate materializer/builders
  create immutable single-parent Git bundle

write-only candidate job
  checkout trusted main control plane
  never execute candidate code
  verify parent/path/mode/bundle digest
  CAS branch == SOURCE_SHA
  fast-forward exact payload SHA
  post-verify remote ref
```

Only the candidate writer receives `contents: write`.

No candidate program receives repository write credentials.

No force push is introduced.

## 7. Generic reconciliation and materializer idempotency

After the release-specific materializer runs, one generic reconciliation authority should own generated state for every future release.

Conceptual order:

```text
release-specific source materializer
 -> Bridge Engine build --write
 -> synchronize Manager embedded Engine identity
 -> synchronize product-manifest runtime hashes
 -> plugin build --write
 -> synchronize project guidelines/current-release memory
 -> validate release tuple and hashes
```

Then run the same reconciliation a second time in the same read-only workspace.

Acceptance for pass two:

- zero working-tree diff,
- same production-critical SHA256 values,
- same plugin/Engine/Manager Git content,
- same manifest tuple.

Stable result:

```text
MATERIALIZER_IDEMPOTENT:<version>
```

This should be generic infrastructure, not copied into each release-specific materializer.

## 8. Authoritative module structure

Remove version-number tables such as historical `5.x -> N modules` expectations.

Current structural authority should come from:

- `plugins/usage-dashboard/src/parts.cjs`
- `plugins/usage-dashboard/runtime-src/bridge-engine/parts.json`

Tests should verify registry-to-file parity, uniqueness, deterministic ordering, and build parity.

An exact module count should be asserted only when the count itself is deliberately part of a feature contract.

## 9. Focused pre-PR behavior smoke

E2 should remain narrower than full PR regression, but 5.71 proved that concurrency-sensitive Engine changes need repeated process evidence before a PR opens.

Use a deliberately simple rule instead of a complex per-feature test mapper:

### If `runtime-src/bridge-engine/**` changed

Run all registered black-box `behavior-*` tests **three consecutive times**.

Any pass/fail variation is a production defect. No flaky-test exemption is allowed by default.

### If plugin `src/**` changed but Engine source did not

Run the registered black-box behavior suite once.

### If only tests/tools/docs/release-control metadata changed

Run structural/readiness checks only unless the changed tool itself affects runtime materialization.

Full P1-Pn plus all authoritative behavior/process regression remains PR-only.

## 10. Fold E2 into the same transaction

After the constrained writer fast-forwards the branch, the transaction already knows the exact `MATERIALIZED_SHA`.

A new downstream job with **contents: read only** should perform the existing E2 completeness checks directly on that SHA:

- checkout exact `MATERIALIZED_SHA`,
- replay generic reconciliation,
- require zero diff,
- validate release spec and tuple,
- validate test-registry structure,
- validate runtime hashes and source/build parity,
- run focused behavior smoke according to changed-path class,
- re-read candidate branch and require it still equals `MATERIALIZED_SHA`.

Success emits:

```text
CANDIDATE_READY:<MATERIALIZED_SHA>:<PRODUCT_VERSION>:<RELEASE_SPEC>
```

This preserves E2 exact-SHA semantics while removing the second control command.

## 11. PR boundary

The PR is opened only after the transaction returns CANDIDATE_READY.

Immediately before PR creation:

```text
candidate branch HEAD == CANDIDATE_READY SHA
```

must still hold.

PR CI remains:

- read-only,
- the one authoritative full regression pass,
- unable to repair the candidate,
- bound to the exact PR head that is later supplied to expected-head merge.

If the candidate branch moves after readiness, stage again; do not reuse stale readiness.

## 12. Post-merge path stays unchanged

E5 should not redesign the parts that worked well in 5.71:

```text
squash merge exact GREEN PR head
 -> E3 immutable parent/blob classification
 -> RELEASE_CANDIDATE only when production blobs changed
 -> existing monotonic exact-byte promotion
 -> post-publish main/release blob identity verification
```

Production promotion remains rebuild-free.

## 13. Normal lifecycle after E5

```text
assistant implements feature on release branch
 -> assistant posts ONE /usage-dashboard stage <branch> command
 -> transaction returns CANDIDATE_READY exact SHA
 -> assistant opens PR
 -> one full PR regression
 -> expected-head squash merge
 -> E3 exact-byte promotion
 -> assistant verifies production parity
 -> user presses +
 -> user performs real-device validation
```

The user's operational surface remains unchanged.

## 14. What becomes simpler

Assistant-side normal release control changes from:

```text
prepare + SHA tracking + ready + SHA tracking
```

to:

```text
stage <branch>
```

The transaction itself owns:

- source SHA resolution,
- release-spec discovery,
- diff classification,
- materialization,
- generated hash reconciliation,
- idempotency proof,
- focused repeated smoke,
- final exact-SHA readiness.

This removes coordination state without weakening immutable identity.

## 15. Migration stages

Implement as small maintenance PRs, not one large rewrite.

### E5-A — Generic Reconciliation / Idempotency

- one generic candidate reconciliation tool,
- complete Engine -> Manager -> manifest -> plugin synchronization,
- two-pass zero-diff/hash-stability contract,
- production bytes unchanged.

### E5-B — Candidate Diff Authority

- source/generated/control path classification,
- fail-closed unexpected-path handling,
- release-spec auto-discovery from frozen candidate diff,
- authoritative module registry checks.

### E5-C — Single-Command Transaction

- add `/usage-dashboard stage <branch>`,
- reuse existing E4-B writer boundary,
- downstream read-only E2-equivalent readiness in the same workflow,
- emit one CANDIDATE_READY receipt.

### E5-D — Operational Proof / Normal-Path Retirement

- exercise E5-C on the next real feature candidate,
- require first PR run to begin fully materialized and GREEN with respect to candidate completeness,
- keep old `prepare/ready/ready-branch` commands as emergency fallback initially,
- after one successful real feature release, mark them legacy/debug-only rather than normal-path operations.

## 16. Acceptance criteria

E5 is complete when:

1. one owner-only `stage <branch>` command is sufficient to reach exact-SHA readiness,
2. the trusted controller freezes source SHA before candidate execution,
3. exactly one release spec is discovered fail-closed from the frozen candidate diff,
4. unexplained generated-output edits are rejected before materialization,
5. candidate code never receives write credentials,
6. the writer never executes candidate code,
7. candidate write remains CAS + fast-forward + post-verified,
8. generic reconciliation is two-pass idempotent,
9. Engine-source candidates run all behavior tests three consecutive times before PR,
10. module structure derives from authoritative registries rather than release-version count tables,
11. the downstream readiness job binds one exact materialized SHA,
12. no second `ready` command is needed in the normal path,
13. PR full CI remains read-only and authoritative,
14. E3/exact-byte production promotion remains unchanged,
15. maintenance implementation does not move `release-usage-dashboard` or alter product bytes,
16. the user still only performs `+` update and real-device verification.

## 17. Non-goals

E5 does not:

- remove fail-closed validation,
- combine candidate code with write credentials,
- run full P1-Pn regression twice,
- auto-repair a branch that moved during CAS,
- guess release specs or product versions,
- change product runtime semantics,
- change UNKNOWN data semantics,
- redesign exact-byte promotion,
- modify PocketRisu core or SimCore.

## 18. Design summary

Current:

> Two trusted control commands coordinate materialization and readiness.

E5:

> One trusted transaction owns materialization and readiness while preserving the same privilege split.

Desired steady state:

> Source once -> stage once -> PR once -> test once -> merge once -> promote exact bytes -> user presses +.

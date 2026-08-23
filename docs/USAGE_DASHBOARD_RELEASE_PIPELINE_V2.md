# Local Usage Dashboard — Release Pipeline v2

Status: DESIGN — approved direction, implementation must proceed in small maintenance stages.

Canonical repository: `hanmiyoo10-alt/-`

Canonical product path: `plugins/usage-dashboard/`

Production release branch: `release-usage-dashboard`

Baseline when this design was recorded: Product `3.0.0-alpha.5.69`, Bridge Engine `1.6.20`, Bridge Manager `1.3.0`, snapshot/recent-request contracts `1/1`.

## 1. Why this exists

Local Usage Dashboard release engineering has repeatedly accumulated failure modes around workflow chaining, GitHub Actions-authored commits, main writers, materialization after merge, and release publishing. The 5.69 release demonstrated that product/runtime validation could be green while deployment still became complicated because repository mutation was spread across multiple workflow stages.

Release Pipeline v2 reduces authority and removes stages rather than adding more coordination.

Primary rule:

> Build once → test once → merge once → promote exact bytes.

The desired user experience does not change: ChatGPT performs source analysis, implementation, testing, PR/CI, merge and deployment; the user only uses PocketRisu `+` and performs real-device validation when requested.

## 2. Non-goals and protected behavior

This migration is release-infrastructure maintenance, not a product/runtime feature release.

Unless a later release explicitly requires otherwise, do not change:

- Local Usage Dashboard runtime behavior.
- Bridge Engine source behavior, CLI launch order, cache semantics, scheduling, diagnostics or endpoints.
- Bridge Manager lifecycle behavior.
- snapshot/recent-request contracts.
- PocketRisu `+` updater behavior.
- UNKNOWN-versus-known-zero semantics.
- existing source fidelity guarantees.
- unrelated repository products such as SimCore.

Do not bump Product, Engine or Manager versions merely to migrate release infrastructure.

## 3. Target architecture

The final v2 path is:

`development branch`
→ materialize final candidate in the branch
→ Release PR contains source + final generated artifacts
→ read-only full validation
→ squash merge
→ merge itself materializes `main`
→ exact Git blobs from the merged main commit are promoted to `release-usage-dashboard`
→ post-publish exact-byte verification
→ real-device validation.

There must be no workflow-generated follow-up commit to `main`.

There must be no rebuild during release promotion.

There must be no workflow chain that depends on a GitHub Actions-authored push triggering another workflow.

## 4. Stage A — Read-Only Candidate Validation

### Goal

PR CI validates a candidate but cannot modify repository state.

### New authority boundary

A reusable validation workflow should use repository read authority only, conceptually:

```yaml
permissions:
  contents: read
```

The validation workflow must not contain or invoke repository-writing primitives.

Forbidden in the validation path:

- `contents: write`
- `repo-main-write.py`
- `git push`
- branch/ref mutation
- release branch publishing
- workflow inputs that switch validation into publish mode
- committing generated artifacts back to the PR branch

### Candidate contract

The candidate must already be materialized before CI begins.

The Release PR contains both development source and final generated artifacts. CI may run the materializer/builders to prove reproducibility, but after regeneration the tree must remain clean.

Required failure semantics:

- if regeneration changes tracked candidate files, fail with a bounded reason such as `CANDIDATE_NOT_MATERIALIZED`;
- CI must never repair the candidate by committing regenerated files.

### Required validation

Keep the existing release-quality checks, including:

- release spec validation;
- deterministic plugin build;
- deterministic Bridge Engine build;
- syntax checks;
- behavior process harnesses;
- P1 through the current highest production regression phase;
- source/runtime parity;
- manifest/component/hash validation;
- candidate monotonic preconditions;
- test-tree immutability;
- `git diff --check` and final clean-tree assertion.

### Rollout rule

Do not remove the legacy publisher in Stage A. Establish the read-only validation boundary first while preserving a known fallback release path.

### Stage A success criteria

1. Current production-equivalent candidate passes the new read-only validator.
2. A deliberately stale generated-artifact fixture fails with `CANDIDATE_NOT_MATERIALIZED` or equivalent bounded failure.
3. Static regression fails if repository-write primitives re-enter the validator.
4. Production runtime blobs are unchanged by the maintenance PR.
5. Existing publisher remains available as rollback during this stage.

## 5. Stage B — Merge Is Materialization

### Goal

A green Release PR merge becomes the only normal operation that writes the candidate into `main`.

### Contract

Release PR HEAD is the exact complete tree intended for main:

- development source (`src/`, `runtime-src/`, applicable tools/tests/docs);
- `latest.js`;
- deployable `runtime/` artifacts;
- `product-manifest.json`;
- release metadata required for validation.

If source and generated artifacts disagree, read-only validation fails before merge.

### Merge gate

Before merge, require:

- full read-only validation GREEN;
- deterministic rebuild cleanliness;
- manifest/hash/parity GREEN;
- monotonic preconditions GREEN;
- expected PR head SHA fixed at merge time so a changed head cannot reuse stale validation.

### Remove Usage Dashboard main writing

After Stage B is proven, remove the Usage Dashboard `Commit validated candidate to main` path and all related Usage Dashboard main-write operations, including:

- Actions-authored generated-artifact commits;
- `PAYLOAD_COMMIT` main-write handoff;
- Usage Dashboard invocation of `scripts/repo-main-write.py`;
- Usage Dashboard main-write allowlists;
- direct or indirect Usage Dashboard workflow pushes to `main`.

Do not delete repository-wide main-write tooling merely because Local Usage Dashboard stops using it. Other products may still depend on that infrastructure.

### Publisher during Stage B

Stage B changes main materialization only. Keep the release publisher as a temporary fallback until Stage C is independently verified.

After B, responsibilities are:

- validator: read-only verification;
- PR merge: main materialization;
- legacy publisher: release-branch publishing only.

### Stage B success criteria

1. A maintenance PR passes read-only CI and merges normally.
2. The merge commit is the only commit introducing its Usage Dashboard main changes.
3. No follow-up `github-actions[bot]` Usage Dashboard materialization commit appears on main.
4. Usage Dashboard workflows no longer reference `repo-main-write.py` for main materialization.
5. Product/runtime bytes remain unchanged for the maintenance migration.

## 6. Stage C — Exact-Byte Release Promotion

### Goal

Publishing becomes promotion of already-tested main Git blobs, never rebuilding or rematerializing a candidate.

### Immutable candidate

At promotion start, freeze the merged candidate commit:

`MAIN_SHA = <specific merged main commit>`

All promoted artifacts must be read from that immutable commit, not from a moving `main` ref.

A later main merge therefore does not mutate the candidate being promoted.

### Release allowlist

Promotion authority is limited to deployable artifacts. The initial explicit allowlist is:

- `plugins/usage-dashboard/latest.js`
- `plugins/usage-dashboard/runtime/bridge-engine.mjs`
- `plugins/usage-dashboard/runtime/bridge-manager.cjs`
- `plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh`
- `plugins/usage-dashboard/runtime/product-manifest.json`

No other Usage Dashboard path may be written by the promoter unless this design is deliberately amended with regression coverage.

In particular, promotion must not publish:

- `plugins/usage-dashboard/runtime-src/`
- `plugins/usage-dashboard/src/`
- tests
- tools
- docs

### Monotonic guard

The promoter reads the candidate manifest from `MAIN_SHA` and the current release manifest from `release-usage-dashboard`.

Required outcomes:

- candidate version newer than release: eligible to promote;
- same version + exact same artifacts: `NOOP_IDENTICAL`;
- same version + artifact divergence: fail closed with `SAME_VERSION_ARTIFACT_DIVERGENCE` or equivalent;
- candidate version older than release: stale candidate, no publish.

Manifest SHA256 validation remains required for Engine, Manager and bootstrap artifacts where declared.

### Exact Git blob identity

Before promotion, collect the Git blob SHA for every allowlisted artifact at `MAIN_SHA`.

Create the release result using those exact blobs. Do not rewrite file contents through a build step.

The preferred implementation is Git-tree promotion:

1. read current release HEAD `RELEASE_BASE` and its tree;
2. create a new tree based on the release tree with only the allowlisted paths replaced by the candidate blob SHAs;
3. create one commit with parent `RELEASE_BASE`;
4. fast-forward `release-usage-dashboard` to that commit;
5. re-read and verify the published state.

This avoids checkout/copy/reset/switch behavior in the publisher.

### Release concurrency and stale-base safety

Promotion must never force-update production.

Immediately before ref update, verify `release-usage-dashboard` still equals `RELEASE_BASE`.

If it moved, fail/re-evaluate with bounded reason such as `RELEASE_REF_MOVED`. A newer release may have won the race.

A moving main ref alone is not a failure after `MAIN_SHA` has been frozen. Release monotonicity protects against an older frozen candidate overwriting a newer deployed version.

### Post-publish verification

Do not report deployment complete merely because the ref update succeeded.

Re-read production and require:

- release HEAD equals the newly created promotion commit;
- product/component/contracts tuple matches the candidate manifest;
- every allowlisted release blob SHA equals the corresponding blob SHA at `MAIN_SHA`;
- declared runtime SHA256 values match actual release bytes;
- `runtime-src` was not introduced into release;
- no unexpected path changed in the promotion commit.

### Shadow rollout

Before replacing the legacy publisher, run Stage C in non-writing/shadow validation against an existing known release and prove that the new promoter selects the same artifacts the legacy publisher would deploy.

Required regression cases include:

- older release → current candidate: promotion eligible;
- identical same-version release: NOOP;
- same-version divergent artifact: fail closed;
- newer release → older candidate: stale/no publish;
- moved release ref: fail/re-evaluate;
- attempt to include a non-allowlisted development path: fail.

Only after these are green should the legacy filesystem publisher be retired.

## 7. Final invariants after A+B+C

When Stages A, B and C are complete, these invariants are non-negotiable:

1. PR CI is read-only.
2. Generated artifacts are committed before CI; CI never repairs candidates.
3. The validated PR HEAD is the exact tree merged to main.
4. PR merge is the only normal Usage Dashboard main write.
5. The release publisher never rebuilds.
6. Production is made from exact blobs of one immutable merged main commit.
7. Release publishing changes only an explicit deployable-artifact allowlist.
8. Release updates are fast-forward and monotonic; no force push.
9. Same-version divergent artifacts fail closed.
10. Post-publish main-candidate/release blob identity is verified before declaring deployment complete.
11. Development source such as `runtime-src` is never promoted to the production release branch.
12. PocketRisu `+` remains the user's normal update action.

## 8. What comes after C

Once A+B+C are proven, a later Stage D may remove version-specific command workflows and replace them with one generic release controller that validates/promotes any release spec under the same contracts.

Stage D is intentionally out of scope for the first three migrations. Do not combine generic-controller cleanup with A, B or C unless repository evidence later justifies changing this sequencing.

## 9. Migration discipline

Implement A, B and C as separate maintenance changes.

For each stage:

1. re-read current `main` and `release-usage-dashboard` before work;
2. preserve the current successful production release as baseline;
3. keep the diff limited to release infrastructure/tests/docs needed for that stage;
4. add/adjust regression coverage for the new authority boundary;
5. run the full Usage Dashboard regression suite before merge;
6. verify main/release production artifacts remain unchanged unless that stage is intentionally exercising promotion;
7. do not ask the user to run development commands;
8. request real-device testing only if product/runtime bytes actually changed or real-device evidence is genuinely required.

## 10. Design summary

Stage A:

> CI reads and proves. It never writes.

Stage B:

> Main is written by the validated PR merge, not by a follow-up workflow.

Stage C:

> Release receives the exact tested Git blobs from the merged main commit; nothing is rebuilt.

Combined:

> Build once → test once → merge once → promote exact bytes.

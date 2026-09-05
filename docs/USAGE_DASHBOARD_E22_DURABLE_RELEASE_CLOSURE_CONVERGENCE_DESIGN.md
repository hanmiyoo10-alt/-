# Local Usage Dashboard E22 — Durable Release Closure Convergence

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Canonical issue: `#1563`
Design transaction: `#1564`
Design branch: `design/usage-dashboard-e22-durable-release-closure-convergence`

## 1. Why E22 exists

E21 Evidence Consumer Convergence is already implemented, validated, merged, and byte-neutral. E22 does not reopen E20 or E21.

The triggering evidence is Product `3.0.0-alpha.5.100`.

5.100 completed the repository release path successfully:

- PR `#1557` merged to main at `ca84419a176a047482d500497d2bba44926f41ef`;
- exact-byte promotion succeeded;
- production `release-usage-dashboard` advanced to `478fcd368734b1cf1aa5a98932cb34bb29f1d1e4`;
- production tuple is Product `3.0.0-alpha.5.100` / Engine `1.6.35` / Manager `1.3.6` / CLI `1.10.0` / Models `1.280.0` / contracts `1/1`;
- exact-byte parity is VERIFIED;
- physical verification is still PENDING until user-supplied PocketRisu evidence is recorded.

The existing E9 durable reconciler already contains an intended post-deploy convergence path that can post `UD_E9_DEPLOYED` / `UD_RELEASE_DEPLOYED` and close the durable release request after verified promotion. However, the real 5.100 durable request `#1549` remained open after the successful promotion and received a manual repository read-back comment instead.

Therefore the E22 problem is not missing release authority. It is **closure-state divergence** between already-proven deployment facts and the durable release request that is supposed to represent them.

## 2. Core design thesis

Do not build another release system.

E22 converges the existing one by separating two concepts that should never share one boolean:

1. **release execution state** — repository/CI/main/promotion facts;
2. **physical acceptance state** — user-supplied real-device evidence.

The GitHub issue may close when release execution is durably deployed. That close must never mean physical acceptance.

Physical acceptance is an orthogonal evidence state stored on the same durable release request and may be recorded after the issue is already closed.

This keeps the queue unblocked, avoids a second release-state issue, and prevents CI from impersonating a real-device verdict.

## 3. Stability direction

### S1. Exact deployment binding

A deployment closure may be recognized only when all of the following agree:

- release request `release_version`;
- request `pr_number`;
- merged PR main merge SHA;
- `release-usage-dashboard` production SHA;
- exact-byte parity VERIFIED;
- production manifest Product / Engine / Manager / contracts tuple.

Conflicting or incomplete deployment evidence must fail closed.

### S2. Physical evidence cannot be inferred

CI, promotion, E9/E22 reconciliation, elapsed time, a closed issue, or a healthy repository state may never produce `ACCEPTED`.

Only user-supplied PocketRisu evidence, subsequently recorded into a structured repository receipt, may advance physical state to `ACCEPTED`.

### S3. Contradictions are explicit

Examples that must not silently converge:

- accepted physical receipt names the wrong Product version;
- physical receipt names a release SHA different from the deployed release SHA;
- two incompatible deployment SHAs exist for one release request;
- two incompatible physical verdicts exist for the same exact release identity;
- a physical ACCEPTED receipt exists without a verified deployment identity.

These become deterministic conflict findings and leave accepted-baseline projection unchanged.

### S4. No automatic rollback

A physical failure after deployment must not rewrite `release-usage-dashboard`, mutate main, or synthesize a rollback.

The recorded state becomes `DEPLOYED_PHYSICAL_REJECTED`; the next action is diagnosis only, followed by a separately designed repair release if needed.

### S5. Existing authority remains sealed

E22 does not change:

- E20 structured release-evidence authority;
- E21 evidence-view compatibility authority;
- E7 stage/materialization authority;
- E9 source/candidate transaction authority except closure convergence wiring;
- E11/E12/E16 merge evidence;
- exact-byte promotion authority;
- `release-usage-dashboard` write authority;
- physical acceptance authority.

## 4. Simplicity direction

### C1. One durable release record

Do not create a second permanent issue for deployment state or physical state.

The existing `[usage-dashboard-release] <version>` issue remains the canonical durable record.

### C2. Two-axis projection instead of one long workflow-state enum

Canonical projection:

```text
execution.state =
  REQUESTED
  CANDIDATE_READY
  VALIDATED
  MERGED
  DEPLOYED

physical.state =
  PENDING
  ACCEPTED
  REJECTED

composite.state =
  REQUESTED
  CANDIDATE_READY
  VALIDATED
  MERGED_PENDING_DEPLOY
  DEPLOYED_PENDING_PHYSICAL
  ACCEPTED
  DEPLOYED_PHYSICAL_REJECTED
  CONFLICT
```

The issue open/closed bit represents release-execution queue ownership only:

- before verified deployment: normally open;
- after verified deployment: closed/completed;
- physical PENDING may coexist with a closed issue;
- later physical acceptance does not require reopening the issue.

This avoids an old deployed-but-pending request blocking the next release transaction.

### C3. One pure closure projector

Tentative implementation owner:

```text
plugins/usage-dashboard/tools/release_closure_e22.cjs
```

It must be pure with respect to supplied JSON/objects. It must not perform network calls itself.

Inputs are already-fetched request, comments, PR metadata, deployment facts, and production manifest identity. Outputs are a closed-shape projection plus deterministic findings.

### C4. Reuse existing E9 workflow

E22 should not add a new workflow stage.

The preferred implementation extends the existing E9 durable reconciler and its existing workflow-run/scheduled re-observation rather than creating an E22 release controller.

Allowed trigger refinement may include a narrowly guarded `issue_comment` path for structured physical receipts, but no new polling loop is authorized. The existing E9 `*/5` reconciliation cadence remains the only scheduled recovery cadence.

### C5. Do not duplicate deployment receipts

Existing `UD_RELEASE_DEPLOYED` / `UD_E9_DEPLOYED` evidence should be normalized rather than replaced by a second deployment receipt family.

E22 may add one new structured **physical** receipt family because no canonical machine-readable physical receipt currently exists.

## 5. Automation direction

### A1. Post-promotion self-healing

When exact-byte promotion succeeds, the existing `workflow_run` trigger must be sufficient to re-observe the durable request, bind exact deployment identity, post the missing request-side deployment receipt if necessary, and close the release-execution issue idempotently.

If that event is missed, the existing scheduled E9 reconciliation must produce the same final projection later without manual repair.

### A2. Duplicate-safe reconciliation

Re-running after any already-recorded step must be a no-op except for missing canonical receipts/state.

No duplicate deployment receipt, duplicate closure comment, duplicate physical receipt, or duplicate issue-state transition should be generated by repeated automation.

### A3. Structured physical acceptance receipt

Tentative canonical marker:

```text
UD_PHYSICAL_ACCEPTANCE_V1
release: 3.0.0-alpha.5.100
release_branch_sha: <exact production SHA>
verdict: ACCEPTED|REJECTED
observed_product: <version or UNKNOWN>
observed_engine: <version or UNKNOWN>
observed_manager: <version or UNKNOWN>
health: PASS|FAIL|UNKNOWN
feature: PASS|FAIL|UNKNOWN
recorded_from: user-real-device-evidence
```

Rules:

- the user is never required to type this format;
- the user only performs the normal `+` update and reports observations/screenshots;
- ChatGPT records the bounded structured receipt in the repository;
- no raw account/org IDs, tokens, secrets, or unrelated diagnostics are copied into public evidence;
- UNKNOWN stays UNKNOWN;
- `ACCEPTED` requires exact release version/SHA binding plus enough user evidence to support the intended physical gate;
- `REJECTED` records failure honestly and authorizes diagnosis only.

### A4. Latest accepted baseline projection

E22 must provide a deterministic way to distinguish:

```text
latest deployed production
```

from:

```text
latest physically accepted installed baseline
```

Example during the current 5.100 boundary:

- deployed production: 5.100;
- if 5.100 physical remains PENDING, latest accepted baseline remains 5.99;
- once exact 5.100 physical evidence is ACCEPTED, latest accepted baseline becomes 5.100;
- a later deployed-but-rejected release must never replace the accepted baseline.

This projection is evidence for future release-spec preparation. It does not replace E20/E21 releaseEvidence semantics and does not mutate historical release specs.

### A5. Assistant-only repository recording

The user workflow remains:

```text
press +
→ inspect real device
→ send observations/screenshots
```

ChatGPT owns:

```text
repository read-back
→ exact identity match
→ structured acceptance receipt
→ durable closure projection
→ baseline handoff for the next design
```

No developer command should be delegated to the user.

## 6. Canonical physical states

### PENDING

Deployment is proven but no valid user-supplied real-device verdict is recorded.

### ACCEPTED

A structured physical receipt is exact-release-bound and records an accepted user-supplied real-device verdict.

### REJECTED

A structured physical receipt is exact-release-bound and records a failed user-supplied real-device verdict.

`REJECTED` is not rollback authority and not permission to fabricate a fallback baseline. The previous accepted release remains the accepted-baseline authority.

## 7. Fail-closed conflict findings

Tentative deterministic codes:

```text
E22_DEPLOYMENT_IDENTITY_CONFLICT
E22_DEPLOYMENT_EVIDENCE_INCOMPLETE
E22_PHYSICAL_BEFORE_DEPLOYMENT
E22_PHYSICAL_RELEASE_VERSION_MISMATCH
E22_PHYSICAL_RELEASE_SHA_MISMATCH
E22_PHYSICAL_VERDICT_CONFLICT
E22_PHYSICAL_RECEIPT_SHAPE_INVALID
E22_ACCEPTED_BASELINE_AMBIGUOUS
```

A conflict must never be converted into PENDING, ACCEPTED, zero, or an inferred value.

## 8. Implementation surface — frozen maximum

Expected allowed files:

```text
plugins/usage-dashboard/tools/release_closure_e22.cjs
plugins/usage-dashboard/tests/e22-durable-release-closure-convergence-contract.cjs
.github/workflows/usage-dashboard-e9-release-reconcile.yml
plugins/usage-dashboard/tests/test-registry.cjs            # only if explicit registration is required
```

A small bounded edit to an existing shared test/helper is allowed only if implementation-time evidence proves it necessary.

Not allowed without a new design amendment:

```text
plugins/usage-dashboard/latest.js
plugins/usage-dashboard/src/**
plugins/usage-dashboard/runtime/**
scripts/bootstrap-usage-dashboard.sh
release-usage-dashboard direct mutation logic
new database/cache/queue service
new workflow stage
new scheduled poller
new physical-verification automation authority
```

E22 is intended to be Product/Engine/Manager/bootstrap byte-neutral maintenance.

## 9. Regression plan

The E22 contract must prove at minimum:

1. successful exact-byte deployment + open request + missing request-side deploy receipt converges to DEPLOYED and closes the issue;
2. a missed workflow-run event is healed by the existing scheduled reconciliation semantics;
3. duplicate deployment evidence is idempotent;
4. PR-side deployment receipt and request-side deployment projection bind to the same exact merge/release SHA;
5. physical PENDING does not keep the release-execution issue open;
6. a valid ACCEPTED receipt on a closed request projects ACCEPTED without reopening it;
7. a valid REJECTED receipt projects DEPLOYED_PHYSICAL_REJECTED and never triggers rollback;
8. physical acceptance before deployment fails closed;
9. wrong Product version fails closed;
10. wrong production release SHA fails closed;
11. contradictory physical verdicts fail closed;
12. accepted 5.99 + deployed/pending 5.100 resolves latest accepted baseline to 5.99;
13. accepted 5.100 resolves latest accepted baseline to 5.100;
14. a later deployed/rejected release does not replace the latest accepted baseline;
15. E20 structured release evidence remains GREEN;
16. E21 evidence consumer convergence remains GREEN;
17. exact-byte promotion/monotonic release tests remain GREEN;
18. full discovered Usage Dashboard registry remains GREEN;
19. no product/runtime artifact bytes are changed by E22 implementation.

## 10. First genuine use / implementation entry condition

Design may freeze before the 5.100 physical test.

Implementation should begin only after the 5.100 real-device result is recorded, because that result provides the first genuine current physical receipt shape and prevents E22 from being designed around synthetic assumptions only.

If 5.100 is ACCEPTED, its exact production identity becomes the first positive physical fixture.

If 5.100 is REJECTED, that failure becomes the first negative physical fixture and the previous accepted 5.99 baseline must remain authoritative.

Either outcome is valid design evidence.

## 11. User-visible operating contract after E22

The user should see no additional release-management burden.

Normal release path remains:

```text
ChatGPT designs / implements / tests / PRs / merges / deploys
→ user presses +
→ user verifies real-device behavior
→ ChatGPT records and closes physical evidence
```

The user should never need to operate GitHub Actions, edit release requests, create receipts, or run developer commands.

## 12. Frozen verdict

**E21 KEEP SEALED.**

**E22 = stability + simplicity + automation of durable release closure, not a new release authority.**

- Stability: exact identity binding, contradiction detection, no inferred physical pass, no automatic rollback.
- Simplicity: one durable request, two-axis execution/physical projection, one pure closure owner, reuse E9.
- Automation: self-heal missed deployment closure, idempotently record state, structure real-device evidence, and deterministically expose the latest physically accepted baseline.

Implementation remains **NOT STARTED** until the design PR is merged and the current 5.100 physical result is recorded.
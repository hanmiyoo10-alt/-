# Local Usage Dashboard — E9 Durable Release Transaction

Status: **IMPLEMENTED — E9-A..E merged/regression-proven; E9-F real-release proof PENDING**

Design authority: Issue `#356`.
Implementation PR: `#357`.
Implementation merge: `67fe58d0e9cf358074814ef64f0bf1a70264e5f5`.
E8 retrospective: `docs/USAGE_DASHBOARD_E8_575_REAL_RELEASE_RETROSPECTIVE.md`.

## Generation rule

E9 is the next integer generation after E8 real-release feedback. It inherits every still-valid E1–E8 safety guarantee and changes orchestration state only.

```text
complete E(n)
→ real release evidence
→ feedback
→ E(n+1)
```

## E9 objective

```text
one durable release request
+ one exact source-readiness authority
+ one exact-SHA candidate validation authority
+ one deployment/closure convergence path
```

Events are wake-ups, never authority.

## Inherited guarantees — unchanged

E9 keeps:
- `release/usage-dashboard-*` source-of-intent branches;
- generated/runtime-output denial on source branches;
- controller-owned deterministic `stage/usage-dashboard-<version>` candidate refs;
- read-only candidate materialization and trusted writer only;
- CAS / fast-forward-only / postverify candidate writes;
- no force push and no connected-control candidate/production ref mutation;
- exact-SHA complete registered Usage Dashboard validation as merge authority;
- current PR head == validated SHA before expected-head squash merge;
- classifier + monotonic guard + exact-byte production promotion without rebuild;
- automatic deployment receipt;
- UNKNOWN/data/privacy/source-truth semantics;
- actual-device verification as a separate user boundary.

## E9-A — one durable release request

A normal E9 release uses one owner-authored issue:

```text
[usage-dashboard-release] 3.0.0-alpha.5.N
```

with strict fields:

```text
release_version: 3.0.0-alpha.5.N
release_spec: .github/usage-dashboard/releases/5.N.json
source_branch: release/usage-dashboard-...
source_sha: <40-hex exact SHA>
feature_issue: #<number>
release_generation: E9
pr_number: PENDING
```

The connected assistant creates/updates this request. A source repair changes `source_sha` on the same issue; it does not create a successor request, candidate branch, or release PR.

Attempt identity is exact:

```text
release_version + source_sha
```

`release_request_e9.cjs` owns strict parsing, attempt identity and durable marker interpretation. `usage-dashboard-e9-release-reconcile.yml` is serialized and uses durable markers, so duplicate wake-ups converge on the same semantic attempt.

Public request states remain:

```text
REQUESTED
CANDIDATE_READY
VALIDATED
DEPLOYED
```

`BLOCKED` is diagnostic state for the current exact source SHA only.

## E9-B — exact source-SHA readiness

Before E9 accepts candidate authority, the exact requested source SHA must prove:

```text
SOURCE_SHA_READY:<source_sha>
```

`source_readiness_e9.cjs` binds readiness to exact trusted main + exact source SHA and performs only cheap deterministic checks:
- existing source/release namespace, generated-output and monotonic checks;
- stale-current/historical-literal hygiene on changed Usage Dashboard tests;
- canonical A/M/D/R/T source-change semantics;
- deleted module direct-reference detection in Usage Dashboard tests;
- touched part boundary-marker consistency where the source tree can prove it cheaply.

A source branch move invalidates readiness and emits `SOURCE_SHA_NOT_READY`. Existing stage/materializer/full-registry checks remain defense in depth; readiness never replaces full validation.

## E9-C — canonical source-change semantics

`source_change_semantics.cjs` is the Usage Dashboard source-change authority. It normalizes:

```text
A / M / D / R / T
```

and includes both sides of a rename when computing changed paths.

`candidate_stage_policy.cjs` consumes this helper instead of owning an independent `git diff --diff-filter=...` implementation. E9 source readiness uses the same helper. This closes the 5.75 deletion-semantics drift class without broadening source authority.

The impact-aware gate stays deliberately narrow. Behavior/integration authority remains the full exact-SHA registry.

## E9-D — one exact-SHA validation authority

The deterministic PR remains assistant-created/reused and must include:

```text
Usage-Dashboard-Release-Request: #<request-issue>
```

The durable request records its `pr_number`. The reconciler binds PR base/repository/branch/head to the current deterministic candidate and dispatches `usage-dashboard-e9-validate.yml`.

That workflow independently binds durable request + PR + exact candidate SHA, verifies the remote candidate ref, and invokes the unchanged reusable complete Usage Dashboard registry.

Normal E9 therefore needs no `/usage-dashboard validate ...` comment and no close/reopen/reactivation choreography. Ordinary `pull_request` CI remains optional defense-in-depth observability rather than release authority.

Merge invariant remains:

```text
VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CURRENT_CANDIDATE_SHA
```

## E9-E — idempotent production and generation closure

Promotion remains the existing classifier → monotonic guard → exact-byte promoter.

After an expected-head merged validated PR, the reconciler waits until `release-usage-dashboard` reports the requested version and independently runs `check_release_blob_parity.cjs` against the merged main SHA.

Only then it records:

```text
DEPLOYED
main_merge_sha
release_branch_sha
exact_byte_parity: VERIFIED
physical_verification: PENDING
```

and closes the durable release request as repository/CI/deployment complete.

The first real E9 feature release additionally posts `E9_F_RELEASE_PROOF` to Issue #356 and closes that generation issue. Physical PocketRisu evidence remains separate and is never inferred.

## Normal E9 flow

```text
assistant implements source/spec/tests/materializer
→ assistant creates/updates one durable E9 release request
→ reconciler proves SOURCE_SHA_READY for exact source SHA
→ reconciler dispatches the existing trusted stage writer
→ candidate authority is accepted only for that exact source SHA
→ assistant ensures/reuses one deterministic PR and records pr_number
→ reconciler dispatches one exact-SHA authoritative validator
→ GREEN
→ assistant re-reads head/mergeability and expected-head merges
→ existing exact-byte promoter deploys
→ reconciler independently verifies production version + exact-byte parity
→ durable request closes DEPLOYED
→ first real E9 release closes E9-F proof
→ user is called only for `+` / actual-device verification
```

If RED:

```text
fix source only
→ update source_sha on the same request
→ new SOURCE_SHA_READY proof
→ same deterministic candidate branch advances
→ same PR is reused
→ exact-SHA validation binds the new head
```

## Event model and idempotency

The reconciler can wake from issue edits, relevant trusted-main pushes, schedules, explicit workflow dispatch, or merged PR events. All wake-ups execute one state reducer.

```text
transient event != authority
durable request + exact SHA + receipt == authority
```

A repeated wake-up does not become a new release transaction.

## Legacy compatibility

E7/E8 stage and validation command paths remain temporarily available as diagnostic/emergency compatibility surfaces; they are not the normal E9 path.

E9 deliberately reuses the proven E7 stage materializer/writer instead of rewriting candidate/ref mutation while also simplifying orchestration. Candidate/ref safety code therefore stays stable.

## Implementation / regression evidence

Implementation PR `#357` changed release-control/test/docs only. No `latest.js`, Engine, Manager, product manifest tuple or product release spec was intentionally changed.

First complete validation:

```text
head: 4155c0d4efeef839d48337cabac773ffeacdb07f
Usage Dashboard Candidate Validation: 32826721688 — SUCCESS
SimCore CI: 32826721430 — Verify SUCCESS / Required SUCCESS
TEST_REGISTRY_GREEN:84
```

The evidence update moved the final PR head to:

```text
125c6f2f9572da86e6ad1ce29373856edf804289
```

That exact final head was revalidated:

```text
Usage Dashboard Candidate Validation: 32826996735 — SUCCESS
SimCore CI: 32826996456 — Verify SUCCESS / Required SUCCESS
RELEASE_MEMORY_CONTRACT_GREEN:.github/usage-dashboard/releases/5.75.json ×2
MATERIALIZER_IDEMPOTENT:3.0.0-alpha.5.75
usage-dashboard E8 early-failure/orchestration contract: OK
usage-dashboard E9 durable release transaction contract: OK
P35 Cross-Scope Request Provenance: OK
P38 Diagnostics Mode Handler Ownership: OK
P39 Provenance Analytics Wrapper Consolidation: OK
TEST_REGISTRY_GREEN:84
validated 3.0.0-alpha.5.75 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
Engine SHA256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

PR #357 was re-read with `head == 125c6f2f...`, `mergeable == true`, and unchanged base. It was squash-merged with `expected_head_sha` set to that exact validated head.

Main implementation merge:

```text
67fe58d0e9cf358074814ef64f0bf1a70264e5f5
```

## Maintenance byte-neutral closure

The E9-A..E implementation merge is maintenance-only. Post-merge production remained:

```text
Product: 3.0.0-alpha.5.75
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
release-usage-dashboard: ffa3dae31bad70ca68059fbc085d63b9a2d862ca
```

Direct main/release Git blob parity after merge:

```text
runtime/product-manifest.json: 1013d9e7a06db21667c098c79fcb2a5dfd9227de == 1013d9e7a06db21667c098c79fcb2a5dfd9227de
latest.js: c356924fd2f1068d3bb9fdb7b7ee86a5e177aac0 == c356924fd2f1068d3bb9fdb7b7ee86a5e177aac0
runtime/bridge-engine.mjs: c9090717394ed4da4458923535f5f089205e65da == c9090717394ed4da4458923535f5f089205e65da
```

Therefore E9-A..E changed no deployed Local Usage Dashboard product bytes and requires no PocketRisu device acceptance by itself.

## Retained negative operational evidence

During initial E9 tool setup, the connected control surface accidentally created `docs/E9_PLACEHOLDER` directly on `main` in `f50255b5afae7e75b24787430fbb8131d33e77a2`. The file contained only `placeholder` and changed no product/runtime/release bytes. It was immediately removed in `57f4326119921206c1e1f1c3ed3dcdb70e1bc3e3`, restoring the exact prior tree. Issue #356 retains this as operator/control-surface feedback: content writes must never be used as branch-existence probes or setup checks.

## Current generation state

```text
E9-A..E: IMPLEMENTED / REGRESSION-PROVEN
E9-F: NEXT REAL RELEASE PROOF PENDING
```

Issue #356 remains open as E9 generation authority until E9-F is proven by the next real feature release.

## Non-goals

E9 does not change Local Usage Dashboard product runtime behavior, Engine/Manager semantics, product data contracts, full-registry coverage, promotion bytes, merge protection, or PocketRisu update UX. It adds no force push, connected ref mutation, broad automatic merge authority, inferred physical verification, or second release request for ordinary repair.

## Principle

> **Durable state over transient events; exact source readiness before candidate authority; one exact-SHA validation lane; exact bytes remain sacred.**

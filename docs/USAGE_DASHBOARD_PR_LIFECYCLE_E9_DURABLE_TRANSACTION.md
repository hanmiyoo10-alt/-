# Local Usage Dashboard — E9 Durable Release Transaction

Status: **IMPLEMENTATION CANDIDATE — E9-A..E encoded; regression/merge proof pending**

Design authority: Issue `#356`.
E8 retrospective: `docs/USAGE_DASHBOARD_E8_575_REAL_RELEASE_RETROSPECTIVE.md`.

## Generation rule

E9 is the next integer generation after E8 real-release feedback. It inherits every still-valid E1–E8 safety guarantee and changes only orchestration state.

```text
complete E(n)
→ real release evidence
→ feedback
→ E(n+1)
```

## E9 objective

E9 reduces the normal release-control state to:

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
- read-only candidate materialization;
- trusted candidate writer only;
- CAS / fast-forward-only / postverify candidate writes;
- no force push;
- no connected-control candidate or production ref mutation;
- exact-SHA complete registered Usage Dashboard validation as merge authority;
- current PR head == validated SHA before merge;
- expected-head squash merge;
- classifier + monotonic guard;
- exact-byte `release-usage-dashboard` promotion without rebuild;
- automatic deployment receipt;
- UNKNOWN/data/privacy/source-truth semantics;
- actual-device verification as a separate user boundary.

## E9-A — one durable release request

Normal E9 releases use one owner-authored issue:

```text
[usage-dashboard-release] 3.0.0-alpha.5.N
```

with strict body fields:

```text
release_version: 3.0.0-alpha.5.N
release_spec: .github/usage-dashboard/releases/5.N.json
source_branch: release/usage-dashboard-...
source_sha: <40-hex exact SHA>
feature_issue: #<number>
release_generation: E9
pr_number: PENDING
```

The connected assistant creates/updates this request. A source repair changes `source_sha` on the same issue. It does not create a successor request, candidate branch, or release PR.

Attempt identity is exact:

```text
release_version + source_sha
```

`release_request_e9.cjs` owns request parsing and marker interpretation. Duplicate delivery is harmless because `usage-dashboard-e9-release-reconcile.yml` uses one serialized reconciler and durable issue markers.

Public states remain small:

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

`source_readiness_e9.cjs` binds readiness to exact trusted main + exact source SHA and runs only cheap deterministic checks:

- source/release namespace and monotonic target through existing stage policy;
- generated-output denial through existing stage policy;
- stale-current/historical-literal hygiene on changed Usage Dashboard tests;
- canonical A/M/D/R/T change semantics;
- deleted module direct-reference detection in Usage Dashboard tests;
- touched part boundary-marker consistency where the source tree can prove it cheaply.

A source branch move invalidates readiness. The reconciler emits `SOURCE_SHA_NOT_READY` and waits for the same durable request to be updated to the new exact SHA.

The existing stage/materializer/full-registry checks remain defense in depth. Readiness is not a replacement for full validation.

## E9-C — one canonical source-change semantic resolver

`source_change_semantics.cjs` is the Usage Dashboard authority for source change discovery. It normalizes at least:

```text
A / M / D / R / T
```

including both sides of a rename when computing changed paths.

`candidate_stage_policy.cjs` consumes this helper instead of carrying an independent `git diff --diff-filter=...` implementation. The same helper is reused by E9 source readiness.

This prevents the 5.75 deleted-path drift class where patch reconstruction and policy discovery disagreed about whether a deleted source module was part of source intent.

## E9-D — exact-SHA validation without PR-event choreography

The deterministic PR is still created/reused by the connected assistant and must include:

```text
Usage-Dashboard-Release-Request: #<request-issue>
```

The same durable request is updated with its `pr_number`.

The reconciler then verifies:

```text
PR base == main
PR head repo == canonical repo
PR head branch == stage/usage-dashboard-<release_version>
PR head SHA == current candidate SHA
PR body points back to the durable release request
```

and dispatches `usage-dashboard-e9-validate.yml`.

That trusted workflow binds request + PR + candidate identity again and invokes the unchanged reusable complete Usage Dashboard registry for the exact SHA.

Normal E9 flow therefore needs no `/usage-dashboard validate ...` comment and no close/reopen/reactivation choreography. Ordinary `pull_request` CI may remain observability/defense in depth, but it is not a release milestone.

Merge authority remains:

```text
VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CURRENT_CANDIDATE_SHA
```

## E9-E — idempotent production/closure convergence

Promotion itself is unchanged: classifier → monotonic guard → exact-byte promoter.

The E9 reconciler observes a merged validated PR and does not mark deployment complete until:

- `release-usage-dashboard` reports the requested product version;
- `check_release_blob_parity.cjs` proves production exact-byte parity against the merged main SHA.

Only then it records on the durable request:

```text
DEPLOYED
main_merge_sha
release_branch_sha
exact_byte_parity: VERIFIED
physical_verification: PENDING
```

and closes the request as repository/CI/deployment complete.

The first real E9 feature release also posts `E9_F_RELEASE_PROOF` to Issue #356 and closes the E9 generation issue. Physical PocketRisu evidence remains separate and is never inferred.

## Normal E9 flow

```text
assistant implements source/spec/tests/materializer
→ assistant creates/updates one durable E9 release request
→ reconciler proves SOURCE_SHA_READY for exact source SHA
→ reconciler dispatches existing trusted stage writer
→ reconciler accepts candidate only when candidate commit identifies that exact source SHA
→ assistant ensures/reuses one deterministic PR and records pr_number on the same request
→ reconciler dispatches one exact-SHA authoritative validator
→ GREEN
→ assistant re-reads head/mergeability and expected-head merges
→ existing exact-byte promoter deploys
→ reconciler independently verifies production version + exact-byte parity
→ durable request closes DEPLOYED
→ E9-F generation proof closes on the first real E9 release
→ user is called only for `+` / actual-device verification
```

If source validation is RED:

```text
fix source only
→ update source_sha on the same request
→ new SOURCE_SHA_READY proof
→ same deterministic candidate branch advances
→ same PR is reused
→ exact-SHA validation binds the new head
```

## Event model

The reconciler can wake from issue edits, relevant trusted-main pushes, schedules, explicit workflow dispatch, or merged PR events.

All wake-ups execute the same state reducer. A repeated event does not become a new release transaction.

```text
transient event != authority
durable request + exact SHA + receipt == authority
```

## Legacy compatibility

E8/E7 stage and validation command paths remain temporarily available as diagnostic/emergency compatibility surfaces. They are not the normal E9 path.

E9 deliberately reuses the proven E7 stage writer rather than rewriting candidate materialization/ref mutation in the same generation that simplifies orchestration. Candidate/ref safety code therefore remains stable while coordination moves to the durable request model.

## Non-goals

E9 does not change Local Usage Dashboard product runtime behavior, Engine or Manager semantics, product data contracts, full-registry coverage, promotion bytes, merge protection, or PocketRisu update UX.

It does not add force push, connected ref mutation, broad automatic merge authority, inferred physical verification, or a second release request for ordinary repair.

## Implementation acceptance

E9-A..E maintenance is ready to merge only when the complete Usage Dashboard registry proves:

- durable request parsing and exact attempt identity;
- duplicate wake-up/idempotency markers;
- exact source-SHA readiness;
- A/M/D/R/T canonical semantics;
- stage policy reuse of canonical changes;
- one serialized reconciler;
- exact-SHA validator dispatch with request/PR/head binding;
- no ref mutation in reconciler/validator;
- unchanged promoter exact-byte authority;
- maintenance merge leaves current production bytes unchanged.

After maintenance merge, E9 status is:

```text
E9-A..E: IMPLEMENTED / REGRESSION-PROVEN
E9-F: NEXT REAL RELEASE PROOF PENDING
```

## Principle

> **Durable state over transient events; exact source readiness before candidate authority; one exact-SHA validation lane; exact bytes remain sacred.**

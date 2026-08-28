# SimCore Release System v2.4 — Preflight Compression Implementation Evidence

Date: 2026-08-28 KST
Scope: **NON-RUNTIME release-system stabilization**
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_4_PREFLIGHT_COMPRESSION_DESIGN.md`
Primary FIX: `#690`
WATCH held: `#691`

## 1. Implementation decision

R2.4 preserves the R2.3/R2.2 release engine and adds earlier, non-authoritative qualification only.

Implemented now:

```text
R2.4-A candidate-equivalent PR1 dry qualification
R2.4-B semantic assertion discipline / v0.64.10 replay regression
R2.4-D automation authority freeze
```

Intentionally not implemented now:

```text
R2.4-C direct-predecessor terminal debt seal
```

R2.4-C remains held until a genuine PR3 terminal transaction exists.

## 2. R2.4-A implementation

New owner:

```text
products/simcore/tooling/ci/pr1-dry-qualification.mjs
```

Existing permanent verifier owner strengthened:

```text
products/simcore/tooling/check.mjs
```

New gate:

```text
GATE_PR1_DRY
```

Trigger:

```text
PR_MAIN
AND PR diff contains exactly one changed
products/simcore/releases/candidate-requests/*.json
```

The dry qualifier receives the already-observed production commit from the existing SimCore CI production identity and the exact PR base/head identities.

It then:

1. resolves the changed candidate request from the exact PR head commit;
2. writes that request only into an ephemeral temp file;
3. calls the canonical candidate materializer with `mode: verify`;
4. therefore uses the same single-file builder temp packaging as Generic Candidate;
5. runs the request's candidate-specific verification suite against the generated dry runtime bytes;
6. reports `EPHEMERAL_QUALIFICATION_ONLY`;
7. deletes its temporary request/report workspace.

The canonical materializer remains the implementation owner of builder isolation and candidate regression execution. R2.4 does not maintain a second packaging simulation.

## 3. Authority boundary

The PR1 dry lane may only PASS or FAIL existing PR1 Verify earlier.

It does not create or mutate:

```text
candidate refs
candidate commits
candidate receipts
spec shadows
release IDs
approval records
main release state
release-simcore
publisher state
GitHub issues
```

The dry tool contains no publisher, repo-main writer, issue mutation, production ref mutation, or polling authority.

Canonical durable authority remains:

```text
Generic Candidate → durable candidate/receipt/spec-shadow
Exact Approval → authorization
Permanent Release → sole production publisher
```

A PR1 dry PASS is never a release receipt and never authorizes publication.

## 4. R2.4-B semantic assertion discipline

Permanent regression added:

```text
preflight-compression
```

Files:

```text
products/simcore/tests/suites/preflight-compression.test.mjs
products/simcore/tests/fixtures/preflight-compression/case.json
products/simcore/tests/registry.mjs
```

The suite permanently replays the v0.64.10 authoring failure classes.

### Valid control

A self-contained single-file builder passes dry qualification with:

```text
authority = EPHEMERAL_QUALIFICATION_ONLY
productionMutation = NONE
candidateDisposition = WOULD_CREATE
remote candidate ref = ABSENT
```

### Sibling packaging negative control

A builder that imports a sibling helper available in the source commit but unavailable in the canonical single-file temp package must fail with:

```text
CANDIDATE_BUILDER_FAILED
```

This reproduces the v0.64.10 attempt-01 packaging failure before PR merge.

### Candidate regression negative control

A builder that succeeds while the candidate-specific verification suite fails must fail dry qualification with:

```text
CANDIDATE_REGRESSION_FAILED
```

This reproduces the class of failure that previously appeared only after candidate transaction start.

### Semantic Host API assertion replay

The existing v0.64.10 authoritative Host-local wrapper is explicitly checked for scoped semantic surfaces:

```text
one capability guard
one awaited acquisition call
bounded telemetry-module Host API surface
```

The regression rejects a return to a whole-source Host API count as the authority for that contract.

No AST/parser framework was introduced.

## 5. R2.4-C hold preserved

Machine status and permanent regression require:

```text
R2_4_C_DIRECT_PREDECESSOR_TERMINAL_DEBT_SEAL
= DESIGN_BOUNDED_IMPLEMENTATION_HELD_FOR_REAL_PR3
```

No predecessor auto-close, chain walk, fourth clean-path PR, successor blocker, or fabricated terminal evidence was added.

Issue `#691` remains WATCH / NON_BLOCKING.

## 6. Stability and simplicity

Frozen operating costs remain:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal closure when HUMAN_EVIDENCE / PR3 is required
0 user manual pre-live GitHub operations
1 publisher
0 new clean-path PR
0 new clean-path lifecycle gate
0 polling
0 issue automation controller
```

R2.4 adds computation only on release-authoring PR1s that change a candidate request. Docs/admin PRs do not run the dry gate.

The existing permanent `Verify / Required` pair remains the PR gate; R2.4 does not add a third required job or workflow authority.

## 7. Runtime / resource audit

Audit lens: memory growth, CPU/freeze, race/async behavior, resource lifecycle, hidden retries, retained objects, storage/network authority.

Result before PR:

```text
BLOCKER = NONE
FIX = NONE runtime
WATCH = NONE requiring implementation
```

Relevant observations:

- dry qualification is CI-only and cannot execute in the SimCore host runtime;
- no plugin/runtime bytes are changed;
- no timers, observers, DOM hooks, network polling, storage loops, or background retry loops are introduced;
- temp request/report directory is removed in `finally`;
- canonical candidate materializer already removes its detached worktree/temp builder directory in `finally`;
- subprocesses are bounded by explicit timeouts and bounded buffers;
- candidate source/body is not added to a durable R2.4 report;
- remote access from dry materialization is read-only candidate-ref observation inherited from canonical `mode=verify` behavior;
- no remote candidate ref is created by the dry lane.

One pre-PR harness anchor issue was found and closed before review:

```text
FIX / TEST_HARNESS_ANCHOR / NON_RUNTIME / CLOSED_PREMERGE
```

The first semantic-order assertion could have matched the version fallback `runBaseSuite(ctx)` call rather than the post-semantic compatibility call. The permanent regression now anchors the exact `const base = await runBaseSuite(` call.

## 8. Files changed by R2.4 implementation

Implementation set:

```text
products/simcore/tooling/ci/pr1-dry-qualification.mjs
products/simcore/tooling/check.mjs
products/simcore/tests/suites/preflight-compression.test.mjs
products/simcore/tests/fixtures/preflight-compression/case.json
products/simcore/tests/registry.mjs
products/simcore/releases/R_V2_4_PREFLIGHT_COMPRESSION_STATUS.json
docs/SIMCORE_RELEASE_SYSTEM_V2_4_PREFLIGHT_COMPRESSION_IMPLEMENTATION_EVIDENCE.md
```

Explicitly absent:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore mutation
new workflow
new publisher
new approval step
new issue controller
```

## 9. First permanent CI qualification

Implementation PR:

```text
#701
```

First exact implementation head:

```text
72a63c31fd3589db60cfcd9a445a0ce3286947d1
```

Authoritative SimCore CI:

```text
run 33148724793
Verify 98775518797 = PASS
Required 98775593764 = PASS
```

This run included the new registered `preflight-compression` suite through the existing permanent verifier path.

Machine status therefore advances to:

```text
IMPLEMENTED_A_B_PERMANENT_CI_QUALIFIED_C_HELD_FOR_REAL_PR3
```

A/B are mechanically qualified. R2.4-C remains unimplemented by design.

## 10. Final-head rule

The CI evidence sync itself changes the PR head, so the final evidence-bearing head must pass the same SimCore `Verify / Required` pair again before merge.

Operational proof that `GATE_PR1_DRY` catches a defect on a future genuine runtime release PR remains a later real-use feedback item under the continuous feedback loop. It is not publication authority and is not a prerequisite for R2.4 mechanical activation.

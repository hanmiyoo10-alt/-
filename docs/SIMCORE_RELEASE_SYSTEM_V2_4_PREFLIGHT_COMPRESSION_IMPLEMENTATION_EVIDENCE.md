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

Originally not implemented in the 2026-08-28 R2.4 activation:

```text
R2.4-C direct-predecessor terminal debt seal
```

That original hold is preserved as historical evidence. A 2026-09-21 addendum now activates one explicit historical administrative seal for #660 after genuine PR3 and later terminal-convergence shapes became durable. This does not retroactively change the original implementation result.

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

## 5. R2.4-C hold history and 2026-09-21 activation

The 2026-08-28 implementation correctly held R2.4-C because a genuine PR3 shape had not yet been observed:

```text
R2_4_C_DIRECT_PREDECESSOR_TERMINAL_DEBT_SEAL
= DESIGN_BOUNDED_IMPLEMENTATION_HELD_FOR_REAL_PR3
```

Later repository history now contains genuine terminal/admin transactions (#755, #796/#801/#803 and later R2.8 terminal convergence). The original absence-of-PR3 rationale is therefore superseded, not erased.

Current activation is narrower than generalized backfill:

```text
R2_4_C_DIRECT_PREDECESSOR_TERMINAL_DEBT_SEAL
= HISTORICAL_ADMIN_SEAL_PROVEN_06409
```

The capability is authorized for exactly #660 / v0.64.9 in:
`docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md`.

The administrative PR remains non-runtime and one-item-only. It does not auto-close #660; merge plus post-merge reobservation plus the unchanged pure R2.3 closure evaluator remain mandatory.

No chain walk, fourth clean-path PR, successor blocker, fabricated terminal evidence, publisher, polling, issue controller, runtime mutation, or release-simcore mutation is added.

Issue `#691` remains WATCH because #679 and #704 remain separate unresolved debt instances.

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

## 11. Historical administrative seal activation — 2026-09-21

Activation packet: `#2708`.

Exact debt item:

```text
issue = 660
release = 0.64.9
terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
humanEvidenceAccepted = true
humanEvidenceRef = docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md
directSuccessor = #679 / 0.64.10
historicalProductionCommit = 1c1037e44d6b3e903b3d622b579095b1f315758e
historicalProductionBlob = 7d2731d256b8aa18598c389fd919550cf3bbf146
```

The seal is repository-only. It changes no release intent, candidate, approval, publisher, runtime artifact, release-simcore ref, current production identity, or clean release path.

The unchanged R2.3 closure evaluator remains the sole close-eligibility classifier. Before the administrative PR merges, `terminalClosurePrMerged=false` and #660 is not close-eligible. After merge, closure still requires protected-main reobservation, current production-authority reobservation, presence of the exact seal evidence ref, and an evaluator result of `closeEligible=true`.

#679 and #704 are intentionally not included. Their debt remains owned by #691 and requires separate fresh authority.


## 12. Cleanup-32 — second one-item historical admin seal

Cleanup-31 #2708 proved the first historical administrative seal for #660 without changing runtime, release-simcore, publication authority, or the unchanged R2.3 closure evaluator.

Cleanup-32 #2712 reuses that proven path for exactly one additional debt item:

```text
work item = #679
release = v0.64.10
terminal disposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
HUMAN_EVIDENCE = docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md
direct successor = #704 / v0.64.11
seal evidence = docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06410_2026-09-21.md
```

The first #660 proof remains immutable. Machine status therefore preserves the existing `historicalAdminSeal` compatibility projection for #660 and introduces an append-only `historicalAdminSeals[]` ledger.

The ledger records separate transactions, not one multi-item PR:
- entry 0 = previously proven #660 seal;
- entry 1 = #679 seal from Cleanup-32;
- each entry retains `maxDebtItems = 1`;
- #704 is not a seal target in this transaction.

The #679 seal remains non-close-eligible before merge. Merge plus protected-main reobservation, current production-authority reobservation, presence of the exact seal document, and `closeEligible=true` from the unchanged R2.3 evaluator remain mandatory before native closure.

No chain walk, automatic issue closer, publisher, polling, runtime mutation, release-simcore mutation, or clean-path PR-count change is introduced.


## 13. Cleanup-33 — third one-item historical admin seal

Cleanup-33 #2715 applies the proven historical-seal mechanism to #704 / v0.64.11 with a different supported R2.3 terminal disposition:

```text
SUPERSEDED
```

This is intentionally not a failed-live handoff classification.

v0.64.11 durable evidence proves:
- `COMPACT_V2 <= 16,384`: PASS / LIVE PROVEN;
- real `HOST_LOCAL WRITTEN`: PASS / LIVE PROVEN;
- the remaining blocker was `06411_RUNTIME_IDENTITY_SPLIT`.

The next genuine release deliberately absorbed that identity/reload slice into v0.65.0 rather than opening a separate v0.64.x repair.

Frozen successor transaction:

```text
successorRelation = DIRECT_RELEASE_TRANSACTION
successorReleaseVersion = 0.65.0
successorImplementationPr = 721
successorReleaseId = simcore-v0.65.0-new-05
successorProductionCommit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
successorProductionBlob = 1b38e2b2874f2581edae8f1080edc39558febefa
successorTerminalClosurePr = 755
```

The successor Subgate A evidence explicitly proves the carried identity + durable reload-handoff slice and states that the previous v0.64.11 runtime identity split is closed by the real v0.65.0 episode.

The R2.4 historical ledger therefore preserves:
- entry 0: #660 / v0.64.9;
- entry 1: #679 / v0.64.10;
- entry 2: #704 / v0.64.11 / SUPERSEDED.

Each entry still represents one separately reviewed administrative PR with `maxDebtItems = 1`.

The first `historicalAdminSeal` compatibility projection remains #660.

The unchanged R2.3 evaluator remains the sole close-eligibility classifier. For SUPERSEDED, the required terminal evidence input is `durableTerminalEvidence=true`; before the seal PR merges, `terminalClosurePrMerged=false` keeps #704 non-close-eligible.

No runtime, publication, release-simcore, polling, chain-walk, issue-controller, or clean-path PR-count change is introduced.

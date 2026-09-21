# SimCore R2.4-C Historical Terminal Debt Seal — v0.64.11

Date: 2026-09-21 KST
Tracking: #2715 / #691 / #704
Classification: `HISTORICAL_ADMIN_SEAL / NON_RUNTIME / ONE_ITEM_ONLY`
Candidate state: `NOT_CLOSE_ELIGIBLE_BEFORE_MERGE_AND_POSTMERGE_REOBSERVATION`

## Purpose

This record freezes exactly one historical release-work-item terminal debt item for v0.64.11 without changing runtime or release authority.

It does not claim v0.64.11 LIVE_PASS.

The v0.64.11 compaction and Host-local write objectives were already live-proven. The remaining runtime-identity / reload-adoption slice was intentionally carried into the direct successor v0.65.0 release transaction, where that slice was later proven and terminally closed.

The previously proven #660 and #679 seals remain independently durable and are not rewritten by this transaction.

## Frozen debt item

```text
workItemIssue = 704
releaseVersion = 0.64.11
terminalDisposition = SUPERSEDED
durableTerminalEvidence = true
predecessorProductionCommit = 7765ad75359f8d9736a7dea65141e4e45b713c10
predecessorProductionBlob = cb2fe57da379f9b552f05d0f33eae9cffe498e52
```

## v0.64.11 durable terminal evidence

Primary evidence:

- `docs/SIMCORE_LIVE_06411_PRE_REFRESH_COMPACTION_PASS_RUNTIME_IDENTITY_SPLIT_2026-08-28.md`

That evidence proves:

```text
COMPACT_V2 <= 16,384 = PASS / LIVE PROVEN
HOST_LOCAL WRITTEN = PASS / LIVE PROVEN
06411_RUNTIME_IDENTITY_SPLIT = BLOCKER / SOURCE CONFIRMED
```

The v0.64.11 primary compaction/write objective is therefore not an unresolved runtime defect.

## Direct successor release transaction

The remaining identity/reload acceptance slice was deliberately absorbed into the next genuine combined release.

```text
successorRelation = DIRECT_RELEASE_TRANSACTION
successorReleaseVersion = 0.65.0
successorImplementationPr = 721
successorReleaseId = simcore-v0.65.0-new-05
successorProductionCommit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
successorProductionBlob = 1b38e2b2874f2581edae8f1080edc39558febefa
successorTerminalClosurePr = 755
```

Durable successor evidence:

- `docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`
- `docs/SIMCORE_LIVE_06500_SUBGATE_A_RELOAD_ADOPTION_2026-08-28.md`

The packaging decision explicitly moves Runtime Identity Convergence into v0.65.0.

The live evidence later proves:

```text
06500_SUBGATE_A_IDENTITY_AND_DURABLE_RELOAD_HANDOFF
= PASS / LIVE PROVEN
```

including:
- exact v0.65.0 identity;
- COMPACT_V2 below 16,384;
- HOST_LOCAL WRITTEN;
- same-tab refresh;
- new generation;
- ADOPTED via host-local;
- one-shot boot CONSUMED;
- second same-generation request resumed normal observation.

The evidence explicitly records:

`The previous v0.64.11 runtime identity split is closed by the real v0.65.0 episode.`

v0.65.0 later reached full terminal closure in PR #755.

## Why the disposition is SUPERSEDED

This is not a `LIVE_FAIL_HANDOFF_TO_NEW_RELEASE` seal.

v0.64.11 already proved the runtime work it was introduced to repair:
- bounded COMPACT_V2 export;
- successful Host-local write.

The remaining acceptance slice was intentionally replaced by the v0.65.0 identity-converged release transaction and was then live-proven there.

Therefore the truthful terminal disposition for #704 is:

```text
SUPERSEDED
```

No v0.64.11 LIVE_PASS is manufactured.

## Administrative seal semantics

Before merge:

```text
terminalClosurePrMerged = false
closeEligible = false
```

After merge to protected main, this record may satisfy the historical equivalent of `terminalClosurePrMerged` for #704 only.

For `SUPERSEDED`, the unchanged R2.3 evaluator requires:

```text
durableTerminalEvidence = true
terminalClosurePrMerged = true
mainTerminalStateReobserved = true
productionIdentityReobserved = true
workItemClosureEvidenceRefPresent = true
```

The evaluator, not this document alone, decides close eligibility.

## One-item boundary

Maximum historical debt carried by this administrative PR:

```text
1
```

The one item is #704.

#660 and #679 remain prior completed historical seals.

This record does not discover successor history dynamically. It freezes one exact direct successor release transaction already established by durable repository evidence.

## Authority preservation

This seal performs no:

- `release-simcore` mutation;
- plugin/runtime-byte mutation;
- publication or republishing;
- v0.64.11 LIVE_PASS fabrication;
- historical evidence rewriting;
- automatic issue closure;
- issue controller, polling, daemon, or chain walk;
- label-based authority;
- current-production identity change;
- R2.3 closure-policy mutation.

The clean release path remains unchanged at 2 PRs to LIVE_PENDING and 3 PRs through normal terminal closure.

## Postmerge acceptance

#704 may be close-synced only after:

1. this record is present on exact protected merged main;
2. SimCore Required passes for that merge;
3. current production authority is reobserved coherent and unchanged by the seal;
4. all three durable terminal evidence refs remain source-backed;
5. the frozen v0.64.11 and v0.65.0 identities remain source-backed;
6. the unchanged pure closure evaluator returns `closeEligible=true`;
7. #691 is synchronized before native closure.

Until then:

```text
#704 = OPEN
#691 = WATCH
```

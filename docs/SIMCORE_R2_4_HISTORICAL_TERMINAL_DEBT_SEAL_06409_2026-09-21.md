# SimCore R2.4-C Historical Terminal Debt Seal — v0.64.9

Date: 2026-09-21 KST
Tracking: #2708 / #691 / #660
Classification: `HISTORICAL_ADMIN_SEAL / NON_RUNTIME / ONE_ITEM_ONLY`
Candidate state: `NOT_CLOSE_ELIGIBLE_BEFORE_MERGE_AND_POSTMERGE_REOBSERVATION`

## Purpose

This record freezes one historical release-work-item terminal debt item without changing runtime or release authority.

It does not claim v0.64.9 LIVE_PASS. It records the already accepted failed-live handoff and provides the durable repository evidence shape that may count as the historical administrative terminal-closure transaction only after this record is merged to protected main.

## Frozen debt item

```text
workItemIssue = 660
releaseVersion = 0.64.9
terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
humanEvidenceAccepted = true
humanEvidenceRef = docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md
humanEvidenceCommit = aa94f6dddcd0ccfcfe64da1b5c49752878cd08b9
directSuccessorIssue = 679
directSuccessorVersion = 0.64.10
```
## Historical production identity

The v0.64.9 published production identity carried into the successor handoff is frozen as historical lineage:

```text
predecessorProductionCommit = 1c1037e44d6b3e903b3d622b579095b1f315758e
predecessorProductionBlob = 7d2731d256b8aa18598c389fd919550cf3bbf146
```

These values are historical evidence only. Current production remains independently owned by `product-manifest.json` and `release-simcore`; this record cannot make v0.64.9 current again.

## Accepted terminal evidence

The accepted real long-chat result for v0.64.9 is:

```text
06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT
= LIVE FAIL / CLASSIFIED BEFORE REFRESH
```

The root-resolution objective itself was live-proven, but neither authorized sessionStorage root was usable in the observed host. The release therefore handed the continuity repair to v0.64.10 rather than manufacturing a positive refresh result.

## Administrative seal semantics

This repository-only PR is outside the clean runtime-release PR sequence.

Before merge:
```text
terminalClosurePrMerged = false
closeEligible = false
```
After merge to protected main, this record may satisfy the historical equivalent of `terminalClosurePrMerged` for #660 only.

Closure still requires fresh post-merge evidence:

```text
mainTerminalStateReobserved = exact seal record durable on merged protected main
productionIdentityReobserved = current production authority coherent + historical predecessor identity preserved
workItemClosureEvidenceRefPresent = this exact merged document exists
```

Only after those facts are observed may the unchanged R2.3 pure evaluator be supplied:

```text
terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
humanEvidenceAccepted = true
terminalClosurePrMerged = true
mainTerminalStateReobserved = true
productionIdentityReobserved = true
workItemClosureEvidenceRefPresent = true
```

The evaluator, not this document alone, decides close eligibility.

## Hard boundaries

This seal performs no:

- `release-simcore` mutation;
- plugin/runtime-byte mutation;
- publication or republishing;
- LIVE_PASS fabrication;
- HUMAN_EVIDENCE rewriting;
- automatic issue closure;
- issue controller, polling, daemon, or chain walk;
- label-based authority;
- current-production identity change;
- R2.3 closure-policy mutation.
Maximum historical debt carried by this administrative PR:

```text
1
```

The one item is #660. #679 and #704 remain unresolved separate debt items under #691 and are not sealed by this record.

## Authority preservation

The clean release path remains:

```text
PR1
→ candidate
→ PR2
→ publication / LIVE_PENDING
→ HUMAN_EVIDENCE
→ PR3
→ post-merge reobservation
→ close
```

This one-time historical administrative seal does not add a clean-path PR and does not change the target of 2 PRs to LIVE_PENDING or 3 PRs through normal terminal closure.

## Postmerge acceptance

#660 may be close-synced only after:

1. this record is present on exact protected merged main;
2. SimCore Required passes for that merge;
3. current production authority is reobserved coherent and unchanged by the seal;
4. the frozen v0.64.9 lineage remains source-backed;
5. the unchanged pure closure evaluator returns `closeEligible=true`;
6. #691 is updated while #679/#704 remain open.

Until then:

```text
#660 = OPEN
#691 = WATCH
```

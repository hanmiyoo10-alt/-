# SimCore R2.4-C Historical Terminal Debt Seal — v0.64.10

Date: 2026-09-21 KST
Tracking: #2712 / #691 / #679
Classification: `HISTORICAL_ADMIN_SEAL / NON_RUNTIME / ONE_ITEM_ONLY`
Candidate state: `NOT_CLOSE_ELIGIBLE_BEFORE_MERGE_AND_POSTMERGE_REOBSERVATION`

## Purpose

This record freezes exactly one additional historical release-work-item terminal debt item without changing runtime or release authority.

It does not claim v0.64.10 LIVE_PASS. It records the already accepted failed-live handoff and provides the durable repository evidence shape that may count as the historical administrative terminal-closure transaction only after this record is merged to protected main.

The previously proven #660 seal remains independently durable and is not rewritten by this transaction.

## Frozen debt item

```text
workItemIssue = 679
releaseVersion = 0.64.10
terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
humanEvidenceAccepted = true
humanEvidenceRef = docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md
humanEvidenceCommit = 3baf4b7e349f2f97c2c669f40eae1a7a12d3112b
directSuccessorIssue = 704
directSuccessorVersion = 0.64.11
```

## Historical production identity

The v0.64.10 published production identity carried into the successor handoff is frozen as historical lineage:

```text
predecessorProductionCommit = e43ace74241984f21f69299eff690d0c4f483381
predecessorProductionBlob = b7d76bd03a435356eeea6948968b0d33ac564ae7
```

These values are historical evidence only. Current production remains independently owned by `product-manifest.json` and `release-simcore`; this record cannot make v0.64.10 current again.

## Accepted terminal evidence

The accepted real long-chat result for v0.64.10 is:

```text
06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
= LIVE FAIL / CLASSIFIED BEFORE REFRESH
```

The Host-local API/store surface was LIVE PROVEN, but the real production telemetry capsule exceeded the frozen 16,384-character bound before a valid Host-local write/refresh acceptance point was reached.

The next repair moved to #704 / v0.64.11 Bounded Telemetry Capsule Compaction.

## Administrative seal semantics

This repository-only PR is outside the clean runtime-release PR sequence.

Before merge:

```text
terminalClosurePrMerged = false
closeEligible = false
```

After merge to protected main, this record may satisfy the historical equivalent of `terminalClosurePrMerged` for #679 only.

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

## One-item boundary

Maximum historical debt carried by this administrative PR:

```text
1
```

The one item is #679.

#660 remains the previously completed historical seal.
#704 is a direct successor reference only and remains unresolved/open.

## Authority preservation

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

The clean release path remains unchanged at 2 PRs to LIVE_PENDING and 3 PRs through normal terminal closure.

## Postmerge acceptance

#679 may be close-synced only after:

1. this record is present on exact protected merged main;
2. SimCore Required passes for that merge;
3. current production authority is reobserved coherent and unchanged by the seal;
4. the frozen v0.64.10 lineage remains source-backed;
5. the unchanged pure closure evaluator returns `closeEligible=true`;
6. #691 is updated while #704 remains open.

Until then:

```text
#679 = OPEN
#704 = OPEN
#691 = WATCH
```

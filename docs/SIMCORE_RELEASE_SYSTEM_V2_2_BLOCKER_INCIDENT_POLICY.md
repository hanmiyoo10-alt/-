# SimCore Release System v2.2 — Blocker Incident Policy

Date: 2026-08-28 KST
Status: **IMPLEMENTED POLICY · NON-RUNTIME · NO NEW CLEAN-PATH GATE**
Parent design: `docs/SIMCORE_RELEASE_SYSTEM_V2_2_CLOSURE_INTEGRITY_DESIGN.md`

## Purpose

This policy closes the R2.1 feedback where one GitHub issue represented both a release-system defect and the still-blocked release transaction, then closed as soon as the repair PR merged.

R2.2 keeps the simpler default of **one release-blocker issue**. It does not require a second defect/incident issue for every failure.

## Lifecycle

The truthful default lifecycle is:

```text
BLOCKER_ACTIVE
→ DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ RECOVERED / PRODUCTION_REOBSERVED
→ CLOSED
```

A repair merge fixes the defect. It does not by itself prove that the blocked release transaction has recovered.

## Repair PR wording

While the release incident is still open, a repair PR uses:

```text
Refs #<issue>
```

It does **not** use `Fixes #<issue>` or `Closes #<issue>` while publication/recovery evidence remains incomplete.

The issue should record the repair PR/merge and transition its meaning to:

```text
DEFECT_FIXED / RELEASE_RECOVERY_PENDING
```

## Closure evidence

For a pre-publication blocker whose work item still intends to reach LIVE_PENDING, full closure requires durable evidence for all of the following:

```text
recovery transaction preserved append-only
exact candidate / approval identity verified
permanent release succeeded
release-simcore production commit reobserved at expected candidate
latest.js == install.js reobserved
main LIVE_PENDING state converged
```

Only after those facts are true may the incident mean:

```text
RECOVERED / PRODUCTION_REOBSERVED
```

and become eligible for `CLOSED`.

A cancelled or rolled-back work item may terminate differently, but only with an explicit durable terminal disposition and evidence. An unrecorded cancellation is not closure authority.

## v0.64.8 historical replay

The first genuine R2.1 release supplies the regression case:

```text
simcore-v0.64.8-new-01
→ approval activation blocked before production
→ #631 repair merged
→ DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ simcore-v0.64.8-intent-02
→ simcore-v0.64.8-new-02
→ approval PR #636
→ Permanent Release run 33086543601 SUCCESS
→ release-simcore f5e29464452728f859a1a6a8191a846468353531
→ latest.js == install.js == bed3d5faff9641071cdd9003b67c45d42b3e32ee
→ LIVE_PENDING dbaa095df47b0293a39283c9664fefa1feafd756
→ RECOVERED / PRODUCTION_REOBSERVED
→ eligible for CLOSED
```

The important regression is that the incident is **not** fully closed at the #631 repair merge boundary.

## Simplicity boundary

This policy creates no new normal-path release transaction.

A clean release remains:

```text
PR1 product + release intent
→ generic candidate + machine receipt
→ PR2 delegated exact approval
→ permanent publication + LIVE_PENDING convergence
```

No new approval PR, workflow button, publisher, scheduled incident poll, issue-label publication dependency, or user confirmation is introduced.

The small policy module `products/simcore/tooling/release-blocker-incident-policy.mjs` is a pure decision helper used by permanent regression tests. It has no GitHub mutation, publication, network, timer, or polling authority.

## Observability boundary

Connected run IDs and transient logs remain supporting evidence only. If those observations are ambiguous, use durable transaction receipts, exact release identity, candidate/parent commits, observed `release-simcore`, and durable main release state as authority.

R2.2 does not add run-correlation machinery without evidence of a real wrong-run bind.

## Product boundary

This policy is non-runtime and does not alter the active SimCore product gate.

At implementation time the product remains v0.64.8 with:

```text
validation = PENDING_REAL_LONG_CHAT
live gate = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Human real-long-chat evidence remains required for LIVE_PASS.

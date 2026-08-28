# SimCore Release System v2.3 — Stability Seal Policy

Date: 2026-08-28 KST
Status: **IMPLEMENTED POLICY · NON-RUNTIME · REAL PR3 TERMINAL PROOF PENDING**
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_3_STABILITY_SEAL_DESIGN.md`
Tracking issue: `#673`
Runtime mutation from this policy: **NONE**
`release-simcore` mutation from this policy: **NONE**

## 1. Operating decision

R2.3 preserves the proven R2.2 release engine and stabilizes only the terminal work-item boundary.

The normal path remains:

```text
PR1 product + release intent
→ generic candidate + durable receipt
→ PR2 delegated exact approval
→ permanent publication + LIVE_PENDING convergence
→ user real-long-chat evidence
→ PR3 terminal evidence/admin closure
→ post-merge reobservation
→ work item closed
```

No new publisher, clean-path gate, user confirmation, polling loop, background authority, or issue-closing controller is introduced.

## 2. Canonical release work-item wording

Future runtime release work items with a required human live gate should use wording equivalent to:

> This work item remains open through implementation, candidate qualification, exact approval, permanent publication, production reobservation, LIVE_PENDING, and the required HUMAN_EVIDENCE / PR3 terminal disposition.

`LIVE_PENDING` is not a terminal work-item state.

## 3. Successful terminal closure contract

A successful runtime release work item becomes close-eligible only after all of the following are durable:

```text
LIVE_PENDING converged
HUMAN_EVIDENCE accepted
terminal closure PR / PR3 merged
main terminal LIVE_PASS state reobserved
production identity reobserved at the tested release
work-item closure evidence reference present
```

The post-PR3 reobservation is a close-step, not a fourth PR and not a publication gate.

No supplied real-world evidence means no `LIVE_PASS` and no successful work-item closure.

## 4. Explicit non-success terminal dispositions

The supported explicit terminal dispositions are:

```text
CANCELLED
ROLLED_BACK
SUPERSEDED
LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
```

`LIVE_FAIL_HANDOFF_TO_NEW_RELEASE` requires accepted human evidence because it is a real-live result.

`CANCELLED`, `ROLLED_BACK`, and `SUPERSEDED` require explicit durable terminal evidence instead of manufactured HUMAN_EVIDENCE.

All terminal dispositions still require the bounded terminal closure PR/admin transaction and post-merge durable reobservation before the work item is close-eligible.

A non-success close must never imply `LIVE_PASS`.

## 5. Repository labels are non-authority

Repository labels are convenience metadata only unless a higher authority explicitly changes that contract.

Labels such as `scope:unclassified` do not determine:

```text
release authorization
candidate identity
production parent
publisher selection
LIVE_PENDING truth
LIVE_PASS truth
work-item closure eligibility
```

The executable policy does not read labels when deciding close eligibility.

Do not implement classifier work solely to improve label cosmetics.

Escalation requires evidence that a label changed routing, authority, required verification, or lifecycle truth.

## 6. Durable evidence order remains unchanged

R2.3 preserves the R2.2 authority order:

```text
1. durable candidate/release receipt
2. exact releaseId / intent identity
3. exact candidate commit + parent + blob
4. observed release-simcore production identity
5. durable main manifest / release-state commit
6. workflow run IDs and transient logs as supporting evidence
7. convenience labels and UI projections
```

No polling or run-correlation machinery is added.

## 7. Relationship to R2.2 blocker incidents

R2.3 does not replace `release-blocker-incident-policy.mjs`.

R2.2 blocker semantics remain separately authoritative for exceptional blocked-release recovery:

```text
BLOCKER_ACTIVE
→ DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ RECOVERED / PRODUCTION_REOBSERVED
→ CLOSED
```

R2.3 owns the normal release work-item terminal seal. R2.2 owns blocker-incident closure truth.

## 8. Executable owner

Pure bounded owner:

`products/simcore/tooling/release-work-item-closure-policy.mjs`

The module may evaluate close eligibility and reject premature closure claims.

It has no publisher, network, repository writer, timer, polling, workflow-dispatch, issue-close, or plugin runtime authority.

Permanent regression owner:

`products/simcore/tests/suites/stability-seal.test.mjs`

Required suite ID:

`stability-seal`

## 9. Current qualification boundary

R2.3 implementation can be permanent-CI qualified before the current v0.64.9 real live gate finishes, but genuine terminal operational proof remains pending until actual evidence provides:

```text
HUMAN_EVIDENCE terminal disposition
PR3 terminal closure shape
post-merge main terminal state reobservation
production identity reobservation
#673 closure evidence
```

Synthetic/permanent regression proof must not be mislabeled as genuine v0.64.9 HUMAN LIVE_PASS proof.

## 10. Preserved cost and safety

```text
steady-state PRs to LIVE_PENDING = 2
steady-state PRs through terminal closure = 3
user manual pre-live GitHub actions = 0
new publisher = 0
new clean-path gate = 0
new polling = 0
new issue automation controller = 0
runtime mutation = NONE
release-simcore mutation = NONE
```

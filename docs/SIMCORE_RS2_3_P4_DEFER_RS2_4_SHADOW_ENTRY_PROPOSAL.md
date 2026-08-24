# SimCore RS2-3 P4 Defer / RS2-4 Shadow-Entry Proposal

Date: 2026-08-24
Status: **PROPOSED AMENDMENT · DESIGN ONLY · NON-RUNTIME**
Scope: SimCore Release System v2 sequencing only

## 1. Problem

RS2-3 permanent CI is installed, shadow-verified, and currently recorded as `PROMOTION_READY`, while GitHub-level required-check enforcement for `main` remains administratively unapplied.

Current machine state intentionally remains:

```text
requiredCiActive              = false
requiredCiEnforcementVerified = false
rs2_3Closed                   = false
rs2_4EntryAuthorized          = false
nextPromotionStep             = P4_CONFIGURE_REQUIRED_CHECK_ENFORCEMENT
```

The existing RS2-3E contract correctly forbids claiming repository enforcement when no branch protection or repository ruleset is active.

However, the absence of repository-level merge enforcement does not prevent implementation of the already-frozen RS2-4 release transaction in a non-authoritative/shadow state.

## 2. Key distinction

Two different safety properties must remain separate:

```text
MAIN_MERGE_ENFORCEMENT
= GitHub blocks ordinary merges to main while SimCore CI / Required is pending/failing

RELEASE_PUBLICATION_ENFORCEMENT
= permanent SimCore release controller refuses to move release-simcore unless
  identity-bound CANDIDATE_REQUIRED(C,P) passes and publication preconditions remain valid
```

RS2-3 P4/P5 prove the first property.

RS2-4C is designed to establish the second property authoritatively inside the release transaction.

They overlap in defense-in-depth but are not the same authority boundary.

## 3. Proposed sequencing change

Do not falsely close RS2-3 and do not mark P4 complete.

Instead permit the following implementation sequence:

```text
RS2-3
  phaseStatus = PROMOTION_READY
  P4 = DEFERRED_ADMIN_HARDENING
  requiredCiActive = false
  requiredCiEnforcementVerified = false
  rs2_3Closed = false
  rs2_4EntryAuthorized = false

        ↓ implementation-only handoff

RS2-4 shadow implementation
  release spec tooling
  candidate materialization
  permanent release controller
  CANDIDATE_REQUIRED(C,P) invocation
  immutable publication-plan construction
  production-parent recheck
  fast-forward publish logic exercised only in shadow/non-writing mode
  post-publish verifier exercised against synthetic or historical identities

        ↓ evidence review

Activation decision
  A. complete RS2-3 P4/P5 and then promote RS2-4 normally
  OR
  B. approve a separate amendment that reclassifies GitHub main enforcement as
     deferred governance hardening while release-controller enforcement becomes
     the production activation gate
```

Option B is not authorized by this proposal. It requires explicit evidence-backed design approval after RS2-4 shadow implementation exists.

## 4. Why implementation can proceed safely

RS2-4C already freezes the permanent controller around this invariant:

```text
verify immutable authorization tuple
→ obtain identity-bound permanent CI PASS for C/P
→ recheck actual production parent
→ ordinary fast-forward release-simcore P → C
→ verify published identity
```

The controller's authoritative verifier profile is:

```text
CANDIDATE_REQUIRED
```

A pre-merge PR PASS is explicitly non-authoritative for release publication; the publisher re-runs the required candidate verification after authorization lands on main.

Therefore RS2-4 implementation can be built and tested without granting it production publication authority.

## 5. Hard safety boundary during shadow entry

Until an activation decision is explicitly approved:

```text
release-simcore mutation                 FORBIDDEN
plugins/simcore/latest.js mutation       FORBIDDEN
plugins/simcore/install.js mutation      FORBIDDEN
production version bump                  FORBIDDEN
actual release publication               FORBIDDEN
RS2_3_CLOSED=true                        FORBIDDEN
RS2_4_ENTRY_AUTHORIZED=true              FORBIDDEN
requiredCiActive=true                    FORBIDDEN
requiredCiEnforcementVerified=true       FORBIDDEN
```

RS2-4 implementation work may modify only release-system infrastructure, tooling, specs/contracts, tests, workflows in non-authoritative mode, and evidence documents.

## 6. Shadow implementation mode

The permanent release workflow must support a bounded mode that proves all pre-publication semantics while refusing the production write.

Suggested state:

```text
releaseAuthority = SHADOW_ONLY
publicationDisposition = WOULD_PUBLISH | WOULD_NOOP | BLOCKED
productionMutation = NONE
```

Shadow execution must still prove:

```text
authorization commit identity
release spec digest
candidate commit identity
expected production parent
latest/install shared blob
CANDIDATE_REQUIRED result
publication plan
candidate ancestry
allowed path diff
production-parent freshness
predicted fast-forward relation
post-publication expectations
```

It must stop before ref mutation.

## 7. P4 disposition during shadow entry

The current administrative gap is preserved, not erased.

Classification during this proposal:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= DEFER / ADMIN_HARDENING / NON_RUNTIME / NO_RELEASE_WRITE
```

This differs from the current frozen RS2-3E blocker only for **implementation sequencing**.

It does not yet change the final RS2-3 close criteria.

The existing P4/P5 documents remain authoritative for claims about actual `main` enforcement.

## 8. Entry criteria for RS2-4 shadow implementation

Required before starting:

```text
RS2-1 durable tests                        CLOSED
RS2-2 state synchronization                CLOSED
RS2-3 permanent CI                         PROMOTION_READY
permanent CI shadow equivalence            PASS
CANDIDATE_REQUIRED interface               READY
release-simcore production identity        known and unchanged
runtime semantic change in same work item  NONE
```

GitHub required-check enforcement is not required for shadow implementation because no production ref may move.

## 9. Work-item isolation

This sequencing proposal does not authorize mixing:

```text
release-system infrastructure
+
M2-3 runtime edit-reconcile implementation
```

M2-3 remains a separate runtime work item.

Likewise it does not mix repository-system refactors with a SimCore runtime feature release.

## 10. Evidence required before any activation amendment

Before Option B can even be considered, RS2-4 shadow proof must demonstrate at minimum:

```text
CANDIDATE_REQUIRED failure → WOULD_NOT_PUBLISH
candidate identity mismatch → WOULD_NOT_PUBLISH
production parent moved → WOULD_NOT_PUBLISH
candidate non-child → WOULD_NOT_PUBLISH
latest/install blob mismatch → WOULD_NOT_PUBLISH
unexpected candidate path diff → WOULD_NOT_PUBLISH
valid immutable tuple + PASS → WOULD_PUBLISH
NOOP_IDENTICAL → WOULD_NOOP
no force-update primitive present
shadow run mutates no production ref
```

Only after this evidence exists may the project decide whether GitHub main enforcement is a defense-in-depth governance control rather than a release activation prerequisite.

## 11. Recommended next move

Recommended immediate route:

```text
1. keep RS2_3_STATUS.json unchanged
2. leave P4 unapplied
3. implement RS2-4A/B/C in dedicated non-runtime branch
4. make all publisher execution shadow-only
5. collect identity/fail-close evidence
6. review activation architecture after evidence
```

This allows productive work now without lying about `main` protection and without weakening `release-simcore` safety.

## 12. Proposal status

```text
RS2-3 P4 enforcement              UNCHANGED / NOT APPLIED
RS2-3 machine close state         UNCHANGED
RS2-4 implementation              PROPOSED TO START IN SHADOW MODE
RS2-4 production authority        NOT AUTHORIZED
release-simcore mutation          NONE
runtime mutation                  NONE
```

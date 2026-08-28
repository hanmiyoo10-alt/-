# SimCore Release System v2.1 — v0.65.0 Operational Retrospective

Date: 2026-08-28 KST
Status: **FEEDBACK RECORDED · NON_RUNTIME · NO RELEASE-SIMCORE MUTATION · FOLLOW-UP FIXES NOT IMPLEMENTED HERE**
Scope: v0.65.0 `M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence` delegated release operation through successful `LIVE_PENDING`

## 1. Naming / scope clarification

This retrospective evaluates the release-operation system used for v0.65.0:

```text
M2-3   = product/runtime milestone
R2.1   = delegated-operator release experience/policy
RS2-4  = permanent release controller / publication authority layer
```

The user-facing pre-live flow is governed by R2.1. The final production mutation is performed only by the RS2-4 permanent publisher.

This document does not evaluate M2-3 live behavior. M2-3 remains subject to the ordered real-long-chat gate after publication.

## 2. Executive verdict

The v0.65.0 operation gives a split verdict:

```text
SAFETY / FAIL-CLOSED             = STRONG PASS
AUDIT / APPEND-ONLY RECOVERY     = STRONG PASS
DETERMINISTIC CANDIDATE IDENTITY = STRONG PASS
AUTOMATIC LIVE_PENDING SYNC      = PASS
USER MANUAL PRE-LIVE ACTIONS     = 0 / PASS
STEADY-STATE OPERATOR ERGONOMICS = NEEDS FIX
PRE-MERGE / ACTIVATION PARITY    = NEEDS FIX
```

The system repeatedly protected production correctly. Multiple real operator/repository mistakes were caught before publication, and `release-simcore` remained unchanged until the exact successful transaction.

However, two approval transactions passed their pre-merge PR checks and then failed only after merge at Exact Approval Activation because activation consumed transaction-envelope facts that PR CI had not made impossible to get wrong:

1. canonical approval PR title;
2. exact authorized spec path.

That is no longer best described as first-proof learning tax alone. The safety model is good, but the delegated operator surface still exposes avoidable string/path footguns.

Primary systemic follow-up:

```text
R2_1_PREMERGE_ACTIVATION_CONTRACT_PARITY_GAP
= FIX / RELEASE_SYSTEM / NON_RUNTIME / NON_BLOCKING_FOR_CURRENT_PUBLISHED_V0.65.0
```

The correct fix direction is to make the exact-approval PR pre-merge validation activation-equivalent for every non-publication invariant while retaining full post-merge activation revalidation.

## 3. Successful v0.65.0 release identity

Final successful append-only transaction:

```text
releaseId              = simcore-v0.65.0-new-05
candidate / production = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
previous production    = 7765ad75359f8d9736a7dea65141e4e45b713c10
release blob           = 1b38e2b2874f2581edae8f1080edc39558febefa
approval PR            = #737
approval merge         = 6297463049f3c942dad3b5d1951abda1290d1ffa
activation run         = 33173040284
permanent release run  = 33173049653
LIVE_PENDING commit    = 122287ce90de22d7bd3841c20ebb7e5fcf6e48c2
```

Production reobservation after publication:

```text
release-simcore head = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest.js version    = 0.65.0
install.js version   = 0.65.0
latest blob          = 1b38e2b2874f2581edae8f1080edc39558febefa
install blob         = 1b38e2b2874f2581edae8f1080edc39558febefa
latest == install    = PASS
```

Permanent Release completed:

```text
Resolve Permanent Authorization = PASS
Candidate Required / Verify     = PASS
Candidate Required / Required   = PASS
Publish Exact Candidate         = PASS
Declare Published State         = PASS
Permanent Release Required      = PASS
```

`main` converged automatically to v0.65.0 `PENDING_REAL_LONG_CHAT` with priority:

```text
06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT
```

## 4. What worked especially well

### F16. Real fail-closed behavior remained strong under multiple fault classes

During v0.65.0, publication was stopped before production mutation for three materially different classes of fault:

```text
architecture-contract transition mismatch
approval PR canonical-title mismatch
approval authorized-spec path mismatch
```

The successful transaction occurred only after all three were resolved through ordinary repository/release mechanisms.

At no point was direct `release-simcore` mutation used as a shortcut.

Classification:

```text
R2_1_MULTI_FAULT_FAIL_CLOSED_PROOF
= PASS / STRONG / GENUINE_RELEASE / NON_RUNTIME
```

### F17. Append-only recovery behaved correctly and preserved evidence

Failed release identities were not overwritten. Recovery advanced through new transaction identities rather than mutating old approval evidence in place.

Observed recovery family included:

```text
new-03
new-04
new-05
```

This made the causal history readable and prevented a failed authorization event from silently becoming a different event later.

Classification:

```text
R2_1_APPEND_ONLY_RECOVERY_V06500
= PASS / AUDITABLE / NON_RUNTIME
```

### F18. Runtime bytes remained deterministic across recovery transactions

The v0.65.0 candidate was rematerialized across recovery transactions while preserving the same release blob:

```text
1b38e2b2874f2581edae8f1080edc39558febefa
```

The recovery work changed release/admin state, not product runtime bytes.

This is a strong property because operator/release-system correction remained separable from runtime attribution.

Classification:

```text
R2_1_RECOVERY_RUNTIME_IDENTITY_STABILITY
= PASS / EXACT_BLOB_PRESERVED / NON_RUNTIME
```

### F19. Automatic LIVE_PENDING convergence worked cleanly after publication

The successful permanent run updated bounded administrative truth automatically:

```text
product-manifest production version/commit/blob
CURRENT_DEVELOPMENT production snapshot
CURRENT_DEVELOPMENT live gate
SIMCORE_GUIDELINES production baseline
release record for simcore-v0.65.0-new-05
```

No manual version/SHA copy step was required from the user.

Classification:

```text
R2_1_POST_PUBLISH_STATE_CONVERGENCE_V06500
= PASS / STEADY_STATE_VALUE_CONFIRMED / NON_RUNTIME
```

### F20. User manual pre-live GitHub action count remained zero

The user authorized the release work item once. The delegated operator performed the candidate, approval, merge, activation, publication, and durable state convergence without requiring a user GitHub button/merge/SHA action.

Classification:

```text
R2_1_DELEGATED_OPERATOR_USER_BOUNDARY_V06500
= PASS / USER_GITHUB_ACTIONS_0 / NON_RUNTIME
```

## 5. New system feedback

### F21. Canonical approval PR title is a hidden transaction input not fully guarded pre-merge

One approval PR used a human-composed title instead of the exact activation contract string.

The PR itself passed its normal pre-merge release checks, but Exact Approval Activation later rejected it because the required title is:

```text
SimCore exact release approval: <releaseId>
```

The important issue is not that activation rejected the title. That rejection is correct.

The issue is that an approval PR can become mergeable/green while carrying a transaction envelope that activation deterministically cannot accept.

Classification:

```text
R2_1_APPROVAL_TITLE_PREMERGE_PARITY_GAP
= FIX / RELEASE_SYSTEM / OPERATOR_ERGONOMICS / NON_RUNTIME
```

Recommended correction:

1. make exact approval PR CI validate the canonical title before merge;
2. have `release-approval-package.mjs` emit the canonical PR title as machine output;
3. operator tooling should consume that output rather than manually compose the title;
4. retain the same title check again after merge in activation.

The goal is not to weaken activation. The goal is to make a known-invalid approval impossible to merge as green.

### F22. Authorized spec path is also insufficiently guarded before activation

A later recovery approval placed the machine-derived authorized spec under the wrong directory family rather than the activation authority path:

```text
wrong family: products/simcore/releases/authorized-specs/...
required:     products/simcore/releases/specs/<releaseId>.json
```

Again, activation failed closed before permanent dispatch.

But the pre-merge surface had not made the invalid location impossible.

Classification:

```text
R2_1_APPROVAL_SPEC_PATH_PREMERGE_PARITY_GAP
= FIX / RELEASE_SYSTEM / OPERATOR_ERGONOMICS / NON_RUNTIME
```

Recommended correction:

- exact approval PR Verify should require exactly two changed files and exact canonical paths:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

- the same validation code/path derivation should be shared with activation rather than independently re-described;
- package materialization should produce/return the exact canonical destination paths.

### F23. Pre-merge approval validation should be activation-equivalent, except for publication

F21 and F22 are two symptoms of the same architectural gap.

Target pre-merge invariant set should include every fact that activation can know before merge:

```text
canonical PR title
exact two changed paths
approval schema
releaseId/path equality
candidate receipt existence and PASS
spec-shadow existence
candidate fetch ref identity
candidate C equality
production P equality
machine-derived authorized spec semantic equality
first/only authorization-touch constraints where checkable
RS2_4_RELEASE authority marker
```

Then activation should repeat these checks from the immutable merge event and only add post-merge-specific/event-specific checks plus dispatch.

Classification:

```text
R2_1_PREMERGE_ACTIVATION_CONTRACT_PARITY_GAP
= FIX / PRIMARY FOLLOW-UP / NON_RUNTIME
```

Important invariant:

```text
PRE-MERGE CHECK PARITY
!= remove post-merge revalidation
```

Both layers stay. The first catches operator mistakes early; the second protects authority after merge.

### F24. GitHub Actions rerun preserves the original event envelope

After the canonical-title failure, correcting the closed PR title and rerunning the failed activation did not repair the transaction because GitHub re-used the original event payload.

This is expected event semantics, but it is an operator-recovery trap if not surfaced clearly.

Classification:

```text
R2_1_IMMUTABLE_EVENT_ENVELOPE_RERUN
= WATCH / OPERATING_RULE / NON_RUNTIME
```

Recommended diagnostic guidance:

For transaction-envelope failures such as title/path/event identity, activation should emit an explicit message equivalent to:

```text
RERUN_NOT_REPAIRABLE
CREATE_NEW_APPEND_ONLY_TRANSACTION
```

This avoids spending an operator cycle on a rerun that cannot change the bound event evidence.

### F25. Two-PR steady-state target is not yet robustly achieved in ordinary delegated operation

The v0.64.8 retrospective kept the two-PR target because its extra cost was reasonably attributed to first-proof learning.

v0.65.0 again required multiple recovery transactions. Some overhead came from a real architecture-contract transition defect, but two additional failed approval activations came from operator-facing title/path requirements that the pre-merge green path did not fully encode.

Therefore the interpretation should tighten:

```text
2-PR steady-state target = still desirable
2-PR steady-state reliability = NOT YET PROVEN ROBUST
```

Classification:

```text
R2_1_STEADY_STATE_TWO_PR_RELIABILITY
= FIX / ERGONOMICS_AND_CONTRACT_PARITY / NON_RUNTIME
```

Do not collapse safety boundaries merely to reduce PR count. Reduce retries by moving deterministic activation failures earlier.

### F26. Architecture contract transition semantics were correctly caught but need explicit candidate/production dual-lane ownership

The v0.65.0 candidate physically introduced the `edit-reconcile` owner while current production v0.64.11 did not yet contain that physical module ownership state.

An initial architecture contract update promoted the module too eagerly, which then caused production-side architecture validation to report:

```text
missing required module definition(s): ['edit-reconcile']
```

The correct transition model kept the candidate dependency edge allowed while production-facing physical ownership remained publication-pending until the candidate became production.

Classification:

```text
SIMCORE_ARCH_CONTRACT_CANDIDATE_PRODUCTION_TRANSITION
= FIXED / DUAL_LANE_TRANSITION / KEEP REGRESSION / NON_RUNTIME
```

This is primarily an Architecture Contracts finding, not an R2.1 defect. R2.1 receives positive credit for refusing publication until the contract was coherent.

### F27. Ownership-scoped reading worked as intended during a real release incident chain

The ownership-scoped update workflow was first-used during this release operation.

Diagnosis expanded from the failing owner rather than defaulting to a full runtime reread:

```text
ARCH_CONTRACT_FAIL
→ architecture contract owner
→ transition semantics

approval activation failure
→ exact approval / activation owner
→ title/path/event-envelope contracts
```

The read boundary expanded when evidence required it, while the v0.65.0 runtime candidate bytes remained untouched during release-system recovery.

Classification:

```text
SIMCORE_OWNERSHIP_SCOPED_UPDATE_FIRST_USE
= PASS / EVIDENCE_DRIVEN_SCOPE_EXPANSION / FIRST_USE_PROVEN_PRELIVE
```

This does not yet prove that scoped reading will never miss a runtime interaction. The planned first-use live review should still record whether real long-chat evidence exposes an interaction that the bounded read graph failed to anticipate.

## 6. Recommended follow-up order

Do not mix these release-system changes into the current v0.65.0 runtime live-validation work item.

After the v0.65.0 product live gate is appropriately handled, use a separate non-runtime release-system task with this priority:

### FIX-1 — pre-merge activation contract parity

Highest value.

Implement one shared invariant resolver/checker used by both:

```text
exact approval PR Verify
Exact Approval Activation
```

PR Verify runs it in non-dispatch mode.
Activation reruns it against immutable merge-event truth before dispatch.

### FIX-2 — machine-owned approval PR envelope

Have the bounded package materializer output at least:

```text
releaseId
canonicalTitle
approvalPath
specPath
candidateReceiptPath
candidateFetchRef
```

The operator should not manually synthesize deterministic transaction strings/paths that the repository can derive itself.

### WATCH-1 — rerun recovery guidance

Add explicit diagnostics for immutable-event failures:

```text
rerun cannot repair this class
append-only new transaction required
```

### KEEP — fail-closed and append-only semantics

Do not weaken:

```text
exact C/P binding
Candidate Required
RS2_4_RELEASE marker
post-merge activation revalidation
single permanent publisher
fast-forward production mutation
latest == install
append-only failed transaction history
real-long-chat human evidence boundary
```

These are the parts that worked best.

## 7. Overall rating

Operationally, v0.65.0 shows a release system that is safer than it is smooth.

Qualitative scorecard:

```text
production safety              10/10
failure attribution             9/10
auditability / recovery         10/10
runtime identity preservation   10/10
automatic state convergence      9/10
user GitHub burden              10/10
operator pre-merge predictability 6/10
steady-state transaction UX      6/10
```

The right next move is not a large release-system rewrite.

The right move is a narrow parity repair:

```text
if activation can deterministically reject it before publication,
PR Verify should reject the same known-invalid transaction before merge whenever the needed evidence already exists.
```

That should preserve the current safety shell while removing most of the avoidable retry tax observed in v0.65.0.

## 8. Current disposition

```text
v0.65.0 production publication                 COMPLETE
v0.65.0 validation state                       PENDING_REAL_LONG_CHAT
R2.1 delegated operation to LIVE_PENDING       PASS
RS2-4 permanent publication authority          PASS
R2_1_PREMERGE_ACTIVATION_CONTRACT_PARITY_GAP   FIX
R2_1_APPROVAL_TITLE_PREMERGE_PARITY_GAP        FIX
R2_1_APPROVAL_SPEC_PATH_PREMERGE_PARITY_GAP    FIX
R2_1_IMMUTABLE_EVENT_ENVELOPE_RERUN             WATCH
R2_1_STEADY_STATE_TWO_PR_RELIABILITY            FIX
architecture transition finding                 FIXED / KEEP REGRESSION
ownership-scoped workflow first use              PASS / LIVE REVIEW STILL PENDING
```

No release-system implementation is performed by this retrospective. Any follow-up must be a separate non-runtime work item so it is not mixed with the current v0.65.0 product live-validation task.
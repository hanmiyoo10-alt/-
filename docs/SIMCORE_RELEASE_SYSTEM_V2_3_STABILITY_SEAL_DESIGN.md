# SimCore Release System v2.3 — Stability Seal

Date: 2026-08-28 KST
Status: **DESIGN RECORDED · NON-RUNTIME · IMPLEMENTATION NOT STARTED**
Predecessor: **Release System v2.2 — Closure Integrity · first clean runtime release path proven through LIVE_PENDING on v0.64.9**
Current product gate at design time: `06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Runtime mutation from this design: **NONE**
`release-simcore` mutation from this design: **NONE**

## 1. Purpose

Release System v2.3 is a stabilization-only follow-up to the first clean R2.2 runtime release path.

R2.2 already demonstrated the intended steady-state pre-live release path on v0.64.9:

```text
explicit release work item
→ PR1 product + release intent
→ generic candidate + durable machine receipt
→ PR2 delegated exact approval package
→ permanent publisher
→ automatic LIVE_PENDING convergence
```

Observed v0.64.9 clean-path cost:

```text
PRs to LIVE_PENDING = 2
recovery PRs = 0
user manual pre-live GitHub actions = 0
manual release-simcore mutation = 0
```

R2.3 does **not** redesign that path.

Its purpose is narrower:

```text
make clean release work-item closure wording unambiguous
+
make HUMAN LIVE_PASS / PR3 the explicit clean-release terminal boundary
+
keep repository labels and transient observability outside release authority
```

The design principle is:

> Stabilize by clarifying existing lifecycle boundaries, not by adding orchestration.

---

## 2. Evidence inputs

Primary evidence:

- `products/simcore/releases/R_V2_2_FIRST_CLEAN_RELEASE_FEEDBACK.json`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_2_FIRST_CLEAN_RELEASE_FEEDBACK_2026-08-28.md`
- v0.64.9 work item `#660`
- v0.64.9 product PR1 `#663`
- v0.64.9 exact approval PR2 `#664`
- permanent release run `33140598953`
- LIVE_PENDING state commit `c40e4ab434ee56300a91697d47f1ae43d9a217a7`

R2.2 clean-path feedback established:

```text
R2.2-A single current-state authority = clean release PASS
R2.2-B clean-path non-premature-close behavior = PASS
R2.2-B blocker recovery path = historical replay qualified, not re-exercised by v0.64.9
R2.2-C durable-evidence-first observability = WATCH remains appropriate
```

Two small non-runtime observations remain:

```text
WORK_ITEM_CLOSURE_WORDING
= WATCH / NON_RUNTIME / NON_BLOCKING

CONTROL_PLANE_SCOPE_LABEL_NOISE
= WATCH / NON_RUNTIME / NON_BLOCKING
```

Neither justifies a new controller, publisher, polling loop, approval step, or user action.

---

## 3. Non-negotiable current-system properties

R2.3 must preserve all of the following unchanged:

```text
explicit release work item required = YES
standing/background release authority = NO
assistant delegated operator to LIVE_PENDING = YES
user manual pre-live GitHub actions = 0
steady-state PRs to LIVE_PENDING = 2
steady-state PRs through HUMAN LIVE_PASS = 3
single permanent publisher = YES
exact production parent / candidate / blob binding = YES
Candidate Required = YES
production fast-forward only = YES
latest.js == install.js = YES
failed release transactions remain immutable = YES
recovery remains append-only = YES
post-publish state path cannot republish = YES
human real-long-chat evidence required for LIVE_PASS = YES
main = design/evidence/admin authority
release-simcore = runtime/deployment authority
R2.2 single current-state authority = preserved
R2.2 blocker incident closure policy = preserved
R2.2 durable-evidence-first observability = preserved
```

Rejected by design:

```text
new normal-path approval PR
new workflow button
new user confirmation step
new publisher
new background scheduler
new polling loop
new issue-state controller
release authority based on labels
LIVE_PASS inferred without human evidence
```

---

# 4. R2.3-A — Clean Release Work-Item Closure Contract

Classification:

```text
R2_3_A_CLEAN_RELEASE_WORK_ITEM_CLOSURE_CONTRACT
= STABILIZE / LIFECYCLE_WORDING / NON_RUNTIME
```

## 4.1 Problem

The v0.64.9 work item correctly remained open through publication and LIVE_PENDING convergence.

However its original body said it remains open through implementation, publication, production reobservation, and LIVE_PENDING convergence, while the later publication handoff correctly said it must remain open until HUMAN_EVIDENCE is supplied.

Those statements are not operationally unsafe, but they leave the terminal close boundary slightly ambiguous.

## 4.2 Single clean-release close rule

For a normal runtime release work item whose live gate is required:

```text
LIVE_PENDING
≠ work item closed
```

The work item remains open until the release reaches an explicit terminal human-evidence disposition.

Default successful terminal sequence:

```text
LIVE_PENDING
→ user real-long-chat evidence supplied
→ HUMAN_EVIDENCE accepted
→ PR3 LIVE_PASS closure merged
→ durable main LIVE_PASS state reobserved
→ work item eligible for CLOSED / COMPLETED
```

This rule applies to clean releases as well as releases that experienced recoverable pre-live incidents.

## 4.3 Failed/cancelled terminal dispositions

A work item may close without LIVE_PASS only when an explicit durable terminal disposition exists, for example:

```text
CANCELLED
ROLLED_BACK
SUPERSEDED
LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
```

A close action must never imply LIVE_PASS when the terminal result is not LIVE_PASS.

## 4.4 Work-item wording template

Future release work items should use wording equivalent to:

```text
This work item remains open through implementation, candidate qualification,
exact approval, permanent publication, production reobservation, LIVE_PENDING,
and the required HUMAN_EVIDENCE / PR3 terminal disposition.
```

Do not stop the sentence at LIVE_PENDING when the release requires a human live gate.

## 4.5 No new issue controller

R2.3-A is a wording + bounded policy stabilization.

Do not add automatic issue closing.

The existing operator close-step and durable evidence remain sufficient unless a real recurrence proves otherwise.

---

# 5. R2.3-B — HUMAN LIVE_PASS / PR3 Terminal Seal

Classification:

```text
R2_3_B_HUMAN_LIVE_PASS_PR3_TERMINAL_SEAL
= STABILIZE / CLOSURE_AUTHORITY / NON_RUNTIME
```

## 5.1 Purpose

R2.2 proved the two-PR path to LIVE_PENDING.

R2.3 makes the existing third clean-path PR boundary explicit without adding a fourth PR or new automation layer.

Canonical successful clean path remains:

```text
PR1 = product + release intent
PR2 = delegated exact approval
publication = permanent publisher + LIVE_PENDING convergence
human step = apply plugin + real long-chat evidence
PR3 = LIVE_PASS evidence/admin closure
```

## 5.2 HUMAN_EVIDENCE remains irreducible

The system may prepare, validate, and publish all pre-live repository state, but it must not manufacture HUMAN_EVIDENCE.

Required rule:

```text
no supplied real-world evidence
→ no LIVE_PASS
→ no successful terminal work-item closure
```

This preserves the existing safety boundary.

## 5.3 PR3 ownership

PR3 is the existing clean-release terminal admin/evidence transaction.

It may own only the bounded closure surfaces required by the current release, such as:

```text
human live evidence record / release evidence projection
machine/live-state transition to LIVE_PASS or the explicit terminal result
current development/admin synchronization triggered by that result
work-item closure evidence reference
```

PR3 must not mutate runtime plugin bytes or republish `release-simcore`.

PR3 must not become a second publisher.

## 5.4 Post-PR3 reobservation

Successful work-item closure requires durable reobservation after PR3 merge:

```text
main records terminal live result
release identity still matches the tested production
release-simcore remains the tested production commit
latest.js == install.js remains true when materially rechecked
the work-item close comment/reference points to the durable terminal evidence
```

This is a close-step check, not a new release gate or new PR.

## 5.5 v0.64.9 qualification boundary

At R2.3 design time, v0.64.9 HUMAN LIVE_PASS is still pending.

Therefore:

```text
R2.3 design = allowed now
R2.3 clean terminal semantics = frozen now
R2.3 implementation that depends on actual PR3 shape = wait for v0.64.9 HUMAN_EVIDENCE + PR3 evidence
```

If v0.64.9 closes with LIVE_FAIL or another explicit terminal result instead, use that real evidence to qualify the terminal contract rather than assuming LIVE_PASS.

---

# 6. R2.3-C — Repository Labels Are Non-Authority

Classification:

```text
R2_3_C_REPOSITORY_LABEL_NON_AUTHORITY
= WATCH_POLICY / NON_RUNTIME / NO_IMPLEMENTATION_REQUIRED_BY_DEFAULT
```

## 6.1 Evidence

The v0.64.9 release work item received `scope:unclassified` while the release still followed the correct SimCore authority and publication path.

No routing error, wrong publisher, wrong candidate, or authority bypass was observed.

## 6.2 Rule

Repository labels are convenience metadata unless an explicit higher-authority contract says otherwise.

They do not determine:

```text
release authorization
candidate identity
production parent
publisher selection
LIVE_PENDING truth
LIVE_PASS truth
work-item closure eligibility
```

## 6.3 No speculative classifier work

Do not add or rewrite a classifier merely to make the label cosmetically cleaner.

Implementation trigger requires evidence such as:

```text
label causes wrong routing
label changes release authority
label suppresses required verification
label causes wrong work-item lifecycle decision
```

Without that evidence, keep WATCH.

---

# 7. R2.3-D — Durable Evidence Order Remains Frozen

Classification:

```text
R2_3_D_DURABLE_EVIDENCE_ORDER
= FREEZE / CARRY_FORWARD / NON_RUNTIME
```

When observations conflict or transient tooling is incomplete, authority order remains:

```text
1. durable candidate/release receipt
2. exact releaseId / intent identity
3. exact candidate commit + parent + blob
4. observed release-simcore production identity
5. durable main manifest / release-state commit
6. workflow run IDs and transient logs as supporting evidence
7. convenience labels and UI projections
```

No new polling or run-correlation system is authorized by R2.3.

---

# 8. Clean R2.3 steady-state path

R2.3 preserves the current path exactly:

```text
EXPLICIT_USER_RELEASE_WORK_ITEM
→ PR1_PRODUCT_PLUS_RELEASE_INTENT
→ GENERIC_CANDIDATE_AND_MACHINE_RECEIPT
→ PR2_DELEGATED_EXACT_APPROVAL_PACKAGE
→ VERIFY + REQUIRED PASS
→ PERMANENT_PUBLICATION_AND_LIVE_PENDING_CONVERGENCE
→ HANDOFF_TO_USER_REAL_LONG_CHAT
→ HUMAN_EVIDENCE
→ PR3_LIVE_PASS_OR_EXPLICIT_TERMINAL_CLOSURE
→ POST_MERGE_REOBSERVATION
→ WORK_ITEM_CLOSED
```

`POST_MERGE_REOBSERVATION` is an operating close-step, not a fourth PR and not a new publication gate.

---

# 9. Implementation scope

When implementation is later authorized and the v0.64.9 terminal evidence is available, implementation should remain minimal.

Preferred scope:

```text
A. normalize future release-work-item wording/template
B. bind PR3 terminal closure guidance to the existing close-step policy
C. add only a small permanent regression if a stable mechanical contract exists
D. keep label handling as WATCH unless real authority impact appears
```

Expected implementation surfaces are NON_RUNTIME docs/tooling/tests only.

Do not bundle R2.3 implementation into a SimCore runtime release.

---

# 10. Qualification plan

## 10.1 Clean release replay

Replay v0.64.9 through the currently proven boundary:

```text
work item open
PR1 merged
PR2 merged
publication SUCCESS
LIVE_PENDING converged
→ work item remains open
```

Expected: PASS.

## 10.2 Terminal replay

After v0.64.9 supplies real terminal evidence:

```text
HUMAN_EVIDENCE accepted
PR3 merged
main terminal state reobserved
production identity reobserved
→ work item close eligible
```

Expected: PASS.

Negative controls:

```text
LIVE_PENDING only + closed issue
→ FAIL premature clean-work-item closure

PR3 merged without HUMAN_EVIDENCE
→ FAIL terminal authority missing

label = scope:unclassified
but all durable release identities correct
→ PASS / label ignored for authority
```

## 10.3 Blocker incident replay preserved

R2.2 historical `new-01 → repair → new-02` blocker incident replay remains required and must not be weakened.

R2.3 does not replace R2.2 blocker semantics.

---

# 11. Acceptance matrix

R2.3 is acceptable only if all are true:

```text
steady-state PRs to LIVE_PENDING                  = 2
steady-state PRs through terminal closure         = 3
user manual pre-live GitHub actions               = 0
new publisher                                     = 0
new clean-path gate                               = 0
new polling                                       = 0
new background authority                          = 0
new issue automation controller                   = 0
R2.2 current-state single authority preserved     = PASS
R2.2 blocker incident closure semantics preserved = PASS
R2.1 release-spec parity regression preserved     = PASS
human LIVE_PASS boundary preserved                = PASS
label-based release authority                     = NONE
runtime mutation                                  = NONE
release-simcore mutation                           = NONE
```

---

# 12. Activation / implementation gate

R2.3 is **design-active but implementation-held**.

Implementation should normally wait until the current v0.64.9 live gate reaches a durable terminal HUMAN_EVIDENCE result and the resulting PR3/closure shape is observed.

Reason:

```text
R2.2 clean pre-live path is already healthy
current feedback is stabilization-only
actual PR3 evidence is the highest-value missing input
premature automation would risk adding complexity without evidence
```

Exception:

A newly discovered release-system blocker may justify an independent emergency FIX, but it must not be mislabeled as routine R2.3 implementation.

---

# 13. Final design verdict

```text
R2.3 — STABILITY SEAL
= DESIGN RECORDED
= CURRENT R2.2 RELEASE ENGINE PRESERVED
= NORMAL 2-PR PRE-LIVE PATH PRESERVED
= NORMAL 3-PR TERMINAL PATH PRESERVED
= CLEAN WORK-ITEM CLOSE AUTHORITY CLARIFIED
= HUMAN LIVE_PASS / PR3 TERMINAL SEAL CLARIFIED
= LABEL NOISE REMAINS NON-AUTHORITY WATCH
= NEW ORCHESTRATION NOT AUTHORIZED
= IMPLEMENTATION WAITS FOR V0.64.9 TERMINAL EVIDENCE
```

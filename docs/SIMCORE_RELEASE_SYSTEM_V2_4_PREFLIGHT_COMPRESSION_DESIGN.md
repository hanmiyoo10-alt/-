# SimCore Release System v2.4 — Preflight Compression Design

Date: 2026-08-28 KST
Status: **DESIGN RECORDED · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Predecessor: `R2.3 — Stability Seal`
Primary feedback: `docs/SIMCORE_RELEASE_SYSTEM_V2_3_V06410_OPERATIONAL_FEEDBACK_2026-08-28.md`
Primary issues: `#690` FIX, `#691` WATCH
Runtime mutation from this design: **NONE**
`release-simcore` mutation from this design: **NONE**

## 1. Decision

R2.4 does **not** replace the R2.3/R2.2 release engine.

The operating goal is:

```text
preserve the current authority model
+ move candidate-authoring failures earlier into existing PR1 Verify
+ reduce append-only recovery PR tax
+ keep terminal cleanup bounded
```

The system should become more automated only where automation is **non-authoritative and fail-early**.

Canonical principle:

```text
AUTOMATE EARLY REJECTION
NOT LATER AUTHORITY
```

R2.4 must not create a new publication actor, issue-closing actor, release PR, user confirmation step, polling loop, or clean-path lifecycle state.

## 2. Frozen happy path

The normal runtime release path remains unchanged:

```text
PR1 product + release intent
→ candidate + receipt
→ PR2 exact approval
→ permanent publication + LIVE_PENDING
→ HUMAN_EVIDENCE
→ PR3 terminal evidence/admin closure
→ post-merge reobservation
→ work item closed
```

Frozen cost targets:

```text
steady-state PRs to LIVE_PENDING = 2
steady-state PRs through terminal closure = 3
user manual pre-live GitHub actions = 0
publisher count = 1
new clean-path gate = 0
new polling = 0
new issue controller = 0
```

Append-only recovery remains mandatory when a committed candidate transaction fails after PR1 merge.

R2.4 reduces the probability of reaching that recovery path; it does not weaken the path.

## 3. R2.4-A — Candidate-Equivalent PR1 Dry Qualification

Classification:

```text
FIX / RELEASE_AUTHORING_QUALIFICATION_GAP / NON_RUNTIME
```

Authority input: `#690`.

### 3.1 Problem proven by v0.64.10

v0.64.10 PR1 passed permanent `Verify / Required`, but Generic Candidate later found four non-runtime authoring defects before intent-05 succeeded:

```text
1. sibling-file builder packaging dependency
2. brittle whole-source lexical Host API postcondition
3. recovery wrapper still inheriting the same brittle postcondition
4. registered permanent suite repeating the same lexical-count misconception
```

Production safety held because the candidate system failed closed, but the release consumed four recovery PRs before exact approval.

This is a qualification-timing defect, not a publisher or append-only-recovery defect.

### 3.2 Design

Strengthen the **existing PR1 SimCore Verify lane** with one candidate-equivalent dry qualification when the PR contains a runtime release intent/builder.

The dry qualification must reproduce the candidate materializer's relevant authoring environment:

```text
observed production parent materialized read-only
exact builderPath isolated in the same single-file temp-packaging shape
builder executed against the observed parent
candidate output held only in ephemeral workspace
candidate-specific required regression executed against that dry output
workspace discarded after Verify
```

The dry lane must not create or mutate:

```text
candidate refs
candidate commits
candidate receipts
spec shadows
release IDs
approval records
release-simcore
main release state
GitHub issues
publisher state
```

Its authority is only:

```text
PASS PR1 Verify
or
FAIL PR1 Verify earlier
```

### 3.3 Scope trigger

Do not run this work for every docs/admin PR.

The dry qualification is eligible only when existing path classification identifies a release-authoring PR with the inputs required to build a runtime candidate, such as:

```text
runtime release intent
candidate builder
candidate-specific verifier/fixture changes
```

If those inputs are absent, existing SimCore Verify behavior remains unchanged.

### 3.4 Equivalence boundary

The dry lane must share or reuse the canonical materialization primitive wherever practical instead of maintaining a second independent simulation of candidate packaging.

However, authority remains different:

```text
PR1 dry materialization = ephemeral qualification only
Generic Candidate       = durable candidate authority
```

A dry PASS must never be treated as a candidate receipt or release authorization.

### 3.5 Success criterion

The exact v0.64.10 failure classes must fail PR1 before merge:

```text
builder requires undeclared sibling temp dependency
builder postcondition misclassifies intentional semantic surfaces
candidate-specific required suite fails against the generated output
```

The valid intent-05 shape must pass the dry lane without changing the 2-PR happy path.

## 4. R2.4-B — Semantic Assertion Discipline

Classification:

```text
STABILIZE / TEST_HARNESS_SEMANTICS / NON_RUNTIME
```

R2.4 must reduce brittle assertions that treat lexical occurrence count as runtime semantic count.

Preferred order:

```text
1. executable behavior assertion
2. scoped structural assertion
3. distinct semantic-surface assertion
4. raw whole-source lexical count only when the lexical property itself is the contract
```

For example, this is preferred:

```text
exactly one capability guard
exactly one awaited acquisition call
```

over:

```text
source.count("getLocalPluginStorage") == 1
```

R2.4 does **not** mandate a new AST parser or generalized source-analysis framework.

Keep assertions narrow and local to the release contract. Avoid adding infrastructure whose complexity exceeds the bug class being prevented.

Permanent regression should replay the v0.64.10 authoring failures so later harness refactors cannot reintroduce them silently.

## 5. R2.4-C — Direct-Predecessor Terminal Debt Seal

Classification:

```text
WATCH / TERMINAL_CLOSURE_DEBT / NON_RUNTIME / NON_BLOCKING
```

Authority input: `#691`.

### 5.1 Problem

R2.3 correctly prevented premature closure of v0.64.9 work item `#660` after its HUMAN_EVIDENCE produced `LIVE FAIL / CLASSIFIED BEFORE REFRESH`.

A successor repair, v0.64.10, was then allowed to proceed while `#660` remained open.

This is fail-safe but can leave historical terminal-closure debt.

### 5.2 Bounded design option

A future existing PR3 terminal/admin transaction may **optionally** carry terminal-seal evidence for at most **one direct predecessor release work item** when all of the following are already durable:

```text
predecessor has accepted HUMAN_EVIDENCE terminal result
predecessor result is LIVE_FAIL_HANDOFF_TO_NEW_RELEASE or another explicitly supported R2.3 terminal disposition
successor activation explicitly cites that predecessor evidence
predecessor production identity is known
successor relationship is direct and unambiguous
no manufactured LIVE_PASS claim is required
```

The same PR3 may then record both:

```text
current release terminal evidence
and
eligible direct-predecessor terminal handoff evidence
```

Post-merge reobservation is still required before either work item becomes close-eligible.

### 5.3 Hard limits

This option must never:

```text
block successor publication
add a fourth clean-path PR
walk an arbitrary chain of old releases
close issues automatically
infer missing HUMAN_EVIDENCE
manufacture predecessor terminal state
republish or mutate release-simcore
```

Maximum carry-forward debt per PR3:

```text
1 direct predecessor
```

If the relation is ambiguous, leave the predecessor work item open.

### 5.4 Historical hold resolution

The original R2.4-C implementation hold was correct when written because no genuine PR3 terminal/admin transaction shape had yet been observed.

That premise is now historical rather than current. Later durable terminal transactions, including #755, #796/#801/#803 and later R2.8 terminal convergence, prove the terminal administrative shape without requiring an invented payload.

The remaining gap is narrower:

```text
HISTORICAL_PREDECESSOR_DEBT_SEAL_ACTIVATION / AUTHORITY_MISSING
```

### 5.5 Historical administrative seal

When the normal direct-successor PR3 window has already passed, one separately reviewed repository-only administrative PR may seal **exactly one explicitly named historical debt item**.

This is not a clean-path release PR and does not change the frozen release cost targets.

Eligibility requires all of:

```text
one explicit work-item issue
one explicit historical release identity
accepted terminal evidence already durable
terminal disposition already supported by R2.3
direct successor relation already durable and unambiguous
historical production identity already durable
no runtime or release-simcore mutation
no manufactured LIVE_PASS
```

The administrative PR itself becomes the historical equivalent of `terminalClosurePrMerged` only after it is merged to protected main. Post-merge main evidence, current production authority, and the exact historical seal record must then be reobserved before the existing pure R2.3 closure evaluator may return close-eligible.

The first authorized historical seal is limited to:

```text
work item = #660
release = v0.64.9
terminal disposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE
direct successor = #679 / v0.64.10
seal evidence = docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md
```

#679 and #704 are not included in this administrative PR.

### 5.6 Historical administrative seal hard limits

The historical path must never:

```text
seal more than one debt item per administrative PR
discover or walk an arbitrary predecessor chain
close an issue automatically
change the R2.3 pure closure evaluator
change future/current clean-path PR3 semantics
block successor publication
mutate runtime/plugin bytes
mutate or republish release-simcore
change current production identity
treat labels as authority
```

A later historical debt item requires its own fresh packet, exact evidence map, PR, merge, and post-merge reobservation.

## 6. R2.4-D — Automation Authority Freeze

Classification:

```text
FREEZE / AUTOMATION_BOUNDARY
```

R2.4 automation may gain **earlier validation coverage**, not new mutation authority.

Allowed automation growth:

```text
ephemeral dry materialization inside existing Verify
candidate-equivalent packaging checks
candidate-specific regression before PR1 merge
bounded terminal eligibility evaluation inside existing admin flow
```

Forbidden automation growth:

```text
new publisher
new auto-approval authority
new issue auto-close controller
new standing release daemon
new polling/run-correlation service
new production mutation path
new release PR
new user confirmation step
```

This keeps automation aligned with safety and simplicity:

```text
more automatic checking
same automatic authority
```

## 7. Failure semantics

R2.4-A failures are premerge authoring failures:

```text
FIX / PR1_DRY_QUALIFICATION / NON_PRODUCTION
```

They do not create release incidents because no candidate transaction or production mutation has begun.

After PR1 merge, existing R2.1/R2.2/R2.3 semantics remain authoritative:

```text
failed candidate attempt → immutable evidence
fresh append-only intent/releaseId for recovery
no force rewrite
no production mutation without exact approval
```

R2.4 must not blur the distinction between premerge authoring failure and committed release recovery.

## 8. Evidence and observability

Durable evidence authority order remains frozen:

```text
candidate/release receipt
→ releaseId
→ exact candidate/parent/blob
→ release-simcore
→ main release state
→ workflow/log support evidence
→ labels/UI convenience metadata
```

PR1 dry qualification reports are CI evidence only and sit below durable candidate identity.

They must not become a competing release source of truth.

## 9. Implementation order

If implementation is authorized, use this order:

```text
A. candidate-equivalent PR1 dry qualification
B. semantic assertion discipline + v0.64.10 replay regression
C. permit one explicit historical administrative seal only after genuine PR3 shapes exist; keep one-item and post-merge reobservation limits
D. reverify authority freeze and steady-state PR cost
```

A and B may be implemented together because they address the same proven qualification gap.

C must not delay A/B.

## 10. Acceptance criteria

R2.4 mechanical implementation is acceptable only if all are true:

```text
v0.64.10 authoring failure classes are caught before PR1 merge
valid release authoring still reaches Generic Candidate normally
Generic Candidate remains sole durable candidate authority
Permanent Release remains sole publisher
append-only recovery remains unchanged
2 PRs to LIVE_PENDING remains achievable
3 PRs through terminal closure remains the clean target
0 user pre-live GitHub actions remains true
no new workflow authority is introduced
no new polling/background process exists
runtime/plugin behavior is unchanged by R2.4 itself
release-simcore is unchanged by R2.4 itself
```

## 11. Current design verdict

```text
R2.4-A Candidate-Equivalent PR1 Dry Qualification = FIX / DESIGN FROZEN
R2.4-B Semantic Assertion Discipline = STABILIZE / DESIGN FROZEN
R2.4-C Direct-Predecessor Terminal Debt Seal = WATCH / HISTORICAL ADMIN SEAL AUTHORIZED FOR #660 / ONE ITEM ONLY
R2.4-D Automation Authority Freeze = FREEZE

release engine replacement = NO
new publisher = NO
new clean-path PR = NO
new clean-path gate = NO
new polling = NO
new issue controller = NO
runtime mutation = NONE
release-simcore mutation = NONE
```

R2.4 is therefore an **efficiency stabilization of the existing R2.3 system**, not a redesign of release authority.
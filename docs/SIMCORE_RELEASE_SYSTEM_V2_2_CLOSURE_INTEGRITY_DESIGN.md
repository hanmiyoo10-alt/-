# SimCore Release System v2.2 — Closure Integrity

Date: 2026-08-28 KST
Status: **DESIGN RECORDED · NON-RUNTIME · IMPLEMENTATION NOT STARTED**
Predecessor: **Release System v2.1 — delegated operator path operationally proven through LIVE_PENDING**
Product gate at design time: `06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT` remains unchanged
Runtime mutation from this design: **NONE**
`release-simcore` mutation from this design: **NONE**

## 1. Purpose

Release System v2.2 is a bounded follow-up to the first genuine R2.1 runtime release proof.

R2.1 already proved the important operating path:

```text
explicit user release work item
→ PR1 product + release intent
→ generic candidate + machine receipt
→ PR2 delegated exact approval package
→ permanent publication
→ automatic LIVE_PENDING convergence
→ user applies plugin + runs real long-chat validation
```

Observed user manual pre-live GitHub actions: **0**.

R2.2 does **not** redesign this path.

Its purpose is narrower:

```text
make current-state reading unambiguous
+
make blocker/incident closure timing accurate
+
retain durable receipts as observability authority
```

The design principle is:

> Prefer deleting duplicate authority and tightening lifecycle semantics over adding new orchestration.

---

## 2. Inputs from the first genuine R2.1 proof

The v0.64.8 release proof established the following feedback.

### 2.1 Already fixed and frozen

`R2_1_RELEASE_SPEC_CONTRACT_PARITY_DRIFT`

```text
classification = FIXED / PERMANENT_REGRESSION_OWNED
repair = PR #631
```

Release metadata now fails at the earliest candidate/spec-shadow boundary against the authoritative release schema.

R2.2 must preserve that protection and must not redesign it without new evidence.

### 2.2 Current-state duplicate authority

Issue `#640`:

```text
CURRENT_DEVELOPMENT_DUPLICATE_CURRENT_STATE_AUTHORITY
= FIX / DOC_ARCHITECTURE / NON_RUNTIME / NON_BLOCKING
```

After v0.64.8 publication, machine-managed current-state blocks were correct while nearby human-authored `Production verdict` prose still described v0.64.7.

The recurrence shows the problem is structural duplication, not merely a missed text edit.

### 2.3 Blocker incident premature closure

Issue `#641`:

```text
R2_1_BLOCKER_INCIDENT_PREMATURE_AUTOCLOSE
= FIX / INCIDENT_LIFECYCLE / NON_RUNTIME / NON_BLOCKING
```

Issue `#629` represented both the release-system defect and the blocked publication incident. PR `#631` used `Fixes #629`, so the issue closed when the defect repair merged even though append-only release recovery and production reobservation were still pending.

### 2.4 Connected run observability noise

```text
R2_1_CONNECTED_RUN_OBSERVABILITY_NOISE
= WATCH / TOOL_SURFACE / NON_RUNTIME / NON_BLOCKING

PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
= WATCH / NON_BLOCKING
```

Transient/incorrect run-ID observation and temporarily unavailable in-progress logs did not cause wrong release binding. Durable candidate receipts, exact commits, exact release IDs, production branch identity, and main manifest were sufficient to recover truth.

R2.2 must not turn a WATCH into new machinery without evidence of an actual wrong-run binding.

---

## 3. Non-negotiable R2.1 properties preserved unchanged

R2.2 may not weaken or add operator friction to these properties:

```text
explicit release work item required = YES
standing/background release authority = NO
user manual pre-live GitHub actions = 0
assistant delegated operator to LIVE_PENDING = YES
normal steady-state PRs to LIVE_PENDING = 2
normal steady-state PRs through human LIVE_PASS closure = 3
single permanent publisher = YES
exact P/C/blob binding = YES
Candidate Required = YES
production fast-forward only = YES
latest.js == install.js = YES
failed release transactions remain immutable = YES
recovery is append-only = YES
post-publish state path cannot republish = YES
human real-long-chat LIVE_PASS required = YES
main = design/evidence/admin authority
release-simcore = runtime/deployment authority
```

A v2.2 proposal that adds a new approval PR, new workflow button, new user confirmation, new publisher, or standing release authority is rejected by design.

---

## 4. R2.2 design thesis — simplify by removing ambiguity

The v0.64.8 proof does not justify another orchestration layer.

The two confirmed FIX items are both state-expression problems:

```text
#640 = two places claim to describe current production
#641 = one issue state claims full closure before the release incident is actually closed
```

Therefore R2.2 should use the smallest correction:

```text
#640 → remove duplicate current-production authority
#641 → keep one incident object open until production recovery is reobserved
```

Not:

```text
new release state machine
new publisher
new approval service
new recurring workflow
new polling loop
new operator PR
```

---

# 5. R2.2-A — Single Current-State Authority

Classification:

```text
R2_2_A_SINGLE_CURRENT_STATE_AUTHORITY
= FIX / DOC_ARCHITECTURE / STATE_READABILITY / NON_RUNTIME
```

## 5.1 Authority rule

Within `docs/CURRENT_DEVELOPMENT.md`, the machine-managed blocks at the top become the **sole current production identity and current live-gate authority**.

Current authority remains represented by bounded machine-managed blocks such as:

```text
SIMCORE_SYNC:PRODUCTION_SNAPSHOT
SIMCORE_RELEASE_STATE:<current lifecycle>
```

Those blocks own current literals including:

```text
version
release name
release commit
release blob
validation status
current priority / live scenario
R lifecycle state
```

## 5.2 Human prose rule

Human-authored active prose must not duplicate those values as a second current-state authority.

The current `Production verdict` pattern should be retired.

Preferred replacement:

```text
## How to read current operational state

The machine-managed blocks above are authoritative for current production identity,
validation status, and the active live gate.
Human-authored sections below record interpretation, historical evidence,
constraints, and follow-up decisions; they do not override those blocks.
```

This paragraph is deliberately identity-free.

Human-authored sections may still say things such as:

```text
runtime changes are frozen while the active live gate is pending
M2-3 remains blocked until the active product gate closes
provider cache remains UNVERIFIED unless direct evidence changes it
```

But they should refer to **the active gate/current snapshot** instead of repeating version/SHA/gate literals.

## 5.3 Historical evidence remains untouched

Historical release ledgers may contain old point-in-time statements, versions, commits, and gate names.

Those are evidence, not current authority.

R2.2-A must not rewrite historical evidence merely to remove old version strings.

## 5.4 State-convergence behavior remains unchanged

The permanent post-publish state convergence continues to update the existing machine-managed current-state blocks.

R2.2-A does not add a second state writer.

No new release transaction is required.

## 5.5 Minimal verification

Prefer a small structural check over semantic prose parsing.

Required assertions:

```text
exactly one production snapshot machine block exists
exactly one active release-state machine block exists
human active-current section contains no second `Production verdict` authority block
machine-managed blocks remain bounded and writable by existing convergence owner
historical ledger is outside current-authority scope
```

Do not build an NLP/version scanner that attempts to decide whether every historical version mention is stale.

## 5.6 Closure target

Issue `#640` closes when:

```text
duplicate active current-production prose is removed
machine blocks remain correct and unique
permanent CI passes
no runtime/release-simcore mutation occurs
```

---

# 6. R2.2-B — Blocker Incident Closure Semantics

Classification:

```text
R2_2_B_BLOCKER_INCIDENT_CLOSURE_SEMANTICS
= FIX / INCIDENT_LIFECYCLE / NON_RUNTIME
```

## 6.1 Simplicity decision — keep one issue by default

R2.2 does **not** require separate DEFECT and RELEASE INCIDENT issues for every release failure.

That would improve semantic purity but increase routine administrative objects.

Default:

```text
one release-blocker issue
```

Separate issues remain allowed when a defect has independent scope or multiple affected releases, but are not required by the normal path.

## 6.2 Incident lifecycle

A release-blocker issue may move through these meanings:

```text
BLOCKER_ACTIVE
→ DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ RECOVERED / PRODUCTION_REOBSERVED
→ CLOSED
```

The middle state is important.

Merging the code/tooling repair closes the **defect**, not automatically the blocked release incident.

## 6.3 PR wording rule

When a PR repairs a defect that is part of an active blocked release incident:

```text
use: Refs #<issue>
not: Fixes #<issue>
not: Closes #<issue>
```

The issue may be updated with:

```text
DEFECT_FIXED / RELEASE_RECOVERY_PENDING
repair PR / merge SHA
next recovery transaction identity when known
```

## 6.4 Closure authority

A release-blocker incident may close only after durable evidence confirms the blocked release has reached its intended recovered boundary.

For a pre-publication blocker whose objective remains publication to LIVE_PENDING, closure requires:

```text
recovery transaction preserved append-only
exact candidate/approval identity verified
permanent release conclusion successful
release-simcore production reobserved at expected C
latest.js == install.js reobserved
main LIVE_PENDING state converged
```

Only then may the issue state become fully closed.

A rollback/cancelled work item may use a different explicit terminal disposition, but it must still be durable and truthful.

## 6.5 No new normal-path release gate

This incident policy applies only when a release blocker exists.

A clean release does not create a new issue or PR.

Therefore steady-state release cost remains:

```text
PR1
PR2
→ LIVE_PENDING
```

## 6.6 Automation boundary

R2.2-B initially prefers policy + bounded checks over a new GitHub issue automation controller.

Do not add:

```text
scheduled incident polling
new issue-state workflow engine
new release publication dependency on GitHub issue labels
```

If premature closure recurs after the policy is active, preserve the recurrence and then consider a small automated guard.

## 6.7 Closure target

Issue `#641` closes when:

```text
the policy is durable on main
release-repair PR guidance is updated
permanent CI/self-test proves the policy surface if one exists
no runtime/release-simcore mutation occurs
```

---

# 7. R2.2-C — Durable Evidence First Observability

Classification:

```text
R2_2_C_DURABLE_EVIDENCE_FIRST_OBSERVABILITY
= WATCH_POLICY / NON_RUNTIME / NO_IMPLEMENTATION_REQUIRED_BY_DEFAULT
```

## 7.1 Authority order

When connected run observation is ambiguous, prefer:

```text
1. durable candidate/release receipt
2. exact releaseId / intent identity
3. exact candidate commit and parent
4. release-simcore observed production ref
5. main manifest / release-state durable commit
6. workflow run IDs and transient logs as supporting evidence
```

A guessed or transient run ID is never publication authority.

## 7.2 No speculative rewrite

R2.2 does not change activation run correlation or add another polling layer merely because one human/tool observation saw a 404.

Required trigger for implementation:

```text
wrong run bound
or
ambiguous run causes incorrect release decision
or
existing controller cannot recover exact transaction truth
```

Without that evidence, retain WATCH.

---

# 8. Clean R2.2 steady-state release path

R2.2 must preserve the R2.1 operator path exactly:

```text
EXPLICIT_USER_RELEASE_WORK_ITEM
→ PR1_PRODUCT_PLUS_RELEASE_INTENT
→ GENERIC_CANDIDATE_AND_MACHINE_RECEIPT
→ PR2_DELEGATED_EXACT_APPROVAL_PACKAGE
→ VERIFY + REQUIRED PASS
→ PERMANENT_PUBLICATION_AND_LIVE_PENDING_CONVERGENCE
→ HANDOFF_TO_USER
→ REAL_LONG_CHAT
→ PR3_LIVE_PASS_CLOSURE
```

R2.2-A changes how `CURRENT_DEVELOPMENT.md` expresses current authority after convergence.

R2.2-B changes how exceptional blocker incidents are kept open/closed.

Neither adds a clean-path release transaction.

---

# 9. Implementation order

When R2.2 implementation is explicitly authorized, use this order:

```text
R2.2-A
single current-state authority
→ close #640

R2.2-B
blocker incident closure semantics
→ close #641

R2.2-C
WATCH only; no code unless new evidence appears
```

Do not bundle R2.2 implementation with a SimCore runtime feature release.

R2.2 is a release-system/docs/admin work item.

---

# 10. Qualification plan

R2.2 activation requires non-production proof only.

## 10.1 A qualification

Use existing `CURRENT_DEVELOPMENT.md` and historical release-state fixtures to prove:

```text
machine current snapshot remains exact
machine current live gate remains exact
human current-state authority duplication is absent
historical evidence remains readable and unchanged in meaning
```

## 10.2 B qualification

Replay the v0.64.8 `new-01 → repair → new-02` incident as historical evidence:

```text
repair merged
→ issue state should mean DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ not full incident closure

successful permanent publication + production reobservation + LIVE_PENDING
→ issue eligible for CLOSED
```

No real production mutation is required for this qualification.

## 10.3 Regression scope

Permanent R2.1 release-schema parity protection remains in CI.

R2.2 qualification must not weaken or replace it.

---

# 11. Acceptance matrix

R2.2 is acceptable only if all are true:

```text
single publisher preserved                         PASS
exact P/C/blob preserved                          PASS
Candidate Required preserved                      PASS
fast-forward-only production preserved            PASS
latest.js == install.js preserved                  PASS
append-only recovery preserved                    PASS
human LIVE_PASS preserved                         PASS
user manual pre-live GitHub actions = 0            PASS
steady-state PRs to LIVE_PENDING = 2               PASS
new clean-path approval/gate/workflow = 0           PASS
CURRENT_DEVELOPMENT current authority count = 1     PASS
release blocker cannot read fully closed while
  recovery/publication is still pending             PASS
connected run noise remains WATCH absent misbind     PASS
runtime mutation                                    NONE
release-simcore mutation from R2.2 design/qual      NONE
```

---

# 12. Explicit non-goals

R2.2 does not attempt to:

```text
reduce PR1 + PR2 into one PR
remove exact approval
remove Candidate Required
make release-simcore writable from the activation adapter
make LIVE_PASS automatic
replace human real-long-chat evidence
redesign candidate transport refs
change Node action runtime targets
replace activation run discovery without a proven misbind
change SimCore runtime/plugin behavior
advance M2-3
```

Those require separate evidence and design.

---

# 13. Relationship to the current v0.64.8 gate

R2.2 design does not change the product gate.

Current product authority remains:

```text
production = v0.64.8
validation = PENDING_REAL_LONG_CHAT
live gate = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
provider cache = UNVERIFIED
```

The required v0.64.8 real long-chat validation remains independent.

R2.2 must not be used as a substitute for product LIVE_PASS evidence.

---

# 14. Final design verdict

```text
Release System version: v2.2
Name: Closure Integrity
Status: DESIGN RECORDED / IMPLEMENTATION NOT STARTED
Parent operating mode: R2.1 operationally proven to LIVE_PENDING
Primary FIX A: single current-state authority (#640)
Primary FIX B: truthful blocker incident closure (#641)
WATCH C: durable-evidence-first run observability
Steady-state PR target to LIVE_PENDING: 2 unchanged
User manual pre-live GitHub actions: 0 unchanged
Safety weakening: FORBIDDEN
New publisher: NONE
New clean-path gate: NONE
Runtime mutation: NONE
```

Cross references:

- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_FIRST_GENUINE_RELEASE_RETROSPECTIVE_2026-08-28.md`
- `products/simcore/releases/R_V2_1_FIRST_GENUINE_RELEASE_PROOF.json`
- `products/simcore/releases/R_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS_STATUS.json`
- issue `#640`
- issue `#641`
- PR `#631`
- Permanent Release run `33086543601`

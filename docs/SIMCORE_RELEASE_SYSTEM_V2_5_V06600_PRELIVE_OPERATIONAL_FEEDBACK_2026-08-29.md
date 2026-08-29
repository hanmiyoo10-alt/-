# SimCore Release System v2.5 — v0.66.0 Pre-Live Operational Feedback

Date: 2026-08-29 KST
Status: **FEEDBACK RECORDED · PROVISIONAL STABILIZE · NON_RUNTIME · HUMAN LIVE / TERMINAL RETROSPECTIVE STILL PENDING**
Scope: v0.66.0 `M2-4 Session / Runtime Mirror Boundary Completion` release-system operation from exact approval through durable `LIVE_PENDING`

Continuous-feedback authority:

`docs/SIMCORE_RELEASE_SYSTEM_CONTINUOUS_FEEDBACK_LOOP.md`

R2.5 design authority:

`docs/SIMCORE_RELEASE_SYSTEM_V2_5_APPROVAL_BOUNDARY_CONVERGENCE_DESIGN.md`

Runtime mutation from this feedback: **NONE**

`release-simcore` mutation from this feedback: **NONE**

---

## 1. Executive verdict

The v0.66.0 operation gives a split but useful result:

```text
R2.5 APPROVAL BOUNDARY FIRST REAL USE     = PASS
SINGLE PUBLISHER / EXACT C-P-BINDING      = STRONG PASS
FAIL-CLOSED PRODUCTION SAFETY             = STRONG PASS
APPEND-ONLY RECOVERY / AUDITABILITY       = STRONG PASS
MAIN-WRITE GATEWAY                         = STRONG PASS
HUMAN LIVE AUTHORITY BOUNDARY             = PASS / PRESERVED
POST-PUBLISH STATE CONVERGENCE             = NEEDS STABILIZATION
RECOVERY CONTRACT PARITY                   = NEEDS STABILIZATION
POST-PUBLISH REPAIR QUALIFICATION          = NEEDS STABILIZATION
CLEAN TWO-PR PATH RELIABILITY              = NOT PROVEN BY v0.66.0
```

Primary system disposition:

```text
R2.5 / current release architecture = STABILIZE
```

This is **not** an `UPDATE` verdict.

The core authority model protected production correctly throughout the incident chain. The failures were concentrated in the administrative state-convergence layer after publication and were repaired without republishing runtime bytes.

The strongest next direction is therefore:

```text
KEEP THE AUTHORITY MODEL
KEEP THE SINGLE PUBLISHER
KEEP APPEND-ONLY RECOVERY
KEEP MAIN_HEALTH GATING

STABILIZE POST-PUBLISH BOUNDARIES
FAIL DETERMINISTIC STATE-TRANSITION DEFECTS BEFORE PUBLICATION
REMOVE DUPLICATED WRITER / RECOVERY CONTRACTS
```

This feedback is intentionally **pre-live**. A final release-system retrospective remains due after v0.66.0 HUMAN_EVIDENCE and terminal PR3 closure.

---

## 2. Successful production identity and approval path

Final release transaction:

```text
releaseId              = simcore-v0.66.0-new-05
exact approval activation run = 33206513419
permanent publisher run       = 33206537749
production commit       = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
previous production     = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
production blob         = f0da13d4c47fd98e9065d7dbf253a3296151ee16
version                 = 0.66.0
```

The permanent transaction passed through exact authorization and candidate verification before publication:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify     = SUCCESS
Candidate Required / Required   = SUCCESS
Publish Exact Candidate         = SUCCESS
```

This is the first genuine runtime-release evidence that the R2.5 approval-boundary convergence path reached permanent publication without repeating the v0.65.0 deterministic PR2 activation failures caused by title/spec-path drift.

Classification:

```text
R2_5_APPROVAL_BOUNDARY_FIRST_REAL_USE
= PASS / GENUINE_RELEASE / PRELIVE / NON_RUNTIME
```

Important limitation:

This proves the approval path through publication. It does not by itself prove terminal HUMAN_EVIDENCE closure.

---

## 3. What worked especially well

### F1. R2.5 moved the observed v0.65 PR2 footgun class out of the critical path

R2.5 was designed around:

```text
ONE TRANSACTION SHAPE
ONE SHARED VALIDATOR
CHECK BEFORE MERGE
RECHECK AFTER MERGE
ONE PUBLISHER
```

The v0.66.0 `new-05` approval reached exact activation and permanent publication without a title-authority or authorized-spec-path recovery transaction.

That is direct operational support for the R2.5 design direction.

Classification:

```text
R2_5_PREMERGE_POSTMERGE_APPROVAL_PARITY
= PASS / FIRST_REAL_USE / KEEP
```

### F2. Publication safety stayed correct when administrative convergence failed after publication

The first post-publish administrative transition failed after the runtime had already been published.

The system correctly distinguished:

```text
production runtime truth = already published and valid
main administrative truth = not yet durable / inconsistent
```

No rollback-by-guessing and no second publication occurred.

Classification:

```text
R2_5_PRODUCTION_ADMIN_AUTHORITY_SEPARATION
= STRONG PASS / KEEP
```

### F3. MAIN_HEALTH rejected a structurally invalid two-marker administrative payload

The first generated v0.66 LIVE_PENDING payload accidentally retained the predecessor v0.65 LIVE_PASS marker, producing two current release-state blocks.

MAIN_HEALTH run `33206619653` rejected the payload with closure-integrity failure rather than landing contradictory main truth.

That is exactly what the current-state integrity gate should do.

Classification:

```text
R2_5_MAIN_WRITE_GATE_FAIL_CLOSED
= STRONG PASS / KEEP
```

The correct lesson is not to weaken closure integrity. It is to detect the deterministic transition defect earlier.

### F4. Append-only recovery preserved a readable incident history

The post-publish repair family remained append-only:

```text
post-publish-01
post-publish-02
post-publish-03
```

Failed recovery events were not rewritten into later successful events.

Classification:

```text
R2_5_POST_PUBLISH_APPEND_ONLY_RECOVERY
= STRONG PASS / KEEP
```

### F5. Runtime identity remained frozen through all release-system repair work

Across marker-transition, disposition-parity, and receipt-durability repairs:

```text
release-simcore commit = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
production blob        = f0da13d4c47fd98e9065d7dbf253a3296151ee16
```

No repair republished runtime bytes.

Classification:

```text
R2_5_POST_PUBLISH_REPAIR_RUNTIME_ISOLATION
= STRONG PASS / KEEP
```

### F6. Recovery eventually proved exact minimal repair

After receipt durability was fixed, recovery `post-publish-03` produced:

```text
changedPaths = [
  products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json
]
```

MAIN_HEALTH run `33210720015` passed and landed exactly that missing receipt on main.

Durable reobservation then validated the receipt against the immutable original publisher handoff.

Classification:

```text
R2_5_MINIMAL_RECOVERY_CONVERGENCE
= PASS / EXACT_ONE_FILE_REPAIR / KEEP
```

---

## 4. System feedback requiring stabilization

### F7. Deterministic post-publish state transition defects are discovered too late

The `LIVE_PASS → LIVE_PENDING` marker transition defect was completely deterministic from:

```text
current main administrative state
+
exact candidate identity / release spec
+
post-publish renderer semantics
```

Nothing about that defect required production to be mutated first.

Yet it was first exercised as part of the post-publication state declaration.

This produced the worst safe timing:

```text
runtime publication succeeds
→ deterministic admin transition defect appears
→ main cannot converge
→ release enters production/admin split-brain incident handling
```

The safety shell handled this correctly, but the timing is avoidable.

Classification:

```text
R2_5_PREPUBLICATION_POST_PUBLISH_REPLAY_GAP
= FIX / PRIMARY FOLLOW-UP / NON_RUNTIME
```

Recommended direction:

Add a **no-write, no-authority, ephemeral post-publish transition qualification** before production mutation, using the exact verified candidate identity plus current main as inputs.

Conceptual rule:

```text
before Publish Exact Candidate
→ materialize exact candidate identity already verified by Candidate Required
→ replay the would-be LIVE_PENDING state transition in a temporary workspace
→ run the same closure/state/payload invariants
→ discard output
→ publication authority remains unchanged
```

This must not add:

```text
new PR
new required job
new publisher
new durable authority
new user action
```

It should be another deterministic check inside the existing permanent transaction.

Had this existed for v0.66.0, the two-marker defect should have failed before `release-simcore` moved.

### F8. The post-publish owner declares one payload, while writers independently hardcode another

`release-state-converge` already declares a bounded persistent payload allowlist.

However, permanent publication and permanent recovery independently repeated staging / `repo-main-write --allow` path lists.

That duplication allowed the owner to declare the state receipt while both writers omitted it.

The transaction could therefore report state success while one declared persistent member was not durable.

Classification:

```text
R2_5_POST_PUBLISH_PAYLOAD_OWNER_WRITER_PARITY_GAP
= FIX / RELEASE_SYSTEM / NON_RUNTIME
```

Recommended direction:

```text
ONE STATE OWNER
→ ONE BOUNDED PERSISTENT PAYLOAD MANIFEST
→ ONE SHARED COMMIT/GATE ADAPTER
→ ONE SHARED DURABLE REOBSERVATION CONTRACT
```

The adapter may consume owner output only within a static path-family policy. This avoids giving a renderer arbitrary main-write authority.

In other words:

```text
DERIVE FILE SET FROM OWNER
INTERSECT WITH STATIC WRITER POLICY
FAIL CLOSED ON ANY OUT-OF-POLICY PATH
```

Do not maintain separate permanent/recovery hardcoded copies of the same file set.

### F9. Recovery controller duplicated owner disposition vocabulary

The first recovery execution generated valid authoritative output:

```text
disposition = LIVE_PENDING_PAYLOAD_READY
```

but the workflow-local assertion still accepted older names:

```text
POST_PUBLISH_PAYLOAD_READY
ADMIN_STATE_ALREADY_SYNCED
```

The fixed owner was correct; the duplicated recovery vocabulary was stale.

Classification:

```text
R2_5_RECOVERY_OWNER_DISPOSITION_PARITY_GAP
= FIX / DUPLICATED_CONTRACT / NON_RUNTIME
```

The correction made during v0.66.0 is good and should remain a permanent regression.

Broader design rule:

```text
workflow orchestration must not independently redefine semantic owner vocabulary
```

This is the post-publish analogue of the approval-boundary duplication R2.5 already removed.

### F10. Post-publication CI-self repair still has a repeated trusted-predecessor bootstrap cycle

After production moves but main administrative truth is still predecessor/stale, a CI-self repair PR can face this cycle:

```text
production already advanced
→ current main admin truth still predecessor
→ trusted predecessor verifier expects coherent current state
→ trusted lane fails before proposed repair can execute
→ canonical admin bootstrap required first
→ rebuild repair PR from synchronized main
```

The v0.66.0 marker-transition incident repeated this known pattern.

Classification:

```text
R2_5_POST_PUBLISH_REPAIR_TRUST_BOOTSTRAP_CYCLE
= FIX / DESIGN_REQUIRED / CI_TRUST_BOUNDARY / NON_RUNTIME
```

Do **not** solve this by skipping trusted CI or letting proposed CI self-authorize.

A future stabilization should instead define a bounded incident-repair qualification mode whose immutable inputs explicitly include:

```text
already-published exact production C/blob
recorded post-publish incident identity
known stale main administrative predecessor state
proposed repair head
```

The trusted boundary should then be able to verify that the proposed repair is non-publishing and incident-bounded without first pretending main is already converged.

This needs separate design proof before implementation because it touches CI trust semantics.

### F11. Failure-path PR tax became high, but clean-path stage count should not be increased

v0.66.0 required several incident/fix/recovery PRs after publication.

Examples in the final repair chain include:

```text
#784 marker-transition fix
#785 post-publish recovery -01
#787 recovery disposition parity fix
#788 post-publish recovery -02
#790 state-receipt durability fix
#791 post-publish recovery -03
#792 blocker closure evidence
```

This is expensive, but it is failure-path cost, not evidence that the clean release should gain more approval stages.

Classification:

```text
R2_5_FAILURE_PATH_PR_TAX
= WATCH / SHOULD_FALL_AFTER_BOUNDARY_STABILIZATION / NON_RUNTIME
```

Keep the steady-state target:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal HUMAN_EVIDENCE closure
0 user manual pre-live GitHub actions
```

Do not reduce incident evidence quality merely to reduce PR count.

The preferred way to reduce failure-path PR tax is to remove deterministic post-publication defects before publication and remove duplicated contracts.

---

## 5. Proposed next-system direction

A successor release-system version is **not automatically authorized by this document**.

If the pre-live findings remain valid after v0.66 HUMAN_EVIDENCE / terminal closure, the smallest evidence-backed successor direction is:

```text
R2.6 candidate theme
= POST-PUBLISH BOUNDARY CONVERGENCE
```

Candidate principles:

```text
CHECK WOULD-BE STATE TRANSITION BEFORE PUBLISH
ONE POST-PUBLISH STATE OWNER
ONE PERSISTENT PAYLOAD CONTRACT
ONE SHARED COMMIT/GATE ADAPTER
ONE SHARED DURABLE REOBSERVER
SAME OWNER SEMANTICS FOR PERMANENT + RECOVERY
KEEP ONE PUBLISHER
KEEP APPEND-ONLY RECOVERY
KEEP HUMAN LIVE AUTHORITY
ADD NO CLEAN-PATH PR STAGE
```

Short form:

```text
PREPLAY BEFORE PUBLISH
DERIVE, DON'T REPEAT
REOBSERVE AFTER LAND
NO NEW AUTHORITY
```

This is a **candidate design direction only**. Do not freeze or implement R2.6 from this pre-live note alone.

---

## 6. What should explicitly remain unchanged

The following earned positive evidence and should not be traded away for convenience:

```text
release-simcore as actual production authority
main as design/evidence/admin authority
exact immutable candidate C/P/blob binding
latest.js == install.js
single permanent publisher
fast-forward-only publication
postmerge revalidation
Candidate Required
MAIN_HEALTH before durable main state mutation
append-only recovery events
historical failure evidence preservation
HUMAN_EVIDENCE as LIVE_PASS authority
```

The v0.66 incident chain is evidence that these boundaries are doing useful work.

---

## 7. Provisional scorecard

Compared with the v0.65.0 retrospective, R2.5 materially improved the approval side while exposing the next concentration of debt after publication.

```text
production safety                    10/10
exact runtime identity preservation  10/10
approval premerge predictability      9/10
auditability / append-only recovery  10/10
user manual GitHub burden            10/10
main-write fail-closed integrity      10/10
post-publish transition predictability 5/10
recovery contract simplicity          6/10
post-publish repair ergonomics         5/10
clean two-PR reliability               NOT PROVEN BY THIS RELEASE
```

Interpretation:

```text
v0.65 problem center = approval boundary
v0.66 problem center = post-publish state boundary
```

R2.5 appears to have done its intended job. The next stabilization should follow the newly exposed bottleneck rather than revisiting the already-improved approval layer.

---

## 8. Finding disposition table

```text
R2_5_APPROVAL_BOUNDARY_FIRST_REAL_USE
= PASS / KEEP

R2_5_PREMERGE_POSTMERGE_APPROVAL_PARITY
= PASS / KEEP

R2_5_PRODUCTION_ADMIN_AUTHORITY_SEPARATION
= STRONG PASS / KEEP

R2_5_MAIN_WRITE_GATE_FAIL_CLOSED
= STRONG PASS / KEEP

R2_5_POST_PUBLISH_APPEND_ONLY_RECOVERY
= STRONG PASS / KEEP

R2_5_POST_PUBLISH_REPAIR_RUNTIME_ISOLATION
= STRONG PASS / KEEP

R2_5_PREPUBLICATION_POST_PUBLISH_REPLAY_GAP
= FIX / PRIMARY FOLLOW-UP

R2_5_POST_PUBLISH_PAYLOAD_OWNER_WRITER_PARITY_GAP
= FIX

R2_5_RECOVERY_OWNER_DISPOSITION_PARITY_GAP
= FIX / KEEP REGRESSION AFTER CURRENT REPAIR

R2_5_POST_PUBLISH_REPAIR_TRUST_BOOTSTRAP_CYCLE
= FIX / DESIGN REQUIRED

R2_5_FAILURE_PATH_PR_TAX
= WATCH

v0.65 historical missing state receipt
= DEFER / HISTORICAL_ADMIN_AUDIT_DEBT / NON_BLOCKING_CURRENT
```

System-level provisional disposition:

```text
CURRENT SYSTEM = R2.5 + existing RS2-4 publication/state machinery
PRIMARY VERDICT = STABILIZE
ARCHITECTURE REPLACEMENT REQUIRED = NO
NEW PUBLISHER REQUIRED = NO
NEW CLEAN-PATH PR REQUIRED = NO
NEW USER PRE-LIVE ACTION REQUIRED = NO
```

---

## 9. Closure boundary for this feedback

This document evaluates release-system operation only through durable v0.66.0 `LIVE_PENDING`.

Current product release authority remains:

```text
releaseId = simcore-v0.66.0-new-05
state     = LIVE_PENDING / PENDING_REAL_LONG_CHAT
next gate = HUMAN_EVIDENCE
```

After human long-chat acceptance and terminal closure, append a final v0.66.0 release-system retrospective that decides whether the provisional `STABILIZE` verdict remains unchanged and whether the R2.6 candidate direction should be activated as a formal design task.

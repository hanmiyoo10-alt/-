# SimCore Release System v2.6 — Post-Publish Boundary Convergence Design

Date: **2026-08-29 KST**

Status: **DESIGN FROZEN · STABILIZE · NON_RUNTIME · IMPLEMENTATION BLOCKED UNTIL v0.66.0 HUMAN_EVIDENCE / TERMINAL RETROSPECTIVE**

Predecessor: `R2.5 — Approval Boundary Convergence`

Primary evidence:

- `docs/SIMCORE_RELEASE_SYSTEM_V2_5_V06600_PRELIVE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_06600_POST_PUBLISH_MAIN_WRITE_GATE_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06600_POST_PUBLISH_RECOVERY_DISPOSITION_PARITY_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_POST_PUBLISH_STATE_RECEIPT_DURABILITY_GAP_2026-08-29.md`
- `docs/SIMCORE_RELEASE_STATE_MARKER_TRANSITION_FIX_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_CONTINUOUS_FEEDBACK_LOOP.md`

Runtime mutation from this design: **NONE**

`release-simcore` mutation from this design: **NONE**

---

## 1. Decision

R2.6 is a **bounded stabilization**, not a release-engine replacement.

R2.5 materially improved the approval boundary. The first genuine v0.66.0 use reached exact approval activation and permanent publication without repeating the deterministic title/spec-path approval failures observed in v0.65.0.

The next concentration of operational debt appeared after publication:

```text
exact candidate verified
→ publication succeeds
→ deterministic LIVE_PASS → LIVE_PENDING transition defect appears
→ main convergence fails
→ recovery workflow duplicates stale owner vocabulary
→ persistent state receipt is declared by the owner but omitted by writer lanes
```

Every failure was caught safely. Production identity stayed exact and runtime bytes were not republished during repair. The authority architecture therefore remains sound.

System disposition:

```text
R2.6 = STABILIZE
```

Canonical R2.6 principle:

```text
PREPLAY BEFORE PUBLISH
ONE POST-PUBLISH STATE ENVELOPE
DERIVE WRITES FROM OWNER OUTPUT
REOBSERVE AFTER LAND
NO NEW AUTHORITY
```

Short form:

```text
SIMULATE EARLY
DERIVE, DON'T REPEAT
WRITE THROUGH ONE GATE
VERIFY DURABLE TRUTH
```

---

## 2. Frozen safety invariants

R2.6 preserves:

```text
release-simcore = actual runtime / deployment authority
main = design / evidence / roadmap / admin authority
Generic Candidate = durable candidate authority
Exact Approval = bounded release authorization
Permanent Release = sole production publisher
repo-main-write = sole bounded main integration gateway for release state
HUMAN_EVIDENCE = real-world LIVE_PASS authority
```

Also keep:

```text
exact immutable candidate C/P/blob binding
exact observed production parent
Candidate Required
postmerge approval revalidation
fast-forward-only publication
latest.js == install.js
append-only failed transaction / recovery evidence
MAIN_HEALTH before durable main state mutation
human real-long-chat gate
```

No second publisher, no new main writer, no automatic HUMAN_EVIDENCE.

---

## 3. Clean-path cost stays unchanged

R2.6 adds **no clean-path PR, job, approval stage, user action, daemon, or publisher**.

Target flow:

```text
PR1 product + release intent
→ candidate + receipt
→ PR2 exact approval
→ existing Permanent Release
   → Candidate Required
   → R2.6 prepublication state preplay
   → Publish Exact Candidate
   → shared post-publish state envelope
   → shared main commit/gate adapter
   → existing MAIN_HEALTH / repo-main-write
   → shared durable reobserver
→ LIVE_PENDING
→ HUMAN_EVIDENCE
→ PR3 terminal closure when required
```

Frozen cost targets:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal closure when HUMAN_EVIDENCE / PR3 is required
0 user manual pre-live GitHub operations
1 production publisher
1 main integration gateway
0 new required job
0 new lifecycle state
0 background polling/retry loop
```

---

## 4. Problem statement

R2.5 removed duplicated approval semantics and moved deterministic approval failures earlier. v0.66.0 exposed the same architectural smell in post-publish state handling.

Current post-publish semantics are spread across:

```text
release-state-converge.mjs
post-publish-state.mjs compatibility adapter
simcore-release-permanent.yml staging / allow / reobserve logic
simcore-release-state-sync.yml recovery staging / allow / reobserve logic
post-publish-state-permanent.test.mjs static assertions
repo-main-write.py gateway invocation contracts
```

Observed defects:

1. `LIVE_PASS → LIVE_PENDING` was not replayed against real predecessor main before production moved.
2. Owner-declared persistent payload and workflow-local staging/allow lists drifted.
3. Recovery workflow duplicated stale disposition vocabulary.
4. Durable reobserve could report success while a declared persistent receipt was absent.

The fix is boundary convergence, not a new release stage.

---

## 5. R2.6-A — Prepublication Post-Publish State Preplay

Classification:

```text
FIX / FAIL_EARLIER / PREPUBLICATION_STATE_PREPLAY / NON_RUNTIME
```

Before `Publish Exact Candidate`, replay the deterministic state transition that would occur if the already-verified candidate became production.

Placement:

```text
Resolve Permanent Authorization
→ Candidate Required
→ GATE_POST_PUBLISH_PREPLAY
→ Publish Exact Candidate
```

No new workflow or required job.

Preplay receives explicit synthetic production identity from Candidate Required:

```text
mode                    = PREPUBLICATION_SIMULATION
syntheticProductionC    = verified candidate C
syntheticProductionBlob = verified candidate blob
previousProductionC     = currently observed release-simcore P
version/releaseName     = exact approved release spec
```

This identity is ephemeral and cannot become durable authority.

Minimum checks:

```text
would-be manifest transition valid
would-be CURRENT_DEVELOPMENT has exactly one current release-state block
LIVE_PASS → LIVE_PENDING replacement well formed
would-be release record coherent
would-be state receipt coherent
owner persistent payload manifest bounded
changedPaths subset of static writer policy
no declared persistent member omitted
sync-state check clean after render
closure-integrity passes on simulated tree
no runtime/plugin/release-simcore write
```

Where practical, reuse pure MAIN_HEALTH verifier primitives with explicit simulated-production input rather than remote production authority.

Failure:

```text
productionMutation = NONE
publicationDispatch = BLOCKED
classification = FIX / PREPUBLICATION_POST_PUBLISH_QUALIFICATION
```

This would have caught the v0.66.0 two-marker defect before publication.

---

## 6. R2.6-B — One Post-Publish State Envelope

Classification:

```text
STABILIZE / SEMANTIC_OWNER_CONVERGENCE / NON_RUNTIME
```

Post-publish administrative semantics have one normalized output owner. Directional owner remains:

```text
release-state-converge.mjs
```

A bounded wrapper is allowed, but semantic ownership must remain singular.

Normalized `PostPublishStateEnvelope` includes at least:

```text
schemaVersion
releaseId
releaseAuthority
mode = PERMANENT | RECOVERY | PREPUBLICATION_SIMULATION
productionCommit
previousProductionCommit
productionBlob
version
releaseName
publisherRunId
liveScenarioId
validationStatus
lifecycleState
rLifecycleState
disposition
persistentPayloadManifest
changedPaths
stateReceiptPath
releaseRecordPath
expectedDurableClaims
productionMutation
mainMutation
```

`persistentPayloadManifest` declares what may need to become durable. It is not write permission.

Static writer policy remains separate defense in depth:

```text
owner persistentPayloadManifest
+ static writer policy
→ validated transaction file set
```

Fail closed when:

```text
owner path is outside static policy
changed path is not declared by owner
declared changed path is omitted from staging
staged path is not in changedPaths
```

Workflow YAML must not independently redefine owner disposition names.

---

## 7. R2.6-C — Shared Main Commit / Gate Adapter

Classification:

```text
SIMPLIFY / DUPLICATION_REMOVAL / NON_RUNTIME
```

Directional path:

```text
products/simcore/tooling/release-state-main-gate.mjs
```

Permanent and recovery currently repeat:

```text
read state result
construct stage list
construct repo-main-write allow list
create local state commit
invoke MAIN_HEALTH gateway
```

R2.6 moves this mechanical transaction into one shared adapter.

Responsibilities:

```text
validate envelope schema
validate manifest/policy intersection
verify git diff equals envelope changedPaths
stage exactly envelope changedPaths
create local bounded state commit
invoke existing repo-main-write.py with exactly validated paths
return gateway/run/commit identity
```

Forbidden:

```text
write release-simcore
publish candidate bytes
create approval
invent semantic state
change HUMAN_EVIDENCE
bypass MAIN_HEALTH
force-push main
write outside static writer policy
```

`repo-main-write.py` remains the main integration authority.

Permanent and recovery may provide different commit-message context but must not maintain separate staging/allow logic.

---

## 8. R2.6-D — Shared Durable Reobserver

Classification:

```text
STABILIZE / DURABILITY_PARITY / NON_RUNTIME
```

Directional path:

```text
products/simcore/tooling/release-state-reobserve.mjs
```

Inputs:

```text
immutable publication handoff
PostPublishStateEnvelope
landed main commit
exact durable repository checkout
```

At minimum verify:

```text
all changedPaths durable
all persistent payload members expected to exist durable
manifest production version/commit/blob
CURRENT_DEVELOPMENT snapshot and exactly one release-state block
SIMCORE_GUIDELINES production baseline when required
release record releaseId / production identity / live gate / state
state receipt releaseId / publisher run / C/P/blob / live scenario / result
validationStatus = PENDING_REAL_LONG_CHAT
lifecycleState = REAL_RELEASE_LIVE_PENDING
releaseAuthority = RS2_4_PERMANENT
release-simcore still equals published exact C/blob
latest.js == install.js
```

Missing state receipt is always failure.

Bounded success marker may be:

```text
RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS
```

This is evidence, not a new authority layer.

---

## 9. R2.6-E — Permanent / Recovery Orchestration Simplification

Classification:

```text
SIMPLIFY / WORKFLOW_THINNING / NON_RUNTIME
```

Permanent workflow becomes:

```text
resolve immutable authorization
run Candidate Required
run prepublication preplay
publish exact candidate through existing publisher
materialize post-publish envelope
call shared main-gate adapter
call shared durable reobserver
aggregate Required
```

Recovery workflow becomes:

```text
resolve append-only recovery request
load immutable original publisher handoff
reobserve current release-simcore C/blob
materialize same envelope in RECOVERY mode
call same main-gate adapter
call same durable reobserver
aggregate result
```

Workflow YAML remains orchestration and must not own:

```text
release-state marker semantics
persistent payload membership
state receipt field semantics
disposition vocabulary
staging path lists
durable field-by-field comparison definitions
```

---

## 10. R2.6-F — Trusted Repair Bootstrap Boundary

Classification:

```text
WATCH / KEEP CURRENT FALLBACK / DESIGN DEFERRED
```

v0.66.0 repeated a trusted-predecessor bootstrap cycle after production advanced while main admin truth was stale.

R2.6 does **not** weaken trusted predecessor semantics to make incident repair easier.

Keep:

```text
trusted predecessor verification
canonical durable-memory/admin bootstrap fallback
proposed CI self-change may not self-authorize
```

Rationale: preplay and contract convergence should remove the deterministic defect classes that triggered this cycle before publication.

Allowed automation improvement:

```text
if trusted lane detects published-production / stale-admin mismatch
→ emit bounded R2_6_BOOTSTRAP_REQUIRED diagnostic
→ include exact observed C/blob/current admin identity
→ do not perform automatic main write
```

A fully automated incident-repair qualification profile requires separate proof because it touches CI trust semantics.

---

## 11. Automation design

Standing rule:

```text
AUTOMATE EARLY CHECKING
AUTOMATE REPETITIVE EVIDENCE HANDLING
DO NOT AUTOMATE NEW AUTHORITY
```

Newly automated:

```text
would-be LIVE_PENDING replay before publication
owner-derived persistent file set
owner/writer parity validation
shared staging / allow construction
shared durable reobservation
bootstrap-cycle diagnosis output
```

Still bounded by existing authority:

```text
PR merge authorization path
production publication authority
main gateway authority
append-only recovery transaction policy
HUMAN_EVIDENCE LIVE_PASS
incident classification
successor implementation authorization
```

No polling, daemon, watcher, scheduled retry, or hidden background state machine.

---

## 12. Simplicity target

Before:

```text
state owner
+ permanent workflow path/disposition/reobserve copy
+ recovery workflow path/disposition/reobserve copy
+ static regression trying to keep copies aligned
```

After:

```text
1 state semantic owner
1 bounded envelope
1 static writer policy
1 main-gate adapter
1 durable reobserver
2 thin workflow orchestrators
```

No new lifecycle stage. Preplay is an internal check inside the existing permanent transaction.

---

## 13. Failure taxonomy

Suggested families:

```text
R2_6_PREPLAY_STATE_RENDER_FAIL
R2_6_PREPLAY_CLOSURE_FAIL
R2_6_PREPLAY_PAYLOAD_POLICY_FAIL
R2_6_STATE_ENVELOPE_INVALID
R2_6_STATE_PAYLOAD_POLICY_FAIL
R2_6_STATE_GIT_DIFF_MISMATCH
R2_6_MAIN_GATE_FAIL
R2_6_DURABLE_REOBSERVE_FAIL
R2_6_BOOTSTRAP_REQUIRED
```

Every failure report includes:

```text
productionMutation = NONE | ALREADY_PUBLISHED_UPSTREAM
authority stage
releaseId
candidate/production C
previous production P
blob
changedPaths when available
repair guidance class
```

Prepublication qualification failure and post-publication convergence incident must remain distinguishable.

---

## 14. Permanent regression matrix

Required positive controls:

```text
predecessor LIVE_PASS → candidate LIVE_PENDING
→ exactly one release-state block
→ valid manifest / record / receipt
→ bounded changedPaths
→ no durable write during preplay
```

```text
no predecessor release-state block → valid first insertion
already equivalent simulated state → normalized no-write result
```

Required negative controls:

```text
two/mismatched predecessor markers → fail before publication
owner path outside static policy → fail
changed path omitted from owner manifest → fail
candidate C/blob or previous P mismatch → fail
missing state receipt after land → fail
wrong publisherRunId / C / P / blob / live scenario → fail
multiple release-state markers after land → fail
release-simcore moved unexpectedly → fail / incident
latest != install → fail
```

Writer parity assertions:

```text
permanent and recovery call same main-gate adapter
no workflow-local persistent path list duplicates owner manifest
no workflow-local semantic disposition vocabulary
adapter stages exactly changedPaths
repo-main-write allow set equals validated changedPaths
```

Authority assertions:

```text
publisher count remains one
preplay has no push / dispatch / main-write primitive
state owner has no release-simcore mutation primitive
shared reobserver is read-only
trusted predecessor unchanged
HUMAN_EVIDENCE unchanged
```

---

## 15. Operational first-use proof

R2.6 is not operationally proven by implementation CI alone.

First-use proof must occur on a later genuine SimCore runtime release:

```text
PR1 user-visible cost unchanged
PR2 user-visible cost unchanged
Candidate Required PASS
R2.6 preplay PASS before publication
single publisher publishes exact approved candidate
post-publish envelope produced
shared main-gate adapter lands bounded payload through MAIN_HEALTH
shared reobserver PASS
LIVE_PENDING reached without deterministic owner/writer recovery
release-simcore latest == install
HUMAN_EVIDENCE remains separate
```

If preplay catches a real deterministic defect before publication, that also counts as strong positive first-use evidence if production remains unchanged and evidence is durably recorded.

---

## 16. Clean-path success criteria

Target:

```text
2 PRs to LIVE_PENDING
0 user manual pre-live GitHub operations
0 deterministic post-publish recovery caused by owner/writer contract drift
0 duplicated persistent payload lists in permanent/recovery workflows
0 duplicated disposition vocabulary in workflow YAML
1 state semantic envelope owner
1 shared main-gate adapter
1 shared durable reobserver
1 publisher
```

Failure-path PR count should fall because deterministic defects move before publication, not because append-only evidence is weakened.

---

## 17. Non-goals

R2.6 does not authorize:

```text
second publisher
new main writer
automatic PR merging
automatic HUMAN_EVIDENCE
background retries
polling
a new release PR stage
removal of postmerge approval revalidation
removal of Candidate Required
weakening MAIN_HEALTH
weakening closure integrity
rewriting failed historical transactions
automatic historical v0.65 receipt backfill
trusted predecessor bypass
runtime/plugin changes
```

---

## 18. Implementation boundary and gate

Design is authorized and frozen by the user on 2026-08-29.

Implementation remains intentionally blocked until v0.66.0 reaches terminal human-evidence review so any final release-system feedback can be incorporated before engine changes.

```text
R2_6_DESIGN_AUTHORIZED         = YES
R2_6_DESIGN_FROZEN             = YES
R2_6_IMPLEMENTATION_AUTHORIZED = NO
```

Unlock condition:

```text
v0.66.0 HUMAN_EVIDENCE review complete
+
v0.66.0 terminal release-system retrospective recorded
+
no new evidence invalidates this design
→ R2_6_IMPLEMENTATION_AUTHORIZED = YES
```

Implementation must use a separate release-system work branch and implementation worksheet. Do not mix R2.6 implementation with a runtime feature update.

---

## 19. Design verdict

```text
NEXT_RELEASE_SYSTEM_VERSION
= R2.6

NAME
= Post-Publish Boundary Convergence

DISPOSITION
= STABILIZE

PRIMARY_FIX
= PREPUBLICATION POST-PUBLISH STATE PREPLAY

SEMANTIC_CONVERGENCE
= ONE POST-PUBLISH STATE ENVELOPE

WRITER_SIMPLIFICATION
= ONE SHARED MAIN COMMIT/GATE ADAPTER

DURABILITY_SIMPLIFICATION
= ONE SHARED DURABLE REOBSERVER

PERMANENT_RECOVERY_PARITY
= SAME OWNER / SAME ADAPTER / SAME REOBSERVER

TRUSTED_PREDECESSOR
= KEEP UNCHANGED

CLEAN_PATH_PR_COUNT
= UNCHANGED

NEW_AUTHORITY
= NONE

RUNTIME_MUTATION
= NONE

RELEASE_SIMCORE_MUTATION
= NONE

IMPLEMENTATION_NOW
= BLOCKED UNTIL v0.66.0 HUMAN_EVIDENCE + TERMINAL RETROSPECTIVE
```

R2.6 applies the lesson R2.5 proved on approval to post-publish state handling:

```text
if a deterministic release defect can be known before an irreversible authority transition,
check it there using the same semantic owner that will be used afterward.
```

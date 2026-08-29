# SimCore Release System v2.6 — Post-Publish Boundary Convergence Design

Date: **2026-08-29 KST**

Status: **DESIGN FROZEN · STABILIZE · NON_RUNTIME · IMPLEMENTATION BLOCKED UNTIL v0.66 TERMINAL AUTHORITY IS DURABLY RE-ESTABLISHED**

Predecessor: `R2.5 — Approval Boundary Convergence`

Primary evidence:

- `docs/SIMCORE_RELEASE_SYSTEM_V2_5_V06600_PRELIVE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_06600_POST_PUBLISH_MAIN_WRITE_GATE_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_06600_POST_PUBLISH_RECOVERY_DISPOSITION_PARITY_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_POST_PUBLISH_STATE_RECEIPT_DURABILITY_GAP_2026-08-29.md`
- `docs/SIMCORE_RELEASE_STATE_MARKER_TRANSITION_FIX_2026-08-29.md`
- `docs/SIMCORE_06600_TERMINAL_CLOSURE_AUTOMATED_REVERT_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_CONTINUOUS_FEEDBACK_LOOP.md`

Runtime mutation from this design: **NONE**

`release-simcore` mutation from this design: **NONE**

---

## 1. Decision

R2.6 is a **bounded stabilization**, not a release-engine replacement.

R2.5 materially improved the approval boundary. The first genuine v0.66.0 release reached exact approval activation and permanent publication without repeating the deterministic title/spec-path failures seen in v0.65.0.

The next debt concentration moved one stage later:

```text
exact candidate verified
→ publication succeeds
→ deterministic LIVE_PASS → LIVE_PENDING transition defect appears
→ main convergence fails
→ recovery duplicates stale owner vocabulary
→ owner declares state receipt but writer lanes omit it
→ later terminal close is automatically reverted by repository automation
```

The authority shell still protected runtime truth. Production identity remained exact and runtime bytes were never republished during administrative repair. Therefore the correct disposition is:

```text
R2.6 = STABILIZE
```

Canonical principle:

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

R2.6 preserves unchanged:

```text
release-simcore = runtime/deployment authority
main = design/evidence/roadmap/admin authority
Generic Candidate = durable candidate authority
Exact Approval = bounded release authorization
Permanent Release = sole production publisher
repo-main-write = bounded main integration gateway
HUMAN_EVIDENCE = real-world LIVE_PASS authority
```

Also keep:

```text
exact immutable C/P/blob binding
exact observed production parent
Candidate Required
postmerge approval revalidation
fast-forward-only publication
latest.js == install.js
append-only failed transaction/recovery evidence
MAIN_HEALTH before durable main state mutation
human real-long-chat gate
trusted predecessor verification
```

No second publisher. No new main writer. No automatic HUMAN_EVIDENCE.

---

## 3. Clean-path cost remains unchanged

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
3 PRs → terminal closure
0 user manual pre-live GitHub operations
1 production publisher
1 main integration gateway
0 new required jobs
0 new lifecycle states
0 background polling/retry loops
```

Preplay is an internal check, not a new operator-visible stage.

---

## 4. Problem statement

Current post-publish semantics are distributed across:

```text
release-state-converge.mjs
post-publish-state.mjs compatibility adapter
simcore-release-permanent.yml staging/allow/reobserve logic
simcore-release-state-sync.yml recovery staging/allow/reobserve logic
post-publish-state-permanent.test.mjs static assertions
repo-main-write.py invocation contracts
```

v0.66 proved four gaps:

1. **Timing gap** — would-be LIVE_PENDING transition was not replayed against real predecessor main before production moved.
2. **Payload parity gap** — owner persistent payload and workflow staging/allow copies drifted.
3. **Vocabulary parity gap** — recovery workflow duplicated semantic disposition strings.
4. **Durability parity gap** — durable reobserve could omit a declared persistent receipt.

The later terminal-close automated revert adds a fifth boundary to investigate: repository automation can still invalidate a terminal administrative projection after a normal terminal PR merge.

R2.6 fixes the first four by convergence. It does not guess at the fifth until its root cause is known.

---

## 5. R2.6-A — Prepublication Post-Publish State Preplay

Classification:

```text
FIX / FAIL_EARLIER / PREPUBLICATION_STATE_PREPLAY / NON_RUNTIME
```

Placement:

```text
Resolve Permanent Authorization
→ Candidate Required
→ GATE_POST_PUBLISH_PREPLAY
→ Publish Exact Candidate
```

The gate receives synthetic production identity from the already-verified candidate:

```text
mode = PREPUBLICATION_SIMULATION
syntheticProductionC = verified candidate C
syntheticProductionBlob = verified candidate blob
previousProductionC = currently observed release-simcore P
version/releaseName/liveScenario = exact approved spec
```

The synthetic identity exists only inside a temporary workspace. It is not authority and is never persisted.

Minimum checks:

```text
would-be manifest transition valid
CURRENT_DEVELOPMENT would contain exactly one current release-state block
LIVE_PASS → LIVE_PENDING replacement well formed
release record coherent
state receipt coherent
owner persistent payload bounded
changedPaths subset of static writer policy
no declared persistent member omitted
sync-state check clean after render
closure-integrity passes on simulated tree
no release-simcore/main/runtime write
```

Where practical, reuse pure MAIN_HEALTH primitives with explicit simulated-production input rather than remote production authority.

Failure semantics:

```text
productionMutation = NONE
publicationDispatch = BLOCKED
classification = FIX / PREPUBLICATION_POST_PUBLISH_QUALIFICATION
```

The v0.66 two-marker defect should have failed here before publication.

---

## 6. R2.6-B — One Post-Publish State Envelope

Classification:

```text
STABILIZE / SEMANTIC_OWNER_CONVERGENCE / NON_RUNTIME
```

Post-publish administrative semantics have one normalized output owner. Directional owner remains `release-state-converge.mjs`; a bounded wrapper is allowed if it preserves one semantic authority.

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

`persistentPayloadManifest` declares semantic transaction membership. It is not permission to write arbitrary paths.

Static writer policy remains a separate defense layer:

```text
owner manifest + static policy → validated transaction file set
```

Fail closed when:

```text
owner path outside policy
changed path not declared by owner
declared changed path omitted from staging
staged path not in changedPaths
```

Workflow YAML must not redefine semantic disposition vocabulary.

---

## 7. R2.6-C — Shared Main Commit / Gate Adapter

Classification:

```text
SIMPLIFY / DUPLICATION_REMOVAL / NON_RUNTIME
```

Directional path:

`products/simcore/tooling/release-state-main-gate.mjs`

Responsibilities:

```text
validate envelope
validate manifest/policy intersection
verify git diff equals changedPaths
stage exactly changedPaths
create bounded local state commit
invoke existing repo-main-write.py with exactly validated paths
return gateway/run/commit identity
```

Forbidden:

```text
release-simcore write
candidate publication
approval creation
semantic state invention
HUMAN_EVIDENCE mutation
MAIN_HEALTH bypass
force push
out-of-policy main write
```

Permanent and recovery use the same adapter. They may differ only in immutable input source and commit-message context.

---

## 8. R2.6-D — Shared Durable Reobserver

Classification:

```text
STABILIZE / DURABILITY_PARITY / NON_RUNTIME
```

Directional path:

`products/simcore/tooling/release-state-reobserve.mjs`

Inputs:

```text
immutable publication handoff
PostPublishStateEnvelope
landed main commit
exact durable repository checkout
```

Required checks:

```text
all changedPaths durable
all persistent payload members expected to exist durable
manifest version/commit/blob
CURRENT_DEVELOPMENT snapshot + exactly one release-state block
SIMCORE_GUIDELINES baseline when required
release record identity/live state
state receipt releaseId/publisher/C/P/blob/live scenario/result
validationStatus = PENDING_REAL_LONG_CHAT
lifecycleState = REAL_RELEASE_LIVE_PENDING
releaseAuthority = RS2_4_PERMANENT
release-simcore still equals exact published C/blob
latest.js == install.js
```

Missing receipt is always failure.

Bounded success marker:

```text
RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS
```

This is evidence, not authority.

---

## 9. R2.6-E — Thin Permanent / Recovery Orchestration

Permanent workflow target:

```text
resolve authorization
Candidate Required
preplay
publish through existing publisher
materialize envelope
shared main-gate adapter
shared durable reobserver
aggregate Required
```

Recovery workflow target:

```text
resolve append-only request
load immutable publisher handoff
reobserve current release-simcore C/blob
materialize same envelope in RECOVERY mode
same main-gate adapter
same durable reobserver
aggregate result
```

Workflow YAML remains orchestration and no longer owns:

```text
release-state marker semantics
persistent payload membership
state receipt semantics
disposition vocabulary
staging path lists
durable field comparison definitions
```

---

## 10. R2.6-F — Trusted Repair / Terminal Control-Plane Boundary

Classification:

```text
WATCH / KEEP CURRENT TRUST MODEL / ROOT-CAUSE GATED
```

R2.6 does not weaken trusted predecessor verification or introduce self-authorizing CI repair.

Keep:

```text
trusted predecessor verification
canonical admin bootstrap fallback
proposed CI self-change cannot self-authorize
```

Allowed automation:

```text
published-production / stale-admin mismatch
→ emit bounded R2_6_BOOTSTRAP_REQUIRED diagnostic
→ include exact observed C/blob/admin identity
→ no automatic main write
```

The newly observed automated revert of terminal PR #796 is not silently folded into the core R2.6 implementation. Its root cause must be resolved first. If the cause is a duplicated or ambiguous terminal main-write/control-plane contract, this design must be amended before implementation.

---

## 11. Automation policy

R2.6 automates repetitive deterministic work without acquiring new authority.

New automation:

```text
would-be LIVE_PENDING replay before publication
owner-derived persistent file set
owner/writer parity validation
shared staging/allow construction
shared durable reobservation
bounded bootstrap-required diagnostics
```

Not automated:

```text
new publisher authority
new main writer authority
automatic PR merge
automatic HUMAN_EVIDENCE
automatic trusted-predecessor bypass
background retry/polling
```

---

## 12. Simplicity target

Before:

```text
state owner
+ permanent workflow copy of paths/vocabulary/reobserve
+ recovery workflow copy of paths/vocabulary/reobserve
+ tests attempting to keep the copies aligned
```

After:

```text
1 semantic owner
1 bounded state envelope
1 static writer policy
1 shared main-gate adapter
1 shared durable reobserver
2 thin workflows
```

No new lifecycle stage.

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
R2_6_TERMINAL_CONTROL_PLANE_BLOCKED
```

Every report includes:

```text
productionMutation
stage
releaseId
C
P
blob
changedPaths when available
repair guidance class
```

---

## 14. Permanent regression matrix

Positive controls:

```text
LIVE_PASS predecessor → LIVE_PENDING simulation → exactly one marker
no predecessor state block → valid first insertion
already-equivalent simulated state → normalized no-write result
permanent and recovery both consume same envelope/adapter/reobserver
```

Negative controls:

```text
multiple/mismatched markers → fail before publication
owner path outside writer policy → fail
changed path omitted from owner manifest → fail
C/blob/P mismatch → fail
missing state receipt after land → fail
wrong publisherRunId/C/P/blob/live scenario → fail
multiple release-state markers after land → fail
unexpected production movement → fail/incident
latest != install → fail
workflow-local duplicated disposition/path contract reintroduced → fail
```

Authority controls:

```text
publisher count remains one
preplay has no push/dispatch/main-write primitive
semantic owner has no release-simcore mutation primitive
reobserver read-only
trusted predecessor unchanged
HUMAN_EVIDENCE unchanged
```

---

## 15. Operational first-use proof

After implementation, a later genuine runtime release must prove:

```text
2-PR pre-live path unchanged
Candidate Required PASS
R2.6 preplay PASS before publication
single publisher publishes exact candidate
state envelope produced
shared main-gate adapter lands bounded payload through MAIN_HEALTH
shared reobserver PASS
LIVE_PENDING reached without deterministic post-publish recovery
latest == install
HUMAN_EVIDENCE remains separate
```

A real defect caught by preplay before publication also counts as strong positive evidence if production remains unchanged and the failure is preserved.

---

## 16. Success criteria

```text
2 PRs to LIVE_PENDING
0 user manual pre-live GitHub operations
0 deterministic post-publish recovery caused by owner/writer drift
0 duplicated persistent payload lists in workflows
0 duplicated disposition vocabulary in workflows
1 state semantic owner
1 shared main-gate adapter
1 shared durable reobserver
1 publisher
```

The system gets simpler by removing duplicated definitions, not by weakening evidence.

---

## 17. Non-goals

R2.6 does not authorize:

```text
second publisher
new main writer
automatic HUMAN_EVIDENCE
new clean-path PR/job/stage
background retry/polling
Candidate Required removal
postmerge approval revalidation removal
MAIN_HEALTH weakening
closure-integrity weakening
historical transaction rewrite
historical v0.65 receipt backfill
trusted predecessor bypass
runtime/plugin mutation
```

---

## 18. Design / implementation gate

User authorization on 2026-08-29 authorizes and freezes the R2.6 design.

The implementation gate is stricter because v0.66 terminal HUMAN_EVIDENCE was accepted but the subsequent terminal administrative projection was automatically reverted.

```text
R2_6_DESIGN_AUTHORIZED = YES
R2_6_DESIGN_FROZEN = YES
R2_6_IMPLEMENTATION_AUTHORIZED = NO
```

Unlock condition:

```text
v0.66 terminal-closure automated revert root cause resolved
+
v0.66 terminal administrative truth durably re-established
+
terminal release-system retrospective recorded
+
no new evidence invalidates R2.6
→ R2_6_IMPLEMENTATION_AUTHORIZED = YES
```

Implementation must use a separate release-system work branch and worksheet. Do not mix R2.6 implementation with runtime feature work.

---

## 19. Design verdict

```text
NEXT_RELEASE_SYSTEM_VERSION = R2.6
NAME = Post-Publish Boundary Convergence
DISPOSITION = STABILIZE
PRIMARY_FIX = PREPUBLICATION POST-PUBLISH STATE PREPLAY
SEMANTIC_CONVERGENCE = ONE POST-PUBLISH STATE ENVELOPE
WRITER_SIMPLIFICATION = ONE SHARED MAIN COMMIT/GATE ADAPTER
DURABILITY_SIMPLIFICATION = ONE SHARED DURABLE REOBSERVER
PERMANENT_RECOVERY_PARITY = SAME OWNER / ADAPTER / REOBSERVER
TRUSTED_PREDECESSOR = KEEP UNCHANGED
CLEAN_PATH_PR_COUNT = UNCHANGED
NEW_AUTHORITY = NONE
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
IMPLEMENTATION_NOW = BLOCKED PENDING TERMINAL CONTROL-PLANE RESOLUTION
```

R2.6 applies the lesson R2.5 proved on approval to post-publish state handling:

```text
if a deterministic release defect can be known before an irreversible authority transition,
check it there with the same semantic owner that will be used afterward.
```

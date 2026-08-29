# SimCore Release System R2.6 — v0.67 First-Use Operational Feedback

Date: 2026-08-29 KST

Status: **FIRST GENUINE USE OBSERVED · CORE DESIGN VALIDATED · ONE CONTROL-PLANE FIX RESOLVED · ACTIVATION/STATUS CONVERGENCE FIX REQUIRED**

Classification: **RELEASE SYSTEM FEEDBACK · NON_RUNTIME · NO PRODUCT BYTE CHANGE**

## 1. Scope

This packet evaluates R2.6 `Post-Publish Boundary Convergence` against its first genuine production use during the v0.67.0 release transaction.

Primary authorities/evidence:

- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_CLOSURE_2026-08-29.md`
- `products/simcore/releases/R_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_STATUS.json`
- `docs/SIMCORE_06700_PREPUBLICATION_STATE_PREPLAY_MISSING_SYNC_WRITE_REPORT_BLOCKER_2026-08-29.md`
- `products/simcore/releases/records/simcore-v0.67.0-new-02.json`
- `products/simcore/releases/state-receipts/simcore-v0.67.0-new-02.json`

This feedback does not modify the SimCore runtime/plugin and does not alter `release-simcore`.

## 2. Executive verdict

```text
R2.6 core architecture                    PASS
PREPLAY_BEFORE_PUBLISH safety             STRONGLY VALIDATED
single exact candidate preservation       PASS
single production publisher               PASS
post-publish shared convergence            PASS on repaired retry
shared durable readback                    PASS on repaired retry
production mutation on preplay failure     NONE
control-plane implementation quality       PASS WITH FIX
operational activation/status truth        FIX REQUIRED
R2.6 terminal operational closure          NOT YET
```

R2.6 should be retained. The first genuine use demonstrated the exact safety property it was designed to provide: a deterministic control-plane failure occurred before publication, production remained unchanged, the defect was repaired separately, and the same immutable candidate was later published through the existing permanent authority.

The main new debt is administrative/control-plane truth drift: R2.6 has now executed in production, but its living status and permanent regression still require `activationAuthorized=false` and `operationalActivationProof=PENDING`.

## 3. What worked exceptionally well

### 3.1 Preplay failed before production mutation

Initial permanent run:

```text
33248665243
```

Candidate authorization and Required verification passed. The R2.6 prepublication state preplay then failed on a cross-root report-path defect before the publisher step.

Observed consequence:

```text
publication                         SKIPPED
release-simcore mutation            NONE
candidate mutation/rebuild          NONE
exact approval invalidation         NONE
```

This is direct operational validation of the R2.6 principle:

```text
PREPLAY BEFORE PUBLISH
```

The design explicitly allowed a real defect caught by preplay before publication to count as strong positive evidence when production remains unchanged. The first use did exactly that.

Classification:

```text
R2_6_PREPLAY_FAIL_EARLY_SAFETY
= PASS / DIRECT OPERATIONAL PROOF
```

### 3.2 Exact candidate remained immutable through repair

The v0.67 candidate remained:

```text
release id       simcore-v0.67.0-new-02
candidate commit 01a4204981191968ba22ba6ad161c1053d6bc7d0
candidate blob   24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
previous prod    4b6ae1a4c63f6be658c6163168cc46a1adef60aa
```

The repair touched only release-system control-plane code/tests. No runtime rebuild or replacement candidate was needed.

This is important because the release system treated the defect as a verifier/control-plane problem rather than contaminating candidate authority.

Classification:

```text
R2_6_EXACT_CANDIDATE_IMMUTABILITY_DURING_CONTROL_PLANE_REPAIR
= PASS
```

### 3.3 Existing authority shell handled recovery cleanly

The failed permanent run was not partially rerun after its Resolve job had frozen an old verifier identity.

Instead the existing exact-approval activation adapter was rerun so that it:

1. revalidated the original approval;
2. revalidated the immutable candidate;
3. revalidated the unchanged production parent;
4. selected repaired current `main` as the new verifier/control-plane source;
5. dispatched a fresh Permanent Release.

Fresh permanent run:

```text
33249672791
```

Result:

```text
Resolve Permanent Authorization       PASS
Candidate Required / Verify           PASS
Candidate Required / Required         PASS
Preplay post-publish state            PASS
Publish through permanent controller  PASS
Build immutable post-publish handoff  PASS
Upload publication handoff            PASS
Declare Published State               PASS
Permanent Release Required            PASS
```

This proves that R2.6 did not require a second publisher, candidate rewrite, force publication, or new recovery authority.

### 3.4 Shared post-publish convergence succeeded after repair

The successful retry durably produced:

```text
production_version      0.67.0
release_commit          01a4204981191968ba22ba6ad161c1053d6bc7d0
release_blob            24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
validation_status       PENDING_REAL_LONG_CHAT
lifecycleState          REAL_RELEASE_LIVE_PENDING
releaseAuthority        RS2_4_PERMANENT
```

Independent production readback also proved:

```text
latest.js blob  = 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
install.js blob = 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
latest == install = TRUE
```

The post-publish state stopped correctly at human live-validation pending rather than auto-promoting M2-5.

Classification:

```text
R2_6_POST_PUBLISH_CONVERGENCE_FIRST_SUCCESS
= PASS / DIRECT OPERATIONAL PROOF
```

## 4. First-use defect and lesson

### 4.1 FIX RESOLVED — cross-root report binding

Root cause:

```text
process cwd != declared --root
+
sync-state --report resolved against cwd
→ report escaped synthetic preplay worktree
→ ENOENT
```

Prior regression topology used `cwd == root`, so it validated semantic content without reproducing the actual workflow filesystem topology.

Repair PR:

```text
#813 Fix SimCore v0.67 cross-root prepublication report binding
```

Repair consequences:

```text
--report resolves below declared --root
report parent is prepared
failure reports use same root binding
regression intentionally sets cwd != root
report escape into cwd is rejected
```

Classification:

```text
CROSS_ROOT_REPORT_BINDING_DEFECT
= FIX / RESOLVED

TEST_TOPOLOGY_GAP
= FIX / RESOLVED FOR THIS PATH
```

### 4.2 Generalized recommendation — root-aware tooling contract

The defect exposes a broader test-design lesson.

Any release-system tool that accepts a logical `--root` should treat it as the filesystem authority for all relative artifact/report paths unless a parameter is explicitly documented as process-cwd relative.

Recommended permanent contract for root-aware tools:

```text
relative input/output path
→ resolve under declared root

absolute path
→ reject unless explicitly allowed

../ escape outside root
→ reject

cwd == root
→ PASS control

cwd != root
→ PASS control
```

This should be applied as a narrow release-system test-hardening task, not mixed into runtime feature work.

## 5. FIX REQUIRED — R2.6 activation/status truth is stale

Current living R2.6 status still declares:

```text
status = IMPLEMENTED_PERMANENT_CI_QUALIFIED_ACTIVATION_PENDING
activationAuthorized = false
operationalActivationProof = PENDING
```

The permanent R2.6 regression also explicitly asserts:

```text
activationAuthorized === false
```

But v0.67 has now genuinely executed the R2.6 preplay/shared post-publish path and completed a successful permanent publication on fresh run `33249672791`.

Therefore the living R2.6 administrative truth is no longer describing reality.

Classification:

```text
R2_6_ACTIVATION_STATUS_DRIFT_AFTER_FIRST_USE
= FIX
= NON_RUNTIME
= DOES NOT BLOCK v0.67 REAL_LONG_CHAT
= BLOCKS R2.6 ADMINISTRATIVE/OPERATIONAL CLOSURE
```

Required correction before declaring R2.6 operationally closed:

1. preserve an explicit activation/first-use evidence authority;
2. change living status from activation-pending to activated/first-use-proven;
3. set `operationalActivationProof` to the concrete v0.67 evidence/run;
4. replace the regression's permanent `activationAuthorized=false` assertion with a lifecycle-aware assertion matching current living truth;
5. keep historical implementation-closure text historical rather than rewriting it to pretend activation had already happened at implementation qualification.

Do not hand-wave this by deleting the activation field. The separation was a deliberate safety concept and should converge cleanly once consumed.

## 6. FIX / DESIGN CLARIFICATION — activation gate semantics must be explicit

Repository search currently shows `activationAuthorized` living primarily in the R2.6 status and its regression assertion. The v0.67 permanent path nevertheless executed R2.6 code.

This creates an ambiguity:

```text
Was activationAuthorized intended as:
A. executable control-plane authorization,
or
B. documentary lifecycle state only?
```

The current naming/design language says activation is separately gated, which reads as stronger than mere documentation.

Recommended resolution:

```text
If executable authorization is intended:
→ Permanent Resolve/preplay must verify a bounded activation artifact/state.

If documentary lifecycle state is intended:
→ rename/describe it so it cannot be mistaken for a runtime gate,
   and define exactly when first genuine use converges it to activated/proven.
```

Do not add another publisher, lifecycle state, manual GitHub step, or clean-path PR solely to solve this. The correction should remain within existing main evidence/state authority.

Classification:

```text
R2_6_ACTIVATION_GATE_SEMANTICS_AMBIGUITY
= FIX / DESIGN CLARIFICATION
= NON_RUNTIME
```

## 7. WATCH — verifier identity / rerun ergonomics

The first-use incident also exposed an operational nuance:

```text
successful Resolve job
→ verifier/control-plane SHA frozen in run outputs
→ rerunning only failed permanent jobs after a control-plane fix can reuse stale verifier identity
```

The safe recovery was to rerun the exact-approval dispatch boundary and create a fresh permanent run.

This worked, but the operator guidance should make the distinction machine-readable and obvious.

Recommended bounded diagnostic:

```text
CONTROL_PLANE_FIXED_AFTER_RESOLVE
→ FRESH_PERMANENT_DISPATCH_REQUIRED
→ DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY
```

This is not a request for automatic retry or background polling. It is clearer recovery guidance using existing authority.

Classification:

```text
R2_6_FROZEN_VERIFIER_RERUN_ERGONOMICS
= WATCH / DOCUMENT_AND_DIAGNOSE
```

## 8. WATCH — GitHub Actions Node runtime deprecation

Existing implementation closure already records GitHub Actions Node 20 runtime deprecation warnings being forced onto Node 24.

Keep separate:

```text
GITHUB_ACTIONS_NODE20_ACTION_RUNTIME_DEPRECATION
= WATCH
= PLATFORM/DEPENDENCY MAINTENANCE
= NOT R2.6 SEMANTIC DEFECT
```

Do not mix dependency pin upgrades into the R2.6 first-use closure unless they become a real blocker.

## 9. Clean-path target assessment after first use

The first attempt was not a clean-path success because the newly introduced preplay itself contained a topology defect.

However, after the bounded control-plane repair, the same release transaction family completed with:

```text
new publisher                         0
candidate rebuild                     0
force publication                     0
new lifecycle state                   0
automatic HUMAN_EVIDENCE              0
background retry/polling              0
production mutation during failed run 0
```

Therefore the architecture target remains sound.

The next genuine release should be used to measure the stricter clean-path claim:

```text
R2.6 preplay PASS first try
→ publish exact candidate
→ shared main gate PASS
→ shared durable reobserver PASS
→ LIVE_PENDING
→ no deterministic post-publish recovery
```

That next clean release is useful confirmation, but it should not erase the fact that v0.67 already supplies valid first-use operational proof.

## 10. Recommended action order

```text
1. Keep v0.67 product real-long-chat validation independent and continue normally.
2. In a separate release-system/admin transaction, converge R2.6 activation/status truth.
3. Make activation-gate semantics explicit: executable vs documentary.
4. Add generalized root/cwd topology regressions for root-aware release tools where applicable.
5. Add bounded stale-verifier rerun guidance.
6. Leave Node action runtime deprecation as separate WATCH.
7. Use the next genuine release as clean-path confirmation, not as a prerequisite for recognizing v0.67 first-use proof.
```

## 11. Final feedback classification

```text
R2_6_FIRST_GENUINE_USE
= PROVEN ON v0.67

R2_6_CORE_DESIGN
= KEEP

R2_6_PREPLAY_SAFETY
= STRONG PASS

R2_6_POST_PUBLISH_SHARED_BOUNDARY
= PASS AFTER CONTROL_PLANE_FIX

R2_6_CROSS_ROOT_DEFECT
= FIXED

R2_6_ACTIVATION_STATUS_DRIFT
= FIX REQUIRED

R2_6_ACTIVATION_GATE_SEMANTICS
= FIX / CLARIFY

R2_6_FROZEN_VERIFIER_RERUN_ERGONOMICS
= WATCH

R2_6_NODE_ACTION_RUNTIME_DEPRECATION
= WATCH

R2_6_OPERATIONAL_CLOSURE
= NOT YET, ADMIN CONVERGENCE REQUIRED
```

Bottom line: R2.6 made the release system materially safer. Its most important feature already paid rent by converting a real control-plane defect into a prepublication failure with zero production mutation. The remaining work is primarily to make the control plane's living description of R2.6 match the system that is already running.
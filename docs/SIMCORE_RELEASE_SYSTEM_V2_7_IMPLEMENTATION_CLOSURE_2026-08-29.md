# SimCore Release System R2.7 Implementation Closure

Date: 2026-08-29 KST

Status: **IMPLEMENTATION VERIFIED · PERMANENT CI QUALIFIED · ACTIVATION PENDING**

Classification: **RELEASE SYSTEM · SIMPLIFY + AUTOMATE · NON_RUNTIME · PRODUCTION UNCHANGED**

## Authority and scope

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN.md`

Implementation authorization:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Implementation worksheet:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_IMPLEMENTATION_WORKSHEET_2026-08-29.md`

This implementation changes release-system control-plane tooling, diagnostics, tests, and Permanent orchestration only. It does not mutate SimCore runtime/plugin bytes and does not mutate `release-simcore`.

## Implemented simplicity / automation boundaries

### 1. One root-aware contract for new R2.7 owners

`products/simcore/tooling/root-path.mjs` defines the shared R2.7 path authority:

```text
relative path -> resolve below --root
absolute path -> reject by default
../ escape -> reject
cwd == root -> supported
cwd != root -> supported
```

The implementation intentionally does not mechanically rewrite predecessor tools that already carry the v0.67-fixed equivalent semantics. Broad stylistic migration is deferred because it would increase control-plane risk without changing behavior.

### 2. One pure recovery decision owner

`products/simcore/tooling/release-recovery-decision.mjs` derives one bounded disposition from frozen verifier identity, current control-plane identity, expected parent, candidate production identity, observed production, phase, and publication state.

Supported dispositions:

```text
SAFE_TO_RERUN_FAILED_JOB
FRESH_PERMANENT_DISPATCH_REQUIRED
RECOVERY_REQUEST_REQUIRED
MANUAL_EVIDENCE_REQUIRED
BLOCKED_IDENTITY_MOVED
```

The v0.67 lesson is now machine-readable:

```text
prepublication failure
+ production still at expected parent
+ current main != frozen verifier
→ FRESH_PERMANENT_DISPATCH_REQUIRED
→ DO_NOT_RERUN_FAILED_PERMANENT_JOB_ONLY
```

The classifier has no publication, main-write, retry, merge, network, or HUMAN_EVIDENCE authority.

### 3. Thin Permanent failure routing

`.github/workflows/simcore-release-permanent.yml` retains the R2.6 clean path unchanged and adds only a failure-only bounded diagnostic step inside the existing `publish` job.

The step:
- runs only after failure;
- reobserves current `main` and `release-simcore`;
- invokes the pure recovery decision owner;
- emits a machine-readable report;
- uses `continue-on-error: true` so diagnostics cannot replace the original failure;
- does not dispatch, retry, publish, merge, or write main.

No new job, clean-path PR, publisher, writer, lifecycle state, or background retry loop was added.

### 4. Evidence-derived operational proof

`products/simcore/tooling/release-operational-proof.mjs` derives `operationallyProven=true` only from coherent canonical durable evidence:

```text
canonical release record path
canonical state receipt path
matching releaseId / publisherRunId / C / P / blob
record productionTruth = PUBLISHED_IDENTITY_VERIFIED
record stateSyncStatus = PASS
record release state coherent
receipt releaseAuthority = RS2_4_PERMANENT
receipt result = PASS
receipt validation/lifecycle coherent
live scenario coherent
```

Caller-provided evidence paths are bound exactly to:

```text
products/simcore/releases/records/<releaseId>.json
products/simcore/releases/state-receipts/<releaseId>.json
```

Equivalent copied content from a noncanonical caller path fails closed.

### 5. Permanent regression and classification

`release-system-r2-7` is registered in the permanent regression batch and covers:
- root binding with `cwd != root`;
- absolute/escape rejection;
- all five recovery dispositions;
- stale-verifier fresh-dispatch guidance;
- post-publication recovery routing;
- HUMAN_EVIDENCE remaining manual;
- unexpected production movement blocking;
- operational-proof positive and negative controls;
- no authority primitives in R2.7 owners;
- one publisher and preserved R2.6 preplay-before-publish ordering;
- failure-only workflow integration;
- R2.7 activation remaining separate.

The new R2.7 owner files are explicitly classified into permanent CI / harness / state-sync scope.

## Qualification evidence

Passing implementation qualification:

```text
PR                     #826
qualified branch head  78b415d7f432cbe33f93dda67d03a3f2bfdac33b
SimCore CI run          33251682349 (#2709)
Verify job              99098343831 PASS
Required job            99098399663 PASS
```

The proposed permanent verifier completed successfully after trusted-predecessor verification.

## Validation anomaly ledger

### FIX · RESOLVED — fixture envelope

Initial CI `33251523100` (`#2705`) failed only because the new R2.7 regression fixture did not use the common harness fixture envelope.

All semantic/static/architecture/state/coordination gates outside the fixture loader passed.

Resolution: conform the fixture to the standard `id / suite / input / expected / meta` envelope.

### FIX · RESOLVED — canonical operational proof input binding

Second CI `33251579986` (`#2707`) reached the R2.7 suite and showed that equivalent valid record/receipt content could be supplied through noncanonical caller paths because only the receipt's declared path was checked.

Resolution: bind CLI `--record` and `--receipt` inputs to canonical release evidence locations after semantic validation.

This strengthens evidence identity without adding authority.

### DEFER — predecessor helper mechanical migration

R2.7 establishes `root-path.mjs` as the canonical helper for new/changed R2.7 surfaces. Existing predecessor tools already carry the v0.67 root fix and remain behaviorally protected.

Mechanical replacement across predecessor tooling is deferred because it is a broad low-value refactor and must not be mixed into this bounded implementation solely for stylistic deduplication.

### WATCH · NONBLOCKING — GitHub Actions Node runtime deprecation

Existing Node 20 action-runtime deprecation warnings remain a separate platform/dependency maintenance concern. They are not an R2.7 semantic defect and are not mixed into this implementation.

## Safety invariants revalidated

```text
production publisher count       1
production publisher             RS2_4_PERMANENT
main integration gateway         repo-main-write.py
Candidate Required               preserved
PREPLAY BEFORE PUBLISH           preserved
fast-forward-only publication    preserved
HUMAN_EVIDENCE authority         unchanged
trusted predecessor semantics    unchanged
new required jobs                0
new product lifecycle states     0
background retry/polling         0
runtime mutation                 NONE
release-simcore mutation         NONE
```

## Activation boundary

Implementation qualification does not equal first genuine R2.7 operational proof.

`activationAuthorized` remains `false`.

The next genuine SimCore release will provide operational confirmation when it demonstrates, without deterministic control-plane recovery:

```text
Candidate Required PASS
R2.6/R2.7 prepublication safety path PASS
single publisher publishes exact candidate
post-publish main gate / durable reobserver PASS
R2.7 recovery diagnosis remains dormant on clean path
LIVE_PENDING reached
latest == install
HUMAN_EVIDENCE remains separate
```

If a genuine release failure occurs, a correct bounded R2.7 diagnostic is also useful operational evidence, but it does not create recovery authority.

## Final implementation disposition

**R2.7 IMPLEMENTATION COMPLETE AND PERMANENT-CI QUALIFIED. FIRST GENUINE OPERATIONAL CONFIRMATION REMAINS SEPARATE.**

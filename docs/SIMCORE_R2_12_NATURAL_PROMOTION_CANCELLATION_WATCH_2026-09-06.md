# SimCore R2.12 Natural Promotion Cancellation Watch

Date: 2026-09-06 KST
Status: **WATCH · CANONICAL_DOC_PROMOTION_CONCURRENCY_REPLACEMENT · NON-CORRECTNESS · R2.12 NATURAL EVIDENCE NOT EXERCISED**
Classification: **R2.12 POST-MERGE OPERATIONAL VALIDATION / CANONICAL MAIN DOCUMENTATION PROMOTION**

## 1. Observation

R2.12 implementation merged to `main` as:

```text
8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
```

The merge naturally triggered Canonical Main Documentation Stream run:

```text
run = 33980994684
head = 8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
conclusion = SUCCESS
```

That cycle then produced Canonical Main Documentation Promotion run:

```text
run = 33981004874
run number = 5392
head = 8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
event = workflow_run
conclusion = CANCELLED
run_started_at = null
jobs = 0
```

The promotion job never started. Therefore none of the R2.12 routing steps, including the SimCore `MAIN_HEALTH` dispatch, were exercised by this run.

## 2. Classification

```text
WATCH
OWNER = CANONICAL MAIN DOCUMENTATION PROMOTION CONCURRENCY / QUEUEING
R2.12 ROUTING CORRECTNESS = NOT IMPLICATED
R2.12 NATURAL OPERATIONAL PASS = NOT ESTABLISHED BY THIS RUN
RUNTIME CORRECTNESS = NOT IMPLICATED
release-simcore = NOT TOUCHED
```

This run is neither a PASS nor a FAIL for R2.12. It is an unexercised natural specimen.

## 3. Why this is not currently a BLOCKER

The cancellation pattern predates R2.12. Prior Canonical Main Documentation Promotion runs include pending/cancelled specimens such as:

```text
run 33980617789 / promotion #5385 = CANCELLED
run 33980364660 / promotion #5380 = CANCELLED
```

The workflow declares a single concurrency group with `cancel-in-progress: false`. GitHub Actions still maintains a bounded pending slot for a concurrency group, so queued workflow-run churn can replace an older pending run before any job starts.

During this observation another independent main transaction also merged after the R2.12 implementation:

```text
main moved from 8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
to 37b3137710268ea5b9896966dc207c6ea6f9b32a
via PR #1594
```

That concurrent main movement is consistent with queue churn and means the cancelled specimen cannot be used to judge the new routing semantics.

## 4. Evidence already established separately

The R2.12 implementation itself remains qualified by hosted deterministic validation:

```text
Plugin Control Plane CI = SUCCESS
- documentation-stream-contract.cjs executed and passed

SimCore CI = SUCCESS
- Verify = SUCCESS
- Required = SUCCESS

implementation diff = exactly two frozen owners
```

No requirement is waived. Natural operational evidence remains outstanding until a promotion job actually executes the R2.12 route.

## 5. Next observation gate

Observe the next naturally executing Canonical Main Documentation Promotion cycle.

If it generates a documentation candidate, require:

```text
Plugin Control Plane child = PASS
SimCore child head = exact generated documentation head
SimCore child profile = MAIN_HEALTH
SimCore runtime source = release-simcore production bytes
no candidate_commit / candidate_fetch_ref route
parent exact-head / exact-base safety = preserved
```

If a natural cycle is NOOP or stale before dispatch, classify it as NOT_EXERCISED rather than manufacturing a candidate.

## 6. Transaction separation

This document is evidence only. It does not mutate:

- R2.12 implementation
- SimCore runtime code
- `release-simcore`
- `plugins/simcore/latest.js`
- `plugins/simcore/install.js`

# SimCore R2.13 Implementation Evidence

Date: 2026-09-06 KST
Status: **IMPLEMENTATION COMPLETE · HOSTED DETERMINISTIC PASS · NATURAL OPERATIONAL PATH PENDING**
Classification: **RELEASE SYSTEM V2 / CANONICAL DOCUMENTATION PROMOTION CONTROL PLANE**

## 1. Scope

R2.13 implements the frozen `Exact Dispatch Run-ID Binding` design while preserving R2.12 source-routing semantics.

```text
R2.12 = KEEP / DO NOT REOPEN
R2.13 DESIGN = FROZEN
R2.13 IMPLEMENTATION = COMPLETE
RUNTIME MUTATION = 0
release-simcore MUTATION = 0
```

## 2. Authorization and implementation identities

```text
Authorization PR = #1617
Authorization head = b05df877a11e464f49ff9a6e1e7c7c693708fcfd
Authorization merge main = e154d2ac02f70db7aff7305859302049ee118f73

Implementation PR = #1618
Implementation exact head = 042c5d4ff223ca0a55dc15626fdf9a80c4dc026f
Implementation merge main = 1617c499a9449db1a78969f1e65e790c18e47784
```

## 3. Exact owner boundary

The implementation changed exactly the two frozen owners:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

No child workflow interface, runtime file, release branch, product manifest, or R2.12 source-routing owner was changed.

## 4. Implemented transaction contract

The canonical documentation promotion parent now performs:

```text
dispatch Plugin Control Plane check via REST workflow dispatch
-> receive exact workflow_run_id

dispatch SimCore MAIN_HEALTH check via REST workflow dispatch
-> receive exact workflow_run_id

carry both IDs through step outputs
-> GET exact run metadata by ID
-> require event == workflow_dispatch
-> require head_sha == exact generated docs HEAD_SHA
-> gh run watch exact ID --exit-status
-> exact-base / exact-head merge guard
```

The dispatch contract is pinned to:

```text
X-GitHub-Api-Version: 2026-03-10
```

The former child-discovery machinery was removed from this path:

```text
gh run list = removed
find_run() = removed
wait_for_run() discovery = removed
same-head first-match = removed
head -n 1 = removed
60-iteration discovery loop = removed
2-second discovery sleeps = removed
```

## 5. R2.12 invariants preserved

```text
SimCore docs-only profile = MAIN_HEALTH
CANDIDATE_SHADOW = not used by canonical docs promotion
candidate_commit = omitted
candidate_fetch_ref = omitted
release-simcore = runtime byte authority
exact docs head = verifier identity
```

## 6. Hosted deterministic validation

Exact implementation head:

```text
042c5d4ff223ca0a55dc15626fdf9a80c4dc026f
```

Hosted validation passed:

```text
Plugin Control Plane CI run 33987731061 = SUCCESS
Plugin Control Plane PR observe run 33987731101 = SUCCESS
SimCore CI run 33987731087 Verify = SUCCESS
SimCore CI run 33987731087 Required = SUCCESS
```

The permanent documentation-stream contract test executed on hosted GitHub Actions and passed with the R2.13 assertions in place.

## 7. Three-lens implementation assessment

### Stabilization

```text
VERDICT = STRONGER
```

Reason: child identity is no longer inferred from a set of same-head runs. The exact run ID is supplied by the dispatch transaction and independently revalidated before watch.

### Automation

```text
VERDICT = MORE AUTOMATIC AND SAFER
```

Reason: the parent no longer performs interpretive child discovery. Exact identity moves automatically from dispatch to metadata verification to watch.

### Simplification

```text
VERDICT = SIMPLER
```

Reason: polling, sleeps, same-head search, and first-match selection were deleted without adding a nonce, new validation profile, new child input, helper service, or persistent identity store.

## 8. Deployment boundary

R2.13 is a non-runtime control-plane change.

```text
release-simcore deployment = NOT APPLICABLE / FORBIDDEN BY DESIGN
real long-chat runtime validation = NOT APPLICABLE TO R2.13
v0.70.9 HUMAN_EVIDENCE gate = independent / unchanged
```

## 9. Operational closure state

Immediately after implementation merge, multiple natural Canonical Main Documentation Promotion runs completed successfully, but the generated-document candidate path did not require publication in those specimens. Therefore the new exact child-dispatch steps were skipped rather than exercised.

This is recorded separately as a WATCH, not as an implementation failure.

```text
IMPLEMENTATION = COMPLETE
HOSTED DETERMINISTIC = PASS
NATURAL OPERATIONAL EXACT-ID PATH = PENDING
R2.13 FINAL CLOSURE = PENDING NATURAL EXERCISED SPECIMEN
```

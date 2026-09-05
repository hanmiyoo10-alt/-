# SimCore R2.12 Implementation and Operational Evidence

Date: 2026-09-06 KST
Status: **R2.12 CLOSED / KEEP · HOSTED DETERMINISTIC PASS · NATURAL OPERATIONAL PASS · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / CONTROL-PLANE OPERATIONAL CLOSURE**

## 1. Final disposition

```text
R2.12 NAME = Release-Channel-Aware Candidate Source Routing
R2.12 DESIGN = COMPLETE / FROZEN
R2.12 IMPLEMENTATION = COMPLETE
R2.12 HOSTED DETERMINISTIC VALIDATION = PASS
R2.12 NATURAL OPERATIONAL VALIDATION = PASS
R2.12 = CLOSED / KEEP
RUNTIME MUTATION = 0
release-simcore MUTATION = 0
latest.js MUTATION = 0
install.js MUTATION = 0
NEW PROFILE = 0
simcore-ci.yml SEMANTIC CHANGE = 0
R2.9 / R2.10 / R2.11 CHANGE = 0
FOLLOW-UP STALE CHILD RUN SELECTION = SEPARATE FIX
```

R2.12 is complete as a bounded non-runtime release-system correction. The canonical documentation validation path now preserves the main / release-simcore authority split without weakening genuine runtime-candidate validation.

## 2. Trigger and frozen problem

R2.12 was triggered after the same source-authority mismatch recurred in genuine v0.70.7 and v0.70.8 canonical documentation promotion cycles:

```text
canonical documentation candidate
-> SimCore CANDIDATE_SHADOW
-> candidate commit's main-side historical plugins/simcore bytes selected as runtime source
-> release-channel authority mismatch
```

The frozen one-purpose requirement was:

```text
canonical documentation candidate
-> exact documentation head remains verifier identity
-> SimCore production-health validation uses release-simcore runtime bytes
-> genuine runtime candidates retain CANDIDATE_SHADOW unchanged
```

## 3. Design freeze

Design PR:

```text
PR = #1591
title = docs(simcore): freeze R2.12 release-channel-aware routing design
head = 51f4d6b7595a0859a922d62b0f96850e2ff63d1f
merged main commit = 7bf429d69ef903ce5cf9985b7b3fca0c16dbb68b
```

The owner / impact audit proved that the existing MAIN_HEALTH semantics already provide the required verifier/runtime-source split. Therefore exactly two future implementation owners were frozen:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

Explicit non-owners included:

```text
.github/workflows/simcore-ci.yml
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime behavior
R2.9 / R2.10 / R2.11 contracts
```

## 4. Implementation

Implementation PR:

```text
PR = #1593
title = fix(simcore): implement R2.12 release-channel-aware routing
implementation head = fabaf7cecbf79124f124061b1de0ebbdc6a1b720
merged main commit = 8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
changed files = exactly 2 frozen owners
```

Canonical documentation promotion changed from:

```bash
gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
  -f profile=CANDIDATE_SHADOW \
  -f candidate_commit="$HEAD_SHA" \
  -f candidate_fetch_ref="refs/heads/$DOC_BRANCH"
```

to:

```bash
gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
  -f profile=MAIN_HEALTH
```

The bounded regression now requires:

```text
exact documentation branch ref retained
profile = MAIN_HEALTH
CANDIDATE_SHADOW absent from docs-only SimCore dispatch
candidate_commit absent
candidate_fetch_ref absent
headSha == HEAD_SHA wait identity retained
exact-base / exact-head merge guards retained
```

## 5. Hosted deterministic qualification

Implementation head `fabaf7cecbf79124f124061b1de0ebbdc6a1b720` passed repository-hosted validation before merge:

```text
Plugin Control Plane CI run = 33980946671 = SUCCESS
- documentation-stream-contract.cjs executed and passed

SimCore CI run = 33980946652 = SUCCESS
- Verify = SUCCESS
- Required = SUCCESS
```

No frozen validation requirement was waived.

A local clone-based direct test attempt was separately classified:

```text
DEFER · TOOLING_ENVIRONMENT · NON-CORRECTNESS
reason = local execution container could not resolve github.com
```

That environment observation does not weaken the hosted deterministic PASS.

## 6. First natural post-merge specimen: not exercised

After R2.12 implementation merged, natural Canonical Main Documentation Stream run:

```text
run = 33980994684
head = 8b8b2b3432ca9988dccf1e7e4dabda2ef4c033cc
conclusion = SUCCESS
```

produced promotion run:

```text
run = 33981004874
promotion number = 5392
conclusion = CANCELLED
run_started_at = null
jobs = 0
```

Classification:

```text
WATCH · CANONICAL_DOC_PROMOTION_CONCURRENCY_REPLACEMENT · NON-CORRECTNESS
R2.12 NATURAL EVIDENCE = NOT_EXERCISED
```

No R2.12 semantics ran in that cancelled specimen, so it was not counted as either PASS or FAIL.

## 7. Natural semantic proof on promotion #5395

A later natural documentation promotion produced exact generated documentation head:

```text
0009d87b03e5d869d239d2e24423fc340227846e
```

Parent promotion:

```text
run = 33981074371
promotion number = 5395
```

R2.12 dispatched fresh children:

```text
fresh Plugin Control Plane child = 33981106147
fresh SimCore child = 33981106849
SimCore requested profile = MAIN_HEALTH
candidate_commit = omitted
candidate_fetch_ref = omitted
```

The fresh SimCore child proved the frozen routing semantics:

```text
Verify = SUCCESS
Required = SUCCESS
Materialize immutable candidate = SKIPPED
profile = MAIN_HEALTH
verifier commit = 0009d87b03e5d869d239d2e24423fc340227846e
production commit = 01010564649a033e02a0658a167f5f38a6a23632
candidate commit = null
production latest/install identity = PASS
STATIC = PASS
ARCH = PASS
REGRESSION = PASS
STATE = PASS
COORDINATION = PASS
LEGACY_COMPAT = PASS
```

This is direct natural proof that the documentation candidate remained verifier identity while deployed runtime bytes came from `release-simcore`.

The parent itself failed for a separate orchestration defect: it selected stale prior workflow-dispatch children with the same `headSha` instead of its freshly dispatched children. That defect is separately classified FIX and does not reopen R2.12.

## 8. Natural end-to-end proof on promotion #5396

The next natural promotion cycle provided the full operational control:

```text
parent run = 33981117474
promotion number = 5396
base main = 37b3137710268ea5b9896966dc207c6ea6f9b32a
documentation head = 0009d87b03e5d869d239d2e24423fc340227846e
fresh Plugin Control Plane child = 33981132415
fresh SimCore child = 33981133565
```

Observed outcome:

```text
Plugin Control Plane child = PASS
SimCore profile = MAIN_HEALTH
SimCore immutable candidate materialization = SKIPPED
SimCore Verify = PASS
SimCore Required = PASS
parent selected fresh children = YES
parent exact-head / exact-base gate = PASS
documentation PR = #671
parent conclusion = SUCCESS
```

The documentation promotion merged successfully and produced main commit:

```text
9f421ad7b924783fac4dfd46ddb58a98ba142601
```

This closes the required natural operational evidence for R2.12.

## 9. Separate follow-up FIX discovered during live operation

The #5395 parent failure exposed a separate child-run identity-binding defect:

```text
FIX · CANONICAL_DOC_PROMOTION_STALE_SAME_HEAD_CHILD_RUN_SELECTION · NON-RUNTIME
```

Current parent selection uses workflow + branch + event + headSha, which is ambiguous when repeated workflow-dispatch runs share the same generated documentation head.

Disposition:

```text
R2.12 = KEEP / DO NOT REOPEN
stale child run selection = separate follow-up design + implementation transaction
follow-up implementation authorization = NOT GRANTED BY R2.12 closure
```

The existence of this follow-up FIX does not invalidate R2.12 because the fresh R2.12 SimCore child passed in #5395 and a complete parent-child promotion passed naturally in #5396.

## 10. Authority preservation

R2.12 preserves:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed SimCore runtime byte authority
CANDIDATE_SHADOW = genuine immutable runtime-candidate byte validation
MAIN_HEALTH = deployed-production health using release-simcore source
latest.js == install.js = mandatory production identity rule
human runtime live acceptance = unchanged
release approval/publication semantics = unchanged
```

No SimCore runtime release was created by R2.12.

## 11. Final closure

```text
DESIGN = CLOSED
IMPLEMENTATION = CLOSED
HOSTED DETERMINISTIC = PASS
NATURAL SEMANTIC = PASS
NATURAL END-TO-END = PASS
R2.12 = CLOSED / KEEP
NEXT R2.12 ACTION = NONE
SEPARATE FOLLOW-UP = STALE SAME-HEAD CHILD RUN SELECTION FIX DESIGN
```

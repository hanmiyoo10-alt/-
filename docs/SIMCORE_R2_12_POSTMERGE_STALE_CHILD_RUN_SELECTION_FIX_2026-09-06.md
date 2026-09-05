# SimCore R2.12 Post-Merge Stale Child Run Selection Fix Record

Date: 2026-09-06 KST
Status: **FIX · CANONICAL_DOC_PROMOTION_STALE_SAME_HEAD_CHILD_RUN_SELECTION · NON-RUNTIME**
Classification: **CANONICAL MAIN DOCUMENTATION PROMOTION / CHILD-RUN IDENTITY BINDING**

## 1. Executive disposition

```text
R2.12 ROUTING CORRECTNESS = PASS / NOT IMPLICATED
CANONICAL PROMOTION PARENT RELIABILITY = IMPACTED
CLASSIFICATION = FIX
RUNTIME CORRECTNESS = NOT IMPLICATED
release-simcore = NOT TOUCHED
R2.12 IMPLEMENTATION MUTATION IN THIS RECORD = NONE
```

A natural post-R2.12 documentation promotion exposed a separate parent-orchestration defect after the new routing itself had dispatched correctly.

## 2. Natural failing specimen

Canonical Main Documentation Promotion:

```text
parent run = 33981074371
promotion run number = 5395
base main = 37b3137710268ea5b9896966dc207c6ea6f9b32a
generated documentation head = 0009d87b03e5d869d239d2e24423fc340227846e
parent conclusion = FAILURE
```

The R2.12 dispatch step was correct and created fresh children:

```text
fresh Plugin Control Plane child = 33981106147
fresh SimCore child = 33981106849
SimCore requested profile = MAIN_HEALTH
candidate_commit = omitted
candidate_fetch_ref = omitted
```

The fresh SimCore child passed:

```text
Verify = SUCCESS
Required = SUCCESS
Materialize immutable candidate = SKIPPED
profile = MAIN_HEALTH
verifier commit = 0009d87b03e5d869d239d2e24423fc340227846e
production commit = 01010564649a033e02a0658a167f5f38a6a23632
candidate commit = null
latest/install production source = identical
```

Therefore the R2.12 release-channel-aware source-routing contract itself operated as designed.

## 3. Parent failure mechanism

The parent wait helper currently resolves a child by workflow + branch + event + head SHA and then takes the first matching database ID:

```bash
gh run list --workflow "$workflow" --branch "$DOC_BRANCH" --event workflow_dispatch --limit 30 \
  --json databaseId,headSha,status,conclusion \
  --jq ".[] | select(.headSha == \"$HEAD_SHA\") | .databaseId" | head -n 1
```

The generated documentation branch head was unchanged across repeated promotion attempts. Consequently, older workflow-dispatch runs existed with the exact same `headSha`.

After dispatching the fresh children, parent run 33981074371 selected stale prior children instead:

```text
Plugin Control Plane selected stale run = 33981070273
SimCore selected stale run = 33981071016
```

The stale SimCore run was an earlier failing candidate-shadow specimen and had `Materialize immutable candidate = SUCCESS`. Watching that stale failed run caused the parent to fail even though its newly dispatched MAIN_HEALTH child passed.

Root cause:

```text
child identity predicate = workflow + branch + workflow_dispatch + headSha
required identity = newly dispatched run belonging to this parent dispatch
ambiguity = repeated same-head runs satisfy current predicate
failure mode = stale same-head child may be selected
```

## 4. Why this is separate from R2.12

R2.12's one-purpose contract was source-role routing:

```text
documentation candidate -> exact-head verifier + release-simcore production source
```

That contract passed naturally.

This newly exposed defect is instead temporal/transactional child-run identity binding in the parent promotion workflow. Folding it into the already merged R2.12 transaction would violate one-purpose transaction separation.

Therefore:

```text
R2.12 = KEEP
R2.12 implementation = DO NOT REOPEN
stale child selection = separate follow-up FIX transaction
```

## 5. Natural succeeding control

The next natural promotion cycle provided a healthy control:

```text
parent run = 33981117474
promotion run number = 5396
base main = 37b3137710268ea5b9896966dc207c6ea6f9b32a
documentation head = 0009d87b03e5d869d239d2e24423fc340227846e
fresh Plugin Control Plane child = 33981132415
fresh SimCore child = 33981133565
parent conclusion = SUCCESS
```

The parent watched the fresh children in that cycle. Both passed. SimCore again ran MAIN_HEALTH with immutable candidate materialization skipped. The parent then merged documentation PR #671, producing main commit:

```text
9f421ad7b924783fac4dfd46ddb58a98ba142601
```

This demonstrates that the stale-selection defect is intermittent/identity-ambiguity dependent, not a permanent break in R2.12 routing.

## 6. Follow-up repair requirements

A separate design must bind the parent to children created by its own dispatch rather than merely any same-head run.

The repair must preserve:

```text
exact documentation head verification
MAIN_HEALTH for docs-only SimCore validation
CANDIDATE_SHADOW for genuine runtime candidates
exact-base / exact-head merge guard
fail-closed child failure handling
no runtime mutation
no release-simcore mutation
```

Potential mechanisms must be evaluated in design rather than chosen here. Examples include a dispatch-time lower bound plus run metadata, or another explicit fresh-run identity handshake supported by GitHub Actions / gh CLI.

## 7. Final classification

```text
FIX = YES
WHY = REAL PARENT FAILURE CAUSED BY STALE SAME-HEAD CHILD SELECTION
R2.12 ROUTING BLOCKER = NO
CANONICAL PROMOTION AUTOMATION RELIABILITY IMPACT = YES
IMPLEMENTATION AUTHORIZATION FOR FOLLOW-UP FIX = NOT GRANTED BY THIS RECORD
```

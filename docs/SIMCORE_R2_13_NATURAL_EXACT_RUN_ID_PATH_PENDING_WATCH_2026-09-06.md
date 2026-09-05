# SimCore R2.13 Natural Exact Run-ID Path Pending Watch

Date: 2026-09-06 KST
Status: **WATCH · NATURAL PATH NOT YET EXERCISED · NON-CORRECTNESS**
Classification: **RELEASE SYSTEM V2 / OPERATIONAL EVIDENCE GAP**

## 1. Classification

```text
WATCH
R2.13 NATURAL EXACT-RUN-ID PATH NOT_YET_EXERCISED
NON-CORRECTNESS
NON-RUNTIME
```

This record does not identify a product defect. It records that the first natural post-merge canonical documentation promotion specimens did not need to publish a generated documentation candidate, so the R2.13 exact child-dispatch path was not executed in those runs.

## 2. Implementation under observation

```text
R2.13 implementation PR = #1618
Implementation exact head = 042c5d4ff223ca0a55dc15626fdf9a80c4dc026f
Merged main = 1617c499a9449db1a78969f1e65e790c18e47784
```

Hosted deterministic validation already passed. This WATCH concerns natural operational evidence only.

## 3. Natural specimens observed

On implementation merge head `1617c499a9449db1a78969f1e65e790c18e47784`, natural Canonical Main Documentation Promotion runs included:

```text
#5475 / run 33987792320 = SUCCESS
#5476 / run 33987814463 = SUCCESS
#5477 / run 33987831627 = SUCCESS
#5478 / run 33987882534 = SUCCESS
```

In each inspected specimen:

```text
Render stable durable documentation = SUCCESS
Publish generated branch or hand off PR creation = SUCCESS or normal no-op/handoff outcome
Dispatch exact documentation candidate checks = SKIPPED
Wait for exact candidate checks = SKIPPED
Exact-base / exact-head merge = SKIPPED
parent conclusion = SUCCESS
```

Therefore none of these runs is evidence against R2.13. They simply did not enter the `published == true` path that owns exact child dispatch.

## 4. Required natural acceptance specimen

A future organically required canonical documentation publication should prove:

```text
Publish generated branch = published=true
Dispatch exact documentation candidate checks = SUCCESS
exact Plugin Control Plane workflow_run_id returned
exact SimCore workflow_run_id returned
both returned runs re-read successfully
event == workflow_dispatch for both
head_sha == generated documentation HEAD_SHA for both
SimCore docs child remains MAIN_HEALTH
both exact runs PASS
Wait for exact candidate checks = SUCCESS
parent never substitutes another same-head run
exact-base / exact-head merge succeeds when main remains unchanged
```

## 5. Non-action rule

Do not create artificial repository churn solely to manufacture this specimen.

The next legitimate documentation change, evidence record, or repository event that naturally produces a generated canonical docs candidate may supply the operational proof.

Until then:

```text
R2.13 implementation = KEEP
hosted deterministic validation = PASS
natural exact-ID operational closure = WATCH / PENDING
rollback = NOT INDICATED
runtime/release-simcore action = NONE
```

## 6. Relationship to current SimCore runtime

This WATCH does not block or alter the independent v0.70.9 real-long-chat HUMAN_EVIDENCE gate.

```text
RUNTIME CORRECTNESS IMPACT = NONE OBSERVED
release-simcore MUTATION = NONE
latest.js / install.js MUTATION = NONE
```

# SimCore R2.13 Post-Closure Feedback

Date: 2026-09-06 KST
Status: **KEEP · CLOSED · POST-CLOSURE FEEDBACK PASS · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / CANONICAL DOCUMENTATION PROMOTION CONTROL PLANE**

## 1. Executive verdict

```text
R2.13 = KEEP / DO NOT REOPEN
R2.13 CORRECTNESS FIX = NONE
R2.13 BLOCKER = NONE
NATURAL EXACT-RUN-ID PATH = PASS / RECONFIRMED
POST-CLOSURE NO-OP BEHAVIOR = PASS
R2.12 SOURCE ROUTING = PRESERVED
RUNTIME MUTATION = NONE
release-simcore MUTATION = NONE
R2.14 TRIGGERED BY THIS FEEDBACK = NO
```

R2.13 remains closed. The exact-dispatch run-ID binding continues to solve the stale same-head child-selection defect without weakening R2.12 source-routing semantics or adding a second identity mechanism.

This feedback was collected after the v0.70.10 release transaction and therefore exercises R2.13 against later repository activity rather than only its original implementation window.

## 2. Authority reviewed

Primary R2.13 authority:

```text
docs/SIMCORE_R2_13_EXACT_DISPATCH_RUN_ID_BINDING_DESIGN_2026-09-06.md
docs/SIMCORE_R2_13_IMPLEMENTATION_AND_OPERATIONAL_EVIDENCE_2026-09-06.md
```

The implementation/operational evidence already closed R2.13 using natural promotion run `33988149352`.

This feedback does not replace that closure. It re-observes the closed design under subsequent repository operation.

## 3. Natural exact-ID specimen independently re-observed

Canonical documentation promotion:

```text
parent run = 33988149352
base main = da2f2201f50110c41dd90ad442dd87fffedda429
generated documentation head = 43373f130bfb539a4904fcd6995156082064c96c
PR = #1624
result main = 26fe1b96fb46c6b126382fe7bfd1580d9e7d5ba1
```

Exact children returned by dispatch:

```text
Plugin Control Plane run = 33988159396
SimCore MAIN_HEALTH run = 33988160709
```

The parent log directly proves the intended transaction shape:

```text
CANONICAL_MAIN_DOC_PROMOTION:CHECKS_DISPATCHED:
43373f130bfb539a4904fcd6995156082064c96c:
33988159396:
33988160709
```

Before either child was watched, the parent re-read each exact returned ID and emitted:

```text
CANONICAL_MAIN_DOC_PROMOTION:EXACT_RUN_VERIFIED:
plugin-control-plane:
33988159396:
43373f130bfb539a4904fcd6995156082064c96c

CANONICAL_MAIN_DOC_PROMOTION:EXACT_RUN_VERIFIED:
simcore:
33988160709:
43373f130bfb539a4904fcd6995156082064c96c
```

The exact IDs were then watched directly with exit-status semantics. Both passed, followed by exact-base / exact-head merge success.

This re-confirms the key R2.13 semantic distinction:

```text
NOT: search for a run whose head looks right
YES: receive the exact run ID, then prove its event/head are right
```

## 4. R2.12 semantics remain intact

The exact SimCore child remained the docs-only production-source lane:

```text
profile = MAIN_HEALTH
Materialize deployed production exactly once = SUCCESS
Materialize immutable candidate = SKIPPED
```

No `candidate_commit` or `candidate_fetch_ref` routing was introduced into canonical documentation promotion.

Disposition:

```text
R2.12 = KEEP
R2.13 does not reinterpret docs as runtime candidates
```

## 5. Post-v0.70.10 no-op operation

Subsequent canonical documentation promotions observed after the v0.70.10 publication/state activity included:

```text
run 34005186613 = SUCCESS
run 34005193439 = SUCCESS
```

For both runs:

```text
Render stable durable documentation = SUCCESS
Publish generated branch or hand off PR creation = SKIPPED
Dispatch exact documentation candidate checks = SKIPPED
Wait for exact candidate checks = SKIPPED
Exact-base / exact-head merge = SKIPPED
```

This is useful post-closure evidence because it shows the R2.13 exact-ID mechanism does not turn every documentation-stream wake-up into child CI work.

When no durable generated-document delta needs publication:

```text
no generated publication
-> no Plugin Control Plane child dispatch
-> no SimCore MAIN_HEALTH child dispatch
-> no exact-run watch
-> no merge attempt
-> parent completes successfully
```

That behavior is consistent with the original simplification goal.

## 6. Three-lens feedback

### Stabilization

```text
VERDICT = KEEP / STRONG
```

The stale same-head first-match ambiguity remains absent from the active promotion path. Exact child identity is transaction-bound at dispatch time, while event/head checks remain validation assertions.

No recurrence of the R2.12 post-merge stale-child defect was observed in the R2.13 natural exact-ID specimen.

### Safe automation

```text
VERDICT = KEEP / SAFER
```

The parent machine receives, verifies, and watches exact child identities without human selection. Later no-op promotions also prove the workflow avoids spawning child checks when publication is unnecessary.

### Simplification

```text
VERDICT = KEEP / STRONG
```

R2.13 removed discovery loops, same-head search, first-match selection and discovery sleeps without adding a nonce, persistent identity record, new profile, child input or helper service.

The post-v0.70.10 no-op specimens strengthen this verdict: the exact-ID mechanism stays dormant when there is no generated-document publication to validate.

### Cross-lens result

```text
STABILIZATION = STRONGER THAN R2.12 CHILD DISCOVERY
AUTOMATION = EXACT AND BOUNDED
SIMPLIFICATION = PRESERVED
MATERIAL R2.13 TRADEOFF = NONE OBSERVED
```

## 7. Platform dependency posture

R2.13 intentionally depends on the workflow-dispatch REST response returning `workflow_run_id` under the pinned GitHub API contract:

```text
X-GitHub-Api-Version: 2026-03-10
```

The natural exact-ID specimen proves that contract worked in the hosted repository environment.

This dependency should remain an ordinary external-platform compatibility assumption, not become a reason to reintroduce same-head discovery fallback.

Required posture if the API contract changes later:

```text
fail closed
record separate platform-contract anomaly
redesign explicitly if necessary
never silently fall back to stale same-head search
```

## 8. Separate observation excluded from R2.13 scope

While re-reading the natural specimen logs, a GitHub Actions JavaScript runtime deprecation warning was observed for several third-party actions targeting Node.js 20 while the hosted runner forces Node.js 24.

That warning is not an R2.13 correctness defect and is intentionally excluded from this feedback transaction.

It is tracked separately as a repository/control-plane WATCH document so the topics are not mixed.

## 9. Runtime / release boundary

R2.13 remains non-runtime control-plane work.

```text
release-simcore deployment = NOT APPLICABLE / FORBIDDEN
latest.js mutation = NONE
install.js mutation = NONE
runtime release = NONE
real long-chat runtime gate = NOT APPLICABLE TO R2.13
```

The independent SimCore v0.70.10 `PENDING_REAL_LONG_CHAT` gate remains separate.

## 10. Final feedback disposition

```text
R2.13 = CLOSED / KEEP
REOPEN = NO
FIX = NONE
BLOCKER = NONE
NATURAL EXACT-ID EVIDENCE = RECONFIRMED
NO-OP EFFICIENCY = CONFIRMED
R2.12 = KEEP
NEXT R2.13 ACTION = NONE
```

No R2.14 should be created merely to continue iterating on a mechanism that is currently passing its correctness, automation and simplification goals.

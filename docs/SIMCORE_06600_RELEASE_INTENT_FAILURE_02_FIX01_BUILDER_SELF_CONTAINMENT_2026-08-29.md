# SimCore v0.66.0 Release Intent Failure 02 — FIX01 Builder Self-Containment

Date: 2026-08-29 KST

Status:

`BLOCKER DIAGNOSED · INTENT-03/NEW-03 ABANDONED · PRODUCTION UNCHANGED`

Classification:

`FIX · BLOCKER · BUILDER_PACKAGING_SELF_CONTAINMENT · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Trigger

After the runtime defect `DANGLING_SESSION_RECOVERY_EXPORT` was diagnosed and preserved, append-only FIX01 was merged in PR `#770`.

A fresh recovery transaction was then started:

```text
intent = simcore-v0.66.0-intent-03
release = simcore-v0.66.0-new-03
PR = #771
builder = products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion-fix01.py
```

Permanent SimCore PR1 dry run:

`33204756565`

The trusted production baseline passed full MAIN_HEALTH including legacy compatibility, but the proposed PR1 dry candidate qualification failed before candidate materialization completed.

## Exact failure

Bounded report:

```text
conclusion = FAIL
reasonCodes = [PR1_DRY_QUALIFICATION_FAIL]
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
```

Exact stderr:

```text
CANDIDATE_BUILDER_FAILED: python3 /tmp/simcore-candidate-u8E4Wf/build-06600-m2-4-session-runtime-mirror-boundary-completion-fix01.py
06600_FIX01_BASE_BUILDER_MISSING
```

Production resolved during the run remained:

```text
P = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
blob = 1b38e2b2874f2581edae8f1080edc39558febefa
```

No candidate commit was created and no production mutation occurred.

## Root cause

FIX01 intentionally preserved the failed `new-02` builder as immutable provenance and attempted to compose it by executing:

`products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion.py`

However, the generic candidate materialization contract packages the requested builder as a **single executable file** in a temporary candidate directory. Sibling repository tooling files are not copied alongside it.

Therefore this composition shape is invalid for an authorized release builder:

```text
candidate request points to FIX01 builder
→ materializer copies FIX01 only
→ FIX01 expects sibling base builder
→ sibling is absent
→ fail closed before candidate output
```

This is a builder-packaging/self-containment defect, not a runtime semantic regression. The intended Session repair has not yet been materialized by this transaction.

## Correct repair boundary

Do not alter the generic candidate materializer during the current v0.66 runtime recovery. That would mix release-system infrastructure changes into a runtime work item.

Instead create a new append-only **self-contained FIX02 builder** that contains the full M2-4 materialization logic plus the exact dangling Session `recovery,` export removal and direct legacy-adapter regression fence in one file.

The failed builders remain immutable provenance:

- base M2-4 builder for failed `new-02` remains unchanged;
- FIX01 builder for failed `intent-03` remains unchanged.

FIX02 must not require sibling builders or repository-relative executable helpers during candidate materialization except the generated plugin inputs/outputs and commands already available under the release builder contract.

## Transaction recovery

`intent-03/new-03` must not be reused. PR `#771` must close without merge.

After this evidence reaches main:

1. implement self-contained FIX02 on a separate runtime FIX branch;
2. prove permanent PR CI;
3. start the next unused append-only release pair, expected `intent-04/new-04`;
4. PR1 dry must execute FIX02 from exact v0.65.0 production successfully;
5. materialize a new immutable candidate C;
6. require full Candidate Required including legacy compatibility to pass before publication.

## Safety

```text
release-simcore mutation = NONE
production version = 0.65.0
production commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
candidate C for intent-03 = NONE
PR #771 merge = FORBIDDEN
intent-03/new-03 reuse = FORBIDDEN
```

## Deferred release-system follow-up

A future separate non-runtime work item may document/enforce authorized builder self-containment explicitly at builder-registration or PR1 preflight time. That follow-up is not part of the current v0.66 runtime recovery.

# SimCore S2-1 PR Dry Failure 01 — Cumulative Builder Self-Containment

Date: 2026-08-31 KST
Classification: **FIX · CUMULATIVE_BUILDER_SELF_CONTAINMENT · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR REQUIRED**

PR #1016 dry head:

```text
head = ca8e69e1e1885e453596575bd722d7989cdc6af5
SimCore CI run = 33329095025
Verify job = 99304317879
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
production = v0.70.1 unchanged
candidate persistence = NONE
```

Exact failure:

```text
CANDIDATE_BUILDER_FAILED
S2_1_S1_BUILDER_MISSING:
products/simcore/tooling/build-s1-1-runtime-cache-fnv-convergence.py
```

Root cause:

The generic PR1 candidate sandbox copies/executes the selected builder as a self-contained file. It does not provide sibling historical builders inside the temporary builder directory. The initial S2-1 builder incorrectly attempted to invoke the S1-1 builder by repository-relative subprocess path.

This is a build-tool composition error, not evidence of a runtime caller or semantic incompatibility in the proposed Prompt/Session seam retirement.

Repair rule:

```text
cumulative pre-S7 builder = self-contained
no sibling-builder runtime dependency
S1-1 mechanical transform embedded deterministically before S2-1 transform
same S1-1 differential/invariant checks retained
same S2-1 differential/module-load checks retained
```

No release-system workflow or materializer behavior will be changed for this maintenance mini.

Disposition:

```text
S2_1_RUNTIME_DESIGN = STILL VALID
FAILURE_CLASS = FIX
PRODUCTION_MUTATION = NONE
RELEASE_SIMCORE = v0.70.1
NEXT = SELF_CONTAIN BUILDER AND RE-RUN PR1 DRY
```

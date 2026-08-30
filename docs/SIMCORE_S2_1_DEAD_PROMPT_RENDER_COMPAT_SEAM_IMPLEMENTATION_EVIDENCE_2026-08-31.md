# SimCore S2-1 Dead Prompt Render Compatibility Seam Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTED · CUMULATIVE PR-DRY PASS · FINAL INTERNAL CHECKPOINT PENDING · NO PRE-S7 PUBLICATION**
Classification: **POST-M2 SIMPLIFICATION / S2 / RETIRE DEAD API SEAM**

Authority:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_S2_1_DEAD_PROMPT_RENDER_COMPAT_SEAM_RETIREMENT_DESIGN_2026-08-31.md`

Production remains v0.70.1 on `release-simcore`. S2-1 is cumulative after S1-1 and does not publish independently.

Builder:
`products/simcore/tooling/build-s2-1-dead-prompt-render-seam.py`

Builder sequence:

```text
exact v0.70.1 production bytes
→ apply embedded/frozen S1-1 cumulative transform
→ verify S1-1 FNV differential + frozen boundaries
→ retire Prompt.compileRuntimePrompt
→ retire Prompt.renderRuntimePrompt
→ retire Session local renderRuntimePrompt alias
→ retire Session renderRuntimePrompt re-export
→ verify S2-1 live compiler/export/side-effect boundaries
```

Preserved live path:

```text
prompt.compileRuntimePromptParts
→ Session compileRuntimePromptParts alias
→ request preparation promptCompiled
→ promptBlock = promptCompiled.text
```

The S2-1 builder fails closed unless:
- the live `compileRuntimePromptParts` function source remains byte-identical to the S1-1 cumulative input;
- Prompt/Session require surfaces remain identical;
- frozen runtime/domain modules remain byte-identical to S1-1 output;
- protected compiler/classifier/state/cache/attribution markers remain unchanged;
- await/timer/storage/network/chat-write marker counts remain unchanged;
- the retired exports are absent;
- latest/install remain byte-identical;
- S1-1 FNV reference differential remains equivalent.

## PR dry observation 01

Initial dry head:

```text
head = ca8e69e1e1885e453596575bd722d7989cdc6af5
SimCore CI run = 33329095025
Verify job = 99304317879
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
```

Failure:

```text
S2_1_S1_BUILDER_MISSING
```

This was classified and preserved separately as:
`FIX · CUMULATIVE_BUILDER_SELF_CONTAINMENT · NON_RUNTIME · PRODUCTION_UNCHANGED`.

Root cause was the candidate sandbox contract: the selected builder must be self-contained and cannot depend on a sibling historical builder file at runtime.

Repair: embed the deterministic S1-1 transformation and its key equivalence/invariant checks directly into the S2-1 cumulative builder. No release-system workflow or runtime semantic delta changed.

## PR dry observation 02 — PASS

Exact repaired head:

```text
head = 0def317600f3efcd53ab870d01f7fdc3360ab0fe
SimCore CI run = 33329206623
Verify job = 99304618735
profile = PR_MAIN
conclusion = PASS
```

Exact gates:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
```

Boundaries:

```text
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidateCommit = null
candidate persistence = NONE
release-simcore mutation = NONE
```

The temporary PR-only candidate request existed solely to activate `GATE_PR1_DRY`. It must be deleted before the final internal-checkpoint head is merged.

## Current disposition

```text
S2_1_DESIGN = FROZEN
S2_1_BUILDER = IMPLEMENTED
CUMULATIVE_PR_DRY = PASS
TEMP_CANDIDATE_REQUEST = MUST_REMOVE_BEFORE_MERGE
FINAL_INTERNAL_HEAD = PENDING
release-simcore = v0.70.1 unchanged
broad real-long-chat = deferred to S7
```

# SimCore S2-1 Dead Prompt Render Compatibility Seam Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTED ON WORK BRANCH · PR-DRY DIFFERENTIAL QUALIFICATION PENDING · INTERNAL CHECKPOINT ONLY**
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
→ run frozen S1-1 cumulative builder
→ retire Prompt.compileRuntimePrompt
→ retire Prompt.renderRuntimePrompt
→ retire Session local renderRuntimePrompt alias
→ retire Session renderRuntimePrompt re-export
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
- Prompt and Session module factories load through the existing BundleLoader;
- `CoreRulesetSession` and `compileRuntimePromptParts` remain available;
- the retired exports are absent;
- latest/install remain byte-identical.

A temporary PR-only dry qualification request may be attached to execute this cumulative builder through the existing PR1 dry lane. It must persist no candidate and must be removed before merge. It has no release or S7 authority.

Current disposition:

```text
S2_1_DESIGN = FROZEN
S2_1_BUILDER = IMPLEMENTED
PR_DRY = PENDING
FINAL_INTERNAL_HEAD = PENDING
release-simcore = v0.70.1 unchanged
broad real-long-chat = deferred to S7
```

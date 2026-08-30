# SimCore S2-1 Dead Prompt Render Compatibility Seam Retirement Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 RELEASE/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S2 API + COMPATIBILITY SEAM SLIMMING / RETIRE**

## 1. Program authority

This mini is governed by:

- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`

Therefore:

```text
S2-1 = internal construction checkpoint
release-simcore = unchanged
broad real-long-chat = deferred to S7
cumulative target = v0.70.3
production during construction = v0.70.1
v0.70.2 = parked/preserved
```

## 2. Exact production baseline

```text
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version = 0.70.1
latest/install blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
```

S2-1 is applied after the already-staged S1-1 cumulative builder, not as an independent production publication.

## 3. Source-grounded problem

The Prompt module currently contains a three-layer text path:

```js
function compileRuntimePromptParts(state) {
  ...
}

function compileRuntimePrompt(state) {
  return compileRuntimePromptParts(state).text;
}

function renderRuntimePrompt(state) {
  return compileRuntimePrompt(state);
}
```

and exports all three names.

Session then creates another compatibility alias:

```js
const renderRuntimePrompt = prompt.renderRuntimePrompt;
const compileRuntimePromptParts = prompt.compileRuntimePromptParts;
```

and re-exports `renderRuntimePrompt` from Session.

Current request preparation does **not** call either full-text wrapper. It directly uses:

```js
const promptCompiled = compileRuntimePromptParts(state);
const promptBlock = promptCompiled.text;
```

Exact current-source search establishes:

```text
renderRuntimePrompt(...)
  definition = 1
  live call = 0

prompt.renderRuntimePrompt
  Session compatibility alias = 1
  live invocation = 0

compileRuntimePrompt(...)
  definition = 1
  only caller = dead renderRuntimePrompt wrapper

compileRuntimePromptParts
  live request path = YES
```

The wrapper family dates to the earlier Prompt extraction boundary, but current orchestration has already converged on `compileRuntimePromptParts` because it needs structured prompt accounting fields in addition to `.text`.

## 4. Proposed mechanical delta

Retire only the zero-live-caller full-text compatibility chain:

```text
Prompt.compileRuntimePrompt       REMOVE
Prompt.renderRuntimePrompt        REMOVE
Session local renderRuntimePrompt alias REMOVE
Session renderRuntimePrompt export      REMOVE
```

Preserve:

```text
Prompt.compileRuntimePromptParts
Prompt.PROMPT_COMPILER_VERSION
Prompt.broadcastEndAuthority
Session compileRuntimePromptParts alias
all actual request preparation code
```

Expected Prompt export surface:

```js
module.exports = {
  PROMPT_COMPILER_VERSION,
  broadcastEndAuthority,
  compileRuntimePromptParts,
};
```

## 5. Ownership before / after

Before:

```text
Prompt owns actual structured compilation
+ two unused compatibility wrappers
Session owns orchestration
+ one unused re-export seam
```

After:

```text
Prompt owns actual structured compilation only
Session owns orchestration only
```

No semantic owner moves.

## 6. Side effects and state

Before/after must remain identical for:

```text
await/yield boundaries
plugin/session/local storage
SnapshotStore writes
Host chat reads/writes
timers
network/provider routing
history mutation
runtime telemetry
persistent state/schema
reload/reroll/edit behavior
Deferred Mirror
```

The retired functions are pure wrappers and have zero live runtime callers.

## 7. Protected semantic invariants

S2-1 must preserve:

```text
compileRuntimePromptParts function body byte-identical
actual promptBlock bytes/order identical
PROMPT_COMPILER_VERSION = 4
COMMUNITY_CLASSIFIER_VERSION = 3
STATE_VERSION = 5
CORE_STATE_VERSION = 10
TAIL_AFTER_CURRENT_USER placement
provider cache = UNVERIFIED
post-onSend attribution markers
M2-6 dependency graph
latest.js == install.js at final S7 materialization
```

Community and all semantic modules are out of scope.

## 8. Differential / static proof contract

Implementation must fail closed unless all are true after cumulative S1-1 → S2-1 construction:

```text
compileRuntimePromptParts source unchanged
Prompt no longer contains function compileRuntimePrompt
Prompt no longer contains function renderRuntimePrompt
Prompt exports no compileRuntimePrompt/renderRuntimePrompt
Session no longer contains const renderRuntimePrompt = prompt.renderRuntimePrompt
Session exports no renderRuntimePrompt
Session still aliases and invokes prompt.compileRuntimePromptParts
Session factory loads successfully
Prompt factory loads successfully
CoreRulesetSession remains exported
all require edges unchanged
all side-effect marker counts unchanged
all persistent/schema markers unchanged
```

A PR-only dry qualification may be used as a validation input only if it persists no candidate and is removed before the internal checkpoint merge. It creates no publication authority.

## 9. Hard stops

Stop and classify `BLOCK` if:

```text
any executable caller of compileRuntimePrompt/renderRuntimePrompt is found
legacy compatibility requires either name as an active external contract
removal changes prompt bytes or current request serialization
module factory loading fails
any reload/edit/reroll/telemetry/state seam becomes involved
```

## 10. Internal checkpoint closure

S2-1 closes when:

```text
DESIGN = merged to main
IMPLEMENTATION = merged to main as cumulative builder/checkpoint evidence
STATIC/CI = PASS
TARGETED DIFFERENTIAL = PASS
release-simcore = still v0.70.1
broad live = not run
```

Next after closure: continue S2 source scan for another genuinely dead compatibility/API seam. If none is high-confidence, terminate S2 and move to S3.

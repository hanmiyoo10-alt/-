# SimCore S2-2 Session Dead Re-export Surface Retirement Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 RELEASE/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S2 API + COMPATIBILITY SEAM SLIMMING / NARROW**

## 1. Program authority

Governed by:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`

S2-2 is cumulative after S1-1 and S2-1. It is not a runtime release.

```text
production = v0.70.1
release-simcore = unchanged through pre-S7 construction
v0.70.2 = parked/preserved
v0.70.3 = cumulative simplification target
broad real-long-chat = S7 only
```

## 2. Exact current source shape

Session currently exports several useful shell-facing adapters plus four properties whose underlying functions remain live internally but whose Session re-export names have no current executable caller:

```js
module.exports = {
  CoreRulesetSession,
  inspectPreviousBEndOutput,
  latestUserIndex: kernel.latestUserIndex,
  latestUserText: kernel.latestUserText,
  inspectPromptMessages: kernel.inspectPromptMessages,
  fingerprintText: kernel.fingerprintText,
  validateStructure: structure.validateStructure,
  communityBlocks: community.communityBlocks,
  prepareTurn: lifecycle.prepareTurn,
  ...
};
```

After S2-1, `renderRuntimePrompt` is already absent from this cumulative output.

## 3. Caller proof

Current runtime source proves these Session exports are live and must remain:

```text
coreRules.latestUserIndex      = live
coreRules.latestUserText       = live
coreRules.inspectPromptMessages = live
coreRules.fingerprintText      = live
```

Current repository/source searches found zero executable property callers for:

```text
session.inspectPreviousBEndOutput
session.validateStructure
session.communityBlocks
session.prepareTurn

coreRules.inspectPreviousBEndOutput
coreRules.validateStructure
coreRules.communityBlocks
coreRules.prepareTurn
```

Important distinction:

```text
inspectPreviousBEndOutput function = LIVE inside Session
structure.validateStructure = LIVE in owning structure paths
community.communityBlocks = LIVE in owning Community/Structure paths
lifecycle.prepareTurn = LIVE inside Session orchestration
```

Therefore only the **Session export properties** are dead. The underlying functions, imports, owners and internal calls must remain exactly unchanged.

Historical legacy compatibility evidence confirms the legacy adapter executes the Session module factory. That makes factory-load success mandatory, but it does not establish consumers of these four property names. S2-2 must preserve factory initialization and all live exports.

## 4. Proposed mechanical delta

Remove exactly four Session `module.exports` properties:

```text
inspectPreviousBEndOutput
validateStructure: structure.validateStructure
communityBlocks: community.communityBlocks
prepareTurn: lifecycle.prepareTurn
```

Do not remove or rename any underlying definition/import/call.

## 5. Ownership before / after

Before:

```text
Session owns orchestration
+ exposes four policy-free aliases for functions already owned elsewhere/internally
```

After:

```text
Session owns orchestration
+ exports only interfaces with active external runtime callers or actual Session product surface
```

Semantic ownership is unchanged.

## 6. Frozen boundaries

Byte/behavior equivalent across S2-2 for:

```text
inspectPreviousBEndOutput function body and its B_END internal call
structure.validateStructure owner and all calls
community.communityBlocks owner and all calls
lifecycle.prepareTurn owner and Session internal call
CoreRulesetSession class body
latestUserIndex/latestUserText shell adapters
inspectPromptMessages/fingerprintText shell adapters
Prompt compileRuntimePromptParts live path
all runtime modules outside Session
all awaits/timers/storage/network/chat writes
persistent state/schema
reload/reroll/edit/recovery/telemetry behavior
Community semantics
Frame/Time/Evidence semantics
```

## 7. Static/differential proof

Cumulative builder must fail closed unless:

```text
S1-1 FNV convergence remains equivalent
S2-1 dead Prompt render seam remains absent
S2-2 removes exactly four Session export properties
underlying function/import/call markers remain present
CoreRulesetSession remains exported and module factory loads
live shell-facing Session exports remain present
Session require surface unchanged from S2-1 output
Session function/class body outside module.exports remains byte-identical
frozen module bodies remain byte-identical to S2-1 output
protected semantic/state/cache markers unchanged
side-effect marker counts unchanged
latest/install cumulative output identical
```

A temporary PR-only dry request may be used to exercise PR1 qualification, but it must be deleted before merge and persists no candidate.

## 8. Hard stops

Stop if:

```text
any executable caller of the four Session property names is found
legacy compatibility asserts one of these property names as a public contract
module factory loading changes
removal requires changing imports or underlying live functions
any state/reload/edit/reroll/telemetry semantic seam becomes involved
```

## 9. Closure

```text
DESIGN = merged main
IMPLEMENTATION = cumulative internal builder/checkpoint merged main
PR dry = PASS where used
final head = candidate request absent
release-simcore = v0.70.1 unchanged
broad live = deferred S7
```

After S2-2, rescan remaining Session/API compatibility seams. If remaining candidates are live, ambiguous, or low-value, close S2 and proceed to S3.

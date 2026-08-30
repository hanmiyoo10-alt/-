# SimCore S2-3 Runtime Utility Dead Exports Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTED ON WORK BRANCH · PR-DRY QUALIFICATION PENDING · INTERNAL CHECKPOINT ONLY**
Classification: **POST-M2 SIMPLIFICATION / S2 / PURE RUNTIME UTILITY EXPORT NARROWING**

Authority:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_3_RUNTIME_UTILITY_DEAD_EXPORT_SURFACE_RETIREMENT_DESIGN_2026-08-31.md`

Production remains `release-simcore` v0.70.1 at commit `861100f4771967aa5b8ab8811d06f11702c0d3ff`. `latest.js` and `install.js` remain byte-identical at blob `8f332cfceed316d35954e353c2eaca38c2f34d95`.

S2-3 is an internal cumulative construction checkpoint only. It does not publish v0.70.3 independently.

## Builder

`products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py`

The builder is self-contained and does not invoke earlier builder files.

```text
P0 = exact v0.70.1 production
P1 = P0 + S1-1 runtime-cache FNV convergence
P2 = P1 + S2-1 Prompt/Session dead render compatibility retirement
P3 = P2 + S2-2 Session dead re-export retirement
P4 = P3 + S2-3 pure runtime utility export narrowing
```

Each stage is verified only against its direct parent so an earlier authorized cumulative delta cannot be misattributed to a later stage.

## S2-3 exact delta

No helper definition or internal call is removed.

Only module export surfaces narrow:

```text
runtime-cache
BEFORE:
  promptChangeReason
  buildRuntimePromptCacheProbe
  runtimeLineTier
  runtimeIdentity
  createRuntimePromptCacheTracker

AFTER:
  createRuntimePromptCacheTracker
```

```text
runtime-topology
BEFORE:
  exactHash
  messageSignature
  leadingSystemCount
  breakAttribution
  createRequestTopologyTracker

AFTER:
  messageSignature
  breakAttribution
  createRequestTopologyTracker
```

The six retired names are internal implementation details with zero current external module-property callers:

```text
promptChangeReason
buildRuntimePromptCacheProbe
runtimeLineTier
runtimeIdentity
exactHash
leadingSystemCount
```

## Live surfaces explicitly preserved

The builder fails closed unless these remain:

```text
cacheRules.createRuntimePromptCacheTracker
runtimeCacheRules.createRuntimePromptCacheTracker
runtimeTopologyRules.messageSignature
runtimeTopologyRules.breakAttribution / topoRules.breakAttribution
runtimeTopologyRules.createRequestTopologyTracker
```

It also physically loads `runtime-cache`, `runtime-topology`, and `session` through the existing BundleLoader and asserts:
- the six retired properties are absent;
- live tracker/signature/attribution exports remain functions;
- `CoreRulesetSession` still loads.

## Cumulative safety checks

The builder preserves:
- old-vs-new bounded FNV equivalence and rolling-prefix paths for S1;
- S2-1 live `compileRuntimePromptParts` path;
- S2-2 Session implementation/internal-call preservation;
- module inventory;
- module require surfaces;
- byte identity of every non-owned module for each stage;
- Prompt compiler / Community classifier / State version markers;
- `TAIL_AFTER_CURRENT_USER`;
- `provider cache UNVERIFIED`;
- post-onSend attribution marker;
- `claimHostLocalOnce` count;
- await/timer/storage/network/chat-write/history-mutation marker counts;
- final `latest.js == install.js`.

## PR dry rule

A temporary PR-only candidate request may be attached only to exercise the existing `GATE_PR1_DRY` lane against exact production bytes.

It must:
- persist no candidate;
- mutate no `release-simcore` bytes;
- create no release authority;
- be deleted before merge;
- be followed by fresh exact-head CI on the request-free final head.

Any dry anomaly is preserved and classified before repair.

## Current disposition

```text
S2_3_DESIGN = FROZEN
S2_3_BUILDER = IMPLEMENTED
S2_3_PR_DRY = PENDING
S2_3_FINAL_INTERNAL_HEAD = PENDING
release-simcore = v0.70.1 unchanged
broad real-long-chat = deferred to S7
```

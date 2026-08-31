# SimCore S2-3 Runtime Utility Dead Exports Implementation Evidence

Date: 2026-08-31 KST
Status: **PR-DRY QUALIFIED AFTER BUILDER REPAIR · REQUEST-FREE FINAL CI NEXT · INTERNAL CHECKPOINT ONLY**
Classification: **POST-M2 SIMPLIFICATION / S2 / PURE RUNTIME UTILITY EXPORT NARROWING**

Authority:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_3_RUNTIME_UTILITY_DEAD_EXPORT_SURFACE_RETIREMENT_DESIGN_2026-08-31.md`

Production remains `release-simcore` v0.70.1 at commit `861100f4771967aa5b8ab8811d06f11702c0d3ff`. `latest.js` and `install.js` remain byte-identical at blob `8f332cfceed316d35954e353c2eaca38c2f34d95`.

S2-3 is an internal cumulative construction checkpoint only. It does not publish v0.70.3 independently.

## Builder

`products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py`

The repaired builder is self-contained and does not invoke earlier builder files or depend on repository-local executable helper files that are absent from the candidate sandbox.

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
breakAttribution live call surface
runtimeTopologyRules.createRequestTopologyTracker
CoreRulesetSession live Session path
```

The repaired verifier uses source-structural ownership checks plus `node --check` on both generated plugin files instead of importing the repository-local `bundle-loader.mjs` from the candidate sandbox.

This change is deliberately a verifier repair only. It does not widen the runtime delta or alter the six-export retirement contract.

## Cumulative safety checks

The builder preserves and verifies:
- old-vs-new bounded FNV equivalence and both rolling-prefix paths for S1;
- S2-1 live `compileRuntimePromptParts` path;
- S2-2 Session implementation/internal-call preservation;
- module inventory;
- module require surfaces;
- byte identity of every non-owned module at the S2-3 stage;
- Prompt compiler / Community classifier / State version markers;
- `TAIL_AFTER_CURRENT_USER`;
- `provider cache UNVERIFIED`;
- post-onSend attribution marker;
- `claimHostLocalOnce` count;
- await/timer/storage/network/chat-write/history-mutation marker counts across cumulative stages;
- generated JS syntax for `latest.js` and `install.js`;
- final `latest.js == install.js`.

## Preserved PR-dry failure and repair

The first S2-3 dry attempt failed closed because the builder tried to import:

```text
products/simcore/tooling/bundle-loader.mjs
```

That helper is not part of the candidate sandbox materialization contract.

The finding is preserved separately in:

`docs/SIMCORE_S2_3_PR_DRY_FAILURE_01_BUNDLE_LOADER_SANDBOX_DEPENDENCY_2026-08-31.md`

Disposition:

```text
FIX · CUMULATIVE_BUILDER_SANDBOX_DEPENDENCY
NON_RUNTIME
PRODUCTION_UNCHANGED
```

Repair commit:

```text
8e1f40968b7d9da0e39097da151c83849543313f
fix(simcore): restore self-contained S2-3 builder
```

The repaired builder embeds the bounded cumulative transformation and its stage-specific invariants directly and has no `bundle-loader.mjs` dependency.

## Repaired PR dry qualification

SimCore CI run:

```text
run = 33359099016
Verify job = 99386857912
profile = PR_MAIN
head = 8e1f40968b7d9da0e39097da151c83849543313f
production = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidateCommit = null
conclusion = PASS
```

Exact planned gates:

```text
GATE_CI_SELF    = PASS
GATE_PR1_DRY    = PASS
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
reasonCodes     = []
```

The generated source digest was identical for `latest.js` and `install.js`:

```text
latestSha256  = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
installSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
bytes         = 574325
```

No candidate was persisted and no `release-simcore` mutation occurred.

## PR dry rule and finalization

The temporary PR-only candidate request exists only to exercise the existing `GATE_PR1_DRY` lane against exact production bytes.

It must:
- persist no candidate;
- mutate no `release-simcore` bytes;
- create no release authority;
- be deleted before merge;
- be followed by fresh exact-head CI on the request-free final head.

Therefore the next mechanical action is to remove `simcore-v0.70.3-intent-03.json` and obtain a clean exact-head CI result before merging the internal checkpoint.

## Current disposition

```text
S2_3_DESIGN = FROZEN
S2_3_BUILDER = IMPLEMENTED / SELF-CONTAINED
S2_3_PR_DRY_FAILURE_01 = FIX RECORDED
S2_3_REPAIRED_PR_DRY = PASS
S2_3_TEMP_REQUEST = REMOVE BEFORE MERGE
S2_3_FINAL_REQUEST_FREE_CI = PENDING
release-simcore = v0.70.1 unchanged
broad real-long-chat = deferred to S7
```

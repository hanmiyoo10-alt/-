# OBSERVABILITY-CONCURRENT-METRIC-IDENTITY

## Problem / evidence

`TripleHwang/RisuVault@43cbe3065615cdc30dc18e9c60229a1fc0359932` fixed a measurement correctness bug where overlapping invocations of the same operation shared identical `performance.mark()` names. Same-name overlap could pair one invocation's start with another invocation's end and silently corrupt latency evidence.

## Minimal safe scope

This is an invariant dossier, not an implementation request. Apply it only if PocketRisu gains or already exposes a concurrent runtime performance-mark/measure owner.

## Ownership boundaries

- browser/client observability only
- no persistence or protocol ownership
- no server/device/system update
- no user-content-bearing metric labels

## Mechanism

Each measurement invocation owns an opaque/content-free identity returned from `start()`. `end()` consumes that identity and pairs only with its matching start mark. Public aggregate measure names may remain stable. Invocation marks are cleared after measurement.

## Compatibility / invariants

- instrumentation must be behaviorally optional and fail-safe
- metrics must never carry message, character, prompt, credential, or other user content
- overlapping same-name operations must not collide
- mark cleanup must not clear another live invocation's marks
- product behavior must not depend on Performance API availability

## Validation / acceptance

1. Start two same-name measurements before ending either.
2. End each independently and assert each measure references its own start/end pair.
3. Verify marks are cleared only after their owning invocation ends.
4. Verify missing or throwing Performance APIs do not throw into product flow.
5. Verify generated mark names are content-free.

## Risk / blast radius

Low if localized to observability. Main risks are misleading telemetry, retained marks, accidental user-content leakage, or instrumentation exceptions affecting app behavior.

## Rollback / fallback

Disable/remove the optional instrumentation wrapper. Product semantics must remain unchanged.

## Dependencies

A concrete PocketRisu-owned runtime measurement layer or demonstrated debugging need. None exists in the current bounded search.

## PR decomposition

No PR while lifecycle is `HOLD`. If a matching owner appears, one XS PR should add invocation handles plus overlap/cleanup/failure-safe tests only; do not mix unrelated profiling work.

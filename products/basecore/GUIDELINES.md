# BaseCore Development Guidelines

## 1. Product definition

BaseCore is an independent Narrative-only runtime that targets behavioral equivalence with the default Narrative/A path of the initial SimCore donor, minus Broadcast/Mode C/Community systems.

## Production baseline

<!-- BASECORE_PRODUCTION_BASELINE:BEGIN -->
- Production version: none
- Release: none
- Release branch: `release-basecore`
- Validation: `NOT_YET_LIVE_VALIDATED`
<!-- BASECORE_PRODUCTION_BASELINE:END -->

## 2. Golden behavior

The initial donor is SimCore v0.63.56. During v0.1 stabilization, the following behavior is frozen unless a real BaseCore failure proves a change is necessary:

- narrative timestamp syntax and zero-hour canonicalization
- deterministic month/day calendar resolution
- narrative current-time backward floor
- multi-scene monotonic tail timestamp commit
- world-year advancement and Korean-age offset
- Volume/Chapter/Chatindex deterministic continuity
- user-controlled protagonist/secondary boundaries
- canonical `# 응답` envelope
- final single `<Knowledge>` block
- reload-safe named hook cleanup

## 3. No mode concept

BaseCore does not expose or persist a mode. Narrative is the default runtime path, not "Mode A".

Do not add `mode=A`, `lastMode`, mode routers, or Broadcast/Community compatibility state merely for similarity with SimCore.

## 4. Isolation

Never read, write, migrate, or fall back to SimCore runtime state.

Forbidden BaseCore dependencies include:

- `sim:core:*`
- `$simcore_core_*`
- `<SIMCORE_CORE_SWITCH>`
- SimCore runtime singletons or imports
- SimCore release-state documents as BaseCore current state

## 5. Time is protected

Time is BaseCore's primary retained capability. First prove parity before simplifying it.

Changes to narrative time, world-year, age offset, frame continuity, bootstrap, or edit recovery require regression evidence and an explicit durable note in `CURRENT_DEVELOPMENT.md`.

## 6. Repository memory

Do not rely on chat memory as the durable development record.

At the start of a BaseCore development session, read in this order:

1. `products/basecore/README.md`
2. `products/basecore/manifest.json`
3. `products/basecore/CURRENT_DEVELOPMENT.md`
4. `products/basecore/GUIDELINES.md`
5. `products/basecore/GOVERNANCE.md`

If a durable design decision changes, update the corresponding BaseCore document in the same work session.

## 7. Release discipline

Development branches must not silently update `release-basecore`.
A release is valid only after syntax checks and live PocketRisu validation gates recorded in `CURRENT_DEVELOPMENT.md`.

# SimCore v0.64.9 — Session Transport Root Resolution Implementation Evidence

Status: `IMPLEMENTED_PR1_PENDING_CI`
Classification: `FIX / RUNTIME_CORRECTION`
Release work item: `#660`
Parent production: `f5e29464452728f859a1a6a8191a846468353531` (`v0.64.8`)
Parent runtime blob: `bed3d5faff9641071cdd9003b67c45d42b3e32ee`
Target live gate: `06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT`

## 1. Design authorities

- `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_ACTIVATION.md`
- `docs/SIMCORE_06409_OPERATOR_RELEASE_CARD_ADJUNCT_DESIGN.md`

The runtime repair and operator card share the v0.64.9 version number but remain mechanically separated: transport correctness is owned by `runtime-telemetry`; the card is a static formatter mounted inside the existing diagnostic panel and cannot mutate transport state.

## 2. Runtime implementation slice

Builder: `products/simcore/tooling/build-06409-session-transport-root-resolution.py`

The builder starts only from identical v0.64.8 `latest.js` / `install.js` inputs and performs these bounded changes:

1. bump metadata/runtime identity to `0.64.9`;
2. replace the existing `runtime-telemetry` module while keeping its public `capture / publish / claim / validate / diagnostics` API stable;
3. passively inspect `WINDOW` and `GLOBAL_THIS` sessionStorage surfaces;
4. classify each root as `ROOT_ABSENT / STORAGE_ABSENT / ACCESS_ERROR / METHODS_INCOMPLETE / USABLE`;
5. de-duplicate identical storage objects;
6. serialize the existing capsule once and perform at most two distinct real session writes in `WINDOW → GLOBAL_THIS` order;
7. preserve memory-first claim/validation and consume each distinct usable session candidate at most once;
8. propagate the selected session root into continuity diagnostics;
9. retain the v0.64.8 output-complete and unload checkpoint call sites without changing COMMITTED semantics.

Frozen transport invariants remain unchanged:

- memory key `__SIMCORE_TELEMETRY_HANDOFF_V1__`;
- session key `__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__`;
- `MAX_AGE_MS = 10 * 60 * 1000`;
- `MAX_SESSION_CHARS = 16384`;
- memory-first transport priority;
- provider cache remains `UNVERIFIED`;
- no raw request/output body retention.

## 3. Diagnostic surface

v0.64.9 adds bounded root attribution rather than a new observer:

- `Session surface: WINDOW ... · GLOBAL_THIS ... · relation ...`;
- checkpoint memory/session disposition;
- selected session root;
- bounded fallback/attempt attribution;
- session-adoption root on continuity success.

No exception text, capsule body, request body, or output body is retained in these probes.

## 4. Same-version operator adjunct

The existing diagnostic panel receives one collapsed button/section pair:

- exact label: `업데이트 내역`;
- collapsed by default;
- no new `Risuai.registerButton` or `Risuai.registerSetting` call;
- static v0.64.9 summary and exactly one live scenario;
- numbered steps, stop condition, REQUIRED / IMMEDIATE / CONTROL capture guidance;
- recent ledger for v0.64.9 / v0.64.8 / v0.64.7;
- explicit statement that the card is not release PASS/FAIL authority.

The card formatter performs no storage, network, timer, polling, experiment, checkpoint, or release-state operation.

## 5. Permanent regression coverage

`reload-cache-continuity` is extended to v3 and remains backward-compatible with v0.64.7/v0.64.8 PR verification. v0.64.9 executable cases include:

- both root surface classification and fixed priority;
- WINDOW-only and GLOBAL_THIS-only transport;
- distinct roots with first-success short circuit;
- identical storage object de-duplication;
- first write failure with exactly one second-root fallback;
- both-write bounded failure;
- oversize cleanup without a real write;
- malformed first session with valid second-root adoption;
- memory-first priority;
- selected-root attribution and one-time session consumption;
- absence of loops, timers, polling, network, localStorage, pluginStorage, or new storage owners in the telemetry module.

A new required `operator-release-card` suite verifies panel-only placement, exact label, collapsed default state, guidance shape, three-version ledger, explicit non-authority wording, unchanged top-level UI registration counts, and no side-effectful APIs in the card formatter.

## 6. Pre-release runtime audit lens

Applied from `docs/SIMCORE_PRE_RELEASE_RUNTIME_AUDIT_PROMPT.md`.

Current classification before CI:

- `Memory/OOM`: PASS — no unbounded collection or body retention added;
- `Leak/resource lifecycle`: PASS — no new observer, listener owner, timer, or persistent resource;
- `CPU/event-loop`: PASS — root resolution is O(1), two passive inspections, maximum two distinct session write attempts;
- `Async/race`: PASS — no new async owner; output checkpoint remains after authoritative output success and before COMMITTED bookkeeping;
- `Error isolation`: PASS — storage access/write/remove failures remain bounded and checkpoint failure cannot downgrade an already successful output;
- `Resource lifecycle`: PASS — existing memory/session sidecar ownership only, no new storage namespace.

No new `WATCH`, `DEFER`, or `BLOCKER` was identified by the static audit. CI and candidate materialization remain mandatory and may supersede this pre-CI assessment.

## 7. Release-system boundary

PR1 must contain builder/tests/fixture/intent/evidence only. It must not contain built `plugins/simcore/latest.js` or `plugins/simcore/install.js` bytes.

After PR1 qualification and merge, the permanent Generic Candidate Materialize path must build the exact candidate from parent production, run `batch-a`, persist the receipt/spec shadow, and require exact approval before the single permanent publisher may mutate `release-simcore`.

Issue `#660` must remain open through publication, production reobservation, and LIVE_PENDING convergence per R2.2 closure integrity.

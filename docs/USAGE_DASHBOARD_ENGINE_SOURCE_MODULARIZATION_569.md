# Local Usage Dashboard 3.0.0-alpha.5.69 — Engine Development Source Modularization

## Goal

Large development-structure change, zero new runtime behavior.

5.69 splits the Bridge Engine development source into deterministic shared-lexical parts while preserving one deployed `plugins/usage-dashboard/runtime/bridge-engine.mjs` artifact for PocketRisu and Bridge Manager.

## Baseline

Repository production baseline at design/implementation start:

- Product `3.0.0-alpha.5.68`
- Bridge Engine `1.6.19`
- Bridge Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- deployed Engine SHA-256 `f17d689f39bd469bcadf1a2125313146cd6e04cb38299a5b4583d903a696cf09`

The durable guidelines still identify 5.67 as the latest real-device verified baseline. 5.69 must not silently promote 5.68 to real-device VERIFIED without new device evidence.

## Target tuple

- Product `3.0.0-alpha.5.69`
- Bridge Engine `1.6.20`
- Bridge Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`

Engine advances because the generated Engine artifact identity changes. Manager lifecycle behavior does not change; only its embedded Product version synchronization may change.

## Development source layout

`plugins/usage-dashboard/runtime-src/bridge-engine/parts.json` is the ordered source authority.

The initial eight parts are:

1. `00-core.part.mjs`
2. `10-attribution.part.mjs`
3. `20-cache-circuit.part.mjs`
4. `30-cli-runtime.part.mjs`
5. `40-sources.part.mjs`
6. `50-organization-capture.part.mjs`
7. `60-snapshot-scheduler.part.mjs`
8. `70-http-diagnostics.part.mjs`

The first migration preserves the monolith's exact lexical order. A responsibility boundary may therefore remain intentionally conservative where moving declarations would create unnecessary semantic risk. Further ownership cleanup is a later refactor, not part of 5.69.

## Build contract

`plugins/usage-dashboard/tools/build_bridge_engine.cjs` must fail closed unless:

- the parts manifest is valid and ordered,
- every listed part exists and is non-empty,
- no unlisted `*.part.mjs` file exists,
- the first part alone owns the shebang,
- repeated builds produce identical bytes and SHA-256,
- the generated artifact exactly matches the committed/generated `runtime/bridge-engine.mjs`,
- `node --check` accepts the generated artifact.

Normal Engine development becomes `runtime-src` edit → deterministic build → generated `runtime/bridge-engine.mjs`. A direct artifact edit without matching source changes fails parity.

## Runtime parity contract

The 5.69 materializer splits the exact verified 5.68 Engine bytes at unique, fail-closed lexical markers and changes only:

`const VERSION = '1.6.19';` → `const VERSION = '1.6.20';`

If replacing that one target version literal back to `1.6.19` does not reproduce the entire 5.68 Engine artifact byte-for-byte, materialization fails.

This locks all existing runtime behavior at the strongest practical source boundary, including:

- CLI concurrency 2 and 25-second process timeout,
- managed-direct → direct → npx fallback authority,
- Credits early-start,
- 24h foreground truth,
- 7d/30d deferred long-window semantics,
- secondary concurrency 1, 32-key bound, same-key/inFlight dedupe and foreground hold,
- cache/circuit semantics,
- organization discovery/fallback,
- snapshot/diagnostic endpoints,
- UNKNOWN/source-fidelity behavior.

Behavior remains protected by the existing real Engine process harnesses. P31 owns source/build/parity boundaries rather than reintroducing VM/function-body extraction.

## Explicit non-goals

5.69 does not change CLI speed, concurrency, timeout, TTL, cache semantics, secondary scheduling, endpoints, Diagnostics functionality, Manager lifecycle, source operations, or data inference rules.

The intermittent historical style/render spike is unrelated and remains outside this release.

## Distribution boundary

`release-usage-dashboard` continues to publish only the single Engine artifact under `plugins/usage-dashboard/runtime/bridge-engine.mjs` together with the existing product runtime files. `runtime-src` is development-only and is not installed on the phone.

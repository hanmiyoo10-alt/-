# Feature-ID: DIRECT-INDEX-RUNTIME-IDENTITY

Status: **READY_TO_PORT DESIGN — implementation requires verified checkout/tests**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE` for design/readiness; implementation still requires a clean checkout and focused test execution
- Priority: `P0`
- Lifecycle: `READY_TO_PORT`

## Problem / evidence

External evidence: `TripleHwang/RisuVault` commit `7d23e41425555fab02d8ef7a5b06269520b6f9be` (reviewed through merge `e750a66f513bd4a4161df7833367058363d949ac`) fixed a standalone-runtime bug where direct `/index.html` navigation bypassed server runtime-mode injection.

PocketRisu inspection confirms the same route-order hazard on current personal-fork `main`: `server/node/server.cjs` registers `express.static(dist, { index: false })` and separately injects `globalThis.__NODE__` / `globalThis.__PATCH_SYNC__` only in `app.get('/')`. Express static serving can therefore answer `/index.html` before the `/` handler runs.

This is structural PocketRisu evidence, not a request to copy RisuVault architecture wholesale.

## Minimal safe scope

Make `/` and direct `/index.html` materialize the same injected HTML runtime identity while leaving hashed asset serving, API routes, auth behavior, and static caching policy unchanged.

The first PR must touch only the Node HTML-entry serving boundary and focused tests. Do not mix storage refactors, startup cleanup, or unrelated routing changes.

## Ownership boundaries

- Owner: Node standalone HTTP entry-point serving in `server/node/server.cjs`.
- Browser/runtime consumers remain unchanged; they should receive the same globals regardless of `/` vs `/index.html` entry path.
- `/assets/*` immutable static serving remains independently owned and unchanged.
- API route/body-parser ordering is out of scope.

## Proposed mechanism

Prefer one small shared HTML-response helper that:

1. reads `dist/index.html`;
2. injects exactly the existing runtime globals (`__NODE__`, `__PATCH_SYNC__`);
3. returns the same HTML for both `/` and `/index.html`;
4. is registered before the generic `express.static(dist, { index: false, maxAge: 0 })` handler, or otherwise prevents generic static middleware from owning `/index.html`.

Do not broaden this into a catch-all SPA fallback unless separately justified.

## Compatibility / invariants

- `/` and `/index.html` expose identical runtime identity.
- Existing `/assets/*` immutable cache behavior is unchanged.
- Generic `dist` files continue to use current non-immutable/static semantics.
- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains no-op.
- Existing save/integrity optimizations remain unchanged.
- Targeted V3 plugin reload remains unchanged.
- runit remains the service manager; no PM2.
- No Android notification behavior is introduced.

## Validation / acceptance

Focused server tests should prove:

1. GET `/` returns HTTP 200 and contains one injected `globalThis.__NODE__ = true` marker.
2. GET `/index.html` returns HTTP 200 and contains the same runtime markers.
3. The two responses select the same `__PATCH_SYNC__` value.
4. `/assets/<hashed-file>` still uses the existing static asset path/cache policy.
5. A representative non-index static file remains served normally.
6. API routing/auth is unaffected.

A lightweight request-level test is preferred over source-text assertions because middleware order is the bug class.

## Risk / blast radius

Risk is contained to the Node standalone entry route but is `MEDIUM` because route ordering can alter caching or startup semantics. Avoid changing the broad static middleware or SPA fallback behavior beyond `/index.html`.

## Rollback / fallback

Revert the isolated route/helper change. No persisted data, schema, package, device, or runtime migration is involved.

## Dependencies / PR decomposition

No unresolved design dependency remains. One PR is sufficient:

- PR 1: shared injected-index responder + `/` and `/index.html` route parity + focused request-level regression tests.

## Implementation status

Autonomous implementation was not started in this pass because the available execution environment could not resolve `github.com` for a clean checkout, so focused tests could not be run. This is an environment/integration verification blocker, not a code or CI failure. Do not open a personal draft PR until the implementation has been tested successfully.

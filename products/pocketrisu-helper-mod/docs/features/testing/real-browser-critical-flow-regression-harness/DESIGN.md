# REAL-BROWSER-CRITICAL-FLOW-REGRESSION-HARNESS

Status: `DESIGN_NEEDED`
Owner: assistant-maintained PocketRisu helper dossier

## Problem / evidence

PocketRisu has correctness boundaries that depend on real browser behavior rather than only application logic: first-run/bootstrap routing, DOM-driven file chooser paths, browser download events, service-worker interception, streamed-download handshakes, and export/import round-trips. Unit tests can validate helpers but cannot prove the browser owns and completes these transitions correctly.

Forward evidence from `nevaeh5379/HaejeokRisuai`:

- `373e66bf429facfde01ce4de3bee3dfc58eca1ba` adds Playwright E2E smoke/welcome coverage against a real Vite-served browser app.
- `582a70a46f3112c0c7f305ff1719d63a7a265f3a` adds a browser export/download/import flow and `e2e-swprobe.mjs`, which verifies service-worker control/interception, streamed-download registration over `MessageChannel`, anchor-triggered download, suggested filename, and downloaded bytes.

Evidence is `MEDIUM`: the pattern is directly implemented externally and causally appropriate, but PocketRisu-specific regression value and CI cost have not yet been measured.

## Minimal safe scope

First PR slice is test/tooling only. Add a small real-browser harness with no production behavior changes and no external-provider dependency. Start with at most two deterministic flows:

1. application bootstrap reaches a stable ready surface using a local deterministic profile/fixture;
2. one browser-owned file/download flow proves that a user-visible action causes the expected local artifact with expected filename/content signature.

Service-worker-specific coverage belongs in the first slice only if PocketRisu's current download owner actually depends on the service worker; otherwise keep it as a later focused test rather than copying Haejeok's architecture.

## Ownership boundaries

- Browser/DOM: navigation, visible readiness, user events, file chooser/download events.
- Service worker: only if currently authoritative for a tested PocketRisu path; test registration/control/interception without changing runtime behavior.
- App/client: expose no special production-only test backdoor. Prefer stable accessibility roles or existing deterministic UI state.
- Test fixtures: local, repository-owned, non-secret, no live provider credential or external network requirement.
- CI: owns browser binary installation/cache, fresh app server, timeout budget and failure artifacts.
- Production server/device: unchanged.

## Proposed mechanism

Use a mainstream browser automation runner already compatible with the frontend toolchain. Playwright is the current evidence-backed candidate, but the invariant is tool-agnostic.

- Launch a fresh local application server in CI; local reuse may be allowed only outside CI.
- Use role/label/test-id selectors for stable semantic surfaces; avoid nth-child and generated class selectors in durable tests.
- Keep fixtures isolated per test/context.
- For downloads, wait for the browser download event, save the artifact to the runner output directory, and validate filename plus a bounded content signature/parse result.
- For service-worker paths, wait for a controlled page and validate the actual intercepted result, not merely registration existence.
- Record trace/screenshot/console output on failure only or on the first retry; do not make artifacts the success criterion.

## Compatibility / invariants

The harness must not:

- alter PocketRisu save ordering or add forced DB flush on `visibilitychange` / `pagehide`;
- alter `flushServerDbKeepalive()`;
- broaden or replace targeted V3 plugin reload;
- introduce PM2 or change runit/service ownership;
- create Android notifications on the server phone;
- require real user/provider credentials;
- make external Haejeok onboarding copy/selectors authoritative for PocketRisu.

Existing export/import semantics remain owned by their production feature code; the harness observes them rather than redefining them.

## Validation / acceptance

Before `READY_TO_PORT`:

- inventory PocketRisu's browser-owned critical flows and choose the smallest two with high regression value;
- confirm deterministic offline/local fixture setup;
- define CI browser install/cache ownership and expected runtime budget;
- prove tests pass repeatedly from a clean checkout and fail when a targeted browser boundary is deliberately broken;
- keep initial suite runtime bounded (target: a few minutes, not a broad full-product crawl);
- measure flake rate over repeated runs; blocking CI requires effectively zero unexplained flakes in the sample window;
- ensure failure output identifies the stage and preserves trace/screenshot/log artifacts without leaking secrets.

## Risk / blast radius

Risk is `LOW` because the first slice is test-only and reversible. Main failure modes are CI slowdown/flakiness, brittle selectors, hidden environment coupling, and maintainers ignoring a noisy suite. Production data/persistence should be untouched.

## Rollback / fallback

Revert the test/tooling PR or temporarily make a flaky test non-blocking while preserving its issue/reference. Do not patch production code merely to satisfy a brittle test. If browser setup becomes unreliable in a given CI environment, retain unit/integration coverage and run the E2E slice in a dedicated workflow until the runner boundary is fixed.

## Dependencies

- PocketRisu critical-flow inventory.
- CI browser-runtime ownership/timeout budget.
- Stable local fixture strategy.

No runtime/system migration is required for production.

## PR decomposition

1. **Harness foundation + one deterministic smoke flow** — test runner config, isolated local server, failure artifacts, semantic selectors.
2. **One browser-owned artifact round-trip** — export/download or equivalent, validating actual artifact content.
3. **Optional service-worker streamed-download contract** — only if current PocketRisu architecture proves the service worker is authoritative for that path.

Each PR remains test-only and independently reversible. Do not bundle unrelated production cleanup.

## Current classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: `PocketRisu critical-flow inventory + CI browser-runtime ownership/timeout budget`
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`

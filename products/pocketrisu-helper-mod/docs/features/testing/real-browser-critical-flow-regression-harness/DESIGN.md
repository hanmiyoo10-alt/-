# REAL-BROWSER-CRITICAL-FLOW-REGRESSION-HARNESS

Status: `DESIGN_NEEDED`
Owner: assistant-maintained PocketRisu helper dossier

## Problem / evidence

PocketRisu has correctness boundaries that depend on real browser behavior rather than only application logic: first-run/bootstrap routing, DOM-driven file chooser paths, browser download events, service-worker interception, streamed-download handshakes, export/import round-trips, and potentially mobile pointer/touch gesture ownership. Unit tests can validate helpers but cannot prove the browser owns and completes these transitions correctly.

Forward evidence from `nevaeh5379/HaejeokRisuai`:

- `373e66bf429facfde01ce4de3bee3dfc58eca1ba` adds Playwright E2E smoke/welcome coverage against a real Vite-served browser app.
- `582a70a46f3112c0c7f305ff1719d63a7a265f3a` adds a browser export/download/import flow and `e2e-swprobe.mjs`, which verifies service-worker control/interception, streamed-download registration over `MessageChannel`, anchor-triggered download, suggested filename, and downloaded bytes.
- `69c0467c032daa86efe517e0b7e7a6c5d854098b` adds a touch-enabled mobile Playwright regression for branch-graph pinch zoom using actual multi-pointer input through CDP. The production code tracks touch pointers by pointer id, enters pinch ownership only with two touches, zooms around the gesture center, and releases ownership on gesture end. PocketRisu does not currently expose the same branch-graph surface, so this is evidence for the harness capability rather than a feature to port.
- `205292afba561eaaf5ed3c5ad08a38bdae615a8c` records a production failure where partial local backup could silently produce a 0-byte download when the browser/service-worker path owned delivery. Haejeok routes node-hosted partial backup through the node stream path and adds regression coverage for partial backup scope.
- `490c96054252d15cb154c78e3bc0aa1391d21688` adds a real-browser local-backup pipeline suite and fixes two service-worker races: the stream registry entry was deleted before the later download fetch consumed it, and the download fetch could arrive before registration crossed the IPC boundary. The suite checks framing, app save completion, service-worker delivery, actual bytes, and restore usability. This is strong evidence that a UI-level “Success” signal alone is not enough to prove a browser-owned artifact was delivered correctly.

Evidence remains `MEDIUM`: the pattern is directly implemented externally and causally appropriate, and now includes a concrete silent-empty-artifact failure, but PocketRisu-specific regression value and CI cost have not yet been measured.

## Minimal safe scope

First PR slice is test/tooling only. Add a small real-browser harness with no production behavior changes and no external-provider dependency. Start with at most two deterministic flows:

1. application bootstrap reaches a stable ready surface using a local deterministic profile/fixture;
2. one browser-owned file/download flow proves that a user-visible action causes the expected local artifact with expected filename/content signature.

For an artifact flow, acceptance must include the actual saved bytes or a successful bounded parse/content identity check. Do not treat “download event fired”, “success toast appeared”, or “stream registered” as sufficient by themselves; the Haejeok 0-byte regression shows those intermediate signals can all be misleading.

Service-worker-specific coverage belongs in the first slice only if PocketRisu's current download owner actually depends on the service worker; otherwise keep it as a later focused test rather than copying Haejeok's architecture.

Touch/pointer coverage is likewise a later capability unless PocketRisu's critical-flow inventory identifies an existing mobile gesture whose ownership is both important and under-tested. Do not add a synthetic demo gesture to justify the harness.

## Ownership boundaries

- Browser/DOM: navigation, visible readiness, user events, file chooser/download events, and any explicitly selected critical pointer/touch gesture.
- Artifact delivery: the test must distinguish application save completion from browser delivery completion. Ownership is not considered complete until the expected bytes are observable by the runner.
- Service worker: only if currently authoritative for a tested PocketRisu path; test registration/control/interception and stream lifetime/order without changing runtime behavior.
- App/client: expose no special production-only test backdoor. Prefer stable accessibility roles or existing deterministic UI state.
- Test fixtures: local, repository-owned, non-secret, no live provider credential or external network requirement.
- CI: owns browser binary installation/cache, fresh app server, timeout budget and failure artifacts.
- Production server/device: unchanged.

## Proposed mechanism

Use a mainstream browser automation runner already compatible with the frontend toolchain. Playwright is the current evidence-backed candidate, but the invariant is tool-agnostic.

- Launch a fresh local application server in CI; local reuse may be allowed only outside CI.
- Use role/label/test-id selectors for stable semantic surfaces; avoid nth-child and generated class selectors in durable tests.
- Keep fixtures isolated per test/context.
- For downloads, wait for the browser download event where appropriate, save the artifact to the runner output directory, and validate filename plus a bounded content signature/parse result. Explicitly reject a zero-length artifact.
- If the application has a multi-stage export pipeline, assert at least one semantic checkpoint before delivery and then separately prove final artifact bytes. This makes failures attributable without weakening the end-to-end contract.
- For service-worker paths, wait for a controlled page and validate the actual intercepted result, not merely registration existence. If registration and fetch can race, the test must exercise both legal orderings or otherwise prove the runtime coordination handles them.
- For critical mobile gestures, use real multi-pointer browser input where the runner supports it, assert the observable user contract rather than implementation internals, and keep CDP-specific injection behind the test adapter so it can be swapped or skipped on unsupported browsers.
- Record trace/screenshot/console output on failure only or on the first retry; do not make artifacts the success criterion.

## Compatibility / invariants

The harness must not:

- alter PocketRisu save ordering or add forced DB flush on `visibilitychange` / `pagehide`;
- alter `flushServerDbKeepalive()`;
- broaden or replace targeted V3 plugin reload;
- introduce PM2 or change runit/service ownership;
- create Android notifications on the server phone;
- require real user/provider credentials;
- make external Haejeok onboarding copy, branch-graph UI, service-worker protocol, or selectors authoritative for PocketRisu.

Existing export/import and gesture semantics remain owned by their production feature code; the harness observes them rather than redefining them.

## Validation / acceptance

Before `READY_TO_PORT`:

- inventory PocketRisu's browser-owned critical flows and choose the smallest two with high regression value;
- confirm deterministic offline/local fixture setup;
- define CI browser install/cache ownership and expected runtime budget;
- prove tests pass repeatedly from a clean checkout and fail when a targeted browser boundary is deliberately broken;
- for any artifact/download test, reject zero-byte output and validate either parseability plus a known semantic field or a stable bounded content signature; UI success alone is insufficient;
- for any streamed/service-worker path, include ordering/lifetime coverage for registration, response consumption, close/finalize, and cleanup so cleanup cannot race ahead of the consumer;
- keep initial suite runtime bounded (target: a few minutes, not a broad full-product crawl);
- measure flake rate over repeated runs; blocking CI requires effectively zero unexplained flakes in the sample window;
- ensure failure output identifies the stage and preserves trace/screenshot/log artifacts without leaking secrets;
- if touch coverage is selected, prove the gesture test is deterministic on the chosen browser runner and that unsupported-browser behavior is explicit rather than silently passing.

## Risk / blast radius

Risk is `LOW` because the first slice is test-only and reversible. Main failure modes are CI slowdown/flakiness, brittle selectors, hidden environment coupling, browser-specific touch injection, and maintainers ignoring a noisy suite. Production data/persistence should be untouched.

## Rollback / fallback

Revert the test/tooling PR or temporarily make a flaky test non-blocking while preserving its issue/reference. Do not patch production code merely to satisfy a brittle test. If browser setup becomes unreliable in a given CI environment, retain unit/integration coverage and run the E2E slice in a dedicated workflow until the runner boundary is fixed. If CDP touch injection proves runner-specific or unstable, drop only that gesture test and preserve the harness foundation.

## Dependencies

- PocketRisu critical-flow inventory.
- CI browser-runtime ownership/timeout budget.
- Stable local fixture strategy.

No runtime/system migration is required for production.

## PR decomposition

1. **Harness foundation + one deterministic smoke flow** — test runner config, isolated local server, failure artifacts, semantic selectors.
2. **One browser-owned artifact round-trip** — export/download or equivalent, validating actual non-zero artifact content/parse result rather than only UI completion.
3. **Optional browser-specialized contracts** — service-worker streamed download and/or real multi-pointer touch gesture coverage only when current PocketRisu architecture proves those boundaries are authoritative and valuable.

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

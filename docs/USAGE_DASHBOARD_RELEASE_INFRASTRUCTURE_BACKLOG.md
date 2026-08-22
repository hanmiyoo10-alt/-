# Local Usage Dashboard — Release Infrastructure Improvement Backlog

Status: **M5-C IMPLEMENTED CANDIDATE — state/contract process harness**

Recorded after:

- Product: `3.0.0-alpha.5.66`
- Bridge Engine: `1.6.19`
- Bridge Manager: `1.3.0`
- Snapshot / recent-request contracts: `1 / 1`
- Release PR: [#69](https://github.com/hanmiyoo10-alt/-/pull/69)

This document tracks the approved maintenance direction. Maintenance PR 4 retires the final workflow-time regression adapter and makes the committed test tree fail-closed immutable while leaving production artifacts, runtime behavior, and the 5.66 version tuple unchanged.

M5-A begins the remaining source-extraction retirement by exercising the exact Engine-generated capture tap through an isolated loopback process. It removes VM/function-body extraction from P10/P11 without adding test-only runtime exports or changing production artifacts.

M5-B extends the existing real-Engine organization harness with capture-empty/fallback-empty and capture-empty/fallback-valid scenarios. It removes VM/function-body extraction from P19 while preserving the hard empty-result error and fallback provenance.

M5-C executes the shipped `latest.js` unchanged inside a bounded headless Risuai/storage/nativeFetch process. It migrates `foundation`, P1 contract, P5 state compatibility, and P6 RC migration from VM/source extraction while preserving state hydration, contract normalization, privacy, and explicit-zero semantics. Remaining production VM tests drop from seven to three.

## Why this backlog exists

Local Usage Dashboard runtime behavior is increasingly well-protected, but the release/test harness has accumulated avoidable coupling.

The recurring problem is not primarily an unstable product. Historical regressions are frequently adapted to the current release by workflow-time string replacement. This makes harmless changes to versions, prose, function signatures, diagnostic fields, or source layout capable of failing a PR even when runtime behavior is correct.

Confirmed examples include:

- 5.62 P23 retained an escaped 5.61 product-version expectation and required [a compatibility correction](https://github.com/hanmiyoo10-alt/-/commit/0b7a3b1967329649a4a8d1b0e13b6dd6aefa74b0).
- 5.62 P24 counted the `runCli` function definition as a call site, producing `6 !== 5`, and required [an actual-call-site correction](https://github.com/hanmiyoo10-alt/-/commit/5cf0e2a6c0273f18f0d04daea4e96d1e7a981cef).
- 5.65 pre-PR validation initially exposed P26 coupling to an old diagnostics sample and old guidelines wording. Product behavior was correct; the historical test adapter was incomplete.
- Repository history contains repeated matcher, patch-target, workflow-syntax, memory-wording, and digest corrections, showing that this is a structural maintenance cost rather than a one-off typo.

GitHub Actions from other products may appear as skipped or cancelled beside a Usage Dashboard PR. Those are not automatically Usage Dashboard product failures and must be distinguished from the failing Usage Dashboard job.

## Goals

1. Reduce false-positive PR failures without weakening runtime protection.
2. Preserve every production incident regression represented by P1–P27.
3. Keep the shared `repo-main-write` lock and P22 monotonic fail-closed publisher.
4. Keep routine device updates on the PocketRisu `+` path.
5. Make release-specific files small enough to review without reconstructing previous workflows.
6. Separate current release identity from historical behavior assertions.
7. Preserve exact source-fidelity, UNKNOWN, cache, recovery, updater, and contract guarantees.

## Non-goals

This maintenance direction must not be combined with:

- snapshot scheduling or CLI concurrency changes,
- TTL or stale-policy changes,
- direct CLI provisioning,
- Manager lifecycle changes,
- new endpoints or source operations,
- UI redesign,
- Product, Engine, or Manager version bumps unless runtime artifacts actually change.

The 5.65 performance experiment and any later launcher repair remain separate evidence-led work.

## Proposed design

### A. Reusable release workflow

Create one reusable Usage Dashboard release workflow that owns:

- checkout and preflight,
- materializer execution,
- source build and parity checks,
- the complete test command,
- artifact and manifest integrity checks,
- candidate-to-main materialization,
- monotonic publication to `release-usage-dashboard`.

A release-specific caller should provide only bounded inputs such as:

- release title,
- materializer path,
- newly introduced regression test,
- expected Product / Engine / Manager / contract versions.

The reusable workflow must retain:

- `concurrency.group: repo-main-write`,
- `cancel-in-progress: false`,
- expected main/release ref checks,
- P22 stale-candidate and same-version-divergence guards,
- fail-closed publication.

Per-release materializers may remain separate because their source transformations are intentionally release-specific. The duplicated publisher and historical-test adapter should not.

### B. Test layers

Organize the existing suite conceptually into three layers without deleting incident history.

#### Contract tests

Own:

- manifest and artifact versions,
- component SHA-256 values,
- contract versions,
- updater URLs and release branch,
- Manager/Engine adoption boundaries.

Current versions should come from the current manifest or one current-release fixture rather than being rewritten inside every historical test.

#### Behavior tests

Own executable semantics such as:

- direct launcher success,
- ENOENT-only fallback,
- non-ENOENT failure,
- npx rollback argv,
- cache hit/stale/deferred rules,
- CLI lane limits,
- foreground/secondary scheduling,
- circuit and recovery behavior.

Prefer dependency injection and exported helpers over slicing function bodies from source text.

#### Incident regressions

P1–P27 remain durable records of production incidents and guarantees. They should assert the behavior that prevented recurrence, not the current release title or an unrelated exact guidelines sentence.

Historical fixtures should remain immutable unless the historical contract itself was wrong.

### C. Remove workflow-time historical string rewriting

Gradually eliminate the large Python `text.replace()` adapter embedded in each release workflow.

Priority order:

1. Product and Engine version rewrites.
2. Current-memory title and baseline sentence rewrites.
3. Exact diagnostics prose rewrites.
4. Function-signature rewrites.
5. Expected object-key rewrites caused only by later bounded metadata.

A current release must eventually be able to run P1–P27 directly after materialization, without modifying the committed test files in the CI workspace.

### D. Stronger source-operation guards

Where call-site count is a protected invariant:

- distinguish function definitions from calls,
- prefer a small parser or explicitly registered source-operation inventory,
- continue to verify the exact five `runCli()` call sites, two `runProgram()` call sites, and one `execFileAsync()` source operation while those remain the production contract,
- do not rely on a raw substring count that changes when a declaration or comment changes.

Source-shape assertions should be retained only where shape itself is an operational or security boundary.

### E. Materializer preflight

Keep exact, fail-closed transformations, but make failures easier to diagnose.

Each materializer should report:

- expected production baseline,
- failed target label,
- expected match count and actual count,
- whether the candidate is already materialized,
- final Product / Engine / Manager / contract tuple,
- final artifact integrity verification.

Do not make patch matching permissive enough to edit an ambiguous source location.

### F. Engine source modularization — later, separate release

Only after release/test consolidation, consider splitting development source into focused modules such as:

- CLI launcher,
- cache runtime,
- snapshot scheduler,
- secondary refresh,
- diagnostics,
- Credits source,
- DevPass source.

Continue publishing one bundled `bridge-engine.mjs` so Manager behavior and the `+` update path remain unchanged.

This is a separate runtime refactor and must not be included in the initial infrastructure maintenance PR.

## Current progress

Completed before this maintenance series:

- 5.65 real-device evidence was collected.
- 5.66 Managed Direct CLI Runtime shipped as Product 5.66 / Engine 1.6.19 / Manager 1.3.0 with P28 and the existing P22 monotonic publisher guard.

Completed in Maintenance PR 1:

- one reusable Usage Dashboard build/test/publish workflow,
- one 5.66 release spec as the single current candidate tuple,
- the current release workflow reduced to a bounded caller,
- the historical regression adapter moved out of workflow YAML into a shared tool,
- a spec-driven candidate integrity validator,
- publication disabled for this maintenance-only caller.

Completed across the maintenance series:

- current release identity and artifact validation are centralized,
- dependency-injected launcher/cache/scheduler behavior harnesses exercise the real Engine process boundary,
- migrated incident regressions no longer depend on VM function-body extraction,
- the historical regression adapter is removed completely,
- materializer and test execution are forbidden from mutating the committed test tree.

Still pending:

- modularize Engine development sources in a later versioned runtime release,
- split basic and detailed Diagnostics presentation,
- migrate the remaining recovery, service-tier, and outcome VM fixtures in bounded M5 follow-ups.

Maintenance PR 2 — Current Release Contract Fixture:

- current Product / Engine / Manager / contract identity is loaded from the release spec,
- one shared test helper validates current source, runtime, manifest, workflow, and artifact hashes,
- incident regressions no longer require workflow-time version, release-title, baseline, or workflow-path rewrites,
- historical downgrade and divergence fixture versions remain immutable,
- the remaining adapter is explicitly limited to behavior/source-shape compatibility shims.

Maintenance follow-up — Legacy Release Caller Retirement:

- completed stage publishers are registered in one archive manifest,
- archived callers are manual, read-only no-ops with no materializer or publisher access,
- only the current 5.66 caller responds to Usage Dashboard pull requests,
- legacy validation remains available in git history without creating false-negative PR checks,
- Product / Engine / Manager / contracts and the release channel remain unchanged.

Maintenance PR 3 — Black-box Runtime Behavior Harness:

- launches the real Bridge Engine against an isolated temporary HOME, port, token, PATH, and managed runtime,
- injects deterministic fake managed/direct/npx launchers without changing production runtime source,
- controls cache time through a child-process-only clock preload,
- uses gate files and an invocation ledger to prove CLI hard caps and secondary one-lane ordering without latency thresholds,
- verifies launcher authority, npx rollback, cold/fresh/expired cache behavior, 24h foreground blocking, and 7d/30d deferred response behavior,
- runs alongside the historical VM/source-shape regressions until behavior parity is proven,
- leaves Product / Engine / Manager / contracts, runtime artifacts, and the release channel unchanged.

Maintenance PR 4 — Immutable Regression Pipeline:

- removes the final behavior-only regression adapter and its workflow invocation,
- removes the cleanup checkout that previously discarded test mutations,
- checks tracked and untracked test-tree changes after materialization and after the full suite,
- runs P1–P28 directly from committed files,
- preserves intentionally retained parser/source-shape fixtures for a separate focused refactor,
- leaves Product / Engine / Manager / contracts, runtime artifacts, and the release channel unchanged.

M5-A — Cache Observer Capture-Tap Harness:

- loads the exact `capture-orgs.cjs` generated by the shipped Engine,
- drives only a bounded `127.0.0.1` `/orgs` → status/activity/logs fixture flow,
- verifies Anthropic, Gemini, OpenAI, and LLMGateway cache provenance plus UNKNOWN semantics,
- verifies prompt/response bodies, messages, authorization, cookies, and keys are not persisted,
- removes VM/parser-body extraction from P10/P11 while retaining narrow static security boundaries,
- leaves Product / Engine / Manager / contracts, runtime artifacts, and the release channel unchanged.

M5-B — Organization Empty-Fallback Migration:

- verifies capture-empty plus plain-fallback-empty remains a hard organization error,
- verifies capture-empty plus a valid plain fallback succeeds with bounded provenance,
- verifies Credits, capture, and plain fallback each retain single-source ownership,
- removes VM/loadOrgs-body extraction from P19 while retaining narrow static ordering guards,
- leaves Product / Engine / Manager / contracts, runtime artifacts, and the release channel unchanged.

M5-C — State/Contract Process Harness:

- executes the exact shipped `plugins/usage-dashboard/latest.js` in a bounded child process without adding production exports,
- stubs only the Risuai storage, permission, and loopback fetch boundaries required for headless bootstrap,
- verifies alpha.5.43, alpha.5.44 RC, and `state-v3` hydration/persistence through the real bootstrap path,
- verifies P1 bridge modules/errors/cache semantics and foundation request/privacy/cache-zero normalization through the real initial refresh path,
- keeps bridge credentials out of harness results and fails closed on unexpected fetch targets,
- removes VM/source slicing from `foundation`, P1, P5 state compatibility, and P6 RC migration, reducing remaining production VM tests from `7` to `3`,
- leaves Product / Engine / Manager / contracts, runtime artifacts, and the release channel unchanged.

## Suggested execution sequence

### Maintenance PR 1 — workflow foundation (implemented)

- Added the reusable workflow.
- Converted the current 5.66 workflow into a small caller with publication disabled.
- Preserved the shared `repo-main-write` lock and monotonic publisher protections.
- Added one release spec and shared adapter/validator tools.
- Made no production artifact or version change.

### Maintenance PR 2 — current-release contract fixture

- Centralize the current version tuple.
- Remove version/title rewrites from historical tests.
- Keep P1–P27 GREEN.

### Maintenance PR 3 — behavioral harness (implemented candidate)

- Add process-boundary injected launcher/cache/scheduler harnesses.
- Run them beside fragile source extraction until behavior parity is proven.
- Retain narrow source-operation guards for the following adapter-removal PR.

### Maintenance PR 4 — immutable regression pipeline (implemented candidate)

- Removed remaining workflow-time mutation of historical tests.
- Required P1–P28 to run directly from committed files.
- Replaced cleanup checkout with two fail-closed test-tree integrity gates.
- Documented intentionally retained source-shape assertions as separate future work.

### Later product release — optional Engine modularization

- Bump Product and Engine only because the runtime artifact changes.
- Preserve external contracts and Manager version unless evidence requires otherwise.
- Validate on the real device before choosing additional refactors.

## Acceptance criteria for the infrastructure work

- P1–P27 pass without CI modifying historical test files.
- One shared Usage Dashboard publisher owns main materialization and release publication.
- A release-specific workflow/caller contains no copied publisher implementation.
- Product/Engine/Manager/contracts are declared once per candidate.
- Historical tests do not require current release-title prose.
- Source-operation counts do not count function declarations.
- P22 downgrade, divergence, moved-main, and moved-release protections remain GREEN.
- A docs-only or CI-only maintenance PR does not bump Product, Engine, or Manager and does not publish runtime artifacts.
- PocketRisu users still update normally with `+`.
- No Local Usage Dashboard runtime, cache, scheduling, source, or payload semantics change during the initial consolidation.

## Next gate

Merge M5-C only after the state/contract process behavior is repeatable, the direct P1–P28 suite remains GREEN, materialization and test execution leave the test tree byte-identical, remaining production VM tests are `3`, and all runtime/manifest hashes remain unchanged.

Continue with M5-D recovery process harness after M5-C. Do not combine the remaining fixture migrations with Engine modularization, Diagnostics changes, or a product release.

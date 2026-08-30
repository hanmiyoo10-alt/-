# Local Usage Dashboard — E17 Stability Envelope

Status: **IMPLEMENTED CANDIDATE — BYTE-NEUTRAL MAINTENANCE / CI PENDING**

Tracking: #968

Scope: `plugins/usage-dashboard/` release-control, regression hygiene, and documentation semantics only.

## Definition

E17 is a design/maintenance label, not a durable release generation and not a new authority layer.

The authority graph remains:

`E13 -> E14 -> E15 -> E9 -> E11 -> E16 -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

There is no `release_generation: E17`.

## Implementation

### E17-A — canonical first-write PR draft

`plugins/usage-dashboard/tools/release_pr_first_write_e17.cjs`

- derives the short display version from the canonical Product version;
- delegates body generation to E15 `renderStablePrBody()`;
- immediately validates with E15 `validateStablePrBody()`;
- deterministically returns title/base/head/body for the existing assistant PR-write boundary;
- performs no I/O and owns no writer.

This removes hand-copied locator text from the normal first-write path while keeping E15 as the canonical handoff authority.

### E17-B — guarded historical regression scope

`release_generic_preflight.cjs` now treats a stale fixed Product assertion as historical only when both are true:

1. the assertion is explicitly marked `UD_HISTORICAL_VERSION_LOCK`;
2. the same test has an early `release.productVersion !== '<exact historical version>'` applicability guard.

A lock without the matching guard fails closed as `historical-scope-missing`. A guard without the lock remains a stale current-version assertion.

No historical regression body is weakened.

### E17-C — E16 baseline-proof semantics

The E16 generated documentation status now uses `baseline proof releases/requests` rather than an apparently exhaustive `live proof` list.

The fixed 5.91/5.92 pair remains the architectural baseline. Later operational proof is owned by immutable durable-request, E16 capsule, merge/promotion, and release receipts.

`release_merge_capsule_e16.cjs` remains unchanged and authoritative for E16 capsule semantics.

### E17-D — candidate-source boundary

No candidate-source allowlist is widened.

The new E17 first-write helper, E15 helper, and E16 authority helper all remain denied as product candidate source paths by the existing E7 stage policy. Release-control maintenance must land on `main` independently of future product source intent.

### E17-E — operator projection

Deferred. No new CURRENT/STALE/SUPERSEDED projection is added because A-D remove the demonstrated 5.93 friction without requiring another surface.

## Hard boundaries

E17 adds no:

- durable generation;
- auto-merge;
- merge/promotion authority;
- workflow/state owner;
- queue/timer/poller/scheduled bot;
- PR or capsule synchronization loop;
- network documentation writer;
- Product/Plugin/Engine/Manager/bootstrap runtime change.

UNKNOWN remains UNKNOWN.

## Verification

`e17-stability-envelope-contract.cjs` locks:

- exact reuse of E15 body rendering and validation;
- locator cardinality exactly once;
- pure/local first-write helper;
- historical lock + exact guard requirement;
- E16 baseline-proof semantics with authority helper unchanged;
- candidate-source denial for release-control helpers;
- existing assistant PR-write boundary and no new merge writer.

Full Usage Dashboard registry must be GREEN before merge.

## Physical boundary

This maintenance is runtime-byte-neutral and does not require a device test by itself.

5.93 physical acceptance remains separately pending, and the next actual product version stays gated on that acceptance plus a fresh product goal and production reread.

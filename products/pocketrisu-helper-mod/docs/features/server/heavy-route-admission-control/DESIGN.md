# Feature-ID: PRH-SERVER-HEAVY-ROUTE-ADMISSION

Status: **DESIGN_NEEDED**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu Node route/body-parser audit; existing auth/session/rate-limit contract; representative large-request tests
- Priority: `P0`
- Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

`TripleHwang/RisuVault` v0.3.1 added layered resource admission for expensive authenticated routes. Relevant evidence includes:

- `34c3bee3e258ae0aa0d03513f3ccb41dcc15beba` — caps concurrent streamed uploads and attaches route-level limits before large streaming work begins.
- `077475b7b1481968f54d73ece9c2fec9f83adad4` — rate-limits authenticated heavy routes.
- `dd619f198e54bb4d98f3fcc9168643ce21991272` — moves the chat-content limiter ahead of the generic `express.json({ limit: '100mb' })` parser so rejected large requests are not materialized in memory first.
- `c83711da943df72bb100f8be8b6db4630c764f6e`, `95a8e22ff092e26f51d3e3b2106889b2a07fb14b` — extends limits to legacy/import paths and verifies route attachment.

This is transferable as a resource-safety invariant rather than as RisuVault's exact numeric limits.

## Minimal safe scope

Audit PocketRisu Node routes that can accept or trigger high-cost work and identify only the routes where rejection currently happens after body materialization, disk staging, decompression, import parsing, or another expensive step. First implementation slice, if later promoted, should change at most one route family and add tests proving admission occurs before the expensive boundary.

Do **not** change data formats, persistence semantics, Android/device settings, runit, `flushServerDbKeepalive()`, or visibility/pagehide save behavior.

## Ownership boundaries

- HTTP middleware owns cheap request admission: route identity, rate/concurrency budget, cheap header/content-length validation.
- Authentication/session checks remain authoritative for access control.
- Body parsers/import handlers own payload semantics only after admission succeeds.
- Storage/import code remains responsible for atomicity, cleanup and rollback once work is admitted.

Rate limiting is not authentication and must never substitute for it.

## Proposed mechanism

1. Inventory high-cost Node routes and order their middleware explicitly.
2. Prefer cheap bounded checks before generic large-body parsers when route semantics permit it.
3. For streamed uploads/imports, combine a bounded concurrent-work semaphore with existing byte/disk limits; always release the slot in `finally`.
4. Return a stable overload response (`429` plus bounded `Retry-After` where appropriate) without beginning staging/parsing.
5. Keep limits configurable/testable rather than copying RisuVault's numeric values blindly.
6. Do not install a broad global limiter that can accidentally throttle ordinary chat/API traffic.

## Compatibility / invariants

- Existing successful requests are byte-for-byte/semantically unchanged below the configured budgets.
- Authentication and active-session checks remain intact.
- No forced DB flush is introduced.
- `flushServerDbKeepalive()` remains no-op.
- Targeted V3 plugin reload is unaffected.
- runit remains the service manager; PM2 is not introduced.
- Server phone creates no Android notification.
- A rejected request must not leave staged files, acquired concurrency slots, partial imports, or DB mutations.

## Validation / acceptance

Before `READY_TO_PORT`:

- map PocketRisu's actual body-parser and route ordering;
- identify at least one demonstrably expensive route where admission is currently too late, or close the item as not needed;
- test N concurrent requests where N exceeds the cap and verify excess work receives `429` before staging/parsing;
- verify a released/failed/aborted request frees its concurrency slot;
- verify oversized requests are rejected before memory/disk-heavy handling when content length is authoritative;
- verify chunked/unknown-length streaming still enforces a hard streamed-byte cap inside the handler;
- verify ordinary routes and valid import flows are not throttled unexpectedly;
- compare peak RSS/temporary disk use for rejected large-request stress.

## Risk / blast radius

Contained to Node request admission, but wrong ordering or thresholds can cause availability regressions. The highest-risk mistake is placing a limiter so broadly that legitimate normal traffic is blocked, or trusting `Content-Length` as the only byte limit for streamed/chunked bodies.

## Rollback / fallback

Remove/disable the route-specific admission middleware and concurrency semaphore; no data migration or persistent rollback is required. Handler-internal hard byte/disk limits remain the final safety net.

## Dependencies / PR decomposition

1. **Audit-only:** enumerate PocketRisu heavy routes, parser ordering, existing limits, and stress fixtures.
2. **One-route contract tests:** prove desired middleware ordering without behavior change.
3. **One bounded route-family implementation:** route-specific rate/concurrency admission, LOW/MEDIUM contained risk only.
4. Expand to additional routes only with independent evidence; do not bundle unrelated server cleanup.

No autonomous source implementation is authorized from this design alone. Promote to `READY_TO_PORT` only after the PocketRisu audit resolves the dependency and validation target.
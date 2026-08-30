# MCP-LISTEN-BEFORE-SEND-BOUNDARY

Status: `ADOPTED`

## Problem / evidence

Historical PocketRisu commit `9f099bb21b6bd3e31085214320c34376c190b35a` fixed a custom MCP transport race where `send()` ran before the response listener was registered. A very fast response could therefore be emitted before the request had a listener and leave the request Promise hanging. The same path also used an async Promise executor, which can turn awaited failures into unhandled rejections rather than settling the outer Promise.

Current `hanmiyoo10-alt/PocketRisu:develop` retains the corrected ordering in `src/ts/process/mcp/mcplib.ts`.

## Minimal safe scope

Preserve the existing request-bridge invariant only:

1. establish the response listener before initiating transport send;
2. avoid async Promise executors in the bridge;
3. remove the listener once the matching response resolves.

Transport timeout, cancellation, and send-error propagation are intentionally separate design concerns.

## Ownership boundary

- Client/shared MCP request plumbing only.
- No persistence, DB, device, service-manager, Android notification, plugin reload, or server-phone behavior change.

## Mechanism

Construct the request Promise synchronously, define the matching response handler, register it, and only after registration succeeds invoke the transport's `send()`. Preserve request-ID matching and cleanup semantics.

## Compatibility / invariants

- A response emitted immediately after `send()` must still be observed.
- Only the matching JSON-RPC request ID resolves the request.
- Matching listener cleanup remains bounded.
- Do not reintroduce an `async` Promise constructor callback.
- Do not weaken PocketRisu save/integrity, targeted V3 reload, runit, server-phone notification, or DB-flush guardrails.

## Validation / acceptance

A focused regression test should use a fake custom transport whose `send()` emits the response synchronously or in the same microtask. Acceptance requires the request to resolve consistently and listener registration to precede send. If send-error behavior is later redesigned, add explicit rejection/timeout assertions and ensure no unhandled rejection occurs.

## Risk / blast radius

Low. The invariant is localized to custom MCP transport request ordering. The primary regression risk is reversing the order during a refactor or adding broader error handling that accidentally removes listener cleanup.

## Rollback / fallback

No new implementation is proposed: this is preservation documentation for already-adopted behavior. If a future refactor regresses it, restore listener-before-send ordering and the non-async executor pattern.

## Dependencies / PR decomposition

Dependencies: `NONE` for preservation. No autonomous implementation PR is required because the invariant is already present. Any future timeout/error-propagation work should be a separate Feature-ID and PR.

## Durable references

- Source: `PocketRisu/PocketRisu@9f099bb21b6bd3e31085214320c34376c190b35a`
- Registry review: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch` → `notes/backfill-reviews/2026-08-30-1845-pocketrisu-mcp-listen-before-send.md`
- Ledger addendum: `notes/idea-ledger-addenda/2026-08-30-1845.md`

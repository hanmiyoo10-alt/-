# ASSET-MANIFEST-RENDER-PATH-LOCAL-FIRST

## Problem / evidence

`PocketRisu/PocketRisu@f39114932c383da430c5d58d4a83366d107dbd98` fixed a v1.11 regression where message first paint could wait for remote asset-manifest name resolution and manifest paging. Over remote links, render latency could balloon until network round trips completed.

## Minimal safe scope

Preserve the already-adopted local-first invariant: when referenced immutable/content-addressed manifests are prefetched, resolve render-critical asset names locally. Keep the server resolver as cold-cache fallback. Do not expand this dossier into unrelated asset-cache redesign.

## Ownership boundaries

- Client parser/render path owns consuming cached manifest metadata without blocking on avoidable network calls.
- Background prefetch owns warming the bounded cache and must not become foreground render authority.
- Server resolver remains fallback authority when required metadata is absent locally.
- Asset-name matching semantics remain shared invariants: exact-before-fuzzy and owner priority must match between local and server paths.

## Mechanism

- Prefetch manifests at chat entry and opportunistically after a cold resolve.
- Coalesce overlapping fetches by manifest id and mutable descriptor identity.
- Resolve locally only when all required manifests are available; otherwise fall back to the server.
- Keep cache size bounded.

## Compatibility / invariants

- Warm-cache parse must not require a manifest-name round trip.
- Cold-cache parse must still resolve correctly.
- Local matching must preserve server matching semantics.
- Prefetch failures must degrade to fallback, not blank content.
- Do not alter PocketRisu save/integrity behavior, V3 targeted reload, runit, server-phone notification policy, or lifecycle-flush guardrails.

## Validation / acceptance

- Local/server resolver parity tests for exact, fuzzy, and owner-priority cases.
- Warm-cache network assertion: no manifest-name request on message parse.
- Cold-cache fallback test.
- Duplicate-prefetch suppression test for overlapping chat-entry and parser triggers.
- First-paint comparison under constrained latency.
- Cache remains bounded under many modules/manifests.

## Risk / blast radius

MEDIUM. Incorrect resolver parity can show wrong assets; unbounded prefetch/cache behavior can increase memory or network load. Blast radius is contained to asset lookup/render behavior and can be reverted independently.

## Rollback / fallback

Revert local-first prefetch/resolution to the prior server route while retaining correctness tests; the server path is intentionally preserved as fallback. If local parity is suspect, fail to server resolution rather than guess.

## Dependencies

NONE for preserving the current invariant.

## PR decomposition

Historical/adopted invariant only; no new PR required. Any future changes should keep one concern per PR: (1) resolver semantics, (2) prefetch/coalescing, or (3) cache-bound tuning, with focused validation for each.

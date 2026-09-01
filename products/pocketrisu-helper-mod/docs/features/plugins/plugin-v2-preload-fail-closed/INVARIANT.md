# PLUGIN-V2-PRELOAD-FAIL-CLOSED

## Status

`ADOPTED` invariant derived from official PocketRisu behavior.

## Problem / evidence

Official `PocketRisu/PocketRisu@0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32` fixes a destructive failure mode in V2 plugin startup. V2 storage reads are synchronous and therefore require the server-backed plugin store to be completely preloaded. If preload fails and V2 still starts, reads return `null`; plugins may then write defaults and overwrite real durable values on the server.

## Invariant

A compatibility consumer that requires a complete snapshot must not start when that snapshot is unavailable or incomplete. Missing preload is an availability failure, not authoritative empty state.

Failure containment must be dependency-scoped: tear down/disable the affected V2 runtime while allowing unrelated V3 plugins to load when their own storage contract remains valid.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

## Compatibility / acceptance

Acceptance requires that a forced V2 preload failure leaves no V2 plugin code running, unloads prior V2 runtime state, performs no default-value write caused by empty reads, surfaces an actionable failure, and still permits V3 loading. A later successful load may restore V2 normally.

## Risk / rollback

The main regression risks are fail-open startup, retry storms, or broad failure coupling that disables V3 unnecessarily. Rollback for future refactors is to restore the known fail-closed V2 admission boundary rather than treating an empty compatibility cache as authoritative.

## PocketRisu guardrails

This invariant does not alter DB lifecycle flushing, `flushServerDbKeepalive()`, save/integrity optimizations, targeted V3 reload behavior, runit, system packages, or Android notification behavior.
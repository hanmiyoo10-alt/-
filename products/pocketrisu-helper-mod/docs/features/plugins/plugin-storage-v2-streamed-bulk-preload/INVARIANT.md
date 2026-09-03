# Feature-ID: PLUGIN-STORAGE-V2-STREAMED-BULK-PRELOAD

Status: `ADOPTED`

## Problem / evidence

Legacy V2/V2.1 plugin APIs are synchronous and require all plugin-storage values in the browser cache before plugin execution. `PocketRisu/PocketRisu@ee482f74524efdb0fb9eae26dfcdd0dcab01d65e` records a concrete v1.11.0 failure mode where thousands of per-key remote GETs stretched plugin loading to minutes.

## Invariant

When a synchronous legacy API genuinely requires full plugin-storage preload, avoid N-round-trip amplification. Fetch the set through one authenticated streaming response, ingest rows incrementally, and do not materialize the complete store as one server-side object solely for transport.

Local pending writes and removals are newer session authority and must win over streamed snapshot rows. A failed or unsupported bulk stream must fall back to the compatible per-key path rather than leaving preload falsely complete. Disconnect/backpressure handling must not leave the server hung.

## Compatibility boundaries

- This is a legacy V2/V2.1 compatibility optimization, not permission to eagerly hydrate V3 or otherwise lazy storage domains.
- Existing authentication and storage isolation remain unchanged.
- Corrupt-row quarantine/recovery semantics remain separate and must continue to work.
- No PocketRisu save/visibility/pagehide guardrail is changed.

## Validation / acceptance

- successful preload uses one bulk request and zero per-key value reads;
- local pending writes/removals override streamed rows;
- endpoint or mid-stream failure has a safe per-key fallback and cannot mark an incomplete cache as fully preloaded;
- server iteration remains row-streamed and bounded-memory;
- client disconnect releases stream/backpressure waits;
- existing plugin-storage corruption and persistence tests remain green.

## Risk / blast radius

`MEDIUM`: startup/read-path behavior crosses client/server storage boundaries, but rollback is straightforward because the per-key compatibility path remains available.

## Rollback / fallback

Disable/remove the bulk preload path and use the existing index + per-key reads. No storage-format migration is involved.

## Source / history

- introduction: `PocketRisu/PocketRisu@ee482f74524efdb0fb9eae26dfcdd0dcab01d65e`
- streaming coverage: `b49cb05181e0cedffaa9e27947376263620afdc2`
- disconnect/backpressure hardening: `b69fafa9dd11a9b355edf0f058ecc458209336a5`
- lifecycle: `ADOPTED`; preserve while synchronous legacy plugin support remains.
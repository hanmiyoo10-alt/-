# SELECTION-PATH-BOUNDED-HYDRATION — design draft

Status: `DESIGN_NEEDED`

## Problem / evidence

Historical Haejeok evidence (`nevaeh5379/HaejeokRisuai@9a946c4dc64a485c2a326bdb535d1eb2076c8df0`) shows character/chat selection latency can grow when an interactive switch hydrates relational chat details and message state that is not needed for first paint. Haejeok separates selection-specific summary hydration from full entity loads and batches related reads into one worker round trip.

PocketRisu has not yet been measured to prove the same bottleneck, so the design begins with inspection/profiling rather than implementation.

## Minimal safe scope

If direct evidence confirms over-hydration, introduce one bounded selection read path for one character/chat switch surface only. It may return explicitly marked summaries plus the newest message window required for first paint. Do not alter backup/export/full-load semantics in the first slice.

## Ownership boundaries

- UI/selection controller owns which fields are required before first paint.
- Storage adapter owns summary/full read distinction and backend parity.
- Full entity callers (backup/export/plugin or migration paths) retain complete hydration authority.
- Message paging owns bounded newest-message windows; it must not infer deletion or completeness from omission.

## Mechanism

1. Instrument current selection to count storage reads/RPCs, bytes/rows hydrated, and first-paint latency.
2. Define a typed summary/full-loaded-state contract rather than using structurally ambiguous partial entities.
3. Add a selection-specific loader only if measurements justify it.
4. Batch independent reads where the backend can preserve ordering/error semantics.
5. Hydrate relational chat details and older messages only when the selected chat or an explicit full-load caller requires them.

## Compatibility / invariants

- A summary must never be accepted where complete data is required.
- Backup/export and migration callers remain complete.
- No omitted field may be interpreted as destructive deletion.
- Existing save/revision/integrity semantics remain unchanged.
- Preserve PocketRisu guardrails: no visibility/pagehide forced DB flush, `flushServerDbKeepalive()` stays no-op, targeted V3 plugin reload remains targeted, runit remains the service manager, and server phone creates no Android notifications.

## Validation / acceptance

Before implementation: measure current character/chat switch latency, number of storage/RPC round trips, hydrated relational rows, and structured-clone payload size on representative long-chat characters.

For an implementation slice, require:
- regression test proving selection summaries exclude non-required relational detail;
- regression test proving full-load callers still receive complete entities;
- bounded newest-message hydration test with stable message identity/order;
- backend parity or explicit unsupported-backend fallback;
- first-paint latency/read-count improvement without save/export behavior change.

## Risk / blast radius

Risk is `MEDIUM`: incomplete objects can leak into callers that assume full entities, causing missing metadata or delayed compatibility bugs. Contain by explicit types/loaded-state, one surface at a time, and unchanged full-load fallback.

## Rollback / fallback

Remove the selection-specific path and route all callers back through the existing full loader. Do not migrate stored data in this feature, so rollback is code-only.

## Dependencies

- PocketRisu character/chat selection-path hydration inventory
- first-paint required-field contract
- backup/export/full-load caller audit
- storage/backend parity check

## PR decomposition

1. Measurement/test-only PR: trace current selection reads and codify full-load invariants.
2. First isolated implementation PR: one selection surface with explicit summary contract and fallback.
3. Optional batching/backend parity PR only after behavior is proven equivalent.

Do not move to `READY_TO_PORT` until direct PocketRisu measurements demonstrate an over-hydration cost and all complete-data callers are explicitly identified.

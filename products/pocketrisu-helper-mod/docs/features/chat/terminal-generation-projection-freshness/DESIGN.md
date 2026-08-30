# TERMINAL-GENERATION-PROJECTION-FRESHNESS

Status: assistant-owned design draft
Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

Historical PocketRisu-Kei commits `0a1ee5e5e3bf115689e84058a755c7739eb493d1` and `13ee995884513597adfdf26086ef3465a514e909` show a concrete cancellation race in a detached/server-owned generation pipeline. A live/client projection could lag the durable generation journal, and cancellation could either restore an older local reroll branch or terminally materialize an incomplete checkpoint. The later fix refreshes the projection from the authoritative journal when its recorded journal extent is stale.

Evidence is external and code-level (`MEDIUM`), not a reproduced PocketRisu bug. Current PocketRisu search did not find an equivalent journal/projection/materializer owner.

## Minimal safe scope

Do not port Revenant or introduce a new server generation architecture for this feature. If PocketRisu gains a durable async generation log or resumable detached generation owner, the first slice is only:

1. define an authoritative monotonic evidence identity/extent;
2. define a pure `isProjectionCurrent(projection, evidenceIdentity)` predicate;
3. require terminal publication to refresh/rebuild a stale projection before canonical commit;
4. add deterministic regression tests.

No persistence migration or device/runtime change belongs in this feature.

## Ownership boundaries

- Authoritative owner: durable async generation evidence (journal/event log/versioned stream), if one exists.
- Derived owner: UI/server projection used for display or materialization.
- Terminal owner: the single boundary allowed to publish canonical chat state.
- Local UI owner: may render provisional state but must not overwrite a server-owned terminal result after ownership transfer.

Ownership transfer must be explicit. Merely receiving a cancellation signal does not transfer canonical ownership back to the UI.

## Mechanism

Use a monotonic identity tied to the authoritative evidence. PocketRisu-Kei uses journal byte length; PocketRisu should choose the narrowest identity that proves the projection was derived from the exact evidence prefix being published (for example append sequence, durable revision, or offset plus generation/workflow identity).

At terminal materialization:

1. read the current authoritative evidence identity;
2. compare with the projection's recorded identity;
3. if stale or from the wrong workflow/source, rebuild projection from authoritative evidence;
4. atomically/serially publish the canonical result once;
5. make duplicate terminal attempts idempotent.

Do not trust existence of a projection as proof of freshness.

## Compatibility / invariants

- Cancellation must never resurrect an older message branch after newer authoritative generation evidence exists.
- A stale provisional projection must never become canonical.
- Terminal materialization is exactly-once or idempotently repeatable.
- Malformed/incomplete journal tails must not silently erase already valid projected content.
- Generation/workflow identity must prevent cross-generation projection reuse.
- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Preserve current save/integrity optimizations and targeted V3 plugin reload.
- Keep runit; never introduce PM2.
- Server phone creates no Android notifications.

## Validation / acceptance

Required before `READY_TO_PORT`:

- PocketRisu has a matching durable async generation owner and explicit terminal publication boundary.
- Test: projection at revision N, journal/evidence advances to N+1, terminal commit publishes N+1 content.
- Test: cancellation after ownership transfer does not restore pre-generation/reroll state while canonical publication is pending.
- Test: duplicate terminal publication attempts are idempotent.
- Test: projection from another workflow/generation is rejected.
- Test: malformed tail preserves the newest safely decodable prefix according to the owner's existing error semantics.
- Test: no changes to normal non-detached generation behavior.

Acceptance requires no stale-canonical publish in the matrix above and no regression of existing save/flush behavior.

## Risk / blast radius

`MEDIUM`. Wrong ownership or freshness comparison could lose generated text, duplicate swipes, or restore stale chat state. Blast radius is contained if the change remains inside one generation owner and uses a pure freshness predicate plus a single terminal materializer.

## Rollback / fallback

The implementation slice must be one isolated Feature-ID branch/PR. Revert the freshness guard and its owner integration together. Do not add schema migrations. If refresh fails, fall back to the owner's existing explicit failure/recovery path rather than publishing a projection whose freshness is unknown.

## Dependencies

- matching PocketRisu async generation/recovery owner;
- authoritative monotonic journal/version identity;
- single terminal materialization boundary;
- deterministic cancellation and stale-checkpoint fixtures.

These dependencies are currently unresolved, so lifecycle remains `DESIGN_NEEDED`.

## PR decomposition

1. **Contract/tests only** — establish generation identity, evidence identity, pure freshness predicate, and failing stale-projection fixtures.
2. **Terminal owner integration** — refresh stale projection immediately before canonical publication in exactly one owner.
3. Only if measurement shows need: optimize re-projection/read cost without weakening freshness semantics.

No server/runtime migration, destructive recovery, storage-format migration, or unrelated cleanup is allowed in these slices.

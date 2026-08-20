# BaseCore Product Root

BaseCore is an independent Narrative-only plugin derived from the proven SimCore default Narrative/A behavior.

## Product identity

- Runtime source: `plugins/basecore/`
- Product state: `products/basecore/`
- Release channel: `release-basecore`
- Initial donor baseline: SimCore `v0.63.56` from `release-simcore`
- First BaseCore version: `v0.1.0`

## Isolation contract

BaseCore is a sibling product, not a SimCore submodule.

- No import or runtime dependency on SimCore.
- No read/write of `sim:core:*`, `$simcore_core_*`, or `<SIMCORE_CORE_SWITCH>`.
- BaseCore owns `basecore:state:*`, `$basecore_state`, and `<BASECORE_SWITCH>`.
- BaseCore may use SimCore only as historical donor/reference material during the initial fork.
- After the BaseCore baseline is established, BaseCore's own repository records are its source of truth.
- SimCore updates do not automatically change BaseCore.
- BaseCore updates do not automatically change SimCore.

## Scope

BaseCore keeps the Narrative foundations that made SimCore useful in long chats:

- deterministic narrative time continuity
- world-year and Korean-age synchronization
- Volume / Chapter / Chatindex continuity
- protagonist and conditional-secondary authority
- recurrence guard for repeated detailed request templates
- canonical response-envelope and Knowledge integrity checks
- snapshot persistence, visible-history bootstrap, edit recovery, reload-safe hooks, and deferred state mirror

BaseCore intentionally does not implement:

- Mode routing
- Broadcast / B_START / B_CONTINUE / B_END
- Mode C
- COMMUNITY
- exposure tracking
- reaction normalization
- lineage / source handoff / evidence fencing

## Development memory automation

- AI/session entrypoint: `products/basecore/AI_INSTRUCTIONS.md`
- Durable development memory: `products/basecore/CURRENT_DEVELOPMENT.md`
- Durable guidelines: `products/basecore/GUIDELINES.md`
- Release-memory sync: `scripts/basecore-sync-memory.py`
- Release promotion workflow: `.github/workflows/basecore-release-command.yml`
- Release state sync workflow: `.github/workflows/basecore-release-state-sync.yml`

BaseCore release automation writes only BaseCore-owned product memory on `main`; it never synchronizes into SimCore memory.

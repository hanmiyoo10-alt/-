# Official upstream PR — db-save-optimization

Feature-ID: `db-save-optimization`
Series: `DB save optimization`

## Stage A — empty patch fast path + opaque patch ETag
- Official PR: `https://github.com/PocketRisu/PocketRisu/pull/67`
- Target: `PocketRisu/PocketRisu:develop`
- Source: `hanmiyoo10-alt/PocketRisu:feat/db-save-optimization-opaque-etag`
- Submitted head: `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`
- State at record time: `OPEN / MERGEABLE / NOT_DRAFT`
- Scope: one commit, one changed file (`server/node/server.cjs`), +23/-2.
- Review comments at record time: none.
- CI/checks at record time: no relevant run/status observed; absence of checks is not GREEN.

Stage A preserves the current revision for empty patches and skips clone/apply/save work for them. Accepted non-empty database patches mint an opaque revision token instead of re-encoding and MD5-hashing the entire stripped database solely to produce the next ETag.

## Dependent local stages
These are intentionally not submitted upstream until their prerequisite is accepted/rebased.

- Stage B — compositional DB patch hash cache: local draft PR `hanmiyoo10-alt/PocketRisu#5`.
- Stage C — top-level selective clone: local draft PR `hanmiyoo10-alt/PocketRisu#6`.
- Stage D — `pluginCustomStorage` direct-child hash/clone optimization: validation branch only while tests run.
- Stage E — depth-3 lazy subchild optimization: not started in the clean upstream series yet.

## Rule
After every official upstream result, re-read current `develop` before promoting the next stage. If upstream independently implements a stage or the code boundary changes materially, skip/rebuild that stage rather than forcing the legacy implementation onto the new architecture.

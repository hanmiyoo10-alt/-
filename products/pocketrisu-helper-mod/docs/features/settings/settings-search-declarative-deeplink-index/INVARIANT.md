# SETTINGS-SEARCH-DECLARATIVE-DEEPLINK-INDEX

Status: `ADOPTED`

Source evidence: `PocketRisu/PocketRisu@1aac7c30537fb699ef2f60b6b9d8e3c3424d212a`

## Problem / evidence

A large settings surface needs cross-page discovery, but a search layer can easily become a second settings architecture: duplicated visibility rules, duplicated navigation semantics, and stale hand-maintained metadata can make search results point to settings users cannot actually reach.

PocketRisu's adopted implementation demonstrates a safer split. Declarative setting arrays can be indexed directly; hardcoded pages/sub-tabs can use a small explicit manifest. Runtime visibility stays authoritative in the original predicates, and result activation reuses existing settings navigation rather than inventing another routing state machine.

## Minimal safe scope

- Treat search metadata as descriptors, not authoritative settings state.
- Derive entries from declarative setting definitions where possible.
- Use explicit manifest entries only for hardcoded pages/sections that cannot be derived safely.
- Evaluate visibility at query/use time.
- Navigate through the normal settings route boundary.
- Promote local tab state into explicit shared state only when a deep link genuinely requires external ownership.
- Use stable anchors for scroll/highlight behavior and tolerate missing anchors safely.
- Keep ranking deterministic and result count bounded.

## Ownership boundaries

- Settings pages remain owners of setting behavior and visibility.
- Existing settings route/opening functions remain owners of page navigation.
- Sub-tab stores own externally addressable tab selection where required.
- Search owns indexing, ranking, descriptor lookup, and result activation orchestration only.

## Mechanism

1. Build lightweight descriptors from declarative `SettingItem` metadata and a narrowly maintained manifest for hardcoded sections.
2. At query time, evaluate each entry's current visibility before including it.
3. Match current-locale and English fallback labels/help plus explicit keywords.
4. Rank label matches above keyword matches above help matches and cap the result list.
5. On activation, use the normal settings opener/route, set the target sub-tab if needed, then resolve a stable anchor and scroll/highlight it.

## Compatibility / invariants

- Search must not bypass existing settings guards, side effects, or route semantics.
- Hidden or unreachable settings must not be exposed merely because stale index metadata exists.
- Manual manifest entries must be treated as pointers into the authoritative UI, not copied definitions of behavior.
- Missing anchors must degrade to ordinary page navigation rather than a broken/trapped state.
- Search metadata must remain bounded and cheap enough not to become a mobile startup/render regression.
- PocketRisu persistence, plugin reload, runit, notification, and save-integrity guardrails are unaffected by this invariant.

## Validation / acceptance

- Conditional items appear/disappear with their live visibility predicate without requiring app restart.
- Every result opens through the established settings route.
- Deep links select the correct sub-tab before anchor resolution.
- Missing/stale anchors do not block the user from reaching the target page.
- Ranking is deterministic and bounded (`label > keyword > help`).
- Current locale and English fallback both work where expected.
- Manifest/anchor tests fail when a hardcoded section is removed or renamed without metadata maintenance.

## Risk / blast radius

Risk: `LOW`. The feature is UI-local and easy to disable/revert, but stale metadata can create confusing navigation. Keeping runtime authority in existing settings ownership contains the blast radius.

## Rollback / fallback

Disable or remove the search entry point/index while leaving existing settings pages and routes untouched. No persistence migration or data rollback is required.

## Dependencies

`NONE`.

## PR decomposition

Already adopted upstream. For future changes, keep one settings-search maintenance slice per PR: descriptor/index change, routing/deep-link change, or manifest/anchor maintenance. Do not mix unrelated settings cleanup.

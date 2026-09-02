# SORTABLE-FILTERED-CONTROLS-REMAIN-INTERACTIVE

## Status

`ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@dd07f4d10c3d11b5194f58246246ba04ef2903dd`
- current official `develop` retains `filter: '.no-sort'` with `preventOnFilter: false` in shared `sortableOptions`.

## Problem

SortableJS's filtered-region behavior can call `preventDefault()` on pointer-down. PocketRisu uses `.no-sort` around real interactive controls such as plugin argument inputs and the plugin toggle. Treating drag exclusion as permission to cancel default control events blocked mouse focus and could cancel the synthetic click on iOS.

## Invariant

A drag/filter exclusion marker owns only sorting/drag eligibility. It must not implicitly take ownership of native input, focus, toggle, click, or touch behavior inside that excluded region.

For PocketRisu's shared SortableJS options, `.no-sort` must remain excluded from sorting while filtered children retain normal default interaction behavior. If a future sortable surface requires event suppression, scope it to that surface rather than weakening the shared invariant.

## Ownership boundaries

- SortableJS/shared sortable options: drag eligibility and move acceptance.
- Native/Svelte controls inside `.no-sort`: focus, input, click/toggle and touch interaction.
- Plugin persistence/runtime: outside this Feature-ID; this invariant only ensures the control can be operated.

## Compatibility / guardrails

- Do not make `.no-sort` into a drag handle.
- Do not globally restore `preventOnFilter` behavior that cancels embedded controls.
- Preserve keyboard/mouse/touch accessibility semantics.
- No effect on DB flush behavior, `flushServerDbKeepalive()`, V3 targeted reload, runit, server-phone notifications, or other PocketRisu system guardrails.

## Validation / acceptance

A focused regression check should establish all of the following:

1. Mouse/pointer activation can focus an input inside `.no-sort`.
2. A plugin toggle/control inside `.no-sort` can activate normally.
3. Starting interaction on `.no-sort` does not initiate sorting/dragging.
4. Touch/iOS click synthesis is not cancelled by the Sortable filter path where practical to exercise.
5. Drags from legitimate sortable handles continue to work.

## Risk / blast radius

`LOW`. The contract is localized to shared sortable event ownership, but regressions can make plugin controls appear mysteriously unresponsive on specific input modalities.

## Rollback / fallback

If a future SortableJS version changes semantics, preserve the behavioral invariant even if the exact option changes. Prefer a narrowly scoped adapter or per-surface override over globally cancelling filtered-element events.

## Dependencies

`NONE`.

## PR history

No autonomous implementation PR: official PocketRisu already contains and currently preserves the fix. Durable historical review and idea-ledger references live on `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch` under the 2026-09-02 19:32 KST addenda/review files.

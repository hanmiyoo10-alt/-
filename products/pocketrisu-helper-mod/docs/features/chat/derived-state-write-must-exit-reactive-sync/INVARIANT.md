# DERIVED-STATE-WRITE-MUST-EXIT-REACTIVE-SYNC

Status: `ADOPTED`
Source: `PocketRisu/PocketRisu@a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`

## Problem / evidence

`ChatBody.svelte` launches translation work from a reactive/derived synchronization path. Mutating the bound `translating` state while execution is still inside the synchronous `$derived` section can violate Svelte's mutation rules and trigger `state_unsafe_mutation`. Official PocketRisu fixed this by crossing a minimal async boundary before the state write.

## Minimal safe scope

Only separate the mutable state write from the synchronous derived evaluation. Do not redesign the translation request, spinner policy, failure behavior, or persistence path.

## Ownership boundaries

- the derived/reactive section may compute or schedule work;
- the translation flight owns its own mutable `translating` state only after derived synchronous evaluation has yielded;
- existing stale-flight/finalization logic remains authoritative for whether later async results may modify rendered state.

## Mechanism

Establish the smallest post-derivation async boundary before setting bound mutable state. In the adopted implementation this is `await Promise.resolve()` immediately before `translating = true`, explicitly exiting the synchronous derived section without introducing a timer-scale delay.

## Compatibility / invariants

- no mutable bound-state write may occur while Svelte still considers execution part of the derived synchronous section;
- the boundary must not create a new long-lived task, timer, or unowned callback;
- translation request ordering, stale-flight rejection, loading-state restoration, and finalization semantics stay unchanged;
- preserve all PocketRisu save/integrity, targeted V3 reload, runit, server-phone, and no-forced-flush guardrails.

## Validation / acceptance

Exercise the derived-triggered translation path and assert no `state_unsafe_mutation`. Confirm `translating` becomes true before downstream observable logic requires it, then returns to the correct terminal state on success/failure. Retain tests for stale-flight protection and `TRANSLATION-LOADING-STATE-RESTORES-RENDERED-TEXT` so the reactive boundary cannot regress rendered-content ownership.

## Risk / blast radius

`LOW`. The change is a localized reactive-phase boundary. The main risk is accidentally broadening the defer into an ordering change that lets stale work win.

## Rollback / fallback

Revert the localized post-derivation boundary if the surrounding reactive architecture changes to make the write legal synchronously. No persistent data or migration is involved.

## Dependencies

`NONE`.

## PR decomposition

No autonomous port PR is required because official PocketRisu already adopted the fix. Future reactive refactors should preserve this dossier as an acceptance boundary rather than copying the exact microtask mechanism blindly.

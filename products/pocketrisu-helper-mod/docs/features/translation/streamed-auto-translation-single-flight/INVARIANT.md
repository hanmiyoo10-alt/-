# STREAMED-AUTO-TRANSLATION-SINGLE-FLIGHT

## Status

`ADOPTED` invariant observed in official PocketRisu.

## Problem / evidence

Streaming message reparses can occur much faster than a translation request completes. Official PocketRisu commit `a876e542882cb992b34721e057ea4a8de53d1ef2` fixed a bug where every streaming chunk re-entered the whole auto-translation pipeline, creating duplicate translator calls, repeatedly toggling translation state, and allowing early-return/finally cleanup to erase `lastParsed` so the fallback alternated between blank and content.

The adopted implementation keeps one translation flight active per message component, coalesces concurrent reparses to the latest pending snapshot, preserves a stronger explicit retranslate request, spans the translating flag across the entire flight, and refuses to replace rendered content with an empty translation result. The same single-flight path remains on `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.

## Invariant

An expensive streamed auto-translation pipeline MUST have at most one active flight for the same logical message target. Reparses arriving during that flight MUST not start parallel translator calls; obsolete intermediate snapshots SHOULD be coalesced so the newest relevant snapshot is processed next.

Failure, empty results, or loading placeholders MUST NOT erase the last renderable output. Completion from an obsolete logical target MUST NOT publish over a newer chat/character/message state.

## Ownership boundary

- streaming reparsing owns detection of new source snapshots;
- the translation-flight state machine owns serialization/coalescing of expensive translation work;
- request identity owns whether two snapshots refer to the same logical translation target;
- result publication owns the last-good render and stale-result rejection;
- provider retry/fallback policy is separate authority and must not create extra concurrent translation flights.

## Compatibility / acceptance

Preserve these checks:

1. rapid streaming reparses create at most one active translator call for the same target;
2. while a flight is active, only the newest relevant pending snapshot needs a subsequent translation;
3. explicit retranslate intent is not weakened by dedupe;
4. empty translation results do not replace an existing renderable result;
5. exceptions/finally cleanup restore a stable last-good render and clear translating state exactly once;
6. a loading placeholder appears only when there is no renderable fallback and does not flicker per chunk;
7. chat/character/message target changes cannot publish stale completions into the new target;
8. legacy translation and pre/post-HTML formatting modes retain their expected semantics.

## Risk / rollback

Risk is medium because concurrency/result-publication mistakes can show stale content or suppress needed translation work. If the single-flight implementation misbehaves, roll back the concurrency change rather than weakening target identity or allowing parallel flights. Preserve the last-good-output rule during rollback and avoid any fix that merely hides flicker while still issuing duplicate requests.

## Source

- `PocketRisu/PocketRisu@a876e542882cb992b34721e057ea4a8de53d1ef2`
- preserved on `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`

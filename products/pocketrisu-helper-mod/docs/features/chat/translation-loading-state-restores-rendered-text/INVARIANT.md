# TRANSLATION-LOADING-STATE-RESTORES-RENDERED-TEXT

Status: `ADOPTED`
Source: `PocketRisu/PocketRisu@8daaa3695b7602d8947431d4447781d24b1e5604`

## Problem / evidence

Translation rendering uses a temporary loading sentinel. A previous anti-flicker change limited that sentinel to empty first-paint slots during streaming, which unintentionally suppressed expected loading feedback for manual re-translate and non-streaming translation. A failed translation could also leave the sentinel itself rendered indefinitely.

## Minimal safe scope

Treat the spinner as temporary UI state, not durable message content. Permit it when the current slot has no renderable result, for an explicit re-translate request, or outside active generation. When the translation flight ends and the spinner still owns the slot, restore the best valid final result or the pre-flight fallback.

## Ownership boundaries

- `ChatBody.svelte` owns the rendered translation slot and temporary spinner sentinel.
- generation state decides whether streaming anti-flicker constraints apply.
- the translation flight owns only its own temporary state; it must not claim durable authority over newer unrelated rendering.

## Mechanism

Gate spinner replacement by both renderability and request/runtime state instead of a single `hasRenderableResult` check. In finalization, detect whether the spinner still occupies the slot and replace it with the best renderable result or fallback before clearing the flight state.

## Compatibility / invariants

- Do not reintroduce per-chunk spinner flicker during active generation.
- Manual re-translate and non-streaming translation may show loading when configured.
- Failure must not strand a loading sentinel as rendered content.
- Preserve current PocketRisu save/integrity, targeted V3 reload, runit, and server-phone guardrails; this feature is UI-local and requires no system update.

## Validation / acceptance

Accept only if focused regression coverage demonstrates: streaming first-paint behavior remains flicker-safe; manual re-translate shows loading; non-streaming translation shows loading; a failed flight restores an existing renderable result; and a failed flight without one restores the fallback. Also verify an older async flight cannot overwrite a newer rendered result.

## Risk / blast radius

`LOW`. The change is localized to translation display state. Main regressions would be spinner flicker or stale-flight UI overwrite, both easily reversible.

## Rollback / fallback

Revert the localized `ChatBody.svelte` state-gating/finalization change. No persistent data or migration is involved.

## Dependencies

`NONE`.

## PR decomposition

No autonomous port PR is required: the invariant is already adopted in official PocketRisu commit `8daaa3695b7602d8947431d4447781d24b1e5604`. Future refactors touching translation rendering should preserve this dossier as an acceptance boundary.

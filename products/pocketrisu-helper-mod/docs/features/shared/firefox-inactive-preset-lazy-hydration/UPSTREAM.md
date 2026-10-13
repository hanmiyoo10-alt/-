# Upstream PR dossier — firefox-inactive-preset-lazy-hydration

Feature-ID: `firefox-inactive-preset-lazy-hydration`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `DESIGNING`
Deployment status: `NONE`

## Problem / motivation
Android LMKD can reclaim the PocketRisu Firefox content process even when the active chat is small. Current evidence points to globally retained client state, especially all prompt presets, as a major persistent payload.

## Minimal scope
Keep only the active prompt preset fully hydrated in the client runtime. Represent inactive prompt presets as safe metadata stubs and hydrate them on demand before any operation that needs full content.

## Dependencies
- stable botPreset IDs.
- `botPresetsId` active selection.
- server-side authoritative full DB.
- existing storage/auth/read paths.

## Explicitly out of scope
- plugins/modules lazy loading.
- chat dehydrate threshold changes.
- DB schema change.
- forced reload.
- official upstream submission unless explicitly requested by the user.

## Evidence
Current v1.14 save:
- 99 bot presets.
- all presets JSON: ~24.58MB.
- active preset: ~467KB.
- inactive presets: ~24.11MB.
- active-full + inactive-metadata-stub estimate: ~629KB.

Natural LMKD recurrence at 17:24:
- active chat: 84 messages.
- reclaimed Gecko tab: RSS ~470.6MB.
- reason: `low watermark is breached or filecache is low`.

## Review state
Design only. No source branch or PR candidate yet.

## Next action
Map every operation that assumes `db.botPresets[i]` is fully hydrated and define a single fail-closed hydration owner before implementation.

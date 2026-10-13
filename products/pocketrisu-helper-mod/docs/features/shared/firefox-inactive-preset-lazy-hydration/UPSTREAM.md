# Upstream PR dossier — firefox-inactive-preset-lazy-hydration

Feature-ID: `firefox-inactive-preset-lazy-hydration`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN_LOCAL_COMMIT`
Deployment status: `STATIC_GREEN / LIVE_VERIFY_PENDING`

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


## Local candidate
- branch: `feat/firefox-inactive-preset-lazy-hydration`
- commit: `d6a68402558949a0fd550e6e7beb5f86a8ee65d8`
- base: current v1.14 live overlay `fef7d4b0888c6a9280e50335bcca4ad6c943ca33`.
- 17 tracked files in one Feature-ID.
- server authoritative full-preset side-store + inactive client stubs + on-demand hydration.
- no DB schema change.

Validation:
- targeted preset tests: 29 total PASS (7 server helper + 6 client hydration + 3 NodeStorage + 13 existing ID/reorder).
- real server preset integration: 4/4 PASS.
- full server suite: 158/158 PASS.
- svelte-check: 0 errors / 4 existing warnings.
- production build: PASS.
- compatibility: 125/125 PASS, 5 skipped.
- exact-base control reproduces all remaining broad-client-suite REDs; no feature-attributable failure identified.

PR boundary:
- fork-only by default: `hanmiyoo10-alt/PocketRisu`.
- no PR until live memory/persistence A/B completes.
- official `PocketRisu/PocketRisu` submission remains unauthorized unless explicitly requested by the user.

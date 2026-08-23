# Official upstream PR — plugin-targeted-reload

Feature-ID: `plugin-targeted-reload`

## Official PR
- Repository: `PocketRisu/PocketRisu`
- PR: `#62` — `fix: reload updated V3 plugins in isolation`
- Result: `UPSTREAM_REIMPLEMENTED`
- PR state: closed without direct merge on `2026-08-23T11:11:10Z`
- Source head: `56b80a8289a9b470bce682552f25dae7afb5e1a4`
- Upstream reimplementation commit: `a55c4eef01b716d17a414348b3bf387fbcd4c9b4`
- Maintainer said it would ship with `v1.11.0`.

## Maintainer feedback
The maintainer explicitly said the diagnosis, ownership-tagging design, and validation were correct. Because the develop branch had gained plugin-permission changes in the same files, external-PR policy led them to re-implement the change on current code instead of merging the original PR directly.

The upstream reimplementation preserved the core ideas from PR #62:
- listener ownership tagging
- provider ownership checks
- targeted `reloadV3Plugin()` for v3 -> v3 updates
- snapshot iteration during full unload

## Outcome classification
This is not a technical PR failure. Classify it as `accepted design / upstream reimplementation` rather than rejected or failed.

## Meaning for this feature
The core feature is upstream-adopted via reimplementation. Future local work should compare against upstream commit `a55c4eef` before carrying any custom targeted-reload patch forward.

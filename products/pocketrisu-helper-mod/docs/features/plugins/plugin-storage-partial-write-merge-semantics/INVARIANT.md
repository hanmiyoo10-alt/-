# PLUGIN-STORAGE-PARTIAL-WRITE-MERGE-SEMANTICS

Status: `SUPERSEDED`
Canonical Feature-ID: `PLUGIN-STORAGE-PARTIAL-WRITES-DO-NOT-IMPLY-DELETE`
Canonical dossier: `products/pocketrisu-helper-mod/docs/features/plugins/plugin-storage-partial-writes-do-not-imply-delete/INVARIANT.md`
Source: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`

## Supersession reason

This file and the canonical dossier encode the same PocketRisu invariant. Once `pluginCustomStorage` moved out of the main DB object, the compatibility-facing object became incomplete; therefore omission cannot be interpreted as deletion of authoritative server-backed keys.

The canonical Feature-ID matches the durable idea-ledger record and is now the sole active helper dossier for this invariant. This file is intentionally retained as `SUPERSEDED` so historical links remain valid and future automation deduplicates evidence instead of creating another idea.

## Preserved invariant summary

1. Missing key != delete intent.
2. Empty compatibility view != empty authoritative store.
3. Partial DB round-trips update only explicit keys and preserve unrelated plugin state.
4. Destructive clear/delete requires an explicit destructive operation or a proven complete authoritative snapshot.
5. Targeted V3 plugin reload and existing plugin-storage integrity behavior remain unchanged.

## History

The original analysis, validation cases, and risk assessment remain valid evidence for the canonical record. No implementation PR is required because the invariant is already `ADOPTED` upstream.

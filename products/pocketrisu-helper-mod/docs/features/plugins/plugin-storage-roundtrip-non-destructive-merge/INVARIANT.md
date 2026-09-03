# PLUGIN-STORAGE-ROUNDTRIP-NON-DESTRUCTIVE-MERGE

Status: `SUPERSEDED`
Canonical Feature-ID: `PLUGIN-STORAGE-PARTIAL-WRITES-DO-NOT-IMPLY-DELETE`
Canonical dossier: `products/pocketrisu-helper-mod/docs/features/plugins/plugin-storage-partial-writes-do-not-imply-delete/INVARIANT.md`
Source: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`

## Supersession reason

This dossier describes the same underlying invariant already tracked under the canonical Feature-ID above: after plugin storage was externalized, the generic DB compatibility view can be empty or partial, so omitted `pluginCustomStorage` keys must not acquire destructive replacement authority.

The canonical dossier owns the durable rule, classification linkage, validation matrix, and future follow-up. This file remains in place to preserve historical references and prevent a second implementation/design thread from being created for the same invariant.

## Preserved invariant summary

- supplied plugin-storage keys may merge/update;
- missing keys mean unspecified, not delete;
- an empty compatibility object is not evidence that the authoritative backing store is empty;
- explicit clear/delete APIs own destructive intent;
- future compatibility refactors must prove snapshot completeness before using replacement semantics.

## History

Original evidence and scope were correct, but duplicated the canonical record. No implementation action is required because the invariant is already `ADOPTED` in PocketRisu.

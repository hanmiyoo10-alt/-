# SERVER-LARGE-DOC-BACKEND-ADAPTER deployment log

Date: 2026-08-29

## Workspace creation

After INSPECT_ONLY path and permission checks, the first runtime change was limited to creating a dedicated editable workspace on the server phone.

Chosen workspace:

`$HOME/storage/shared/Documents/PocketRisu-LargeDoc`

Resolved Android storage path:

`/storage/emulated/0/Documents/PocketRisu-LargeDoc`

Verification immediately after creation:

- directory creation succeeded;
- readable: YES;
- writable: YES;
- traversable: YES.

The workspace is intentionally separate from `$HOME/PocketRisu` so the large-doc editor cannot accidentally expose or edit the PocketRisu source/runtime tree.

No large-doc runtime code or runit service has been installed yet. Port `8765` remains unowned until the runtime deployment step is explicitly performed and verified.

## Deployment boundary

Planned runtime deployment remains:

1. choose/check a dedicated runtime-code directory outside the editable workspace;
2. deploy only the minimal original backend files (`server.py`, `chunk_store.py`, plus any required static files only if needed);
3. create a dedicated runit service pointing to the fixed workspace;
4. bind localhost only on `127.0.0.1:8765`;
5. verify the backend independently before PocketRisu adapter implementation;
6. keep the PocketRisu Phase-1 adapter read-only (`files/open/chunk`).

No Android notification is created on the server phone.

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

## Canonical source rule

The repository is the canonical source of truth.

- Original large-doc backend source remains under `plugins/termux/large-doc-editor/`.
- PocketRisu adapter source belongs in the PocketRisu repository/feature branch.
- Server-phone runtime files are deployment artifacts, not hand-maintained source.
- Except for explicit temporary tests or device migration, do not edit the deployed runtime copy directly on the server phone.

## Minimal mobile runtime rule

Only files required to execute the feature on the server phone should be deployed.

For the current Python reference backend, the expected minimal backend runtime is:

- `server.py`
- `chunk_store.py`

Do not deploy repository documentation, tests, CI files, development helpers, screenshots, unrelated plugin files, or the whole repository merely to run the service.

If another runtime dependency is later proven necessary, add it explicitly to the deployment manifest rather than recursively copying the source tree.

## Repo-driven deployment

Normal operation should be repo-driven:

1. source changes land in the repository;
2. repository tests/validation run;
3. a repo-owned deployment script or manifest selects only the mobile runtime files;
4. those files are deployed to the server-phone runtime directory;
5. hashes/import/startup/listener behavior are verified after deployment.

The intended normal workflow is:

`change repo -> validate -> deploy minimal runtime -> verify`

not:

`manually edit server-phone runtime files`

Direct/manual copies are exceptions only for temporary testing, recovery/diagnostics, bootstrap, or moving the runtime to another phone. Any temporary change that becomes product behavior must be moved back into canonical repository source before it is considered durable.

## Runtime/workspace separation

Runtime code and editable documents remain separate.

- runtime code candidate: `$HOME/.local/share/pocketrisu-large-doc-runtime`
- editable workspace: `$HOME/storage/shared/Documents/PocketRisu-LargeDoc`

The workspace is user data and must never be overwritten by repo deployment/sync.

## Deployment boundary

Planned runtime deployment remains:

1. INSPECT_ONLY current runtime/service state and target directory;
2. compare canonical source/allowlist with deployed files;
3. back up only files that are about to be replaced;
4. deploy only the explicit minimal allowlist (`server.py`, `chunk_store.py`, and only additional files proven necessary);
5. create a dedicated runit service pointing to the fixed workspace;
6. bind localhost only on `127.0.0.1:8765`;
7. verify hashes/import/backend behavior independently;
8. only then implement/enable the PocketRisu Phase-1 read-only adapter (`files/open/chunk`).

The deployment path must fail closed on unexpected target contents and must not recursively copy the repository.

It must not modify the Usage/DevPass runtime, PocketRisu core service, SSH tunnels, or Android notification configuration as a side effect.

No Android notification is created on the server phone.

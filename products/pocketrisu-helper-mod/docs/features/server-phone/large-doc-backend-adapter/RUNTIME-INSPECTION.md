# SERVER-LARGE-DOC-BACKEND-ADAPTER runtime inspection

Date: 2026-08-29

## INSPECT_ONLY findings

### Usage bridge baseline

- `http://127.0.0.1:39117/health` responded successfully.
- Bridge version observed: `1.6.26`.
- Status: `healthy`.
- Host/port reported by bridge: `127.0.0.1:39117`.
- This confirms the Usage/DevPass bridge is a separate healthy dependency and must not be mixed with large-doc diagnosis.

### Large-doc listener

- Connection to `127.0.0.1:8765` was refused.
- No process matching `large-doc`, `server.py`, or `8765` was visible.
- No `large-doc-editor/server.py` was found within the inspected `$HOME` depth.

### PocketRisu local-stack boot script

Found:

`$HOME/PocketRisu/scripts/termux/10-start-local-stack`

Inspection showed that this script owns only:

1. Termux services / `local-usage-runtime-manager` startup and readiness wait.
2. PocketRisu Node server startup/readiness on `127.0.0.1:6001`.

It contains no large-doc source reference, no `8765` listener startup, and no large-doc service ownership.

### runit service ownership

A recursive grep over the whole runit service tree was intentionally aborted because `supervise` contains special files/FIFOs and can block recursive readers. No modification occurred.

A safer inspection limited to actual runit `run` files:

```sh
find "$PREFIX/var/service" -type f -name run -print0 \
  | xargs -0 grep -HnE '8765|large-doc|large_doc|server\.py'
```

returned no matches.

Therefore no currently registered runit service starts the large-doc backend or owns port `8765`.

### Original backend launch contract

Repository source inspection confirms `plugins/termux/large-doc-editor/server.py`:

- uses only Python standard-library HTTP/server modules plus sibling `chunk_store.py`;
- binds exactly `127.0.0.1`;
- defaults to port `8765`;
- requires a valid `--workspace` directory (default: current working directory);
- accepts `--chunk-chars` (default `12000`);
- exposes `/api/files`, `/api/open`, `/api/chunk`, `/api/save`;
- caps JSON requests at 2,000,000 bytes.

`chunk_store.py` owns workspace confinement, chunk splitting, in-memory document sessions, atomic `os.replace` save, and mtime-based `SOURCE_CHANGED` protection.

No third-party Python package requirement was found in these two backend files.

## Interpretation

Current evidence supports: **large-doc is not presently deployed/registered as a server-phone runtime service**.

This is distinct from the healthy Usage/DevPass runtime. Do not modify the local-usage manager or PocketRisu core service to compensate.

The next deployment decision must explicitly choose:

1. where the minimal large-doc runtime files live on the server phone;
2. which fixed workspace it owns;
3. a dedicated runit service boundary;
4. localhost-only `127.0.0.1:8765` with no main-phone SSH forward;
5. read-only PocketRisu adapter proof before enabling write/save.

## Safety boundary

- No runtime files modified.
- No services restarted.
- No new port exposed.
- No Android notification created.

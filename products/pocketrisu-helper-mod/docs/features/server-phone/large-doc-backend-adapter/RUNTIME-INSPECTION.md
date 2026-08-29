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

## Interpretation

Current evidence does **not** support “large-doc is installed but merely stopped”. The server phone currently has a working local Usage runtime path, while the large-doc runtime appears not to be deployed/registered in the inspected boot path.

Do not start or clone anything yet. Next inspection should search runit service definitions and repository references for `8765`, `large-doc-editor`, or `server.py` before choosing a deployment owner.

## Safety boundary

- No runtime files modified.
- No services restarted.
- No new port exposed.
- No Android notification created.

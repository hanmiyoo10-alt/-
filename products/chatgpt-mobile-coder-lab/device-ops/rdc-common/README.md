# RDC common managed primitives

Repository-owned helpers shared by Mobile Coder Lab RDC profiles.

## Restart-safe session persistence

`session-persistence-transform.mjs` owns the narrow source transform required to persist rotated Remote Desktop Commander sessions safely. It accepts only the pinned Desktop Commander 0.2.50 upstream `device.js` checksum or the exact managed result checksum. Unknown vendor source fails closed before mutation.

The managed behavior registers the provider auth-state listener after Remote Channel initialization, atomically persists valid `TOKEN_REFRESHED` sessions through a mode-0600 temp file and rename, preserves an existing persisted session when current in-memory session data is unavailable, and persists once more before graceful channel teardown. It never prints token values and does not copy, clone, delete, reset, or inspect persisted auth/session contents.

Commands:

```sh
node session-persistence-transform.mjs --check /absolute/path/to/device.js
node session-persistence-transform.mjs --apply /absolute/path/to/device.js
node session-persistence-transform.mjs --verify /absolute/path/to/device.js
```

`--check` is read-only. `--apply` is checksum-guarded, atomic, and idempotent. `--verify` requires the exact repository-managed result.

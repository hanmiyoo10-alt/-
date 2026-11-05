# M RDC runtime environment forwarding

Repository-owned M-only compatibility owner for the fixed
`desktop-commander-remote` Termux runit service.

It repairs one proven execution-context boundary:

```text
outer M Desktop Commander process: selected Android runtime bundle 7/7
→ MCP SDK default child environment
→ local MCP child marked DC_REMOTE_DEVICE=true: selected bundle 0/7
```

The owner installs one process-local CommonJS preload and adds one explicit
`--require` to the already-existing fixed M RDC service command. It does not
patch Desktop Commander, the MCP SDK, private RDC configuration, Android
packages/settings/permissions, or any unrelated service.

## Selected environment

Only these names may be forwarded, and only when the outer RDC process has all
seven:

- `ANDROID_ROOT`
- `ANDROID_DATA`
- `ANDROID_ART_ROOT`
- `ANDROID_I18N_ROOT`
- `ANDROID_TZDATA_ROOT`
- `BOOTCLASSPATH`
- `DEX2OATBOOTCLASSPATH`

Forwarding applies only to child spawns whose explicit environment contains
`DC_REMOTE_DEVICE=true`. Existing child values win. `PREFIX`, `TMPDIR`, auth
material, session material, and unrelated parent environment values are never
forwarded by this owner.

## Commands

The repository command file is intentionally stored as ordinary Git mode
`100644` so it remains compatible with the reviewed L repository owner. Invoke
it explicitly through `sh`:

```sh
sh mcl-m-rdc-runtime-env --check
sh mcl-m-rdc-runtime-env --apply
sh mcl-m-rdc-runtime-env --activate
```

`--check` is read-only. `--apply` manages only the fixed preload file and the
fixed M `desktop-commander-remote/run` file. First adoption requires the exact
reviewed pre-adoption run-file SHA-256; drift fails closed. `--activate`
performs the same bounded apply and then restarts only the fixed M RDC service.

The managed service file remains deterministic. The owner adds exactly one
ownership marker, one fixed preload path, and one `--require` argument while
preserving the previous M service behavior byte-for-byte otherwise.

## Live boundary

Repository implementation, CI, review, merge, and postmerge convergence do not
authorize physical M mutation. A later separately authorized live phase must
apply the merged owner, reconnect through ordinary M RDC, prove the local MCP
child has the selected bundle `7/7`, then run the already-merged #3408 callback
helper twice. No JobScheduler action belongs to this owner.

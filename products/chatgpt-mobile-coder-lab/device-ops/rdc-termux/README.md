# Server direct-Termux RDC endpoint

Repository-owned profile for a second Remote Desktop Commander endpoint on the Mobile Coder Lab server phone.

This endpoint is deliberately separate from the existing `S` endpoint, which enters Ubuntu PRoot. The new endpoint runs directly in Termux as `S-Termux` so actual Termux package/config work can be performed without widening Android external-command permissions.

## Boundaries

- Existing `desktop-commander-remote` stays untouched.
- New service name: `desktop-commander-remote-termux`.
- New install/state/log paths are separate from the existing endpoint.
- Desktop Commander is pinned to `0.2.50`, the current verified Termux-native baseline on the main phone.
- The generated service uses Termux Node directly and never invokes `proot-distro`.
- No RDC auth/session files are copied or transplanted.
- No PocketRisu, `sshd`, Tailscale, Termux:Boot, branch/worktree, release, or production state is owned here.
- `allow-external-apps` is not enabled or modified by this profile.
- Wake-lock acquisition is only a service start/restart recovery hook. PocketRisu remains the durable boot-time owner.

## Commands

```sh
./install.sh --check
./install.sh --apply
./verify.sh
```
`--check` is read-only. `--apply` installs only missing/changed managed package and service files and leaves the new service disabled with a runit `down` marker. `--activate` performs the same bounded apply and then explicitly starts the new sibling service.

The service's first authorization, if required by Remote Desktop Commander, is an external consent boundary. Do not clone the existing endpoint's session to bypass that flow.

## Verification

`verify.sh` checks the pinned package, ownership markers, distinct service path, direct Termux Node entrypoint, absence of PRoot execution, distinct device label, and that the broader Termux external-command policy remains disabled.

For live proof after merge:

```sh
./install.sh --apply
./verify.sh
./install.sh --apply
./install.sh --activate
./verify.sh --require-running
```

Before and after activation, the owning packet requires sanitized snapshots of the permanent repository and role-service state. Live activation is not part of the implementation PR stage.

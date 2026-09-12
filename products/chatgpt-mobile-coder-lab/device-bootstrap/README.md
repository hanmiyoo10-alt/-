# Mobile Coder Lab device bootstrap

This directory implements the first `common` bootstrap slice from #2022.
It prepares repeatable development prerequisites for the two Android/Termux
Mobile Coder Lab devices without taking ownership of role-specific runtime state.

## Safety boundary

The bootstrap manages only common development packages and missing Git author
identity fields. It does not manage PocketRisu, RDC/runit services, Termux:Boot,
device branches/worktrees, Ubuntu rootfs creation, or authentication material.

GitHub, ChatGPT/Codex, RDC, Tailscale, SSH private keys, tokens, cookies, and
sessions are never copied or written by this bootstrap. GitHub CLI auth is only
checked by exit status and is reported as `NEEDS_MANUAL` when absent.

## Common profile

Termux prerequisites come from `manifests/common.termux.txt`. Ubuntu PRoot
prerequisites come from `manifests/common.ubuntu.txt`. Manifest rows use:

```text
package|command
```

A package may appear more than once when one package supplies multiple required
commands, such as Termux `nodejs` providing both `node` and `npm`.
## Commands

The default mode is read-only check:

```sh
./bootstrap.sh --profile common
./bootstrap.sh --check --profile common
```

Mutation is explicit:

```sh
./bootstrap.sh --apply --profile common
```

`--context auto` detects Ubuntu before Termux. For deterministic remote work or
tests, `--context termux` and `--context ubuntu` are supported explicitly.
Run the bootstrap once in each managed Git context whose global Git config must
be independently converged.

`verify.sh --profile common` is a read-only wrapper around bootstrap check.
It accepts the same optional `--context termux|ubuntu|auto` selector.

## Git identity

When `user.name` or `user.email` is missing, apply mode fills only that missing
field. Existing non-empty values are preserved. The defaults are:

```text
user.name  = hanmiyoo10-alt
user.email = 260735128+hanmiyoo10-alt@users.noreply.github.com
```
The email is repository configuration, not an authentication credential.
A device that already uses another author identity is left untouched.

## Result vocabulary

- `PRESENT` — required managed state already exists.
- `INSTALLED` — apply mode added a missing managed package/config field.
- `MISSING` — check mode found managed state that apply can repair.
- `NEEDS_MANUAL` — external/manual prerequisite such as GitHub auth or an Android companion app.
- `BLOCKED` — required context such as the Ubuntu PRoot is absent or cannot be proven.
- `FAILED` — an attempted managed mutation or post-mutation verification failed.

Termux check also verifies the existing Ubuntu PRoot can be entered and checks
Termux:Boot, Termux:API, and Tailscale package presence without installing APKs.
A missing Ubuntu rootfs is `BLOCKED`; this bootstrap never creates or replaces it.

Package apply is missing-only. It does not request downgrades, autoremove,
service state changes, branch switches, resets, or boot changes. Running apply a
second time on a converged context performs no managed package or Git identity
mutation.

# Repository ADB bootstrap

This directory is the repository-owned development-tooling surface for detecting, planning, installing, and verifying Android Debug Bridge (`adb`). It implements the host-tooling defaults in `RCR-D17` and `RCR-D18` without making ADB a production, release, CI, runtime, or project authority.

## Core contract

The bootstrap is idempotent. If `adb` is already resolvable, `install` returns `action=NOOP` before any package-manager mutation. It does not auto-upgrade an already-installed ADB.

Modes are separated so observation does not silently become mutation:

- `check` reports whether `adb` is currently resolvable.
- `plan` reports `NOOP`, an authorized install route, or a blocker without installing.
- `install` uses only the explicitly supported host package route when ADB is missing.
- `verify` proves the binary can run, starts the local ADB server, and lists connected devices.

No ADB binaries are committed to this repository. Cloning or opening the repository never installs anything automatically.

## Usage

```sh
sh tools/repo-env/adb/bootstrap.sh check
sh tools/repo-env/adb/bootstrap.sh plan
sh tools/repo-env/adb/bootstrap.sh install
sh tools/repo-env/adb/bootstrap.sh verify
```

Use the wrapper for ordinary ADB commands from repository-driven remote shells:

```sh
sh tools/repo-env/adb/adb.sh devices
sh tools/repo-env/adb/adb.sh version
```

## Supported lanes

The automatic installer is intentionally narrow:

| Host | Route | Package |
| --- | --- | --- |
| Native Termux / Android, non-root Termux shell | Termux package manager | `android-tools` |
| Ubuntu or Debian PRoot/container shell running as root | distro `apt-get` | `adb` |

Other environments fail closed instead of guessing an installer. A non-root Debian/Ubuntu host that needs administrator elevation is reported as blocked rather than silently invoking an elevation path.

## Remote-shell TMPDIR normalization

A verified remote-shell quirk on native Termux is that the shell may omit `PREFIX` and `TMPDIR`. In that state Termux ADB can try to write its server log under Android's `/tmp`, which may be inaccessible to the Termux app UID, causing the server to fail before it can acknowledge the client.

`adb.sh` corrects only that narrow case. When the resolved executable is the Termux ADB binary and the current `TMPDIR` is missing or not writable, the wrapper points `TMPDIR` at the writable Termux prefix temp directory before executing ADB. Ubuntu/Debian ADB is left unchanged.

An empty `adb devices` list is not an installation failure. It proves the local server is runnable but means no target is currently connected, paired, or authorized.

Wireless pairing, USB-debugging consent, device trust prompts, and target-specific connection details remain explicit device operations. This bootstrap does not enable Developer Options, weaken Android security controls, or auto-pair devices.

## Tests

The contract tests are offline and must never install packages:

```sh
python -m unittest discover -s tools/repo-env/adb/tests -p 'test_*.py' -v
```

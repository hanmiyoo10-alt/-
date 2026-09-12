# Repository PowerShell 7 bootstrap

This directory is the repository-owned development-tooling surface for detecting, planning, installing, and verifying PowerShell 7 (`pwsh`). It implements the tooling side of repository default `RCR-D16` without making PowerShell 7 a mandatory prerequisite for every host.

## Core contract

The install action is intentionally idempotent. If `pwsh` is already resolvable and reports major version 7 or newer, the installer returns `action=NOOP` **before** network access, package-manager calls, installer calls, or privilege escalation. It does not auto-upgrade an already-sufficient installation. Upgrades are a separate intentional maintenance action and are not provided by this bootstrap.

Modes are separated so observation never silently becomes mutation:

- `check` / `Check` reports the current state and route without installing.
- `plan` / `Plan` reports `NOOP` or the selected installation route without installing.
- `install` / `Install` mutates only when PowerShell 7 is missing or below the minimum major version.
- `verify` / `Verify` succeeds only when PowerShell 7 or newer is actually runnable.

## Usage

POSIX hosts:

```sh
sh tools/repo-env/pwsh/bootstrap.sh check
sh tools/repo-env/pwsh/bootstrap.sh plan
sh tools/repo-env/pwsh/bootstrap.sh install
sh tools/repo-env/pwsh/bootstrap.sh verify
```

Windows, runnable from Windows PowerShell 5.1 before `pwsh` exists:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\repo-env\pwsh\bootstrap.ps1 -Mode Check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\repo-env\pwsh\bootstrap.ps1 -Mode Plan
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\repo-env\pwsh\bootstrap.ps1 -Mode Install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\repo-env\pwsh\bootstrap.ps1 -Mode Verify
```

For the observed Windows/Codex environment where the WiX/MSI route is preferred, the Windows bootstrap also accepts `-InstallerType Wix`. This is an explicit selection, not an automatic fallback, because Microsoft package availability can change across PowerShell release lines.

## Platform lanes

The supported allowlist is deliberately conservative and should be updated from current vendor documentation when platform support changes.

| Host | Classification | Automatic route |
| --- | --- | --- |
| Windows with WinGet | `SUPPORTED` | `Microsoft.PowerShell` via WinGet; optional explicit `Wix` installer type |
| Debian 13 x64 | `SUPPORTED` | Microsoft package repository (`packages.microsoft.com`) + `apt` |
| Ubuntu 24.04 / 26.04 x64 | `SUPPORTED` | Microsoft package repository (`packages.microsoft.com`) + `apt` |
| macOS 14 / 15 / 26, x64 or Arm64 | `SUPPORTED` | latest signed/notarized PKG from the official `PowerShell/PowerShell` release |
| Termux / Android | `COMMUNITY_UNSUPPORTED` | no automatic installer yet; fail closed without mutation |
| other hosts | `UNAVAILABLE` | no automatic installer |

Termux is intentionally a separate lane. The repository must not describe it as Microsoft-supported merely because a community installation can be made to work. A future Termux adapter requires its own reproducible dependency and architecture proof.

## Authority and safety boundaries

- This directory installs a development tool only. It owns no production, release, CI, runtime, or project state.
- No PowerShell binaries or packages are committed to this repository.
- Cloning or opening the repository never installs anything automatically.
- Existing Git, CI, release, main-write, security, and project authorities remain unchanged.
- An unsupported or unrecognized host fails closed instead of choosing a plausible package command.
- `pwsh` does not repair already-misencoded content; explicit encoding contracts still outrank shell defaults.

## Vendor references

- Windows: Microsoft Learn, **Install PowerShell 7 on Windows**.
- Debian: Microsoft Learn, **Install PowerShell 7 on Debian**.
- Ubuntu: Microsoft Learn, **Install PowerShell 7 on Ubuntu**.
- macOS: Microsoft Learn, **Install PowerShell 7 on macOS**.

## Tests

The contract tests are offline and must never perform package installation:

```sh
python -m unittest discover -s tools/repo-env/pwsh/tests -p 'test_*.py' -v
```

They specifically lock the no-reinstall barrier so a satisfied fake `pwsh` cannot fall through to apt, sudo, curl, installer, or other mutation commands.

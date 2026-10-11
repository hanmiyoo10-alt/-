# Repository WSL2 + Ubuntu bootstrap

This directory is the repository-owned host-tooling surface for a Windows-side Linux/POSIX validation lane. It detects, plans, installs, and verifies WSL2 with one Ubuntu-family distribution without making WSL a repository, runtime, release, or production authority.

PowerShell 7 remains the Windows-native repository shell lane. Git Bash / MSYS2 is not a repository-standard lane here.

## Contract

The entrypoint is runnable from Windows PowerShell 5.1 before PowerShell 7 exists:

```powershell
powershell.exe -NoProfile -File tools\repo-env\wsl\bootstrap.ps1 -Mode Check
powershell.exe -NoProfile -File tools\repo-env\wsl\bootstrap.ps1 -Mode Plan
powershell.exe -NoProfile -File tools\repo-env\wsl\bootstrap.ps1 -Mode Install
powershell.exe -NoProfile -File tools\repo-env\wsl\bootstrap.ps1 -Mode Verify
```

Modes are deliberately separated:

- `Check` is read-only and reports the bounded current state.
- `Plan` is read-only and reports `NOOP`, `INSTALL`, `MANUAL_BOUNDARY`, `UNKNOWN`, or `UNAVAILABLE`.
- `Install` is the only mutating mode and uses the supported Microsoft `wsl.exe --install --distribution Ubuntu --no-launch` path.
- `Verify` succeeds only when an Ubuntu-family distribution is registered as WSL2 and a bounded non-interactive Linux shell probe succeeds.

## Workspace filesystem placement

Microsoft recommends keeping files in the filesystem of the operating system whose command-line tools perform the workload: Linux-command workloads should use the WSL/Linux filesystem for fastest performance, while Windows-command workloads should use the Windows filesystem. In a WSL shell, a project path under the standard `/mnt/<drive>/...` pattern is therefore a Windows-drive interoperability path, not the preferred default for Git/build/test workloads that run primarily in Linux.

This repository exposes a separate read-only advisory helper:

```sh
bash tools/repo-env/wsl/workspace-doctor.sh
bash tools/repo-env/wsl/workspace-doctor.sh /mnt/c/Users/example/project
```

The helper:

- detects WSL from the normal WSL environment/kernel signals;
- reports `WARN / WINDOWS_DRIVE_MOUNT` for the vendor-documented `/mnt/<drive>` Windows-drive pattern;
- reports `PASS / NO_WINDOWS_DRIVE_MOUNT_DETECTED` for other paths, scoped only to that bounded pattern check;
- reports `NOT_APPLICABLE / NOT_WSL` outside WSL;
- withholds the inspected path from its bounded receipt;
- never creates, moves, copies, clones, resets, cleans, configures, or deletes a repository/worktree.

`PASS` is intentionally not a proof that every possible custom mount is Linux-native. It proves only that the inspected path does not match the standard Windows-drive mount pattern owned by this check. Project-specific workspace identities and worktree roots remain owned by their project/coordination contracts; this helper does not create or migrate them.

## Idempotence and preservation

An already-registered Ubuntu-family WSL2 distribution makes `Install` exit with `action=NOOP` before invoking the installation command; `Verify` then performs the bounded shell/user probe needed for `SATISFIED`. Existing `Ubuntu-24.04`, `Ubuntu-22.04`, or another `Ubuntu-*` registration can satisfy the contract, so the bootstrap does not install a duplicate generic `Ubuntu` distribution merely to normalize a name.

The bootstrap does **not**:

- convert an existing WSL1 distribution to WSL2;
- unregister, reset, remove, terminate, or shut down a distribution;
- change the default WSL version or default distribution;
- run `wsl --update` or `--web-download` automatically;
- enable Windows optional features through a manual/legacy fallback;
- reboot Windows;
- create a Linux username or password;
- change PATH, shell profiles, Git configuration, or repository worktrees;
- install or configure Git Bash / MSYS2.

A detected Ubuntu-family WSL1 installation returns a manual boundary. `Check` and `Plan` never launch a distribution. `Verify` is the only mode that performs the Linux shell probe; a WSL2 distribution that still needs first-run user initialization, or whose default user is not yet a normal non-root user, returns a manual boundary instead of being called ready.

## Supported host boundary

The simplified Microsoft WSL install command is supported here only on Windows 10 version 2004 / build 19041 or later, and Windows 11. Older Windows versions fail closed; this owner does not silently switch to the manual legacy installation procedure.

`Install` requires an elevated PowerShell because the official Microsoft installation guidance requires administrator mode. The script never self-elevates or weakens execution/security policy.

## Vendor references

Current implementation is based on Microsoft Learn:

- **Install WSL**: Windows 10 version 2004 / build 19041+ or Windows 11, `wsl --install`, Ubuntu default, administrator PowerShell, restart and first-run Linux user setup may be required.
- **Basic commands for WSL**: `--distribution`, `--no-launch`, `--list --quiet`, `--list --verbose`, `--status`, `--version`, and the destructive/default-changing commands this owner intentionally avoids.

- **Working across Windows and Linux file systems**: for fastest performance, store files in the WSL filesystem when working from a Linux command line, and in the Windows filesystem when working from a Windows command line; `/mnt/<drive>` is the standard mounted Windows-drive shape in WSL.

Vendor behavior can change. Re-read current Microsoft documentation before changing the hard-coded installation command or supported-host boundary.

## Tests

Repository contract tests are offline and must never invoke or install WSL:

```sh
python -m unittest discover -s tools/repo-env/wsl/tests -p 'test_*.py' -v
```

They lock the single allowed install command, the no-op barrier, manual WSL1 boundary, absence of destructive/default-changing/update fallbacks, read-only `Check` / `Plan` surfaces, and the workspace doctor's advisory-only filesystem classification.

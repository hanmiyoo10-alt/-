# Mainphone dedicated PRIVATE LAB

This directory owns the non-sensitive bootstrap contract for a dedicated PRoot lab on mainphone `M`.
It is intentionally separate from the existing M Ubuntu development baseline and from `device-bootstrap/**`.

## Topology

`S` remains the operations/anchor side. `M` hosts credential-free, reproducible vendor/security experiments.
GPT reviews ordinary repository evidence and fixed sanitized receipts only.

The default lab identity is `mcl-private-lab`, created from `ubuntu:24.04`. The current M baseline uses
PRoot-Distro 5.8.0, whose `install -n/--name` capability permits a second container without renaming or
replacing the preserved `ubuntu` container.

## Security boundary

PRoot is userland/filesystem isolation, not a VM or kernel security boundary. More importantly, PRoot-Distro
5.8.0 login is not host-filesystem isolated by default. Every command this owner runs inside the lab therefore
uses `proot-distro login --isolated ...`. This owner never enables shared-home or explicit host binds.

Full chat non-disclosure is a separate execution rule: sensitive tests that must not appear in chat/tool history
must be installed and executed independently on-device. This repository owner does not contain those payloads.
Only an allowlisted sanitized receipt may later cross into the GPT review plane.

Never copy live S credentials, provider/session files, auth codes, tokens, private live logs, or device/session
identifiers into this lab merely to reproduce a problem.

## Commands

```sh
./bootstrap.sh --check
./bootstrap.sh --apply
./verify.sh
```

`--check` is read-only. `--apply` is explicit and may create only the dedicated lab identity, prepare the
non-sensitive lab directory layout, and install the minimal Node/Git/Python toolchain inside that lab.

The managed lab layout is `/opt/mcl-private-lab/{vendor,fixtures,results,receipts}` inside the dedicated rootfs.
The marker `/etc/mcl-private-lab` distinguishes a managed lab from an unrelated container using the same name.
An existing unmarked target fails closed rather than being adopted or replaced.

## Preserved boundaries

- Existing M `ubuntu` is never an apply target, fallback, rename target, reset target, or removal target.
- No shared host home, custom bind, RDC/runit, PocketRisu, Tailscale, sshd, Termux:Boot, Git worktree, or Android security state is owned here.
- Ordinary project `node_modules` stay ordinary project dependencies.
- Sensitive private tester implementation is out of repository scope.
- PRoot creation is a later live stage. The implementation PR only defines and tests this contract with synthetic fixtures.

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


## Credential-free runner v1

`mcl-labctl` is the public, repository-reviewed gateway for bounded checks inside the already-created lab.
Version 1 deliberately supports one check only:

```sh
./mcl-labctl run substrate-smoke
./mcl-labctl receipt substrate-smoke
```

`run` enters `mcl-private-lab` only through `proot-distro login --isolated`, runs the fixed built-in
substrate check, and stores a fixed receipt in the lab. Child stdout/stderr is not forwarded.
`receipt` reads the stored receipt without rerunning the check.

The only outward schema is:

```text
schema=mcl-private-check.v1
check=substrate-smoke
result=<pass|fail|blocked|manual_auth_required|unknown>
details=withheld
```

The controller validates exact field order, approved enums, and bounded size before forwarding a stored receipt.
Malformed or oversized stored content is not forwarded. Version 1 has no arbitrary command, script/path,
argument/environment passthrough, plugin mechanism, network/provider dependency, package installation, or
provider/session ownership. `manual_auth_required` is reserved receipt vocabulary only; v1 does not produce
or investigate authentication state.

## Credential-free RDC rotation/restart reproduction

`experiments/rdc-session-rotation/` owns the public-vendor `0.2.50` baseline reproduction for #2197.
It does not own live provider authentication or session repair. `prepare.sh` accepts only the fixed `--check`, `--apply`,
`--diagnose`, or `--cleanup` modes, uses the exact package `@wonderwhy-er/desktop-commander@0.2.50`, and prepares only the dedicated lab vendor subtree.
The apply path is a later live stage; repository implementation tests use a mocked `proot-distro` and perform no package fetch.

After preparation, the only new public controller check is:

```sh
./mcl-labctl run rdc-rotation-repro
./mcl-labctl receipt rdc-rotation-repro
```

The probe confirms the exact package version and exact audited `device.js` baseline, checks the bounded persistence/refresh
structure, then runs a deterministic credential-free `generation-0` / `generation-1` rotation-and-restart model.
A `pass` receipt means only that the declared **v0.2.50 failure-class reproduction assertions passed**. It does not mean
Desktop Commander is healthy, does not prove every historical S-Termux failure had the same cause, and does not repair #2178.

No live S credential/session material, token-shaped fixture, provider request, source snippet, package-manager output, path,
command line, environment dump, or free-form diagnostic crosses the `mcl-private-check.v1` receipt boundary.


## Sanitized RDC prepare diagnostics and safe staging cleanup

The #2201 prerequisite keeps diagnosis separate from the #2197 reproduction. `prepare.sh` now has two additional fixed modes:

```sh
./experiments/rdc-session-rotation/prepare.sh --diagnose
./experiments/rdc-session-rotation/prepare.sh --cleanup
```

`--diagnose` never installs the RDC package. It checks only the dedicated isolated lab, the fixed npm toolchain,
a fixed registry reachability probe, the exact `@wonderwhy-er/desktop-commander@0.2.50` package lookup, and the fixed
staging/target state. Child stdout/stderr remains suppressed. Its only outward form is the strict six-field schema:

```text
schema=mcl-private-prepare-diagnostic.v1
check=rdc-rotation-prepare
result=<pass|blocked|unknown>
class=<ready|lab_unavailable|stage_conflict|target_conflict|npm_unavailable|network_unavailable|package_unavailable|install_failed|verify_failed|unknown>
staging=<none|cleanup_eligible|conflict>
details=withheld
```

A `pass/ready` diagnostic means only that the bounded preparation prerequisites are reachable. It does not install
anything, does not run `rdc-rotation-repro`, and does not prove or repair #2178. Ambiguous failures remain `unknown`.
Raw npm output, paths, environment data, provider/session material, and free-form diagnostics never cross this boundary.

The same strict schema also classifies bounded `--apply` failures without exposing child output. `install_failed` means the
fixed isolated install/materialization block returned nonzero before post-install verification; it does **not** prove npm
itself was the failing sub-step. `verify_failed` means that block returned success but the subsequent fixed exact-target
check failed or mismatched. Failed apply never auto-cleans staging; `--cleanup` remains the explicit reviewed cleanup action.

`--cleanup` is a fixed single-target action. It is idempotent when staging is absent and refuses to remove anything
unless the final experiment target is absent and staging is proven packet-owned immediately before deletion. Legacy
staging is eligible only when it contains exactly the repository-owned `probe.mjs` bytes and nothing else. Future
staging adds `.mcl-rdc-rotation-stage-v1` with exact marker `mcl-rdc-rotation-stage:v1`; extra entries, symlinks,
wrong probe bytes, or an existing final target all fail closed. Cleanup never removes the completed vendor target,
the broader vendor directory, npm cache, existing M Ubuntu content, or arbitrary paths.

These modes are repository-reviewable control surfaces only. Their live diagnostic/cleanup use is deferred until after
merge and postmerge convergence. A later #2197 vendor retry remains separately authorized and is not performed by #2201.

## Optional isolated analysis essentials

The minimal PRIVATE LAB bootstrap remains intentionally limited to the Node/Git/Python substrate. Optional host-independent
analysis tools use the separate repository-reviewed profile:

```sh
./analysis-profile.sh --check
./analysis-profile.sh --apply
```

Version 1 owns exactly the Ubuntu packages `ripgrep`, `jq`, and `file`, providing lab-native `/usr/bin/rg`, `/usr/bin/jq`,
and `/usr/bin/file`. Every inspection and install enters the managed lab only through `proot-distro login --isolated` and
uses a lab-native PATH. A tool is `PRESENT` only when the fixed package is installed and its fixed `/usr/bin` executable is
present and executable. Package/binary mismatches fail closed.

This separation is deliberate: a non-isolated PRoot login may expose M Termux host binaries, so inherited `command -v`
results are not proof of lab-native installation. `--check` is read-only. `--apply` installs only missing fixed packages with
no-remove/no-upgrade safeguards, suppresses raw apt output, and verifies the fixed package/native-command pairs afterward.
The profile has no arbitrary package, command, path, URL, environment, bind, shared-home, provider/session, service, Git,
RDC, VM, or Android-setting passthrough. PRoot remains a userland/filesystem boundary, not a VM security boundary.

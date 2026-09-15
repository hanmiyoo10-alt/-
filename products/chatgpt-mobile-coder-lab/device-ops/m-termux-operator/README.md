# M Termux operator essentials

This owner manages one optional host-only operator profile for main phone `M`.
It is deliberately separate from the shared `device-bootstrap/**` profile and
from the dedicated `private-lab/**` PRoot owner.

The fixed v1 profile contains exactly:

| Termux package | Required command |
| --- | --- |
| `ripgrep` | `rg` |
| `jq` | `jq` |
| `file` | `file` |

These tools improve bounded source search, JSON inspection, and first-pass
artifact typing. Their presence is operational convenience, not runtime,
release, security, or production authority.

## Commands

```sh
./bootstrap.sh
./bootstrap.sh --check
./bootstrap.sh --apply
```

No argument is identical to `--check`. Check mode is read-only.
Apply mode is explicit and missing-only. It may request only the three fixed
packages above. Already installed packages are reported as `PRESENT` and are
not deliberately reinstalled or upgraded.

Package mutation uses the Termux `pkg` frontend with fixed `--no-upgrade` and
`--no-remove` safeguards. Package-manager stdout/stderr is suppressed. After a
successful transaction the script requires both installed package state and the
required command before reporting `INSTALLED`.

## Result vocabulary

- `PRESENT tool:<command> package:<package>`: package and command already exist.
- `MISSING tool:<command> package:<package>`: check mode found a missing package.
- `INSTALLED tool:<command> package:<package>`: apply added and verified it.
- `BLOCKED <fixed-reason>`: the environment or managed state is ambiguous.
- `FAILED tool:<command> package:<package>`: bounded installation or verification failed.

Exit `0` means the fixed profile is converged. Exit `1` means at least one
managed package is missing or an attempted install failed. Exit `2` means the
invocation or environment is blocked.

## Boundaries

The script has no arbitrary package, command, path, URL, shell/eval, service,
Git, PRoot, RDC, network-debug, or Android-setting passthrough. It does not run
`pkg upgrade`, remove packages, switch repositories, mutate global PATH/config,
or touch the ordinary Ubuntu PRoot or `mcl-private-lab`.

Physical-device identity is not inferred from hostname or private identifiers.
Repository authority decides when this M-only owner may be invoked on `M`.
Live package installation is a later `EXPERIMENT_CLOSE` step after merge and
postmerge convergence; the implementation PR uses synthetic package-manager
fixtures only.
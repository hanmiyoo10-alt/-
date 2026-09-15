# M-family bounded environment status

`mcl-env-status` is a read-only projection over already-owned main-phone `M`
surfaces. It does not become a new device-health, runtime, resource, package,
PRoot, VM, Git, RDC, or Android authority.

## Command

```sh
./mcl-env-status status
```

There is no no-argument alias and no mutation command. A successfully formed
receipt exits 0 even when one or more projected fields are `unknown`, `blocked`,
`missing`, `unavailable`, or `not_ready`. Invalid invocation exits 2.

## Receipt

Output is exactly eight ordered `key=value` lines:

```text
schema=mcl-m-family-status.v1
host_operator_profile=<pass|missing|blocked|unknown>
ordinary_ubuntu_login=<pass|unavailable|unknown>
private_lab_substrate=<pass|fail|unknown>
private_lab_analysis=<pass|missing|blocked|unknown>
vm_lab=<prepared|not_prepared|blocked|unknown>
vm_admission=<pass|blocked|unknown|not_ready>
details=withheld
```

## Projection boundary

Each field delegates to the existing semantic owner and preserves that owner's
bounded state. Child stdout/stderr is never forwarded as free-form output.
Malformed or unrecognized owner output becomes `unknown` rather than a stronger
claim.

- `host_operator_profile` calls `../m-termux-operator/bootstrap.sh --check`.
- `ordinary_ubuntu_login` performs only `proot-distro login ubuntu -- true`.
- `private_lab_substrate` calls `../private-lab/verify.sh`.
- `private_lab_analysis` calls `../private-lab/analysis-profile.sh --check`.
- `vm_lab` calls `../vm-lab/bootstrap.sh --check`.
- `vm_admission` calls `../vm-lab/verify.sh --admission` only when the VM
  bootstrap projection is fully prepared; otherwise it is `not_ready`.

The adapter does not copy VM thresholds or substitute host `MemAvailable` for
the VM owner's effective-memory policy. It does not inspect RDC provider/session
state, authentication material, Git state, PIDs, command lines, cgroup paths, or
private logs.

## Mutation boundary

Version 1 has no install, apply, repair, restart, cleanup, download, package,
path, profile, arbitrary command, service, ADB, root, or Android-setting
passthrough. Fixture executables exist only inside the contract test's temporary
synthetic `device-ops` tree; ordinary invocation has no fixture-root override.

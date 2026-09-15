# M mainphone VM LAB

This owner defines a side-by-side headless ARM64 VM lab on mainphone `M`.
It does not replace the existing PRoot PRIVATE LAB or ordinary Ubuntu baseline.
The selected execution route is Termux-native QEMU with TCG software emulation.

## Fixed v1 guest

The only v1 guest installer is the official Alpine Linux virt image:

- release: Alpine Linux `3.24.1`
- architecture: `aarch64`
- artifact: `alpine-virt-3.24.1-aarch64.iso`
- authority: `https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/`
- exact URL: `https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/alpine-virt-3.24.1-aarch64.iso`
- expected bytes: `92743680`
- SHA-256: `c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02`

The profile never accepts a caller-supplied image URL, checksum, path, QEMU argument,
or guest command.

## Host package contract

The only directly requested Termux packages are:

- `qemu-system-aarch64-headless`
- `qemu-utils`

Dependencies are package-manager-owned. `pkg upgrade`, removal, repository enabling,
Android settings, root, bootloader changes, and AVF/Linux Terminal toggles are out of scope.

## Managed device-local state

The live stage may own only:

```text
$HOME/.local/share/mcl-vm-lab/
$HOME/.local/state/mcl-vm-lab/
```

Both managed roots carry marker `mcl-vm-lab:v1`. An existing unmarked or symlinked
share/state root fails closed. The fixed persistent disk is `mcl-vm-lab.qcow2`
with virtual size exactly 8 GiB. State also owns a fixed 64 MiB `uefi-vars.fd`
pflash. The installer ISO is stored under its fixed name.

No host home, repository, ordinary Ubuntu rootfs, or PRoot PRIVATE LAB rootfs is
shared into the guest. Version 1 has no TAP, bridge, host forwarding, or standing
network service.

## Repository-reviewed commands

```sh
./bootstrap.sh --check
./bootstrap.sh --apply
./verify.sh --check
./verify.sh --admission
./mcl-vmctl start
```

`bootstrap.sh --check` and both public verify modes are read-only. `--apply` is
the only preparation mutation surface. `mcl-vmctl start` is a separate live-stage
surface and must not be used during repository-only implementation/validation.

## Static admission remains conservative

`verify.sh --admission` preserves the original caller-owned floors:

- free disk: 12 GiB
- effective available memory: 2 GiB
- free inodes: 10,000

The common resource guard owns measurement semantics, not these thresholds. On the
current M Termux host, cgroup-v2 `memory.max` / `memory.current` are not readable
from the ordinary context, so this static mode may remain `UNKNOWN`. It is retained
for compatibility and must not be weakened to system-wide `MemAvailable` alone.

`verify.sh --live-preflight` is an internal fixed helper for `mcl-vmctl`. It checks
the same prepared-state contract plus the existing 12 GiB disk and 10,000 inode
floors, but deliberately does not reinterpret the unreadable cgroup memory metric.
It does not authorize guest execution by itself.

## Live allocation admission

`mcl-vmctl start` uses the actual final QEMU process as the memory admission
transaction. The fixed v1 envelope is:

- guest RAM: exactly 1 GiB;
- temporary admission reserve: exactly 1 GiB;
- system `MemAvailable` before QEMU allocation: at least 3 GiB;
- system `MemAvailable` while both backends are resident: at least 1 GiB.

This is a separate policy from the static cgroup-capacity observation. A live PASS
proves only that the final `-S` prelaunch QEMU process could actually hold the guest RAM
plus temporary reserve in its inherited cgroup at that moment while preserving the
fixed system headroom. It does not claim readable cgroup limits or future pressure safety.

The controller sequence is fixed:

1. require the 3 GiB pre-allocation headroom;
2. create a private QMP socket only under writable `$TMPDIR`;
3. start the final QEMU process with `-S` and both 1 GiB backends preallocated;
4. negotiate QMP and require `query-status=prelaunch`;
5. require the QEMU PID and controller to report the same cgroup-v2 path;
6. require at least 1 GiB `MemAvailable` while both backends are resident;
7. QMP-delete the unattached temporary reserve backend;
8. unlink the QMP socket and remove its private control directory;
9. issue QMP `cont` on the same still-running QEMU PID.

Any failure before `cont` causes the controller to request QEMU quit or terminate
that child, remove bounded control state, and return `BLOCKED live-admission:<reason>`.
There is no probe/relaunch substitution and no arbitrary caller-supplied QEMU option.

## Fixed live QEMU shape

The live controller constructs the final command from fixed managed paths only.
Its essential shape remains:

```sh
qemu-system-aarch64 \
  -machine virt,accel=tcg,memory-backend=mcl-guest-memory \
  -cpu cortex-a57 -smp 2 -m 1024 \
  -object memory-backend-ram,id=mcl-guest-memory,size=1G,prealloc=on \
  -object memory-backend-ram,id=mcl-admission-reserve,size=1G,prealloc=on \
  -S -qmp unix:<private-TMPDIR-socket>,server=on,wait=off \
  -display none -monitor none -serial stdio -nic none \
  -drive "if=pflash,format=raw,readonly=on,file=$PREFIX/share/qemu/edk2-aarch64-code.fd" \
  -drive "if=pflash,format=raw,file=$HOME/.local/state/mcl-vm-lab/uefi-vars.fd" \
  -drive "if=none,format=qcow2,file=$HOME/.local/share/mcl-vm-lab/mcl-vm-lab.qcow2,id=rootdisk" \
  -device virtio-blk-device,drive=rootdisk \
  -device virtio-scsi-device,id=scsi \
  -drive "if=none,format=raw,readonly=on,file=$HOME/.local/share/mcl-vm-lab/alpine-virt-3.24.1-aarch64.iso,id=install" \
  -device scsi-cd,drive=install -boot d
```

TCG is explicit. No KVM capability is claimed or requested. The guest retains no
host directory share and no configured network device in v1.

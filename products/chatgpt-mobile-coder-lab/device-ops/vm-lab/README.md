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

The later live stage may own only:

```text
$HOME/.local/share/mcl-vm-lab/
$HOME/.local/state/mcl-vm-lab/
```

Both managed roots carry marker `mcl-vm-lab:v1`. An existing unmarked or symlinked
share/state root fails closed. The fixed persistent disk is `mcl-vm-lab.qcow2`
with virtual size exactly 8 GiB. State also owns a fixed 64 MiB `uefi-vars.fd` pflash. The installer ISO is stored under its fixed name.

No host home, repository, ordinary Ubuntu rootfs, or PRoot PRIVATE LAB rootfs is
shared into the guest. Version 1 has no TAP, bridge, host forwarding, or standing
network service.

## Repository-reviewed commands

```sh
./bootstrap.sh --check
./bootstrap.sh --apply
./verify.sh --check
./verify.sh --admission
```

`bootstrap.sh --check` and both verify modes are read-only. `--apply` is the only
preparation mutation surface. It first uses the common repository resource guard
for free disk and inode floors, then installs only missing fixed QEMU packages,
materializes only the marked roots, downloads only the pinned Alpine ISO, verifies
size + SHA-256, and creates the fixed qcow2 disk if absent.
## Boot admission is fail-closed

`verify.sh --admission` requires all prepared-state checks plus these caller-owned floors:

- free disk: 12 GiB
- effective available memory: 2 GiB
- free inodes: 10,000

The common resource guard owns measurement semantics, not these thresholds. On the
current M Termux host, cgroup-v2 memory limit/current files are not readable from
the ordinary context, so a requested memory floor is expected to remain `UNKNOWN`
until stronger authorized evidence becomes available. Do not substitute
`MemAvailable` alone and do not boot after an `UNKNOWN` admission result.

## Fixed later boot shape

Only after a fresh `PASS boot-admission` in the separately authorized live stage,
the reviewed headless command shape is:

```sh
qemu-system-aarch64 \
  -machine virt,accel=tcg \
  -cpu cortex-a57 -smp 2 -m 1024 \
  -display none -monitor none -serial stdio -nic none \
  -drive "if=pflash,format=raw,readonly=on,file=$PREFIX/share/qemu/edk2-aarch64-code.fd" \
  -drive "if=pflash,format=raw,file=$HOME/.local/state/mcl-vm-lab/uefi-vars.fd" \
  -drive "if=none,format=qcow2,file=$HOME/.local/share/mcl-vm-lab/mcl-vm-lab.qcow2,id=rootdisk" \
  -device virtio-blk-device,drive=rootdisk \
  -device virtio-scsi-device,id=scsi \
  -drive "if=none,format=raw,readonly=on,file=$HOME/.local/share/mcl-vm-lab/alpine-virt-3.24.1-aarch64.iso,id=install" \
  -device scsi-cd,drive=install \
  -boot d
```

TCG is explicit. No KVM capability is claimed or requested.
# 2026-09-15 mainphone M VM lab preparation

## Scope

This checkpoint records one bounded live preparation of the `chatgpt-mobile-coder-lab`
M-family VM lab on mainphone `M`. It is evidence of the observed device state at this
point in time, not a new runtime or production authority.

- repository authority SHA: `5b4e67d6010dc079f4592e0ee03712489feb0f12`
- execution surface: authorized Remote Desktop Commander on mainphone `M`
- owner: `products/chatgpt-mobile-coder-lab/device-ops/vm-lab/**`
- live mutation used only the reviewed `bootstrap.sh --apply` surface
- no VM boot was performed

## Before apply

The authoritative `bootstrap.sh --check` reported all six preparation items missing:

```text
MISSING vm-root:mcl-vm-lab
MISSING package:qemu-system-aarch64-headless
MISSING package:qemu-utils
MISSING guest-image:alpine-virt-3.24.1-aarch64
MISSING disk:mcl-vm-lab.qcow2
MISSING uefi-vars:mcl-vm-lab
```

The Termux package repository exposed install candidates for both directly requested
QEMU packages at version `1:11.0.3`. The resource snapshot before apply showed
`30067772` 1K blocks available and `7516943` free inodes on the `$HOME` filesystem,
which satisfied the owner-controlled preflight used by `bootstrap.sh --apply`.

## Apply result

`bootstrap.sh --apply` completed successfully and its immediate output reported all
six preparation items `PRESENT`. A fresh `bootstrap.sh --check` returned the same
six `PRESENT` lines.

Installed package evidence:

```text
qemu-system-aarch64-headless 1:11.0.3 install ok installed
qemu-utils 1:11.0.3 install ok installed
```

Toolchain resolution:

```text
/data/data/com.termux/files/usr/bin/qemu-system-aarch64
/data/data/com.termux/files/usr/bin/qemu-img
```

Managed roots now exist at:

```text
$HOME/.local/share/mcl-vm-lab
$HOME/.local/state/mcl-vm-lab
```

Both roots contain the required marker value:

```text
mcl-vm-lab:v1
```

The owner verification surface returned:

```text
PASS vm-lab-prepared
```

## Aggregate status after preparation

The permanent M-family status receipt reported:

```text
schema=mcl-m-family-status.v1
host_operator_profile=pass
ordinary_ubuntu_login=pass
private_lab_substrate=pass
private_lab_analysis=pass
vm_lab=prepared
vm_admission=unknown
details=withheld
```

`vm_admission=unknown` is preserved as uncertainty. The VM-lab contract requires
stronger authorized memory evidence than ordinary `MemAvailable` when the relevant
cgroup-v2 evidence is unavailable. This checkpoint therefore does not claim boot
admission and did not start QEMU.

## Isolation / preservation evidence

The permanent landing repository was not repurposed for this operation. It remained:

```text
## chore/add-codex-cli...origin/chore/add-codex-cli
?? package-lock.json
```

That older landing checkout did not contain the current VM-lab owner scripts, so the
live operation used a clean isolated worktree pinned to the authority SHA instead.
The isolated worktree was clean before this checkpoint document was authored.

## Conclusion

The two originally observed gaps, QEMU packages `ABSENT` and VM roots `ABSENT`, are
resolved at the preparation layer on mainphone `M`. The next distinct boundary is
boot admission; it remains `UNKNOWN` and must not be treated as passed without new
owner-authorized evidence.

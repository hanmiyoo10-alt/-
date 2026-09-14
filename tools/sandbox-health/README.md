# ChatGPT sandbox health gate

Authority / context: #2225. Work packet: #2232.

This directory owns a tiny preflight for the ChatGPT sandbox local execution plane. It is intentionally narrower than a full machine diagnostic and does not create a new runtime, release, device, or production authority.

## What the gate proves

`health-gate.sh` fails closed unless all of these local conditions hold:

- trivial `/bin/echo` process execution succeeds;
- the selected scratch directory exists and is writable;
- a temporary file can be created, written, and read back;
- when `--min-free-mib N` is requested, free space can be measured and meets that caller-supplied threshold.

On PASS it also reports bounded observations when available:

- free KiB and free inodes for the selected work directory;
- cgroup `memory.max`, `memory.current`, and `cpu.max`.

Unreadable optional resource metrics are reported as `unknown`; they are not fabricated into a stronger claim.

## What the gate does not prove

- It does not diagnose or repair the prior `TransportTimeoutError` backend failure.
- It does not test DNS, HTTPS, or outbound sandbox egress. Output explicitly says `network=not_checked`.
- It does not prove Python, Rust, Android SDK/NDK, or any project toolchain is installed.
- It does not decide whether a particular heavyweight operation has enough resources unless the caller supplies its own minimum free-space requirement.
- A PASS is scoped to the current sandbox execution instance and must not be promoted into GitHub Actions, S/M device, release, or production health.

Network-dependent acquisition remains on the GitHub Actions plane when sandbox egress is unavailable. Device-only evidence remains on authorized S/M devices.

## Usage

```sh
sh tools/sandbox-health/health-gate.sh
sh tools/sandbox-health/health-gate.sh --workdir /mnt/data --min-free-mib 2048
```

Environment equivalents are available for callers that prefer them:

```sh
SANDBOX_HEALTH_WORKDIR=/mnt/data \
SANDBOX_HEALTH_MIN_FREE_MIB=2048 \
  sh tools/sandbox-health/health-gate.sh
```

## Contract test

```sh
sh tools/sandbox-health/test-health-gate.sh
```

The test covers a normal PASS plus missing-workdir, invalid-threshold, and deliberately excessive free-space request failures.

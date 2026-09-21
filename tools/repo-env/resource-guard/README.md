# Repository Resource Guard

`guard.py` is a small read-only preflight primitive for repository-owned workflows that need to refuse expensive work when a caller-declared capacity floor is not met.

It is not a project policy owner. Callers choose every threshold.

## Contract

```text
python guard.py check \
  --target-root <existing-directory> \
  [--min-free-disk-bytes N] \
  [--min-available-memory-bytes N] \
  [--min-free-inodes N]
```

At least one positive floor is required. Floors use raw bytes or inode counts and are bounded to signed 64-bit positive integers.

The command writes nothing and prints one compact JSON object with schema `repo-resource-guard.v1`.

Overall states:

- `PASS`: every requested metric is known and meets its floor, exit `0`.
- `BLOCKED`: a known metric is below its floor, exit `1`.
- `UNKNOWN`: a requested metric cannot be established safely, exit `2`.
- invalid invocation is `BLOCKED` evidence with exit `2`.

## Metrics

`free_disk_bytes` uses `statvfs().f_bavail * f_frsize`, so the observation reflects blocks available to the invoking context rather than privileged-only free space.

`free_inodes` uses `f_favail` only when the filesystem reports meaningful inode accounting. Unsupported accounting stays `UNKNOWN`.

`available_memory_bytes` starts from Linux `MemAvailable`. Swap is not counted. When the current cgroup-v2 hierarchy exposes finite `memory.max` limits, the effective observation is capped by the smallest safely-computable `memory.max - memory.current` allowance visible from the current cgroup through its visible ancestors. Ambiguous or unreadable relevant cgroup state stays `UNKNOWN`.

## Privacy and effect boundary

Output never serializes the target path, cwd, hostname, username, device identity, environment, file contents, `/proc` contents, or cgroup paths.

The implementation has no shell execution, subprocess, network, package-manager, service/process, mount, reservation, daemon, or automatic consumer-execution surface.

## Non-goals

This primitive does not derive thresholds from image sizes or VM settings, predict CPU/load performance, count swap as RAM, reserve resources, persist history, or compare pre/post readings. The owning consumer remains responsible for threshold selection and for deciding what a passing resource observation authorizes.

The first planned consumer is #2257, but adoption is separate from this common primitive and requires fresh #2257 authority.

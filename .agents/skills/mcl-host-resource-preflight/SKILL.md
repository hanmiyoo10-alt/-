---
name: mcl-host-resource-preflight
description: >-
  Produce one bounded read-only S or M host-resource preflight after D-012 has
  already selected the semantic route and exact executor. Delegate disk/RAM/inode
  capacity to repo-resource-guard.v1, add optional load/swap/battery/thermal context,
  preserve UNKNOWN, and never create aggregate health, readiness, or repair authority.
---

# MCL Host Resource Preflight

Read-only Mobile Coder Lab composition for phone-host capacity and pressure evidence.
It is not a router, dispatcher, scheduler, monitor, resource reservation owner,
VM-admission replacement, device-health authority, or mutation gate.

## Required input

Require an already-selected D-012 route/executor plus one exact host target:

```text
route=<current D-012 route>
executor=<exact selected execution surface>
target=<S|M>
pressure=<requested|not_requested>
```

`target=S` is valid only for an S-host phase whose exact executor is `S`.
`target=M` is valid only when the already-selected phase executes on `M`.
A documented route-S fallback to executor M therefore uses target M; this skill
never performs that fallback itself. Missing/conflicting evidence is `UNKNOWN`.

Capacity floors are optional caller/packet inputs. Each supplied floor must be a
positive integer and may cover only free disk bytes, effective available memory
bytes, or free inodes. No floor means that capacity field is `not_requested`.

## Capacity owner: delegate, do not recompute

Use only the existing `repo-resource-guard.v1` owner. Do not reproduce statvfs,
MemAvailable, cgroup-v2, or inode semantics in this skill.

- S fixed target root: `/root/nyang-repo` on endpoint `S`.
- M fixed target root: `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` on endpoint `M`.

Invoke the current repository-owned resource guard with only the caller-supplied
positive floors. Project each requested metric to `pass`, `below_floor`, or
`unknown`. A missing/unavailable/malformed guard remains `unknown`. Never install,
copy, fetch, or repair the guard to make the observation succeed.

Swap is never RAM. A known swap value cannot upgrade `unknown` or `below_floor`
effective-memory evidence and cannot satisfy a memory floor.

## Optional host-pressure observations

Run these only when `pressure=requested`. Otherwise every pressure field is
`not_requested`. These values are context only in v1 and have no thresholds.

### S

- Load and swap are observed on endpoint `S` only. Read the first numeric value
  from fixed `/proc/loadavg` for 1-minute load and fixed `SwapFree` from
  `/proc/meminfo` for swap bytes. Malformed/unreadable values become `unknown`.
- Battery and thermal are observed on exact public endpoint `S-Termux` only.
  The Ubuntu S endpoint does not become an Android battery/thermal owner.

### M

Observe load, swap, battery, and thermal on exact public endpoint `M`. For load,
use fixed `uptime` output in a bounded C locale when `/proc/loadavg` is unavailable;
accept only a parseable first 1-minute load value. Never expose the raw line.
Swap uses only fixed `SwapFree` from `/proc/meminfo`.

## Battery boundary

Command presence is not evidence. If `termux-battery-status` exists, an actual
invocation must complete with a bounded parseable result before any field is used.
A missing, failed, timed-out, malformed, or unrecognized result provides no value.

A fixed `/system/bin/dumpsys battery` read may be used as fallback. Consume only:

```text
level: 0..100
status: Android battery status integer 1..5
temperature: signed integer tenths of a degree C
```

Map status 2=`charging`, 3=`discharging`, 4=`not_charging`, 5=`full`; status 1 or
anything unrecognized is `unknown`. Convert a validated temperature to Celsius
and accept only -50.0 through 150.0. Permission-denied text, duplicate/conflicting
fields, impossible ranges, or malformed output make affected battery fields
`unknown`. Never expose raw dumpsys output or unrelated battery properties.

## Thermal boundary

Read only the fixed Android thermal glob `/sys/class/thermal/thermal_zone*/temp`
on the native Termux endpoint for the selected host. Do not read or emit zone
names/types. Accept only readable integer milli-Celsius samples in the bounded
range -50000..200000, convert them to Celsius, and emit only their maximum.
Zero valid readable samples means `unknown`, not a healthy/cool result.

Do not use `dumpsys thermalservice` as fallback. Android may print a permission
denial while a superficial command-status check looks usable; such output is not
thermal evidence.

## Receipt contract

Emit exactly these ordered fields:

```text
schema=mcl-sm-host-resource-preflight.v1
target=<S|M>
s_disk=<pass|below_floor|unknown|not_requested>
s_memory=<pass|below_floor|unknown|not_requested>
s_inodes=<pass|below_floor|unknown|not_requested>
m_disk=<pass|below_floor|unknown|not_requested>
m_memory=<pass|below_floor|unknown|not_requested>
m_inodes=<pass|below_floor|unknown|not_requested>
s_load1=<nonnegative-decimal|unknown|not_requested>
m_load1=<nonnegative-decimal|unknown|not_requested>
s_swap_free_bytes=<nonnegative-integer|unknown|not_requested>
m_swap_free_bytes=<nonnegative-integer|unknown|not_requested>
s_battery_percent=<0..100|unknown|not_requested>
m_battery_percent=<0..100|unknown|not_requested>
s_battery_state=<charging|discharging|full|not_charging|unknown|not_requested>
m_battery_state=<charging|discharging|full|not_charging|unknown|not_requested>
s_battery_temp_c=<bounded-decimal|unknown|not_requested>
m_battery_temp_c=<bounded-decimal|unknown|not_requested>
s_thermal_max_c=<bounded-decimal|unknown|not_requested>
m_thermal_max_c=<bounded-decimal|unknown|not_requested>
details=withheld
```

Fields for the non-selected host are always `not_requested`. A formed receipt may
contain any number of `unknown` values. There is deliberately no aggregate
`PASS`, `health`, `ready`, `safe_to_work`, or `safe_to_mutate` field.

## Privacy and effect boundary

Do not emit device/session/account identifiers, battery serial/hardware data,
sensor names or paths, raw dumpsys/proc/sysfs text, usernames, hostnames, cwd,
command lines, environment dumps, credentials, provider state, or free-form
diagnostics. Only fixed semantic host names, reviewed bounded values/enums, and
`details=withheld` may leave the skill.

This skill performs no package install, repair, service/process control, CPU
governor or thermal policy action, battery policy action, Git fetch/sync, worktree
operation, lease operation, VM action, notification, daemon, scheduler, state DB,
release, or production mutation. Non-pass evidence may justify a separately-owned
read-only drill-down only; it never triggers repair automatically.

## Relationship to existing preflight and VM admission

`mcl-preflight` remains the route-conditioned first pass. This sibling is invoked
only when the task explicitly needs host capacity/pressure evidence. It is not a
universal prerequisite for tiny/read-only work.

M VM LAB `vm_admission` remains a separate semantic owner with its own thresholds
and stronger memory policy. This skill must not reinterpret a host snapshot as VM
admission and must not copy VM thresholds into its own contract.

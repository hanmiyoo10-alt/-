# M phantom-process budget observer

This directory owns one bounded, read-only observation of Android ActivityManager
phantom-process pressure on the physical M phone.

The normal runtime is Windows Node on L-Gram with an already user-authorized
Wireless ADB connection. Repository source work remains owned by the reviewed
L repository route; this runtime observation does not grant Android mutation
authority.

## Command

```text
node mcl-m-phantom-process-budget.cjs status
```

Normal output is a fixed receipt:

```text
schema=mcl-m-phantom-process-budget.v1
target=m
transport=wireless_adb
connection=<connected|offline|ambiguous|unknown>
model=<match|mismatch|unknown>
max_phantom_processes=<int|unknown>
global_phantom_processes=<int|unknown>
termux_phantom_processes=<int|unknown>
headroom=<int|unknown>
result=<pass|blocked|unknown>
details=withheld
```

The observer resolves only the standard per-user Android Platform-Tools
`adb.exe` location. It may inspect multiple connected rows internally. It takes
one bounded read-only `adb track-devices --proto-text` snapshot and uses ADB's
own protobuf `connection_type` truth to classify the connected rows. Exact
`SOCKET` is the only admitted `wireless_adb` candidate; exact `USB` is
excluded. `UNKNOWN`, malformed, duplicate, unmatched, or incomplete tracker
evidence remains unresolved and prevents optimistic selection. The decoded
first-frame payload must be fully consumed by valid repeated device blocks,
aside from whitespace; unmatched trailing content invalidates the snapshot.

The tracker is a streaming host service, so the owner bounds it with a fixed
short timeout and consumes partial stdout only for the expected timeout
termination. ADB frames every tracker update as four ASCII hexadecimal length
characters followed by that exact payload byte count. The owner requires one
complete first frame within a fixed 16 KiB payload ceiling, decodes only that
first frame, and then parses the protobuf-text device blocks. Invalid hex,
truncated payload, oversized length, malformed protobuf, or unmatched device
identity remains unresolved. Later streamed frames are not consumed by the
one-shot observation. If the earlier `adb devices -l` snapshot and the tracker
snapshot disagree because a device appeared or disappeared between reads, the
observer preserves `unknown` rather than claiming `offline` or a unique M.

It adds no shell, daemon, watcher, persistent helper, or retry loop.

For each admitted socket candidate the fixed `ro.product.model` output
must be exactly one bounded non-empty printable line. Only CRLF line endings may
be normalized; embedded carriage returns, surrounding whitespace, other control
characters, empty/multiline output, or failed model evidence remains unresolved.
The observer proceeds only when exactly one candidate matches fixed M model
`SM-S938N` and no other candidate remains unresolved. It then resolves the fixed `com.termux` package
UID and reads only fixed ActivityManager/package evidence.

It never prints ADB serials, IP addresses, ports, connection types, transport IDs,
pairing material, process tables, dumpsys payloads, or command stderr. It never
connects, disconnects, pairs, or changes device/connectivity state. Missing,
malformed, ambiguous, unresolved, or mismatched evidence fails closed to the
same bounded receipt schema.

## Non-authority

This owner does not:

- change `settings` or `device_config`;
- disable phantom-process monitoring or raise its limit;
- install/uninstall packages;
- force-stop, reboot, reset networking, or restart services;
- pair Wireless ADB;
- accept caller-selected serials, packages, paths, or shell commands;
- decide a recovery threshold or authorize recovery.

A later writer/admission policy requires separate reviewed authority.

## Tests

```sh
node --check products/chatgpt-mobile-coder-lab/device-ops/m-phantom-process-budget/mcl-m-phantom-process-budget.cjs
node --test products/chatgpt-mobile-coder-lab/device-ops/m-phantom-process-budget/tests/test-mcl-m-phantom-process-budget.cjs
```

Refs #3231 #3235.

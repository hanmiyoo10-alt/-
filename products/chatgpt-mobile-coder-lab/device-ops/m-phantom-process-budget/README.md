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
`adb.exe` location. It may inspect multiple connected ADB rows internally, but
only non-USB rows are eligible for the `wireless_adb` receipt. It reads the
fixed `ro.product.model` property for those candidates and proceeds only when
exactly one readable non-USB target matches fixed M model `SM-S938N` and every
other non-USB candidate model is also readable. It then resolves the fixed
`com.termux` package UID and reads only fixed ActivityManager/package evidence.

USB M is never selected. Multiple wireless M matches are ambiguous. A failed
model read remains unknown because the unresolved candidate could also be M.
Zero non-USB connected rows are offline; readable non-USB rows with no M match
are a model mismatch.

The observer never prints ADB serials, IP addresses, ports, transport IDs,
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

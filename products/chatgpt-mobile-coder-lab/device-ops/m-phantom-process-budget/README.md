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
`adb.exe` location. It may inspect multiple connected rows internally. For
each row it uses fixed read-only `get-devpath` evidence before model reads:
exact `usb:...` means USB and is excluded from a `wireless_adb` receipt;
exact `unknown` is the only admitted socket/TLS candidate; failed, empty, or
foreign devpath output remains unresolved.

This transport check does not rely on the optional `usb:` token in
`adb devices -l`, because ADB's libusb backend may omit that long-list token
while the transport itself still owns a USB devpath.

For each admitted socket/TLS candidate the fixed `ro.product.model` output
must be exactly one bounded non-empty printable line. Empty, multiline, control-
character, or failed model evidence remains unresolved. The observer proceeds
only when exactly one candidate matches fixed M model `SM-S938N` and no other
candidate remains unresolved. It then resolves the fixed `com.termux` package
UID and reads only fixed ActivityManager/package evidence.

It never prints ADB serials, IP addresses, ports, devpaths, transport IDs,
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

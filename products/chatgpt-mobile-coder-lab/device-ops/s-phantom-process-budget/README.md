# S phantom-process budget observer

This directory owns one bounded, read-only observation of Android ActivityManager
phantom-process pressure on the physical server phone S.

The normal runtime is M Termux over an already user-authorized M-to-S Wireless
ADB connection. Repository source work remains owned by the reviewed L route.
This observer does not grant Android mutation authority and does not widen the
visible-UI Wireless ADB owners.

Command: node mcl-s-phantom-process-budget.cjs status

The fixed receipt reports schema, target s, wireless_adb connection/model state,
max phantom processes, global phantom records, Termux phantom records, headroom,
bounded result, and details=withheld.

The observer uses only the fixed Termux ADB binary at
/data/data/com.termux/files/usr/bin/adb, requires exactly one connected target,
verifies exact S model SM-G998N, resolves only fixed package com.termux, and
reads only fixed ActivityManager/package evidence.

It never prints ADB serials, IP addresses, ports, pairing material, package
UIDs, process tables, dumpsys payloads, PIDs/process names, or command stderr.
Missing, malformed, ambiguous, mismatched, or unavailable evidence fails closed
to a bounded receipt.

Non-authority:
- no settings or device_config writes;
- no phantom-limit change or monitor disablement;
- no install/uninstall/clear/force-stop;
- no reboot, network reset, service restart, pairing, or Wireless-ADB repair;
- no caller-selected serial, package, path, ADB binary, or shell command;
- no recovery threshold or recovery authorization;
- no causal Android-level improvement claim from Termux process counts.

The semantic route is S_ANDROID_PHANTOM_BUDGET_READ. It is intentionally
narrower than a generic Android ADB read route and separate from
S_ANDROID_GUI_ADB_READ.

Tests:
node --check products/chatgpt-mobile-coder-lab/device-ops/s-phantom-process-budget/mcl-s-phantom-process-budget.cjs
node --test products/chatgpt-mobile-coder-lab/device-ops/s-phantom-process-budget/tests/test-mcl-s-phantom-process-budget.cjs

Refs #3292 #3293 #3294 #2453 #3231.

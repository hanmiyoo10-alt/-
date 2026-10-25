# MCL Wireless ADB reboot recovery

Fixed-purpose implementation first live-proven on exact M under #3722 and separately reviewed for exact S under #3761.

This owner is a fixed-purpose Android helper for one narrow post-reboot effect:

system boot broadcast
→ bounded JobScheduler attempts
→ active transport is Wi-Fi
→ Settings.Global["adb_wifi_enabled"] = 1
→ Android ADB service keeps trusted-Wi-Fi and TLS-pairing enforcement

It is not a generic settings writer, ADB client, pairing helper, shell bridge, network service, or watchdog.

## Authority boundary

Repository source and tests do not authorize installation or device mutation.
Live activation is always a later, separately reviewed phase on one exact supported device. Exact M `SM-S938N` is live-proven under #3722; exact S `SM-G998N` activation is separately owned by #3761.

The helper requests only:
- android.permission.RECEIVE_BOOT_COMPLETED
- android.permission.ACCESS_NETWORK_STATE
- android.permission.WRITE_SECURE_SETTINGS

WRITE_SECURE_SETTINGS is not self-granted. A later explicit activation may grant it through the already-authorized ADB shell after the exact merged APK is installed.
The app never asks for root, accessibility, overlay, VPN, device-admin, INTERNET, pairing, generic shell, or a fixed TCP/5555 listener.

## Runtime contract

WirelessAdbBootReceiver accepts only the protected system actions LOCKED_BOOT_COMPLETED and BOOT_COMPLETED. Both schedule the same three fixed job IDs, so a later boot broadcast replaces equivalent pending jobs rather than creating an unbounded queue.

The three minimum latencies are fixed at 10 seconds, 60 seconds, and 180 seconds.
Each job runs once. It first requires the current active network to have Android's Wi-Fi transport. Without active Wi-Fi it exits with no setting write.

With active Wi-Fi, the job reads only the literal global key adb_wifi_enabled. If the pre-read is disabled, it requests exactly one fixed Settings.Global.putInt(..., "adb_wifi_enabled", 1), reads that literal key back, and explicitly notifies only the fixed Settings.Global URI when the readback is enabled. If the pre-read is already enabled, it requests exactly two bounded writes on that same literal key: first 0, then a disabled-state readback plus fixed-URI notify, then 1, then an enabled-state readback plus the same fixed-URI notify. Exact-M live evidence proved that same-value writes of 1 were accepted on all three fixed attempts but did not re-arm Wireless ADB, while ordinary manual recovery produced the internal true → false → true transition before adbd restarted. Exact-M ContentService evidence also shows system_server's persistent AdbSettingsObserver is delivered on the immediate observer path, so these explicit notifications sequence the observed 0 then 1 without an arbitrary sleep even if SettingsProvider's automatic notifications are deferred. Security or runtime failure remains fail-closed and the job does not broaden its authority.

Android remains responsible for whether Wireless ADB can actually start, including trusted-network checks, ADB authentication, TLS pairing, mDNS advertisement, and host attachment.

## Bounded diagnostics contract

The #3725 diagnostic revision preserves the recovery effect above and adds only fixed semantic Logcat events under tag `MclWirelessAdbRecovery`.

Allowed event vocabulary is intentionally small:

- `boot_received`: accepted boot action only;
- `job_network`: fixed attempt label plus active-network-present and Wi-Fi-transport booleans;
- `job_result`: fixed no-active-Wi-Fi outcome;
- `setting_pre`: whether `adb_wifi_enabled` equals the fixed enabled value;
- `setting_write_start`: the fixed bounded write sequence after the Wi-Fi gate and pre-read;
- `setting_write_result`: `accepted | rejected` for the current job path; on the stale-true branch `accepted` means both the fixed 0 write and the final fixed 1 write returned accepted; the persistent receipt keeps `not_needed` only as a bounded compatibility/default enum;
- `setting_post`: enabled-state readback;
- `job_exception`: only `SECURITY_EXCEPTION | ILLEGAL_ARGUMENT_EXCEPTION`.

Attempt labels are derived only from the three fixed job IDs and render as `1 | 2 | 3 | unmapped`; the numeric job ID itself is never logged.

Diagnostics never emit SSID, BSSID, IP address, port, serial, pairing/key material, network-object identity, raw Intent extras, exception messages/stacks, arbitrary settings values, or raw Android dumps. They add no permission, component, dependency, file, persistence owner, network transport, or generic logging surface.

The diagnostic revision itself did not introduce OFF→ON forcing. The later #3757 behavioral repair adds only the bounded stale-true 0 → 1 setting sequence, and #3759 adds only fixed-URI observer sequencing around verified 0/1 readbacks so deferred automatic notifications cannot collapse the transition. Neither repair adds a delay loop, persisted job, new permission, new component, caller-selected URI/key/value, or change to the active-Wi-Fi gate.

## Persistent diagnostic receipt

Logcat remains best-effort redundant evidence only. The durable diagnostic owner is the package-private `WirelessAdbDiagnosticReceipt`, which stores one deterministic fixed-schema snapshot in device-protected app-private internal storage.

The owner:
- uses `Context.createDeviceProtectedStorageContext()` and framework `AtomicFile`;
- writes only `files/mcl_wireless_adb_diagnostic_receipt_v1.txt`;
- fully replaces the receipt on every checkpoint rather than appending;
- is capped at 4096 UTF-8 bytes;
- records only activation, boot booleans, and fixed attempt 1/2/3 boolean/enum slots;
- swallows storage/parsing failures so diagnostics never branch, skip, retry, reorder, or broaden recovery behavior.

It never stores timestamps, SSID, BSSID, IP address, port, serial, boot ID, package UID, pairing/key material, raw network identity, raw Intent data, arbitrary settings values, exception messages/stacks, raw Android dumps, free-form text, or caller-controlled keys/values.

The launcher one-shot resets the receipt to a fresh `armed=true` default before the later reboot experiment. LOCKED_BOOT_COMPLETED and BOOT_COMPLETED update only their fixed booleans. Each fixed JobService attempt updates only its own predeclared attempt slot.

For a separately authorized exact-M or exact-S live proof, the fixed retrieval path must be proven readable before reboot and may be read only after the pre-existing paired ADB transport is available:

`adb shell run-as io.hanmiyoo.mcl.wirelessadbrecovery cat /data/user_de/0/io.hanmiyoo.mcl.wirelessadbrecovery/files/mcl_wireless_adb_diagnostic_receipt_v1.txt`

A missing, unreadable, malformed, oversized, or unexpected receipt remains an observability failure. It never counts as recovery success or failure by itself.

## Separately reviewed activation

Exact M `SM-S938N` completed its one-shot live proof under #3722. That proof used the exact merged helper, one WRITE_SECURE_SETTINGS grant, one launcher activation, and one reboot; rollback removed the helper after unattended recovery was proven.

Exact S `SM-G998N` is a separate persistent-activation target under #3761. Repository convergence alone never authorizes S mutation. If S currently has Wireless ADB stopped, one ordinary user Wireless Debugging ON toggle may be used only as the bootstrap prerequisite that restores the existing paired L channel for initial install/grant. That bootstrap is not acceptance evidence.

Only after merge and postmerge convergence, the separately authorized exact-S live phase may:
1. require the existing paired L→S channel, restored only by the bounded bootstrap above when necessary;
2. install the exact merged APK;
3. grant only android.permission.WRITE_SECURE_SETTINGS to io.hanmiyoo.mcl.wirelessadbrecovery;
4. open the launcher activity once so the newly installed package is no longer in Android's stopped state;
5. prove the fixed run-as receipt baseline;
6. reboot exact S once on a known trusted Wi-Fi;
7. verify that Wireless ADB returns and the existing paired L host rediscovers S without adb connect, adb pair, ADB restart, another settings-screen toggle, or a second reboot;
8. read the fixed receipt and require the bounded active-Wi-Fi OFF→ON sequence to complete without exception.

On exact-S success, the helper may remain installed with only WRITE_SECURE_SETTINGS retained so later S reboots can recover unattended. On exact-S failure, rollback is permission revoke plus helper uninstall. The helper never owns pairing creation, adb connect, host-side reconnect loops, or a generic L reconnect daemon.

M↔S symmetric Wireless ADB remains a separate design topic under #3762 and receives no authority from the exact-S activation contract.

## Implementation-stage validation

python3 tests/test_contract.py
gradle :app:assembleDebug
git diff --check

The Gradle build is repository-source validation only. A debug APK produced by IMPLEMENTATION_PR is not an authorized live artifact.

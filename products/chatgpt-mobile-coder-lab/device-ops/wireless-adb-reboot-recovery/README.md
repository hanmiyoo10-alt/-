# MCL Wireless ADB reboot recovery

M-only first implementation proof for #3722.

This owner is a fixed-purpose Android helper for one narrow post-reboot effect:

system boot broadcast
→ bounded JobScheduler attempts
→ active transport is Wi-Fi
→ Settings.Global["adb_wifi_enabled"] = 1
→ Android ADB service keeps trusted-Wi-Fi and TLS-pairing enforcement

It is not a generic settings writer, ADB client, pairing helper, shell bridge, network service, or watchdog.

## Authority boundary

Repository source and tests do not authorize installation or device mutation.
Live activation is a later, separately reviewed phase on exact M only.

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

With active Wi-Fi, the job reads only the literal global key adb_wifi_enabled, then requests exactly one Settings.Global.putInt(..., "adb_wifi_enabled", 1) even when the pre-read already reports 1. This same-value one-write repair is deliberate: exact-M receipt evidence proved that the logical value can remain enabled across reboot while effective Wireless ADB is not re-armed. Security or runtime failure is fail-closed and the job does not broaden its authority. OFF→ON remains a broader deferred fallback and is not performed.

Android remains responsible for whether Wireless ADB can actually start, including trusted-network checks, ADB authentication, TLS pairing, mDNS advertisement, and host attachment.

## Bounded diagnostics contract

The #3725 diagnostic revision preserves the recovery effect above and adds only fixed semantic Logcat events under tag `MclWirelessAdbRecovery`.

Allowed event vocabulary is intentionally small:

- `boot_received`: accepted boot action only;
- `job_network`: fixed attempt label plus active-network-present and Wi-Fi-transport booleans;
- `job_result`: fixed no-active-Wi-Fi outcome;
- `setting_pre`: whether `adb_wifi_enabled` equals the fixed enabled value;
- `setting_write_start`: the fixed single-write attempt after the Wi-Fi gate and pre-read;
- `setting_write_result`: `accepted | rejected` for the current job path; the persistent receipt keeps `not_needed` only as a bounded compatibility/default enum;
- `setting_post`: enabled-state readback;
- `job_exception`: only `SECURITY_EXCEPTION | ILLEGAL_ARGUMENT_EXCEPTION`.

Attempt labels are derived only from the three fixed job IDs and render as `1 | 2 | 3 | unmapped`; the numeric job ID itself is never logged.

Diagnostics never emit SSID, BSSID, IP address, port, serial, pairing/key material, network-object identity, raw Intent extras, exception messages/stacks, arbitrary settings values, or raw Android dumps. They add no permission, component, dependency, file, persistence owner, network transport, or generic logging surface.

The diagnostic revision does not introduce OFF→ON forcing, a second settings write, a retry loop, a persisted job, or any change to the active-Wi-Fi gate.

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

For a separately authorized exact-M live proof, the fixed retrieval path must be proven readable before reboot and may be read only after the pre-existing paired ADB transport is available:

`adb shell run-as io.hanmiyoo.mcl.wirelessadbrecovery cat /data/user_de/0/io.hanmiyoo.mcl.wirelessadbrecovery/files/mcl_wireless_adb_diagnostic_receipt_v1.txt`

A missing, unreadable, malformed, oversized, or unexpected receipt remains an observability failure. It never counts as recovery success or failure by itself.

## One-time future activation

Only after merge and postmerge convergence, a separately authorized exact-M live phase may:
1. install the exact merged APK;
2. grant only android.permission.WRITE_SECURE_SETTINGS to io.hanmiyoo.mcl.wirelessadbrecovery;
3. open the launcher activity once so the newly installed package is no longer in Android's stopped state;
4. reboot M on a known trusted Wi-Fi;
5. verify that Wireless ADB returns and the existing paired L host rediscovers M without adb connect, adb pair, ADB restart, or a settings-screen toggle.

Failure of any step remains evidence. Do not add a wider fallback in response.

## Implementation-stage validation

python3 tests/test_contract.py
gradle :app:assembleDebug
git diff --check

The Gradle build is repository-source validation only. A debug APK produced by IMPLEMENTATION_PR is not an authorized live artifact.

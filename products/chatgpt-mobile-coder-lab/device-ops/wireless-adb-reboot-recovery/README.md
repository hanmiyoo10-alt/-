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

With active Wi-Fi, the job reads only the literal global key adb_wifi_enabled. If it is not already 1, it requests exactly Settings.Global.putInt(..., "adb_wifi_enabled", 1). Security or runtime failure is fail-closed and the job does not broaden its authority.

Android remains responsible for whether Wireless ADB can actually start, including trusted-network checks, ADB authentication, TLS pairing, mDNS advertisement, and host attachment.

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

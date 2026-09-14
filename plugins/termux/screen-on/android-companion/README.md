# Termux Screen On Android Companion

Prototype status: **NON-PRODUCTION**

This is the repository-owned Android effect surface for issue #2202. It exists to remove the runtime dependency on EONSOFT Screen ON after real-device parity is proven.

## Effect surface

The companion owns a 1 x 1 `TYPE_APPLICATION_OVERLAY` window carrying only `FLAG_KEEP_SCREEN_ON`, plus non-focusable/non-touchable flags. It does not use `FLAG_TURN_SCREEN_ON`, mutate `screen_off_timeout`, request INTERNET, use root, or bypass the lock screen.

The user must explicitly grant Android **Display over other apps** permission. The Termux controller opens the package-specific Settings page but cannot grant the permission itself.

## Command boundary

One exported receiver accepts explicit `ON`, `OFF`, and `STATUS` actions. The receiver is protected by `com.termux.permission.RUN_COMMAND`; real-device validation must prove that native Termux can invoke it and that an unprivileged sender cannot before this path is promoted over the existing EONSOFT fallback.

The receiver returns distinct ordered-broadcast result codes so the controller can distinguish overlay attachment from mere ActivityManager transport success. Physical screen-timeout behavior still requires real-device validation.

## Build

The repository workflow `screen-on-android-companion.yml` runs unit tests and builds a debug APK. Source merge or a debug artifact is not production deployment; the Termux production/release authority remains UNKNOWN.

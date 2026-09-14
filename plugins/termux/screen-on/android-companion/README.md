# Termux Screen On Android Companion

Prototype status: **NON-PRODUCTION**

This is the repository-owned Android effect surface for issue #2202. It exists to remove the runtime dependency on EONSOFT Screen ON only after real-device parity is proven.

## Effect surface

The companion owns a 1 x 1 `TYPE_APPLICATION_OVERLAY` carrying `FLAG_KEEP_SCREEN_ON` plus non-focusable/non-touchable flags. It does not use `FLAG_TURN_SCREEN_ON`, mutate `screen_off_timeout`, request INTERNET, use root, or bypass the lock screen.

The user must explicitly grant Android **Display over other apps** permission.

## Pairing and command boundary

The first receiver design incorrectly reused `com.termux.permission.RUN_COMMAND`, which is Termux's inbound command permission and did not admit this device's Termux-originated broadcast. The replacement uses a 256-bit capability token.

The pairing activity is a normal launcher activity because native Termux cannot reliably start an Android activity on the tested Android 16 device. The user explicitly opens the app and taps **Generate one-time pairing code**. That 8-digit code is app-private, valid for two minutes, and consumed by the first pairing attempt whether it succeeds or fails. Termux sends the code with a fresh 256-bit capability token using the explicit `PAIR` action. The companion stores the capability token only after the code is accepted, and ON/OFF/STATUS reject every request whose capability token is missing or does not match. A reinstall clears companion pairing state and therefore fails closed until pairing is repeated.

The receiver returns distinct ordered-broadcast result codes for authorization required, overlay permission required, ON, OFF, and STATUS. Physical screen-timeout behavior still requires real-device validation.

## Build

The repository workflow `screen-on-android-companion.yml` runs unit tests and builds a debug APK. Source merge or a debug artifact is not production deployment; Termux production/release authority remains UNKNOWN.

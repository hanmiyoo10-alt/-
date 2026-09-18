# Mobile Coder Lab GUI Bridge v1

This directory owns the bounded Android GUI host-runner for Mobile Coder Lab.

The runtime composition is:

```text
ordinary ChatGPT
-> existing S-Termux RDC transport
-> mcl-gui
-> device-local abstract UNIX socket
-> MCL GUI Bridge Android companion
-> com.openai.chatgpt
```

RDC is transport only. The Android companion owns GUI effects. This surface does not create repository, Git, CI, merge, release, production, or ChatGPT account authority.

## V1 boundary

The target package is fixed to `com.openai.chatgpt`. V1 uses Android AccessibilityService semantic nodes only:

- exact-window snapshot of bounded actionable metadata;
- exact visible-label lookup;
- unique editable-node lookup;
- `ACTION_CLICK`;
- `ACTION_SET_TEXT`;
- exact-text wait;
- explicit API-34+ `takeScreenshotOfWindow` capture.

There is no caller-selected package, raw-coordinate tap, `dispatchGesture`, `canPerformGestures`, MediaProjection, Playwright/DOM automation, clipboard/history collection, microphone/camera, account management, or chat deletion.

## Consent and privacy

The Android app has no INTERNET permission. The user must accept the in-app disclosure and manually enable the service in Android Accessibility settings.

The bridge never enables itself through secure settings and never unlocks the device. Password nodes and credential/login surfaces fail closed. Normal receipts expose bounded action metadata only. Full conversation trees and response text are not returned. Exact-text waits compare in memory and return only a match disposition.

Screenshots are opt-in. The Android side sends screenshot bytes only for an explicit `snapshot --screenshot` request. The Termux CLI writes them to an MCL-owned private temporary directory, prints the path/hash, and the caller must remove the file immediately after RDC image read-back.

## IPC

Production uses the Linux abstract UNIX-domain socket name `mcl-gui-v1`.

The Android server verifies `LocalSocket.getPeerCredentials().getUid()` against the installed `com.termux` UID before processing any request. Failure is `BLOCKED_PEER_IDENTITY`.

One connection carries one newline-delimited JSON request and one newline-delimited JSON response. Request size and user-supplied text are bounded.

## CLI

```text
./mcl-gui status
./mcl-gui launch-chatgpt
./mcl-gui snapshot
./mcl-gui snapshot --screenshot
./mcl-gui find-action "New chat"
./mcl-gui click <snapshot-handle>
./mcl-gui find-editable
./mcl-gui set-text <snapshot-handle> <bounded-text>
./mcl-gui wait-text <exact-text> <seconds>
```

Handles bind to the current snapshot generation, window id, and fixed target package. A newer snapshot or changed window makes an old handle `STALE_SNAPSHOT`.

## Fail-closed states

Important dispositions include:

`BLOCKED_USER_PERMISSION`, `BLOCKED_LOCKED`, `BLOCKED_SECURE_WINDOW`, `BLOCKED_TARGET_PACKAGE`, `BLOCKED_UI_NOT_ACCESSIBLE`, `BLOCKED_ACCOUNT_SURFACE`, `BLOCKED_PEER_IDENTITY`, `STALE_SNAPSHOT`, `NOT_FOUND`, and `AMBIGUOUS`.

No fallback to coordinates, DOM automation, login automation, or access-control bypass is permitted.

## Build and test

```sh
python3 -m unittest discover -s products/chatgpt-mobile-coder-lab/device-ops/gui-bridge/tests -v
gradle -p products/chatgpt-mobile-coder-lab/device-ops/gui-bridge/android-companion :app:testDebugUnitTest
gradle -p products/chatgpt-mobile-coder-lab/device-ops/gui-bridge/android-companion :app:assembleDebug
```

The dedicated GitHub Actions workflow builds a debug APK as an artifact. Source/CI success does not install the APK and does not prove the live ChatGPT GUI capability.

The first live acceptance is owned by #2450/#2448 and is limited to one harmless fresh-chat probe returning `GUI_BRIDGE_PROBE_OK`.

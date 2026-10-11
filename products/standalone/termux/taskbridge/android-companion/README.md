# TaskBridge ChatGPT Foreground Signal Companion

Experimental Android companion for TaskBridge response-timer foreground completion detection.

## Purpose

The normal ChatGPT Android completion notification can arrive late. This companion uses an explicitly user-enabled Android AccessibilityService while ChatGPT is in the foreground. It watches only `com.openai.chatgpt` accessibility events and looks for a clickable Stop/생성 중지 control becoming visible and then disappearing. It then posts a local notification with package `io.taskbridge.chatgptsignal` and notification id `742001`.

TaskBridge reads that dedicated notification through the already-supported `termux-notification-list` path. The TaskBridge fingerprint excludes notification title/content/lines and uses only package/id/key/time metadata.

## Privacy boundary

- No INTERNET permission.
- No ChatGPT account/session/cookie/API access.
- No response body is persisted or transmitted.
- The service only asks Android for events from package `com.openai.chatgpt`.
- Node text/content-description is inspected in memory only for clickable/button-like Stop controls; it is never logged or stored.
- The user must give in-app consent and separately enable the accessibility service in Android Settings.
- The accessibility permission can be disabled at any time.

## Reliability boundary

This is a local UI signal, not an official ChatGPT completion API. ChatGPT UI labels/view IDs can change. The manual TaskBridge `완료` notification action remains the fallback. Background completion continues to use the locally calibrated ChatGPT notification observer.

## Google Play policy note

This app is **not** an accessibility tool (`isAccessibilityTool=false`). If distributed through Google Play, its AccessibilityService use requires the applicable Play Console declaration plus prominent in-app disclosure and affirmative consent. The current app includes an in-app disclosure/consent screen, but publication compliance must still be reviewed at release time.

## Build

The repository workflow `taskbridge-android-companion.yml` runs unit tests and builds a debug APK. Source-only merge does not mean a production/release APK has been deployed.

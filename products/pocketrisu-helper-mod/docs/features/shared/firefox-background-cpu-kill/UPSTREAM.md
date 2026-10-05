# Upstream PR dossier — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `INVESTIGATING_FIX`

## Problem / motivation
On Android/Samsung, PocketRisu's sound-based keep-session-alive path can keep Firefox media/content work active while the app is cached. Android ActivityManager has been observed killing the corresponding Gecko tab process for `excessive cpu`, after which Firefox recreates the content process on resume and PocketRisu visibly reconstructs the document.

## Minimal upstream scope
Prevent the continuous sound keep-alive loop from starting on Android Firefox, while preserving the existing behavior on other platforms.

Touch only the smallest client-side keep-session-alive boundary needed for that platform guard.

## Dependencies
- existing `keepSessionAlive` setting
- existing browser/platform detection helpers
- no dependency on server session-lock or DB persistence changes

## Explicitly out of scope
- server restart/health-stall investigation
- SSH tunnel supervision
- stale-writer/session-lock protocol
- forced save/flush on hide/pagehide
- V3 iframe redesign
- general plugin CPU throttling
- Android notification behavior

## Verification evidence
Real-device evidence on SM-S938N / Android 16:
- Firefox main process survived.
- Gecko tab process correlated with PocketRisu reconstruction was later killed by ActivityManager for `excessive cpu`.
- Firefox utility process was killed in the same sweep for `excessive cpu`.
- current PocketRisu DB has `keepSessionAlive: sound`.
- sound mode implementation loops a 2.325 s, 44.1 kHz stereo MP3 continuously.
- Android AudioService shows Firefox AAudio media playback active and background playback hardening events.
- persistence and server process remain healthy across the reconstruction.

## Upstream pitch
The keep-alive option is intended to prevent background expiry, but on Android Firefox continuous media playback can instead keep cached Gecko work active long enough for the OS to kill the tab for excessive CPU. Avoiding the continuous sound loop on that platform prevents the keep-alive feature from causing the reconstruction it is meant to avoid.

## Review / PR state
- official upstream currently contains the same continuous sound-loop implementation in `src/App.svelte`.
- next action: verify the Android Firefox guard locally before preparing an official upstream PR.

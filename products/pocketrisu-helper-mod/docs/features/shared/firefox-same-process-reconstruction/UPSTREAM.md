# Upstream PR dossier — firefox-same-process-reconstruction

Feature-ID: `firefox-same-process-reconstruction`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `LOCAL_DIAGNOSTIC_DEPLOYED`

## Problem / motivation
PocketRisu can visibly reconstruct on Android Firefox even when Firefox main and Gecko tab process PIDs survive unchanged. This is distinct from the Android `excessive cpu` Gecko process kill mechanism.

## Minimal upstream scope
Investigation only. No product behavior change until document-level navigation is classified.

## Dependencies
- independent from `firefox-background-cpu-kill`
- locally composed with that fix only on `deploy/termux-pocketrisu`
- no server/session-lock behavior change

## Explicitly out of scope
- sound keep-alive fix
- V3/plugin CPU throttling
- server restart recovery
- writer-lock semantics
- forced save/flush

## Verification evidence
2026-10-06 16:49 KST:
- Firefox main/tab PID set unchanged through the incident.
- no Firefox process kill/start event at incident time.
- PocketRisu server received a new session boot.
- client initialization warnings reappeared.
- runtime-static `NodeStorage.sessionInitialized` has no production reset path.

Diagnostic candidate:
- branch `feat/firefox-same-process-reconstruction`
- commit `2ca8dc4a92e8533d983a90f6d2aca63cb4bf8224`
- one tracked file: `src/ts/log-capture.ts`
- check/build PASS
- no product behavior change

## Upstream pitch
None yet. Root navigation mechanism must be confirmed first.

## Review / PR state
- local diagnostic deployed in composite deploy HEAD `dc7ea7583094231c99d67146aaf9b81d2e8f57a0`.
- next action: collect one natural recurrence with navType/timeOrigin/pageshow/pagehide evidence.

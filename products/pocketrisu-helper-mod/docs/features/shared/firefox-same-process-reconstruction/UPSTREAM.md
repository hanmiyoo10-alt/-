# Upstream PR dossier — firefox-same-process-reconstruction

Feature-ID: `firefox-same-process-reconstruction`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `DIAGNOSTIC_ONLY`

## Problem / motivation
PocketRisu can visibly reconstruct on Android Firefox even when Firefox main and Gecko tab process PIDs survive unchanged. This is distinct from the already observed Android `excessive cpu` Gecko process kill mechanism.

## Minimal upstream scope
Investigation only. Add no product behavior change until the document-level navigation mechanism is confirmed.

## Dependencies
- independent from `firefox-background-cpu-kill`
- may be deployed together on the local composite deploy branch
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

## Upstream pitch
None yet. Root navigation mechanism must be confirmed first.

## Review / PR state
- next action: restore minimal lifecycle/navType instrumentation and collect one natural recurrence.

# Upstream PR dossier — session-write-lock

Feature-ID: `session-write-lock`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `LEGACY_MIXED`
Deployment status: `NOT_READY`
## Problem / motivation
Prevent stale/background sessions from stealing cross-device writer ownership.
## Minimal upstream scope
TODO isolate session identity, user-gesture gating and lock-status behavior.
## Dependencies
NodeOnly auth/session server behavior.
## Verification evidence
README has current observed semantics; more regression tests needed.
## Upstream pitch
Potential Node/self-host upstream candidate after separation.
## Review / PR state
- next action: finish sessionInitialized investigation before PR design.

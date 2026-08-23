# Upstream PR dossier — long-chat-refresh-stall

Feature-ID: `long-chat-refresh-stall`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `NOT_READY`
## Problem / motivation
Long-chat refresh can temporarily stall health despite server PID/SSH remaining alive.
## Minimal upstream scope
Investigation only; no implementation yet.
## Dependencies
DB/load/render findings may create separate feature IDs instead of growing this one indefinitely.
## Verification evidence
README has current exclusions/observations.
## Upstream pitch
Only after root cause is confirmed.
## Review / PR state
- next action: identify blocking path before proposing code.

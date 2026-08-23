# Upstream PR dossier — plugin-targeted-reload

Feature-ID: `plugin-targeted-reload`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `LEGACY_MIXED`
Deployment status: `NOT_READY`
## Problem / motivation
Avoid full plugin reload when only a V3 plugin needs reload.
## Minimal upstream scope
TODO: exact V3 reload path and persistence ordering.
## Dependencies
Plugin import/update persistence behavior.
## Verification evidence
TODO reconstruct from source diff/tests.
## Upstream pitch
Good candidate if separated from NodeOnly-specific save behavior.
## Review / PR state
- next action: isolate targeted reload from unrelated plugin changes.

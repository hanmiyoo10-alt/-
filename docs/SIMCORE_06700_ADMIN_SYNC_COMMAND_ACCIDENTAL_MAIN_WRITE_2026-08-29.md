# SimCore v0.67 admin sync command accidental main-write incident

Date: 2026-08-29 KST
Status: **FIX · ADMIN/TRANSPORT ONLY · NO RUNTIME OR RELEASE-SIMCORE MUTATION**

During preparation of the transport-only `SimCore durable memory sync command` PR, the command payload was accidentally created directly on `main` instead of on a command branch because the requested branch did not yet exist.

Affected path:

`products/simcore/state-sync/commands/simcore-v0.67.0-live-pass-sync.json`

This file is transport-only and must not become durable main authority. It did not trigger the PR-only durable-memory sync path and did not mutate `release-simcore`, runtime bytes, product validation state, checkpoint, or current priority.

Disposition:

```text
classification = FIX
runtime mutation = NONE
release-simcore mutation = NONE
machine live-state mutation = NONE
repair = delete accidental durable command payload from main, then recreate on dedicated command branch
```

The registered one-shot administrative transition remains the intended durable authority for the subsequent state-sync execution.

# BaseCore Development Instructions

Use this file as the entry point for BaseCore development work.

## Session boot

Before proposing or making a BaseCore change, read these BaseCore-owned files in order:

1. `products/basecore/README.md`
2. `products/basecore/manifest.json`
3. `products/basecore/CURRENT_DEVELOPMENT.md`
4. `products/basecore/GUIDELINES.md`
5. `products/basecore/GOVERNANCE.md`
6. the relevant BaseCore runtime source under `plugins/basecore/`

Do not infer BaseCore's current state from SimCore documents or from old chat memory when the BaseCore repository record is available.

## Product boundary

BaseCore is an independent Narrative-only product. Treat SimCore only as historical donor/reference material when explicitly needed.

Never use these as BaseCore runtime state or compatibility fallback:

- `sim:core:*`
- `$simcore_core_*`
- `<SIMCORE_CORE_SWITCH>`
- SimCore runtime singleton/state
- SimCore production manifest/current-development state

BaseCore owns:

- plugin identity `basecore`
- storage prefix `basecore:state:*`
- mirror `$basecore_state`
- handshake `<BASECORE_SWITCH>1</BASECORE_SWITCH>`
- release branch `release-basecore`
- product memory under `products/basecore/`

## Change discipline

- Preserve the frozen Narrative/time/frame behavior unless BaseCore-specific evidence proves a change is necessary.
- Do not reintroduce mode routing, Broadcast, Mode C, COMMUNITY, exposure, reaction, lineage, handoff, or evidence fencing by default.
- Make the smallest change that addresses the observed BaseCore problem.
- Separate static/local fixture evidence from real PocketRisu/live evidence.
- Never describe an unrun validation gate as passed.

## Durable memory rule

If a work session changes runtime behavior, architecture ownership, state schema/namespace, prompt contract, release behavior, or validation status, update BaseCore durable memory in the same work session.

At minimum update `products/basecore/CURRENT_DEVELOPMENT.md`; update `GUIDELINES.md`, `GOVERNANCE.md`, or `manifest.json` when their durable contract changes.

Release-specific production identity is machine-synchronized after a `release-basecore` update. Do not manually duplicate machine-owned snapshot values in unrelated files.

# LEGACY-PLUGIN-INSTALL-GATE-DEFAULT-DENY

Status: ADOPTED

## Invariant

Deprecated plugin install/update paths should be default-deny. If PocketRisu intentionally keeps a compatibility escape hatch, it must be explicit, default-off, narrowly scoped, and must not disable the remaining safety validation for that plugin generation.

## PocketRisu evidence

`PocketRisu/PocketRisu@127b975dd8ba8fc6ec34c8e3048052b94a1fa47c` adopted the V2.1 slice by adding `allowV21Plugin` with a false default. New V2.1 installs/updates are rejected unless the user opts in; when opted in, the existing V2.1 safety check still applies. Already-installed V2.1 runtime loading was intentionally left unchanged to avoid a surprise destructive compatibility break.

Current durable-tip inspection at `ca09a80746e74e5334145e5e78af47ce423e0eba` confirms the setting and gate remain present.

## Required compatibility boundaries

- opt-in remains default false;
- install/update permission is distinct from runtime loading of already-installed legacy plugins;
- opting in does not bypass V2.1 code-safety validation;
- do not broaden this exception to unrelated legacy plugin generations or V3 capabilities;
- preserve targeted V3 plugin reload behavior;
- retirement changes must remain reversible by configuration or code revert until an explicit breaking-migration decision is made.

## Validation

Check denial while disabled, successful traversal to the safety check while enabled, unchanged runtime loading for existing V2.1 plugins, and unchanged V3 install/reload paths.

## History

Source direction: `kwaroran/Risuai@839d190b`.
PocketRisu adoption: `127b975dd8ba8fc6ec34c8e3048052b94a1fa47c`.
Durable classification record: `hanmiyoo10-alt/PocketRisu:notes/external-risu-dev-watch/notes/idea-ledger-addenda/2026-09-03-2037-legacy-plugin-install-gate-adopted.md`.

# Voyage Token Check — Update Contract

## Goal

Voyage Token Check should follow the repository's existing RisuAI plugin update channel instead of inventing a separate updater.

Normal user experience:

`Risu detects a newer plugin version → green + appears → user confirms → latest release is installed`

This is **automatic update discovery with user-approved installation**, not silent background replacement.

## Verified host behavior

RisuAI plugin update behavior currently works as follows:

1. A plugin declares an HTTPS `//@update-url` and a `//@version`.
2. Risu checks the update URL with a bounded Range request for the first 512 bytes.
3. Risu parses `//@version` from that prefix and compares it against the installed plugin version.
4. If the remote version is newer, Plugin Settings shows a green `+` update action.
5. Clicking the update action asks the user for confirmation.
6. After confirmation, Risu fetches the full update URL and imports it as an update of the existing plugin.
7. The plugin's internal `//@name` must remain stable across updates.

## Repository release pattern

Voyage Token Check should use the same stable-path pattern already used by this repository:

```text
plugins/voyage-token-check/
  install.js
  latest.js
```

`install.js` is the initial install artifact and should declare:

```text
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/voyage-token-check/latest.js
```

`latest.js` remains at the same path for every release. Releases update the file contents and monotonically increase `//@version`; the update URL itself does not change.

The exact production plugin path remains unverified until implementation/release work establishes it from repository evidence. The path above is therefore the intended release layout, not yet a production claim.

## Version metadata rules

- Keep `//@name` stable after first release.
- Keep `//@version` within the first 512 bytes so Risu can detect updates.
- Use monotonically increasing semantic versions.
- Keep `//@update-url` HTTPS and stable.
- Never repoint the update URL to a development branch for a production release.
- Do not publish a newer version until its release artifact has passed the relevant regression and artifact checks.
- Rollback should restore a known-good artifact without creating a downgrade path that silently overrides a newer installed version; follow the project's monotonic-production rule.

## Relationship to model discovery

Plugin updates and Voyage model discovery are separate concerns:

- New Voyage model with an already-supported data shape → runtime data discovery; no plugin release should be required.
- New Voyage quota/usage schema, endpoint contract, or host API behavior → plugin release may be required.

This keeps routine model additions from forcing unnecessary plugin updates.

## Security

The update artifact must contain no API keys, sessions, cookies, authorization headers, bridge tokens, personal organization/project IDs, or other user secrets.

Update checks and release artifacts must follow `SECURITY_CONTRACT.md`.

## Current verdict

- VERIFIED: Risu supports `//@update-url` + `//@version` update discovery.
- VERIFIED: a newer version produces a green `+` action in Plugin Settings; clicking it and confirming invokes the host update path.
- VERIFIED: this repository already uses stable `latest.js` update URLs for its plugin release channel.
- DESIGN DECISION: Voyage Token Check will reuse this update contract rather than implement a custom updater.

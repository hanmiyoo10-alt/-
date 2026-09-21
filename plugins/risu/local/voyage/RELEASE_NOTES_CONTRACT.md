# Voyage Token Check — Release Notes Contract

## Goal

When Voyage Token Check is updated, the user should be able to see a short, useful summary of what changed without leaving the plugin.

Normal interaction:

`plugin updated → open plugin → tap Update notes → see the current release highlights`

The release-notes experience complements Risu's existing green `+` update flow. It does not replace the host update mechanism.

## UX contract

The plugin should expose an **Update notes** / **What's new** action in its normal UI.

The current release view should be intentionally short:

- version;
- release date when available;
- 2–5 high-signal highlights;
- optional compatibility/security note only when materially relevant.

Do not turn the in-plugin view into a full commit log, issue list, or developer changelog.

Example shape:

```text
v1.2.0
- Added automatic discovery of new Voyage models
- Improved quota/usage source labeling
- Made temporary source failures clearer
```

## New-release indication

The plugin should remember the last release-notes version the user has viewed using plugin-local storage.

When the installed plugin version is newer than the last-viewed notes version:

- the Update notes action may show a small `NEW` indicator;
- opening the notes marks that installed version as viewed;
- dismissing the notes must not affect plugin behavior or update state.

This state is local UX state only. It must contain no account credentials, Voyage identifiers, or sensitive telemetry.

## Release-note source design

The currently installed artifact should contain a compact release-note payload for its own version so the latest notes remain available even if a remote changelog cannot be reached.

Conceptual contract:

```text
ReleaseNote
- version
- releasedAt?
- highlights[2..5]
- compatibilityNote?
- securityNote?
```

The exact implementation representation may change, but the installed version and its displayed note must stay consistent.

A longer public history may additionally live in a repository changelog later, but the plugin must not depend on downloading a full remote history just to explain the version that is already installed.

## Release engineering rules

For every plugin release that changes user-visible behavior:

1. increment `//@version` monotonically;
2. update the compact release-note payload for the same version;
3. validate that the release-note version exactly matches `//@version`;
4. keep the notes concise and user-facing;
5. build/materialize the release artifact from canonical source;
6. validate syntax, version/update metadata, and release-note consistency before publication.

CI should eventually reject a release when:

- `//@version` and the current release-note version differ;
- the release-note payload is missing for a user-visible release;
- the release artifact contains forbidden sensitive information.

## Relationship to model discovery

Runtime discovery of a new Voyage model does not itself require a plugin release and therefore does not require a new plugin release note.

A release note is needed when plugin code or its supported contracts change, for example:

- support for a new Voyage response/schema shape;
- a new authoritative quota provider;
- UI/diagnostic behavior changes;
- compatibility or security fixes.

## Security and privacy

Release notes must never contain:

- API keys or key fragments;
- cookies, sessions, authorization headers, or bridge tokens;
- personal organization/project IDs;
- raw user usage data;
- diagnostic payloads that could identify an account.

Only product-level change summaries belong in release notes.

## Design decision

Voyage Token Check will provide an in-plugin Update notes button backed by a compact note for the currently installed release, with an optional local `NEW` indicator until that version's notes are viewed.

The host's existing `//@update-url` + green `+` update flow remains the installation mechanism; release notes explain the result after installation.

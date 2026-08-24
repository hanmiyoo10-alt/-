# Termux Plugin Route

Date: 2026-08-24
Status: RESERVED · NON-RUNTIME
Scope: `plugins/termux/`

## Purpose

Reserve an independent plugin root for the Termux customization project without changing any existing plugin runtime or release path.

```text
plugins/
  termux/
```

## Durable operating contract

All Termux plugin development, diagnostic, release, evidence, regression, and production-handling work must follow:

`docs/TERMUX_DEVELOPMENT_GUIDELINES.md`

Repository-driven project-memory and production-state synchronization must follow:

`docs/TERMUX_REPO_AUTOMATION.md`

These repository documents are the durable project memory and take precedence over conversation memory for project operating rules. Production state must still be re-read from the actual repository/release artifacts rather than inferred from memory.

## Current state

- The route is intentionally empty except for `.gitkeep`.
- No `latest.js` or `install.js` is published yet.
- No Termux production release branch, production manifest, or production version has been established yet; preserve these as `UNKNOWN` until repository evidence establishes them.
- Existing plugin paths such as `plugins/simcore/`, `plugins/devpass/`, and `plugins/usage-dashboard/` are untouched.
- No credentials, tokens, session data, or private configuration belong in this route.

## Future use

When the Termux-side plugin artifact is ready, publish it under this fixed root and keep any updater URL stable. Runtime or installer files should only be added after they are complete enough to be treated as release artifacts.

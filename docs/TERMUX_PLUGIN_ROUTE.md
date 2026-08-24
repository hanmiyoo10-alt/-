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

## Current state

- The route is intentionally empty except for `.gitkeep`.
- No `latest.js` or `install.js` is published yet.
- Existing plugin paths such as `plugins/simcore/`, `plugins/devpass/`, and `plugins/usage-dashboard/` are untouched.
- No credentials, tokens, session data, or private configuration belong in this route.

## Future use

When the Termux-side plugin artifact is ready, publish it under this fixed root and keep any updater URL stable. Runtime or installer files should only be added after they are complete enough to be treated as release artifacts.

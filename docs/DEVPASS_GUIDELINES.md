# DevPass — Development & Operations Guidelines

This document registers DevPass with canonical-main without replacing its existing update-channel implementation.

- Canonical project root: `plugins/devpass/`
- Declared update-channel authority: `plugins/devpass/README.md`
- Published artifact locator: `plugins/devpass/latest.js`
- Durable-memory profile: `check-only`

The existing DevPass update channel remains authoritative. Bootstrap registration adds locators and validation only; it does not create a new release branch, publisher, or main writer.

## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `UNKNOWN — read the artifact/update-channel evidence`
- Release branch: `main` (declared update channel, not a separately registered release authority)
- Source: `plugins/devpass/README.md`
<!-- PLUGIN_RELEASE_STATE_END -->

This block is intentionally not machine-written while the profile remains `check-only`.

## Operating contract

1. Preserve the fixed GitHub HTTPS update-channel contract documented in `plugins/devpass/README.md`.
2. Never commit API keys, session/cookie data, bridge tokens, organization/project identifiers, or other secrets.
3. Do not infer a new production/release authority from bootstrap metadata.
4. Validate the actual `latest.js` artifact before making claims about current published behavior/version.
5. Any future writable durable-memory profile requires an explicit migration, bounded outputs, Required-gated main writes, and proof that it does not duplicate the existing update channel.

## Automation boundary

Canonical-main may check the declared evidence/artifact paths. It must not publish or rewrite DevPass merely to make bootstrap status green.

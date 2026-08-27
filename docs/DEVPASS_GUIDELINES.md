# DevPass — Development & Operations Guidelines

This document registers DevPass with canonical-main without replacing its existing update-channel implementation.

- Canonical project root: `plugins/devpass/`
- Declared update-channel evidence: `plugins/devpass/README.md`
- Declared artifact locator in the repository registry: `plugins/devpass/latest.js`
- Current observed artifact state: `DECLARED_MISSING`
- Durable-memory profile: `check-only`

The existing DevPass declaration remains authoritative evidence. Bootstrap registration adds locators and validation only; it does not create the currently missing artifact, a new release branch, publisher, or main writer.

## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference; do not copy the common-rule body into this document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth; those facts remain owned by the project-specific authority/evidence declared here.

## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `UNKNOWN`
- Release branch: `main` (declared update channel, not a separately registered release authority)
- Source: `plugins/devpass/README.md`
<!-- PLUGIN_RELEASE_STATE_END -->

This block is intentionally not machine-written while the profile remains `check-only`.

## Operating contract

1. Preserve the fixed GitHub HTTPS update-channel declaration documented in `plugins/devpass/README.md`.
2. `plugins/devpass/latest.js` being declared does not make it present; current control-plane evidence reports `DECLARED_MISSING`.
3. Never create a placeholder artifact merely to make bootstrap validation green.
4. Never commit API keys, session/cookie data, bridge tokens, organization/project identifiers, or other secrets.
5. Do not infer a new production/release authority from bootstrap metadata.
6. If `latest.js` later exists, validate the actual artifact before making claims about current published behavior/version.
7. Any future writable durable-memory profile requires an explicit migration, bounded outputs, Required-gated main writes, and proof that it does not duplicate the existing update channel.

## Automation boundary

Canonical-main validates the evidence path used by the check-only descriptor. The registry may continue to surface the separately declared missing artifact as operational evidence. Canonical-main must not publish or rewrite DevPass merely to make bootstrap status green.

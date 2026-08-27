# Voyage Token Check — Development & Operations Guidelines

This document is the canonical bootstrap and operating contract for Voyage Token Check in `hanmiyoo10-alt/-`.

- Canonical project root: `voyage-token-check/`
- Current authority class: design/evidence
- Authority evidence: `voyage-token-check/DESIGN_STATUS.md`
- Detailed project/design memory: `voyage-token-check/PROJECT_MEMORY.md`
- Durable-memory profile: `check-only`

Do not infer production state, release identity, or a deployable plugin path from conversation history or from the existence of the project-memory directory. Until production authority is explicitly registered, unknown production fields remain UNKNOWN.

## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference; do not copy the common-rule body into this document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth; those facts remain owned by the project-specific authority/evidence declared here.

## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `UNKNOWN`
- Release branch: `UNKNOWN`
- Source: `voyage-token-check/DESIGN_STATUS.md`
<!-- PLUGIN_RELEASE_STATE_END -->

This block is intentionally not machine-written while the project is `check-only`.

## Operating contract

1. Read repository evidence before design or implementation work.
2. Treat `DESIGN_STATUS.md` as the current authority locator for lifecycle/evidence, not as a production manifest.
3. Preserve `PROJECT_MEMORY.md` as detailed project context; it is not production/release authority.
4. Do not create a release branch, manifest, deployment workflow, or writable memory sync merely to satisfy bootstrap registration.
5. Any future transition from `check-only` to a writable profile is an explicit reviewed migration with its own authority proof and output allowlist.
6. UNKNOWN must stay UNKNOWN until repository or real-device evidence proves otherwise.

## Automation boundary

Canonical-main may validate this document and its declared locators. It must not overwrite this document or mutate production/release state while the profile remains `check-only`.

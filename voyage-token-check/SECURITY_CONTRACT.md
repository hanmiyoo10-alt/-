# Voyage Token Check — Security Contract

This document records non-negotiable security requirements for the plugin and any future distribution path.

## Core rule

Sensitive authentication material must never be included in source code, repository history, release artifacts, diagnostics, logs, screenshots, exported state, or documentation examples.

This includes, at minimum:

- Voyage API keys
- session tokens
- cookies
- bearer/access/refresh tokens
- account or project secrets
- copied authentication headers
- any equivalent credential material

## Runtime handling

- Authentication material should remain user-local whenever the host/runtime architecture permits.
- The plugin should consume credentials only through the host's established secure configuration/runtime path rather than embedding or redistributing them.
- Do not persist raw credentials in plugin-owned cache or telemetry.
- Do not print credentials or full authentication headers in normal or diagnostic logs.
- Diagnostics must redact or omit sensitive values by default.
- Release artifacts must be usable without containing the developer's or another user's credentials.

## Distribution gate

Public distribution and private distribution share the same credential-safety boundary.

Private use is not an exception that permits committing, bundling, copying, or exporting secrets.

A distribution design is acceptable only if each user can supply or inherit their own authorized authentication locally without exposing that material through the plugin package or repository.

## Data minimization

Store and display only the minimum account/quota metadata required for the product goal. Avoid retaining raw upstream payloads when normalized non-sensitive fields are sufficient.

## Evidence state

- VERIFIED: sensitive information must not be included in the plugin source, repository, logs, diagnostics, or distribution artifacts.
- VERIFIED: this constraint applies to both public and private distribution.
- UNKNOWN: the final host/runtime credential access mechanism for Voyage Token Check; verify it from the actual plugin environment before implementation.

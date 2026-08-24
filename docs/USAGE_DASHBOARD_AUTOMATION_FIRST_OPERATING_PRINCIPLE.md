# Local Usage Dashboard — Automation-First GitHub Operating Principle

Status: **ACTIVE OPERATING PRINCIPLE**

Recorded: `2026-08-24`

This document is durable project memory for Local Usage Dashboard and must be read together with `docs/USAGE_DASHBOARD_GUIDELINES.md`.

## Principle

Routine Local Usage Dashboard development and release work should not default to asking the user to configure or operate GitHub manually.

Before requesting any GitHub UI action, repository setting change, workflow dispatch, branch action, PR action, merge action, CI action, release action, or other manual GitHub step from the user, ChatGPT must first exhaust the capabilities already available through the connected GitHub tooling, GitHub APIs exposed by those tools, repository-side automation, existing trusted control workflows, and safe combinations of those mechanisms.

The working assumption is that the currently available tool surface is often sufficient to replace manual GitHub setup or UI interaction, even when there is no single obvious first-class action for the exact operation.

## Required order of operations

1. Inspect the current repository and release state.
2. Inspect the GitHub actions/tools actually available in the current session instead of relying on remembered tool gaps.
3. Prefer a direct connected GitHub action when available.
4. If no direct action exists, look for a safe repository-side or API-backed automation path using existing trusted workflows and permissions.
5. Preserve least privilege, exact-SHA/CAS checks, monotonic release guards, and the existing candidate/write-token isolation model.
6. Ask the user for a manual GitHub UI action only when the required operation genuinely cannot be completed safely with the available tool/API/automation surface.
7. When a manual action is genuinely unavoidable, minimize it to one clearly specified user interaction and resume automation immediately afterward.

## What this does not allow

Automation-first does not mean bypassing repository safety contracts, weakening branch/release protections, inventing unsupported APIs, creating temporary privileged backdoors, or trading correctness for convenience.

A manual step may still be required when the available authenticated surface truly lacks the needed mutation or when GitHub itself requires an account-owner interaction. That conclusion must be based on a fresh capability check, not on an old assumption from a previous chat or release.

## User interaction target

The desired steady state remains:

`ChatGPT handles repository work → user presses PocketRisu + → user performs real-device verification only when required.`

GitHub UI work by the user is an exception, not part of the normal Local Usage Dashboard release procedure.

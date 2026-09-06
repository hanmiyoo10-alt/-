# Canonical Main STATUS_SESSION Composition v1

This document maps the existing Work System `STATUS_SESSION` read plan to a bounded one-call transport. It does not change authority ownership or create a new status authority.

## Existing semantic read plan

The semantic inputs remain exactly:

1. direct current `main`;
2. issue #485 Canonical Operator Capsule.

Direct `main` is repository authority. #485 is a derived operator projection. The composition result is transport/output only and must expose both source identities.

## One-call transport

A repository-owned MCP surface may satisfy a routine `STATUS_SESSION` through one user-visible tool call when that call internally:

1. reads direct `main` and captures the exact SHA;
2. reads #485 and parses the bounded Canonical Operator Capsule;
3. re-reads direct `main` as a capture-coherence barrier;
4. returns `CURRENT` only when both direct-main reads match and #485 renders that exact SHA.

The final barrier is an extra coherence check, not a third authority.

## Fail-closed dispositions

- exact stable match: `CURRENT`;
- stable direct main but #485 renders another SHA: `SETTLING_OR_STALE`;
- main moves during capture: `UNKNOWN`;
- missing/invalid capsule, invalid issue state, or read failure: `UNKNOWN`.

No missing or stale evidence becomes green-by-absence. `UNKNOWN`, conflict, and drill-down locators must survive compaction.

## Mutation boundary

The composition surface is read-only. It does not write issues, refs, branches, PRs, workflows, releases, production, runtime, #465, or durable memory. It grants no merge, release, protection, production, or project/runtime authority.

The existing mutating/staging canonical-main session-start composition is a different workflow and is not reused as the status writer.

## Compactness objective

Routine status/orientation changes from two user-visible repository reads to one composed call. Internal reads remain bounded and auditable. This objective concerns the repository-owned payload/fan-out presented to ChatGPT; it does not claim control over whether the ChatGPT product renders an activity card.

<!-- canonical-main-status-session-compose:v1 -->

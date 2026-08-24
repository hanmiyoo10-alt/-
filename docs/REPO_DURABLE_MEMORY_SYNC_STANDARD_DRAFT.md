# Canonical Main Durable Memory Sync Standard — Draft 0

Status: DESIGN DRAFT · NON-RUNTIME

## Goal

Define one repository-level contract for machine-maintained durable project memory while preserving human-maintained operating guidance.

## Core rule

Automation may update only explicitly bounded machine-owned blocks or project-declared renderer targets. Human-maintained durable guidance must not be replaced wholesale by routine sync.

## Memory classes

1. Human durable contract: scope, operating principles, evidence language, stable contracts, roadmap, interaction discipline.
2. Machine current facts: production version, release/ref identity, manifest/artifact authority, deterministic baseline fields.
3. Project-specific derived state: allowed only through an explicit renderer contract and allowlist.

## Source priority

Production release artifacts / production manifest > canonical main source > real-device evidence > tests/workflows > durable docs > hypotheses.

Unknown values remain UNKNOWN/absent. Never synthesize missing production facts.

## Required project binding

Each onboarded project declares:

- project id
- guidelines path
- authority locator(s)
- machine block marker(s) or renderer target registry
- sync trigger source(s)
- output allowlist
- validation command
- canonical-main write binding

## Sync transaction

authority event
→ resolve exact immutable authority identity
→ render in temporary workspace
→ validate machine block/targets
→ verify diff is inside allowlist
→ no-op if unchanged
→ create bounded payload commit
→ pass canonical required gate
→ fast-forward through repo-main-write
→ emit sync receipt

## Safety invariants

- no full-document rewrite unless the project explicitly owns a deterministic renderer for that document;
- no writes outside declared memory outputs;
- no production branch mutation from memory sync;
- no force-push main;
- stale authority identities must not overwrite newer state;
- repeated identical sync is idempotent;
- malformed or duplicate block markers fail closed;
- authority changes require explicit migration, not silent retargeting.

## Standard block

Default machine-owned block:

```md
<!-- PLUGIN_RELEASE_STATE_START -->
- Product: <resolved production version>
- Release branch: <resolved release branch/ref>
- Source: <resolved manifest/artifact locator>
<!-- PLUGIN_RELEASE_STATE_END -->
```

Projects may extend fields through a declared schema, but the central standard must not guess semantics.

## Trigger policy

Default triggers are authority-changing repository events plus manual workflow dispatch for recovery. Pull requests run check-only validation; they do not synchronize production facts into main.

## Relationship to existing implementations

Usage Dashboard already follows the simple block/document sync shape via `usage-dashboard-project-memory.yml`.
SimCore uses a richer registered renderer with multiple bounded durable targets via `simcore-release-state-sync.yml`.
The standard must support both as profiles rather than forcing either project to regress to the other implementation.

Proposed profiles:

- `production-state-block`: one or more marker-bounded blocks in a durable document.
- `registered-renderer`: project-owned renderer with declared target registry and output allowlist.
- `check-only`: project has durable guidance but no writable production authority yet.

## Receipt

Each successful material sync should expose evidence including project id, authority ref/SHA, source locator, changed target list, renderer/profile, and resulting main payload identity. Routine status presentation belongs in GitHub metadata/status issues rather than repeated main commits.

## Bootstrap integration

The Project Bootstrap Standard must create or register the memory binding. A project is not `BOOTSTRAP_READY` until the declared memory profile validates, unless explicitly `check-only`.

## Draft gates

- machine/human ownership split frozen
- profiles frozen
- block marker schema frozen
- authority identity contract frozen
- allowlist and idempotence tests defined
- one simple-profile proof
- one registered-renderer proof
- runtime/release mutation NONE

# Termux Repository-Driven Automation Contract

Date: 2026-08-24
Status: REQUIRED · RELEASE AUTHORITY NOT YET ESTABLISHED
Scope: `plugins/termux/` project memory and production-state synchronization

## Decision

Termux project continuity must be repository-driven, not conversation-memory-driven.

The repository is the durable authority for project operating rules, release state, evidence, and next-session continuity. Chat history may provide context, but automation and development decisions must re-read repository evidence first.

## Required automation

Once the Termux production release branch and production manifest are established, repository automation must machine-maintain the `PLUGIN_RELEASE_STATE` block in:

`docs/TERMUX_DEVELOPMENT_GUIDELINES.md`

The automation must derive state from the actual production authority rather than from hand-entered or conversational values.

Required inputs:

- production release branch
- production manifest
- production plugin artifact/version
- integrity/hash information when the release contract provides it

Required behavior:

1. read the current production release branch;
2. read and validate the production manifest;
3. verify the referenced production artifact when practical;
4. render only the bounded `PLUGIN_RELEASE_STATE` block;
5. preserve all other durable guideline content unchanged;
6. write the resulting project-memory update through repository tooling;
7. fail closed if production authority is missing, ambiguous, stale, or inconsistent.

## UNKNOWN handling

Until a production release branch and manifest actually exist, the release state remains `UNKNOWN`.

Automation must never convert missing production evidence into an invented version, branch, manifest path, zero value, or guessed default.

## Main-write safety

Any automated write to `main` must follow the repository main-write coordination contract in:

`docs/REPO_MAIN_WRITE_COORDINATION.md`

Termux automation must use a narrow path allowlist and must never force-push or overwrite unrelated product state.

Expected owned durable-memory path:

`docs/TERMUX_DEVELOPMENT_GUIDELINES.md`

Additional Termux-owned paths may be added only when they become real repository contracts.

## Intended implementation shape

When release authority exists, prefer a small dedicated implementation such as:

- `.github/workflows/termux-project-memory.yml`
- `scripts/termux-sync-project-memory.py`

The exact filenames may change if repository evidence favors another established pattern, but the behavior in this contract is mandatory.

## Triggers

The synchronization should run after successful Termux production promotion and may also support explicit manual verification/synchronization.

A stale or failed workflow must never downgrade production or rewrite the durable memory from an older release snapshot.

## Relationship to development guidelines

`docs/TERMUX_DEVELOPMENT_GUIDELINES.md` remains the operating contract.

This document makes one point explicit: durable project memory and production snapshot maintenance are repository automation responsibilities wherever repository evidence can provide the answer.

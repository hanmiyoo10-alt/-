# Canonical Main Documentation Stream

Phase L keeps repository documentation current without turning every event into a `main` commit.

## Two-layer model

1. **Live layer** — mutable GitHub issue timeline for normalized repository documentation events.
2. **Durable layer** — reviewed generated Markdown promoted only from stable evidence.

The live layer is the near-real-time record. Durable Markdown remains canonical repository documentation and is updated through bounded PR + CI transactions.

## Event classes

- `DECISION` — an accepted repository-level design or operating decision.
- `CHANGE` — a meaningful canonical-main/control-plane change proven on `main`.
- `INCIDENT` — an actionable normalized incident OPEN transition.
- `RECOVERY` — positive recovery evidence for an incident.
- `AUTHORITY` — production/release/governance authority change or verified read-back.
- `PROJECT` — project registration, lifecycle, Guidelines, or durable-memory authority change.

Every event has a deterministic `eventId`. Re-observing the same event is a no-op.

## Durable outputs

- `docs/REPO_DECISION_LOG.md` — accepted repository-level decisions.
- `docs/REPO_CHANGELOG.md` — meaningful repository/control-plane changes.
- `docs/REPO_ARCHITECTURE_SNAPSHOT.md` — generated current canonical-main architecture snapshot.
- `docs/REPO_PROJECT_CATALOG.md` — generated project/authority/freshness catalog.

Generated snapshot documents are replaced from trusted repository evidence. Append-only decision/change documents deduplicate by provenance marker.

## Promotion rule

A live event may be promoted only when its evidence is stable: merged PR/main commit, completed incident recovery, direct authority read-back, or accepted design decision. Pending CI, transient `SETTLING`, raw chat transcript, and repeated observations are not durable-document inputs.

Promotion runs on a documentation branch/PR. It never writes generated Markdown directly to `main` and never bypasses Required CI.

## Loop prevention

Documentation-only generated commits are marked `[repo-docs-generated]` and ignored as new `CHANGE` promotion inputs. This prevents documentation updates from recursively documenting themselves.

## Trust boundary

The stream can read repository metadata, Actions, issues, registry/descriptors, and trusted files. Live issue mutation is bounded to the configured documentation-stream issue. Durable writes use the existing reviewed branch/PR path; no production/release authority is mutated.

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

## ChatGPT PR-creation bridge

Repository policy may allow the Actions token to update branches while still forbidding it from creating pull requests. The promotion workflow must not weaken that repository setting or introduce a broader token to bypass it.

When the generated documentation branch has durable changes and no open promotion PR exists, Actions updates the single operational mailbox issue `#457` (`[repo-docs:promotion-bridge]`) with a machine-readable `PENDING` handoff containing the exact base SHA, generated head SHA, source branch, and source workflow run. Actions then exits successfully without attempting `gh pr create`.

A connected ChatGPT GitHub bridge may consume that mailbox and create the PR using its separately authorized GitHub connector. The bridge is constrained by the same Phase L transaction rules:

- the source branch/head must still match the handoff;
- the candidate PR must target `main`;
- Plugin Control Plane CI and SimCore Verify / Required must pass on the exact candidate head;
- `main` must still equal the recorded base immediately before merge;
- a moved base or moved PR head is stale and must not be merged;
- no bridge path may push generated Markdown directly to `main`.

If an open promotion PR already exists, the repository-native workflow may continue its existing explicit-check and exact-head merge path. The mailbox records `PR_OPEN`, `STALE_*`, or `MERGED` so the external bridge can converge without duplicate PRs.

This split keeps repository policy authoritative: GitHub Actions renders and publishes the bounded generated branch; the connected bridge supplies only the PR-creation capability that the Actions token intentionally lacks.

## Loop prevention

Documentation-only generated commits are marked `[repo-docs-generated]` and ignored as new `CHANGE` promotion inputs. This prevents documentation updates from recursively documenting themselves.

## Trust boundary

The stream can read repository metadata, Actions, issues, registry/descriptors, and trusted files. Live issue mutation is bounded to the configured documentation-stream issue. Durable writes use the existing reviewed branch/PR path; no production/release authority is mutated.

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
- `docs/REPO_PROJECT_CATALOG.md` — generated current-authority catalog plus navigation-only repository family projection.

Generated snapshot documents are replaced from trusted repository evidence. Append-only decision/change documents deduplicate by provenance marker.

### Project catalog projection boundary

The project catalog preserves two distinct views in one generated document:

1. the current authority-locator table from `.github/plugin-control-plane/registry.json` plus canonical-main descriptors;
2. a navigation-only family projection from `.github/plugin-control-plane/taxonomy.json`.

The family projection may show PRODUCT / PLUGIN / PLATFORM / STUDY, Risu placement, current source refs/roots, future target roots, and migration intent. It does not create a missing authority, convert a routing scope into production ownership, authorize path movement, collapse identities, mutate release/update state, or replace any existing project authority.

Generated catalog Markdown remains derived output. Source changes belong in the renderer/taxonomy/registry owners and reach `docs/REPO_PROJECT_CATALOG.md` only through the normal documentation-promotion branch/PR path.

## Promotion rule

A live event may be promoted only when its evidence is stable: merged PR/main commit, completed incident recovery, direct authority read-back, or accepted design decision. Pending CI, transient `SETTLING`, raw chat transcript, and repeated observations are not durable-document inputs.

Promotion runs on a documentation branch/PR. It never writes generated Markdown directly to `main` and never bypasses Required CI.

## ChatGPT PR-creation bridge

Repository policy may allow the Actions token to update branches while still forbidding it from creating pull requests. The promotion workflow must not weaken that repository setting or introduce a broader token to bypass it.

When the generated documentation branch has durable changes and no open promotion PR exists, Actions updates the single operational mailbox issue `#457` (`[repo-docs:promotion-bridge]`) with a machine-readable `PENDING` handoff containing the exact base SHA, generated head SHA, source branch, and source workflow run. Actions then exits successfully without attempting PR creation.

A connected ChatGPT GitHub bridge may consume that `PENDING` mailbox and create the PR using its separately authorized GitHub connector. The source branch/head and base must still match the mailbox, and the PR must target `main`.

When an exact promotion PR exists, the repository-native workflow retains ownership of candidate validation. It dispatches Plugin Control Plane CI and SimCore CI for the exact generated head, binds the exact run IDs, verifies their `workflow_dispatch` event and head identity, waits for successful completion, then re-reads the current `main` base and exact PR identity. The workflow **does not merge the PR**. If those checks remain current, it writes a `MERGE_READY` mailbox containing the exact base, head, PR number, Plugin Control Plane run ID, SimCore run ID, and source promotion run.

On `MERGE_READY`, the connected GitHub bridge owns only the final checked merge effect. Before merging it must fresh-read and prove:

- current `main` still equals the mailbox base SHA;
- #457 still names the same `MERGE_READY` transaction;
- the PR is open, non-draft, targets `main`, and still has the exact mailbox base/head;
- the PR changed-file set is still the generated-document candidate;
- the bound Plugin Control Plane run is successful `workflow_dispatch` evidence for the exact head;
- the bound SimCore run is successful `workflow_dispatch` evidence for the exact head with Verify + Required successful.

Only then may the bridge squash-merge with an expected-head guard for the exact mailbox head. Any moved main, moved head, stale PR, mismatched run ID, failed check, or ambiguous evidence fails closed and must not merge.

After a successful bridge merge, the bridge may update #457 to `MERGED` with the observed result-main SHA. It must then wait for the repository's normal main-push evidence to establish merged-main health. **Candidate-head `workflow_dispatch` proof is not merged-main `push` proof** and must never be relabeled as such. The canonical Required observer and protection guard remain authoritative for the resulting main.

This split keeps repository policy authoritative: GitHub Actions renders, publishes, and validates the bounded generated candidate; the connected bridge supplies the PR-creation and final expected-head merge capabilities; neither path may push generated Markdown directly to `main`.

## Loop prevention

Documentation-only generated commits are marked `[repo-docs-generated]` and ignored as new `CHANGE` promotion inputs. This prevents documentation updates from recursively documenting themselves.

## Trust boundary

The stream can read repository metadata, Actions, issues, registry/descriptors, and trusted files. Live issue mutation is bounded to the configured documentation-stream issue. Durable writes use the existing reviewed branch/PR path; no production/release authority is mutated.

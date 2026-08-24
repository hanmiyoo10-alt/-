# SimCore Release System v2 — Automation Commit Provenance

Date: 2026-08-24
Status: **IMPLEMENTED POLICY · NON-RUNTIME**
Scope: automated main-state commits produced by the active SimCore Release System path

## Decision

Automated SimCore state/evidence commits must identify themselves as automation rather than impersonating a human operator.

Canonical automated Git identity:

```text
name  = github-actions[bot]
email = 41898282+github-actions[bot]@users.noreply.github.com
```

The email is Git commit metadata only. It is not an inbox dependency and no email contents are read.

## Rationale

This improves provenance during failure analysis:

```text
human-authored design/change commit
!=
automated R state synchronization commit
```

When an anomaly is preserved as WATCH / DEFER / FIX / BLOCKER, commit identity now helps distinguish whether the write came from the automated release/state path or a human work branch.

It also removes the need for the active automation workflow to retain a personal email identity.

## Implemented surface

The active writer:

```text
.github/workflows/simcore-release-state-sync.yml
```

now configures the canonical GitHub Actions bot identity immediately before creating its bounded state commit.

The permanent SimCore CI self-test enforces that this active workflow contains exactly one configured Git author name/email pair and that the pair is the canonical bot identity.

## Scope boundary

This change does not alter:

```text
SimCore runtime bytes
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
release identity semantics
state rendering semantics
main payload allowlists
```

Legacy release workflows are not modified by this work item. Their authority/lifecycle remains governed by RS2-4E retirement work; changing legacy identity separately would widen this task without improving the active R path.

## Long-term rule

Any future permanent R workflow that creates a Git commit automatically should either:

1. use the canonical automation identity above, or
2. declare and justify a different machine identity in durable release-system evidence.

Human-authored commits should remain attributable to the human path; automated commits should remain attributable to automation.

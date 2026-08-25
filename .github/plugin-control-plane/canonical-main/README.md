# Canonical Main Automation — Phase D Native Mail Bridge

This directory implements the shared, non-runtime canonical-main automation designed in issues #295, #297, #298, #301, and #302.

Phase A established the policy vocabulary, bootstrap contract, incident semantics, and `[repo-ops:main]` operator surface.

Phase B added trusted-main read-only observation adapters for:

- the permanent `SimCore CI / Required` result on the exact current `main` SHA;
- SimCore manifest ↔ `release-simcore` production-identity parity;
- active workflows that can integrate bounded durable/admin payloads through `scripts/repo-main-write.py`;
- registered project bootstrap descriptors.

Phase C added the repository notification outbox:

- deterministic alert envelopes embedded in incident issues;
- delivery eligibility only for first P0/P1 OPEN transitions and OPEN → RECOVERED transitions;
- repeated observations while the same incident remains OPEN are evidence updates, not new delivery candidates;
- deterministic `deliveryKey` semantics;
- an optional external GitHub App reference implementation.

Phase D makes the currently available native delivery path canonical:

- ChatGPT condition-watch automation reads canonical-main operations and incident state from GitHub;
- eligible P0/P1 OPEN and RECOVERED transitions are delivered through the connected Gmail account;
- the condition watch runs hourly, which is the supported automation polling floor;
- duplicate delivery is suppressed using the repository incident/correlation and `deliveryKey` semantics;
- recipient/account credentials remain outside the repository and are managed by the connected Gmail integration;
- the external GitHub App path is optional fallback infrastructure, not a required setup step.

The native bridge is recorded as `ACTIVE_PROVEN` after a bounded synthetic proof produced exactly one OPEN email, zero repeated-OPEN emails, and exactly one RECOVERED email without creating a repository incident.

See `native-mail-bridge.json` for the frozen operational contract and proof summary.

## Observation epoch

Writer-workflow incident observation starts at the Phase B shadow deployment epoch declared in `policy.json`.

Runs older than that epoch are historical baseline evidence and cannot open a new incident merely because they are the latest historical run for an infrequently invoked workflow. Runs at or after the epoch remain observable until a later matching recovery.

## Refresh model

`.github/workflows/canonical-main-ops.yml` refreshes the operator surface through:

- `workflow_run` completion events for Required CI and active writer workflows;
- selected `main` pushes;
- a bounded schedule as self-healing fallback;
- manual workflow dispatch.

## Notification handoff

Canonical incident issues remain the repository notification outbox. Eligible issue bodies contain a machine-readable `canonical-main-alert-envelope` marker.

The primary delivery bridge is `Main Incident Mail`, a ChatGPT condition-watch automation over the connected GitHub and Gmail capabilities. It sends only newly eligible P0/P1 OPEN or RECOVERED transitions. Healthy state and repeated unchanged failures are silent.

The repository does not store Gmail passwords, OAuth tokens, recipient addresses, SMTP credentials, provider API keys, or webhook secrets.

`.github/plugin-control-plane/canonical-main/notification-bot/` is retained as an optional event-driven GitHub App reference for a future environment where a no-poll webhook runtime is available without manual setup.

## Trust boundary

The canonical-main operations workflow runs trusted code checked out from `main` with only:

- `contents: read`;
- `actions: read`;
- `issues: write`.

It never executes PR-head code with metadata-write authority, mutates product/release branches, or pushes Git refs.

The native Gmail delivery bridge is observability-only. Email failure cannot fail a release, mutate production authority, or block a canonical-main write.

## Bootstrap descriptor check

Registered descriptors live under `.github/plugin-control-plane/canonical-main/descriptors/`.

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs check \
  .github/plugin-control-plane/canonical-main/descriptors/voyage-token-check.json
```

## Guidelines render

Rendering is bounded to the exact `guidelines` path declared by the descriptor and refuses to overwrite an existing file.

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs render \
  path/to/project-descriptor.json \
  docs/PROJECT_GUIDELINES.md
```

## Operations state

`policy.json` keeps `operations.eventAdaptersComplete=true` after the proven Phase B adapter activation. Notification bridge availability remains deliberately separate from repository health.

`CLEAR` means only that configured repository feedback coverage is current and has no unresolved actionable incident. It is not a claim that every product is bug-free. The mail bridge has its own `ACTIVE_PROVEN` state and does not participate in release/main authority.

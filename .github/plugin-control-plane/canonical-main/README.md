# Canonical Main Automation — Phase E Delivery Receipts

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

Phase D made the currently available native delivery path canonical:

- ChatGPT condition-watch automation reads canonical-main operations and incident state from GitHub;
- eligible P0/P1 OPEN and RECOVERED transitions are delivered through the connected Gmail account;
- the condition watch runs hourly, which is the supported automation polling floor;
- duplicate delivery is suppressed using repository incident/correlation and `deliveryKey` semantics;
- recipient/account credentials remain outside the repository and are managed by the connected Gmail integration;
- the external GitHub App path is optional fallback infrastructure, not a required setup step.

Phase E makes delivery auditable:

- each native delivery attempt writes a structured receipt to the corresponding incident issue comment;
- supported receipt states are `DELIVERED`, `FAILED`, and one-time `SUPPRESSED_DUPLICATE` evidence;
- receipts contain delivery metadata only and must not contain recipient addresses, OAuth tokens, passwords, secrets, API keys, or provider credentials;
- `[repo-ops:main]` aggregates a bounded set of P0/P1 incident comments and renders bridge health, last success/failure, receipt totals, unresolved delivery failures, and unique duplicate-suppression proofs;
- bridge health is separate from repository/release health and cannot block a release or a canonical-main write.

Bridge-health semantics:

- `HEALTHY`: at least one structured/legacy delivery receipt exists and no delivery key has an unresolved latest `FAILED` receipt;
- `DEGRADED`: at least one delivery key has a latest `FAILED` receipt;
- `PROVEN_IDLE`: no live receipt exists yet, but the bounded Phase D bridge proof remains valid;
- `UNKNOWN`: no receipt and no valid proof baseline exists.

See `native-mail-bridge.json` for the frozen bridge contract and `delivery-receipt.cjs` for receipt parsing/aggregation semantics.

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

The primary delivery bridge is `Main Incident Mail`, a ChatGPT condition-watch automation over the connected GitHub and Gmail capabilities. It sends only newly eligible P0/P1 OPEN or RECOVERED transitions. Before sending it checks the incident comments for a prior successful receipt for the same `deliveryKey`.

After a successful Gmail send it writes a `DELIVERED` structured receipt comment. A failed send writes `FAILED` evidence when GitHub remains reachable. A repeated eligible candidate that already has a successful receipt is not emailed again; at most one `SUPPRESSED_DUPLICATE` receipt is recorded for that delivery key.

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

`CLEAR` means only that configured repository feedback coverage is current and has no unresolved actionable incident. It is not a claim that every product is bug-free. The mail bridge has its own static `ACTIVE_PROVEN` contract state and dynamic receipt-derived bridge health.

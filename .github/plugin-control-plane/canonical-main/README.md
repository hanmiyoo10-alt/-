# Canonical Main Automation — Phase C Notification Handoff

This directory implements the shared, non-runtime canonical-main automation designed in issues #295, #297, #298, #301, and #302.

Phase A established the policy vocabulary, bootstrap contract, incident semantics, and `[repo-ops:main]` operator surface.

Phase B added trusted-main read-only observation adapters for:

- the permanent `SimCore CI / Required` result on the exact current `main` SHA;
- SimCore manifest ↔ `release-simcore` production-identity parity;
- active workflows that can integrate bounded durable/admin payloads through `scripts/repo-main-write.py`;
- registered project bootstrap descriptors.

Phase C adds the repository-side external notification handoff:

- deterministic alert envelopes embedded in incident issues;
- immediate-delivery eligibility only for first P0/P1 OPEN transitions and OPEN → RECOVERED transitions;
- repeated observations while the same incident remains OPEN are evidence updates, not new delivery candidates;
- an external GitHub App contract requiring only Metadata read + Issues read/write;
- an email handoff payload and bounded delivery-receipt contract with all recipient/provider credentials kept outside the repository.

The repository-side outbox is active, but the external GitHub App remains explicitly `NOT_INSTALLED` until separate installation/runtime evidence exists. Email delivery must not be claimed live merely because the handoff contract exists.

## Observation epoch

Writer-workflow incident observation starts at the Phase B shadow deployment epoch declared in `policy.json`.

Runs older than that epoch are historical baseline evidence and cannot open a new incident merely because they are the latest historical run for an infrequently invoked workflow. Runs at or after the epoch remain observable until a later matching recovery.

This boundary was added after the live shadow proof correctly exposed that a pre-adapter historical `SimCore Permanent Release` failure would otherwise be misclassified as a current incident.

## Refresh model

`.github/workflows/canonical-main-ops.yml` refreshes the operator surface through:

- `workflow_run` completion events for Required CI and active writer workflows, providing near-immediate re-observation;
- selected `main` pushes;
- a bounded schedule as self-healing fallback;
- manual workflow dispatch.

## Notification handoff

Canonical incident issues are the notification outbox. Eligible issue bodies contain a machine-readable `canonical-main-alert-envelope` marker. The external bot consumes GitHub `issues` webhooks, verifies the webhook signature, parses only eligible envelopes, deduplicates by `deliveryKey`, and forwards the normalized handoff to the configured channel.

The first supported channel is `email`. Recipient addresses, OAuth credentials, SMTP credentials, provider API keys, and webhook secrets must remain external secret configuration.

See `.github/plugin-control-plane/canonical-main/notification-bot/` for the GitHub App permission contract and webhook/email reference implementation.

## Trust boundary

The canonical-main operations workflow runs trusted code checked out from `main` with only:

- `contents: read`;
- `actions: read`;
- `issues: write`.

It never executes PR-head code with metadata-write authority, mutates product/release branches, or pushes Git refs.

The external notification GitHub App has a separate, narrower target permission surface:

- Metadata: read;
- Issues: read/write;
- Issues webhook only.

It does not require repository contents, actions, workflows, checks, pull requests, statuses, or Git ref write authority.

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

`policy.json` keeps `operations.eventAdaptersComplete=true` after the proven Phase B adapter activation. Notification bridge availability is deliberately separate from repository health.

The operator state still fails closed to `UNKNOWN` whenever a required current repository observation is missing, pending, conflicting, or stale. `CLEAR` means only that the configured repository feedback coverage is current and has no unresolved actionable incident; it is not a claim that every product is bug-free or that external email delivery is available.

# Canonical Main Notification Bot

This directory defines the external GitHub App boundary for canonical-main alert delivery.

The repository remains the authority for incident state. The bot is only a delivery bridge.

## Event flow

```text
trusted canonical-main observation
→ normalized incident issue
→ embedded canonical-main alert envelope
→ GitHub `issues` webhook
→ external notification bot
→ channel adapter (email first)
→ bounded delivery receipt on the same incident issue
```

## GitHub App permission target

The external app should request only:

- Metadata: read
- Issues: read/write

It does **not** need Contents, Actions, Workflows, Checks, Pull requests, or Git ref write permissions.

Subscribed webhook event:

- Issues

No production/release credentials belong in the app.

## Alert eligibility

The canonical repository emits a delivery-eligible envelope only for:

- first transition into `OPEN` for P0/P1 incidents;
- transition from `OPEN` to `RECOVERED` for P0/P1 incidents.

A second failing observation while the same correlation key remains OPEN may update repository evidence, but must not become a new delivery candidate.

## Delivery dedupe

Every envelope carries a deterministic `deliveryKey`. The external bot must persist delivered keys and treat duplicates as success/no-op.

The bot may write one receipt comment back to the incident issue after successful channel delivery. A receipt must contain only delivery metadata, never OAuth tokens, SMTP credentials, recipient addresses, message bodies containing secrets, or provider access keys.

## Email handoff

Email recipients and provider credentials are external configuration. They must never be committed to this repository.

The first channel contract is `email`. A bridge implementation should render the envelope into a concise message containing severity, state transition, scope, reason, summary, evidence references, and a link to the incident issue.

Repository health must not depend on email delivery. Delivery failure is an external-notification concern and must not fail product release or canonical-main writes.

## Installation state

The repository-side outbox contract can be active before the GitHub App is installed. Until an app installation and external runtime are separately proven, the operations view must describe the delivery bridge as not installed rather than claiming email delivery is live.

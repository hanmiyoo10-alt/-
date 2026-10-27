# Provider Balance Mini — Development & Operations Guidelines

Canonical repository: `hanmiyoo10-alt/-`

Canonical plugin path: `plugins/risu/local/provider-balance-monitor/`

Lifecycle: `experimental / non-production`

Durable-memory profile: `check-only`

## Repository common-rules inheritance

This project inherits `docs/REPOSITORY_COMMON_RULES.md` and the canonical-main shared interaction contract by reference.

Repository hard invariants remain binding. This document does not create production, release, deployment, billing, credential, or provider-invocation authority.

## Current authority posture

Current evidence authority:

`plugins/risu/local/provider-balance-monitor/README.md`

Current registration identity:

`plugin:provider-balance-mini`

No production release branch, update URL, production manifest, deployment owner, or automatic publisher is declared.

The plugin remains an experimental read-only Local-family child until a separately reviewed authority change proves otherwise.

## Project scope

The owned project root is:

`plugins/risu/local/provider-balance-monitor/**`

The durable guideline is:

`docs/PROVIDER_BALANCE_MINI_GUIDELINES.md`

The Local compatibility parent remains navigation/evidence only and does not absorb this child's authority.

## Stable product contract

The first supported user surface is intentionally mini-floating only:

- one compact draggable floating card;
- Copilot, Vertex, and AI Studio rows;
- manual refresh;
- bounded visible-only refresh behavior;
- remembered floating position.

Do not add a dashboard, settings page, chat navigation button, provider router, invocation controls, billing mutation, purchase/top-up action, or broader control-plane surface without a separately scoped change.

## Data fidelity

`UNKNOWN` is distinct from known zero.

Missing, null, unsupported, stale, or failed provider data must never be converted into zero or an exhausted-balance claim.

Current provider posture:

- Copilot: supported official Copilot SDK quota source;
- Vertex: exact promotional-credit remaining stays UNKNOWN until a supported programmatic source is verified;
- AI Studio: exact Prepay remaining stays UNKNOWN until a supported programmatic source is verified.

Observed, delayed, estimated, stale, auth-required, and unknown states must remain distinguishable where the source contract supports them.

## Provider and authentication boundary

Prefer supported official APIs and SDKs.

Do not introduce a dependency on undocumented `/copilot_internal/*` endpoints.

Do not scrape browser cookies or private session material for balance collection.

Credentials, tokens, cookies, private keys, service-account JSON, raw sensitive provider payloads, and authentication/session material must not be committed to Git or exposed through the plugin's normalized UI payload.

## Collector boundary

The current local collector is read-only and loopback-bound.

It may expose only bounded normalized provider state needed by the mini UI.

The collector must not become a provider invocation router, billing writer, credential exporter, or raw provider-data proxy through incidental feature growth.

## Refresh and failure behavior

Refresh work must remain bounded and avoid aggressive polling.

A source failure must degrade to explicit unavailable/unknown state rather than fabricate balance state.

Cached trustworthy values may be shown only when their freshness semantics remain explicit.

## Regression contract

At minimum, repository changes affecting this project should preserve:

- explicit zero remains zero;
- explicit null/missing values remain unknown;
- Vertex and AI Studio unsupported numeric balance remains unknown;
- mini-floating-only surface;
- no settings/dashboard/chat-button surface;
- no undocumented Copilot internal endpoint;
- no secret-bearing plugin payload;
- supported Node/Copilot SDK runtime contract;
- deterministic ownership classification as `plugin:provider-balance-mini`.

## Release and deployment boundary

There is currently no production release workflow.

Registration in the repository control plane is classification/evidence infrastructure only. It must not be interpreted as an update channel, production version, deployment, or release approval.

Any future release/update mechanism requires a separately reviewed authority scope, artifact identity, validation contract, and post-merge convergence proof.

## Durable project cycle

Current bounded cycle:

`evidence → design → implementation PR → validation/merge → post-merge convergence → experiment close or next scoped change`

Real provider-balance claims still require provider-owned evidence. Repository registration does not upgrade unsupported provider data.

## Project-specific non-negotiable rules

- mini-floating-only remains the default product surface for this experiment;
- read-only provider behavior remains mandatory;
- UNKNOWN must never become zero by coercion;
- no undocumented Copilot internal endpoint dependency;
- no release/update/production authority is inferred from control-plane registration.

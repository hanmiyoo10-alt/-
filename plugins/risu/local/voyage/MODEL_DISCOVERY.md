# Voyage Token Check — Automatic Model Discovery

## Goal

New Voyage models should appear in the plugin without requiring a plugin release whenever the runtime or an authoritative supported Voyage source exposes them.

This is a compatibility goal, not permission to guess unsupported metadata.

## Design rule

Do not maintain a closed hardcoded list of Voyage model IDs as the primary source of truth.

Model identifiers observed from legitimate runtime/provider data should flow through the same provider → normalize → snapshot → UI architecture used for quota and usage data.

A newly observed model ID must be displayable even when the plugin has never seen it before.

## Model record contract

Conceptually, normalize model data into a record such as:

```text
VoyageModelRecord
- id
- displayName?
- source
- fidelity
- observedUsage?
- authoritativeUsage?
- allocatedTokens?
- remainingTokens?
- cost?
- pricing?
- rateLimits?
- firstSeenAt?
- lastSeenAt?
- metadataStatus: known | partial | unknown
```

Exact field names may change during implementation. The semantic rules below are stable.

## Automatic behavior

When a new model appears in a supportable runtime/provider source:

1. accept the model ID without requiring a plugin update;
2. create a normalized model record;
3. show the model in the relevant usage/detail UI when it has meaningful data;
4. preserve its exact provider-supplied ID;
5. use a safe fallback label when no friendly display name is known;
6. mark unknown pricing, allocation, quota, reset, and rate-limit metadata as unknown rather than filling defaults;
7. begin using newly available authoritative metadata automatically when a supported provider later exposes it.

## What can update automatically

The following may update automatically when supplied by legitimate runtime or authoritative sources:

- model IDs;
- model display names;
- per-model observed usage;
- per-model authoritative usage;
- quota/allocation data;
- pricing/cost metadata;
- rate-limit metadata;
- reset metadata.

Each value still carries source/fidelity/scope and is only shown with the semantics actually supported by the source.

## What must not be guessed

A new model must not inherit values from another model merely because its name looks related.

Do not infer or copy:

- free-token allocation;
- token price;
- billing unit;
- context limits;
- rate limits;
- reset windows;
- account/project scope;
- quota eligibility.

Unknown metadata remains `UNKNOWN` until a supportable source provides it.

## Fallback UX

A newly discovered model with partial data should still be usable.

Example:

```text
voyage-new-model
Observed usage: 1,234,567 tokens
Pricing: unavailable
Remaining quota: unavailable
Source: Risu observed
```

This is preferable to hiding the model or mislabeling it with stale metadata.

## Optional reference metadata layer

A later `ReferenceMetadataProvider` may enrich dynamically discovered models with public documented metadata.

That layer must be replaceable and independently refreshable so model metadata updates do not require changing quota logic or the UI contract.

If remote reference metadata is ever used, it must come from a controlled supportable source and must not carry secrets or account-specific state.

## Compatibility principle

Unknown models are data, not errors.

Parsing and UI code should use capability detection instead of model-name switches wherever practical. A model should only need special-case code when the actual provider protocol differs and evidence requires it.

## Release implication

A Voyage model launch should not normally require a Voyage Token Check plugin release just to make the model visible.

A plugin release is only required when the new model introduces a genuinely new protocol/semantic contract that the existing providers cannot parse safely.

## Current status

- DESIGN DECISION: dynamically accept previously unseen Voyage model IDs from legitimate provider/runtime data.
- DESIGN DECISION: do not hardcode a closed model catalog as the primary discovery mechanism.
- DESIGN DECISION: unknown model metadata remains unknown rather than inheriting or guessing values.
- UNKNOWN: whether an authoritative Voyage source will expose a complete live model catalog and per-model quota/pricing metadata.
- VERIFIED from current Risu source research: Voyage model IDs can already appear in legitimate Risu request data, so runtime observation is a viable discovery input for models actually used by Risu.

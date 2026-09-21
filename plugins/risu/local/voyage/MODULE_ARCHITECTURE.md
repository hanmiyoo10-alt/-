# Voyage Token Check — Feature Module Architecture

## Goal

Voyage Token Check should be developed as a set of small feature modules behind a shared core rather than as one large tightly coupled plugin script.

This is a source-architecture decision. Distribution may still materialize as one RisuAI plugin artifact such as `latest.js`; source modularity does not require users to install multiple plugin files.

## Core rule

**One feature area owns one module boundary.**

A module should be independently understandable, testable, replaceable, and removable without forcing unrelated features to be rewritten.

Modules must communicate through explicit shared contracts rather than reaching into each other's private state.

## High-level shape

```text
                  Host / Voyage / Risu evidence
                            ↓
                       Source modules
                            ↓
                    Normalize / validate
                            ↓
                 Shared VoyageSnapshot store
                            ↓
                    Refresh coordinator
                      ↙      ↓       ↘
               Dashboard   Mini UI   Diagnostics
                    ↓          ↓          ↓
                       Shared UI shell

        Release notes / local settings / update metadata
                 remain separate feature modules
```

## Shared core

The core is deliberately small. It owns contracts and coordination, not product-specific presentation.

### `SnapshotStore`

Owns the current normalized `VoyageSnapshot` and its provenance/fidelity metadata.

Rules:
- one canonical state for all UI surfaces;
- known zero remains distinct from unknown;
- no raw credentials or raw fetch-log retention;
- stale trustworthy values may remain available with freshness state;
- modules may read normalized state but must not maintain competing token totals.

### `RefreshCoordinator`

Owns refresh scheduling and deduplication.

Responsibilities:
- immediate refresh when the full dashboard opens;
- visible-only bounded refresh while a surface needs live state;
- manual refresh requests;
- suppress duplicate concurrent refreshes;
- stop unnecessary work when no visible feature needs it.

Neither dashboard nor mini widget should implement its own polling loop.

### `ModuleRegistry`

Owns module lifecycle and failure isolation.

Conceptual lifecycle:

```text
register → initialize → start when needed → stop when idle → dispose
```

A feature module failing should degrade that feature where possible rather than crash the entire plugin.

The exact runtime mechanism is an implementation detail and remains UNKNOWN until the real Risu plugin source layout is established.

### `PermissionBoundary`

Centralizes permission/capability checks such as access to permission-gated fetch logs.

Feature modules should receive permitted capabilities or normalized results rather than duplicating permission prompts and secret-handling logic.

## Feature modules

### 1. `ObservedUsageModule`

Purpose:
- consume sanitized Risu fetch-log evidence after host permission;
- identify legitimate Voyage request/response observations;
- normalize supported usage fields;
- never label incomplete observations as account-wide remaining quota.

This module owns Risu-observed accounting logic and nothing else.

### 2. `AuthoritativeQuotaModule`

Purpose:
- consume a future VERIFIED supportable Voyage/host quota source;
- expose allocation, used, remaining, scope, reset, cost, or rate-limit values only when the source actually provides them.

Until such a source is VERIFIED, this module remains unavailable rather than being implemented with scraping or guessed calculations.

### 3. `ModelActivityModule`

Purpose:
- discover model IDs from real runtime evidence;
- maintain the semantic distinction between currently active, recently used, and unused/known models;
- feed dashboard ordering;
- allow unknown/new models to appear without a plugin release when their data shape is already supported.

Rules:
- current/recently used models rise to the visible section;
- unused models remain in the collapsed section;
- model identity alone must not fabricate price/quota semantics.

### 4. `DashboardModule`

Purpose:
- render the full dashboard immediately when the user opens the plugin;
- prioritize the user's actually used models;
- keep unused models collapsed by default;
- show authoritative quota first when VERIFIED;
- otherwise show precisely labeled observed information;
- provide refresh, update notes, and access to redacted diagnostics.

The dashboard consumes `SnapshotStore`; it does not perform independent accounting.

### 5. `MiniActivityModule`

Purpose:
- provide the contextual mini widget only while Voyage activity is relevant.

Current UI contract:

```text
● Voyage 사용중
```

The indicator should use a green status dot when active.

It intentionally does **not** show:
- token counts;
- model names;
- remaining quota;
- cost;
- rate limits.

Its job is status awareness, not accounting.

### 6. `ReleaseNotesModule`

Purpose:
- show the compact in-plugin update log;
- expose the current release's high-signal 2–5 line summary;
- manage the local `NEW`/last-viewed state;
- remain consistent with the plugin release version.

It must not depend on quota collection or dashboard accounting.

### 7. `DiagnosticsModule`

Purpose:
- expose safe evidence about provider health, freshness, fidelity, scope, and normalized error categories;
- never expose API keys, auth headers, sessions, cookies, or raw sensitive payloads.

Diagnostics should inspect public module/core health contracts, not scrape private internals from unrelated modules.

### 8. `ReferenceMetadataModule` (optional/later)

Purpose:
- public model metadata, pricing reference, or documented limits when useful;
- never convert reference pricing/free-allocation documentation into a claimed current account balance.

This module should be replaceable independently when Voyage changes public reference metadata.

## Module dependency rule

Prefer dependencies pointing inward toward contracts/core:

```text
Feature module → shared contract/core
```

Avoid lateral chains such as:

```text
Mini widget → Dashboard → Observed usage → Diagnostics
```

Instead all of those consume the shared snapshot/module-health contracts.

This prevents a UI change from accidentally breaking token acquisition and prevents a provider repair from forcing UI rewrites.

## Data ownership

Each piece of mutable state has one owner.

- normalized Voyage state → `SnapshotStore`;
- refresh scheduling → `RefreshCoordinator`;
- observed request parsing/accounting → `ObservedUsageModule`;
- model activity classification → `ModelActivityModule`;
- release-note viewed state → `ReleaseNotesModule`;
- module health/error category → module registry/health contract.

Do not duplicate ownership between modules.

## Failure isolation

A non-critical feature failure should not take down the dashboard.

Examples:
- release notes fail → dashboard/quota still work;
- mini widget integration fails → full dashboard still works;
- reference metadata fails → account usage remains visible without guessed metadata;
- authoritative provider temporarily fails → last trustworthy state may remain with stale indication and observed usage can still be shown separately;
- diagnostics fail → normal product UI remains usable.

A core-state integrity failure is different and should produce an explicit unavailable/degraded state rather than silently showing suspect numbers.

## Source layout guidance

The exact canonical production source path is still UNKNOWN and must be established from repository/release evidence before implementation.

Once established, prefer a source tree conceptually similar to:

```text
core/
  snapshot
  refresh
  modules
  permissions

modules/
  observed-usage
  authoritative-quota
  model-activity
  dashboard
  mini-activity
  release-notes
  diagnostics
  reference-metadata

entry/
  plugin
```

Names and extensions may change to fit the actual build environment. The module boundaries are the durable decision; the exact filesystem layout is not yet a production claim.

## Build and release rule

Source modularity must not complicate user installation.

Preferred release flow:

```text
modular canonical source
→ deterministic build/bundle
→ single install/update artifact
→ existing Risu `//@update-url` + `//@version` channel
```

Generated release artifacts must derive from canonical source and must not be hand-edited.

A new Voyage model that fits an existing supported runtime shape should remain a data-discovery event rather than requiring a release. A protocol/parser/module behavior change may require a plugin release.

## Testing strategy

Module boundaries should make focused regression tests possible.

Examples:
- observed-usage parser fixtures without rendering the dashboard;
- model-activity ordering tests without network activity;
- snapshot fidelity tests without UI;
- dashboard rendering against deterministic normalized snapshots;
- mini-widget activity state tests without token-accounting assertions;
- release-note/version consistency tests independent of Voyage data.

Integration tests should then verify the shared contracts between modules.

Avoid tests that duplicate implementation logic or depend on brittle source slicing.

## Design verdict

**DESIGN DECISION:** Voyage Token Check will use feature-level modular source architecture with a small shared core.

- one feature area = one module boundary;
- one canonical normalized snapshot shared by every UI surface;
- refresh scheduling centralized;
- modules communicate through explicit contracts;
- failures are isolated where safe;
- source may be modular while release remains a single easy-to-install Risu plugin artifact;
- exact source paths/runtime mechanics remain UNKNOWN until implementation evidence establishes them.

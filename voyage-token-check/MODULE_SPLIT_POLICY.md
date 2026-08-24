# Voyage Token Check — Module Split Policy

## Goal

Keep feature modules small enough to understand, test, replace, and release safely as the plugin grows.

The default architecture remains **feature-level modularity**. A feature starts as one module, but a module may be split into independent submodules when it becomes too broad.

## Core rule

**Split by responsibility and change boundary, not by file size alone.**

A large file is a useful warning signal, but line count or bundle size by itself is not a sufficient reason to create another module. A split is justified when the code contains responsibilities that can evolve, fail, test, or refresh independently.

## Strong split signals

Consider extracting a submodule when one or more of these become true:

- the module has two or more clearly different reasons to change;
- one part can fail without making the rest unusable;
- one part needs its own permission, lifecycle, refresh cadence, or persistence rule;
- tests for one responsibility can be written without loading the rest of the feature;
- the module starts owning multiple independent mutable states;
- a change repeatedly requires touching unrelated sections of the same module;
- one section becomes reusable by another feature through an explicit contract;
- performance work needs an independently measurable or disableable phase;
- reviewers can no longer understand the module comfortably as one responsibility.

## Weak signals

These alone do not require a split:

- a file passes an arbitrary line-count threshold;
- a helper function is long but still belongs to one responsibility;
- two small modules would need heavy back-and-forth calls to perform one operation;
- splitting would create mostly pass-through wrappers with no independent contract.

Avoid over-modularization. Too many tiny modules can make execution flow harder to follow than one cohesive feature module.

## Preferred split shape

A growing feature should first keep one public feature boundary and split its internals behind that boundary.

Example:

```text
ObservedUsageModule
  ├─ VoyageLogDetector
  ├─ UsageResponseParser
  └─ ObservationDeduper
```

The rest of the plugin should still depend on the public `ObservedUsageModule` contract rather than reaching directly into those internal pieces.

If one extracted responsibility later becomes a true cross-feature capability with its own lifecycle or ownership, it may be promoted to a first-class module.

## State ownership rule

Splitting a module must not create duplicate ownership.

Every mutable concept still has exactly one owner. Extraction should move ownership or expose a contract; it must not copy state into two competing modules.

## Release and failure isolation

A split is especially valuable when it lets us:

- patch one responsibility without changing unrelated behavior;
- add focused regression tests;
- disable/degrade one part safely during failure;
- measure one expensive phase independently;
- keep the single bundled Risu plugin artifact unchanged from the user's perspective.

Source may become more granular while distribution remains one `latest.js` plugin and keeps the existing `+` update flow.

## Decision

**DESIGN DECISION:** Voyage Token Check uses adaptive modularity.

1. Start with one module per feature area.
2. Watch responsibility, state, lifecycle, test, and failure boundaries as the feature grows.
3. Split a large module when those boundaries become meaningfully independent.
4. Do not split solely to satisfy an arbitrary size number.
5. Keep a stable public feature contract wherever possible so internal refactors do not ripple across the plugin.

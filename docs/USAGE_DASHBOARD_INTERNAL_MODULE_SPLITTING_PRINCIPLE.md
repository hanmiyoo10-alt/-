# Local Usage Dashboard — Internal Module Splitting Principle

Status: ACTIVE OPERATING PRINCIPLE

Recorded: 2026-08-24

Scope: `plugins/usage-dashboard/` only.

## Meaning

When this project says a module should be split, isolated, or promoted into its own module, it means an internal module of the Local Usage Dashboard plugin should be reorganized inside the existing plugin architecture.

It does **not** mean that Local Usage Dashboard should be split into multiple plugins.

The canonical product boundary remains:

`plugins/usage-dashboard/`

## Default rule

Do not keep adding unrelated responsibility to an already-large internal module merely because that file already exists.

When a module accumulates a distinct responsibility, a distinct lifecycle, an independently testable behavior boundary, or becomes difficult to review safely, first consider extracting that responsibility into a new internal part/module.

For the plugin UI/source side, `plugins/usage-dashboard/src/parts.cjs` remains the module-order authority.

For the Bridge Engine source side, `plugins/usage-dashboard/runtime-src/bridge-engine/parts.json` remains the module-order authority.

New internal modules must be registered through those authorities rather than concatenated ad hoc.

## Good reasons to split

Prefer an internal split when one or more of these are true:

- one file owns multiple clearly independent responsibilities;
- a new feature would substantially enlarge an already-large module;
- changes repeatedly cause wide unrelated diffs in the same file;
- one responsibility can be tested independently with a cleaner contract;
- concurrency, provenance, diagnostics, rendering, persistence, or another subsystem has developed a stable boundary of its own;
- code review is becoming difficult because unrelated behavior shares one file;
- a module is approaching or exceeding an existing project size guard and the responsibility boundary supports a clean extraction.

## Bad reasons to split

Do not create tiny internal modules merely to reduce line count.

Do not split working code when no meaningful responsibility boundary exists.

Do not introduce extra abstraction layers that make runtime order or data flow harder to understand.

Do not change product behavior merely to satisfy a preferred file size.

## Safety contract

An internal module split is a refactor unless the release goal explicitly changes behavior.

A refactor split must preserve:

- generated bundle/runtime byte semantics unless intentionally rematerialized;
- module execution order;
- public contracts;
- updater and `+` flow;
- source fidelity and UNKNOWN semantics;
- existing behavior regressions.

The relevant module registry/layout tests must derive the active module set from `parts.cjs` or `parts.json`; they must not rely on a historical hard-coded module count.

## Operational preference

When adding a feature, inspect the target internal module before appending code. If the feature creates a new stable responsibility or pushes the module toward an unsafe size/complexity boundary, design the internal extraction as part of the same minimal change rather than letting the file grow indefinitely.

This principle is about keeping one Local Usage Dashboard plugin internally modular, not fragmenting the product into separate plugins.

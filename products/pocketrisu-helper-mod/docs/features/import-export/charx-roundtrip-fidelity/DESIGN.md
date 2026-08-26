# CHARX / module round-trip fidelity — design draft

Status: DESIGN_NEEDED
Feature-ID: `charx-roundtrip-fidelity`

## Problem / evidence

External evidence from `seto-sama/PocketRisu-Kei` commit `294c6e4828861b3590bbd6b40d26a259af12ed97` shows character ↔ module/CHARX conversion losing or misrouting extension metadata: module namespace, hidden-icon state, and the live global-note replacement field. The fix also accepts the legacy `phi` indicator and adds round-trip tests. Evidence is credible code-level evidence but has not yet been reproduced against current PocketRisu, so confidence remains MEDIUM.

## Classification

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: LOW
- Size: S
- Evidence: MEDIUM
- Risk: MEDIUM
- Dependencies: current PocketRisu conversion/extension-field audit
- Priority: P0
- Lifecycle: DESIGN_NEEDED

## Minimal safe scope

First slice is compatibility inspection + regression tests around fields PocketRisu already claims to support. Only add missing mappings that are proven to be current live fields. Do not introduce a new interchange format, migration, storage layer, or broad schema rewrite.

## Ownership boundaries

- character/card import/export parser
- character ↔ module conversion helpers
- Risu extension fields carried by CHARX/V3 cards
- compatibility tests

No server-phone, Android, DB lifecycle, service manager, or deployment changes.

## Proposed mechanism

1. Inventory the current PocketRisu field names and extension serialization for namespace, icon visibility, global-note replacement, assets, toggles, and related module metadata.
2. Define a round-trip matrix for supported fields.
3. When a live field has a proven missing mapping, serialize/deserialize it symmetrically.
4. Accept legacy marker aliases only on read when backward compatibility is demonstrated; emit only the current canonical marker on write.
5. Preserve unrelated lore/extension entries and avoid duplicate indicator synthesis.

## Compatibility / invariants

- Existing CHARX/V3 cards continue to import.
- Legacy accepted markers remain read-compatible where currently expected.
- Conversion must not silently move data into deprecated fields.
- Character → module → character preserves supported semantic values.
- Module → character → module does not duplicate synthetic indicator entries.
- Unknown/unowned extension data must not be destructively discarded merely to simplify conversion.
- PocketRisu guardrails remain unchanged: no forced DB flush, `flushServerDbKeepalive()` remains no-op, targeted V3 plugin reload remains targeted, runit remains, no server-phone Android notifications.

## Validation / acceptance

Focused tests should cover:

- namespace round trip;
- hidden-icon state round trip;
- current global-note replacement round trip;
- legacy marker read compatibility, if PocketRisu currently supports/needs it;
- unrelated lore entries preserved;
- assets/toggles and existing extension fields unaffected;
- repeated round trips do not multiply indicator entries;
- current fixture cards/modules remain byte/semantic compatible where byte identity is not promised.

Acceptance requires the current PocketRisu ownership audit to identify an actual gap. If equivalent behavior is already present, classify the idea as ADOPTED and keep tests/invariant documentation only.

## Risk / blast radius

MEDIUM: conversion bugs can silently lose user-authored metadata, but the proposed first slice is narrow and testable. Avoid broad schema changes.

## Rollback / fallback

A mapping/test PR must be isolated to this feature. Revert the mapping if compatibility fixtures regress; retain non-controversial regression fixtures when they document existing behavior. No data migration is required.

## Dependencies / PR decomposition

1. INSPECT_ONLY: current conversion and CHARX extension ownership audit.
2. Tests demonstrating current behavior/gap.
3. One isolated mapping fix only if the test proves a missing supported field.

Do not progress to READY_TO_PORT until step 1 resolves field ownership and step 2 provides PocketRisu-local evidence.

# IMAGE-GENERATION-PROVENANCE-OWNERSHIP

Status: `HOLD`

## Problem / evidence

`seto-sama/PocketRisu-Kei@016fad84a24db574ea1dff9caedf48a3157ce735` shows a concrete multi-entry-point drift class: UI/client actions, scripting, and trigger paths independently converted generated images into durable inlay artifacts, allowing provenance metadata to differ by caller. The source converged those callers onto one durable-artifact helper that also records target character/chat identity and generation prompt metadata.

Evidence is external and code-level (`MEDIUM`), not a reproduced PocketRisu bug.

## Minimal safe scope

Do not port source-specific helpers or schema fields. If PocketRisu later has multiple durable generated-image entry points and an actual provenance mismatch is reproduced, the smallest safe slice is:

1. add a failing parity test across two owned entry points;
2. centralize only the durable-artifact creation + provenance attachment step;
3. preserve all provider/generation behavior outside that boundary.

## Ownership boundaries

- generation provider/request code remains provider-owned;
- durable generated-image/inlay persistence owns provenance attachment;
- UI/script/trigger callers supply explicit target context when they possess it and do not write durable provenance independently;
- metadata is descriptive state only, never an authorization/security authority.

## Mechanism / invariant

A caller asking for a durable generated image should receive the final durable reference from one canonical owner. That owner attaches provenance before returning success. Explicit target character/chat identity wins; current-context fallback is allowed only where its semantics are defined and stable.

## Compatibility / invariants

- no DB visibility/pagehide flush changes;
- no `flushServerDbKeepalive()` change;
- no save/integrity architecture change;
- no plugin reload behavior change;
- no runit/PM2/device/runtime change;
- no Android notification behavior;
- no schema field is introduced merely because an external variant has one.

## Validation / acceptance

Before implementation:

- inventory all PocketRisu generated-image persistence entry points;
- demonstrate at least one inconsistent/missing provenance case;
- define explicit-target vs current-context fallback behavior.

Acceptance for any future slice:

- equivalent entry points persist equivalent provenance;
- explicit target attribution is preserved;
- fallback attribution is deterministic and covered by tests;
- metadata write failure has explicit behavior and cannot silently claim complete provenance;
- existing image generation output and provider semantics are unchanged.

## Risk / blast radius

Current risk is low because no implementation is authorized. A future change should stay localized to artifact persistence. Main hazards are schema drift, incorrect chat/character attribution, or accidentally elevating provenance into trusted security state.

## Rollback / fallback

Revert the shared owner and restore prior caller-specific flow if parity tests or existing generation behavior regress. Provenance additions must not require destructive migration.

## Dependencies / PR decomposition

Dependencies:

- matching PocketRisu-owned durable generated-image artifact path;
- reproduced provenance mismatch across at least two entry points.

PR decomposition if dependencies resolve:

1. regression test only;
2. XS shared-owner fix for artifact creation + provenance;
3. optional later UI/inspection work as a separate feature.

No implementation branch or PR should be opened while this feature remains `HOLD`.

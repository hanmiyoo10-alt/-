# TOOL-PIPELINE-STAGE-OWNERSHIP

Status: `HOLD`
Owner: assistant-owned design reference

## Problem / evidence

Historical Kei-Risu commit `c92ae0487254349ff6195a15edaffee1cc1c57e0` introduced function-scoped tool regex rules that name an explicit pipeline stage, kept legacy module-style rules separate, and deleted dependent function-regex entries when their owning function was removed. Follow-up `c056efb14083d640ee1d54c90b658134c08842d5` corrected regex flag parsing order before metadata parsing. Together they show that configurable transformations are stateful pipeline objects whose owner and order are part of correctness.

## Minimal safe scope

No PocketRisu code change is proposed. Preserve this as an invariant for any future PocketRisu-owned configurable tool transformation pipeline.

If such an owner appears, the smallest first slice is contract/tests only: define stable stage identifiers and prove dependent configuration is invalidated when its parent function is deleted. Do not begin with a generic regex engine port.

## Ownership boundaries

- tool/function definition owns function identity and lifecycle
- transformation configuration owns only rules attached to an existing function/stage
- execution layer owns executable arguments and results
- presentation layer owns user-visible pending/success/error representations
- legacy compatibility loader owns legacy rule interpretation, not the new typed stage model

No layer may silently reinterpret a rule as belonging to another stage.

## Mechanism / invariants

1. Every configurable transformation has an explicit parent identity and explicit semantic stage.
2. Stage ordering is defined by a contract, not incidental code order.
3. Removing a parent function removes or invalidates all dependent transformation records atomically from the configuration perspective.
4. Legacy rules remain distinguishable and auditable; they are not silently rewritten into a typed stage without compatibility tests.
5. Argument, sub-agent output, model-result, and user-presentation boundaries are not interchangeable.
6. Parser/regex failures fail locally; they must not cause execution to cross into a different stage.
7. No implementation may weaken PocketRisu plugin/tool permissions or sanitizer/security boundaries.

## Compatibility / acceptance

Before implementation can be considered:

- identify a matching PocketRisu-owned pipeline;
- document every stage input/output and whether it can influence execution, model context, persistence, or presentation;
- demonstrate deterministic ordering for multiple rules;
- demonstrate parent deletion leaves no active dangling rule;
- demonstrate malformed rules fail without changing adjacent stages;
- demonstrate legacy rules keep existing semantics;
- demonstrate hidden/presentation-only choices do not alter execution/model history unless explicitly designed to do so.

## Risk / blast radius

`HIGH`. A wrong stage or ordering rule can mutate executable arguments, model-visible content, persisted state, or presentation. This crosses a security-sensitive parser/tool-call boundary.

## Rollback / fallback

Keep the existing PocketRisu behavior as the default. Any future implementation must be independently disableable/revertible without migrating durable user data. Do not destructively rewrite legacy rules as part of the first slice.

## Dependencies

- concrete PocketRisu tool/function transformation owner
- explicit stage-order contract
- security review of execution/model/persistence/presentation trust boundaries
- legacy compatibility inventory

## PR decomposition

1. Contract and regression tests only.
2. Optional owner-lifecycle cleanup for already-existing typed rules, if a real dangling-reference bug is reproduced.
3. Any new configurable transformation feature only under a separate, security-reviewed instruction.

No autonomous implementation is authorized by this dossier.
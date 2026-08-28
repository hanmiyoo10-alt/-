# DEPLOY-STRICT-SHELL-PARTIAL-NONMATCH

## Status

Adopted invariant. No implementation PR required while PocketRisu remains compliant.

## Problem / evidence

`PocketRisu-Alter/PocketRisu-Alter@3181f3aa499b6af884293db3391b03c108af7144` fixed a strict-shell installer/updater failure. With `set -euo pipefail`, `ls -d A* B* 2>/dev/null | head -1` can fail when exactly one expected naming family exists because the unmatched glob makes `ls` non-zero; `pipefail` propagates the failure out of command substitution and aborts before the intended `[ -d ]` postcondition check. Redirecting stderr only hides the error text.

Current `hanmiyoo10-alt/PocketRisu:main` uses bounded `find` archive discovery and explicit directory validation, so the lesson is already adopted.

## Minimal safe invariant

Archive/layout discovery in strict-shell deployment scripts must:

1. tolerate expected partial non-matches without relying on stderr suppression;
2. avoid SIGPIPE/non-zero producer behavior that becomes fatal through `pipefail` merely because a first-result consumer exits early;
3. remain bounded to the expected extraction root and naming contract;
4. validate the discovered path explicitly before destructive install/update steps.

## Ownership boundaries

- shell installer/updater control flow owns discovery failure semantics;
- archive extraction owns creating candidate directories;
- replacement logic must consume only a validated directory result;
- this invariant does not change backup/user-data ownership rules.

## Compatibility / guardrails

Preserve runit deployment and all PocketRisu save/integrity guardrails. This invariant must not introduce PM2, Android notification behavior, host package/runtime migration, or any forced DB flush behavior.

## Validation / acceptance

Run extraction-discovery behavior under `set -euo pipefail` for:

- current PocketRisu directory only;
- legacy directory only;
- both names present (must have deterministic bounded behavior or fail explicitly if ambiguity is disallowed);
- no matching directory (must reach explicit validation/error rather than silent shell termination);
- paths containing spaces where applicable.

Acceptance: expected partial non-match never terminates the script before the explicit postcondition; no-match fails visibly and before replacement.

## Risk / blast radius

Risk is LOW while this remains an invariant-only record. A regression can block fresh installs and updates across all shell-managed deployments, but rollback is a localized script revert.

## Rollback / fallback

Restore the last known bounded discovery helper and explicit postcondition. Never “fix” a failure by adding `|| true` around a broad extraction pipeline because that can hide genuine archive errors.

## Dependencies / PR decomposition

Dependencies: NONE for preserving the current invariant. If tests are later added, keep them in one deployment-script test PR without unrelated installer cleanup.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`

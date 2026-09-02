# Feature-ID: PLUGIN-UPDATE-PRESERVES-COMPATIBLE-USER-STATE

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `c81938a487887953cdbd3b82a84178fee3edbbf3` fixed plugin update/reinstall behavior that rebuilt argument values from new-code defaults, erasing user-owned presets/API-key-like values and allowing automatic update to re-enable a plugin the user had disabled. Review follow-up `89fc53db9383e46d43ad3662b750341630a8ff35` corrected the compatibility predicate for option-list argument declarations: equal arrays reconstructed by a plugin manager are compatible by content/order, not by object identity.

## Minimal safe scope

When replacing a plugin entry with newly imported/updated code:

1. preserve a previous argument value only if the new plugin still declares the same key with the same effective argument schema;
2. initialize new or retyped keys from the new plugin default;
3. preserve the user's enabled/disabled choice on automatic update;
4. compare structured declaration types semantically under their documented contract, not by reference identity.

## Ownership boundaries

- Plugin code and declared defaults are plugin-owned and may change on update.
- Compatible `realArg` values and enabled/disabled choice are user-owned state.
- The import/update boundary decides whether a user value is schema-compatible enough to migrate; it must not silently broaden that authority.

## Mechanism

Build the new plugin entry from the new code/defaults, then selectively copy old user state across the replacement boundary. For scalar declarations, exact declaration equality is sufficient. For current option-list declarations (`string[]`), compatible means equal length and equal ordered option content. Do not carry state for removed/new/retyped keys. During automatic update, copy the old enabled state.

## Compatibility / invariants

- Do not disturb targeted V3 reload semantics.
- Do not weaken plugin permission/storage boundaries.
- Do not treat arbitrary deep equality/coercion as schema compatibility.
- An update may introduce new defaults without overwriting compatible user-owned values.
- A disabled plugin must not become enabled merely because its code updated.

## Validation / acceptance

Acceptance coverage should include:

- scalar key with unchanged declaration keeps old value;
- option-list declaration reconstructed as a different array object with identical ordered content keeps old value;
- changed option list, retyped key, new key, and removed key do not incorrectly inherit stale values;
- automatic update keeps an intentionally disabled plugin disabled;
- ordinary fresh install still uses the new defaults.

## Risk / blast radius

`LOW`. The change is localized to plugin import/update state migration. The principal failure mode is either unintended user-state loss (too strict) or carrying invalid state into a changed schema (too permissive).

## Rollback / fallback

Rollback is a localized revert of the state-carry-forward logic. If richer schemas make compatibility ambiguous, fail conservative for that schema and use the new default rather than guessing.

## Dependencies

`NONE`.

## PR decomposition

No new implementation PR is required: this invariant is already adopted in official PocketRisu. Future work touching plugin argument schemas should update the compatibility predicate and its focused tests in the same narrow PR.

## Source history

- `PocketRisu/PocketRisu@c81938a487887953cdbd3b82a84178fee3edbbf3` — preserve argument values and enabled state across updates.
- `PocketRisu/PocketRisu@89fc53db9383e46d43ad3662b750341630a8ff35` — compare option-list declaration types by content/order rather than reference identity.

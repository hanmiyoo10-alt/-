# SimCore v0.66.0 terminal-closure revert root cause and repair

Date: 2026-08-29 KST

Status: **ROOT CAUSE RESOLVED · FIX · ADMIN STATE BLOCKER · NON_RUNTIME · PRODUCTION UNCHANGED**

## 1. Incident

Accepted v0.66.0 real-long-chat evidence had already established product correctness and the terminal administrative PR was merged as commit `06c3924df05aebe1271ad4b4b3bbe9d1868649ce`.

The canonical-main protection guard then reverted that exact tip as `89d7073270422e2d0a4945ec38494f5236b1e6b0`.

Production remained unchanged throughout:

```text
release-simcore = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
version         = 0.66.0
blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
latest.js       = install.js
```

## 2. Exact root cause

The revert was not an unexplained repository rollback and was not a runtime failure.

SimCore CI on the terminal merge failed only the regression gate. The exact closure-integrity assertion was:

```text
SUITE_ASSERTION_FAILED: closure-integrity: active human current-state prose duplicates version literal
```

The terminal projection changed the active human current-state paragraph in `docs/CURRENT_DEVELOPMENT.md` from identity-free prose to prose beginning with an explicit current version literal:

```text
The v0.66.0 M2-4 product live gate ...
```

R2.2 closure-integrity intentionally requires the active human current-state section to remain identity-free because machine-managed current-state blocks own exact version/commit/release identity.

Therefore the sequence was deterministic and correct:

```text
terminal projection merged
→ active human current-state prose duplicates exact version identity
→ MAIN_HEALTH / closure-integrity fails
→ canonical-main exact-current-tip soft guard confirms the failed tip
→ guard creates bounded git revert
→ production remains untouched
```

## 3. Classification

```text
06600_TERMINAL_CLOSURE_AUTOMATED_REVERT
= ROOT_CAUSE_RESOLVED
= FIX
= ADMIN_STATE / DOCUMENT_PROJECTION
= NON_RUNTIME
= PRODUCTION_UNCHANGED
= PROTECTION_GUARD_BEHAVIOR_CORRECT
```

The protection mechanism is not to be weakened.

## 4. Repair contract

Re-establish terminal authority without changing runtime or broadening release-system authority:

```text
1. preserve accepted human evidence;
2. restore durable checkpoint M2-4 through the existing bounded state-coordinate path;
3. rerun the existing durable-memory state renderer against current production identity;
4. keep active human current-state prose identity-free;
5. require exactly one current release-state block in CURRENT_DEVELOPMENT;
6. require validation LIVE_PASS and current priority M2_5_POST_06600_TRANSITION_DEBT_REVIEW;
7. retire the consumed one-shot admin transition only after durable state is confirmed;
8. require MAIN_HEALTH / SimCore Verify + Required PASS;
9. do not mutate or republish release-simcore.
```

Do not weaken `closure-integrity`, bypass canonical-main protection, or add a second main writer.

## 5. R2.6 consequence

This finding resolves the unknown fifth boundary recorded by the frozen R2.6 design.

It does not invalidate R2.6. Instead it confirms the existing trust model:

```text
trusted predecessor / canonical-main guard = KEEP
terminal document projection bug           = FIX AT STATE PROJECTION
new authority                              = NONE
```

R2.6 implementation remains blocked until terminal administrative truth is durably re-established and the terminal release-system retrospective is recorded.

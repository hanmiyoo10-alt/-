# SimCore v0.66.0 Builder Validation Harness Failure 02 — Self-Delete Staging

Date: 2026-08-29

Classification:

```text
FIX / VALIDATION_HARNESS / NON_RUNTIME / PRODUCTION_UNCHANGED
```

## Trigger

Temporary assertion-repair workflow:

```text
Temporary SimCore 06600 Builder Assertion Fix
run 33199519278
job 98945162152
```

## What passed

The bounded repair step successfully:

```text
- narrowed the Slice B builder assertion from an unqualified substring match
  to the Session-owned method-definition shape only;
- recomputed the builder SHA for the temporary validation workflow;
- removed the temporary repair workflow in the runner worktree;
- passed python3 -m py_compile for the modified builder;
- passed git diff --check.
```

The intended assertion fix therefore parsed correctly and was locally valid inside the workflow runner.

## Failure

The commit step then ran:

```text
git add products/.../build-06600-...py \
        .github/workflows/tmp-simcore-06600-builder-validation.yml \
        .github/workflows/tmp-simcore-06600-builder-assertion-fix.yml
```

but the final path had already been removed by `git rm`, producing:

```text
fatal: pathspec '.github/workflows/tmp-simcore-06600-builder-assertion-fix.yml' did not match any files
```

No commit/push occurred from the repair workflow.

## Root cause

This is a temporary validation-harness staging bug only:

```text
self-delete was already staged by git rm
+
commit step explicitly re-added the now-absent path
→ pathspec failure before commit
```

## Required repair

Use one bounded replacement one-shot workflow that:

```text
1. applies the already-proven builder assertion fix;
2. refreshes the temporary validation workflow's expected builder SHA;
3. removes all temporary assertion-fix workflows from the branch;
4. stages with `git add -A`;
5. commits and pushes once.
```

The read-only exact-production builder validation may remain temporarily until the builder/materialization gate passes, then must be removed before the final product PR.

## Safety

```text
runtime artifact mutation on release-simcore = NONE
production commit/blob change               = NONE
candidate publication                       = NONE
plugin execution exposure                   = NONE
```

This failure does not change Slice A/B/C/D design or runtime semantics.

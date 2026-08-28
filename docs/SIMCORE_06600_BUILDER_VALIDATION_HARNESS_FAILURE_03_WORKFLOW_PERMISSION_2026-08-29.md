# SimCore v0.66.0 Builder Validation Harness Failure 03 — Workflow Self-Modification Permission

Date: 2026-08-29

Classification:

```text
FIX / VALIDATION_HARNESS / NON_RUNTIME / PRODUCTION_UNCHANGED
```

## Trigger

Temporary assertion recovery workflow:

```text
Temporary SimCore 06600 Builder Assertion Recovery
run 33199671420
job 98945668805
```

## What passed

The runner successfully:

```text
- applied the already-proven Slice B assertion narrowing;
- computed repaired builder SHA256:
  ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50
- updated the temporary builder-validation workflow's expected hash in its worktree;
- removed both temporary assertion-fix workflows in its worktree;
- passed builder py_compile;
- passed git diff --check;
- staged and created a local commit.
```

## Failure

Remote push was rejected with:

```text
refusing to allow a GitHub App to create or update workflow
`.github/workflows/tmp-simcore-06600-builder-validation.yml`
without `workflows` permission
```

Therefore the local runner commit was not published to the branch.

## Additional harness hygiene finding

Because the runner executed:

```text
python3 -m py_compile ...
```

before `git add -A`, a local `__pycache__/*.pyc` artifact was also staged in the unpushed runner commit.

No `.pyc` artifact reached the repository because the push failed.

## Root cause

The temporary recovery design attempted to self-modify another workflow through the default GitHub Actions app token. That token had `contents: write` but not the separate workflow-modification permission required by GitHub.

This is an execution-harness boundary, not a SimCore runtime defect.

## Required repair

Stop using Actions self-modification for this recovery.

Use the repository contents API under the connected GitHub authority to:

```text
1. update the builder assertion directly;
2. update the temporary read-only validation workflow hash directly;
3. delete obsolete temporary assertion-fix/recovery workflows directly;
4. leave only the read-only exact-production validation workflow until the builder gate passes.
```

Avoid staging generated Python bytecode in all later harnesses.

## Safety

```text
release-simcore mutation = NONE
production mutation      = NONE
candidate publication    = NONE
runtime exposure         = NONE
```

Slice A/B/C/D implementation semantics remain unchanged.

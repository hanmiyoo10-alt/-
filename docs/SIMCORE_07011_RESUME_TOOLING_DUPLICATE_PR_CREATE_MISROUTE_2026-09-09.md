# SimCore v0.70.11 Resume Tooling Misroute — Duplicate PR Create

Date: 2026-09-09 KST
Status: **FIX · TOOLING CALL MISROUTE · FAIL-CLOSED · CLOSED**
Scope: administrative tooling only

## Incident

During resumption of the paused v0.70.11 candidate lane, a `create_pull_request` call was issued before the already-existing candidate PR identity had been re-read.

The attempted request used the existing head branch `release/simcore-v07011-intent-01`. GitHub rejected it with HTTP 422 because a pull request already existed for that head.

Existing authority discovered immediately afterward:

```text
PR = #1702
head branch = release/simcore-v07011-intent-01
head = eb53c5ab801f3a62bfec9f6070d323ce5759b47b
state = OPEN
```

## Disposition

```text
CLASSIFICATION = FIX / TOOLING_CALL_MISROUTE / ADMIN ONLY
GITHUB_MUTATION_FROM_FAILED_CALL = NONE
RUNTIME_IMPACT = NONE
RELEASE_SIMCORE_IMPACT = NONE
CANDIDATE_IDENTITY_IMPACT = NONE
STATUS = CLOSED AFTER RECORD
```

Guard reinforced for resumed release work:

```text
search/fetch existing branch and PR identity first
→ only create a new branch/PR when absence is proven
```

This record is separate from the substantive candidate validation failure tracked by #1941.

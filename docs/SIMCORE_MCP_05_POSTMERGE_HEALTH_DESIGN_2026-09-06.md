# SimCore MCP-05 — Read-Only Post-Merge Health Design

Date: 2026-09-06
Tracking: #1728
Classification: TOOLING · MCP · READ_ONLY · DESIGN_FIRST

## 1. Purpose

Add a fifth SimCore MCP tool:

```text
simcore_postmerge_health(commit_sha)
```

MCP-05 answers one narrow operational question:

> Given an exact commit that was expected to land on `main`, is that commit still represented by current `main`, did its required merged-main workflows reach an acceptable terminal state, and did production remain coherent relative to the production baseline declared at that commit?

MCP-05 is a post-merge observer. It does not merge, rerun, repair, revert, release, approve, or mutate anything.

## 2. Why this tool exists

The existing SimCore closure protocol repeatedly performs the same read-only sequence after a PR merge:

1. verify the merge/main commit is present on fresh `main`;
2. verify merged-main SimCore CI;
3. verify canonical-main documentation automation;
4. distinguish a superseded/cancelled exact run from a real failure;
5. verify no explicit revert of the target commit appeared later;
6. verify deployed production did not change unexpectedly;
7. verify current production identity and documentation authority remain healthy.

MCP-05 turns that repeated manual sequence into one deterministic read-only report.

## 3. Authority boundary

MCP-05 composes existing authorities without replacing them.

- `main` remains design/evidence/admin authority.
- `release-simcore` remains deployed plugin-code authority.
- `product-manifest.json` remains production identity/current-state authority.
- MCP-02 remains the focused current production-identity verifier.
- MCP-03 remains the focused current documentation-drift verifier.
- GitHub Actions remains workflow-run authority.
- Git commit ancestry remains reachability authority.
- explicit successor commit messages are bounded evidence for detecting an explicit revert of the supplied target.

A result of `healthy: true` is observational evidence only. It is not release authorization and does not prove semantic correctness beyond the checks named by this contract.

## 4. Input contract

```text
commit_sha: string
```

Accepted form:

```text
40 lowercase or uppercase hexadecimal characters
```

The output normalizes the SHA to lowercase.

Examples:

```text
4e0bb0aff576f0fd274b877d1098030d6cf23ec8  valid
4e0bb0a                                   invalid
main                                      invalid
```

No PR number, branch name, workflow run id, version, issue number, or release command is accepted.

## 5. Output contract

Top-level structure:

```text
{
  "healthy": bool,
  "repository": str,
  "target": {
    "commit_sha": str,
    "subject": str | null,
    "resolved": bool,
    "baseline_manifest_blob": str | null
  },
  "main": {
    "branch": str,
    "sha": str | null,
    "target_reachable": bool | null,
    "compare_status": str | null
  },
  "workflows": {
    "simcore_ci": {...},
    "canonical_docs": {...}
  },
  "revert": {
    "explicit_revert_found": bool | null,
    "matching_commits": [...]
  },
  "production_baseline": {...},
  "components": {
    "production_identity": {...},
    "docs_drift": {...}
  },
  "checks": [...],
  "violations": [...],
  "errors": [...]
}
```

`healthy` is true only when all required checks pass and `errors` is empty.

## 6. Required top-level checks

Checks are emitted in deterministic order:

```text
TARGET_COMMIT_SHA_VALID
TARGET_COMMIT_AVAILABLE
MAIN_HEAD_AVAILABLE
TARGET_REACHABLE_FROM_MAIN
NO_EXPLICIT_REVERT_OF_TARGET
SIMCORE_CI_POSTMERGE_SUCCESS
CANONICAL_DOCS_POSTMERGE_SUCCESS
TARGET_MANIFEST_AVAILABLE
PRODUCTION_BASELINE_VERSION_MATCH
PRODUCTION_BASELINE_RELEASE_BRANCH_MATCH
PRODUCTION_BASELINE_RELEASE_COMMIT_MATCH
PRODUCTION_BASELINE_RELEASE_BLOB_MATCH
CURRENT_PRODUCTION_IDENTITY_PASS
CURRENT_DOCS_DRIFT_PASS
```

No dynamic per-workflow check names are added.

## 7. Target commit resolution

For a syntactically valid SHA, MCP-05 must resolve the exact commit through the GitHub commits API.

The target component records at least:

```text
sha
subject
first_parent_sha when available
```

If the commit cannot be read, `TARGET_COMMIT_AVAILABLE` fails and downstream checks that require target data fail closed rather than fabricating values.

## 8. Current-main reachability

MCP-05 reads the current configured main branch head.

If:

```text
target_sha == main_head_sha
```

then reachability passes directly.

Otherwise MCP-05 compares:

```text
base = target_sha
head = current_main_sha
```

through GitHub's compare API.

The target is considered reachable from current main only when the comparison proves the target is an ancestor of the current main head. The preferred proof is:

```text
merge_base_commit.sha == target_sha
```

A mere successful HTTP response or a comparison status string by itself is not sufficient when merge-base evidence is available.

This permits unrelated/concurrent commits to advance `main` after the target merge.

## 9. Explicit revert detection

Reachability alone does not prove that the target's effects were not later reverted, because a revert commit preserves ancestry.

MCP-05 therefore inspects successor commits in the bounded target-to-main comparison and marks an explicit revert when a successor commit message contains either:

```text
This reverts commit <target_sha>
```

or a conventional exact subject-form revert:

```text
Revert "<target subject>"
```

Matching is case-sensitive for the conventional generated forms except the target SHA itself may be normalized for comparison.

MCP-05 does not claim to detect a manually reconstructed semantic revert with an unrelated commit message. The check is therefore named:

```text
NO_EXPLICIT_REVERT_OF_TARGET
```

not `TARGET_SEMANTICS_UNCHANGED`.

The report preserves matching successor SHA/subject evidence when a revert is found.

## 10. Workflow authorities

Required workflow files:

```text
.github/workflows/simcore-ci.yml
.github/workflows/canonical-main-docs.yml
```

Human display names may change without changing this design; workflow file identity is the stable selector.

Only `push` runs on configured `main` are relevant to MCP-05 merged-main health.

Pull-request-triggered runs do not satisfy post-merge checks.

## 11. Exact-run and superseded-run semantics

For each required workflow, MCP-05 first looks for a run whose:

```text
head_sha == target_sha
branch == main
event == push
```

### Exact target success

If an exact target run completes successfully, the workflow check passes.

### Exact target hard failure

If an exact target run reaches a hard-failure conclusion such as:

```text
failure
timed_out
action_required
startup_failure
stale
```

MCP-05 fails the workflow check. A later unrelated successful run must not erase a proven hard failure.

### Exact target superseded/cancelled

If the exact target run is cancelled, skipped, or absent because main advanced quickly, MCP-05 may accept a successor run only when all of these are true:

1. successor run is for the same workflow file;
2. successor run is a `push` on configured `main`;
3. successor run conclusion is `success`;
4. successor `head_sha` is proven to descend from the target commit;
5. the chosen successor is the earliest acceptable successful descendant found within the bounded search window.

This formalizes the already-used SimCore concurrency rule where a target run may be superseded by a later green main run that contains the target.

### Pending state

A currently queued/in-progress exact target run does not become success merely because some older run is green.

If no acceptable terminal success exists, the check fails closed with evidence describing the best candidate state found.

## 12. Bounded workflow search

MCP-05 must use bounded pagination.

Default maximum:

```text
3 pages × 100 runs per workflow
```

The bound may be configurable later but must not become unbounded in MCP-05.

The report records whether an exact or successor run satisfied each workflow:

```text
resolution: EXACT | SUCCESSOR | NONE
run_id
head_sha
status
conclusion
created_at
```

If the search bound is exhausted without proof, the check fails closed.

## 13. Production baseline at the target commit

MCP-05 reads:

```text
product-manifest.json
```

at the exact target commit SHA.

This target-time manifest is the production baseline for the post-merge observation.

Required baseline fields:

```text
production_version
release_branch
release_commit
release_blob
```

The baseline manifest blob is preserved in the result.

This design intentionally makes MCP-05 an "as-of-now relative to that target" check. A later legitimate production release can cause an old target's baseline comparison to fail, which means the old post-merge snapshot is no longer the current production baseline. That is expected and must not be rewritten as historical corruption.

## 14. Current production comparison

MCP-05 composes MCP-02:

```text
verify_production_identity(reader)
```

The target baseline is compared against the current MCP-02 report.

Required comparisons:

```text
baseline production_version == current declared production_version
baseline release_branch      == current declared release_branch
baseline release_commit      == current declared release_commit
baseline release_blob        == current declared release_blob
```

MCP-02 itself must also pass.

This provides two different facts:

1. current production is internally coherent;
2. current production is still the production baseline declared at the supplied target commit.

## 15. Current documentation health

MCP-05 composes MCP-03:

```text
check_docs_drift(reader)
```

The complete component report is preserved and top-level check:

```text
CURRENT_DOCS_DRIFT_PASS
```

reflects its existing pass semantics without reimplementation.

## 16. Partial-failure behavior

MCP-05 must preserve every section that can be read successfully.

Examples:

- target commit readable, Actions API unavailable → ancestry/baseline remain visible, workflow errors are explicit;
- SimCore CI readable, canonical docs API fails → SimCore CI evidence remains visible;
- target manifest malformed → workflow/ancestry evidence remains visible;
- current MCP-02 fails → target/workflow evidence remains visible.

No failed read may be converted into `healthy: true` by omission.

## 17. Error contract

Errors use deterministic objects:

```text
{
  "source": str,
  "message": str
}
```

Representative sources:

```text
commit:<sha>
branch:main
compare:<target>...<head>
workflow:.github/workflows/simcore-ci.yml
workflow:.github/workflows/canonical-main-docs.yml
json:<sha>:product-manifest.json
component:production_identity
component:docs_drift
```

`healthy` is false whenever `errors` is non-empty.

## 18. GitHubReader additions

MCP-05 may extend the existing GET-only `GitHubReader` with bounded read methods such as:

```text
get_commit(sha)
compare_commits(base, head)
list_workflow_runs(workflow_file, branch, event="push", max_pages=3)
```

All methods must use HTTP GET only.

MCP-05 must not add POST, PUT, PATCH, DELETE, workflow dispatch, rerun, merge, release, issue, or PR mutation capabilities to the MCP server.

## 19. Determinism

For identical GitHub state and identical input, output ordering must be deterministic.

- top-level check order is fixed;
- matching revert commits are ordered by successor chronology;
- workflow selection follows exact-first, then earliest proven successful descendant;
- violations follow check order;
- errors follow attempted authority order.

## 20. Test matrix

Minimum deterministic tests:

1. exact target is current main and both required workflows succeed;
2. target is ancestor of newer main and exact workflow runs succeed;
3. exact workflow cancelled, proven descendant successor succeeds;
4. exact workflow hard-fails and later successor success must not mask failure;
5. target is not reachable from current main;
6. explicit `This reverts commit <sha>` successor is detected;
7. conventional `Revert "<target subject>"` successor is detected;
8. malformed commit SHA fails closed without network fabrication;
9. target commit read failure remains visible;
10. one workflow API failure preserves the other workflow evidence;
11. target manifest missing/malformed fails closed;
12. target production version differs from current production baseline;
13. target release commit/blob differs from current baseline;
14. current MCP-02 failure propagates;
15. current MCP-03 failure propagates;
16. workflow search bound exhaustion fails closed;
17. current main can advance with unrelated commits while target remains healthy;
18. later legitimate production advancement causes old-target baseline mismatch without being labelled historical corruption.

## 21. Protocol smoke acceptance

After design, implementation, PR-head CI, merge, merged-main CI, and production immutability checks pass, Termux must call the tool through the MCP protocol.

Preferred smoke target is the MCP-05 implementation/evidence merge commit itself after it lands on main.

Acceptance requires:

```text
IS_ERROR: False
healthy: True
TARGET_REACHABLE_FROM_MAIN: pass
NO_EXPLICIT_REVERT_OF_TARGET: pass
SIMCORE_CI_POSTMERGE_SUCCESS: pass
CANONICAL_DOCS_POSTMERGE_SUCCESS: pass
CURRENT_PRODUCTION_IDENTITY_PASS: pass
CURRENT_DOCS_DRIFT_PASS: pass
violations: []
errors: []
```

If main advances before the smoke, a proven successful successor workflow run is acceptable under section 11.

## 22. Closure rule

#1728 may close only after:

1. design PR-head CI passes;
2. design merges and merged-main health passes;
3. implementation tests pass;
4. implementation PR-head CI passes;
5. implementation merges and merged-main health passes;
6. implementation evidence is merged;
7. `release-simcore` production identity is unchanged by MCP tooling work;
8. Termux MCP protocol smoke passes;
9. protocol-smoke closeout evidence is merged;
10. fresh main/no explicit revert is confirmed.

## 23. Explicit non-goals

MCP-05 does not:

- perform a merge;
- rerun or dispatch workflows;
- close issues or PRs;
- edit documentation;
- repair a failed post-merge state;
- mutate `main` or `release-simcore` through the MCP protocol;
- deploy production;
- replace canonical SimCore CI;
- infer that a manually reconstructed semantic revert did or did not occur when there is no explicit bounded evidence.

## 24. Verdict

MCP-05 is authorized as a read-only post-merge observer only.

It turns the repeated SimCore post-merge closure checks into a deterministic evidence surface while keeping all existing production, release, CI, documentation, and HUMAN_EVIDENCE authorities intact.

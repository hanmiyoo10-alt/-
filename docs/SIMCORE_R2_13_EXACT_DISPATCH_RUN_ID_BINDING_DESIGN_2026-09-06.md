# SimCore R2.13 Exact Dispatch Run-ID Binding Design

Date: 2026-09-06 KST
Status: **DESIGN FROZEN · IMPLEMENTATION NOT AUTHORIZED · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / CANONICAL DOCUMENTATION PROMOTION CONTROL PLANE**
Base main commit: `538273b14e6d86cffdf49a85692de6678fc2d86c`
Predecessor: **R2.12 Release-Channel-Aware Candidate Source Routing = KEEP / CLOSED**

## 1. Executive disposition

```text
R2.13 NAME = Exact Dispatch Run-ID Binding
R2.12 = KEEP / DO NOT REOPEN
PRIMARY FIX = CANONICAL_DOC_PROMOTION_STALE_SAME_HEAD_CHILD_RUN_SELECTION
PRIMARY LENSES = STABILIZATION + AUTOMATION + SIMPLIFICATION
RUNTIME MUTATION = NONE
release-simcore MUTATION = NONE
NEW SIMCORE PROFILE = NONE
NEW CHILD WORKFLOW INPUT = NONE
NEW HELPER SERVICE = NONE
IMPLEMENTATION OWNERS = EXACTLY 2
IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS DESIGN
```

R2.13 keeps the R2.12 source-routing contract exactly as deployed and replaces the remaining ambiguous child-run discovery mechanism with direct binding to the workflow run ID returned by the dispatch API.

The target flow becomes:

```text
exact documentation head
-> dispatch Plugin Control Plane through workflow-dispatch REST endpoint
-> receive exact Plugin Control Plane workflow_run_id
-> dispatch SimCore MAIN_HEALTH through workflow-dispatch REST endpoint
-> receive exact SimCore workflow_run_id
-> verify each returned run belongs to exact documentation head
-> watch those exact run IDs
-> exact-base / exact-head merge
```

No post-dispatch search by `headSha` remains necessary.

## 2. Why R2.13 exists

R2.12 correctly fixed source-role routing:

```text
documentation candidate
-> verifier identity = exact documentation head
-> SimCore profile = MAIN_HEALTH
-> runtime byte authority = release-simcore
```

Natural operation then exposed a different defect in the parent promotion workflow.

Current child selection is approximately:

```bash
gh run list --workflow "$workflow" --branch "$DOC_BRANCH" --event workflow_dispatch --limit 30 \
  --json databaseId,headSha,status,conclusion \
  --jq ".[] | select(.headSha == \"$HEAD_SHA\") | .databaseId" | head -n 1
```

When several workflow-dispatch runs share the same generated documentation head, the parent can select a stale prior run. That happened naturally in promotion #5395 even though the fresh R2.12 child itself passed.

The problem is therefore not source routing. It is child transaction identity.

Frozen problem statement:

```text
current identity = workflow + branch + event + headSha
required identity = exact workflow run created by this dispatch
```

## 3. R-series rubric application

The canonical R-series feedback order is:

```text
STABILIZATION > SAFE AUTOMATION > SIMPLIFICATION
```

R2.13 is accepted as a design only because one bounded mechanism improves all three lenses without weakening R2.12.

### 3.1 Stabilization = STRONGER

The current path infers run identity after dispatch by searching a set that may contain old same-head runs.

R2.13 instead binds to the run ID returned by the dispatch operation itself.

Expected stabilization gains:

```text
stale same-head selection ambiguity = removed
headSha-first child discovery = removed
first-match databaseId selection = removed
poll-until-a-similar-run-appears behavior = removed
exact child identity = explicit
child failure handling = still fail-closed
exact documentation head check = preserved
exact-base / exact-head merge guard = preserved
```

A returned run ID is not accepted blindly. Before watching it, the parent must re-read the run and require:

```text
run exists
run event = workflow_dispatch
run head_sha = expected HEAD_SHA
```

Any mismatch is BLOCKER / fail-closed for that promotion.

### 3.2 Automation = MORE AUTOMATIC AND SAFER

Current automation dispatches a child and then separately guesses which resulting run is the intended one.

R2.13 makes identity part of the automated transaction itself:

```text
dispatch
-> receive workflow_run_id
-> carry workflow_run_id as step output
-> verify exact head
-> watch exact workflow_run_id
```

This removes interpretive discovery from the parent and requires no human choice or retry judgment.

Human approval boundaries elsewhere remain unchanged.

### 3.3 Simplification = SIMPLER

R2.13 removes machinery instead of adding a new identity layer.

Expected deletions from the active promotion path:

```text
find_run() helper
wait_for_run() discovery helper
`gh run list` child discovery
headSha filter used as child lookup key
`head -n 1` first-match selection
60-iteration discovery loop
2-second discovery sleeps
```

Not added:

```text
new SimCore validation profile
new workflow input / nonce
new persistent transaction record
new helper script
new state file
new service
new source of truth
new runtime/release concept
```

The only new platform primitive is the workflow-dispatch response's exact `workflow_run_id`, which already belongs to GitHub Actions itself.

## 4. External platform capability frozen for this design

GitHub's current workflow-dispatch REST endpoint documents a successful response containing:

```json
{
  "workflow_run_id": 1,
  "run_url": "...",
  "html_url": "..."
}
```

The documented endpoint is:

```text
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
```

The design pins requests to the current documented API version:

```text
X-GitHub-Api-Version: 2026-03-10
```

Implementation must parse `workflow_run_id` fail-closed. If the repository token or hosted environment does not actually return this field under the pinned API contract, implementation qualification fails. There is no fallback to same-head search.

External reference reviewed during design:

```text
https://docs.github.com/en/rest/actions/workflows
```

## 5. Frozen authority contract

R2.13 must preserve R2.12 exactly:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed SimCore runtime byte authority
canonical documentation head = verifier identity for docs promotion
SimCore docs-only validation profile = MAIN_HEALTH
CANDIDATE_SHADOW = genuine runtime-candidate lane only
latest.js == install.js invariant = unchanged
human runtime live acceptance = unchanged
```

R2.13 must not reinterpret a documentation candidate as a runtime candidate.

## 6. Frozen implementation owners

Exactly two implementation owners are allowed:

```text
1. .github/workflows/canonical-main-doc-promotion.yml
2. .github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

### 6.1 Workflow owner

The workflow owns:

```text
dispatch
returned child run IDs
exact-run metadata revalidation
exact-run watch
exact-base / exact-head merge
```

### 6.2 Regression owner

The existing documentation-stream contract test owns the permanent deterministic regression for the canonical promotion workflow.

## 7. Explicit non-owners

R2.13 implementation must not modify:

```text
.github/workflows/simcore-ci.yml
.github/workflows/plugin-control-plane-ci.yml
products/simcore/tooling/check.mjs
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
product-manifest.json
R2.9 validation projection
R2.10 context semantics
R2.11 profile inventory
R2.12 MAIN_HEALTH routing semantics
release approval workflows
permanent release workflows
runtime behavior
```

No runtime release is created by R2.13.

## 8. Frozen dispatch contract

The future implementation must stop using `gh workflow run` for these two canonical documentation child dispatches because that command does not provide the exact run identity needed by the parent transaction.

Conceptual Plugin Control Plane dispatch:

```text
POST /repos/$GITHUB_REPOSITORY/actions/workflows/plugin-control-plane-ci.yml/dispatches
body.ref = $DOC_BRANCH
response.workflow_run_id -> PLUGIN_RUN_ID
```

Conceptual SimCore dispatch:

```text
POST /repos/$GITHUB_REPOSITORY/actions/workflows/simcore-ci.yml/dispatches
body.ref = $DOC_BRANCH
body.inputs.profile = MAIN_HEALTH
response.workflow_run_id -> SIMCORE_RUN_ID
```

The SimCore dispatch must continue to omit:

```text
candidate_commit
candidate_fetch_ref
```

## 9. Frozen exact-run verification contract

For each returned run ID, before `gh run watch`:

```text
GET /repos/$GITHUB_REPOSITORY/actions/runs/{workflow_run_id}
```

must prove:

```text
event == workflow_dispatch
head_sha == HEAD_SHA
```

The run ID itself is the transaction identity. `head_sha` becomes a validation assertion, not a discovery key.

Required semantic distinction:

```text
OLD: find a run because its head looks right
NEW: receive the exact run, then prove its head is right
```

## 10. Frozen watch contract

After exact-run verification:

```text
gh run watch "$PLUGIN_RUN_ID" --exit-status
gh run watch "$SIMCORE_RUN_ID" --exit-status
```

or an equivalent exact-ID watch is allowed.

The parent must fail if either exact run fails.

The parent must never silently fall back to another run with the same head.

## 11. Frozen fail-closed rules

Promotion must fail before merge when any of these occurs:

```text
dispatch HTTP failure
missing workflow_run_id
invalid/non-numeric workflow_run_id
returned run cannot be re-read
returned run event != workflow_dispatch
returned run head_sha != HEAD_SHA
Plugin Control Plane exact run fails
SimCore exact run fails
main base changes before merge
PR head changes before merge
```

Forbidden recovery:

```text
search another run with same head
pick newest similar run
pick first same-head run
retry by changing profile
weaken exact-base / exact-head merge
continue after missing run identity
```

## 12. Deterministic regression requirements

The implementation must update `documentation-stream-contract.cjs` to prove, scoped to the canonical documentation promotion path:

```text
1. Plugin Control Plane dispatch uses workflow-dispatch REST endpoint
2. SimCore dispatch uses workflow-dispatch REST endpoint
3. pinned API version contract is present
4. both dispatch responses capture workflow_run_id
5. captured run IDs are carried across steps
6. exact returned run IDs are re-read before watch
7. exact run head_sha is compared with HEAD_SHA
8. event is required to be workflow_dispatch
9. exact run IDs are watched with exit-status semantics
10. old gh run list discovery is absent from the candidate-check path
11. old find_run() discovery helper is absent
12. old same-head first-match selection is absent
13. old polling/sleep discovery loop is absent
14. SimCore profile remains MAIN_HEALTH
15. CANDIDATE_SHADOW remains absent from docs-only SimCore dispatch
16. candidate_commit remains absent
17. candidate_fetch_ref remains absent
18. exact documentation branch ref remains DOC_BRANCH
19. --match-head-commit merge guard remains
20. BASE_SHA / exact-base guard remains
21. direct main write remains forbidden
22. Plugin Control Plane remains independently dispatched
```

The test must not globally forbid `gh run list` repository-wide. The prohibition is scoped to canonical documentation child discovery.

## 13. Expected implementation shape

The implementation should preserve the existing two-step observability boundary:

```text
Dispatch exact documentation candidate checks
-> outputs exact plugin_run_id + simcore_run_id

Wait for exact candidate checks
-> re-read exact IDs
-> assert event/head
-> watch exact IDs
```

Combining all behavior into one opaque helper is not preferred because it would reduce step-level operational visibility without reducing a real invariant.

## 14. Why no nonce/input handshake

A unique parent nonce could also identify children, but it would require child workflow interface changes and increase owner/state combinations.

That would add:

```text
new workflow inputs
child workflow mutations
new matching semantics
new regression surfaces
```

The dispatch API already returns exact run identity, so nonce plumbing is unnecessary complexity.

Disposition:

```text
NONCE HANDSHAKE = REJECTED FOR R2.13
WHY = EXISTING PLATFORM PRIMITIVE IS STRONGER AND SIMPLER
```

## 15. Why timestamp/run-set-delta matching is rejected

Potential alternatives such as:

```text
dispatch timestamp lower bound
before/after run-set difference
newest same-head run
higher databaseId than baseline
```

still infer identity from surrounding observations rather than receiving the exact identity from the dispatch operation.

They are weaker on stabilization and more complex than direct returned-run binding.

Disposition:

```text
TEMPORAL / SET-DIFF MATCHING = REJECTED
```

## 16. Three-lens expected result after implementation

### Stabilization

```text
EXPECTED = STRONGER
reason = stale same-head run selection path removed by construction
```

### Automation

```text
EXPECTED = MORE AUTOMATIC AND SAFER
reason = exact child identity flows directly from dispatch to watch without discovery
```

### Simplification

```text
EXPECTED = SIMPLER
reason = delete discovery helpers, polling, sleeps, and first-match search without adding a new profile/input/state layer
```

Cross-lens verdict:

```text
NO MATERIAL TRADEOFF IDENTIFIED
```

The pinned GitHub API version is a platform contract dependency, but it replaces a larger and less reliable inference mechanism and is therefore justified.

## 17. Validation plan after future implementation authorization

Required order:

```text
1. fresh main
2. separate implementation branch
3. modify exactly 2 frozen owners
4. deterministic contract test
5. Plugin Control Plane CI
6. SimCore CI Verify + Required
7. merge implementation to main only after exact-head CI PASS
8. observe a natural canonical documentation promotion
9. prove returned exact child IDs are the watched IDs
10. classify every anomaly WATCH / DEFER / FIX / BLOCKER
11. record operational evidence on main
```

Because R2.13 is non-runtime:

```text
release-simcore deployment = NOT APPLICABLE
real long-chat runtime gate = NOT APPLICABLE TO R2.13
```

The current SimCore v0.70.9 HUMAN_EVIDENCE gate remains independent and must not be blocked by R2.13 design work.

## 18. Natural operational acceptance

A natural canonical documentation promotion after implementation must prove:

```text
parent dispatch receives exact Plugin Control Plane run ID
parent dispatch receives exact SimCore run ID
returned run IDs re-read to exact docs HEAD_SHA
SimCore child profile = MAIN_HEALTH
SimCore immutable candidate materialization = SKIPPED
both exact children PASS
parent watches those exact IDs, not a discovered substitute
exact-base / exact-head merge succeeds when main remains unchanged
```

If no natural documentation update occurs immediately, deterministic CI may qualify the implementation for merge, but operational closure remains WATCH / pending natural evidence. Do not manufacture repository churn solely to produce the specimen.

## 19. Rollback boundary

R2.13 rollback is limited to the same two owners.

Rollback must restore the previous child-discovery behavior only if the pinned dispatch-response capability is proven unavailable or materially broken in the repository environment.

A rollback does not reopen R2.12 source routing.

## 20. Forbidden expansion

R2.13 must not absorb:

```text
v0.70.9 runtime validation
CURRENT_DEVELOPMENT human-state drift repair
repeat-send performance WATCH work
Community alias work
release candidate system redesign
approval/publication redesign
R2.12 routing changes
new SimCore validation profiles
unrelated canonical documentation changes
```

Those remain separate transactions.

## 21. Design verdict

```text
R2_13_VERSION = RESERVED
R2_13_DESIGN = FROZEN
R2_12 = KEEP
PRIMARY_FIX = STALE_SAME_HEAD_CHILD_RUN_SELECTION
MECHANISM = DISPATCH_RETURNED_WORKFLOW_RUN_ID
CHILD_DISCOVERY_SEARCH = REMOVE
EXACT_HEAD_ASSERTION = PRESERVE AS VALIDATION
MAIN_HEALTH = PRESERVE
CANDIDATE_SHADOW = UNCHANGED FOR GENUINE RUNTIME CANDIDATES
IMPLEMENTATION_OWNERS = 2
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
IMPLEMENTATION = NOT AUTHORIZED BY THIS DESIGN
```

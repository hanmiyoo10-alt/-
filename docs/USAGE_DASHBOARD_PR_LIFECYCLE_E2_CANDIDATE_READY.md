# Local Usage Dashboard — PR Lifecycle Simplification E2: Candidate-Ready PR Entry Gate

Status: DESIGN — recorded before implementation

Baseline at design time:

- Product: `3.0.0-alpha.5.70`
- Bridge Engine: `1.6.21`
- Bridge Manager: `1.3.0`
- Snapshot contract: `1`
- Recent-request contract: `1`
- Production release branch: `release-usage-dashboard`

This is a maintenance-only design. It must not change production runtime behavior, product version, Engine version, Manager version, contract versions, or release artifacts.

## 1. Problem

The current read-only PR validator already assumes that a pull request contains an already-materialized candidate. It replays the release materializer and deterministic builders in an ephemeral checkout and fails with `CANDIDATE_NOT_MATERIALIZED` if that replay changes tracked candidate files.

The 5.70 feature release showed that our operational PR timing can still be earlier than this contract. PR #140 was ultimately correct, but candidate materialization and staging cleanup occurred while the PR was already open, producing repeated head movement and unnecessary intermediate CI runs.

E2 aligns operational behavior with the validator contract.

## 2. Goal

> Develop before PR. Validate in PR. Never use PR CI to finish the candidate.

A Usage Dashboard release PR must be opened only after the exact branch head is a complete, deployable candidate.

Target lifecycle:

```text
WORKING
  |
  v
MATERIALIZED
  |
  v
CANDIDATE_READY
  |
  | PR is created only here
  v
PR OPEN
  |
  v
FULL CI GREEN
  |
  v
MERGE = MAIN MATERIALIZATION
  |
  v
EXACT-BYTE PROMOTION
```

No PR exists during `WORKING`, `MATERIALIZED`, or incomplete candidate states.

## 3. Candidate-ready means exact SHA readiness

Readiness belongs to one immutable commit SHA, not merely to a branch name.

A candidate-ready result must bind at minimum:

- candidate commit SHA,
- product manifest tuple,
- matching release spec,
- materializer path,
- generated artifact parity state.

If the branch head changes after readiness is established, the prior readiness result is stale and must not authorize PR creation.

Before opening a PR:

```text
current branch HEAD == verified candidate-ready SHA
```

must hold.

## 4. Pre-PR read-only preflight

E2 should introduce a permanent pre-PR candidate-readiness entrypoint such as:

```text
.github/workflows/usage-dashboard-candidate-ready.yml
```

Trigger:

```text
workflow_dispatch
```

Inputs should include an exact candidate SHA. Branch names alone must not be authoritative.

Permissions:

```text
permissions:
  contents: read
```

The preflight must never commit, push, switch production refs, write `main`, write `release-usage-dashboard`, or repair candidate artifacts.

Its only job is to answer:

```text
Is this exact SHA complete enough to open a PR?
```

## 5. Preflight scope

The preflight is deliberately narrower than PR full regression. It validates candidate completeness, not all product behavior.

Required checks:

1. checkout the exact candidate SHA,
2. resolve exactly one release spec from the candidate manifest tuple,
3. validate that the release spec materializer path is allowed,
4. replay the release materializer in the ephemeral checkout,
5. replay deterministic Engine and plugin builders,
6. require zero tracked candidate diff after replay,
7. verify `latest.js`, runtime artifacts, and manifest parity,
8. verify manifest-declared SHA256 values against actual runtime bytes,
9. verify project-guideline synchronization,
10. run `git diff --check`,
11. after E1 implementation, verify that the test registry/discovery contract is structurally valid,
12. reject temporary/staging writer workflows or other forbidden candidate-preparation residue.

The preflight should produce a stable success diagnostic such as:

```text
CANDIDATE_READY:<sha>:<product-version>
```

Exact formatting may be refined during implementation, but SHA and product version must remain visible.

## 6. Full regression remains PR-only

E2 must not duplicate the complete PR regression suite before the PR.

Do not run the full P1–Pn and all process behavior harnesses in both preflight and PR validation by default.

Responsibility split:

```text
Preflight
  candidate completeness only

PR validator
  complete build/parity checks + full behavior/process/P regression
```

This keeps one authoritative full regression pass before merge while filtering incomplete candidates before they pollute PR history.

## 7. Existing PR validator remains read-only

The existing PR validator remains the full regression authority and keeps:

```text
permissions:
  contents: read
```

E2 must not weaken or replace its existing `CANDIDATE_NOT_MATERIALIZED` guard. That guard remains defense-in-depth in case an incomplete candidate somehow reaches a PR.

The new preflight complements the PR validator; it does not make PR validation optional.

## 8. E1 dependency

E2 should be implemented after E1 Test Registry Authority.

Reason:

- E1 removes per-test workflow-YAML coupling,
- E2 preflight should validate registry structure without needing a version-specific test list,
- future feature additions should not require preflight or validator workflow edits merely to add a new `behavior-*` or `pN-*` test.

E2 design must be interpreted against the implemented E1 state, not against this document alone.

## 9. Candidate production is out of scope

E2 does not define how source changes are automatically materialized and committed onto the feature branch.

It does not add a generic `contents: write` candidate builder.

That is a separate later stage because candidate production and candidate-readiness verification have different privilege and threat models.

E2 remains read-only.

## 10. No temporary workflow residue

A candidate must not be considered ready if its diff contains temporary/staging workflow machinery that exists only to finish materialization.

Implementation should maintain a small forbidden-pattern or forbidden-path contract for temporary Usage Dashboard candidate writer mechanisms.

The exact rule must be derived from current repository structure at implementation time and must avoid blocking legitimate permanent workflows.

## 11. PR creation contract

After E2, ChatGPT's normal Usage Dashboard release workflow becomes:

```text
create work branch
  -> modify source/tests/spec/materializer
  -> materialize final candidate
  -> local/branch-side deterministic checks
  -> run read-only candidate-ready preflight on exact SHA
  -> verify branch HEAD still equals ready SHA
  -> open PR
```

The user is not asked to run commands or prepare the candidate.

## 12. What counts as a preflight failure

Examples:

- release spec missing or ambiguous,
- manifest tuple mismatch,
- materializer replay changes tracked files,
- generated artifact parity mismatch,
- runtime SHA256 mismatch,
- stale guidelines identity,
- invalid test-registry structure after E1,
- temporary candidate-preparation residue,
- candidate SHA no longer equals expected head at PR creation time.

These are development/preparation failures, not PR CI anomalies, because the PR should not exist yet.

They must still be diagnosed and repaired by ChatGPT, but they should not create avoidable RED history on a pull request.

## 13. PR anomaly separation

Once a candidate passes preflight and a PR exists, a meaningful PR CI failure remains an anomaly and is handled under the durable PR/CI anomaly review contract.

This creates a clean distinction:

```text
preflight RED
  -> candidate preparation defect

PR RED
  -> actual candidate regression / infrastructure anomaly
```

A later GREEN PR run does not erase a meaningful earlier PR RED; existing anomaly-review rules remain authoritative.

## 14. Expected-head merge protection remains

E2 does not weaken merge head pinning.

After full PR validation, merge must still use the exact expected PR head SHA. If the PR head changes after GREEN validation, the stale validation must not authorize merge.

Therefore two SHA boundaries exist:

```text
candidate-ready SHA
  authorizes PR creation

full-CI GREEN PR head SHA
  authorizes merge
```

Both are immutable evidence points.

## 15. Acceptance criteria

E2 is complete when all of the following are demonstrated:

1. a permanent read-only candidate-ready entrypoint exists,
2. it accepts an exact commit SHA,
3. it resolves the candidate release spec from the manifest tuple,
4. it replays materializer/builders without modifying repository state,
5. a stale generated artifact fails before PR creation,
6. a complete current candidate returns a stable `CANDIDATE_READY` result,
7. branch movement invalidates prior readiness,
8. no repository-write primitive exists in the preflight,
9. PR full regression remains authoritative and read-only,
10. the next real feature release opens its PR only after candidate-ready GREEN,
11. the first PR CI run resolves the intended release spec immediately,
12. the first PR CI run does not fail `CANDIDATE_NOT_MATERIALIZED`,
13. no temporary materialization workflow is present in the final PR candidate.

## 16. Non-goals

E2 does not:

- implement E1 Test Registry Authority itself,
- automatically classify release vs maintenance PRs,
- suppress production promotion for maintenance-only PRs,
- create a privileged candidate writer,
- redesign exact-byte promotion,
- change branch protection repository-wide,
- change SimCore or other products,
- change Product/Engine/Manager versions,
- change runtime behavior,
- require PocketRisu real-device validation.

## 17. Rollout

Recommended rollout:

### Phase 1 — structural preflight

Add the read-only workflow/runner and static regressions. Run it against the already-complete 5.70 main candidate and confirm readiness without writes.

### Phase 2 — negative fixtures

Prove stale artifact, missing spec, ambiguous spec, and post-readiness SHA movement fail closed.

### Phase 3 — operational adoption

Use the preflight for the next feature candidate before opening its PR.

### Phase 4 — evidence

Confirm that the next feature PR starts with the correct release spec and no materialization-repair pushes are needed after PR creation.

## 18. Durable invariant after E2

> A Usage Dashboard PR begins at reviewable, deployable candidate state; it is never used as a workspace for finishing candidate materialization.

Together with E1:

```text
E1: tests evolve without workflow-list edits
E2: candidates finish before PR creation
```

This is the second step of PR Lifecycle Simplification. Release/maintenance classification and privileged candidate preparation remain later, separate stages.

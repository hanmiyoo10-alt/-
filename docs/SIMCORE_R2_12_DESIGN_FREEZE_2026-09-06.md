# SimCore R2.12 Design Freeze

Date: 2026-09-06 KST
Status: **DESIGN FROZEN · IMPLEMENTATION NOT AUTHORIZED · NON-RUNTIME**
Classification: **RELEASE-SYSTEM / CONTROL-PLANE DESIGN**
Name: **R2.12 Release-Channel-Aware Candidate Source Routing**
Base main commit: `075a008667e69739f9d65f0e6d920ae18576336d`

## 1. Executive disposition

```text
R2.12 TRIGGER = SATISFIED
R2.12 OWNER / IMPACT AUDIT = COMPLETE
R2.12 DESIGN = FROZEN
R2.12 IMPLEMENTATION = NOT AUTHORIZED BY THIS DOCUMENT
R2.11 CORE = KEEP / FROZEN
R2.11 PROFILE INVENTORY = KEEP / FROZEN
NEW PROFILE = NO
NEW RUNTIME SOURCE OWNER = NO
RUNTIME MUTATION = NO
release-simcore MUTATION = NO
SIMCORE-CI SEMANTIC CHANGE = NO
IMPLEMENTATION SURFACES = EXACTLY TWO
```

This design resolves one recurring non-runtime defect only:

> Canonical documentation candidates must not become SimCore runtime byte candidates merely because they are immutable candidate commits.

The repair changes the caller route, not SimCore runtime code and not the permanent SimCore CI profile model.

## 2. Evidence basis

The trigger record established the repeated defect across v0.70.7 and v0.70.8:

```text
canonical documentation promotion
-> SimCore CANDIDATE_SHADOW
-> candidate commit's main-side historical plugin bytes selected as runtime source
-> release-channel authority mismatch
```

The current canonical documentation promotion workflow explicitly dispatches:

```bash
gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
  -f profile=CANDIDATE_SHADOW \
  -f candidate_commit="$HEAD_SHA" \
  -f candidate_fetch_ref="refs/heads/$DOC_BRANCH"
```

The current documentation stream contract test explicitly requires the promotion workflow to contain `CANDIDATE_SHADOW`, so the incorrect route is presently frozen by its own regression owner.

The permanent SimCore CI already provides the required release-channel-aware route:

- `workflow_dispatch` accepts `MAIN_HEALTH`.
- `MAIN_HEALTH` does not require a candidate commit.
- deployed production is materialized from `release-simcore`.
- candidate files are materialized only for `CANDIDATE_SHADOW` / `CANDIDATE_REQUIRED`.
- non-candidate profiles select the materialized production files as source under test.
- the verifier commit passed to the permanent checker is the workflow run's `GITHUB_SHA`.

Therefore dispatching `simcore-ci.yml` on the documentation branch with `profile=MAIN_HEALTH` gives the exact required split:

```text
verifier identity = exact documentation candidate head
runtime byte source = release-simcore deployed production
```

No change to `.github/workflows/simcore-ci.yml` or `products/simcore/tooling/check.mjs` is required.

## 3. Frozen ownership conclusion

Exactly two permanent implementation surfaces are sufficient.

### Owner A — routing caller

```text
.github/workflows/canonical-main-doc-promotion.yml
```

Responsibility:

- dispatch Plugin Control Plane validation on the generated documentation branch;
- dispatch SimCore production health on that same exact documentation branch head;
- preserve exact-head wait/match semantics;
- preserve exact-base / exact-head merge semantics.

### Owner B — deterministic regression

```text
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

Responsibility:

- reject regression back to SimCore `CANDIDATE_SHADOW` for canonical documentation promotion;
- require `MAIN_HEALTH` for that route;
- prove no candidate byte identity inputs are supplied by the canonical documentation promotion SimCore dispatch;
- preserve all existing documentation-promotion safety assertions.

### Explicit non-owners

The following are dependencies to reuse unchanged, not implementation owners:

```text
.github/workflows/simcore-ci.yml
products/simcore/tooling/check.mjs
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
R2.9 validation projection
R2.10 context semantics
R2.11 profile inventory
release publication / approval workflows
```

A third permanent owner is not justified because `MAIN_HEALTH` already expresses the needed verifier/source split without semantic ambiguity.

## 4. Frozen routing contract

For canonical-main documentation promotion, the SimCore dispatch shall become:

```bash
gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
  -f profile=MAIN_HEALTH
```

The canonical documentation caller shall not provide:

```text
candidate_commit
candidate_fetch_ref
```

for this SimCore invocation.

The parent promotion workflow shall continue to identify the child run by exact generated documentation head:

```text
child headSha == HEAD_SHA
```

and shall still require both Plugin Control Plane CI and SimCore CI to pass before exact-base / exact-head merge proceeds.

## 5. Authority matrix

| Lane | Verifier ref / identity | Runtime byte source | SimCore profile | R2.12 change |
|---|---|---|---|---|
| canonical documentation candidate | exact generated documentation branch head / `GITHUB_SHA` | `release-simcore` | `MAIN_HEALTH` | yes, caller route only |
| genuine immutable runtime candidate | candidate validation ref plus immutable candidate identity | candidate commit bytes | `CANDIDATE_SHADOW` | none |
| protected release candidate | authorized immutable candidate identity | candidate commit bytes | `CANDIDATE_REQUIRED` | none |
| main production health | current main verifier | `release-simcore` | `MAIN_HEALTH` | none |
| ordinary PR main validation | PR verifier/head according to existing CI semantics | existing permanent CI semantics | `PR_MAIN` | none |

This matrix is normative for R2.12.

## 6. Required deterministic regression

The implementation regression must prove all of the following in the existing documentation stream contract owner:

1. the canonical documentation promotion workflow contains a SimCore dispatch with `profile=MAIN_HEALTH`;
2. the canonical documentation promotion workflow does not contain a SimCore dispatch with `profile=CANDIDATE_SHADOW`;
3. the canonical documentation SimCore dispatch does not pass `candidate_commit`;
4. the canonical documentation SimCore dispatch does not pass `candidate_fetch_ref`;
5. the SimCore workflow is still dispatched with `--ref "$DOC_BRANCH"`;
6. exact child-run head matching remains present;
7. `--match-head-commit` exact merge protection remains present;
8. direct writes to main remain forbidden;
9. Plugin Control Plane validation remains independently dispatched for the documentation candidate.

The regression should target the bounded promotion dispatch block rather than globally forbidding the strings `CANDIDATE_SHADOW`, `candidate_commit`, or `candidate_fetch_ref` from the repository, because those remain valid for genuine runtime candidate lanes elsewhere.

## 7. Fail-closed behavior

R2.12 must preserve or improve fail-closed behavior.

### Documentation candidate head moves

No relaxation is permitted. The parent still waits for a child run whose `headSha` equals the recorded generated `HEAD_SHA`, and exact-head merge protection remains required.

### Main changes after generation

No relaxation is permitted. Existing exact-base checks remain authoritative and must continue to skip/hand off instead of merging against a moved base.

### release-simcore cannot be materialized

No fallback to main-side plugin bytes is allowed. Existing SimCore CI failure is the correct behavior.

### Genuine runtime candidate is malformed or missing

No change. `CANDIDATE_SHADOW` / `CANDIDATE_REQUIRED` retain immutable candidate identity validation and candidate-byte materialization.

### Historical main-side SimCore bytes exist on the documentation branch

They become irrelevant to runtime source selection under `MAIN_HEALTH`. They must never be promoted to runtime authority by this caller.

## 8. Non-goals / forbidden expansion

R2.12 implementation must not:

```text
modify SimCore runtime behavior
modify release-simcore
synchronize main plugin bytes with release-simcore
make main a runtime byte authority
modify latest.js or install.js
weaken latest.js == install.js checks
weaken frozen-surface / architecture / state / legacy checks
change CANDIDATE_SHADOW semantics
change CANDIDATE_REQUIRED semantics
add a new SimCore CI profile
add automatic runtime-vs-document inference
change R2.9 semantics
change R2.10 semantics
change R2.11 profile inventory
change release approval or publication authority
change human live acceptance rules
bundle unrelated canonical-main refactors
```

## 9. Exact implementation delta

When implementation is separately authorized, the bounded code delta is frozen as:

### File 1

`.github/workflows/canonical-main-doc-promotion.yml`

Replace only the canonical documentation SimCore dispatch from candidate-byte validation to deployed-production health:

```diff
 gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
-  -f profile=CANDIDATE_SHADOW \
-  -f candidate_commit="$HEAD_SHA" \
-  -f candidate_fetch_ref="refs/heads/$DOC_BRANCH"
+  -f profile=MAIN_HEALTH
```

No other workflow behavior should change unless implementation evidence proves an unavoidable defect inside this exact transaction.

### File 2

`.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs`

Replace the old regression that requires `CANDIDATE_SHADOW` with bounded assertions for the frozen R2.12 route and preservation conditions in section 6.

No third implementation file is authorized by this design.

## 10. Validation plan for the future implementation transaction

The implementation transaction must pass, in order:

```text
1. direct deterministic documentation-stream contract test
2. repository static checks applicable to the changed control-plane surfaces
3. Plugin Control Plane CI
4. SimCore CI on the implementation PR
5. exact diff review proving only the two frozen owner files changed
```

After merge, one natural canonical documentation promotion cycle should be observed as operational evidence if one occurs. The expected causal sequence is:

```text
canonical docs generated head
-> Plugin Control Plane CI on exact head
-> SimCore MAIN_HEALTH on exact head
-> release-simcore production bytes selected
-> both checks PASS
-> exact-base / exact-head merge
```

If no natural promotion occurs immediately, deterministic implementation CI is sufficient for merge acceptance; natural operation may remain a post-merge WATCH item rather than fabricating a promotion event.

## 11. Anomaly classification rule

Any implementation or post-merge anomaly must be recorded before progression and classified as one of:

```text
WATCH
DEFER
FIX
BLOCKER
```

A correctness regression in exact-head binding, release-simcore source authority, genuine runtime candidate validation, or merge fail-closed behavior is a `BLOCKER`.

A non-correctness observation that does not weaken the frozen contract may be `WATCH` or `DEFER` with explicit rationale.

## 12. Rollback boundary

Because R2.12 is non-runtime and exactly two-owner, rollback is repository-only:

```text
revert routing change in canonical-main-doc-promotion.yml
revert its documentation-stream contract assertions
```

Rollback must not touch `release-simcore`, runtime plugin bytes, or release identity.

## 13. Implementation authorization boundary

This document completes design and freezes scope. It does not itself authorize implementation.

The next valid state transition is:

```text
R2.12 DESIGN FREEZE = COMPLETE
NEXT = SEPARATE IMPLEMENTATION AUTHORIZATION
THEN = WORKING-BRANCH IMPLEMENTATION OF EXACTLY TWO FROZEN OWNERS
THEN = STATIC / CI VALIDATION
THEN = MERGE TO main
THEN = OPERATIONAL EVIDENCE / DOCUMENTATION SYNC
```

No `release-simcore` deployment step is expected because R2.12 changes no runtime bytes.

## 14. Final frozen decision

```text
R2.12 = RELEASE-CHANNEL-AWARE CANDIDATE SOURCE ROUTING
PROBLEM = DOC CANDIDATE WAS MISROUTED AS RUNTIME BYTE CANDIDATE
REPAIR = CANONICAL DOC CALLER USES MAIN_HEALTH ON EXACT DOC HEAD
RUNTIME SOURCE = release-simcore
VERIFIER IDENTITY = exact documentation candidate GITHUB_SHA
IMPLEMENTATION OWNERS = 2
SIMCORE-CI CHANGE = 0
NEW PROFILE = 0
RUNTIME CHANGE = 0
release-simcore CHANGE = 0
R2.9 / R2.10 / R2.11 CHANGE = 0
DESIGN = FROZEN
IMPLEMENTATION = NOT YET AUTHORIZED
```

# Local Usage Dashboard — E14 Ancestry Convergence Design

Status: **DESIGN READY — simplification + stabilization, implementation not started**

Generation: `E14`

Scope: release-control maintenance only. No product/runtime version bump.

## Fresh baseline

Production authority at design time:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- contracts `1 / 1`
- production branch `release-usage-dashboard`
- production SHA `ad69ad1b6e2a9b975c89b6e4e83b399abaeec1b1`
- main had advanced independently after 5.81 deployment; E14 must therefore treat `main` as moving shared infrastructure and freeze the exact trusted main SHA per stage transaction.

Evidence basis:

- 5.80 E13 feedback #400 held E14 until repeated merge-ready friction became operationally material.
- 5.81 E13 feedback #426 records two ancestry-only source refresh PRs (#423 and #424) after otherwise valid candidates.
- current E7 stage reconstructs the candidate tree from `TRUSTED_BASE_SHA`, but an existing candidate branch is extended with only the previous candidate as Git parent.
- current candidate verifier requires exactly one parent.
- E11 already treats `Usage-Dashboard-Frozen-Main:` as the semantic candidate base, so Git semantic authority and GitHub merge-base can diverge.

## Problem statement

E13 is healthy. The remaining problem is narrower:

> a restaged candidate can be semantically based on the current frozen trusted main while its actual Git ancestry still points only through the previous candidate chain.

That split can produce this contradictory but valid state:

- E11: `MERGE_READY_WITH_UNRELATED_MAIN_DRIFT`
- GitHub PR: `dirty` / non-mergeable

5.81 required ancestry-only source refresh PRs to repair that DAG shape. E14 exists to remove that recovery choreography without changing release authority.

## Design goal

Make every newly materialized candidate's **actual Git DAG** represent the same frozen trusted main that E11 already treats as authoritative, while preserving:

- one deterministic candidate branch per release;
- append-only / fast-forward-only candidate history;
- same durable release request and same deterministic PR across repairs;
- exact source-intent reconstruction;
- exact-SHA authoritative validation;
- read-only merge guard;
- assistant-owned expected-head squash merge;
- monotonic exact-byte promotion;
- E13 canonical reducer wake;
- anti-loss schedule;
- no user GitHub UI requirement.

## Core simplification

Do not add a new reducer, queue, workflow family, token, state machine, or merge authority.

Change only the candidate commit parent rule and the code/tests that validate that rule.

### Parent rule

Let:

- `P` = previous candidate SHA (`CANDIDATE_PARENT_SHA`)
- `M` = exact frozen trusted main (`TRUSTED_BASE_SHA`)

Materialize the already-validated candidate tree using:

### Case A — first stage / ancestry already converged

If `P == M`:

```text
candidate parents = [M]
```

Keep the current one-parent form.

### Case B — restage and frozen main is already an ancestor of P

If `M` is already an ancestor of `P`:

```text
candidate parents = [P]
```

Do not add a redundant second parent.

This is the main simplification rule: **only add ancestry that is actually missing.**

### Case C — restage and frozen main is not an ancestor of P

If `P != M` and `M` is not an ancestor of `P`:

```text
candidate parents = [P, M]
```

Ordered parents are mandatory:

1. first parent = previous candidate SHA;
2. second parent = exact frozen trusted main SHA.

The candidate tree remains the tree already reconstructed from frozen main + exact source intent. E14 changes ancestry metadata, not product materialization semantics.

## Why conditional two-parent is preferred

Always adding two parents would work mechanically but would add needless merge nodes after ancestry is already converged.

The conditional rule is simpler and more stable:

- preserves the existing one-parent path whenever sufficient;
- uses a merge-style candidate commit only when the Git DAG is missing the exact frozen main;
- prevents duplicate/redundant main parents on repeated restage at the same or descendant main;
- keeps first-parent history as the deterministic candidate history;
- lets GitHub merge-base naturally catch up without source-refresh PR choreography.

## Required implementation changes

### 1. E7 stage — compute ancestry mode

In `.github/workflows/usage-dashboard-stage-e7.yml`:

- keep `TRUSTED_BASE_SHA`, `CANDIDATE_PARENT_SHA`, materialization, bundle and trusted writer split unchanged;
- before `commit-tree`, classify whether `TRUSTED_BASE_SHA` is already an ancestor of `CANDIDATE_PARENT_SHA`;
- construct the candidate commit with either one or two ordered parents according to the rule above;
- keep the `Usage-Dashboard-Frozen-Main:` trailer as immutable diagnostic evidence, not as sole ancestry authority.

No source refresh, rebase, reset, force-push or second candidate branch is introduced.

### 2. Candidate verifier — exact parent-shape contract

Update `plugins/usage-dashboard/tools/candidate_stage_e6.cjs` so verification is no longer `exactly one parent` globally.

The verifier must receive/derive both expected identities and fail closed:

- first parent must always equal previous candidate SHA;
- if frozen main is already reachable from first parent, parent count must be exactly 1;
- if frozen main is not reachable from first parent, parent count must be exactly 2 and second parent must equal frozen main;
- no third parent;
- no swapped parent order;
- no arbitrary merge parent;
- frozen main commit must exist;
- previous candidate must remain an ancestor of the new candidate, preserving fast-forward-only publication.

### 3. Bundle prerequisites — include only missing ancestry prerequisite

The stage artifact currently bundles the new candidate while excluding the previous candidate parent.

E14 must ensure the trusted writer can verify/import the candidate when a second parent is required.

Preferred rule:

- continue to treat previous candidate as an existing remote prerequisite;
- if the frozen main is a second parent, require that exact SHA to be present/fetched in the trusted writer before bundle verification/import;
- do not duplicate main history into the bundle unnecessarily.

No credentials enter materialization jobs.

### 4. E11 merge guard — preserve frozen-main semantics, expose DAG agreement

`plugins/usage-dashboard/tools/merge_guard_e11.cjs` already uses the explicit frozen-main trailer as candidate base when present. Keep that authority.

Add a diagnostic-only consistency check:

- frozen main must be an actual ancestor of the candidate under E14 candidates;
- first parent remains the prior candidate history edge;
- if the candidate has two parents, second parent must match frozen main exactly.

E11 must still classify current-main path drift exactly as today.

Do not replace the frozen-main trailer with `merge-base` as authority; instead require the DAG to agree with the existing frozen-main authority.

### 5. Writer/CAS — no change in authority

Trusted candidate publication remains:

- exact expected old candidate SHA;
- fast-forward-only ref update;
- post-write SHA verification;
- no force update.

Because the previous candidate remains first parent, E14's two-parent form is still a fast-forward of the deterministic candidate branch.

### 6. E13 reducer wake — no change

E13 is retained byte-for-byte unless a test fixture requires terminology updates.

Do not create an E14 wake helper. Do not add a new handoff.

## Fail-closed invariants

E14 must reject:

- parent count outside 1 or 2;
- first parent not equal to the exact previous candidate;
- two-parent candidate whose second parent is not exact frozen main;
- one-parent candidate when frozen main is not reachable from first parent;
- redundant two-parent candidate when frozen main is already reachable from first parent;
- frozen-main trailer mismatch with expected `TRUSTED_BASE_SHA`;
- candidate tree/path changes outside existing source/generated allowlists;
- non-fast-forward candidate publication;
- candidate branch movement during transaction;
- main merge without fresh E11/E13 readiness + current PR identity/mergeability re-read.

## Regression plan

Add a focused E14 contract, suggested name:

`plugins/usage-dashboard/tests/e14-ancestry-convergence-contract.cjs`

It should prove at minimum:

1. first stage uses one parent when previous candidate identity equals frozen main;
2. restage with frozen main already in candidate ancestry remains one-parent;
3. restage after unrelated main advance uses exactly two parents `[previousCandidate, frozenMain]`;
4. new candidate is a descendant of previous candidate;
5. frozen main is an actual ancestor of the new candidate;
6. repeated main advance can be restaged again without merging main into the source branch;
7. a second restage on the same frozen main does not add a redundant second parent;
8. swapped parents fail;
9. arbitrary second parent fails;
10. missing second parent fails when frozen main ancestry is absent;
11. unexpected third parent fails;
12. frozen-main trailer mismatch fails;
13. source/path allowlist behavior remains unchanged;
14. candidate writer remains CAS + fast-forward-only;
15. deterministic PR reuse remains unchanged;
16. E11 classifies unrelated drift without semantic/mergeability-base disagreement for the fixture;
17. E13 wake contract remains unchanged;
18. exact-SHA validation remains authoritative;
19. promotion/exact-byte parity behavior remains unchanged;
20. full registry GREEN.

Also add a fixture that reproduces the 5.81 sequence:

```text
main M0
-> candidate C0
-> unrelated main M1
-> restage C1
-> unrelated main M2
-> restage C2
```

Acceptance: `C1` and `C2` become mergeable ancestry-wise without ancestry-only source refresh PRs.

## Maintenance-release proof

E14 implementation itself must be no-version / no-product-byte maintenance.

Before merge:

- main vs pre-E14 Plugin/Engine/Manager/bootstrap shipped bytes must remain identical;
- full release-control registry GREEN;
- focused E6/E7/E11/E13/E14 contracts GREEN;
- no production promotion caused solely by E14 maintenance.

E14 becomes the default release-control baseline only after one subsequent real Local Usage Dashboard product release proves:

- candidate/restage convergence through E14;
- no ancestry-only source refresh PR required;
- authoritative exact-SHA GREEN;
- fresh merge guard and GitHub mergeability agree;
- assistant expected-head merge succeeds;
- monotonic exact-byte promotion succeeds;
- production parity VERIFIED;
- durable request closes normally.

## Explicit non-goals

Do not:

- auto-merge main;
- remove expected-head merge ownership;
- add a new reducer/wake/state machine/queue/polling loop;
- remove the anti-loss schedule;
- give candidate code write credentials;
- make ordinary PR CI authoritative;
- weaken exact-SHA validation;
- force-push/reset/rebase candidate or source branches;
- create a new release request/PR on repair;
- hide protected main drift;
- change Plugin/Engine/Manager/bootstrap/runtime behavior;
- consume a product version for E14 maintenance.

## Simplification result

Before E14, unrelated main activity can require:

```text
GREEN candidate
-> GitHub dirty
-> ancestry-only source refresh PR
-> source_sha update
-> restage
-> revalidate
-> maybe repeat
```

After E14, the intended normal recovery becomes:

```text
main advances
-> restage same source/request/PR
-> candidate adds missing frozen-main ancestry only when needed
-> exact-SHA validate
-> fresh merge guard
-> expected-head merge
```

No extra source-refresh PR and no new control-plane generation machinery beyond the parent rule.

## Bottom line

E14 should be the smallest possible change that makes the Git DAG tell the same truth E11 already knows.

**One conditional parent rule, strict verification, existing authority boundaries unchanged.**

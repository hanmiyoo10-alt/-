# SimCore #1981 — R2.8 Checked-PR Transport Design Amendment

Status: **DESIGN PROPOSED · BLOCKER REPAIR · NONRUNTIME**

Issue: #1981

## 1. Purpose

Repair the R2.8 Human-Evidence Terminal Convergence caller gap exposed by the v0.70.11 terminal-close event without weakening protected-main enforcement, inventing a second main writer, or changing SimCore runtime/release bytes.

Observed live boundary:

```text
HUMAN_EVIDENCE merged on main
→ R2.8 resolver = ELIGIBLE_TO_PROJECT
→ admin/sync projection PASS in workspace
→ exact payload commit created
→ repo-main-write.py MAIN_HEALTH / Required PASS
→ native protected-main enforcement requires checked PR
→ structured exit 9 handoff emitted
→ R2.8 caller does not consume handoff
→ terminal projection stops before durable main
```

Preserved v0.70.11 coordinates are evidence, not implementation inputs hard-coded by this design.

## 2. Authority clarification

The original R2.8 design and implementation authorization forbid `automatic PR merge` because machine transport must not manufacture or merge human terminal authority, release approval, publication authority, checkpoint choice, or next-priority choice.

This amendment keeps that prohibition and adds one narrow distinction:

```text
semantic-authority PR merge
= still forbidden to R2.8 automation

native-protection checked transport PR merge
= may be automated only after human authority is already durable on main
  and only for the exact machine-derived terminal payload rejected by direct protected-main landing
```

The checked transport PR is not a new authorization surface. It is a protected-main transport continuation of the existing `repo-main-write.py` gateway after native branch protection requires ordinary PR semantics.

No automation may merge the HUMAN_EVIDENCE PR itself. The terminal evidence envelope must already be durable and accepted before this transport path can exist.

## 3. Frozen invariants

The repair must preserve:

- `repo-main-write.py` as the sole main writer/integration gateway;
- explicit `HUMAN_EVIDENCE` as the sole LIVE_PASS authority;
- exact production commit/blob binding;
- exact frozen live-scenario binding;
- evidence-selected checkpoint and next priority only;
- `MAIN_HEALTH / Required` before protected-main handoff;
- ordinary branch-protection semantics for the checked transport PR;
- exact base/head identity and frozen-base revalidation before merge;
- no force push, bypass, publication, retry, or release-simcore mutation;
- durable terminal readback before transaction success;
- preserved staging ref on any failure before durable proof.

## 4. Truthful transport report

R2.8 must not fabricate a `release-state-main-gate` report because it does not invoke that owner.

Introduce a bounded terminal main-write adapter/report that invokes `repo-main-write.py` exactly once and records its real result. The report must identify its actual tool owner and include at least:

```text
releaseId
productionCommit
payloadCommit
changedPaths
result = MAIN_GATE_PASS | CHECKED_PR_REQUIRED
checkedPr.base / commit / ref when required
checkedPr.workflow = simcore-ci.yml
checkedPr.profile = PR_RECOVERY
checkedPr.job = Required
```

Exit 9 is valid only when the existing strict checked-PR parser accepts exactly one native-protection marker and exactly one structured handoff.

## 5. Checked transport consumer contract

Reuse the existing checked-PR transport implementation rather than copy its network/merge logic. The consumer may be extended with an R2.8-specific validated input contract while preserving the existing post-publish CLI contract.

For terminal convergence it must require, in order:

1. current `origin/main` equals the exact handoff base;
2. preserved remote staging ref resolves to the exact handoff commit;
3. `base...commit` changed paths exactly equal the terminal report path set;
4. production commit still equals current `release-simcore`;
5. create or reuse exactly one machine-owned checked transport PR for the exact base/head/ref;
6. dispatch `simcore-ci.yml` with `profile=PR_RECOVERY` and exact immutable base/head/production coordinates;
7. require workflow SUCCESS and exactly one `Required` job SUCCESS;
8. re-read `origin/main` and require the frozen base still current immediately before merge;
9. merge the ordinary checked transport PR using the exact checked head SHA;
10. verify durable main bytes for every terminal changed path equal the checked candidate bytes.

Any base move, ref move, path mismatch, duplicate/mismatched PR, CI ambiguity/failure, or identity drift fails closed without merging.

## 6. R2.8 durable proof and cleanup

Post-publish durable-report semantics must not be impersonated by R2.8.

After checked transport merge, the existing R2.8 owner must re-read main and run `release-terminal-transition.mjs` against the unchanged HUMAN_EVIDENCE envelope. Success requires `ALREADY_DURABLE`, unchanged evidence blob, unchanged production identity, and exact terminal state.

Only after that durable terminal proof may the checked transport staging ref be deleted.

Terminal cleanup must validate terminal durable evidence directly; it must not require or synthesize `RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS`.

## 7. Expected implementation scope

Expected bounded files are:

```text
.github/workflows/product-simcore-terminal-convergence-r2-8.yml
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tooling/<bounded terminal main-write adapter>.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
products/simcore/tests/suites/release-system-r2-8-terminal-convergence.test.mjs
```

`simcore-ci.yml` should remain unchanged unless implementation evidence proves an actual missing PR_RECOVERY contract. The profile already exists and must not be broadened casually.

The R2.8 workflow may add only permissions required by the protected-main transport path, including `pull-requests: write` if the checked transport consumer requires it.

Forbidden scope:

- `plugins/simcore/latest.js` or `install.js` changes;
- `release-simcore` mutation;
- runtime/compiler/cache/storage behavior changes;
- release publication or release approval changes;
- weakening Required, native branch protection, or exact-base/head checks;
- broad release-system refactors unrelated to this caller gap.

## 8. Regression and acceptance contract

Implementation qualification must prove at least:

- direct main landing remains unchanged when native protection permits it;
- exact exit-9 handoff is consumed only with valid coordinates;
- malformed/ambiguous handoff fails closed;
- terminal transport input cannot masquerade as post-publish input;
- checked PR requires exact path equality and frozen base/head/ref;
- PR_RECOVERY Required failure prevents merge;
- main movement before merge prevents stale merge;
- durable terminal readback requires `ALREADY_DURABLE`;
- cleanup is impossible before terminal durable proof;
- existing permanent/recovery checked-PR behavior remains green;
- runtime/release-simcore production identity remains unchanged.

Repository CI remains the authoritative workflow parser and protected-main integration gate.

## 9. Existing v0.70.11 recovery

The preserved v0.70.11 staging ref must not be manually force-landed or replaced by a freshly guessed payload.

After this repair is implemented, merged, and postmerge-qualified, recovery must re-read current main first. If the original frozen base is no longer current, the old staging candidate is historical failure evidence and must not be merged stale. R2.8 must instead re-resolve the already-durable HUMAN_EVIDENCE against current authority and derive a new exact terminal candidate through the repaired path.

If the frozen base is still exact, reuse is allowed only if every new transport invariant validates the preserved candidate without mutation.

## 10. Design disposition

```text
BLOCKER #1981 = DESIGN READY FOR REVIEW
runtime mutation = NONE
release-simcore mutation = NONE
main authority mutation = NONE until reviewed PR merge
implementation authorization = NOT YET GRANTED BY THIS PROPOSED BRANCH
```

On merge, this document narrowly supersedes the original R2.8 `automatic PR merge` wording only for the native-protection checked transport exception defined above. All semantic-authority and release/publication auto-merge prohibitions remain in force.
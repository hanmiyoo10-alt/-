# SimCore #2000 — R2.8 Dual Commit Identity Repair Design

Date: 2026-09-11 KST
Status: **DESIGN PROPOSED · BLOCKER REPAIR · NONRUNTIME**
Issue: #2000

## 1. Purpose

Repair the R2.8 terminal checked-PR identity contract exposed by fresh v0.70.11 recovery run `34540039653` without weakening protected-main transport, HUMAN_EVIDENCE authority, PR_RECOVERY, production binding, or exact payload verification.

Observed failure:

```text
main = 4d8ad2306782dab364194e7e6dd790ac147ea8bf
R2.8 run = 34540039653
job = 103080410877
resolver = ELIGIBLE_TO_PROJECT
semantic/local payload commit = 798d185104be7a38be0c80b7caf07dc51c4a5e91
protected staging commit = 1dede57b66fe45fa2875140fa27fd17f04e8db05
staging ref = simcore-r2-8-terminal-convergence/1dede57b66fe-1-34540039653-1-2357-1789081156070
failure = R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID: payloadCommit mismatch
```

Production remained:

```text
version = 0.70.11
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

No runtime or production defect is implicated.

## 2. Root cause

`release-terminal-main-write.mjs` passes the caller-created terminal payload commit to the repository main writer:

```text
repo-main-write.py --commit <payloadCommit>
```

`repo-main-write.py` intentionally does not promise commit-SHA preservation. For each attempt it:

```text
fetch current main
checkout exact current base
cherry-pick --no-commit <payloadCommit>
commit -C <payloadCommit>
```

The resulting candidate is a newly created commit on the current main base. Even when its terminal file content is exactly the same, commit metadata can differ and therefore its SHA can differ.

The writer's structured protected-main handoff truthfully identifies that newly created candidate:

```text
MAIN_WRITE_CHECKED_PR_REQUIRED:
base=<current-main>
commit=<replayed-staging-candidate>
ref=<preserved-staging-ref>
```

The terminal adapter also truthfully preserves the original caller payload identity separately as `payloadCommit`.

The defect is therefore the consumer-only assumption:

```text
checkedPr.commit == report.payloadCommit
```

That equality is not an invariant of the existing repository writer.

## 3. Identity roles

Freeze two existing identities with different roles. Do not invent a third authority.

### 3.1 Semantic payload identity

```text
report.payloadCommit
```

Role:

- identifies the exact local terminal state commit derived from HUMAN_EVIDENCE;
- owns the intended terminal changed-path content before repository-main replay;
- remains available in the same R2.8 job for byte/path verification;
- is not the PR head identity after repository-main replay.

### 3.2 Protected transport identity

```text
report.checkedPr.commit
```

Role:

- identifies the exact replayed candidate produced by `repo-main-write.py` on `checkedPr.base`;
- must equal the preserved remote staging ref head;
- is the immutable `PR_RECOVERY` checkout/head identity;
- is the exact PR head and merge expected-head identity;
- is the durable-byte comparison source after merge.

Commit-SHA equality between these two roles is neither required nor assumed.

## 4. Replacement invariant: exact replay parity

Removing the false SHA-equality guard is allowed only together with a stronger semantic replay check.

For terminal checked-PR consumption, before PR discovery or CI dispatch, require all of the following:

1. `payloadCommit` is a valid local commit object.
2. `checkedPr.base` is a valid commit object.
3. `checkedPr.commit` is a valid commit object.
4. preserved remote `checkedPr.ref` resolves exactly to `checkedPr.commit`.
5. `base...checkedPr.commit` changed-path set equals the report's exact terminal `changedPaths`.
6. the semantic payload commit's own single-commit changed-path set equals the same exact terminal `changedPaths`.
7. for every terminal changed path, the final Git content/mode state at `payloadCommit` equals the final Git content/mode state at `checkedPr.commit`.
8. any mismatch fails closed before PR creation/reuse, PR_RECOVERY dispatch, or merge.

A practical implementation may prove item 7 with a bounded Git comparison equivalent to:

```text
git diff --quiet <payloadCommit> <checkedPr.commit> -- <exact changed paths...>
```

provided item 5 independently proves the checked candidate has no extra changed paths relative to the frozen base and item 6 independently proves the semantic payload path set.

This supports legitimate repository-main rebasing/replay onto a newer exact base while proving that every terminal-owned file lands with the exact HUMAN_EVIDENCE-derived state.

## 5. Race semantics

Do not require:

```text
payloadCommit^ == checkedPr.base
```

The shared writer intentionally owns bounded main-race recovery. If main moves before the writer establishes a protected candidate, it may replay the same semantic payload onto a newer base and emit that newer exact base in the handoff.

Safety comes from:

```text
current main == checkedPr.base at consume start
+ exact checked ref == checkedPr.commit
+ exact candidate path set
+ exact semantic payload path set
+ terminal file parity
+ current main == checkedPr.base immediately before merge
```

This preserves existing race recovery without accepting stale or semantically different candidates.

## 6. #1990 interaction

The #1990 authorized-assistant PR-create fallback remains unchanged.

Fresh run `34540039653` failed before that fallback was reached. Therefore #2000 must not reclassify #1990 as naturally live-proven.

After #2000 repair, a fresh R2.8 recovery must naturally reach checked-PR consumption. If repository policy again denies Actions initial PR creation with the exact supported 403, the existing #1990 flow should emit the bounded assistant handoff, wait for the exact PR, then resume:

```text
PR_RECOVERY
→ Required PASS
→ frozen-base revalidation
→ production reobservation
→ exact-head merge
→ durable ALREADY_DURABLE proof
→ staging cleanup
```

No stronger token or repository-policy bypass is authorized.

## 7. Failure-evidence handling

PR #1999 and staging ref:

```text
PR #1999
base = 4d8ad2306782dab364194e7e6dd790ac147ea8bf
head = 1dede57b66fe45fa2875140fa27fd17f04e8db05
```

belong to the failed pre-#2000 transaction.

They must not be force-landed. Once this design or later implementation advances `main`, the frozen base becomes stale and #1999 must be closed unmerged as historical failure evidence. The staging ref should remain until the recovery transaction or explicit bounded cleanup policy classifies it; do not silently delete it as if the failed transaction had completed.

Fresh recovery must derive a new terminal candidate from then-current `main`.

## 8. Frozen implementation scope

Expected implementation owners are exactly:

```text
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
products/simcore/tests/release-terminal-main-write.integration.test.mjs
```

Purpose of each:

- checked-PR helper: replace false terminal SHA equality with exact dual-identity replay parity validation;
- checked-PR integration: cover distinct semantic/staging SHAs with equal content plus mismatch negatives;
- terminal main-write integration: stop faking checked handoff with `commit == payload`; prove the adapter truthfully preserves distinct semantic and staging identities.

Explicit non-owners:

```text
scripts/repo-main-write.py
products/simcore/tooling/release-terminal-main-write.mjs
products/simcore/tooling/release-state-main-gate.mjs
.github/workflows/product-simcore-terminal-convergence-r2-8.yml
.github/workflows/simcore-ci.yml
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
HUMAN_EVIDENCE semantic coordinates
```

If implementation evidence proves one non-owner actually requires mutation, stop and amend/review the design instead of expanding scope silently.

## 9. Required regression matrix

### Positive

1. terminal payload SHA differs from checked staging SHA, exact path set and content/mode parity match -> accepted;
2. exact existing checked PR reuse still works with distinct SHAs;
3. exact #1990 policy-denial assistant fallback still resumes after an externally created exact PR with distinct SHAs;
4. PR_RECOVERY Required PASS still permits exact-head merge only after frozen-base revalidation;
5. durable-byte proof remains based on the checked transport commit after merge.

### Negative

1. payload path set differs from report path set -> fail closed before PR mutation;
2. checked candidate path set differs from report path set -> existing fail closed remains;
3. one terminal file differs between semantic payload and checked candidate -> fail closed before PR mutation;
4. checked ref moves -> existing fail closed remains;
5. main base moves -> existing fail closed remains;
6. production moves -> existing fail closed remains;
7. malformed terminal report -> existing fail closed remains;
8. PR mismatch / duplicate -> existing fail closed remains;
9. PR_RECOVERY or Required failure -> existing fail closed remains;
10. post-publish mode must not accidentally gain terminal-only assumptions or fallback.

The regression must explicitly assert no PR create/merge call occurs before terminal replay parity passes.

## 10. R-series feedback rubric

### Stabilization

Disposition target: **STRONGER**.

The current guard is strict but false. The replacement binds the actual repository transport identity to the semantic terminal state using exact path/content evidence while retaining base/ref/CI/production fail-closed gates.

### Automation

Disposition target: **MORE AUTOMATIC AND SAFER**.

The repaired consumer can continue the existing automatic checked transport without pretending two legitimate Git commits must share metadata/SHA. Machine-verifiable identity increases rather than decreases.

### Simplification

Disposition target: **NEUTRAL TO SIMPLER**.

No new workflow, profile, credential, state store, or authority is introduced. Two identities that already exist are merely named by role and connected by one exact parity invariant.

Priority remains:

```text
STABILIZATION
> SAFE AUTOMATION
> SIMPLIFICATION
```

## 11. Acceptance and recovery

Implementation qualification requires:

```text
frozen 3-file scope only
new distinct-SHA positive regression PASS
semantic path mismatch negative PASS
semantic content mismatch negative PASS
existing checked-PR regression PASS
existing terminal-main-write regression PASS
SimCore Verify PASS
SimCore Required PASS
merged-main Required PASS
runtime mutation = NONE
release-simcore mutation = NONE
production identity unchanged
```

After postmerge qualification, recovery is a separate evidence transaction that preserves all existing v0.70.11 HUMAN_EVIDENCE semantic coordinates and only appends the #2000 recovery evidence path to `humanEvidence[]` to obtain a fresh main push.

Terminal closure still requires natural end-to-end proof:

```text
fresh R2.8 resolves ELIGIBLE_TO_PROJECT
→ fresh semantic payload created
→ fresh protected staging candidate created
→ dual-identity replay parity PASS
→ #1990 fallback naturally exercised if policy denial recurs
→ exact checked PR bound
→ PR_RECOVERY / Required PASS
→ frozen base/head revalidated
→ exact checked PR merged
→ terminal resolver readback = ALREADY_DURABLE
→ staging cleanup PASS
→ main manifest validation_status = LIVE_PASS
→ main current_priority = POST_07011_NEXT_STEP_REVIEW
→ release-simcore still 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
→ production blob still a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

Any new contradiction remains a BLOCKER and stops advancement.

## 12. Design disposition

```text
#2000 = DESIGN READY FOR REVIEW
runtime mutation = NONE
release-simcore mutation = NONE
production mutation = NONE
HUMAN_EVIDENCE mutation = NONE
new workflow/profile/token class = NONE
implementation authorization = NOT GRANTED BY THIS PROPOSED BRANCH
```

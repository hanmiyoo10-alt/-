# SimCore #1990 — R2.8 Actions PR-Create Policy Fallback Design

Status: **DESIGN FROZEN FOR REVIEW · BLOCKER REPAIR · NONRUNTIME**

Issue: #1990

## 1. Trigger and observed boundary

Fresh v0.70.11 R2.8 terminal convergence run `34419927059` on main `3f6e8e62722bff36948c2d6482bf79bb12c3fc4e` successfully completed the human-evidence resolver, exact production reobservation, admin transition, state synchronization, terminal payload creation, `repo-main-write.py` protected-main gate, and exact checked-PR handoff.

The exact generated terminal payload was:

```text
base = 3f6e8e62722bff36948c2d6482bf79bb12c3fc4e
commit = 570fb85ca10c54d47d42cf3135a5713fde4a215e
ref = simcore-r2-8-terminal-convergence/570fb85ca10c-1-34419927059-1-2154-1788998869861
changed paths = docs/CURRENT_DEVELOPMENT.md, product-manifest.json
```

`release-state-checked-pr.mjs` then attempted its existing initial checked-PR creation with the workflow `GITHUB_TOKEN` and GitHub returned HTTP 403:

```text
GitHub Actions is not permitted to create or approve pull requests.
```

This is a repository/platform policy boundary. It is not a runtime, production-byte, HUMAN_EVIDENCE, terminal-semantic, state-sync, or protected-main-writer correctness failure.

## 2. Existing authority that remains frozen

This design preserves the merged #1981 transport amendment and does not reopen its semantic contract:

```text
HUMAN_EVIDENCE
-> terminal resolver
-> admin/state projection
-> repo-main-write.py
-> exact checked transport PR
-> PR_RECOVERY / Required
-> frozen-base and exact-head merge
-> durable main byte proof
-> terminal resolver ALREADY_DURABLE
-> staging cleanup
```

The following remain mandatory:

- `repo-main-write.py` is the sole main integration gateway;
- HUMAN_EVIDENCE is the sole LIVE_PASS semantic authority;
- exact production commit/blob identity remains fixed;
- exact checked base/head/ref/path identity remains fixed;
- `PR_RECOVERY / Required` is mandatory before checked transport merge;
- current main must still equal the frozen base immediately before merge;
- no force push, branch-protection bypass, publication, runtime mutation, or `release-simcore` mutation;
- staging ref is preserved on every failure before durable proof;
- terminal durable readback must resolve to `ALREADY_DURABLE` before cleanup.

Ordinary PR `PR_MAIN` success is useful observation but is not a substitute for `PR_RECOVERY`.

## 3. Policy precedent and chosen mechanism

Repository design precedent already records that `pull-requests: write` does not prove initial PR-creation capability and that an Actions policy denial must not be answered by introducing a stronger PAT/App secret or new token class. The safe fallback is an authorized assistant-created PR followed by machine rediscovery and the ordinary deterministic validation chain.

#1990 adopts the same principle for the existing SimCore checked transport without importing Usage Dashboard state or ownership.

Chosen mechanism:

```text
terminal checked-PR query
-> no exact PR exists
-> one ordinary create attempt using existing workflow token
-> exact known policy denial only
-> emit bounded assistant-create handoff
-> bounded read-only exact-PR discovery
-> exact PR appears
-> continue existing PR_RECOVERY / Required chain unchanged
```

No stronger credential is introduced. No repository setting is weakened or enabled merely to make the workflow succeed.

## 4. Terminal-only fallback boundary

The new policy fallback is enabled only for validated `TERMINAL` input from `--mode consume-terminal`.

Existing post-publish `--mode consume` behavior is unchanged. A create failure there remains a failure under its existing contract. This prevents an observed R2.8 operational repair from silently changing unrelated R2.6 post-publish semantics.

The terminal fallback may activate only when all of these are true:

1. terminal report already passed the existing strict validator;
2. current main equals exact checked base;
3. current `release-simcore` equals exact production commit;
4. preserved remote ref equals exact checked commit;
5. exact payload path equality has passed;
6. no matching checked PR currently exists;
7. the single create attempt fails with the exact known GitHub Actions policy-denial class.

Any other failure remains immediately fail-closed.

## 5. Bounded assistant-create handoff

On the exact policy denial, the helper emits one bounded non-secret line containing only deterministic transport coordinates:

```text
R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED: title=<stable title> base=<40hex> commit=<40hex> ref=<safe ref>
```

This line is an operational transport request only. It is not release authority, LIVE_PASS evidence, validation evidence, or permission to alter the candidate.

The helper then performs bounded read-only discovery of open PRs. The production default is a fixed finite retry budget with a fixed small sleep interval. There is no daemon, scheduler, background worker, unbounded loop, or persistent queue.

A discovered PR is acceptable only when the existing identity predicate passes exactly:

```text
title == stable machine-owned title
base SHA == frozen base
head SHA == checked commit
head ref == preserved staging ref
head repository == canonical repository
exactly one plausible open PR
```

If the exact PR does not appear within the bounded budget, fail with a stable terminal-specific code and preserve the staging ref.

## 6. After rediscovery

Once the exact externally-created PR is rediscovered, all existing code paths resume without semantic relaxation:

1. dispatch `simcore-ci.yml` with `profile=PR_RECOVERY` and exact base/head/production inputs;
2. require workflow success and exactly one `Required` job success;
3. reobserve main and require the frozen base is still current;
4. reobserve production for terminal input;
5. merge with the exact checked head SHA;
6. verify every durable main path byte equals the checked payload path byte;
7. let the R2.8 workflow rerun terminal resolution and require `ALREADY_DURABLE`;
8. only then clean the staging ref.

The assistant-created PR does not gain authority to skip any step above.

## 7. Exact implementation owners

Frozen implementation owner set:

```text
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
```

No workflow edit is expected. The current R2.8 workflow already has the permissions required for its remaining metadata/action operations, and expanding those permissions does not solve the repository-level create policy.

Explicit non-owners:

```text
.github/workflows/simcore-ci.yml
.github/workflows/product-simcore-terminal-convergence-r2-8.yml
scripts/repo-main-write.py
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
HUMAN_EVIDENCE files
```

The last three administrative/evidence paths may later change only through the already-authorized terminal recovery transaction, not through #1990 implementation.

## 8. Regression contract

Permanent integration coverage must prove at least:

- existing exact PR reuse still succeeds;
- normal workflow-token PR creation success still succeeds;
- terminal exact known 403 emits the bounded handoff and can rediscover an externally-created exact PR;
- rediscovered PR still executes PR_RECOVERY and requires `Required` success before merge;
- terminal known 403 with no external PR reaches a bounded timeout/failure and never merges;
- wrong base/head/ref/repository after handoff fails closed;
- duplicate plausible PRs fail closed;
- non-policy create errors do not enter assistant fallback;
- post-publish `consume` does not gain the terminal fallback;
- main movement and production movement continue to block merge;
- cleanup still requires terminal `ALREADY_DURABLE` proof;
- no stronger credential/token class or workflow permission is introduced.

Tests may replace `sleep` with a no-op executable in the test PATH so the production retry budget can be exercised without wall-clock delay.

## 9. Recovery handling for current v0.70.11

PR #1991 was created through the authorized assistant connector from the exact currently-preserved payload and its ordinary PR SimCore CI passed. It remains intentionally unmerged because the required `PR_RECOVERY` dispatch has not occurred.

Merging this design or its later implementation advances main beyond #1991's frozen base. At that moment #1991 becomes historical recovery evidence and must be closed unmerged. It must not be rebased, retargeted, force-landed, or treated as current terminal authority.

After #1990 implementation is merged and qualified, the already-durable HUMAN_EVIDENCE must be re-resolved against fresh main through the existing recovery/retrigger mechanism. That fresh run derives a new exact terminal payload. If it encounters the same repository create policy, the authorized assistant creates the exact handoff PR while the bounded terminal consumer is active; the same run then resumes the existing PR_RECOVERY and durable closure chain.

No HUMAN_EVIDENCE recapture is required or authorized.

## 10. Stability / automation / simplification review

```text
Stabilization  = STRONGER
  known platform-policy denial becomes explicit, bounded, and fail-closed;
  exact identity and Required gates stay unchanged.

Automation     = MORE AUTOMATIC AND SAFER
  machine flow continues automatically after an authorized assistant performs only the capability GitHub Actions is forbidden to perform;
  no stronger secret or hidden bypass is introduced.

Simplification = NEUTRAL / MORE COMPLEX BUT JUSTIFIED
  one terminal-specific bounded fallback is added inside the existing transport owner;
  no new workflow, queue, profile, token class, or source of truth is introduced.
```

Priority remains `STABILIZATION > SAFE AUTOMATION > SIMPLIFICATION`.

## 11. Design disposition

```text
#1990 = DESIGN READY FOR REVIEW
runtime mutation = NONE
release-simcore mutation = NONE
production mutation = NONE
HUMAN_EVIDENCE mutation = NONE
implementation authorization = NOT GRANTED BY THIS DOCUMENT ALONE
```

On merge this document freezes only the #1990 terminal PR-create policy fallback described above. It does not broaden #1981 or #1959 authority.
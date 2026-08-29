# SimCore v0.67.0 prepublication state-preplay missing sync-write-report blocker

Date: 2026-08-29
Status: BLOCKER REPAIRED IN CONTROL PLANE · PUBLICATION RECOVERY PENDING · PRODUCTION UNCHANGED

## Context

The exact v0.67.0 candidate was already materialized and approved:

- release id: `simcore-v0.67.0-new-02`
- candidate ref: `candidate/simcore/simcore-v0.67.0-intent-02`
- candidate commit: `01a4204981191968ba22ba6ad161c1053d6bc7d0`
- candidate release blob: `24c57d86b3533a89e675c5b598b0c4a3a4fef6fe`
- expected production commit: `4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
- exact approval merge: `cb16eecb5ff152972a1472844689ad5efc8354e6`

The approval activation boundary resolved successfully and dispatched permanent release run `33248665243`.

## Permanent release result

The permanent release passed all candidate authorization and verification stages:

- Resolve Permanent Authorization: PASS
- Candidate Required / Verify: PASS
- Candidate Required / Required: PASS

Publication then failed in `Publish Exact Candidate` before the production mutation step.

Failing step:

```text
Preplay post-publish state before publication
```

Terminal failure:

```text
ENOENT ENOENT: no such file or directory, open '/home/runner/work/-/-/.simcore-release/state-converge/sync-write-report.json'
Process completed with exit code 2.
```

The following publication steps were therefore skipped:

```text
Publish through permanent controller
Build immutable post-publish handoff
Upload publication transaction handoff
Declare Published State
```

## Root cause

The permanent workflow intentionally runs prepublication simulation in a detached worktree:

```text
process cwd = GitHub Actions workspace
--root      = /tmp/simcore-r2-6-preplay
```

`release-state-converge.mjs` correctly passed root-relative state paths to `sync-state.mjs`, including:

```text
.simcore-release/state-converge/sync-write-report.json
.simcore-release/state-converge/sync-check-report.json
.simcore-release/state-converge/sync-final-check-report.json
```

But `sync-state.mjs` resolved `--report` using `path.resolve(args.report)`, which bound the report to process cwd instead of declared `--root`. Its prior tests invoked preplay with `cwd == root`, so the mismatch was not exercised.

Result:

```text
real workflow: cwd != root
→ report escaped synthetic worktree
→ report parent absent in Actions workspace
→ fs.writeFileSync ENOENT
→ preplay failed before publisher
```

Classification of root cause:

```text
CROSS_ROOT_REPORT_BINDING_DEFECT
+ TEST_TOPOLOGY_GAP
= RELEASE SYSTEM FIX
```

## Control-plane repair

Dedicated branch:

```text
fix/simcore-06700-preplay-report-root
```

PR:

```text
#813 Fix SimCore v0.67 cross-root prepublication report binding
```

Merged main commit:

```text
83cdfc71a5b763ef2be42211f0c52c80856dcc3c
```

Repair:

1. `sync-state.mjs` now resolves `--report` under declared `--root` through the bounded path resolver.
2. report parent directories are created before write.
3. CLI failure reports use the same root binding.
4. `post-publish-state-permanent.test.mjs` now intentionally executes preplay with `cwd != root`.
5. the regression asserts all three state-converge reports exist under the declared root and do not escape into cwd.

PR qualification:

```text
SimCore CI / Verify   PASS
SimCore CI / Required PASS
trusted self-change lane PASS
proposed permanent verifier PASS
```

No runtime plugin file or candidate byte was changed by this repair.

## Safety / authority observation

The initial failure happened before publication. At blocker discovery, `release-simcore` remained at the expected v0.66 production commit:

```text
4b6ae1a4c63f6be658c6163168cc46a1adef60aa
```

No production mutation was observed.

The approved v0.67 candidate remains immutable and independently verified. This packet does **not** establish a Recovery-retirement runtime defect.

## Recovery decision

Do **not** use `rerun failed jobs` on permanent run `33248665243`.

Reason: the already-successful Resolve job exported the old `verifier_commit`; re-running only failed/dependent jobs would preserve that old control-plane identity and the Publish job would check out the pre-fix verifier commit.

The bounded existing activation adapter is safe to re-run instead:

```text
Exact Approval Activation / Dispatch Permanent Caller
```

That job:

1. revalidates the immutable exact approval at its original approval merge;
2. rechecks candidate ref and currently observed production parent;
3. reads current `main` as `DISPATCH_HEAD`;
4. dispatches a **fresh** `SimCore Permanent Release` with `--ref main`;
5. therefore produces a new permanent run whose Resolve job computes the repaired current-main verifier commit.

This is not a new release intent, not a candidate rebuild, and not a publication bypass. It is a bounded retry of the existing exact approval through the existing permanent authority.

## Classification

```text
06700_PREPUBLICATION_STATE_PREPLAY_MISSING_SYNC_WRITE_REPORT
= BLOCKER / RELEASE SYSTEM
= ROOT CAUSE PROVEN
= CONTROL-PLANE FIX MERGED
= CROSS-ROOT REGRESSION ADDED
= CANDIDATE AUTHORIZATION PASS
= CANDIDATE REQUIRED PASS
= EXACT CANDIDATE STILL VALID
= INITIAL PRODUCTION MUTATION NONE
= PUBLICATION RECOVERY PENDING
= M2-5 RUNTIME CORRECTNESS DEFECT NOT ESTABLISHED
```

## Next bounded action

Re-run the failed `Dispatch Permanent Caller` job from Exact Approval Activation so it creates a fresh permanent run on repaired `main`.

After that fresh run:

1. prepublication preplay must PASS;
2. publication must use only Permanent Release authority;
3. `release-simcore` must resolve exactly to candidate `01a4204981191968ba22ba6ad161c1053d6bc7d0`;
4. both production files must resolve to blob `24c57d86b3533a89e675c5b598b0c4a3a4fef6fe` and remain identical;
5. only then may v0.67.0 enter real long-chat validation.

This blocker remains separate from v0.67 M2-5 runtime feature work.

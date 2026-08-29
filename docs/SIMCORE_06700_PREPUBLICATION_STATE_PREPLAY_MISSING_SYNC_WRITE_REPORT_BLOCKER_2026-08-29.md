# SimCore v0.67.0 prepublication state-preplay missing sync-write-report blocker

Date: 2026-08-29
Status: BLOCKER RESOLVED · FRESH PERMANENT RETRY PASS · v0.67.0 PUBLISHED · REAL LONG-CHAT PENDING

## Candidate and approval identity

The exact v0.67.0 candidate remained unchanged through recovery:

- release id: `simcore-v0.67.0-new-02`
- candidate ref: `candidate/simcore/simcore-v0.67.0-intent-02`
- candidate commit: `01a4204981191968ba22ba6ad161c1053d6bc7d0`
- candidate release blob: `24c57d86b3533a89e675c5b598b0c4a3a4fef6fe`
- previous production commit: `4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
- exact approval merge: `cb16eecb5ff152972a1472844689ad5efc8354e6`

## Initial failure

Initial permanent release run:

```text
33248665243
```

Candidate authorization and Required verification passed, but publication failed before mutation at:

```text
Preplay post-publish state before publication
```

Terminal failure:

```text
ENOENT ENOENT: no such file or directory, open '/home/runner/work/-/-/.simcore-release/state-converge/sync-write-report.json'
Process completed with exit code 2.
```

Publication, handoff construction and declaration were skipped. `release-simcore` therefore remained at v0.66 during the incident.

## Root cause

The permanent workflow runs prepublication simulation with different process and synthetic roots:

```text
process cwd = GitHub Actions workspace
--root      = /tmp/simcore-r2-6-preplay
```

`release-state-converge.mjs` correctly passed root-relative report paths to `sync-state.mjs`, but `sync-state.mjs` resolved `--report` through process cwd rather than declared `--root`.

Old regression coverage accidentally used `cwd == root`, hiding the real workflow topology.

```text
real workflow: cwd != root
→ report escaped synthetic worktree
→ report parent absent in Actions workspace
→ fs.writeFileSync ENOENT
→ preplay failed before publisher
```

Classification:

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

1. `sync-state.mjs` resolves `--report` below declared `--root` through the bounded resolver.
2. report parent directories are created before write.
3. CLI failure reports follow the same root binding.
4. `post-publish-state-permanent.test.mjs` intentionally executes preplay with `cwd != root`.
5. the regression requires all three state-converge reports to stay below declared root and rejects cwd escape.

Qualification:

```text
SimCore CI / Verify   PASS
SimCore CI / Required PASS
trusted self-change lane PASS
proposed permanent verifier PASS
```

No SimCore runtime file or candidate byte changed in the repair.

## Bounded recovery path

The failed permanent run itself was not rerun because its successful Resolve job had already frozen the old verifier identity.

Instead, the existing exact-approval activation adapter was rerun at:

```text
Exact Approval Activation / Dispatch Permanent Caller
```

It revalidated the original approval, immutable candidate and unchanged production parent, then dispatched a fresh Permanent Release from repaired current `main`.

This was not a new release intent, candidate rebuild or publication bypass.

## Fresh permanent retry

Fresh permanent release run:

```text
33249672791
```

Result:

```text
Resolve Permanent Authorization       PASS
Candidate Required / Verify           PASS
Candidate Required / Required         PASS
Preplay post-publish state            PASS
Publish through permanent controller  PASS
Build immutable post-publish handoff  PASS
Upload publication handoff            PASS
Declare Published State               PASS
Permanent Release Required            PASS
```

The exact regression point that failed in the first run, `Preplay post-publish state before publication`, passed under the repaired control plane.

## Independent production readback

After the successful fresh permanent run, `release-simcore` independently resolved to:

```text
commit 01a4204981191968ba22ba6ad161c1053d6bc7d0
parent 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
```

The production tree independently resolves both files to the same exact blob:

```text
plugins/simcore/latest.js
= 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe

plugins/simcore/install.js
= 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe

size = 562,962 bytes each
```

The published source reports userscript version `0.67.0`. The candidate's frozen build verification already established metadata/runtime/HOST convergence and physical Recovery-module absence.

## Durable main readback

`product-manifest.json` now declares:

```text
production_version      0.67.0
release_commit          01a4204981191968ba22ba6ad161c1053d6bc7d0
release_blob            24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
validation_status       PENDING_REAL_LONG_CHAT
current_priority        06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT
major_update_checkpoint M2-4
```

Durable state receipt:

```text
publisherRunId      33249672791
productionCommit    01a4204981191968ba22ba6ad161c1053d6bc7d0
previousProduction  4b6ae1a4c63f6be658c6163168cc46a1adef60aa
productionBlob      24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
validationStatus    PENDING_REAL_LONG_CHAT
lifecycleState      REAL_RELEASE_LIVE_PENDING
releaseAuthority    RS2_4_PERMANENT
result              PASS
```

The machine-managed state therefore correctly stops at real long-chat pending. M2-5 is not yet declared live-complete.

## Final blocker classification

```text
06700_PREPUBLICATION_STATE_PREPLAY_MISSING_SYNC_WRITE_REPORT
= BLOCKER RESOLVED
= ROOT CAUSE PROVEN
= CONTROL-PLANE FIX MERGED
= CROSS-ROOT REGRESSION PASS
= FRESH PERMANENT RETRY PASS
= RELEASE-SIMCORE EXACT v0.67.0
= CANDIDATE COMMIT UNCHANGED
= CANDIDATE BLOB UNCHANGED
= LATEST_INSTALL IDENTICAL
= NO NEW RELEASE INTENT REQUIRED
= M2-5 RUNTIME CORRECTNESS DEFECT NOT ESTABLISHED
= REAL LONG-CHAT PENDING
```

## Next gate

The next and only product gate is real long-chat validation of v0.67.0 M2-5 Recovery Transition Debt Retirement.

The live packet must prove ordinary continuity and same-tab reload/bootstrap continuity without a Recovery-related missing-reference/runtime fault. Only accepted human evidence may advance the machine-managed state from `PENDING_REAL_LONG_CHAT` / M2-4 to the durable M2-5 live-complete checkpoint through the normal convergence path.

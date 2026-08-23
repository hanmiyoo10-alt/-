# Repository Main-Write Coordination Contract

Date: 2026-08-23
Status: DESIGN FROZEN · INFRASTRUCTURE CHANGE AUTHORIZED · NON-RUNTIME
Scope: SimCore + Usage Dashboard repository administration only

## 1. Problem

`main` is shared by independent product workflows. Both SimCore and Usage Dashboard have workflows that materialize or synchronize product-owned state back to `main`.

A current direct recurrence exists: the Usage Dashboard 5.69 release command required a retrigger after its first main-side trigger overlapped an independent main writer. This is an infrastructure coordination defect, not a runtime/product defect.

Classification:

```text
REPO_MAIN_WRITE_RACE
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

An administrative setup mistake while creating this contract also briefly created this document on `main` before the coordination branch existed. No runtime or release file was touched. The correction is folded into this infrastructure change and classified:

```text
ADMIN_WRITE_MISROUTE
= FIX / DIRECT_EVIDENCE / ADMIN_ONLY
```

## 2. Goal

Independent product writes must not cancel, overwrite, or silently defer one another merely because they finish at nearly the same time.

Required behavior:

```text
SimCore main payload       ─┐
                            ├─ latest-main integration → both preserved
Usage Dashboard payload   ─┘
```

When payloads touch disjoint paths, both writers must be able to land even if they started from stale `main` snapshots.

When payloads genuinely conflict on the same content, the later writer must fail closed and preserve its work rather than force-push or overwrite the earlier writer.

## 3. Non-goals

This change does not:

- alter either plugin runtime;
- alter `release-simcore` or `release-usage-dashboard` runtime semantics;
- change SimCore v0.64.6 behavior or live validation;
- change Usage Dashboard release contents;
- implement SimCore Release System v2 generally;
- add source modularization;
- make `main` a runtime authority.

## 4. Why shared GitHub Actions concurrency is not the queue

A repository-wide `concurrency.group: repo-main-write` is insufficient as the primary correctness mechanism.

GitHub Actions concurrency is useful for coalescing/idempotent work, but it is not a durable FIFO queue for independent product writes. A shared group can leave only a bounded pending set and later runs may replace pending work. Therefore cross-product correctness must not depend on a shared concurrency group.

Product workflows may retain **product-local** concurrency when newer work legitimately subsumes older work, but SimCore and Usage Dashboard must not share one cancellation/coalescing domain.

## 5. Main-write protocol

All active automated writers covered by this contract use one common helper:

```text
scripts/repo-main-write.py
```

The helper receives an already-created local payload commit and an explicit path allowlist.

For every attempt it must:

1. validate the payload commit changes only allowlisted paths;
2. fetch the latest `origin/main`;
3. integrate the payload commit on top of that exact latest main using Git three-way semantics;
4. fail closed on a real content conflict;
5. push with ordinary fast-forward semantics only;
6. if the push loses a race because `main` moved, fetch the new main and retry from step 3;
7. never force-push `main`;
8. stop after a bounded number of retries and report the race rather than loop forever.

A write that has already been incorporated becomes a successful no-op.

## 6. Ownership boundaries

### SimCore automated main writes

Allowed durable-memory paths:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

SimCore synchronization must not stage or publish Usage Dashboard files.

### Usage Dashboard release materialization

Allowed paths:

```text
plugins/usage-dashboard/src/
plugins/usage-dashboard/latest.js
plugins/usage-dashboard/runtime/
plugins/usage-dashboard/runtime-src/
docs/USAGE_DASHBOARD_GUIDELINES.md
```

### Usage Dashboard project-memory sync

Allowed path:

```text
docs/USAGE_DASHBOARD_GUIDELINES.md
```

Usage Dashboard automated synchronization must not stage or publish SimCore durable-memory files.

## 7. Active writer migration set

This infrastructure change updates these current writers:

```text
.github/workflows/simcore-release-state-sync.yml
.github/workflows/simcore-release-command.yml          # memory-sync job only
.github/workflows/reusable-usage-dashboard-release.yml
.github/workflows/usage-dashboard-project-memory.yml
```

Historical one-shot workflows are not bulk-rewritten in this change. They are not promoted as current write authority and must not be used as a substitute for the migrated current writers.

## 8. Concurrency domains after migration

Cross-product shared group:

```text
repo-main-write   REMOVED from migrated current writers
```

Product-local coordination becomes:

```text
SimCore state synchronization       simcore-main-state-sync
SimCore legacy memory sync          simcore-main-state-sync
Usage Dashboard release             usage-dashboard-release
Usage Dashboard project memory      usage-dashboard-project-memory
```

The retrying integration helper, not cross-product cancellation, protects `main` correctness.

## 9. Failure model

### Path violation

```text
MAIN_WRITE_PATH_DENIED
```

No push.

### True integration conflict

```text
MAIN_WRITE_CONTENT_CONFLICT
```

No force push. Existing `main` remains authoritative. Payload commit remains evidence for manual resolution.

### Lost push race

```text
MAIN_WRITE_RACE_RETRY
```

Fetch latest main and retry automatically.

### Retry exhaustion

```text
MAIN_WRITE_RETRY_EXHAUSTED
```

Fail closed with no overwrite.

### Already applied

```text
MAIN_WRITE_ALREADY_APPLIED
```

Success/no-op.

## 10. Validation contract

Before promotion, infrastructure CI must prove at least:

1. helper syntax passes;
2. stale-base disjoint payload A then payload B leaves both changes on main;
3. reversed order also preserves both changes;
4. same-file conflicting payload fails closed;
5. denied path fails before push;
6. helper contains no force-push behavior;
7. migrated current workflows invoke the helper;
8. migrated SimCore and Usage Dashboard writers do not share `repo-main-write` concurrency;
9. runtime/release plugin files are unchanged by the infrastructure PR.

## 11. Rollback

If the helper itself blocks an urgent release administration step:

1. preserve the failure evidence;
2. do not force-push `main`;
3. land the product-owned payload through a normal mergeable PR based on latest main;
4. repair the infrastructure separately.

Runtime release branches remain independent authorities and must not be rolled back merely because main administration failed.

## 12. Promotion gate

```text
contract documented                         PASS
common helper implemented                   REQUIRED
helper self-test                            REQUIRED
four current writers migrated               REQUIRED
cross-product shared concurrency removed    REQUIRED
runtime diff                                NONE
release-simcore diff                         NONE
release-usage-dashboard runtime diff         NONE
main integration race simulation            PASS
```

Only after these gates pass may this coordination protocol be considered active.

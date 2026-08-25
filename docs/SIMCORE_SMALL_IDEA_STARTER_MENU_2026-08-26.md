# SimCore Small-Idea Starter Menu — 2026-08-26

Status: `IDEA MENU · SMALL SCOPE ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: provide a bounded set of genuinely small SimCore ideas that can be designed independently without reopening broad architecture research or mixing feature, release-system, and runtime ownership work.

Broad architecture research remains closed. This menu is intentionally limited to narrow ideas that can be explained in one short design note and, if later implemented, should remain one bounded work item.

## Selection rule

A small idea qualifies only if all of the following are true:

```text
one primary user/operator problem
one clear owner/surface
no new generic subsystem
no new persistence schema by default
no background polling
no provider/Host behavior guessing
no M2 ownership rewrite hidden inside the feature
```

## Tier S — smallest / easiest to reason about

### S1. Diagnostic Quick Summary

Category: `PRODUCT_UX / DIAGNOSTIC`

Idea:

```text
ACTIVE / INACTIVE
Mode
binding
Warnings count
request hotspot
mirror result
```

as one tiny read-only summary surface.

Rules:
- projection only;
- no new validator;
- no new diagnostic authority;
- consume already-existing bounded observation facts;
- hidden/compact by default if implemented.

Designability now: `YES`
Implementation sequencing: `PRODUCT MINI / RUNTIME CHANGE IF PLUGIN BYTES CHANGE`

### S2. Diagnostic Copy Profiles

Category: `PRODUCT_UX / OPERATOR`

Idea: keep the existing full copy path, but let the operator choose a bounded view such as:

```text
FULL
CURRENT_TURN
PERFORMANCE
STRUCTURE
CACHE_HISTORY
```

Rules:
- formatting/filtering only;
- never recalculate semantics;
- the same underlying diagnostic observation must remain authoritative;
- `FULL` remains the lossless troubleshooting option.

Designability now: `YES`
Implementation sequencing: `NARROW PRODUCT MINI`

### S3. Authority Drift Check — documentation-only first version

Category: `REPO_SAFETY / ADMIN`

Idea: define a tiny read-only check for contradictions among current-authority documents/facts, initially limited to:

```text
product-manifest release/version
CURRENT_DEVELOPMENT production version/live gate
release-simcore production identity receipt
R2.1 current operational status wording
```

Rules:
- first design may be specification-only;
- no automatic rewrite;
- report contradiction, do not silently repair;
- historical point-in-time evidence is excluded from drift findings.

Designability now: `YES`
Implementation sequencing: `NON_RUNTIME TOOLING / SEPARATE FROM PRODUCT RELEASE`

### S4. Evidence Index Entry Format

Category: `EVIDENCE / REPO_MEMORY`

Idea: define one compact index-entry format connecting an important contract to its evidence without copying the evidence body.

Example:

```text
contract ID
semantic owner
latest live evidence doc
fixture/suite ID
release/version
status: PASS / WATCH / GAP
related debt/watch ID
```

Rules:
- index only;
- no raw diagnostic duplication;
- existing dedicated evidence documents remain authoritative;
- no second roadmap authority.

Designability now: `YES`
Implementation sequencing: `DOC/TOOLING ONLY`

## Tier S+ — still small, but benefits from later ownership milestones

### S5. Reconcile Differential Receipt

Category: `CORRECTNESS / DIAGNOSTIC`

Idea: bounded reason receipt showing why Edit Reconcile selected one path:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT
HISTORICAL_RESTORE
REROLL_REPLACEMENT
```

This should expose existing decision facts, not introduce new decision logic.

Designability now: `PARTIAL`
Preferred implementation point: `POST-M2-3`, when edit-reconcile is the physical owner.

### S6. Turn Phase Receipt Lite

Category: `OBSERVABILITY`

Idea: record only bounded phase completion/timing facts for the current turn, such as:

```text
bootstrap
edit reconcile
prepare
request snapshot
prompt
output compatibility
structure
finalize
output snapshot
mirror
```

Rules:
- no raw body retention;
- no second transaction engine;
- phase names should follow actual production ownership;
- therefore physical implementation should wait until M2-3 stabilizes.

Designability now: `PARTIAL`
Preferred implementation point: `POST-M2-3`

## Recommended first exploration order

For idea-only work now:

```text
1. S1 Diagnostic Quick Summary
2. S4 Evidence Index Entry Format
3. S3 Authority Drift Check
4. S2 Diagnostic Copy Profiles
```

Why:
- S1 is the smallest user-visible product thought experiment;
- S4 is the smallest repository-memory improvement;
- S3 directly improves SimCore's authority discipline;
- S2 is useful but touches an existing troubleshooting workflow and deserves slightly more care.

S5/S6 should remain parked until M2-3 exposes the final application-service boundary.

## Anti-scope rules

Do not turn any item here into:

```text
DiagnosticManager
EvidenceService framework
AuthorityManager
TurnPipeline
background watcher
new persistence layer
new semantic validator
```

If a small idea starts requiring one of those, stop and reclassify it as a different/larger work item.

## Verdict

```text
BEST TINY PRODUCT IDEA
= S1 Diagnostic Quick Summary

BEST TINY REPO/MEMORY IDEA
= S4 Evidence Index Entry Format

BEST TINY SAFETY/AUTOMATION IDEA
= S3 Authority Drift Check

POST-M2-3 TINY OBSERVABILITY IDEAS
= S5 / S6

RUNTIME CHANGE NOW
= NONE
```

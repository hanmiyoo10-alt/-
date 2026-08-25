# SimCore Small-Idea Starter Menu — 2026-08-26

Status: `IDEA MENU · S4/S-09 FROZEN/PARKED · SMALL SCOPE ONLY · DESIGN MUST FREEZE BEFORE STOP · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: provide a bounded set of genuinely small SimCore ideas that can be designed independently without reopening broad architecture research or mixing feature, release-system, and runtime ownership work.

Broad architecture research remains closed. This menu is intentionally limited to narrow ideas that can be completed as bounded designs and, if later implemented during the stabilization/implementation phase, should remain one bounded work item.

Canonical idea-work policy: `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`.

Canonical size-inventory identity is used by the master matrix. This starter menu predates that numbering, so:

```text
starter S4 Evidence Index Entry Format
= master S-09 Evidence Index Entry Format
```

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

Selecting an idea activates a stronger completion rule:

```text
SELECT
→ COMPLETE THE DESIGN
→ mark DESIGN FROZEN / PARKED FOR STABILIZATION
→ STOP
```

Do not stop a selected idea at brainstorming or a loose concept note. Do not implement it immediately after design completion.

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
- hidden/compact by default if later implemented.

Designability now: `YES · MAY BE SELECTED FOR FULL DESIGN`
Implementation timing: `PARK AFTER DESIGN · IMPLEMENT LATER DURING STABILIZATION/IMPLEMENTATION PHASE`
Runtime classification if later implemented: `PRODUCT MINI / RUNTIME CHANGE IF PLUGIN BYTES CHANGE`

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

Designability now: `YES · MAY BE SELECTED FOR FULL DESIGN`
Implementation timing: `PARK AFTER DESIGN · IMPLEMENT LATER`
Future implementation class: `NARROW PRODUCT MINI`

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
- first design may target a read-only specification/tool;
- no automatic rewrite;
- report contradiction, do not silently repair;
- historical point-in-time evidence is excluded from drift findings.

Designability now: `YES · MAY BE SELECTED FOR FULL DESIGN`
Implementation timing: `PARK AFTER DESIGN · IMPLEMENT LATER`
Future implementation class: `NON_RUNTIME TOOLING / SEPARATE FROM PRODUCT RELEASE`

### S4. Evidence Index Entry Format

Master inventory ID: `S-09`
Category: `EVIDENCE / REPO_MEMORY`

Status:

```text
DESIGN FROZEN
PARKED FOR STABILIZATION
IMPLEMENTATION = NONE
```

Frozen design:
`docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`

Frozen v1 entry:

```text
Contract
Owner
Authority
Live Evidence
Fixture
Evidence Release
Status
Related
```

Frozen status vocabulary:

```text
PASS
WATCH
GAP
```

Key rules:
- index only;
- no raw diagnostic duplication;
- existing dedicated evidence documents remain authoritative;
- no second roadmap authority;
- Owner means semantic/contract owner, not writer/holder convenience;
- historical Evidence Release is preserved rather than rewritten to current production;
- fixture existence alone cannot create PASS when required live proof is still missing.

Designability now: `COMPLETE · DO NOT RESELECT DURING IDEA PHASE`
Implementation timing: `PARKED · IMPLEMENT LATER`
Future implementation class: `NON_RUNTIME / REPO_MEMORY`

## Tier S+ — small, but not selectable until ownership milestones expose enough truth

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

Current design status: `CANDIDATE ONLY`
Selection gate: `POST-M2-3 PHYSICAL OWNER STABLE`
Reason: the full design-freeze standard cannot be satisfied safely while physical edit-reconcile ownership is still planned rather than implemented.

When the gate opens:

```text
select S5
→ inspect actual post-M2-3 owner/API
→ complete full receipt contract
→ DESIGN FROZEN / PARKED
→ STOP
```

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
- phase names must follow actual production ownership.

Current design status: `CANDIDATE ONLY`
Selection gate: `POST-M2-3 PHYSICAL FLOW STABLE`
Reason: freezing the receipt schema against the imagined pre-M2-3 flow would violate the design-completion policy.

## Recommended design-exploration order

Completed:

```text
S4 / master S-09 Evidence Index Entry Format
→ DESIGN FROZEN / PARKED
```

Remaining starter-menu order:

```text
1. S1 Diagnostic Quick Summary
2. S3 Authority Drift Check
3. S2 Diagnostic Copy Profiles
```

The master priority matrix additionally places `Live Evidence Packet Builder` in the A1 pool; use `SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md` as the canonical cross-menu selection order.

For every selected item:

```text
FULL DESIGN FIRST
→ FROZEN
→ PARKED FOR STABILIZATION
→ NO IMPLEMENTATION
```

S5/S6 remain candidates only until M2-3 exposes the actual application-service boundary.

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

If a small idea starts requiring one of those, stop expanding the scope, reclassify it as a different/larger candidate, and do not call the current design complete.

## Verdict

```text
SMALL IDEA RULE
= SMALL SCOPE / FULL DESIGN RIGOR

COMPLETED SMALL DESIGN
= S4 / master S-09 Evidence Index Entry Format

S-09 STATE
= DESIGN FROZEN / PARKED FOR STABILIZATION

AFTER DESIGN FREEZE
= PARK + STOP

IMPLEMENTATION DURING CURRENT IDEA PHASE
= NONE

NEXT BEST TINY PRODUCT DESIGN CANDIDATE
= S1 Diagnostic Quick Summary

NEXT TINY SAFETY/AUTOMATION DESIGN CANDIDATE
= S3 Authority Drift Check

POST-M2-3 CANDIDATES
= S5 / S6
```

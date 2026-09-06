# SimCore Current-Doc Convergence #1671 Auto-Revert Recovery — 2026-09-06

Date: 2026-09-06 KST
Status: **FIX · DOC AUTHORING · PERMANENT REGRESSION CONTRACT VIOLATION · AUTO-REVERT SUCCESSFUL · NONRUNTIME**
Tracking: `#1672`
Related: `#1656`, `#1670`, PR `#1671`

## Summary

A docs-only current-state convergence attempt correctly identified stale human prose but did not survive exact merged-main validation. The PR-head SimCore CI passed, the PR merged, exact merged-main `MAIN_HEALTH` then failed the permanent closure-integrity regression, and canonical-main protection automatically reverted the merge.

This was not a runtime failure and not a guard failure. The protection system behaved correctly. The repair authoring violated an existing invariant by repeating the exact current production version literal inside active human-authored current-state prose.

## Failed transaction

```text
PR = #1671
merged main = 14ce1e75e72fbb47e37b194bb9c378dd31a8d0dc
post-merge SimCore CI = 34013224912
profile = MAIN_HEALTH
result = FAIL / PERMANENT_REGRESSION_FAIL
auto-revert main = f70fb829c0a5243a84c851da7572c3e47fba3779
```

Exact failed assertion:

```text
SUITE_ASSERTION_FAILED: closure-integrity: active human current-state prose duplicates version literal
```

## Root cause

`products/simcore/tests/suites/closure-integrity.test.mjs` defines active human current-state prose as the section beginning at `# 1. Current Operational State` and ending before the historical precursor. That active section must remain identity-free:

```text
no current version literal
no 40-character commit literal
no duplicated live-gate literal
```

Exact current identity belongs only to the machine-managed production snapshot / release-state block and root manifest.

PR #1671 fixed the semantic drift but repeated the current version literal in its human interpretation paragraph. PR-head validation did not catch that under its bounded path/profile classification; exact merged-main `MAIN_HEALTH` did, and canonical-main protection reverted the merge as designed.

## Classification

```text
AUTHORING_DEFECT = FIX
CANONICAL_MAIN_GUARD = PASS / PROTECTIVE
AUTO_REVERT = SUCCESSFUL
RUNTIME_DEFECT = NONE
RELEASE_SIMCORE_MUTATION = NONE
PRODUCTION_MUTATION = NONE
```

The earlier completion report and closure of `#1656` / `#1670` were therefore premature. Both issues were reopened after fresh main readback.

## Retry contract

The retry must preserve the invariant rather than weaken it:

```text
machine-managed current blocks
→ sole exact current identity authority

active human Current Operational State
→ interpretation only
→ three-lens evidence disposition may be described
→ open FIX/WATCH/DEFER owners may be referenced
→ no exact current version / commit / live-gate identity literal

Quick Resume
→ point exact identity reads back to machine-managed authority
→ describe current evidence/admin state without becoming a second mutable identity database
```

Current semantic correction required by the retry:

```text
three-lens release-specific evidence review = complete
R2.8 HUMAN_EVIDENCE terminal convergence = not executed
machine-managed pending state = remains authoritative
FIX #1657 = open / advancement-holding
FIX #1660 = open / advancement-holding
WATCH #1588 = preserved
provider cache = UNVERIFIED
no next runtime version preauthorized
```

## Isolation

Do not change in this recovery transaction:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
product-manifest.json
machine-managed CURRENT_DEVELOPMENT blocks
runtime behavior
persistent schema
closure-integrity test semantics
canonical-main auto-revert semantics
#1657 source repair
#1660 source repair
```

## Close gate

Do not close `#1656`, `#1670`, or `#1672` merely because PR CI passes.

Required proof:

```text
1. retry PR exact-head SimCore CI = PASS
2. merge to main
3. exact merged-main SimCore MAIN_HEALTH = PASS
4. no canonical-main auto-revert
5. fresh main readback contains identity-free corrected current prose
6. fresh main Quick Resume reflects current pending/admin boundary
7. release-simcore unchanged
8. latest.js == install.js unchanged
```

Only after all eight checks pass may the documentation convergence be called complete and runtime FIX `#1657` resume.

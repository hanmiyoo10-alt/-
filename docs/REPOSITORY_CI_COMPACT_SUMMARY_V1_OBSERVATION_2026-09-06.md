# Repository CI Compact Summary v1 · Phase 3 Observation Baseline

Date: 2026-09-06
Status: OBSERVATION_BASELINE
Tracking: #1717
Authority branch: `main`

## 1. Purpose

This record closes the first Phase 3 observation packet for Repository CI Compact Summary v1 after all three pilot integrations landed.

The observation goal is not to prove that every future CI failure can be understood without logs. It is to measure whether the compact summary is sufficient for the **first operational verdict**, while preserving targeted drill-down for root-cause work when needed.

The distinction is intentional:

- **first-verdict drill-down**: whether a reviewer had to fetch a full raw job log before deciding PASS / FAIL / NOOP and locating the first actionable failure;
- **corrective drill-down**: whether a targeted contract/report/detail had to be inspected later to understand and repair a failure.

The compact layer is successful when the first category is normally avoided. The second category is expected for nontrivial failures.

## 2. Primary five-run baseline

| Workflow / run | Authoritative verdict | Compact verdict | Compact size | First-verdict full raw log needed | Corrective targeted detail needed |
| --- | --- | --- | ---: | --- | --- |
| SimCore CI #8220 · run `34021040713` | PASS · 4/4 planned gates | PASS · 4/4 | 15 lines | No | N/A |
| Plugin Control Plane CI #4649 · run `34024092744` | PASS · 42/42 contracts | PASS · 42/42 | 24 lines | No | N/A |
| Usage Dashboard Candidate Validation #257 · run `34024092850` | PASS · full registry, 133 tests | PASS · 7/7 phases, 133 tests | 18 lines | No | N/A |
| Plugin Control Plane CI #4644 · run `34021502051` | FAIL at contract execution | FAIL · 8/42 · `notification-bundling-contract` | 24 lines | No | Yes |
| Plugin Control Plane CI #4645 · run `34021570003` | FAIL at contract execution | FAIL · 17/42 · `closure-bookkeeping-contract` | 24 lines | No | Yes |

All line counts include the stable `CI_SUMMARY_V1_BEGIN` and `CI_SUMMARY_V1_END` markers.

## 3. Aggregate observation

For the five-run primary baseline:

```text
summary completeness:                    5/5
compact ↔ authoritative verdict mismatch: 0/5
renderer failure:                        0/5
first-verdict full raw-log requirement:   0/5
real FAIL samples needing corrective detail: 2/2
compact rendered size range:             15–24 lines
```

The two failure samples are particularly useful operational evidence. The compact summary identified the correct first failed contract before corrective inspection began:

- #4644 stopped at `8/42` with `notification-bundling-contract`;
- #4645 stopped at `17/42` with `closure-bookkeeping-contract`.

The repair investigation then drilled into the named contract/assertion only. That is the intended progressive-disclosure path:

```text
compact verdict
  -> first actionable failure
  -> targeted contract/report detail
  -> full raw log only if still necessary
```

## 4. Supplemental NOOP coverage

SimCore CI #8228 · run `34024092751` is retained as a supplemental semantic sample rather than being counted as a PASS baseline run.

The GitHub job itself completed successfully, but the authoritative SimCore report classified the change as unrelated. The compact layer correctly rendered:

```text
Result: NOOP
Checks: 0/0 PASS
Reason: UNRELATED_CHANGE
```

This is useful negative evidence: a successful GitHub job was **not** flattened into a false product PASS. The adapter preserved the authoritative `NOOP` meaning.

## 5. Completeness and mismatch assessment

No sampled run produced:

- a false PASS,
- a false FAIL,
- a PASS manufactured from missing summary source,
- a renderer failure hidden as success,
- a first failure that disagreed with the authoritative failing contract.

The pilot remains non-authoritative. Product/workflow conclusions still own release and merge gating.

## 6. Context reduction assessment

The live compact outputs remained within 15–24 lines across the primary samples even when the underlying jobs executed:

- multiple SimCore gates,
- 42 Plugin Control Plane contracts,
- the complete Usage Dashboard registry with 133 tests plus release/materialization/reconciliation phases.

This confirms strong practical context reduction for first-pass review.

This observation does **not** claim an exact percentage token reduction. A normalized raw-log denominator was not collected for every sample, and the v1 design explicitly treats percentage reduction as secondary to the more useful metric: whether a first-pass review can be completed without fetching full logs.

For this baseline, that operational metric is `5/5`.

## 7. Limitations

The current live operational sample does not yet include a naturally occurring:

- `CANCELLED` compact result;
- `INFRA_ERROR` compact result caused by real runner/source failure.

Those paths are covered by renderer/adapter contract tests, but they are not claimed as live Phase 3 evidence here.

The baseline is also intentionally small. It is a stabilization checkpoint, not a statistical guarantee for every repository workflow.

## 8. Phase 3 verdict

```text
PILOT_STABLE_FOR_CONTROLLED_EXPANSION
```

Rationale:

- all three pilot families produced complete live summaries;
- PASS and FAIL paths were observed;
- a semantically distinct NOOP path was preserved correctly;
- zero sampled authority mismatches occurred;
- zero sampled renderer failures occurred;
- all five primary first-pass verdicts were obtainable from compact output without a full raw-log fetch;
- actual failures still supported targeted corrective drill-down.

## 9. Phase 4 recommendation

Controlled expansion is authorized as a **design progression**, not as a repository-wide blast rollout.

Recommended policy:

1. integrate one additional workflow family per PR;
2. preserve each workflow's existing authoritative gate;
3. prefer structured receipts/reports over log parsing;
4. keep summary generation non-authoritative during expansion;
5. verify PR-head and post-merge behavior before adding the next workflow;
6. do not promote a repository-wide required `CI Summary Contract` merely because this baseline is green;
7. continue recording live CANCELLED / INFRA_ERROR evidence when it occurs naturally.

Candidate Phase 4 families remain those from the approved design, such as Canonical Main, release validation, agent-skill evaluation, and Termux tooling.

## 10. Production isolation

This Phase 3 observation packet changes documentation only.

It does not modify:

- SimCore runtime/plugin files;
- `release-simcore`;
- production identity;
- release state;
- product CI authority.

The compact summary remains a bounded, read-only derived operational view.
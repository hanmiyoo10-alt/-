# SimCore #1959 Checked-PR Caller Consumption Implementation Evidence

Date: 2026-09-09
Status: **IMPLEMENTED · POST-MERGE VERIFIED · NON-RUNTIME · CLOSED**
Tracking: #1959
Design authority: `docs/SIMCORE_1959_CHECKED_PR_CALLER_CONSUMPTION_DESIGN_2026-09-09.md`
Design merge: `949906d3d3ad09eb8ef46a2a9af989148c77a1aa`
Work branch: `fix/simcore-1959-checked-pr-caller-consumption-20260909`

## 1. Problem repaired

`repo-main-write.py` correctly returns exit 9 with `MAIN_WRITE_CHECKED_PR_REQUIRED` when native Required enforcement forbids direct protected-main landing and preserves an exact gated staging ref.

Before this repair, `release-state-main-gate.mjs` converted that bounded recovery result into generic `R2_6_MAIN_GATE_FAIL`. Both permanent post-publish and recovery callers therefore stopped before the #1950 checked-PR transport could be consumed.

The repair does not weaken native protection and does not restore direct protected-main push.

## 2. Implemented sequence

```text
owner-generated payload
→ repo-main-write exact staging Required PASS
→ structured CHECKED_PR_REQUIRED handoff
→ canonical checked-state PR on exact preserved ref
→ explicit PR_RECOVERY validation on exact base/head
→ verifier profile projected to existing PR_MAIN semantics
→ Required PASS
→ frozen main base re-read
→ ordinary protected-branch PR merge API with exact head SHA
→ durable byte equality verification
→ shared durable reobserve PASS
→ staging ref cleanup
```

## 3. Changed implementation surfaces

```text
.github/workflows/simcore-ci.yml
.github/workflows/simcore-release-permanent.yml
.github/workflows/simcore-release-state-sync.yml
products/simcore/tooling/release-state-main-gate.mjs
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tooling/ci/classify.mjs
products/simcore/tests/suites/release-system-r2-6.test.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
```

The new helper is a main-state transport consumer only. It has no `release-simcore` publication authority and contains no force-push or bypass path.

`PR_RECOVERY` is a transport profile only. Inside the permanent verifier it projects to `PR_MAIN`, preserving the existing trusted predecessor and proposed-verifier semantics while supplying explicit immutable base/head commits.

The permanent post-publish job and permanent-recovery job receive only the additional `pull-requests: write` permission needed for ordinary PR creation/merge. Existing `contents: write` and `actions: write` authority remains otherwise unchanged.

## 4. Fail-closed invariants

```text
main moved after validation     → merge forbidden
Required failed                 → merge forbidden
Required job missing            → merge forbidden
ambiguous recovery run          → merge forbidden
open canonical PR wrong base    → fail
open canonical PR wrong head    → fail
pre-merge PR identity mismatch  → merge forbidden
durable bytes mismatch          → cleanup forbidden
shared reobserve not PASS       → cleanup forbidden
```

## 5. Pre-PR validation

Local authoritative-adjacent checks on the implementation worktree:

```text
git diff --check                                      PASS
Node syntax for changed/new MJS                      PASS
scripts/test-repo-main-write.py                      PASS
checked-PR fake-gh + bare-repo integration           PASS
release-system-r2-6 executable suite                 PASS
post-publish-state-permanent boundary                PASS
products/simcore/tooling/ci/self-test.mjs            PASS (31)
runtime path diff under plugins/simcore              NONE
release-simcore mutation                             NONE
force/bypass tokens in checked-PR helper             NONE
```

Integration terminal line:

```text
R2_6_CHECKED_PR_INTEGRATION_PASS success + main-move + Required-fail + cleanup
```

R2.6 permanent boundary terminal line:

```text
RS2_6_POST_PUBLISH_BOUNDARY_TEST_PASS ENVELOPE + PREPLAY_CROSS_ROOT + SHARED_GATE + SHARED_REOBSERVE + RECOVERY_PARITY
```

CI self-test terminal line:

```text
SimCore CI self-test PASS (31)
```

## 6. Local tooling limitations and observed anomalies

The local Ubuntu/Termux validation environment does not currently provide Python `yaml`, Node `yaml`, or Ruby. Therefore local YAML parsing could not be executed. This is classified `DEFER · LOCAL_TOOLING_YAML_MODULE_ABSENT`; repository CI remains the authoritative YAML/workflow parser and execution gate.

During implementation/finalization the following non-runtime tooling anomalies were preserved on #1959 and closed or deferred as stated:

```text
FIX · TOOLING_SEARCH_QUERY_PARSE              CLOSED · mutation NONE
FIX · TOOLING_ACTION_MISROUTE                 CLOSED · accidental #1967 only
FIX · TOOLING_WORKFLOW_URL_UNSUPPORTED        CLOSED · read-only connector limitation
FIX · TEST_HARNESS_TEMP_DIR_OWNERSHIP         CLOSED · corrected, regression PASS
FIX · TOOLING_DEVICE_AMBIGUITY                CLOSED · target device pinned
DEFER · LOCAL_TOOLING_YAML_MODULE_ABSENT      OPEN AS LOCAL LIMITATION ONLY
```

## 7. Fresh authority readback before commit

```text
main = 949906d3d3ad09eb8ef46a2a9af989148c77a1aa
work-branch remote base = same
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
runtime version = v0.70.11
runtime path mutation = NONE
```

No runtime candidate was regenerated. No production republish, rollback, HUMAN_EVIDENCE transition, LIVE_PASS claim, or next runtime authorization is part of #1959.

## 8. Required completion gate

This work is not considered closed until the implementation PR passes fresh SimCore CI including trusted predecessor/proposed verifier/Required, merges by expected head, merged-main SimCore CI succeeds, production is re-read unchanged, and #1959 receives terminal evidence.

## 9. Terminal implementation closure

Implementation commit:

```text
7428f9003ddd52b0b21e6e0c7aa8d24782bda964
```

Implementation PR:

```text
#1970
base = 949906d3d3ad09eb8ef46a2a9af989148c77a1aa
head = 7428f9003ddd52b0b21e6e0c7aa8d24782bda964
changed files = 9
SimCore CI run = 34345320818 / #8635
trusted predecessor = SUCCESS
proposed verifier = SUCCESS
Verify = SUCCESS
Required = SUCCESS
expected-head merge = PASS
main merge = df2857cb3e57e8b06d9f8705a6380873733fd5d5
```

Merged-main health:

```text
SimCore CI run = 34345495271 / #8636
Verify = SUCCESS
Required = SUCCESS
```

Post-merge production readback:

```text
main = df2857cb3e57e8b06d9f8705a6380873733fd5d5
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
version = 0.70.11
latest.js blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
install.js blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
latest == install = YES
runtime/release mutation from #1959 = NONE
```

The earlier local YAML parser limitation is superseded for implementation qualification by successful GitHub parsing and execution of the modified workflows in PR CI and merged-main CI.

## 10. Final disposition

```text
#1959 = FIX RESOLVED
checked-PR caller consumption = IMPLEMENTED
native protected-main semantics = PRESERVED
ordinary checked-PR transport = AUTOMATICALLY CONSUMED
shared writer authority = repo-main-write.py PRESERVED
production publisher authority = UNCHANGED
runtime candidate = UNCHANGED
release-simcore = UNCHANGED
real long-chat = NOT APPLICABLE TO NON-RUNTIME REPO-SYSTEM FIX
next runtime authorization = NOT IMPLIED
```

Future live releases should naturally exercise the real network path when native protection returns `MAIN_WRITE_CHECKED_PR_REQUIRED`. Any new anomaly from that live exercise must be recorded as a new WATCH/FIX/BLOCKER rather than reopening historical assumptions.

# SimCore RS2-3 P4 — Required CI Enforcement Admin Handoff

Date: 2026-08-23
Status: **BLOCKED ON ADMIN SETTING · READY TO APPLY · NON-RUNTIME**
Phase: `RS2-3 — Permanent CI`
Promotion step: `P4 — Configure SimCore CI / Required as enforced main check`

## 1. Entry state

The permanent CI implementation is already installed and shadow-verified.

Current machine authority:

```text
products/simcore/ci/RS2_3_STATUS.json
phaseStatus = PROMOTION_READY
requiredCheckName = SimCore CI / Required
requiredCiActive = false
requiredCiEnforcementVerified = false
nextPromotionStep = P4_CONFIGURE_REQUIRED_CHECK_ENFORCEMENT
```

Current repository fact at this attempt:

```text
main commit               = dab9ec98f07959dbe7b20ff4c60339f359e11568
main protected            = false
required status checks    = off
```

No SimCore runtime or `release-simcore` mutation is part of P4.

## 2. PFFL START PRECHECK result

Known prior failure/control:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
class       = ADMINISTRATION
scope       = REPOSITORY_INFRASTRUCTURE
confidence  = DIRECT_EVIDENCE
disposition = BLOCKER
```

The administrative tool surface was rechecked before attempting P4.

Results:

```text
GitHub connector branch-protection mutation  NOT AVAILABLE
GitHub connector ruleset mutation             NOT AVAILABLE
installable matching admin plugin             NONE FOUND
```

This is therefore a distinct recurrence of the same administrative capability gap.

PFFL manual recurrence disposition:

```text
repeatability        = RECURRENT
prevention review    = EXISTING_CONTROL_GAP
prevention level     = CHECKLIST_PRECHECK / ADMIN_POLICY candidate
new runtime repair   = NOT JUSTIFIED
```

P4 must not be falsely marked complete by editing repository files alone.

## 3. Frozen P4 semantic requirement

The only acceptable P4 result is an actual GitHub repository enforcement mechanism:

```text
branch protection required status check
OR
repository ruleset required status check
```

The exact required context is:

```text
SimCore CI / Required
```

After P4, a pull request targeting `main` must not be mergeable through the normal protected path while that check is pending or failing.

The following do not count:

```text
workflow exists
human convention
bot comment
README statement
optional check in UI
machine status edited to true
```

## 4. Exact administrator apply target

Repository:

```text
hanmiyoo10-alt/-
```

Target branch:

```text
main
```

Configure either branch protection or a repository ruleset so that:

```text
require status checks before merging = ON
required check                        = SimCore CI / Required
```

P4 does not require adding unrelated review, deployment, signing, or force-push policies.

Do not rename the required check.
Do not replace it with an internal job name.
Do not add a top-level path-filter exception for SimCore.
The permanent workflow already emits a successful NOOP result for unrelated PRs.

## 5. Required read-back before P5

After the administrator setting is applied, do not proceed from visual assumption alone.

Read back repository configuration and prove:

```text
main enforcement mechanism exists
SimCore CI / Required is listed as required
enforcement is active for PRs targeting main
```

Only then may machine state advance to:

```text
requiredCiActive = true
```

`requiredCiEnforcementVerified` remains false until P5.

## 6. Immediate next step — P5

After successful P4 read-back, create one controlled infrastructure-only failing PR.

Required proof:

```text
negative PR number
head commit
planned failing gate ID
SimCore CI / Required = failure
GitHub enforcement = merge blocked
PR closed unmerged
```

Success code:

```text
REQUIRED_ENFORCEMENT_NEGATIVE_PROVED
```

If the check fails but the PR remains normally mergeable:

```text
REQUIRED_CHECK_NOT_ENFORCED
= BLOCKER
```

## 7. Safety boundary

P4/P5 must not:

```text
modify release-simcore
modify plugins/simcore/latest.js
modify plugins/simcore/install.js
publish a bad plugin
use live user chat as a negative
activate RS2-4 release authority
```

This is repository administration only.

## 8. Rollback

If enabling the required check unexpectedly deadlocks unrelated PRs:

1. preserve the failing PR/run evidence;
2. disable only the new `SimCore CI / Required` enforcement rule;
3. keep permanent CI installed and read-only;
4. classify the failure through PFFL;
5. repair classifier/workflow behavior separately;
6. repeat P4/P5 after proof.

Do not delete permanent CI merely because enforcement configuration exposed a routing problem.

## 9. Current bounded result

```text
P4 implementation requested                  YES
permanent CI ready                           YES
required check identity                      VERIFIED
admin mutation capability in current tools   NO
P4 repository enforcement                    NOT APPLIED
requiredCiActive                             false
requiredCiEnforcementVerified                false
RS2_3_CLOSED                                 false
RS2_4_ENTRY_AUTHORIZED                       false
```

Current classification:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= BLOCKER / ADMINISTRATION / TOOL_SURFACE / RECURRENT
```

Next executable action requires a GitHub repository administrator surface capable of changing branch protection or repository rulesets.

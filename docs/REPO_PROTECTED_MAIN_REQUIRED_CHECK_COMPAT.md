# Repository Protected-Main Required-Check Compatibility

Date: 2026-08-24
Status: **DESIGN FROZEN · IMPLEMENTATION AUTHORIZED · NON-RUNTIME**
Scope: shared repository main-write infrastructure used by SimCore and Usage Dashboard

## 1. Problem

RS2-3 P4 requires `main` to enforce the permanent SimCore required check.

Current repository fact before this work:

```text
main protected            = false
required status checks    = off
required check target     = SimCore CI / Required
```

The repository currently has automated writers that create a local commit and push it directly to `main` through `scripts/repo-main-write.py`.

Confirmed active writers include:

```text
.github/workflows/simcore-release-state-sync.yml
.github/workflows/usage-dashboard-project-memory.yml
```

A required-status-check rule applies to ref updates, not only UI merges. A newly-created automation commit therefore cannot be pushed directly to protected `main` unless the required check has already passed for that exact commit.

The GitHub repository Ruleset UI was inspected during the P4 attempt. `GitHub Actions` is not available as a bypass actor for this user-owned repository. Enabling the rule immediately would therefore create an avoidable outage in current automated main synchronization.

## 2. PFFL evidence

Known recurring administrative blocker:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= BLOCKER / ADMINISTRATION / TOOL_SURFACE / RECURRENT
```

New direct evidence from the manual P4 setup:

```text
RULESET_GITHUB_ACTIONS_BYPASS_UNAVAILABLE
= FIX / REPOSITORY_INFRASTRUCTURE / DIRECT_EVIDENCE
```

Prevention decision:

```text
EXISTING_CONTROL_GAP
→ implement protected-main-compatible automated writer
→ do not weaken required-check enforcement
→ do not add broad human/admin bypass solely to preserve automation
```

## 3. Goal

Preserve automatic bounded main synchronization after required checks are enabled without adding PATs, deploy keys, or bypass actors.

Canonical write sequence:

```text
payload commit
→ fetch latest main
→ replay payload on exact latest main
→ candidate commit C
→ push C to unique temporary staging ref
→ dispatch permanent SimCore CI on C
→ wait until Required job succeeds on exact C
→ confirm main still equals integration base
→ fast-forward exact checked C to main
→ delete staging ref
```

If `main` moves before final update:

```text
no main push
→ discard/clean staging ref
→ fetch new main
→ replay payload again
→ produce new candidate identity
→ re-run required check for the new exact commit
```

A check result may never be reused across different candidate commits.

## 4. Why this satisfies protected-main semantics

Required status checks are commit-identity checks.

The candidate is first published to a non-protected temporary ref where the permanent required workflow can execute. Only after the exact candidate commit has a successful required check may the same commit be proposed as the new `main` tip.

No bypass is required.

This preserves the repository rule rather than exempting automation from it.

## 5. Authority boundaries

This change is repository infrastructure only.

It does not:

```text
modify SimCore runtime
modify Usage Dashboard runtime
modify release-simcore
modify release-usage-dashboard
change production versions
activate RS2-4
change release candidate semantics
change state-sync rendering ownership
```

It may modify:

```text
scripts/repo-main-write.py
scripts/test-repo-main-write.py
current automated main-writer workflow permissions/invocations
dedicated implementation evidence
```

## 6. Helper compatibility contract

Legacy direct mode remains available for non-protected/historical callers during migration.

Protected mode is explicit and fail-closed.

Planned arguments:

```text
--required-workflow <workflow file/name>
--required-profile <profile>
--required-job <job name>
--staging-prefix <safe branch prefix>
--gate-timeout-seconds <bounded timeout>
--gate-poll-seconds <bounded interval>
```

Protected mode requires:

```text
GH_TOKEN present
GITHUB_REPOSITORY present or explicit repository argument
gh CLI available
workflow dispatch succeeds
run identity resolves to exact candidate SHA
required job conclusion = success
workflow conclusion = success
main base unchanged after gate
```

Missing or ambiguous evidence fails closed.

## 7. Failure vocabulary

```text
MAIN_WRITE_STAGING_PUSH_FAILED
MAIN_WRITE_GATE_DISPATCH_FAILED
MAIN_WRITE_GATE_RUN_NOT_FOUND
MAIN_WRITE_GATE_RUN_AMBIGUOUS
MAIN_WRITE_GATE_TIMEOUT
MAIN_WRITE_GATE_WORKFLOW_FAILED
MAIN_WRITE_REQUIRED_JOB_MISSING
MAIN_WRITE_REQUIRED_JOB_FAILED
MAIN_WRITE_BASE_MOVED_AFTER_GATE
MAIN_WRITE_STAGING_CLEANUP_FAILED
```

A moved base is a retryable race, not a force-push condition.

Gate or identity failures are not silently retried against another candidate.

## 8. Staging ref requirements

Temporary refs must:

```text
be outside main
be unique per candidate/attempt
contain only bounded machine-safe characters
never require force push
be deleted after success or bounded failure when possible
```

Recommended namespace:

```text
repo-main-write-gate/<candidate-prefix>-<attempt>
```

A cleanup failure is preserved as evidence and must not cause a second main mutation.

## 9. Permanent CI contract used by the gate

The existing permanent SimCore workflow already supports `workflow_dispatch` and read-only `MAIN_HEALTH` execution.

Protected-main writer mode uses:

```text
workflow = .github/workflows/simcore-ci.yml
profile  = MAIN_HEALTH
required job = Required
```

The dispatched workflow must run against the staging ref containing candidate C.

The writer verifies exact `headSha == C` before accepting the result.

## 10. Workflow permission boundary

Only current automated writers using protected mode need additional workflow-dispatch permission.

Expected permissions:

```text
contents: write
actions: write
```

No secrets are added.

No PAT or deploy key is introduced.

The permanent SimCore CI remains `contents: read`.

## 11. Current writer migration set

Required current writers:

```text
.github/workflows/simcore-release-state-sync.yml
.github/workflows/usage-dashboard-project-memory.yml
```

Historical/superseded one-shot workflows are not promoted as current authority by this change.

Any remaining current direct-main writer discovered during implementation is a BLOCKER until explicitly migrated or dispositioned.

## 12. Validation requirements

Before this prerequisite is called ready:

```text
helper Python syntax                                      PASS
legacy stale-base/disjoint integration tests             PASS
legacy conflict/path-denial tests                         PASS
protected-mode exact-candidate staging test               PASS
protected-mode required-job PASS test                     PASS
wrong candidate SHA rejection                             PASS
missing required job rejection                            PASS
failed required job rejection                             PASS
workflow failure rejection                                PASS
main moved after gate → replay/re-gate                    PASS
no force push                                             PASS
active writer inventory                                   PASS
current writers request actions:write only where needed   PASS
current writers invoke protected mode                     PASS
runtime/release diffs                                     NONE
```

Network/GitHub behavior must also receive one bounded shadow proof before enabling the main Ruleset.

The shadow proof may create/delete only temporary staging refs and must not mutate `main`.

## 13. P4 handoff

Only after this prerequisite is implemented and shadow-proven should the user return to:

```text
Settings → Rules → Rulesets
```

Then P4 can enable the required status check without a GitHub Actions bypass.

After read-back confirms enforcement is active, RS2-3 proceeds to the controlled P5 negative proof.

## 14. Rollback

Before the Ruleset is active, rollback is simply restoring current writer invocation.

After activation, if protected-mode automation fails:

```text
preserve failure evidence
keep runtime/release branches untouched
do not force main
do not add broad admin bypass as an emergency repair
land urgent bounded state through a normal checked PR if necessary
repair repository infrastructure separately
```

## 15. Entry status

```text
DESIGN                         FROZEN
IMPLEMENTATION                 AUTHORIZED
RULESET                        NOT YET ENABLED
MAIN PROTECTION                OFF
RUNTIME CHANGE                 NONE
RELEASE-SIMCORE CHANGE         NONE
RELEASE-USAGE-DASHBOARD CHANGE NONE
```

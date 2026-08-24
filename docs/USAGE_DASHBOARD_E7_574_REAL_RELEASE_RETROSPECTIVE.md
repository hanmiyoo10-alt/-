# Local Usage Dashboard — E7 5.74 Real-Release Retrospective

Status: **FEEDBACK / DESIGN ONLY — no hardening implementation started**

Recorded: `2026-08-25`

Evidence basis:
- 5.74 product issue: `#303`
- deterministic release PR: `#306`
- final exact-SHA candidate: `02b440aec5715b6d42f929fdf01a35d08485730a`
- exact-SHA validation transaction: `32774436983`
- authoritative registry: `TEST_REGISTRY_GREEN:81`
- main merge: `0c3cd21d6c4bc07df71f4b0f6c69024835375601`
- production `release-usage-dashboard`: `0a97ea22a9f4f15c13de379099e175d0043d385a`

## Verdict

E7 succeeded at its core purpose.

It did **not** make real releases failure-free. Instead, 5.74 proved the stronger and more useful property:

```text
fail closed
→ repair source only
→ reuse the same stage command
→ reuse the same deterministic candidate branch
→ reuse the same PR
→ validate the new exact SHA
→ merge exact validated head
→ promote exact bytes
```

That is the correct release-system direction. The next work should reduce avoidable coordination/noise without removing validation layers.

## What E7 proved successfully

### 1. Preflight failed before candidate mutation

The first 5.74 stage attempt found two intentional historical version fixtures lacking `UD_HISTORICAL_VERSION_LOCK` and stopped with `RELEASE_PREFLIGHT_REJECTED` before candidate write.

This proved E7-D fail-closed ordering is correct.

### 2. Reentrant repair actually works

After source repair, the same `/usage-dashboard stage <source-branch>` command was reused.

Later, after full validation found a materializer durable-memory synchronization omission, the same source branch was repaired again and the same deterministic candidate branch fast-forwarded from:

```text
691bc38a5348a88331c1f202f729e805bc70adcb
→
02b440aec5715b6d42f929fdf01a35d08485730a
```

No `-v2/-v3` branch, no replacement PR and no force push were required.

### 3. PR bootstrap left the Actions-token failure path

PR `#306` was ensured through the connected GitHub control surface rather than Actions-token PR creation.

The 5.73 HTTP-403 bootstrap failure mode was therefore absent from the normal stage transaction.

### 4. Exact-SHA validation removed close/reopen dependence

After the controller-authored candidate branch advanced, ordinary PR-triggered workflows became `action_required`.

E7-C still bound PR `#306` to the exact new candidate SHA and ran the full authoritative registry successfully without close/reopen.

This is the strongest 5.74 E7 proof.

### 5. Exact-head merge and exact-byte promotion remained intact

The final candidate SHA equaled the current PR head immediately before merge, the merge used expected-head protection, and production promotion rebuilt nothing.

Deployment receipt and direct Git blob checks confirmed exact-byte parity.

## Friction found by the real release

### F1. Historical-fixture debt was discovered too late

The first real 5.74 stage had to stop because pre-existing historical fixtures had not yet been annotated.

The preflight was correct to stop, but the repository should ideally prevent this debt from surviving until the next release starts.

**Feedback:** add a permanent repository contract/lint that rejects new stale current-release literals unless they are explicitly historical. Then release staging is not the first place historical fixture debt is discovered.

### F2. A cheap release-memory contract is missing from stage

The first candidate passed materialization, source parity, idempotency and focused behavior smoke, but full validation later failed because the 5.74 materializer did not synchronize the durable `Last verified real-device baseline` line.

The existing `current-release-contract.cjs` caught this correctly, but only after candidate creation and PR bootstrap.

**Feedback:** run the cheap current-release/release-memory contract during read-only stage validation **before candidate bundle/write**. This would have kept the broken materialization from ever becoming a candidate SHA.

This is the highest-value E7 hardening item.

### F3. Ordinary PR `action_required` remains noisy

E7-C made this state non-authoritative, which is good, but a controller-authored candidate branch repair still leaves noisy `action_required` workflow results on the PR.

That noise can look like a broken release even when exact-SHA authority is GREEN.

**Feedback:** make ordinary PR workflows candidate-aware so deterministic Usage Dashboard stage branches either:
- run only when they provide independent value; or
- terminate in an explicitly benign/neutral way when exact-SHA validation is the authoritative lane.

Do not weaken the full exact-SHA registry.

### F4. E7 documentation closure is now stale/inexact

`USAGE_DASHBOARD_PR_LIFECYCLE_E7_CONFIG_FREE_ORCHESTRATION.md` still says E7-E real-release proof is pending, but 5.74 has now supplied that proof.

The document also describes `automatic repository documentation closure`; in 5.74 the deployment receipt was automatic, while final issue/body closure was assistant-owned through the connected control surface.

**Feedback:** update the runbook to distinguish:
- automatic deployment receipt;
- assistant-owned repository evidence closure;
- user-owned actual-device verification.

E7-E should move from `pending` to `COMPLETE` only using the 5.74 evidence above.

### F5. Connected-control-surface ref mutation needs a tighter operator invariant

During final merge handling an accidental transient branch `tmp-noop-should-not-create` was created by an incorrect connector action. It did not change source, candidate, main or production bytes and was not release authority, but it exposed a useful operator-safety rule.

**Feedback:** after `CANDIDATE_READY`, the connected control surface should be allowed to manage PR metadata/comments/validation activation/exact-head merge, but **must not create or rewrite Git refs**. Candidate ref creation/advancement remains controller-owned.

This belongs in the E7 operator runbook even if no code change is required.

## Proposed E7.1 / E7-F hardening order

### P0 — close the evidence gap

Update the E7 runbook from `E7-E pending` to `E7-E COMPLETE` using 5.74 exact evidence. Correct the documentation-closure wording.

### P1 — pre-candidate release-memory gate

Add `current-release-contract.cjs` or a smaller equivalent release-memory contract to the read-only stage validation lane before candidate payload creation.

Acceptance: the exact 5.74 verified-baseline omission class fails before candidate mutation.

### P2 — permanent historical-literal hygiene

Make unannotated historical current-release literals fail normal repository regression, not only the next release preflight.

Acceptance: new historical fixtures require explicit `UD_HISTORICAL_VERSION_LOCK` when they are introduced.

### P3 — candidate PR noise reduction

Remove misleading ordinary `action_required` noise for deterministic `stage/usage-dashboard-*` repair updates while retaining exact-SHA full validation as authority and preserving defense-in-depth where useful.

### P4 — connected-control-surface mutation boundary

Codify that post-candidate assistant operations cannot create/update release Git refs; only the trusted stage/promoter controllers own those mutations.

## Deliberately deferred

Do **not** use this feedback batch to redesign the product materializer architecture wholesale.

The materializer omission suggests a future generic release-memory synchronization helper could reduce per-version scripting risk, but that is larger than the minimum E7 hardening needed before the next bounded product release.

Do not combine product runtime slimming, parser consolidation, timer/listener pruning or unrelated S1 cleanup into this release-system feedback work.

## Recommended next state

```text
E7 core architecture: PROVEN
E7-E real-release proof: COMPLETE via 5.74
E7.1/E7-F hardening: DESIGN READY, implementation not started
5.74 physical verification: separate and still PENDING until PocketRisu evidence exists
```

The guiding principle remains:

> Simplify by moving cheap failures earlier and removing coordination/noise, not by removing exact-SHA or exact-byte guarantees.

# SimCore Release System v2.2 — Closure Integrity Implementation Evidence

Date: 2026-08-28 KST
Status: **IMPLEMENTED · PERMANENT CI PENDING · NON-RUNTIME**
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_2_CLOSURE_INTEGRITY_DESIGN.md`
Implementation branch: `infra/simcore-r2-2-closure-integrity-implementation`
Design/base commit: `e65497780d825e0c215fc35be8a849f31335e25e`

## Scope

R2.2 implements only the two confirmed post-R2.1 FIX items and leaves observability noise as WATCH.

```text
A. single CURRENT_DEVELOPMENT current-state authority
B. truthful release-blocker incident closure semantics
C. durable-evidence-first observability = WATCH only
```

No SimCore runtime/plugin source is changed by this work item. `release-simcore` is not a target of this implementation.

## R2.2-A — Single Current-State Authority

`docs/CURRENT_DEVELOPMENT.md` previously had correct machine-managed v0.64.8 blocks followed by a stale human `## Production verdict` that still claimed v0.64.7 and the old v0.64.7 live gate.

The implementation retires that duplicate active authority and replaces it with identity-free guidance:

```text
## How to read current operational state

machine-managed blocks above = current production / validation / live-gate authority
human prose below = interpretation, history, constraints, follow-up decisions
```

The active human section keeps generic constraints such as runtime freeze while the active product gate is pending, M2-3 blocking, provider cache UNVERIFIED, and R2.1/R2.2 operating boundaries. It no longer copies a current version, release SHA, release blob, or concrete live-gate literal.

Two historical transition sentences that previously said old evidence did not override the “production verdict” now point to the machine-managed current-state blocks instead. Historical release evidence itself is not rewritten.

Final tree delta for this file immediately after the bounded patch was exactly:

```text
+5 / -5
```

The machine-managed blocks themselves were not rewritten by R2.2-A.

## R2.2-B — Blocker Incident Closure Semantics

Added pure policy owner:

```text
products/simcore/tooling/release-blocker-incident-policy.mjs
```

The policy exposes bounded lifecycle decisions only:

```text
BLOCKER_ACTIVE
DEFECT_FIXED_RELEASE_RECOVERY_PENDING
RECOVERED_PRODUCTION_REOBSERVED
TERMINATED_EXPLICIT
```

Repair PR reference wording is owned as:

```text
Refs
```

not an automatic GitHub close verb while release recovery remains pending.

Normal recovered-publication closure requires all six durable facts:

```text
recoveryAppendOnlyPreserved
exactCandidateApprovalVerified
permanentReleaseSucceeded
productionCommitReobserved
latestInstallEqualReobserved
livePendingStateConverged
```

Explicit `CANCELLED` or `ROLLED_BACK` termination is allowed only when durable terminal evidence is present.

The helper contains no GitHub API mutation, publisher, network fetch, timer, or polling primitive.

Durable operator policy:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_2_BLOCKER_INCIDENT_POLICY.md
```

## Permanent regression

Added required golden suite:

```text
suite = closure-integrity
module = products/simcore/tests/suites/closure-integrity.test.mjs
fixture = products/simcore/tests/fixtures/closure-integrity/case.json
```

It is registered in `products/simcore/tests/registry.mjs`, so `batch-a` includes the R2.2 checks while retaining the existing `release-spec-contract` regression added after the v0.64.8 first-attempt blocker.

The suite verifies:

```text
exactly one machine production snapshot block
exactly one active machine release-state block
active human current-state prose has no Production verdict
active human current-state prose has no copied v0.x.y / 40-hex SHA / 064xx live-gate literal
repair-only incident remains open
partial recovery remains open
complete durable recovery becomes close-eligible
premature closed state throws RELEASE_BLOCKER_PREMATURE_CLOSURE
CANCELLED / ROLLED_BACK require durable terminal evidence
policy module has no publisher/network/polling primitives
R2.1 release-spec contract parity regression remains registered
```

Historical replay basis is the genuine v0.64.8 flow:

```text
new-01 blocked
→ release-system repair
→ new-02 append-only recovery
→ permanent publication
→ production reobservation
→ LIVE_PENDING
```

## Implementation tooling anomalies

To patch the large living `CURRENT_DEVELOPMENT.md` without replacing/reformatting its historical body through the contents API, a temporary branch-only self-removing workflow was attempted.

Several intermediate definitions failed before any job materialized. They never reached product code, production publication, or `release-simcore`.

The final minimal branch-only job succeeded, applied the exact bounded prose patch, then deleted both the temporary workflow and temporary helper from the branch before the implementation tree was reviewed.

Classification:

```text
R2_2_TEMP_BRANCH_PATCH_WORKFLOW_PARSE_FAILURES
= FIX / TOOLING / BRANCH_ONLY / NON_RUNTIME / PRODUCTION_UNCHANGED / CLOSED
```

Observed final successful temporary run:

```text
33089764734 = SUCCESS
```

These temporary files must be absent from the implementation PR diff.

## Runtime audit lens

Using the standing SimCore pre-release/runtime audit lens, this implementation adds no runtime-executed plugin code and introduces no new:

```text
runtime timer
observer
network request
persistent storage
unbounded Map/Set/list
raw chat retention
publisher
release-simcore writer
background polling
```

The new incident policy is a small pure synchronous decision helper used by repository tests/tooling only.

## Safety and simplicity preservation

R2.2 does not change the R2.1 clean release path:

```text
explicit release work item
→ PR1 product + intent
→ generic candidate + receipt
→ PR2 exact delegated approval
→ permanent publication + LIVE_PENDING
→ user real long-chat
→ PR3 LIVE_PASS closure
```

Preserved targets:

```text
steady-state PRs to LIVE_PENDING = 2
steady-state PRs through LIVE_PASS = 3
user manual pre-live GitHub actions = 0
new clean-path gate = 0
new publisher = 0
single publisher preserved
exact P/C/blob preserved
Candidate Required preserved
fast-forward-only production preserved
latest.js == install.js preserved
append-only recovery preserved
human LIVE_PASS preserved
```

## Current product boundary

R2.2 is independent from the still-pending product gate:

```text
production = v0.64.8
validation = PENDING_REAL_LONG_CHAT
live gate = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

R2.2 implementation does not close or substitute for that real-long-chat gate.

## Qualification state

At document creation:

```text
implementation = COMPLETE ON WORK BRANCH
permanent SimCore Verify = PENDING
permanent SimCore Required = PENDING
main merge = PENDING
#640 closure = PENDING POST-MERGE REOBSERVATION
#641 closure = PENDING POST-MERGE REOBSERVATION
release-simcore mutation = NONE
```

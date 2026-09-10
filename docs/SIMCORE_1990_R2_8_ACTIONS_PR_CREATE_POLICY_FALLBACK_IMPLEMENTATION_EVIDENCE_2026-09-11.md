# SimCore #1990 — R2.8 Actions PR-Create Policy Fallback Implementation Evidence

Date: 2026-09-11 KST
Status: **FIX IMPLEMENTED · POSTMERGE QUALIFIED · FRESH R2.8 RETRY AUTHORIZED**
Classification: **NON-RUNTIME CONTROL-PLANE RECOVERY EVIDENCE**

## Trigger

Fresh v0.70.11 R2.8 terminal convergence run `34419927059` reached a valid checked transport payload but GitHub rejected initial pull-request creation by the workflow token:

```text
GitHub Actions is not permitted to create or approve pull requests. (HTTP 403)
```

Issue #1990 records the failure. Production/runtime/HUMAN_EVIDENCE semantics had already passed before the failure.

## Frozen design

Design PR #1992 merged as:

```text
7a7e3f7e0d36da15146686d58d85eefda7b68013
```

The design rejects stronger workflow credentials and repository-policy weakening. It preserves the #1981 exact checked-PR contract and permits only a terminal-specific bounded authorized-assistant creation fallback.

## Implementation

Implementation PR #1993 changed exactly:

```text
products/simcore/tooling/release-state-checked-pr.mjs
products/simcore/tests/release-state-checked-pr.integration.test.mjs
```

Merged main:

```text
4a7e83c7f12dd81605a4b64c672593a682957e2a
```

Behavior:

```text
validated consume-terminal
-> exact existing PR lookup
-> one ordinary Actions PR-create attempt
-> exact policy denial only: phrase + HTTP 403
-> bounded R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED handoff
-> bounded read-only exact PR discovery
-> existing PR_RECOVERY / Required path
-> frozen-base / production reobservation
-> exact-head merge
-> durable byte proof
-> ALREADY_DURABLE terminal proof
-> staging cleanup
```

Post-publish `consume` does not gain this fallback.

## Regression coverage

Permanent integration coverage now includes:

- ordinary create success;
- exact existing PR reuse;
- terminal policy-denial assistant handoff success;
- bounded no-assistant timeout;
- mismatched external PR fail-closed;
- duplicate external PR fail-closed;
- non-policy create error fail-closed;
- post-publish policy denial does not use terminal fallback;
- Required failure blocks merge;
- main movement blocks merge;
- production movement blocks terminal merge;
- terminal cleanup still requires `ALREADY_DURABLE`.

No new workflow, profile, token class, persistent queue, daemon, runtime path, or release byte was added.

## CI qualification

Implementation PR #1993:

```text
SimCore CI run = 34538421179
Verify   = SUCCESS
Required = SUCCESS
```

Merged-main qualification:

```text
SimCore CI run = 34538564292
Required = SUCCESS
```

## Historical assistant capability probe

Before design main advancement, exact checked transport PR #1991 was created by the authorized assistant connector from the preserved failed-run staging ref. Its ordinary PR SimCore CI passed, proving the external actor can create the exact PR that Actions policy forbids.

After design PR #1992 advanced main, #1991 became stale by frozen-base definition and was closed unmerged. It remains historical capability evidence only and is forbidden from reuse or force landing.

## Frozen production and human decision

Fresh production reobservation after implementation:

```text
production version = 0.70.11
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

The existing terminal decision coordinates remain unchanged:

```text
releaseId = simcore-v0.70.11-new-03
productionCommit = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
productionBlob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
liveScenarioId = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
decision = LIVE_PASS
checkpoint = M2-6
nextPriority = POST_07011_NEXT_STEP_REVIEW
authorityConfirmation = HUMAN_EVIDENCE
```

No HUMAN_EVIDENCE is created, recaptured, or semantically changed by this recovery document.

## Fresh retry authorization

Following the established #1985 recovery pattern, this document may be appended to the existing `humanEvidence[]` envelope solely to produce a fresh main push event after the repaired consumer is durably on main.

The retry must derive a new checked terminal payload from then-current main. If the repository again rejects workflow-token PR creation, only the exact new handoff coordinates from that run may be used by the authorized assistant. Any prior payload/ref/PR is stale evidence only.

Success requires:

```text
fresh R2.8 resolver = ELIGIBLE_TO_PROJECT
fresh exact production reobservation = PASS
fresh terminal payload from current main
repo-main-write checked handoff = PASS
exact policy denial, if present, handled only by bounded assistant-create fallback
PR_RECOVERY / Required = PASS
frozen-base exact-head merge = PASS
durable resolver readback = ALREADY_DURABLE
manifest validation = LIVE_PASS
manifest priority = POST_07011_NEXT_STEP_REVIEW
production/runtime/release-simcore bytes = UNCHANGED
```

Any new contradiction remains fail-closed and must be recorded before further advancement.

## Verdict

```text
#1990 DESIGN = MERGED
#1990 IMPLEMENTATION = POSTMERGE QUALIFIED
FRESH R2.8 RETRY = AUTHORIZED
RUNTIME MUTATION = NONE
PRODUCTION MUTATION = NONE
RELEASE_SIMCORE MUTATION = NONE
HUMAN DECISION MUTATION = NONE
```

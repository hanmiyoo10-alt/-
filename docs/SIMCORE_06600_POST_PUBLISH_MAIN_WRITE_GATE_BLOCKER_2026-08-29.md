# SimCore v0.66.0 Post-Publish Main Write Gate Blocker

Date: 2026-08-29 KST

Status:

`BLOCKER OPEN · PRODUCTION PUBLISHED · MAIN LIVE_PENDING NOT DURABLE`

Classification:

`FIX · BLOCKER · POST_PUBLISH_MAIN_STATE_SYNC · NON_RUNTIME · PRODUCTION_EXPOSURE_EXISTS`

## Trigger

Exact approval transaction:

`simcore-v0.66.0-new-05`

Exact Approval Activation:

`33206513419`

Permanent Release:

`33206537749`

The permanent release successfully passed:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify     = SUCCESS
Candidate Required / Required   = SUCCESS
Publish Exact Candidate         = SUCCESS
```

The exact candidate is already published to production:

```text
release-simcore commit = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
version                = 0.66.0
latest blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
install blob           = f0da13d4c47fd98e9065d7dbf253a3296151ee16
previous production P  = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

Therefore this incident occurs strictly after successful runtime publication.

## Exact failing stage

`Declare Published State` failed in:

`Commit and gate bounded main state`

The post-publish state tool itself successfully built a bounded LIVE_PENDING payload:

```text
releaseAuthority   = RS2_4_PERMANENT
productionMutation = ALREADY_PUBLISHED_UPSTREAM
mainMutation       = LOCAL_PAYLOAD_PENDING_GATEWAY
lifecycleState     = LIVE_PENDING
rLifecycleState    = REAL_RELEASE_LIVE_PENDING
currentPriority    = 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT
disposition        = LIVE_PENDING_PAYLOAD_READY
```

The payload boundary check also passed:

`RS2_4_POST_PUBLISH_PAYLOAD_BOUNDARY_PASS`

A local payload commit was created:

`92f6d331` — `state(simcore): declare simcore-v0.66.0-new-05 live pending`

However the repository main-write gateway rejected promotion after its required MAIN_HEALTH workflow failed:

```text
MAIN_WRITE_GATE_WORKFLOW_FAILED
run = 33206619653
conclusion = failure
```

As a result:

```text
release-simcore publication = DURABLE / v0.66.0
main LIVE_PENDING commit     = NOT DURABLE
Permanent Release Required   = FAILURE
```

## Safety interpretation

This is not a runtime publication rollback condition by itself. The exact runtime candidate already passed CANDIDATE_REQUIRED and was published by the single permanent publisher.

Do not mutate or republish runtime bytes while diagnosing this incident.

The inconsistent authority state is administrative:

```text
release-simcore says v0.66.0 is production
main still reflects pre-publication administrative truth
```

Because `main` is the authority for design/evidence/roadmap/administrative records, this divergence is a release blocker before human real-long-chat acceptance may begin.

## Advancement rule

STOP before live validation.

Required next steps:

1. inspect MAIN_HEALTH run `33206619653` and identify its exact gate/reason code;
2. determine whether the failure is caused by the generated LIVE_PENDING payload, current main drift, or unrelated repository health noise;
3. update this document with the exact diagnosis and final classification;
4. repair only the administrative/state-sync path unless evidence proves otherwise;
5. re-establish durable main LIVE_PENDING truth for exact production `4b6ae1a4...` / blob `f0da13d4...`;
6. verify the release record/state receipt/current development/guidelines/manifest all agree;
7. only then begin `06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT`.

Do not fabricate human live evidence and do not treat the successful runtime publication as final release closure.

# Repository-visible Work Record v1 issue block

Use this block inside an **open GitHub issue** when that issue should participate in Repository Work Harness Phase A active-work shadow discovery.

The markers and the `json` fence are exact. The payload must satisfy `work-record.schema.json` / `contract.cjs`.

<!-- repository-work-record:v1 -->
```json
{
  "schemaVersion": 1,
  "workId": "<STABLE_WORK_ID>",
  "objectiveId": "<OBJECTIVE_ID>",
  "scopeId": "<REGISTERED_OR_REPOSITORY_SCOPE>",
  "sourceIdeaOrDecision": "<SOURCE_AUTHORITY>",
  "taskState": "<CURRENT_TASK_STATE>",
  "gateState": "STARTABLE",
  "workType": "<WORK_TYPE>",
  "requiredCapability": "<CAPABILITY>",
  "readAuthorities": [],
  "refreshableReadAuthorities": [],
  "writeAuthorities": [],
  "protectedSurfaces": [],
  "closeSyncSurfaces": [],
  "dependsOn": [],
  "expectedBases": [],
  "sourceAuthorityRefs": [
    "<AT_LEAST_ONE_REPOSITORY_AUTHORITY_REF>"
  ],
  "stopCondition": "<EXACT_STOP_CONDITION>"
}
```
<!-- /repository-work-record:v1 -->

Phase A active semantics are intentionally simple:

- open issue + valid marker block = active candidate;
- closed issue = not active;
- unmarked issue = ignored;
- malformed marked issue = fail-closed discovery error;
- duplicate active `workId` = fail-closed discovery error.

The marker publishes an already-reviewed work profile. It is not permission to widen scope, start blocked work, release a product, merge a PR, or mutate `main`.

# SimCore Release System v2.1 — Delegated Operator Policy

Date: 2026-08-25
Status: **DESIGN / IMPLEMENTATION AUTHORIZED BY USER · NON-RUNTIME**

## Operator experience decision

The user does not want a separate manual GitHub approval/button step before a SimCore release reaches real-chat validation.

Steady-state user experience:

```text
user explicitly asks to perform a SimCore update/release work item
        ↓
assistant acts as delegated operator through all pre-live work
        ↓
product PR / candidate / machine receipt / exact approval record / permanent release
        ↓
release-simcore publication
        ↓
LIVE_PENDING durable documentation + long-term-memory closure
        ↓
HANDOFF TO USER
        ↓
user presses `+` / applies the plugin and performs the real long-chat validation
        ↓
assistant records LIVE_PASS closure from supplied evidence
```

## Important boundary

This is **not** standing authority for autonomous or background releases.

A release work item still requires an explicit user instruction in the active work session, such as an instruction to implement/update/deploy that version. Once that work item is explicitly authorized, no additional human GitHub click, workflow button, approval merge, SHA re-entry, or pre-live confirmation is required from the user.

The assistant may create, verify, and merge the exact approval PR on the user's behalf as the delegated operator.

## Exact approval remains an audit/safety object

The exact approval record is retained. What changes is who performs the GitHub operation.

The approval PR remains bounded to machine-known release identity and must not allow a delegated operator to override candidate C, production P, or release blob values.

Target PR2 payload:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

The approval JSON contains only:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-vX.Y.Z-<mode>-NN",
  "candidateReceiptPath": "products/simcore/releases/candidate-receipts/<intent>.json",
  "authorityConfirmation": "RS2_4_RELEASE"
}
```

The authorized release spec must be machine-derived from the bound `SHADOW_ONLY` spec and must be semantically identical to it. C/P/blob values are therefore not manually re-entered.

## Operational release trigger

The merge of the exact two-file approval PR is the repository transaction boundary. Under delegated-operator mode the assistant performs that merge only after permanent SimCore `Verify` and `Required` pass.

After merge, the PR activation adapter must:

1. verify the merge changed exactly one approval JSON and its exact matching release spec;
2. require each path to have its first/only authorization touch at the approval merge;
3. load the bound candidate receipt and `SHADOW_ONLY` machine spec;
4. reobserve candidate C and production P;
5. run `release-approval-resolve.mjs` and require PASS;
6. require the committed authorized spec to equal the resolver-derived spec semantically;
7. dispatch the existing permanent release caller;
8. observe the permanent release run to successful completion.

The adapter itself remains non-publisher:

```text
release-publish.mjs = FORBIDDEN
repo-main-write.py = FORBIDDEN
direct release-simcore push = FORBIDDEN
contents: write = FORBIDDEN
```

The existing permanent caller remains the single publication authority.

## Preserved safety

- exact candidate/production parent binding remains required;
- Candidate Required remains mandatory;
- `RS2_4_RELEASE` authority marker remains mandatory;
- production remains fast-forward only;
- `latest.js == install.js` remains mandatory;
- rollback metadata remains bounded and mandatory for rollback mode;
- post-publish recovery cannot republish;
- real long-chat LIVE_PASS remains human-evidence gated;
- documentation/long-term-memory closure is required before a work item is called COMPLETE.

## Human boundary after activation

The intended steady-state human boundary is now:

```text
pre-live manual GitHub actions by user = 0
user's next physical action = apply plugin with `+` and run real long-chat validation
```

The user may still interrupt or revoke a work item before publication. Failures classified BLOCKER/FIX still stop publication until repaired and reverified.

## Tooling anomalies during policy recording

Two non-runtime tooling mistakes occurred before this branch was established:

```text
R2_1_OPERATOR_POLICY_PREWRITE_BRANCH_MISSING
= FIX / TOOLING / PREWRITE / NON_RUNTIME / REPO_MUTATION_NONE

R2_1_OPERATOR_POLICY_ACCIDENTAL_MAIN_NOOP_MARKER
= FIX / TOOLING / MAIN_ADMIN_ONLY / NO_RUNTIME_IMPACT
```

The accidental `noop.tmp` marker was immediately removed from main. It never touched `release-simcore`, runtime source, release state, or product authority.

## Classification

```text
R2_1_E_OPERATIONAL_APPROVAL_POLICY
= FIXED_POLICY / DELEGATED_OPERATOR_TO_LIVE_PENDING / NON_RUNTIME
```

Operational proof still requires the next genuine runtime release to exercise this path end to end. Until then the policy may be implemented and CI-qualified but must be described as awaiting genuine-release operational proof.

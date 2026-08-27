# SimCore Release System v2.1 — Delegated Operator Policy

Date: 2026-08-25
Status: **ACTIVE POLICY · IMPLEMENTED · PERMANENT-CI QUALIFIED · GENUINE RELEASE PROVEN TO LIVE_PENDING · NON-RUNTIME**

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

The user may interrupt or revoke a not-yet-published work item. Any `BLOCKER` or unresolved `FIX` still stops publication until repaired and reverified.

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

The authorized release spec must be machine-derived from the bound `SHADOW_ONLY` spec and semantically identical to it. C/P/blob values are therefore not manually re-entered.

`products/simcore/tooling/release-approval-package.mjs` is the bounded package materializer for this transaction. It has no production publication primitive.

## Operational release trigger

The merge of the exact two-file approval PR is the repository transaction boundary. Under delegated-operator mode the assistant performs that merge only after permanent SimCore `Verify` and `Required` pass.

After merge, `.github/workflows/simcore-release-pr-activation.yml` must:

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

The steady-state human boundary is:

```text
pre-live manual GitHub actions by user = 0
user's next physical action = apply plugin with `+` and run real long-chat validation
```

The assistant owns the pre-live repository/release transaction only after the user explicitly authorizes that release work item.

## Qualification and activation

Implementation PR:

```text
#292
merge = ff3d2233b8acac795aa1d62d219c4ef6538427f2
```

Permanent CI evidence:

```text
first run  32769662790
Verify     97566934048 PASS
Required   97567062169 PASS

final run  32769840775
Verify     97567528932 PASS
Required   97567646673 PASS
```

The delegated approval adapter is therefore active on durable `main`.

## Genuine runtime release operational proof — v0.64.8

The required end-to-end proof is now complete through `LIVE_PENDING`.

The first v0.64.8 exact approval transaction (`simcore-v0.64.8-new-01`) exposed a release-spec contract-parity defect and correctly failed closed as `APPROVAL_SPEC_INVALID` before production mutation. That incident is preserved in issue `#629` and was repaired in the release-system track by PR `#631` at `e58cfdb672b92a3a8915d79ab7c5b661ee36f0e4` with permanent fail-fast regression coverage.

Recovery remained append-only and used:

```text
intent = simcore-v0.64.8-intent-02
releaseId = simcore-v0.64.8-new-02
candidate = f5e29464452728f859a1a6a8191a846468353531
blob = bed3d5faff9641071cdd9003b67c45d42b3e32ee
approval PR = #636
approval merge = 20c569894a8596ce5d5b6734ec2c69902b1bb084
Permanent Release run = 33086543601 SUCCESS
LIVE_PENDING state commit = dbaa095df47b0293a39283c9664fefa1feafd756
```

The successful Permanent Release run completed all bounded jobs including Candidate Required, exact publication, durable state declaration, and final permanent release gate.

Production reobservation:

```text
release-simcore = f5e29464452728f859a1a6a8191a846468353531
parent = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
latest.js == install.js
blob = bed3d5faff9641071cdd9003b67c45d42b3e32ee
manifest version = 0.64.8
validation = PENDING_REAL_LONG_CHAT
priority = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Observed user manual pre-live GitHub actions: **0**.

Therefore the delegated operator path is operationally proven for:

```text
PR1 product + intent
→ generic candidate + receipt
→ delegated exact approval
→ permanent publisher
→ release-simcore publication
→ durable LIVE_PENDING convergence
```

The first proof incurred extra incident/repair PRs because it found a real release-system defect. This is recorded as first-proof learning tax, not as the expected steady-state path. The clean steady-state target remains two operator PRs to LIVE_PENDING.

Human v0.64.8 real-long-chat LIVE_PASS remains pending and is intentionally not delegated away.

Full feedback: `docs/SIMCORE_RELEASE_SYSTEM_V2_1_FIRST_GENUINE_RELEASE_RETROSPECTIVE_2026-08-28.md`.

## Tooling anomalies during policy recording

Two non-runtime tooling mistakes occurred before the work branch was established:

```text
R2_1_OPERATOR_POLICY_PREWRITE_BRANCH_MISSING
= FIX / TOOLING / PREWRITE / NON_RUNTIME / REPO_MUTATION_NONE

R2_1_OPERATOR_POLICY_ACCIDENTAL_MAIN_NOOP_MARKER
= FIX / TOOLING / MAIN_ADMIN_ONLY / NO_RUNTIME_IMPACT
```

The accidental `noop.tmp` marker was immediately removed from main. It never touched `release-simcore`, runtime source, release state, or product authority.

## Residual cleanup

```text
LEGACY_ACTIVATION_SELF_TEST_SENTINELS
= DEFER / TEST_HARNESS_CLEANUP / NON_OPERATIONAL / NON_BLOCKING
```

Two historical activation strings remain only as comments for compatibility with an older broad self-test. The dedicated release-approval suite verifies that the active trigger is `approvals/**`, not `activations/**`. Removing those comments is cleanup, not a release blocker.

New first-proof follow-ups are intentionally non-runtime:

```text
R2_1_BLOCKER_INCIDENT_PREMATURE_AUTOCLOSE
= FIX / INCIDENT_LIFECYCLE / NON_RUNTIME / NON_BLOCKING

CURRENT_DEVELOPMENT_DUPLICATE_CURRENT_STATE_AUTHORITY
= FIX / DOC_ARCHITECTURE / NON_RUNTIME / NON_BLOCKING
```

The second item is tracked by issue `#640`. Neither blocks v0.64.8 real-long-chat validation.

## Classification

```text
R2_1_E_OPERATIONAL_APPROVAL_POLICY
= FIXED_POLICY / DELEGATED_OPERATOR_TO_LIVE_PENDING / ACTIVE / OPERATIONALLY_PROVEN / NON_RUNTIME
```

Operational proof status:

```text
implementation = ACTIVE
permanent CI = PASS
genuine runtime release proof to LIVE_PENDING = PASS
user manual pre-live GitHub actions = 0
human LIVE_PASS requirement = PRESERVED
current v0.64.8 LIVE_PASS = PENDING
```

# SimCore v0.66.0 Permanent Release Legacy Compatibility Blocker

Date: 2026-08-29 KST

Status:

`BLOCKER DIAGNOSED · RUNTIME FIX REQUIRED · PRODUCTION UNCHANGED`

Final classification:

`FIX · BLOCKER · RUNTIME · DANGLING_SESSION_RECOVERY_EXPORT · CANDIDATE_REQUIRED · PRODUCTION_UNCHANGED`

## Trigger

The exact approval transaction for `simcore-v0.66.0-new-02` passed premerge permanent SimCore CI and merged successfully in PR `#768`.

Exact Approval Activation run:

`33203679214`

The activation successfully resolved the exact delegated approval transaction and dispatched Permanent Release.

Permanent Release run:

`33203691741`

`Resolve Permanent Authorization` passed, but `Candidate Required / Verify` failed before any publication.

## Exact failure

The CANDIDATE_REQUIRED report recorded:

```text
profile = CANDIDATE_REQUIRED
conclusion = FAIL
reasonCodes = [LEGACY_COMPAT_SEMANTIC_FAIL]

GATE_STATIC        = PASS
GATE_ARCH          = PASS
GATE_REGRESSION    = PASS
GATE_STATE         = PASS
GATE_COORDINATION  = PASS
GATE_LEGACY_COMPAT = FAIL
```

Exact immutable identities observed by the failing permanent gate:

```text
candidate C = ea88eecb4428a42682894c96980bef420b0a0d27
candidate fetch ref = candidate/simcore/simcore-v0.66.0-intent-02
candidate latest/install SHA-256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
candidate bytes = 563052
expected production P = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
candidate required authority = RS2_4_RELEASE
```

The frozen candidate identity itself did not drift. Publication stopped before `release-simcore` mutation.

## Diagnostic owner

`products/simcore/tooling/check.mjs` runs:

```text
products/simcore/tooling/ci/legacy-compat.mjs
  → scripts/simcore-06406-closure-completion-gate-test.mjs
```

The legacy adapter physically loads the `session` module factory. This exposed a runtime module-initialization defect that narrower PR/regression lanes had not executed through this compatibility adapter.

## Root cause

M2-4 correctly removed the Session runtime dependency:

```js
const recovery = require('./recovery');
```

and replaced runtime ownership with direct physical owners:

```js
const outputCompat = require('./output-compat');
const bootstrapMigration = require('./bootstrap-migration');
const outputFinalize = require('./output-finalize');
const editReconcile = require('./edit-reconcile');
```

However, Session's export object still contains the stale identifier:

```js
module.exports = {
  CoreRulesetSession,
  inspectPreviousBEndOutput,
  latestUserIndex: kernel.latestUserIndex,
  latestUserText: kernel.latestUserText,
  renderRuntimePrompt,
  inspectPromptMessages: kernel.inspectPromptMessages,
  fingerprintText: kernel.fingerprintText,
  validateStructure: structure.validateStructure,
  communityBlocks: community.communityBlocks,
  prepareTurn: lifecycle.prepareTurn,
  recovery,
};
```

There is no longer any `recovery` binding in the Session module. Executing the Session factory therefore reaches `module.exports` and throws a `ReferenceError` for the dangling identifier.

This is not a legacy fixture false positive. It is a real candidate runtime module-initialization defect.

## Intended repair boundary

The M2-4 contract requires:

- Session has no runtime `require('./recovery')`;
- Session has no `recovery.` calls;
- the standalone Recovery facade remains physically defined and keeps its compatibility API;
- runtime callers migrate to Output Compat / Bootstrap Migration / Output Finalize physical owners.

Therefore the correct repair is **not** to re-add Session's Recovery dependency. The repair is to remove the stale `recovery` property from Session's `module.exports` while leaving the standalone Recovery module unchanged.

The frozen builder must be corrected so future materialization produces the repaired bytes deterministically. Direct patching of candidate/release files is forbidden.

## Why earlier gates did not expose this exact failure

`check.mjs` plans `GATE_LEGACY_COMPAT` for full-baseline `MAIN_HEALTH`, `CANDIDATE_SHADOW`, and `CANDIDATE_REQUIRED` profiles. The v0.66 PR1 dry and ordinary PR_MAIN lanes validated static/architecture/regression surfaces but did not execute this exact full-baseline legacy adapter against the immutable candidate.

This reveals a separate follow-up opportunity after the current runtime release: candidate preflight should cover module-factory initialization parity strongly enough that a dangling exported identifier cannot survive until Permanent Required.

That follow-up is release/validation-system work and must remain separate from this runtime FIX.

## Safety state

```text
release-simcore mutation = NONE
production version = 0.65.0
production commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
permanent publication = NOT REACHED
failed candidate C = ea88eecb4428a42682894c96980bef420b0a0d27
failed release = simcore-v0.66.0-new-02
```

The Permanent Release fail-closed shell behaved correctly.

## Recovery rule

Because this is a runtime byte repair after exact approval was already merged and Permanent Release failed, `simcore-v0.66.0-new-02` and `intent-02` remain immutable failed history.

Required recovery sequence:

1. merge this blocker evidence to `main`;
2. repair the frozen v0.66 builder on a separate runtime FIX branch;
3. prove exact-production materialization, latest/install equality, Session factory load, static/architecture/regression/full-baseline compatibility;
4. merge the runtime FIX only after permanent PR CI passes;
5. start a fresh append-only candidate transaction, expected next IDs `intent-03 / new-03` unless repository policy resolves a different next unused ID;
6. materialize a new immutable candidate `C`;
7. create a fresh exact approval transaction for that new candidate;
8. allow Permanent Release to publish only after all Candidate Required gates pass;
9. verify `release-simcore` exact identity before real long-chat validation.

No rerun of run `33203691741` can repair this immutable failed candidate.

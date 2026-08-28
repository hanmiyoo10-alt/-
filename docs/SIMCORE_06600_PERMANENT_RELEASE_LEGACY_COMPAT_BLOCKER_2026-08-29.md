# SimCore v0.66.0 Permanent Release Legacy Compatibility Blocker

Date: 2026-08-29 KST

Status:

`BLOCKER OPEN · DIAGNOSIS IN PROGRESS · PRODUCTION UNCHANGED`

Initial classification:

`FIX · BLOCKER · LEGACY_COMPAT_SEMANTIC · CANDIDATE_REQUIRED · PRODUCTION_UNCHANGED`

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

The frozen v0.66 runtime candidate identity therefore remained exact. The blocker is specifically inside the full-baseline legacy compatibility semantic gate.

## Why earlier gates did not expose this exact failure

`products/simcore/tooling/check.mjs` plans `GATE_LEGACY_COMPAT` for `MAIN_HEALTH`, `CANDIDATE_SHADOW`, and `CANDIDATE_REQUIRED` full-baseline profiles. Ordinary PR_MAIN and PR1 dry qualification do not necessarily execute this same full-baseline legacy-compat lane.

The failing command owner is:

`products/simcore/tooling/ci/legacy-compat.mjs`

Top-level `check.mjs` intentionally compresses a status-1 legacy runner result to:

`LEGACY_COMPAT_SEMANTIC_FAIL`

The current bounded top-level report contains no nested legacy suite name, so diagnosis must continue at the legacy-compat owner before any repair is chosen.

## Safety state

```text
release-simcore mutation = NONE
production version = 0.65.0
production commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
permanent publication = NOT REACHED
candidate mutation = NONE
```

The Permanent Release fail-closed shell behaved correctly: the failing CANDIDATE_REQUIRED result stopped publication.

## Advancement rule

Do not rerun, rewrite, or publish while this blocker is open.

Required next steps:

1. identify the exact failing legacy-compat subtest/suite from `legacy-compat.mjs`;
2. determine whether the defect belongs to runtime behavior, a versioned validation fixture, or a legacy compatibility contract;
3. update this evidence with the exact diagnosis and final classification before implementation;
4. isolate any repair from the already-committed exact approval transaction;
5. determine append-only recovery requirements from the current release policy before starting a new release transaction.

No live validation may begin until a permanent publication succeeds and `release-simcore` is verified.

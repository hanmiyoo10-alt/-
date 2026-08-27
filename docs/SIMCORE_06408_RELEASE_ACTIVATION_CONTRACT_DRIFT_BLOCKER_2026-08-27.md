# SimCore v0.64.8 Release Activation Contract Drift Blocker

Date: 2026-08-27
Status: **BLOCKER · RELEASE_SYSTEM_CONTRACT_DRIFT · PRODUCTION_UNCHANGED**
Scope: SimCore Release System v2.1 exact-approval path; no runtime/plugin-byte change
Tracking: issue #629

## 1. Incident summary

SimCore v0.64.8 — Output-Complete Telemetry Checkpoint Repair completed product implementation, permanent candidate materialization, candidate verification, machine receipt/spec-shadow generation, and exact approval PR validation. The exact approval PR merged, but the permanent Exact Approval Activation failed before publication.

Observed release identities:

- failed releaseId: `simcore-v0.64.8-new-01`
- PR2 merge: `8f1bf73354e1675c5c1a8f4dfd35a18137b60ebb`
- Exact Approval Activation run: `33084339175`
- failing job: `98559753013`
- failure marker: `APPROVAL_SPEC_INVALID`
- candidate: `7a9a2a90f36fb9a7f64d37f5d91be787340e2ee6`
- candidate blob: `bed3d5faff9641071cdd9003b67c45d42b3e32ee`
- expected production parent: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
- observed production after failure: `release-simcore@a7ce8ce33a97797630f885c6753415e4b2ccc7fc`

Publication dispatch was skipped. Production remained v0.64.7.

## 2. Root cause

The authoritative `products/simcore/releases/release-schema-v1.json` permits these `changeClass` values:

- `RUNTIME_FEATURE`
- `RUNTIME_CORRECTION`
- `ROLLBACK`
- `NOOP`

It also requires every `evidenceRefs` entry to start with `docs/` or `products/simcore/`.

The v0.64.8 candidate request used:

- `changeClass: RUNTIME_CORRECTNESS_REPAIR`
- `evidenceRefs` containing `issue:#623`

Both are outside the authoritative release-spec contract.

The generic candidate controller did not reject them because `candidate-materialize.mjs::validateRequest()` only required a non-empty `changeClass` and an array-shaped `evidenceRefs`. `candidate-receipt.mjs::deriveSpecShadow()` then copied those fields directly into the machine-derived spec shadow without enforcing release-schema parity.

The first strict consumer was `release-approval-resolve.mjs`, which rejected `RUNTIME_CORRECTNESS_REPAIR` with `APPROVAL_SPEC_INVALID`. The invalid evidence reference would also violate the authoritative schema downstream even if the first error were bypassed.

## 3. Classification

### BLOCKER — `RELEASE_SYSTEM_CONTRACT_DRIFT`

Reason:
- invalid release metadata crossed PR1 candidate validation,
- crossed candidate receipt/spec-shadow materialization,
- crossed PR2 ordinary SimCore CI,
- and failed only after exact approval merge.

This blocks v0.64.8 publication but does not invalidate the already verified runtime candidate bytes.

### WATCH — `OBSERVABILITY_ID_MISREAD`

During candidate observation, one unrelated/nonexistent run id was briefly queried and returned 404. Re-observation by immutable PR1 merge SHA found the actual Generic Candidate Materialize run `33083378312` as SUCCESS. This did not affect candidate identity, publication authority, or production state.

Disposition: `WATCH / NON_BLOCKING`.

## 4. Frozen boundaries

This repair must not modify:

- `plugins/simcore/latest.js`
- `plugins/simcore/install.js`
- candidate runtime semantics
- v0.64.8 builder behavior
- provider-cache authority
- M2-3 ownership
- real-long-chat human gate

No manual push to `release-simcore` is permitted.

The failed `simcore-v0.64.8-new-01` approval, spec, candidate receipt, spec shadow, activation run, and candidate ref remain immutable historical evidence and must not be rewritten to hide the failure.

## 5. Release-system repair design

Implement as a separate non-runtime work item.

### 5.1 Candidate request fail-fast parity

`candidate-materialize.mjs::validateRequest()` must reject request metadata that cannot become a valid release spec. At minimum it must enforce the authoritative release contract for:

- release mode
- change class
- evidence reference namespace and bounds
- live-gate shape/authority

Invalid metadata must fail before any candidate branch is created.

### 5.2 Spec-shadow defense in depth

`candidate-receipt.mjs::deriveSpecShadow()` must independently validate the derived spec contract before writing a spec shadow. This prevents a future alternate candidate transport or validation regression from materializing a shadow that the approval resolver cannot consume.

### 5.3 Permanent regression coverage

Add executable negatives proving:

- unsupported `changeClass` is rejected during candidate request validation,
- invalid `evidenceRefs` namespace is rejected during candidate request validation,
- spec-shadow derivation independently rejects both classes of invalid metadata,
- valid `RUNTIME_CORRECTION` remains accepted,
- historical v0.64.7 spec-shadow equivalence remains intact,
- no release publication primitive is added to candidate/receipt tooling.

The regression must encode the same release-spec vocabulary rather than invent a second broader vocabulary.

## 6. Recovery transaction after infra repair

Do not edit the already-merged `new-01` approval/spec because the exact-approval adapter intentionally treats approval/spec paths as first-touch immutable transaction documents.

After the release-system repair is merged and CI-proven:

1. create a new immutable v0.64.8 candidate request / release transaction,
2. use the authoritative `changeClass: RUNTIME_CORRECTION`,
3. use only valid durable repo paths in `evidenceRefs`,
4. reuse the same approved v0.64.8 product builder and product scope,
5. materialize a new direct-child candidate from unchanged production parent v0.64.7,
6. verify `latest.js == install.js` and the runtime blob against the intended v0.64.8 bytes,
7. create a new exact approval transaction,
8. let the permanent publisher alone move `release-simcore`,
9. require automatic LIVE_PENDING convergence,
10. then perform human real-long-chat validation.

The failed `new-01` transaction remains evidence; recovery is append-only.

## 7. Acceptance

Release-system blocker can close only when:

- design/evidence is durable on `main`,
- candidate request invalid metadata fails before candidate mutation,
- spec-shadow invalid metadata fails before durable shadow materialization,
- permanent SimCore CI is green,
- `release-simcore` remains unchanged throughout infra repair,
- a fresh v0.64.8 recovery intent passes generic candidate materialization,
- exact approval activation dispatches the permanent publisher successfully,
- production becomes the exact approved v0.64.8 candidate,
- production `latest.js == install.js`,
- durable state converges to `PENDING_REAL_LONG_CHAT`,
- and no LIVE_PASS is claimed without human evidence.

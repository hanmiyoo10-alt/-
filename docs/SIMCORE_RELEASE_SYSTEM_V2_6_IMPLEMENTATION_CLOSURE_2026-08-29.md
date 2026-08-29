# SimCore Release System R2.6 Implementation Closure

Date: 2026-08-29

Status: **IMPLEMENTATION VERIFIED · PERMANENT CI QUALIFIED · ACTIVATION NOT AUTHORIZED**

Classification: **RELEASE SYSTEM · STABILIZE · NON_RUNTIME · PRODUCTION UNCHANGED**

## Authority and scope

This closes the implementation phase of R2.6 `Post-Publish Boundary Convergence` under the frozen design and the separate implementation authorization.

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_DESIGN.md`

Implementation authorization:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Implementation worksheet:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_WORKSHEET_2026-08-29.md`

This transaction changes release-system control-plane code and tests only. It does not mutate SimCore runtime/plugin code and does not mutate `release-simcore`.

## Implemented ownership convergence

R2.6 now has one post-publish semantic ownership path:

1. `products/simcore/tooling/release-state-converge.mjs`
   - owns `PERMANENT`, `RECOVERY`, and `PREPUBLICATION_SIMULATION` semantics;
   - emits one normalized `PostPublishStateEnvelope`;
   - owns persistent payload membership, per-file hashes, changed paths, lifecycle/disposition, and expected durable claims.

2. `products/simcore/tooling/release-state-preplay.mjs`
   - executes the same semantic owner before publication with synthetic candidate production identity;
   - validates the envelope against static writer policy;
   - verifies closure/marker and identity-free current-state constraints;
   - has no publisher, main-writer, or network authority.

3. `products/simcore/tooling/release-state-main-gate.mjs`
   - cross-checks the owner envelope, writer policy, and actual git diff;
   - stages only owner-declared payload paths;
   - preserves the existing `scripts/repo-main-write.py` as the sole main integration gateway.

4. `products/simcore/tooling/release-state-reobserve.mjs`
   - reobserves durable main truth read-only;
   - verifies payload hashes, manifest, record, receipt, release-state marker, production identity, and `latest.js == install.js` claims from the same envelope.

5. Permanent and recovery orchestration
   - `.github/workflows/simcore-release-permanent.yml` runs preplay before its single permanent publisher call and then uses the shared main gate and shared reobserver;
   - `.github/workflows/simcore-release-state-sync.yml` recovery uses the same owner/gate/reobserver path;
   - workflow-local duplication of the five post-publish payload paths, disposition vocabulary, and receipt-field durable checks was removed from the post-publish transaction boundary.

6. Permanent regression and classifier coverage
   - `release-system-r2-6` is registered in the existing regression batch;
   - R2.6 ownership, authority, preplay ordering, publisher count, workflow thinning, and activation separation are permanently asserted;
   - the new R2.6 tooling surfaces are explicitly classified for permanent CI, state-sync, and shared-main coordination ownership.

## Qualification evidence

Passing implementation qualification:
- Pull request: `#805` `feat(simcore): implement R2.6 post-publish boundary convergence`
- Qualified branch head: `74f165ca80b4862d635b6b2226bb5f633124d3cf`
- SimCore CI run: `33246348890` (`#2560`)
- Verify job: `99084369168` — **PASS**
- Required job: `99084421438` — **PASS**

The qualified run passed the proposed permanent verifier with:
- CI self-test: PASS
- static checks: PASS
- architecture checks: PASS
- regression checks: PASS
- state checks: PASS
- shared-main coordination checks: PASS

## Validation anomalies preserved

The following anomalies were found while qualifying the R2.6 implementation. None changed runtime behavior or production authority.

### FIX · RESOLVED · TEST CONTRACT ONLY — workflow-local bot provenance assumption

The predecessor CI self-test expected two direct `github-actions[bot]` identities inside `simcore-release-state-sync.yml`. R2.6 intentionally moved recovery commit ownership into the shared main-gate adapter, leaving one ordinary workflow-local state-sync writer plus the shared main-gate writer.

Resolution: provenance validation now checks the ordinary workflow-local writer and the shared R2.6 main-gate writer at their actual ownership locations.

### FIX · RESOLVED · TEST CONTRACT ONLY — recovery allowlist scope false positive

An early R2.6 regression scanned the entire state-sync workflow and treated the ordinary durable-memory sync allowlist as duplicated recovery semantics.

Resolution: the no-workflow-local-contract assertion is scoped to the `permanent-recovery` job only. Ordinary durable-memory sync authority remains unchanged.

### FIX · RESOLVED · TEST CONTRACT ONLY — trigger assertion scope

A self-test sliced the recovery job body and then searched that slice for the workflow-level pull-request trigger.

Resolution: trigger assertions inspect the workflow surface; recovery ownership assertions inspect only the recovery job surface.

### FIX · RESOLVED · CI CLASSIFICATION — new R2.6 tooling initially under-classified

The first implementation pass did not explicitly classify `release-state-main-gate.mjs`, `release-state-preplay.mjs`, and `release-state-reobserve.mjs` as permanent release-system/state-sync surfaces.

Resolution: all new owners are registered in the classifier; main-gate additionally carries shared-main coordination classification.

### FIX · RESOLVED · TEST CONTRACT ONLY — broad `--force` substring check

A predecessor self-test treated any `--force` substring in the permanent workflow as a force-publish primitive, including safe non-publication git operations.

Resolution: the safety assertion now targets actual publication primitives such as `git push --force`, `force-with-lease`, and `+refs/heads/release-simcore`.

### FIX · RESOLVED · TEST CONTRACT ONLY — predecessor permanent-state stdout marker

The R2.6 deterministic permanent-state test correctly passed and emitted `RS2_6_POST_PUBLISH_BOUNDARY_TEST_PASS`, while the CI self-test still required the predecessor `RS2_4E...` marker.

Resolution: CI self-test now asserts the stable R2.6 pass-marker prefix rather than predecessor-specific subtest wording.

### WATCH · NONBLOCKING · PLATFORM/ACTION RUNTIME DEPRECATION

GitHub Actions currently reports that several pinned actions target the deprecated Node 20 action runtime and are being forced to execute on Node 24.

Disposition: **WATCH**. This is a platform/dependency maintenance concern, not an R2.6 semantic defect. Updating pinned action dependencies would be a separate repository-system refactor and is intentionally not mixed into this release-system implementation transaction.

## Production non-mutation proof

Reobserved after implementation qualification:
- production branch: `release-simcore`
- production commit: `4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
- production version: `0.66.0`
- `plugins/simcore/latest.js` blob: `f0da13d4c47fd98e9065d7dbf253a3296151ee16`
- `plugins/simcore/install.js` blob: `f0da13d4c47fd98e9065d7dbf253a3296151ee16`
- `latest.js == install.js`: **TRUE**

Therefore:
- runtime mutation: **NONE**
- `release-simcore` mutation: **NONE**
- new publisher: **NONE**
- new lifecycle state: **NONE**
- new background polling/retry authority: **NONE**

## Activation boundary

Implementation qualification does **not** authorize a new production publication and does not grant an additional publisher.

`activationAuthorized` remains `false`.

The first genuine end-to-end R2.6 operational proof must occur only after a separately recorded activation decision and during a future genuine SimCore release transaction. That future proof must preserve:
- the single `RS2_4_PERMANENT` production publisher;
- fast-forward-only production publication;
- existing human real-long-chat validation authority;
- append-only recovery;
- `latest.js == install.js`;
- `main` as design/evidence/admin authority and `release-simcore` as plugin/deployment authority.

## Final implementation disposition

**R2.6 IMPLEMENTATION COMPLETE AND PERMANENT-CI QUALIFIED. ACTIVATION REMAINS SEPARATELY GATED.**

No implementation BLOCKER remains from this transaction.

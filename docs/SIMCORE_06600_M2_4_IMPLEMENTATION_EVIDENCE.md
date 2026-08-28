# SimCore v0.66.0 M2-4 Implementation Evidence

Status: `IMPLEMENTATION MATERIALIZED · PRODUCT PR/CI PASS · CANDIDATE MATERIALIZED · HASH DOMAIN RECONCILED · EXACT APPROVAL PENDING · NO PRODUCTION MUTATION`

Work branch:
`runtime/simcore-v0.66.0-m2-4-boundary-completion`

Production input authority:
- version: `0.65.0`
- release branch: `release-simcore`
- production commit: `c6659296c68b4322d0ed43f7d8a3339e57f1cbf1`
- production runtime blob: `1b38e2b2874f2581edae8f1080edc39558febefa`

Main authorization authority:
- main closure commit: `481003fefea01dc2e70b3b8dac08e81264b94250`
- validation status: `LIVE_PASS`
- durable checkpoint: `M2-3`
- current priority: `06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_IMPLEMENTATION`
- implementation authorization: `YES`

## 1. Scope

This work item implements only the frozen M2-4 Session / Runtime Mirror Boundary Completion.

It does not include:
- release-system R2.5 follow-up;
- unrelated WATCH items;
- Community behavior changes;
- provider-cache claims;
- persistent-schema changes;
- new host APIs;
- deployment/repository-system changes.

The physical deployment unit remains the whole SimCore plugin. The default reading/implementation unit is the authoritative ownership surface for each slice.

## 2. Slice A — Output Finalization ownership

Target:

```text
Session
  delegates final state/content transition
        ↓
Output Finalize
  pure deterministic transition only
```

`finalizePreparedOutput(baseState, prepared, outIndex, opts)` moves physically out of Session without semantic change.

Frozen invariants:
- no storage I/O in Output Finalize;
- no host I/O in Output Finalize;
- same Frame / Time / Structure / Reaction decisions;
- same returned content/state/probes;
- same call ordering.

## 3. Slice B — Store housekeeping ownership

The existing deferred prune cadence and best-effort failure isolation move from Session state into Store housekeeping.

Frozen behavior:
- integer output index only;
- first eligible index remains 17;
- cadence remains `outIndex % 17 === 0`;
- duplicate/running suppression remains;
- timer remains 750 ms where `setTimeout` exists;
- retention failure never affects committed output/state;
- fallback microtask behavior remains.

Session must no longer own deferred-prune bookkeeping fields.

## 4. Slice C — Recovery facade runtime caller retirement

Recovery remains physically present as the M2 compatibility facade.

Runtime callers migrate to responsible modules:

```text
output compatibility       → output-compat
bootstrap / legacy repair  → bootstrap-migration
final state transition     → output-finalize
```

Acceptance target:

```text
runtime Recovery caller count = 0
Recovery facade physical module = retained
Recovery public compatibility exports = retained
```

No compatibility behavior may be removed merely because runtime callers migrate.

## 5. Slice D — Observe → Interpret → Apply → Record

Post-v0.65 source reobservation confirms the frozen ownership debt still exists: Runtime Mirror directly interprets Fresh-confirmation candidate semantics and Representation knows Output Compat policy labels.

The implementation target is:

```text
1. Output Compat builds a bounded candidate observation plan.
2. Runtime Mirror reads Fresh at most once.
3. Runtime Mirror exact-compares Fresh against canonical / host-raw / opaque candidate fingerprints.
4. Runtime Mirror emits a bounded observation receipt containing facts only.
5. Output Compat interprets plan + receipt and emits the existing compatibility meaning.
6. Runtime Mirror rechecks runtime/location/sequence guards before applying an accepted identity and before transport.
7. Representation records identity/provenance from accepted canonical-equivalence facts, not from a hard-coded list of Output Compat policy labels.
```

Frozen compatibility labels may remain externally stable:
- `FRESH_CONFIRMED_SUFFIX`
- `BOUNDARY_CONFIRMED_SUFFIX`
- `SAFE_BOUNDARY_CONFIRMED`
- `RECOVERED`
- `FRESH_MISMATCH`

Their semantic producer becomes Output Compat.

Runtime Mirror remains owner of:
- exact Fresh observation;
- exact base/candidate equality facts;
- runtime epoch/currentness;
- location identity;
- latest sequence;
- expected output slot;
- safe application/transport sequencing;
- host mirror write;
- bounded runtime timings/status.

Representation remains memory-only and must retain no raw body.

## 6. Differential/static acceptance matrix

The frozen builder and verification must prove at least:

### Global
- metadata/runtime/host identity all `0.66.0`;
- `latest.js == install.js` byte-for-byte;
- no persistent schema/key addition;
- provider cache remains `UNVERIFIED`;
- no new network/polling/interval path.

### Slice A
- `SimCore.define("output-finalize"...)` exists;
- Session contains no physical `function finalizePreparedOutput(` body;
- Session delegates through Output Finalize;
- Output Finalize contains no `.store`, `host.`, `setChat`, `pluginStorage`, or Runtime module dependency.

### Slice B
- Store owns `scheduleDeferredPrune`;
- Session no longer owns `deferredPruneIndex` / `deferredPruneRunning`;
- Session output path invokes Store housekeeping after authoritative out save.

### Slice C
- Session has no `require('./recovery')` and no `recovery.` calls;
- Edit Reconcile has no `recovery.` calls;
- Recovery facade remains defined and exports the compatibility surface.

### Slice D
- Runtime Mirror does not invent or branch on the semantic labels `FRESH_CONFIRMED_SUFFIX`, `BOUNDARY_CONFIRMED_SUFFIX`, `SAFE_BOUNDARY_CONFIRMED`;
- Output Compat owns candidate-plan construction and interpretation;
- Mirror observation receipt exposes base exact match + opaque candidate IDs/count;
- one mirror operation performs at most one host Fresh read;
- candidate interpretation occurs before post-interpretation guard recheck and write;
- Representation classifies prior exactness from `acceptedCanonicalEquivalent` / accepted canonical identity relation rather than Output Compat label enumeration;
- no raw Fresh/candidate bodies are retained in plan/receipt/registry.

## 7. Frozen builder and exact-production materialization

Frozen builder:

`products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion.py`

Raw builder file-byte SHA-256 after the Slice B assertion repair:

`ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50`

The generic candidate materializer currently obtains builder text through a shared command helper whose stdout is `.trim()`ed before hashing. Therefore the durable candidate receipt records a distinct normalized/trimmed-text builder digest:

`cca38629388cf932024226ef02097703f4a73602af6bbf48e5556225baac4a1a`

These hashes are not contradictory. They identify different hash domains for the same source builder. Durable diagnosis:

`docs/SIMCORE_06600_BUILDER_HASH_DOMAIN_AMBIGUITY_2026-08-29.md`

The assertion repair commit `99f0944389387d264e29045ed9968b35838378c7` changes only the Slice B validation assertion and does not change materialized runtime semantics.

Read-only exact-production validation run:

`33200092018`

The validator first proved that the materialization input was exactly current production:

```text
release-simcore commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest blob            = 1b38e2b2874f2581edae8f1080edc39558febefa
install blob           = 1b38e2b2874f2581edae8f1080edc39558febefa
latest == install      = PASS
```

Builder execution then returned:

```text
06600_BUILD_PASS
version=0.66.0
bytes=563052
```

Materialized candidate identity:

```text
candidate blob   = 766c3b758ca26ae72546a38bfa1c053efa666c45
candidate sha256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
```

Static candidate checks passed:

```text
Node syntax latest      PASS
Node syntax install     PASS
latest == install       PASS
metadata version        0.66.0
runtime version         0.66.0
host compat version     0.66.0
Slice A/B/C/D assertions PASS
06600_STATIC_SLICE_CHECK_PASS
```

This runtime identity remains the immutable implementation target unless a later runtime FIX changes builder semantics. Contract/docs/validation-harness-only changes do not alter these candidate bytes.

## 8. Architecture dual-lane convergence

A pre-PR review found that the architecture contract still carried the v0.65 pre-publication transition state even though machine-managed production authority is now v0.65.0 `LIVE_PASS` / M2-3.

Durable evidence:

`docs/SIMCORE_06600_ARCH_CONTRACT_POST_06500_PROMOTION_DRIFT_2026-08-29.md`

Classification:

`FIX · ARCH_CONTRACT · STATIC_GATE · NON_RUNTIME · PRODUCTION_UNCHANGED`

Repair commit:

`f27c4e1c2b4fbfb53eb88f1220b81060f6f3dc08`

The repaired dual-lane contract now does both:

```text
current production v0.65.0
- edit-reconcile = required
- Session -> recovery remains allowed
- output-finalize may be absent because it is planned

v0.66.0 candidate
- output-finalize may physically appear because runtime refactor is authorized
- Session direct-owner edges to output-compat / bootstrap-migration / output-finalize are declared
- Edit Reconcile direct-owner edges for the candidate are declared
- Runtime Mirror -> output-compat is declared
- output-finalize -> kernel/time/frame/reaction/structure is declared
```

No checker rule was weakened and no production runtime byte changed.

## 9. Validation-harness / branch-hygiene incidents

The implementation phase produced several non-runtime harness failures. Every one was preserved before continuation:

- `docs/SIMCORE_06600_BUILDER_VALIDATION_FAILURE_01_SLICE_B_ASSERTION_2026-08-29.md`
- `docs/SIMCORE_06600_BUILDER_VALIDATION_HARNESS_FAILURE_02_SELF_DELETE_STAGE_2026-08-29.md`
- `docs/SIMCORE_06600_BUILDER_VALIDATION_HARNESS_FAILURE_03_WORKFLOW_PERMISSION_2026-08-29.md`
- `docs/SIMCORE_06600_BUILDER_VALIDATION_HARNESS_FAILURE_04_PYCOMPILE_BYTECODE_2026-08-29.md`
- `docs/SIMCORE_06600_BRANCH_HYGIENE_AND_DRAFT_PR_FAILURE_05_2026-08-29.md`

The last incident also records:
- accidental draft PR `#758` created during branch inspection;
- immediately closed without merge;
- tracked `.pyc` validation residue removed;
- no production exposure.

Temporary validation workflows were removed from the work branch. The intended product diff contains no temporary workflow or generated bytecode artifact.

## 10. Product PR and permanent CI

Product PR:

`#759 · feat(simcore): implement v0.66.0 M2-4 boundary completion`

Permanent gates passed before merge:
- SimCore Architecture Contracts: SUCCESS;
- SimCore CI Verify: SUCCESS;
- SimCore CI Required: SUCCESS.

The product PR was merged to `main`. No `release-simcore` mutation occurred at this stage.

## 11. Release transaction and durable candidate

First release intent `intent-01/new-01` was closed without merge after PR1 dry qualification exposed missing v0.66 versioned regression bridges. Durable evidence:

`docs/SIMCORE_06600_RELEASE_INTENT_FAILURE_01_VERSIONED_REGRESSION_BRIDGES_2026-08-29.md`

The fixture repair was isolated in PR `#762` and passed permanent `Verify + Required` without changing runtime candidate bytes or release-system code.

Append-only recovery transaction:

```text
intent = simcore-v0.66.0-intent-02
release = simcore-v0.66.0-new-02
PR = #763
PR1 dry = PASS
```

Generic Candidate Materialize:

```text
run = 33202748173
result = SUCCESS
candidate C = ea88eecb4428a42682894c96980bef420b0a0d27
candidate fetch ref = candidate/simcore/simcore-v0.66.0-intent-02
candidate blob = 766c3b758ca26ae72546a38bfa1c053efa666c45
expected production P = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
productionMutation = NONE
```

Durable receipt/spec-shadow landed on main after safe CAS retry at:

`3b41d44559821be05d2e60998d41988e97ba6869`

The candidate runtime blob exactly matches the earlier exact-production materialization proof.

## 12. Current advancement rule

```text
DONE  builder materialization
DONE  static differential proof per Slice A/B/C/D
DONE  architecture dual-lane contract convergence
DONE  product PR + combined permanent CI
DONE  v0.66 versioned regression bridge repair
DONE  append-only recovery PR1 dry qualification
DONE  Generic Candidate materialization + durable receipt/spec-shadow
FIX   builder hash-domain evidence ambiguity, docs-only, no runtime mutation
NEXT  exact approval transaction after this docs FIX passes permanent CI
THEN  permanent release / release-simcore publication
THEN  real long-chat human validation
THEN  final main docs / long-term-memory sync
```

Any newly observed anomaly is preserved before continuation and classified `WATCH / DEFER / FIX / BLOCKER`.

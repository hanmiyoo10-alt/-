# SimCore Release System v2.1 — First Genuine Runtime Release Retrospective

Date: 2026-08-28 KST
Status: **OPERATIONAL PROOF RECORDED · LIVE_PENDING PATH PROVEN · NON-RUNTIME**
Scope: v0.64.8 `Output-Complete Telemetry Checkpoint Repair` from explicit work item through delegated publication and durable `REAL_RELEASE_LIVE_PENDING`
Runtime mutation from this retrospective: **NONE**
`release-simcore` mutation from this retrospective: **NONE**

## 1. Executive verdict

Release System v2.1 is now **operationally proven through LIVE_PENDING** on a genuine SimCore runtime release.

The proof was not perfectly clean. The first exact-approval transaction (`simcore-v0.64.8-new-01`) exposed a release-spec contract-parity defect and failed closed before production mutation. The defect was preserved, repaired in the release-system track, permanently regression-owned, and the same product runtime candidate was then released through an append-only recovery transaction (`simcore-v0.64.8-new-02`).

The successful transaction established the intended steady-state human boundary:

```text
explicit user release work item
→ assistant/delegated operator handles all pre-live repository + release operations
→ production published
→ durable LIVE_PENDING state converged
→ user's next physical action = apply plugin + real long-chat validation
```

Observed user manual pre-live GitHub actions: **0**.

Human LIVE_PASS remains unproven for v0.64.8 because the product real-long-chat gate is still pending. That is intentionally outside the R2.1 pre-live operational proof.

## 2. Proven release identity

Successful recovery transaction:

```text
releaseId = simcore-v0.64.8-new-02
candidate / production commit = f5e29464452728f859a1a6a8191a846468353531
parent production = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
candidate / production blob = bed3d5faff9641071cdd9003b67c45d42b3e32ee
latest.js == install.js = PASS
```

Permanent publication evidence:

```text
Exact approval PR = #636
approval merge = 20c569894a8596ce5d5b6734ec2c69902b1bb084
Permanent Release run = 33086543601
Permanent Release conclusion = SUCCESS
LIVE_PENDING main state commit = dbaa095df47b0293a39283c9664fefa1feafd756
```

Permanent Release jobs all succeeded:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

Main manifest converged to:

```text
production_version = 0.64.8
release_commit = f5e29464452728f859a1a6a8191a846468353531
release_blob = bed3d5faff9641071cdd9003b67c45d42b3e32ee
validation_status = PENDING_REAL_LONG_CHAT
current_priority = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

## 3. What R2.1 proved well

### 3.1 Delegated operator UX goal — PASS

The user did not need to:

```text
press a workflow button
manually approve a SHA
copy candidate identity
merge an approval PR
perform a pre-live GitHub action
```

The explicit release instruction authorized the active work item, and the delegated operator path carried it to LIVE_PENDING.

Classification:

```text
R2_1_DELEGATED_OPERATOR_GENUINE_RELEASE_PROOF
= PASS / OPERATIONALLY_PROVEN_TO_LIVE_PENDING / NON_RUNTIME
```

### 3.2 Fail-closed safety — STRONG PASS

The first transaction carried metadata outside the authoritative release schema:

```text
changeClass = RUNTIME_CORRECTNESS_REPAIR
expected schema value = RUNTIME_CORRECTION

evidenceRefs included issue:#623
expected schema refs = docs/** or products/simcore/**
```

Exact Approval Activation rejected the invalid spec as `APPROVAL_SPEC_INVALID` before `release-simcore` moved.

This is an important positive result: a real contract defect did not silently weaken publication authority.

### 3.3 Failure became permanent protection — PASS

The release-system defect was classified:

```text
BLOCKER / RELEASE_SYSTEM_CONTRACT_DRIFT / PRODUCTION_UNCHANGED
```

Durable incident: issue `#629` plus merged evidence PR `#630`.

The repair PR `#631` (`e58cfdb672b92a3a8915d79ab7c5b661ee36f0e4`) added fail-fast release-schema parity to candidate request and machine spec-shadow handling with permanent regression coverage.

The repair did not mutate SimCore runtime/plugin bytes and did not manually publish production.

Final classification:

```text
R2_1_RELEASE_SPEC_CONTRACT_PARITY_DRIFT
= FIXED / FIRST_GENUINE_PROOF_BLOCKER / PERMANENT_REGRESSION_OWNED / NON_RUNTIME
```

### 3.4 Append-only recovery semantics — PASS

The failed `new-01` transaction remained immutable evidence.

Recovery did not overwrite approval/spec/receipt history. It created:

```text
simcore-v0.64.8-intent-02
simcore-v0.64.8-new-02
```

The corrected transaction reproduced the same intended runtime blob and then followed the normal generic candidate → exact approval → permanent publisher path.

This is the correct release-accounting behavior.

### 3.5 Single publisher and exact authority split — PASS

Observed final authority remained:

```text
release-simcore = runtime/deployment authority
main = design/evidence/release-state/admin authority
```

No manual `release-simcore` push was used.

The activation adapter remained non-publisher and the permanent publisher performed the production mutation.

### 3.6 Automatic LIVE_PENDING convergence — PASS

R2.1 D performed the routine state convergence automatically after publication:

```text
production identity
manifest validation status
current_priority / liveScenarioId
machine-managed CURRENT_DEVELOPMENT production snapshot
machine-managed LIVE_PENDING block
```

This is materially better than the v0.64.7 first-R release, where routine LIVE_PENDING closure required several administrative transactions.

### 3.7 Concurrent main movement did not corrupt release evidence — PASS

Unrelated main writes occurred while candidate receipt/state operations were active.

The permanent write-coordination/CAS behavior recovered/reobserved instead of overwriting unrelated main history or bypassing the release transaction.

Classification:

```text
R2_1_MAIN_WRITE_COORDINATION_UNDER_CONCURRENCY
= PASS / GENUINE_RELEASE_PROOF / NON_RUNTIME
```

## 4. Operator-cost result

R2.1's target was:

```text
PRs to LIVE_PENDING = 2
user manual pre-live GitHub actions = 0
```

The clean intended path is:

```text
PR1 product + release intent
→ machine candidate/receipt
→ PR2 delegated exact approval
→ permanent publication + automatic LIVE_PENDING
```

The first genuine proof did **not** achieve two total PRs because it discovered a first-proof release-system blocker.

Observed SimCore PRs from v0.64.8 implementation through successful LIVE_PENDING:

```text
#625 product + release intent
#628 first exact approval (failed activation)
#630 durable blocker evidence
#631 release-system contract-parity repair
#634 append-only corrected recovery intent
#636 corrected exact approval
```

Actual first-proof cost: **6 PRs including incident evidence/repair**.

This must not be interpreted as steady-state R2.1 cost. The additional four PRs were first-proof failure handling.

Post-repair steady-state projection, using the now-enforced contract:

```text
#625-equivalent product+valid intent
→ generic candidate/receipt
→ one #636-equivalent exact approval
→ permanent release/LIVE_PENDING
```

Expected steady-state pre-live operator PR count remains **2**, and the v0.64.8 successful half of the transaction proved those permanent surfaces compose correctly once metadata is valid.

Classification:

```text
R2_1_FIRST_GENUINE_PROOF_PR_OVERHEAD
= WATCH / FIRST_PROOF_LEARNING_TAX / STEADY_STATE_TARGET_RETAINED / NON_RUNTIME
```

Do not optimize away safety boundaries merely to force the count.

## 5. New feedback findings

### F12. Release schema parity must fail at the earliest machine boundary

This was discovered and already repaired during v0.64.8.

Before repair:

```text
candidate request accepts broad string/array shapes
→ machine spec shadow preserves invalid release metadata
→ candidate succeeds
→ exact approval activation finally rejects spec
```

After `#631`:

```text
candidate request / spec-shadow derivation
→ authoritative release schema guard
→ invalid release metadata blocked before candidate mutation/durable spec shadow
```

Disposition:

```text
R2_1_RELEASE_SPEC_CONTRACT_PARITY_DRIFT
= FIXED / KEEP PERMANENT REGRESSION
```

No further redesign is required unless this class recurs.

### F13. Blocker issue lifecycle closed before blocked release recovery completed

Issue `#629` represented both:

```text
release-system defect
AND
blocked v0.64.8 publication incident
```

PR `#631` used `Fixes #629`, so GitHub closed the issue at the infra repair merge (`2026-08-28 00:06 KST`).

The actual recovered permanent publication completed later, with Permanent Release run `33086543601` finishing successfully around `2026-08-28 00:14 KST`.

Therefore the defect was fixed before the release incident was fully resolved.

No production safety problem resulted, but the issue state temporarily overstated closure.

Classification:

```text
R2_1_BLOCKER_INCIDENT_PREMATURE_AUTOCLOSE
= FIX / INCIDENT_LIFECYCLE / NON_RUNTIME / NON_BLOCKING
```

Recommended correction for future release blockers:

```text
option A: separate DEFECT issue from RELEASE INCIDENT issue
or
option B: do not use Fixes/Closes on a release-blocker issue until recovery + production reobservation completes
```

A blocker may transition internally from `DEFECT_FIXED / RECOVERY_PENDING`, but should not read fully closed while the blocked publication remains unresolved.

### F14. Human current-production prose duplicates machine authority and drifted again

After successful v0.64.8 publication, machine-managed `CURRENT_DEVELOPMENT.md` blocks correctly moved to v0.64.8/LIVE_PENDING, but the nearby human-authored `Production verdict` still described v0.64.7 and its old live gate.

This is already tracked as issue `#640`:

```text
FIX / DOC_DRIFT / NON_RUNTIME / NON_BLOCKING
```

The recurrence suggests the stronger systemic correction is not another one-off text edit alone.

Recommended direction:

```text
machine-managed production snapshot = sole current production identity in CURRENT_DEVELOPMENT
human operational prose = reference the machine block instead of duplicating version/SHA/live gate
```

If human-readable current-state prose must remain, make that paragraph machine-managed too.

Classification:

```text
CURRENT_DEVELOPMENT_DUPLICATE_CURRENT_STATE_AUTHORITY
= FIX / DOC_ARCHITECTURE / NON_RUNTIME / NON_BLOCKING
```

### F15. Connected run observation can be noisy; durable receipts remain the authority

During the release operation, one incorrectly observed/transient run identifier produced 404 and an in-progress job log could also be temporarily unavailable.

The durable candidate receipt, exact approval identity, workflow list by commit, production branch, and main manifest all remained sufficient to recover exact truth.

No wrong run was bound by the release controller and no production impact occurred.

Classification:

```text
R2_1_CONNECTED_RUN_OBSERVABILITY_NOISE
= WATCH / TOOL_SURFACE / NON_RUNTIME / NON_BLOCKING
```

Do not redesign permanent run correlation from this alone. Continue to prefer durable transaction receipts and exact commit/release identities over guessed run IDs.

The older watch remains:

```text
PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
= WATCH
```

## 6. Safety properties to preserve unchanged

The first genuine proof strengthens the case for retaining:

```text
explicit release work item required
no standing/background release authority
exact P/C/blob binding
machine-derived spec shadow
exact two-file approval boundary
Candidate Required
single permanent publisher
fast-forward-only production
latest.js == install.js
append-only failed transaction evidence
post-publish state cannot republish
human real-long-chat LIVE_PASS gate
repo evidence/documentation closure
```

Do not collapse these because the first proof had extra incident PRs.

## 7. Recommended next R-system work

Priority order:

```text
1. FIX #640 / remove duplicate current-production authority from human prose
2. FIX blocker incident lifecycle semantics (F13)
3. KEEP release-spec parity regression from #631
4. WATCH activation/run observability only; do not rewrite without recurrence
5. KEEP candidate transport-ref retirement as DEFER/tool-surface
6. KEEP Node action runtime warning as WATCH unless causal evidence appears
```

These are **non-runtime Release System / documentation tasks** and must not be mixed into the v0.64.8 real-long-chat product gate.

## 8. R2.1 status transition

Before v0.64.8:

```text
DELEGATED_OPERATOR_POLICY_ACTIVE_AWAITING_GENUINE_RELEASE_PROOF
```

After the successful `simcore-v0.64.8-new-02` publication:

```text
DELEGATED_OPERATOR_POLICY_OPERATIONALLY_PROVEN_TO_LIVE_PENDING
```

Meaning:

```text
implementation = ACTIVE
permanent CI = PASS
genuine runtime release proof to LIVE_PENDING = PASS
user manual pre-live GitHub actions = 0
human v0.64.8 LIVE_PASS = PENDING
```

R2.1 should now be treated as the active proven pre-live release operating mode, not as an awaiting-proof experiment.

## 9. Current product boundary

This retrospective does not close v0.64.8 product validation.

Current product gate remains:

```text
06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
provider cache = UNVERIFIED
```

No next runtime release or M2-3 implementation should use this R2.1 retrospective as a substitute for the required v0.64.8 real long-chat evidence.

## 10. Cross references

- `docs/SIMCORE_RELEASE_SYSTEM_V2_FIRST_REAL_RELEASE_RETROSPECTIVE.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md`
- `docs/SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`
- `products/simcore/releases/R_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS_STATUS.json`
- issue `#629` — release contract drift blocker / recovered
- issue `#640` — CURRENT_DEVELOPMENT human current-state doc drift
- PR `#631` — release-spec contract parity repair
- PR `#636` — successful v0.64.8 exact delegated approval
- Permanent Release run `33086543601`

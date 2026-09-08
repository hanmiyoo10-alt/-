# Local Usage Dashboard 5.108 — E-system Retrospective

Date: 2026-09-08 KST  
Scope: `plugins/usage-dashboard/`  
Release observed: `3.0.0-alpha.5.108`  
Production: `release-usage-dashboard@05862999df0521c73b6890fbc561c01be3f9f36e`

## Summary

The 5.108 transaction shows that the E26-era system improved exactly where 5.107 had exposed a weakness: failed validation history no longer forced a manual same-candidate rerun path, validation attempts are candidate-scoped, RED results are classified, and each new candidate naturally restarts at attempt 1.

The release still incurred too much validation churn, but for a different reason. Three E9 `RED_LOGICAL` candidates were correctly stopped because focused regression / evidence-consumer assertions had not yet converged on the actual materialized source structure. The final candidate then passed E9, E11, E16, expected-head merge, monotonic exact-byte promotion, and production parity without user development intervention.

Overall qualitative verdict: **KEEP E26 safety and convergence semantics; improve pre-E9 deterministic preflight rather than retry behavior.**

## Evidence snapshot

Final release authority:

- source SHA: `a51a1856412073c579c5b632338546aef238a626`
- candidate SHA: `1955e36e8376080ad8ce2592e6793bbfa149c2e8`
- PR: #1906
- durable release request: #1905
- final E9 transaction: `34216308066`
- final E11: `MERGE_READY_NO_DRIFT`
- main merge SHA: `f3ac4e504b055997a6f3a24e9a0a4056313f9442`
- promotion run: `34216525011`
- production SHA: `05862999df0521c73b6890fbc561c01be3f9f36e`
- production parent: 5.107 production `b5ff566fdf164580b0edfa6e2db1d07cc88992bf`
- exact-byte parity: `VERIFIED`
- physical verification: `PENDING` at retrospective time

## What worked especially well

### 1. E26 candidate-scoped validation attempts behaved correctly

The final candidate recorded `UD_E9_VALIDATION_ATTEMPT_V2` with:

```text
candidate_sha: 1955e36e8376080ad8ce2592e6793bbfa149c2e8
attempt: 1
state: DISPATCHED
reason: first-validation
```

Earlier failed candidates did not poison the final candidate. Each newly materialized candidate received a fresh attempt 1 instead of inheriting stale dispatch state.

This directly fixes the 5.107 class where an old immutable dispatch marker made the reducer too sticky.

### 2. `RED_LOGICAL` classification prevented pointless retries

The transaction produced three E9 logical failures before the final GREEN candidate. In each case, the system stopped rather than automatically rerunning the same immutable candidate.

That is the correct E26 behavior. A retry would not have changed release truth because the failures were deterministic source/test contract defects.

The observed sequence was:

1. candidate `2473283d...` → `RED_LOGICAL`;
2. candidate `38ec63f5...` → `RED_LOGICAL`;
3. candidate `82cfbc2a...` → `RED_LOGICAL`;
4. repaired source → candidate `1955e36e...` → GREEN.

No unchanged-candidate attempt 2 was wasted.

### 3. Durable source revision history stayed monotonic and auditable

Every logical failure was repaired by producing a new exact source SHA and recording why.

Important examples on #1905:

- `248ff2ff...` → `3c0b4e6b...`: materializer targeted the wrong DevPass placement owner;
- `3c0b4e6b...` → `72a97623...`: E21 rejected direct `releaseEvidence` access in P75;
- `72a97623...` → `ee0cba90...`: P75 over-constrained one JavaScript declaration syntax instead of the semantic DevPass status load;
- `ee0cba90...` → `a51a1856...`: P75 checked DevPass placement in `50-dashboard-context.part.js` although the established render owner was `54-dashboard-markup.part.js`.

Earlier RED receipts remained RED. No history was rewritten to make the final release look cleaner than it was.

### 4. E9 remained a useful final authority boundary

Although too many issues reached E9, E9 itself did the right thing. It caught focused regression/evidence-contract mismatches before merge and did not confuse ordinary PR CI with exact release authority.

The final exact-SHA candidate passed the full discovered Usage Dashboard registry under the durable request/PR identity and emitted `UD_VALIDATION_RESULT status: GREEN`.

### 5. E11 and E16 converged automatically after GREEN

After final E9 GREEN, E11 proved:

```text
MERGE_READY_NO_DRIFT
candidate_base_sha = current_main_sha
```

E16 then emitted the deterministic merge authority capsule for the same candidate and fresh main.

No manual workflow rerun was needed to make the reducer progress from the final validation result to merge authority.

This is an important improvement over 5.107 operationally.

### 6. Expected-head merge and exact-byte promotion remained strong

The assistant re-read PR #1906, candidate branch, current main, and mergeability, then merged only with expected head `1955e36e...`.

Promotion run `34216525011` then:

- classified the production-byte change;
- promoted exact tested Git blobs;
- advanced `release-usage-dashboard` monotonically from 5.107;
- verified production parity;
- emitted deployment receipts with physical verification still separate and pending.

The production branch parent is exactly the prior 5.107 release commit, so monotonicity is concrete rather than inferred.

## Main weakness observed

### E9 is still catching deterministic problems that could be rejected earlier

The retry-path weakness from 5.107 is no longer the dominant cost.

The dominant 5.108 cost was that several source/test-authoring defects survived until exact-SHA validation:

- E21 evidence-consumer contract misuse;
- syntax-specific P75 assertion rather than semantic assertion;
- P75 checking a render-placement invariant in the wrong source-part owner.

These are valuable failures, but E9 is the expensive final authority layer. It should not be the first place where cheap deterministic source-shape and focused-test semantics are exercised.

The system therefore spent multiple candidate generations and full E9 transactions discovering defects that were, in principle, locally deterministic before release validation authority was needed.

## Recommended next improvement

Prioritize **pre-E9 convergence**, not additional retry machinery and not another authority gate.

The next system should preserve the E26 graph and introduce a small deterministic preflight seam that reuses existing logic before an E9 dispatch is allowed.

Desired properties:

1. **No new E-number authority node.** This is maintenance of the existing path, not another gate.
2. Before durable exact-SHA validation, deterministically dry-run the source intent against the frozen main and execute the focused release regression in the derived tree.
3. Reuse the same E21 evidence-consumer rules that E9 will later enforce, so Pxx tests cannot use stale/direct evidence APIs.
4. Validate source-part ownership semantically. Assertions about UI placement should inspect the actual render owner produced by materialization rather than assume a filename from conversational memory.
5. Prefer semantic markers over syntax-shape assertions when runtime behavior is the authority.
6. Do not duplicate the entire full registry before E9. Run only the cheap deterministic subset that can prevent known source-authoring churn.
7. Any preflight failure should produce a new source revision, not a retry of the same candidate.
8. E9 remains the authoritative full exact-SHA registry. Passing preflight must never imply release GREEN.

Conceptually:

```text
source intent
-> deterministic materializer dry-run
-> focused Pxx + E21 preflight
-> candidate publish
-> E15 handoff preflight
-> E9 exact-SHA full registry
-> E11
-> E16
-> assistant fresh reread
-> expected-head merge
-> exact-byte promotion
```

The goal is fewer expensive candidate/E9 cycles while preserving the same final authority.

## What should not be changed

### Do not weaken `RED_LOGICAL`

5.108 demonstrates that deterministic failures should stop. Automatic retry is correct only for the narrow `RED_RETRYABLE` class.

### Do not increase automatic retry count

There is no evidence from 5.108 that more retries would help. The observed REDs required source changes.

### Do not collapse E9 into focused preflight

Preflight is an optimization. E9 must remain the exact-SHA full-registry release authority.

### Do not weaken E21 or P75 just to reduce failures

The failures exposed incorrect test/evidence assumptions. The answer is earlier convergence and semantic assertions, not looser contracts.

### Do not weaken E11, E16, expected-head merge, or exact-byte promotion

All four behaved correctly and protected distinct authority boundaries.

### Do not merge physical acceptance into deployment authority

5.108 deployment is proven while physical acceptance is still pending. This separation remains correct.

## E26-specific scorecard from 5.108

| Dimension | Verdict | Notes |
| --- | --- | --- |
| Safety / authority | **PASS** | No RED candidate reached merge or production |
| Validation convergence | **PASS** | New candidate reset to attempt 1 correctly |
| Logical retry safety | **PASS** | Three `RED_LOGICAL` results caused zero pointless same-candidate retries |
| Retryable auto-retry | **NOT LIVE-PROVEN** | No genuine `RED_RETRYABLE` incident occurred |
| Shift-left E15 | **PRESERVED / NOT INCIDENT-PROVEN** | Handoff stayed valid; no malformed handoff incident this release |
| E11 freshness | **PASS** | `MERGE_READY_NO_DRIFT` before merge |
| E16 capsule | **PASS** | Fresh derived authority emitted |
| Expected-head merge | **PASS** | Exact final candidate head used |
| Monotonic promotion | **PASS** | 5.108 production parent is exact 5.107 production SHA |
| Exact-byte parity | **PASS** | Deployment receipt says `VERIFIED` |
| User intervention boundary | **PASS** | No development commands required from user |
| Full autonomous PR creation | **PARTIAL** | Existing E25 trusted initial PR-create seam remains not live-proven |
| Efficiency / simplicity | **WATCH** | Too many E9 cycles for deterministic focused-test/source-shape issues |

## Final verdict

For 5.108 the E-system was **safer and more autonomous than 5.107**, and the specific E26 retry-convergence change paid off.

The important new lesson is that the bottleneck moved leftward. The system no longer needs a better recovery story for logical RED. It needs to prevent cheap deterministic focused-test and source-owner mistakes from reaching E9 in the first place.

Recommended direction for the next system iteration:

**keep every current authority boundary, add no new gate, and shift a small reusable focused preflight earlier.**

Priority: **high for automation/efficiency, low risk to safety if implemented as a non-authoritative fail-closed preflight.**

# SimCore R2.12 Post-Close Feedback

Date: 2026-09-06 KST
Status: **FEEDBACK RECORDED · R2.12 KEEP · FOLLOW-UP FIX RECOMMENDED · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / CONTROL-PLANE POST-CLOSE REVIEW**

## 1. Executive verdict

```text
R2.12 = KEEP
DESIGN QUALITY = STRONG
IMPLEMENTATION SCOPE = CORRECTLY BOUNDED
AUTHORITY SPLIT = IMPROVED
NEW PROFILE DEBT = AVOIDED
RUNTIME RISK INTRODUCED = NONE OBSERVED
REOPEN R2.12 = NO
FOLLOW-UP = SEPARATE CHILD-RUN IDENTITY BINDING FIX DESIGN
```

R2.12 solved the correct problem at the correct layer. The best design choice was to reuse the existing `MAIN_HEALTH` semantics rather than invent a new SimCore validation profile or modify `simcore-ci.yml`.

The resulting contract is easier to reason about:

```text
canonical documentation candidate
-> verifier identity = exact documentation head
-> runtime source authority = release-simcore production bytes
-> runtime candidate semantics = not implied by documentation candidacy
```

This restores the intended authority split without weakening genuine runtime-candidate validation.

## 2. What R2.12 did especially well

### 2.1 It separated role identity from byte authority

Before R2.12, an immutable documentation candidate was accidentally treated as a SimCore runtime candidate because `CANDIDATE_SHADOW` coupled candidate identity with candidate runtime bytes.

R2.12 correctly distinguishes:

```text
documentation candidate role != runtime candidate role
```

The exact documentation head still owns verifier identity, while `release-simcore` remains the deployed runtime-byte authority.

This is a durable architectural improvement, not merely a one-off CI repair.

### 2.2 It reused existing semantics instead of creating another profile

The owner/impact audit proved `MAIN_HEALTH` already expressed the required production-source behavior.

Therefore R2.12 added:

```text
new validation profiles = 0
new runtime-source owners = 0
simcore-ci.yml semantic changes = 0
```

This avoided profile proliferation and reduced future verification-state combinations.

### 2.3 The implementation matched the frozen owner set

The implementation remained bounded to exactly:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

No runtime, `release-simcore`, `latest.js`, `install.js`, or older R2 contract was mutated.

This is the correct transaction shape for a control-plane routing correction.

### 2.4 The design was validated naturally, not only synthetically

Hosted deterministic tests passed, and natural documentation promotion later demonstrated both the semantic contract and a complete successful end-to-end path.

The natural SimCore child ran:

```text
profile = MAIN_HEALTH
immutable candidate materialization = SKIPPED
verifier = exact generated documentation head
runtime production source = release-simcore
Verify = PASS
Required = PASS
```

That is strong operational evidence that R2.12 behaves as designed.

## 3. Main weakness exposed after closure

The remaining weakness is not R2.12 source routing. It is parent-to-child workflow identity binding.

Current wait logic still selects child runs by:

```text
workflow
+ branch
+ workflow_dispatch
+ headSha
```

and then chooses the first matching run.

That predicate is not transaction-unique when multiple workflow-dispatch runs share the same generated documentation head.

Observed failure:

```text
fresh children dispatched correctly
+ stale children with same headSha already exist
-> parent may watch stale child
-> parent may fail despite fresh child PASS
```

Classification remains:

```text
FIX · CANONICAL_DOC_PROMOTION_STALE_SAME_HEAD_CHILD_RUN_SELECTION · NON-RUNTIME
```

This is an orchestration reliability defect, not an R2.12 routing correctness defect.

## 4. Recommended next design direction

Do not reopen R2.12.

Create a separate one-purpose design transaction for **fresh child-run identity binding**.

Required invariant:

```text
parent must observe the child created by this parent dispatch
not merely any child with the same workflow / branch / event / headSha
```

The design should compare the smallest viable mechanisms supported by GitHub Actions / `gh`, including at minimum:

```text
A. dispatch-time lower bound + matching metadata
B. explicit run-identity handoff if a reliable API/CLI path exists
C. bounded before/after run-set delta tied to the dispatch operation
```

Do not choose a mechanism before the design proves its ambiguity and failure modes.

## 5. Constraints for the follow-up fix

The follow-up must preserve all R2.12 and existing promotion invariants:

```text
exact documentation head remains verifier identity
MAIN_HEALTH remains docs-only SimCore validation profile
CANDIDATE_SHADOW remains genuine runtime-candidate profile
release-simcore remains runtime byte authority
exact-base / exact-head merge guard remains fail-closed
child failure remains fail-closed
no runtime mutation
no release-simcore mutation
no latest.js/install.js mutation
```

A fix that merely increases `gh run list --limit` or changes ordering without establishing transaction freshness is insufficient.

## 6. Secondary feedback

### 6.1 Keep the current profile vocabulary frozen

R2.12 demonstrates that role-correct routing can often be achieved by selecting an existing profile rather than expanding the profile matrix.

Recommendation:

```text
new profile requires proof that no existing profile expresses the required source authority
```

This should remain the default design posture.

### 6.2 Preserve explicit negative assertions in contract tests

The current regression does not only assert `MAIN_HEALTH`; it also asserts that docs-only dispatch does not pass runtime-candidate inputs.

That negative contract is valuable and should remain permanent:

```text
CANDIDATE_SHADOW absent
candidate_commit absent
candidate_fetch_ref absent
```

### 6.3 Do not fold orchestration reliability into runtime release work

The current production priority is v0.70.9 real-long-chat HUMAN_EVIDENCE. The stale-child selection FIX is independent non-runtime work.

It must remain a separate transaction from runtime release acceptance and future SimCore runtime versions.

## 7. Post-close scorecard

```text
Problem attribution = PASS
Owner selection = PASS
Scope discipline = PASS
Authority preservation = PASS
Profile reuse = PASS
Deterministic validation = PASS
Natural semantic validation = PASS
Natural end-to-end validation = PASS
Parent-child transaction identity = FIX REQUIRED / SEPARATE
Runtime impact = NONE
Release-simcore impact = NONE
```

## 8. Final recommendation

```text
R2.12 STATUS = CLOSED / KEEP
R2.12 REWORK = NO
R2.12 EXPANSION = NO
NEXT CONTROL-PLANE WORK = DESIGN-ONLY CHILD-RUN IDENTITY BINDING FIX
IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS FEEDBACK
CURRENT v0.70.9 HUMAN LIVE GATE BLOCKER = NO
```

R2.12 should remain frozen as the successful source-routing correction. The next improvement should target only the temporal identity ambiguity discovered after closure.

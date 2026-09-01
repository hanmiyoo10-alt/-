# SimCore `plugin-impact-scope` Second-Scope Candidate Review — 2026-09-01

Status: **READ-ONLY REVIEW COMPLETE · SIMCORE RECOMMENDED AS SECOND-SCOPE CANDIDATE · DIRECT VALIDATED-SCOPE EXPANSION NOT AUTHORIZED**

Classification: **COMMON AGENT SKILL / SIMCORE PROCESS TOOLING / SECOND-SCOPE REVIEW / NO PRODUCT OR SKILL MUTATION**

This review asks whether the repository Agent Skill `.agents/skills/plugin-impact-scope/`, currently pilot-validated only for `plugin:usage-dashboard`, should be evaluated for `plugin:simcore` as a second validated scope.

It does not modify the skill, add `plugin:simcore` to any validated-scope allowlist, change SimCore runtime, alter `release-simcore`, change S7/v0.70.3, or authorize repository-wide skill promotion.

---

## 1. Current skill boundary

Current `plugin-impact-scope` is a read-only analysis module that sits after current authority resolution and before design/implementation.

Its job is to produce a source-linked impact map covering, where material:

- semantic owners;
- producer/consumer/caller/dependent flow;
- state/data/effect flow;
- preservation boundaries;
- tests/contracts/validation;
- generated/build/materializer/release surfaces;
- explicit `DIRECT`, `SUPPORTED_LIKELY`, `UNKNOWN`, and `CONFLICT` evidence classes;
- the narrowest source-backed impact boundary.

Current hard scope remains:

```text
PILOT VALIDATED SCOPE = plugin:usage-dashboard
plugin:simcore        = UNVALIDATED
```

The helper's textual discovery output remains `CANDIDATE_ONLY`; it must never become semantic ownership proof.

---

## 2. Why SimCore is a strong second-scope candidate

SimCore has already repeated the same workflow manually in independent architectural work.

### 2.1 Context Projection

`docs/SIMCORE_CONTEXT_PROJECTION_IMPACT_SCOPE_2026-09-01.md` performed a read-only impact pass before the dedicated design.

It mapped:

- current authority;
- request path;
- ownership boundaries;
- callers/dependents;
- protected seams;
- validation/cost surfaces;
- blast radius;
- the narrowest credible first owner.

It selected the existing Mode C Lineage/Evidence seam rather than inventing a generic Context/Memory subsystem.

### 2.2 Exposure Knowledge

`docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md` repeated the pattern on a different semantic problem.

It separated:

```text
source authenticity/provenance
!=
audience exposure authority
```

and mapped Lifecycle, Lineage, Handoff, Evidence, Prompt, Community, Reaction, Structure, and the main model before selecting a bounded B-source Mode C lane.

### 2.3 3.0M Source Intelligence

The new 3.0M program is explicitly multi-layer and therefore creates recurring legitimate impact-scope demand.

Upcoming checkpoints span semantic source projection, assertion/exposure policy, structured sidecars, validators, presentation renderers, source families, provenance, context re-entry, and integration/performance.

This is exactly the class of repeated work from which a reusable read-only impact skill should be extracted.

Canonical conclusion:

```text
REPEATED SIMCORE MANUAL IMPACT-SCOPE NEED = PROVEN
SECOND-SCOPE CANDIDACY                     = STRONG
```

---

## 3. Why this is a meaningful generalization test

Usage Dashboard and SimCore are architecturally different enough that SimCore can test whether the skill is genuinely common rather than merely Usage-Dashboard-shaped.

### Usage Dashboard shape

Typical flow:

```text
Engine / Manager
→ request/state metadata
→ Plugin UI / Diagnostics
→ manifest / materializer / physical acceptance
```

### SimCore shape

Typical flow:

```text
host request / chat
→ runtime owner
→ semantic domain owners
→ prompt / main-model boundary
→ output validation / state commit
→ diagnostics / release parity / real long-chat evidence
```

SimCore also has a deliberately split authority topology:

```text
main
= design / evidence / roadmap / administration authority

release-simcore
= actual deployed plugin/runtime authority
```

A successful SimCore second-scope evaluation therefore tests whether the skill can preserve project-owned authority topology instead of assuming one checkout/ref is universally authoritative.

---

## 4. Important compatibility gap: ref-aware authority use

The current mechanical helper scans bounded roots in the current checkout.

That is useful candidate discovery, but for SimCore it is not sufficient production evidence because:

```text
main/plugins/simcore/*
!=
production runtime authority
```

Exact deployed runtime must be read from `release-simcore` according to the SimCore contract.

Therefore the second-scope evaluation must prove this rule:

```text
CURRENT-CHECKOUT SEARCH HIT
!=
CURRENT PRODUCTION SEMANTIC EDGE
```

A SimCore-capable impact pass may:

1. use mechanical discovery on current-main design/architecture/test surfaces when appropriate;
2. consume authority-provided exact refs/source for deployed runtime claims;
3. re-read exact `release-simcore` source at material runtime boundaries;
4. preserve `UNKNOWN` when the execution surface cannot access an authority-critical ref.

It must not silently treat `main/plugins/simcore/*` as deployed truth for convenience.

This is not a reason to reject SimCore. It is the central second-scope compatibility test.

---

## 5. Existing SimCore cases are compatibility fixtures, not independent generalization proof

The existing Context Projection and Exposure Knowledge impact documents are useful golden references, but they cannot alone prove the skill generalizes to SimCore.

Reason:

- the `plugin-impact-scope` design explicitly cited prior SimCore manual impact-scope work as evidence for the skill family;
- therefore retrospective success on those same cases has contamination / prior-example risk.

Correct use:

```text
Context Projection retrospective
= compatibility / regression fixture

Exposure Knowledge retrospective
= compatibility / regression fixture

NOT
= independent second-scope proof
```

A genuine promotion gate needs at least one prospective SimCore task whose manual final impact map was not already available when the candidate evaluation was frozen.

---

## 6. Recommended prospective held-out case

Recommended first held-out case:

```text
SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_IMPACT_SCOPE
```

Frozen task intent should be conceptually:

> Before designing 3M-3 Structured Sidecar + Validation, map the current SimCore semantic owners, producer/consumer boundaries, validation surfaces, persistence implications, generated/release surfaces, and protected non-impact boundaries. Do not design, edit, implement, release, or deploy anything.

Why this is strong:

- 3M-3 is next in the product sequence;
- it is genuinely cross-layer;
- 3M-1 and 3M-2 provide upstream contract inputs without already containing the full 3M-3 impact answer;
- the prospective output can be compared against a separately produced human/source-backed impact map;
- no runtime mutation is required to run the evaluation.

The eval must be frozen before the manual 3M-3 impact answer is written, otherwise the held-out property is lost.

---

## 7. Candidate eval family

### A. Retrospective compatibility — Context Projection

Purpose:

- verify the skill does not broaden into a generic Context/Memory system;
- verify it finds Lineage/Evidence as material owners;
- verify `TAIL_AFTER_CURRENT_USER`, current user exactness, A/B behavior, and persistent-schema non-impact as protected boundaries where source supports them;
- verify search hits remain candidate-only.

Disposition:

```text
COMPATIBILITY_ONLY
```

### B. Retrospective compatibility — Exposure Knowledge

Purpose:

- verify owner separation across Lifecycle / Lineage / Handoff / Evidence / Prompt / Community / Reaction / Structure;
- verify source provenance is not collapsed into audience exposure;
- verify semantic fact-checking is not assigned to Structure merely because Structure is the validator layer;
- preserve direct-B-root boundedness.

Disposition:

```text
COMPATIBILITY_ONLY
```

### C. Prospective positive — 3M-3 Structured Sidecar + Validation

Purpose:

- produce a fresh connected impact map from current authority and current source;
- identify the narrowest boundary without selecting the implementation design;
- distinguish canonical owners, derived sidecar ownership, policy input, validation, presentation, persistence, and release impact;
- preserve split main/release authority.

Disposition:

```text
PRIMARY SECOND-SCOPE OUTPUT PROOF
```

### D. Narrow negative

Prompt shape:

> Fix a typo in one SimCore research/design note.

Expected:

```text
NARROW_TASK
no broad impact archaeology
```

### E. Authority-only negative

Prompt shape:

> What is the current deployed SimCore version and exact production authority?

Expected:

- route to current authority resolution / `plugin-authority-scan` when validated/available;
- otherwise perform the minimal project-owned authority read;
- do not invoke impact-scope as if version lookup were an architectural impact question.

### F. Frozen-implementation negative

Prompt shape:

> Implement an already-frozen narrow SimCore change whose impact scope is current and complete.

Expected:

- do not re-run broad impact scope automatically merely because the repository is complex;
- hand off to the authorized implementation workflow.

---

## 8. Evaluation architecture

Do not add `plugin:simcore` to normal validated scope before evaluation.

Preferred sequence:

```text
1. freeze SimCore second-scope eval design
2. add candidate-only SimCore eval fixtures / source bundle support
3. keep normal skill trigger/allowlist unchanged
4. static/mechanical CI
5. retrospective compatibility runs
6. prospective 3M-3 with-skill vs baseline output run
7. human/source-backed qualitative review
8. SimCore trigger positive + negative eval
9. explicit second-scope acceptance review
10. only then add plugin:simcore to validated scope
```

Candidate-only evaluation must not create ordinary invocation authority.

---

## 9. Authority-input rule for the candidate evaluation

Do not couple two unvalidated second-scope skills and call the result proven.

`plugin-authority-scan` already has SimCore candidate-only second-scope work, but `plugin:simcore` is not yet normal validated scope there either.

Therefore `plugin-impact-scope` SimCore evaluation should allow either:

```text
A. a genuinely current VERIFIED authority report if one is available from an accepted same-workflow authority surface

OR

B. minimum direct SimCore authority rereads required by the project contract
```

For the second-scope eval, option B is sufficient and avoids circular validation dependency.

---

## 10. SimCore-specific preservation dimensions

The common skill should remain common. Do not hard-code these as universal repository rules.

But SimCore evaluation should expect the impact map to inspect them when material:

```text
current user exactness
runtime prompt placement / TAIL_AFTER_CURRENT_USER
mode/lifecycle owner preservation
Lineage / Evidence / Handoff ownership
Community / Reaction / Structure responsibility boundaries
persistent schema effect
extra history scans / model calls / network calls / timers
latest.js == install.js parity when shipped bytes are implicated
main vs release-simcore authority separation
S7/v0.70.3 isolation when unrelated
real-long-chat acceptance when the future change requires it
```

These are project-specific evaluation expectations, not reasons to fork the common skill.

---

## 11. What not to do

Reject these approaches:

### 11.1 Direct allowlist expansion

```text
add plugin:simcore
because manual methodology looks similar
```

Reason: no independent output/trigger evidence.

### 11.2 SimCore-specific fork

```text
plugin-impact-scope-simcore
```

Reason: duplicates a common coherent job and creates drift.

### 11.3 Make current-main helper output production authority

Reason: violates SimCore split authority and RCR-H01/H02/H03.

### 11.4 Couple skill promotion to 3M product implementation

Reason: shared tooling/scope expansion and 3M feature design are separate primary goals.

The held-out 3M-3 question may be used as evaluation input, but any common-skill implementation/eval transaction must remain separate from the 3M-3 product-design transaction.

---

## 12. Promotion gates

`plugin:simcore` may become a validated scope only when all are true:

```text
G1  current SimCore authority topology is preserved
G2  release-simcore runtime claims use exact release authority, not convenient main copies
G3  mechanical search remains CANDIDATE_ONLY
G4  retrospective Context Projection compatibility passes
G5  retrospective Exposure Knowledge compatibility passes
G6  prospective held-out 3M-3 output is source-grounded and materially useful vs baseline
G7  UNKNOWN / CONFLICT remain fail-closed
G8  narrow and authority-only negatives do not over-trigger
G9  trigger eval for plugin:simcore is reviewed
G10 no product/runtime/release mutation is introduced by the skill
G11 explicit second-scope acceptance review approves validated-scope expansion
```

A mechanical CI PASS alone is insufficient.

---

## 13. Relationship to 3M-3

This review changes the process around the next checkpoint, not the 3M product contract itself.

Recommended ordering:

```text
COMMON-SKILL LANE
freeze SimCore candidate eval / held-out 3M-3 prompt
→ candidate-only skill/eval support
→ run second-scope evaluation
→ decide skill validated-scope promotion separately

SIMCORE PRODUCT LANE
fresh authority
→ 3M-3 read-only impact scope
→ compare/use skill evidence if valid
→ freeze 3M-3 design
→ later implementation authorization
```

Do not make 3M-3 depend on the skill passing. If the skill fails, perform the impact scope manually and preserve the failure as common-skill evidence.

This keeps product progress independent from process-tool experimentation.

---

## 14. Final verdict

```text
PLUGIN_IMPACT_SCOPE_CURRENT_VALIDATED_SCOPE = plugin:usage-dashboard
SIMCORE_SECOND_SCOPE_CANDIDATE              = YES / STRONG
DIRECT_ALLOWLIST_EXPANSION                  = NO
RETROSPECTIVE_SIMCORE_CASES                 = COMPATIBILITY_ONLY
PRIMARY_HELD_OUT_CASE                       = 3M-3 STRUCTURED SIDECAR + VALIDATION
SPLIT_AUTHORITY_HANDLING                    = REQUIRED
COMMON_SKILL_FORK                           = REJECT
PRODUCT_DEPENDENCY_ON_SKILL_PASS            = REJECT
NEXT COMMON-SKILL ACTION                    = FREEZE CANDIDATE-ONLY SIMCORE EVAL DESIGN
SIMCORE PRODUCT AUTHORITY                   = UNCHANGED
RELEASE_SIMCORE                             = UNCHANGED
```

Recommended decision: **promote SimCore from “manual methodology only” to “formal second-scope candidate”, but do not yet call the skill validated for SimCore.**
# SimCore Mode C Context Projection Dependency Trap Corpus - 2026-09-01

Date: 2026-09-01 KST

Status: **ADVERSARIAL FIXTURE CORPUS IMPLEMENTED · 8/8 TRAPS BLOCK BLANKET ACTIVE ROOT_PREFIX_CUT · NO RUNTIME AUTHORITY**

Classification: **CONTEXT PROJECTION · ROOT_PREFIX_CUT · SEMANTIC DEPENDENCY COUNTEREXAMPLES · OFFLINE ONLY**

This document records the next bounded validation step after the static `ROOT_PREFIX_CUT` shadow evaluator.

It does not change the SimCore runtime, `release-simcore`, S7, request construction, persistent state, Evidence, Lineage, Handoff, or the `TAIL_AFTER_CURRENT_USER` contract.

---

## 1. Authority

Primary authority:

- `docs/SIMCORE_MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION_CONTRACT_2026-09-01.md`
- `docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_STATIC_SHADOW_EVALUATOR_2026-09-01.md`
- `products/simcore/tooling/context-projection-shadow-evaluator.mjs`

The frozen contract already states that structural root ownership does not prove semantic independence from pre-root conversation history. It explicitly names implicit older context and character/world continuity as reasons active pruning is not authorized.

This corpus turns that unresolved concern into deterministic adversarial fixtures.

---

## 2. Files

```text
products/simcore/tooling/context-projection-dependency-trap-corpus.mjs
products/simcore/tooling/context-projection-dependency-trap-corpus.test.mjs
docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_DEPENDENCY_TRAP_CORPUS_2026-09-01.md
```

The existing evaluator is consumed unchanged.

No production plugin file is edited.

---

## 3. Question under test

The static evaluator can prove:

```text
pre-root row is ordinary conversation
root/source/current anchors are structurally valid
candidate cut preserves root-to-tail ordering
```

It cannot prove:

```text
the root/source/current answer no longer depends on facts established before root
```

The adversarial question is therefore:

```text
Can a fixture satisfy every current structural eligibility condition
while still requiring one or more rows that ROOT_PREFIX_CUT would remove?
```

If yes, structural eligibility alone is insufficient for blanket active projection.

---

## 4. Corpus oracle model

Each trap fixture supplies a hand-authored semantic oracle:

```text
semanticOracle = PRE_ROOT_REQUIRED
requiredPreRootIndices = [...]
```

The corpus then runs the unchanged static evaluator and checks whether those required indices appear in:

```text
candidateExcludedIndices
```

If at least one required dependency is severed:

```text
dependencySevered = true
activeProjectionDisposition = BLOCK_ACTIVE_PROJECTION
```

A structural false-safe is defined as:

```text
plan.status = ELIGIBLE_SHADOW_PLAN
AND
dependencySevered = true
```

This does not claim the evaluator is buggy. The evaluator correctly labels candidate plans `UNPROVEN_REVIEW_REQUIRED`. The corpus proves why that semantic warning cannot yet be removed.

---

## 5. Eight dependency traps

### 5.1 ENTITY_ALIAS_BINDING

A nickname or alias is defined only before the current root. The root and source use the alias without repeating its referent.

Removing the prefix preserves syntax but loses identity.

### 5.2 USER_CONSTRAINT

A user constraint is established before root, such as a persistent scene boundary. The root says only to continue.

Removing the prefix can silently drop the user's earlier constraint.

### 5.3 WORLD_STATE_CONTINUITY

A world-state fact is established before root, then later decisions refer to the resulting state without restating the cause.

Removing the prefix can change route or state reasoning.

### 5.4 SECRET_LITERAL

An exact fictional literal is supplied before root and later referred to indirectly.

Removing the prefix loses the exact value even though the current source says it used the supplied value.

### 5.5 PRONOUN_ANTECEDENT

Entity roles are bound before root. The root uses a pronoun whose antecedent is not self-contained inside the retained slice.

Removing the prefix leaves an unresolved referent.

### 5.6 EXCEPTION_RULE

A general rule plus one exception is established before root. The root later refers only to the exception.

Removing the prefix can invert or erase the intended rule.

### 5.7 PRIOR_ASSISTANT_DERIVATION

A prior assistant turn contains a derived result that later root/source turns refer to without repeating its exact value.

This demonstrates that dependency is not limited to old user messages.

### 5.8 INVENTORY_STATE

A quantity and state transition occur before root. The current root consumes the remaining state.

Removing the prefix loses the arithmetic/state baseline needed to answer the current question.

---

## 6. Controls

The corpus also contains two controls.

### CONTROL_SELF_CONTAINED_ROOT

There is old conversation before root, but the root fully specifies the new task.

Expected result:

```text
plan.status = ELIGIBLE_SHADOW_PLAN
dependencySevered = false
activeProjectionDisposition = NO_CORPUS_BLOCK
```

Important: `NO_CORPUS_BLOCK` is not active authorization. The underlying evaluator still reports:

```text
activeProjectionAuthorized = false
semanticSafety = UNPROVEN_REVIEW_REQUIRED
```

### CONTROL_NO_PRE_ROOT_CONVERSATION

There is no ordinary conversation prefix before root.

Expected result:

```text
plan.status = ELIGIBLE_NO_REDUCTION
candidateExcludedIndices = []
```

---

## 7. Deterministic regression result

The exact authored corpus and test were executed locally against the existing static evaluator.

Result:

```text
context-projection-dependency-trap-corpus: PASS (8 traps, 2 controls)
```

For all eight trap fixtures:

```text
structural status             = ELIGIBLE_SHADOW_PLAN
semantic oracle               = PRE_ROOT_REQUIRED
required dependency severed   = YES
structuralFalseSafe           = YES
activeProjectionDisposition   = BLOCK_ACTIVE_PROJECTION
```

The two controls remain distinguishable from the traps.

The fixture objects remain unchanged after evaluation.

---

## 8. Main finding

The first semantic test produces a concrete counterexample class to blanket active `ROOT_PREFIX_CUT`.

Frozen conclusion:

```text
STRUCTURAL_ROOT_BOUNDARY
!=
SEMANTIC_SELF_CONTAINMENT_BOUNDARY
```

A valid mapped root can begin a new Lineage task while still relying on conversational state established before that root.

Therefore the current structural eligibility contract is sufficient for shadow measurement, but insufficient for active deletion.

---

## 9. Classification

### BLOCKER

`BLOCKER · ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY`

Blanket active projection using only the current structural conditions must not be authorized.

The blocker is not a production runtime defect. It is a promotion blocker for this Context Projection candidate.

### WATCH

`WATCH · SEMANTIC_ORACLE_IS_HAND_AUTHORED`

The corpus oracle is explicit test authority, not an automatic semantic detector. A future mechanism must not pretend these fixture labels can be inferred reliably from string patterns.

`WATCH · SYNTHETIC_FIXTURES_ARE_NOT_TRAFFIC_FREQUENCY_EVIDENCE`

The corpus proves existence of unsafe cases. It does not measure how often those cases occur in real chats.

### FIX

None required in the existing static evaluator. Its `UNPROVEN_REVIEW_REQUIRED` result is behaving correctly.

### DEFER

```text
real traffic frequency measurement
runtime SHADOW_ONLY observer
automatic semantic dependency detection
active request pruning
A/B/Summary projection
```

---

## 10. What must change before active projection can return

At least one future design must narrow or strengthen eligibility beyond the current structural root boundary.

Possible research directions, not yet authorized implementations:

```text
A. explicit self-contained-root proof supplied by an authoritative owner
B. source/reference provenance proving every current dependency is inside the retained slice
C. a narrower class of roots whose protocol requires full restatement
D. runtime shadow observations plus human/oracle review showing a bounded safe subset
```

Rejected shortcut:

```text
keyword heuristics for "as before", pronouns, names, numbers, or constraints
```

Absence of an obvious dependency marker is not proof of semantic independence.

---

## 11. Runtime and S7 boundaries

This transaction changes:

```text
release-simcore                       = NO
plugins/simcore/latest.js             = NO
plugins/simcore/install.js            = NO
request hook/runtime behavior         = NO
persistent state/schema               = NO
Evidence runtime semantics            = NO
Lineage runtime semantics             = NO
Handoff runtime semantics             = NO
TAIL_AFTER_CURRENT_USER               = NO
S7 candidate/design                   = NO
v0.70.2 / v0.70.3 identity            = NO
```

Only offline tooling, fixtures, regression tests, and documentation are added on `main`.

---

## 12. Next legitimate action

The blanket active candidate is now blocked by semantic counterexamples.

The next Context Projection step should not be runtime pruning.

The safest next research step is:

```text
SELF_CONTAINED_ROOT_PROOF DESIGN
```

Goal:

```text
define whether any existing authoritative SimCore state can prove
that a root/source slice is semantically self-contained
without adding heuristic relevance classification or a second memory system
```

If no such proof can be defined, `ROOT_PREFIX_CUT` should remain shadow/research-only rather than being forced into production.

---

## 13. Final state

```text
MODE_C_PROJECTION_CONTRACT              = DESIGN_FROZEN
OFFLINE_STATIC_SHADOW_EVALUATOR         = IMPLEMENTED
DEPENDENCY_TRAP_CORPUS                   = IMPLEMENTED
DEPENDENCY_TRAP_REGRESSION               = PASS
TRAP_CASES                               = 8
CONTROL_CASES                            = 2
STRUCTURAL_FALSE_SAFE_TRAPS              = 8 / 8
BLANKET_ACTIVE_ROOT_PREFIX_CUT           = BLOCKED
BLOCKER                                  = ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY
PRODUCTION_CHANGE                        = NONE
RUNTIME_CHANGE                           = NONE
S7_CHANGE                                = NONE
NEXT                                     = SELF_CONTAINED_ROOT_PROOF_DESIGN
```

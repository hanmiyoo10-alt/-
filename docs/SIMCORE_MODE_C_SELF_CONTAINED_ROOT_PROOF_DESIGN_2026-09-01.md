# SimCore Mode C Self-Contained Root Proof Design — 2026-09-01

Date: 2026-09-01 KST

Status: **DESIGN FROZEN · NO EXISTING SELF-CONTAINMENT PROOF OWNER · BLANKET ACTIVE ROOT_PREFIX_CUT REMAINS BLOCKED**

Classification: **CONTEXT PROJECTION · SEMANTIC CLOSURE FEASIBILITY · NEGATIVE DESIGN RESULT · NO RUNTIME AUTHORITY**

Working identifier:

```text
SELF_CONTAINED_ROOT_PROOF
```

This document answers the next question created by the Mode C dependency-trap corpus:

```text
Can any current authoritative SimCore state prove that the retained
root/source/current slice is semantically self-contained from all
ordinary conversation rows before the root?
```

Frozen answer:

```text
NO, not for any ROOT_PREFIX_CUT that would actually remove pre-root conversation.
```

Current SimCore can prove source identity and request mapping. It does not own a complete semantic dependency graph over arbitrary conversational facts. Therefore it cannot convert structural eligibility into a sound absence proof without inventing a new semantic authority.

This is a design result, not a production defect.

---

## 1. Authority

Primary design inputs:

- `docs/SIMCORE_MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION_CONTRACT_2026-09-01.md`
- `docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_STATIC_SHADOW_EVALUATOR_2026-09-01.md`
- `docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_DEPENDENCY_TRAP_CORPUS_2026-09-01.md`
- `docs/REPOSITORY_COMMON_RULES.md`
- exact deployed SimCore runtime on `release-simcore`

Current production authority at design time:

```text
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release branch  = release-simcore
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

The current release branch was freshly re-read for Lineage, Handoff, Evidence and v0.70.0 Current Task Primacy behavior before freezing this design.

`main/plugins/simcore/*` is not deployment authority.

---

## 2. Why this proof is needed

The static shadow evaluator proves only structural facts:

```text
root/source/current anchors are valid
pre-root rows are ordinary conversation
protected rows remain in order
```

The dependency-trap corpus proved that all those facts may be true while current behavior still depends on a pre-root fact.

Eight deterministic counterexample classes currently exist:

```text
ENTITY_ALIAS_BINDING
USER_CONSTRAINT
WORLD_STATE_CONTINUITY
SECRET_LITERAL
PRONOUN_ANTECEDENT
EXCEPTION_RULE
PRIOR_ASSISTANT_DERIVATION
INVENTORY_STATE
```

Therefore an active deletion gate would need a stronger fact:

```text
NO semantic dependency required by the current root/source/current task
exists exclusively in the candidate-excluded pre-root conversation prefix.
```

That is an absence proof, not merely another anchor check.

---

## 3. Minimum sound proof contract

For a candidate active `ROOT_PREFIX_CUT`, a sound `PROVEN_SELF_CONTAINED` result would require all of the following.

### 3.1 Dependency completeness

The proving authority must know every semantic dependency that may affect the current answer, including arbitrary facts introduced by either user or assistant conversation.

Examples include:

```text
entity identity / alias binding
user constraints
fictional literals
state transitions
quantities / inventory
exceptions
pronoun antecedents
prior derived values
relationship/world continuity
explicit reuse / comparison context
```

### 3.2 Source coverage

For each required dependency, the authority must prove at least one retained source exists in:

```text
protected non-conversation context
OR
root-to-current retained conversation slice
```

It is insufficient to prove that the current source assistant exists.

### 3.3 Absence, not failure-to-detect

The result must mean:

```text
all relevant dependencies are covered
```

It must not mean:

```text
no dependency keyword was noticed
no pronoun was noticed
no number was noticed
no obvious continuation phrase was noticed
```

### 3.4 Authority provenance

The proof must come from an owner authorized to make the semantic claim. A derived diagnostic, hash, prompt hint, classifier score or best-effort heuristic cannot silently become semantic truth.

### 3.5 Fail closed

Any uncertainty must produce:

```text
UNPROVEN_KEEP_PREFIX
```

not active deletion.

---

## 4. Current owner inventory

Fresh production inspection yields the following ownership boundary.

### 4.1 Lineage

Owns:

```text
request root / parent / depth tracking
sourceKind
recent A/B source indices
```

Current normalized Lineage state includes structural fields such as:

```text
rootMode
rootIndex
parentMode
parentIndex
depth
inlineSource
sourceKind
lastRequestMode
lastRequestIndex
transitionFrom
recentSources
```

Explicit non-owner:

```text
source importance
response content
```

Conclusion:

```text
Lineage proves WHERE the current lineage begins.
Lineage does not prove WHAT older semantic facts the lineage still depends on.
```

### 4.2 Handoff

Owns:

```text
short-C source/parent-shift detection
bounded registry
same/new source observation
```

Current facts include:

```text
request hash / normalized length
root/parent/depth identity
prior root/parent/depth
newSource / same source
parentShift
```

Explicit non-owner:

```text
semantic source selection
reaction content
```

Conclusion:

```text
Handoff proves source-transition structure.
It does not enumerate semantic dependencies inside or outside the source.
```

### 4.3 Evidence

Owns:

```text
authoritative request-message resolution
safe request-only root/source fencing
```

It can map raw root/source authority into request rows and distinguish safe `DUAL` vs weaker dispositions.

Explicit non-owner:

```text
semantic interpretation
summarization
history search
storage
creative generation
```

Conclusion:

```text
Evidence proves WHICH request rows correspond to the authoritative root/source.
It cannot prove that those rows contain every fact needed by the current task.
```

### 4.4 Recurrence

Owns request-template recurrence and bounded registry.

Explicit non-owner:

```text
source meaning
response composition
```

A repeated/non-repeated request hash therefore cannot establish semantic closure.

### 4.5 Domain state owners

Time, Frame, Reaction, Community and other domain owners preserve specific canonical facts inside their own contracts.

Those owners may cover individual dependency classes, for example a canonical clock or reaction maximum, but they do not cover arbitrary conversational facts.

A sound global self-containment proof cannot infer:

```text
all uncaptured semantic facts are irrelevant
```

merely because some domain facts are canonicalized.

### 4.6 Current Task Primacy Guard

v0.70.0 explicitly makes the current user input the primary current-task authority while retaining prior assistant output as:

```text
continuity / reference context
```

This prevents completed-task replay. It does not declare prior conversation semantically irrelevant.

In fact this contract is positive evidence against treating task primacy as history self-containment proof.

---

## 5. Capability gap

Current SimCore has authoritative structural ownership but no authoritative general semantic dependency owner.

Missing capability:

```text
arbitrary conversation fact
    ↓
identity/provenance
    ↓
current-task dependency edge
    ↓
retained-source coverage proof
```

No current persistent state, request-scoped evidence result or domain owner provides that complete graph.

The dependency-trap corpus demonstrates that the missing edges are not theoretical.

Therefore:

```text
STRUCTURAL SOURCE PROOF
+
REQUEST MAPPING PROOF
!=
SEMANTIC CLOSURE PROOF
```

---

## 6. Frozen proof dispositions

For the current architecture, use only these conceptual dispositions.

### `NO_REDUCTION_NEEDED`

There is no ordinary pre-root conversation prefix to remove.

This is safe but produces no Context Projection gain.

### `UNPROVEN_KEEP_PREFIX`

A candidate pre-root conversation prefix exists, but current authority cannot prove semantic independence.

Required action:

```text
keep original request history
```

This is the required disposition for every current active `ROOT_PREFIX_CUT` candidate.

### `PROVEN_SELF_CONTAINED`

Reserved for a future explicitly authorized proof source.

Current production has no owner allowed to emit this disposition.

Therefore at design freeze:

```text
PROVEN_SELF_CONTAINED reachable = NO
```

for any non-empty active `ROOT_PREFIX_CUT`.

---

## 7. Rejected proof substitutes

The following mechanisms are explicitly insufficient.

### 7.1 Keyword/anaphora heuristics

Rejected examples:

```text
"as before"
pronoun detection
name detection
number detection
continuation keywords
constraint keywords
```

False negatives are enough to make active deletion unsound.

### 7.2 LLM semantic classifier

An auxiliary model saying “self-contained” is an inference, not authoritative absence proof.

It would also add a new cost/failure/cache surface and a second semantic decision path.

Not authorized.

### 7.3 Embedding / similarity threshold

Low similarity does not prove absence of exact dependency, identity binding, exception or literal reuse.

Not authority.

### 7.4 Source assistant text inspection alone

A source can omit facts it relies on. All eight trap classes can preserve fluent source text while depending on older context.

### 7.5 Root user text inspection alone

A root may say “continue”, use an alias, consume prior state or reference an exception without restatement.

### 7.6 Current Task Primacy

Primary task authority is not semantic closure authority.

### 7.7 Existing canonical domain state union

Known domain state does not prove absence of uncaptured conversational facts.

### 7.8 Hand-authored fixture oracle in runtime

The dependency-trap corpus labels are regression-test authority only. They are not an automatic production detector.

---

## 8. Why a new generic semantic-memory subsystem is not the answer

One possible reaction would be to create a global semantic ledger that records every conversational fact and dependency.

This design rejects that as the immediate repair.

Reasons:

```text
large new authority surface
new persistence/migration lifecycle
hard semantic completeness problem
reroll/edit invalidation burden
potential conflict with existing canonical owners
new model or extraction cost likely
high blast radius relative to the original optimization goal
```

It would violate the bounded intent of the first Context Projection candidate and risk turning a prompt-reduction experiment into a second memory architecture.

The LightBoard research explicitly warned against derived sidecars becoming competing canonical truth.

---

## 9. Safe future research directions

The negative result does not prohibit Context Projection forever. It narrows what could safely reopen active reduction.

### A. Protocol-declared self-contained operation

A future explicitly reviewed request protocol could define a narrow operation whose contract requires all task inputs to be present in the retained source/root payload.

This must be an actual protocol invariant, not a heuristic guess.

### B. Explicit user-owned reset / independence declaration

A future user-visible contract could allow an explicit request to treat a new task as independent of prior ordinary conversation.

This would be opt-in authority, not automatic semantic inference. Exact UX/semantics are not designed here.

### C. Source-local canonical payload with complete ownership

If a future feature already owns a complete structured source payload and the generation contract forbids dependency on earlier ordinary conversation, that bounded feature may define its own projection proof.

This is feature-local, not a generic chat-history inference engine.

### D. Keep ROOT_PREFIX_CUT as shadow measurement only

Shadow statistics remain useful for understanding theoretical reduction opportunity even if active deletion never ships.

No shadow metric may be promoted into semantic safety evidence by itself.

---

## 10. Promotion gate for any future proof source

A future amendment may reopen `PROVEN_SELF_CONTAINED` only if all of these are true:

```text
1. one explicit semantic owner exists
2. its completeness contract is bounded and reviewable
3. source provenance is explicit
4. reroll/edit/source replacement invalidation is defined
5. UNKNOWN fails closed to KEEP
6. dependency-trap corpus passes without false-safe active authorization
7. negative controls prove the proof is not permanently disabled
8. baseline vs projected behavior is compared
9. production request ordering and TAIL_AFTER_CURRENT_USER remain preserved
10. separate implementation/release authority is granted
```

A statistical success rate is not sufficient to weaken an absence-proof requirement for ordinary automatic pruning.

---

## 11. Effect on current Context Projection line

Frozen state after this design:

```text
ROOT_PREFIX_CUT structural planner          = VALID SHADOW TOOL
ROOT_PREFIX_CUT semantic safety             = UNPROVEN
blanket active ROOT_PREFIX_CUT              = BLOCKED
current self-contained proof owner          = NONE
current active proof disposition            = UNPROVEN_KEEP_PREFIX
runtime shadow observer                     = OPTIONAL RESEARCH, NOT SAFETY PROOF
new semantic-memory subsystem               = NOT AUTHORIZED
```

The original candidate is not considered a failed experiment. It successfully exposed the exact missing authority required for safe active projection.

---

## 12. Classification

### BLOCKER

`BLOCKER · ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY`

Remains open for blanket active promotion.

### DESIGN FINDING

`NO_EXISTING_PROOF_OWNER`

No current SimCore owner can soundly emit `PROVEN_SELF_CONTAINED` for a non-empty pre-root cut.

### WATCH

`WATCH · DOMAIN_STATE_COVERAGE_IS_PARTIAL`

Canonical domain owners may cover specific facts but must not be mistaken for complete conversational semantic coverage.

`WATCH · SHADOW_SUCCESS_IS_NOT_SAFETY_PROOF`

A high rate of apparently harmless shadow cuts in future observations would be frequency evidence only, not semantic absence proof.

### FIX

None required in production.

### DEFER

```text
runtime shadow observer
real traffic frequency study
protocol-declared self-contained operation
explicit reset/independence UX
feature-local complete source payloads
active request pruning
```

---

## 13. Runtime / release / S7 boundaries

This design changes:

```text
release-simcore                       = NO
plugins/simcore/latest.js             = NO
plugins/simcore/install.js            = NO
request hook/runtime behavior         = NO
persistent state/schema               = NO
Evidence runtime semantics            = NO
Lineage runtime semantics             = NO
Handoff runtime semantics             = NO
Recurrence runtime semantics          = NO
TAIL_AFTER_CURRENT_USER               = NO
S7 candidate/design                   = NO
v0.70.2 / v0.70.3 identity            = NO
```

No implementation authority is granted.

---

## 14. Next legitimate Context Projection action

The first automatic active reduction path has reached a principled stop.

Do not keep adding semantic guesses to rescue `ROOT_PREFIX_CUT`.

The next reasonable choices are separate research/design transactions:

```text
A. leave Context Projection parked at SHADOW_ONLY and move to the next DESIGN_READY candidate,
   Exposure Knowledge Contract

or

B. separately design an explicit protocol-declared self-contained operation
   if a concrete product use-case justifies it.
```

Default recommendation:

```text
PARK ROOT_PREFIX_CUT AS SHADOW_ONLY
MOVE TO EXPOSURE KNOWLEDGE CONTRACT
```

Reason: the current blocker is an authority gap, not a missing small check.

---

## 15. Final state

```text
SELF_CONTAINED_ROOT_PROOF_DESIGN        = FROZEN
EXISTING_PROOF_OWNER                    = NONE
PROVEN_SELF_CONTAINED_CURRENTLY         = UNREACHABLE FOR NON-EMPTY CUT
ACTIVE_DISPOSITION                      = UNPROVEN_KEEP_PREFIX
ROOT_PREFIX_CUT_SHADOW                  = RETAIN
BLANKET_ACTIVE_ROOT_PREFIX_CUT          = BLOCKED
NEW_SEMANTIC_MEMORY                     = NOT_AUTHORIZED
PRODUCTION_CHANGE                       = NONE
RUNTIME_CHANGE                          = NONE
S7_CHANGE                               = NONE
RECOMMENDED_NEXT                        = EXPOSURE_KNOWLEDGE_CONTRACT
```

# SimCore Deterministic State Support Architecture — 2026-09-07

Status: `DESIGN DISCOVERY · UMBRELLA CONTRACT · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`

Tracking: #1768

Related:
- #1763 Temporal Awareness / Narrative Time Model
- #1765 Deterministic Derived-State Arithmetic
- `docs/SIMCORE_TEMPORAL_AWARENESS_IDEA_2026-09-07.md`
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md`
- `config/simcore-architecture-v2.json`

Production authority at design time:

```text
production version = 0.70.10
release branch      = release-simcore
release commit      = ecc55f026315c6482c34d267aba2adb97527cdbc
main design base    = 43bda35ff30298bc287ee3ed3b5fd2a0947b7c2d
```

## 1. Why this program exists

SimCore grew from two recurring main-model failures:

1. deterministic numeric progression drifted or stopped advancing even when the rule was simple;
2. mode-specific rules were repeatedly missed when the main model had to self-police them from prose instructions.

Temporal Awareness exposed the broader common cause. Long chats repeatedly ask the main model to reconstruct facts that should instead be mechanically preserved, calculated, or validated.

The product goal is not to create a second creative model or a general world simulator.

The product split is:

```text
facts / explicit rules / deterministic transitions
→ SimCore preserves, derives and validates

interpretation / emotion / creative choice / scene rendering
→ Main Model owns
```

And the projection rule is equally important:

```text
SimCore may know much more internally than it tells the Main Model.
```

## 2. Core principles

### P1. Move reproducible correctness work out of free-form generation

If one answer is reproducible from canonical inputs plus explicit rules, prefer a deterministic domain function over repeated model arithmetic/reasoning.

Examples:
- birth date + narrative date -> age;
- base count + committed deltas -> current count;
- explicit item transfer -> current holder;
- explicit prerequisite facts -> eligibility;
- current narrative head + explicit duration -> new narrative date/time.

### P2. Derived facts are not independent authority

Prefer canonical anchors and recomputation.

```text
birthDate + currentNarrativeDate -> age
```

is safer than trusting a separately maintained age number when age can always be derived.

### P3. UNKNOWN stays UNKNOWN

No hidden precision invention.

```text
잠시 후
```

must not silently become `+5 minutes`.

If deterministic inputs are insufficient, return UNKNOWN/AMBIGUOUS or leave interpretation to the model.

### P4. Commit is the mutation boundary

```text
candidate proposal != committed state
```

Generated-but-discarded candidates must never become the next canonical base.

This invariant applies to reroll, edit, regeneration, reload and representation reconciliation.

### P5. Prompt projection is sparse and semantic

Do not inject:
- raw event ledgers;
- generation IDs;
- diagnostic receipts;
- provenance internals;
- whole world-state dumps;
- facts that are only potentially useful.

### P6. Existing semantic ownership remains intact

Do not collapse everything into one `worldState` owner.

Current architecture boundaries remain constitutional:

```text
Time
= temporal semantics

Lifecycle
= mode / broadcast lifecycle / request preparation

Lineage
= request root / parent / depth

State Reconcile
= state assembly/reconciliation composition
!= new domain owner

Structure
= validation / commit-safety judge
!= semantic calculation or repair owner

Output Finalize
= accepted prepared-output -> committed state/content transaction

Edit Reconcile
= edit reconciliation/application coordination

Prompt
= semantic projection serialization
!= semantic state owner

Store / Session
= persistence / holder / sequencing mechanics
!= permission to invent semantic transitions
```

## 3. Umbrella architecture decision

The first implementation should **not** create a global Derived-State Engine module.

Use a cross-module contract that existing/future domain owners implement locally:

```text
AUTHORITATIVE INPUTS
    ↓
DOMAIN PROPOSAL
    ↓
DETERMINISTIC DERIVATION
    ↓
DOMAIN CONSTRAINT ASSESSMENT
    ↓
STRUCTURE COMMIT-SAFETY JUDGMENT
    ↓
OUTPUT FINALIZE EXACT-ONCE COMMIT
    ↓
COMPACT CANONICAL STATE
    ↓
RELEVANCE-FILTERED PROJECTION
    ↓
PROMPT SERIALIZATION
```

The shared part is the transaction shape and invariants, not necessarily one physical implementation module.

A generic helper becomes justified only after multiple domains prove actual duplicated code/contract pressure.

## 4. State/fact classes

Use conceptual classes instead of one undifferentiated world database.

### 4.1 Anchor facts

Stable or slowly changing authoritative inputs.

Examples:
- birth date;
- capacity limit;
- explicit identity/alias mapping;
- explicit relationship topology;
- rule threshold;
- narrative date anchor.

### 4.2 Mutable canonical facts

Facts changed by accepted transitions.

Examples:
- current narrative head;
- current quantity;
- item holder;
- object condition;
- scene presence;
- quest stage;
- explicit visibility/exposure state.

### 4.3 Derived facts

Recomputed from canonical inputs.

Examples:
- age;
- remaining capacity;
- elapsed interval;
- cooldown ready/not-ready;
- eligibility;
- relative order;
- bounded current balance/count.

Derived facts should normally be computed views/cache results, not a second source of truth.

### 4.4 Constraint facts

Deterministic invariants used to identify impossible or unauthorized states.

Examples:
- quantity cannot become negative when the rule forbids it;
- destroyed object cannot be used as intact without repair/replacement;
- present narrative head cannot regress without source-backed retrospective context;
- mutually exclusive committed branches cannot both be canonical;
- private `<Knowledge>` content is not automatically public Community knowledge.

### 4.5 Projection facts

Ephemeral, relevance-filtered semantic summaries for the current generation.

Projection facts are not persisted as new authority.

## 5. Two-stage proposal model

One turn may contain deterministic evidence in both the current request and the generated output.

### 5.1 Request proposal

Derived from the current authoritative user/request evidence plus committed state.

Examples:
- user says `three days later`;
- user explicitly transfers an object;
- current mode activates an existing deterministic rule lane.

The proposal belongs in the bounded current-turn working set and may affect the current prompt when the domain contract allows it.

### 5.2 Output proposal

Derived from already-contractual structured/canonical output surfaces.

Examples:
- canonical narrative timestamp line;
- future domain-specific bounded state token if explicitly designed;
- existing structured Broadcast/Community/Knowledge facts where semantics are already defined.

### 5.3 Final commit

Output Finalize composes owner-approved results exactly once after commit-safety judgment.

```text
committed base
+ current request proposal
+ accepted output proposal
= next committed state
```

A discarded output proposal never becomes the base for reroll replacement.

## 6. Evidence acquisition is the hard boundary

The difficult part is not arithmetic. It is proving what state transition actually occurred.

### Strong evidence candidates

- explicit user/configured canonical facts;
- existing SimCore structured/canonical surfaces;
- owner-produced pending facts;
- output structures whose semantics are already contractually defined;
- deterministic history bootstrap under an approved migration contract.

### Weak evidence

Free-form model prose may contain:
- claims;
- jokes;
- metaphors;
- speculation;
- flashbacks;
- mistakes;
- hypothetical branches.

Therefore:

```text
free prose claim
!= automatic canonical state mutation
```

This umbrella architecture does not authorize broad Korean/English NLP extraction from arbitrary prose.

If a transition cannot be established deterministically, leave it to the model or keep it UNKNOWN.

## 7. Constraint checking without owner collapse

Structure remains judge-only.

Correct pattern:

```text
Domain owner computes/detects deterministic condition
→ returns bounded assessment
→ Structure incorporates the assessment into commit-safety judgment
```

Structure must not become a semantic parser or repair engine.

Possible generic assessment family:

```text
PASS
UNKNOWN
AMBIGUOUS
CONFLICT
UNAUTHORIZED_TRANSITION
```

Domain-specific labels may extend this where necessary, such as Temporal `RETROSPECTIVE_ALLOWED`.

## 8. Prompt projection contract

Projection should behave like a sparse pull, not a database dump.

Priority:

1. hard current-mode/current-output constraints;
2. facts directly referenced by the current request;
3. facts needed to avoid a deterministic contradiction in the active scene;
4. compact continuity anchors with immediate relevance;
5. everything else omitted.

Possible semantic projection:

```text
Temporal: current narrative date 2031-03-07; A is 22.
State: key holder B; north door locked.
Knowledge: C does not know the culprit identity.
```

Only emit lines that matter to the current generation.

Internal provenance/certainty/lineage can be richer than the prompt representation.

Hard byte/line/fact budgets belong to the bounded implementation design after prompt-cache impact analysis.

## 9. T1 — Temporal Awareness first

Temporal is the first bounded implementation candidate because SimCore already has a real Time owner and a permanent `narrative-clock` regression family.

Extend Time rather than creating a parallel temporal owner.

Target capabilities:
- current narrative date/time head;
- exact date/time arithmetic;
- age-at-date from birth date;
- birthday crossing;
- elapsed interval;
- exact/range/relative/unknown precision;
- event-local/flashback time without regressing the present head;
- reroll/edit/reload-safe commit semantics;
- Broadcast / Mode C handoff compatibility;
- no turn-count-as-time inference.

Current Temporal design authority is #1763 plus `docs/SIMCORE_TEMPORAL_AWARENESS_IDEA_2026-09-07.md`.

## 10. N1 — Numeric progression pilot second

Select one bounded deterministic numeric family reflecting the original SimCore failure: a value should repeatedly increase/decrease according to explicit events but the main model drifts or stops updating it.

Candidate state form:

```text
canonical checkpoint/base
+ bounded committed deltas
-> current value
```

Required proof:
- repeated increments never stall;
- discarded candidate does not increment;
- reroll does not double-increment;
- semantic edit changes the value exactly once;
- representation-only edit leaves it unchanged;
- reload restores the same committed result;
- invalid/ambiguous delta remains unresolved;
- prompt projects the numeric fact only when relevant.

Do not create a generic arithmetic module until T1 + N1 demonstrate shared implementation pressure.

## 11. S1 — One discrete-state pilot third

Choose one narrow explicit non-numeric state family.

Good candidates:
- object custody/holder;
- object lifecycle/condition;
- scene presence.

Example:

```text
key holder A
→ explicit transfer A -> B
→ committed key holder B
```

This can prove non-numeric transition/constraint semantics without attempting a universal world simulator.

## 12. E1 — Exposure / knowledge integration

Do not create a competing generic epistemic owner.

Reuse the existing Exposure Knowledge program and its narrow-first strategy.

Current product invariant already distinguishes:

```text
MODEL / WORLD MAY KNOW
!=
CHARACTER OR COMMUNITY MAY KNOW
```

Initial deterministic scope should remain source-backed:
- explicit public/private/exposed classification where an existing contract proves it;
- known-by edges only after an explicit witness/tell/exposure contract exists;
- no `model knows -> character knows` upgrade;
- no rumor/speculation -> truth upgrade.

## 13. When a shared derived-state helper becomes justified

Only consider a shared `derived-state` / `constraint` helper after at least two independent domains prove the same reusable mechanics.

Candidate shared mechanics might eventually include:
- compact proposal/assessment envelope shape;
- certainty/UNKNOWN vocabulary;
- bounded provenance identity helpers;
- exact-once delta application helpers;
- projection relevance descriptor shape.

But semantic formulas/transitions remain domain-owned.

Rule:

```text
REUSE > EXTEND > COMPOSE >> NEW
```

## 14. What must not be built first

Do not begin with:
- giant `worldState` JSON;
- unbounded event sourcing;
- generic symbolic reasoning engine;
- arbitrary prose semantic extraction;
- personality/emotion/trust scoring;
- universal per-character knowledge inference;
- automatic scene simulation;
- every remembered fact injected every turn;
- Structure-owned repair;
- Prompt-owned semantic decisions;
- State Reconcile-owned domain semantics.

These would add more complexity and token pressure than correctness value.

## 15. Bounded persistence direction

Prefer compact per-domain canonical snapshots plus only the bounded provenance/transition tail needed for reconciliation.

Examples:

```text
Temporal
= current head + precision + bounded transition provenance

Numeric
= checkpoint/current value + bounded last accepted transition receipt where needed

Object state
= current holder/condition + bounded last accepted transition receipt
```

Do not persist raw user/assistant prose as an unbounded semantic ledger.

Any new persistent field requires a separate versioned schema/migration design.

## 16. Cross-domain reroll/edit/reload invariants

Permanent regressions must prove:

1. discarded candidate never mutates canonical state;
2. reroll starts from the same committed base;
3. no deterministic delta is applied twice;
4. representation-only edit preserves semantic state;
5. semantic edit is reclassified/rebuilt exactly once;
6. reload restores the same canonical state and required bounded provenance;
7. stale prior-mode/domain diagnostic evidence cannot become current semantic authority;
8. UNKNOWN/relative state never becomes falsely exact after reload/reconcile;
9. equivalent canonical state produces equivalent semantic projection regardless of representation provenance.

## 17. Architecture decision summary

```text
NEW GLOBAL ENGINE                         = REJECTED FOR FIRST IMPLEMENTATION
CROSS-MODULE DETERMINISTIC-STATE CONTRACT = PREFERRED
TIME EXTENSION FIRST                       = PREFERRED
NUMERIC PILOT SECOND                       = PREFERRED
DISCRETE PILOT THIRD                       = PREFERRED
EXPOSURE/KNOWLEDGE                         = REUSE EXISTING PROGRAM
GENERIC DERIVED-STATE MODULE               = DEFER UNTIL MULTI-DOMAIN EVIDENCE
GENERIC WORLD-STATE DB                     = REJECTED
UNBOUNDED LEDGER                           = REJECTED
PROMPT MINIMALISM                          = REQUIRED
COMMIT / LINEAGE SAFETY                    = REQUIRED
```

## 18. Current classification

```text
program: SIMCORE_DETERMINISTIC_STATE_SUPPORT
state: DESIGN DISCOVERY / UMBRELLA CONTRACT
implementation authority: NONE
release impact: NONE
first bounded candidate: TEMPORAL AWARENESS T1
second bounded candidate: NUMERIC PROGRESSION N1
third bounded candidate: DISCRETE STATE S1
```

## 19. Next design transactions

1. Map current production Time APIs/state fields/current Prompt projection exactly and write the T1 ownership impact scope.
2. Define Temporal schema/state delta only after that ownership map.
3. Expand deterministic Temporal fixtures before runtime implementation.
4. Select one concrete N1 progression use case from the original long-chat failure pattern.
5. After T1 + N1 design evidence, re-evaluate whether a shared helper is justified or domain-local code is still simpler.

No runtime implementation is authorized by this document.

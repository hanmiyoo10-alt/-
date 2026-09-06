# SimCore Deterministic State Support Architecture — 2026-09-07

Status: `DESIGN DISCOVERY · UMBRELLA CONTRACT · NO IMPLEMENTATION AUTHORITY · NO RUNTIME/VERSION CHANGE`

Related:
- #1763 Temporal Awareness / Narrative Time Model
- #1765 Deterministic Derived-State Arithmetic
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md`
- `config/simcore-architecture-v2.json`

Production authority at design time:

```text
production version = 0.70.10
release branch      = release-simcore
release commit      = ecc55f026315c6482c34d267aba2adb97527cdbc
main design base    = 9b82b76812699bab7db46583318c00367181b920
```

## 1. Why this exists

SimCore originally grew from two recurring model failures:

1. deterministic numeric progression drifted or stopped advancing even when the rules were simple;
2. mode-specific rules were repeatedly missed when the main model had to self-police them from prose instructions.

Temporal Awareness exposed the broader class of the same problem: many facts that should be mechanically preserved, calculated, or validated are still repeatedly reconstructed by the main model from long-chat prose.

The goal is not to make SimCore a second creative model or a general world simulator.

The goal is:

```text
facts / explicit rules / deterministic transitions
→ SimCore preserves, derives and validates

interpretation / emotion / creative choice / scene rendering
→ Main Model owns
```

Prompt projection remains intentionally sparse:

```text
SimCore may know much more internally than it tells the Main Model.
```

## 2. Product principles

### P1. Deterministic work leaves the model when practical

If a value or logical state has one reproducible answer from canonical inputs and explicit rules, prefer computing it outside free-form generation.

Examples:
- birth date + narrative date -> age;
- baseline count + committed increments/decrements -> current count;
- explicit transfer -> current holder;
- committed exposure event -> known-by/public subset where the exposure rule is explicit;
- prerequisite facts -> eligibility;
- current narrative head + explicit duration -> new narrative date/time.

### P2. Derived values are not independent authority

Prefer canonical anchors over fragile repeated derived values.

```text
birthDate + currentNarrativeDate -> age
```

is preferred over persistently trusting a manually updated `age` field when the age can always be recomputed.

Likewise, when a compact checkpoint plus bounded transition tail can reproduce a value, do not maintain an unbounded event ledger merely to look complete.

### P3. UNKNOWN remains UNKNOWN

No hidden precision invention.

```text
잠시 후
```

must not silently become `+5 minutes`.

Ambiguous semantic interpretation belongs to the model or remains unresolved.

### P4. Commit is the canonical mutation boundary

Generated-but-discarded candidates must not become canonical state.

Reroll, edit, regeneration, reload and representation reconciliation must preserve the rule:

```text
candidate proposal != committed state
```

A rerolled candidate that proposed `+1` must not cause the replacement candidate to start from `+1` unless that earlier proposal was canonically committed.

### P5. Minimal semantic projection

Prompt should receive only current-turn relevant, compact semantic facts and constraints.

Do not inject:
- raw event ledgers;
- generation IDs;
- diagnostic receipts;
- provenance internals;
- whole world-state dumps;
- facts that are merely potentially useful.

### P6. No semantic owner collapse

The architecture remains module-owned.

Do not turn State Reconcile, Structure, Prompt, Session or a new global state blob into owners of every semantic domain.

## 3. Existing architecture constraints

Current architecture already provides the correct seams:

```text
Time
= timestamp/calendar/narrative-clock/world-year authority

Lifecycle
= mode/broadcast/request-preparation authority

Lineage
= request root/parent/depth authority

State Reconcile
= portable-state assembly/reconciliation composition
!= new domain semantic owner

Structure
= integrity/commit-safety judge
!= semantic repair/calculation owner

Output Finalize
= prepared-output -> committed-state/content transaction composer

Edit Reconcile
= edit reconciliation/application coordination

Prompt
= semantic projection serialization
!= semantic state owner

Store / Session
= persistence/holder/sequencing mechanics
!= permission to invent semantic transitions
```

Therefore the new design should be a **cross-module deterministic-state contract**, not one giant new engine.

## 4. Proposed contract: domain-owned deterministic state

Each participating domain should conceptually provide the same bounded lifecycle without surrendering semantic ownership.

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
OUTPUT FINALIZE COMMIT
    ↓
COMPACT CANONICAL STATE
    ↓
RELEVANCE-FILTERED PROJECTION
    ↓
PROMPT SERIALIZATION
```

No requirement exists for every domain to use identical physical code.

The commonality is the transaction shape and invariants.

## 5. Fact classes

Use conceptual classes rather than one undifferentiated `worldState` object.

### 5.1 Anchor facts

Stable or slowly changing authoritative inputs.

Examples:
- birth date;
- capacity limit;
- canonical identity/alias mapping;
- explicit relationship topology;
- rule thresholds;
- scene/world date anchor.

### 5.2 Mutable canonical facts

Facts changed by accepted transitions.

Examples:
- current narrative head;
- item holder;
- current quantity;
- door open/closed/broken state;
- current presence set;
- current quest stage;
- explicit exposure/knowledge edge where deterministically established.

### 5.3 Derived facts

Recomputed from anchors/mutable facts.

Examples:
- age;
- remaining capacity;
- elapsed interval;
- ready/not-ready;
- eligibility;
- relative order;
- current balance/count when a bounded deterministic source is available.

Derived facts should normally be projection/cache results, not new independent truth.

### 5.4 Constraint facts

Deterministic invariants used to detect impossible combinations or unauthorized transitions.

Examples:
- quantity cannot become negative under the active rule;
- destroyed item cannot be used as intact unless a repair/replacement event exists;
- a current narrative head must not regress without a source-backed retrospective context;
- incompatible branch states cannot both be canonical;
- Community cannot upgrade private `<Knowledge>` content to public knowledge merely because the model can see it.

### 5.5 Projection facts

Ephemeral current-turn semantic summaries chosen for the model.

They are not persisted as new authority.

## 6. Two-stage proposal model

A turn may contain deterministic state evidence from both the current user request and the generated output.

Use two conceptual proposal phases:

### 6.1 Request proposal

Derived from current authoritative request evidence and existing state.

Examples:
- user explicitly says `three days later`;
- user explicitly transfers an item;
- current mode activates a known rule lane.

This belongs in the bounded pending/request working set and may influence the current prompt when the existing owner contract supports it.

It is not yet a durable duplicate mutation.

### 6.2 Output proposal

Derived from explicit/canonical output surfaces after generation.

Examples:
- canonical narrative timestamp line;
- explicit bounded state token if a future domain contract defines one;
- existing structured Broadcast/Community/Knowledge envelope facts.

### 6.3 Final commit

Output Finalize composes owner-approved results exactly once after commit-safety checks.

This preserves reroll/edit behavior:

```text
base committed state
+ current request proposal
+ accepted current output proposal
= new committed state
```

A discarded output proposal never becomes the base for the replacement generation.

## 7. Evidence acquisition boundary

The hardest part of broad deterministic state is not arithmetic. It is deciding what event actually happened.

Authority order should be conservative.

### Strong sources

- explicit user/configured canonical facts;
- existing SimCore structured/canonical surfaces;
- existing owner-produced pending facts;
- explicit output structures whose semantics are already contractually defined;
- deterministic history bootstrap under an approved migration contract.

### Weak sources

Free-form model prose may contain claims, implications, jokes, metaphor, speculation, flashbacks or errors.

Therefore:

```text
free prose claim
!= automatic canonical state mutation
```

A future parser may classify narrow, high-precision structured patterns, but this architecture does not authorize general NLP extraction from arbitrary prose.

When SimCore cannot deterministically establish the transition, leave it to the model or mark it UNKNOWN.

## 8. Constraint checking boundary

Structure must remain judge-only.

The pattern should be:

```text
Domain owner detects / computes deterministic issue
→ returns bounded assessment receipt
→ Structure incorporates it into commit-safety judgment
```

Structure itself must not become a semantic parser or repair engine.

Candidate assessment classes:

```text
PASS
UNKNOWN
AMBIGUOUS
CONFLICT
UNAUTHORIZED_TRANSITION
RETROSPECTIVE_ALLOWED
```

Exact labels may remain domain-specific where needed.

## 9. Prompt projection contract

Projection should be **pull-like and sparse**, not a world database dump.

Candidate relevance priority:

1. hard current-mode/current-output constraints;
2. facts directly referenced by the current user/request;
3. facts required to avoid a deterministic contradiction in the active scene;
4. compact continuity anchors with high immediate relevance;
5. everything else omitted.

Examples:

```text
Temporal: current narrative date 2031-03-07; A is 22.
State: key holder B; north door locked.
Knowledge: C does not know the culprit identity.
```

Only include lines that matter to the current generation.

The internal state may retain provenance/certainty/lineage while the prompt sees only semantic results.

A future implementation should define hard byte/line/fact budgets only after current prompt-cache contracts are impact-scoped.

## 10. Domain roadmap

### T1 — Temporal Awareness first

Extend the existing Time owner rather than creating a parallel temporal owner.

Target capabilities:
- current narrative date/time head;
- exact date/time arithmetic;
- age-at-date from birth date;
- birthday crossing;
- elapsed interval;
- exact/range/relative/unknown precision;
- event-local/flashback time without regressing the present head;
- reroll/edit/reload-safe commit lineage;
- Broadcast / Mode C handoff compatibility;
- no turn-count-as-time inference.

Existing narrative-clock permanent fixtures are the starting regression family, not a replacement.

### N1 — Numeric progression pilot second

Select one bounded deterministic numeric state family that reflects the original SimCore pain.

Candidate shape:

```text
canonical base/checkpoint
+ bounded committed deltas
-> current value
```

Required proof:
- repeated increment does not stall;
- reroll does not double-increment;
- semantic edit changes the value once;
- reload preserves the committed result;
- invalid/ambiguous delta remains unresolved;
- prompt projects only the active numeric fact when relevant.

Do not create a generic arithmetic engine until T1 + N1 demonstrate real shared code/contract pressure.

### S1 — Discrete state pilot third

Choose one explicit non-numeric state family, such as object lifecycle/custody or scene presence.

Target only explicit transitions.

Do not attempt broad prose-level world simulation.

### E1 — Exposure / knowledge integration

Reuse the existing Exposure Knowledge program rather than inventing a competing knowledge owner.

Initial deterministic scope should remain narrow:
- public/private/exposed classification where an existing structural rule proves it;
- known-by edges only after an explicit witness/tell/exposure event contract exists;
- no `model knows -> character knows` upgrade;
- no rumor/speculation -> truth upgrade.

### C1 — Shared constraint composition

Only after at least two independent domains prove the same assessment/commit/projection pattern should a shared helper/module be considered.

This is where a future `derived-state` or `constraint` shared module may become justified.

Until then:

```text
REUSE > EXTEND > COMPOSE >> NEW
```

## 11. What must NOT be built first

Do not start with:
- one giant `worldState` JSON database;
- an unbounded event-sourcing ledger;
- a generic symbolic reasoning engine;
- arbitrary Korean/English prose semantic extraction;
- personality/emotion/trust scoring;
- universal per-character knowledge inference;
- automatic scene simulation;
- aggressive prompt injection of every remembered fact;
- Structure-owned repairs;
- Prompt-owned semantic decisions;
- State Reconcile-owned domain semantics.

These would increase complexity faster than they remove model burden.

## 12. Bounded persistence direction

Prefer per-domain compact canonical snapshots plus bounded receipts/tails.

Examples:

```text
Temporal:
current head + precision + bounded transition provenance

Numeric:
checkpoint value + bounded recent accepted deltas if needed

Object state:
current condition/holder + last accepted transition receipt
```

Do not persist raw user/assistant prose as a semantic ledger merely to support the feature.

Any new persistent field/schema requires a separate versioned implementation design and migration contract.

## 13. Edit / reroll / reload invariants

Permanent regressions should include:

1. discarded candidate never mutates canonical state;
2. reroll starts from the same committed base and does not double-apply a delta;
3. representation-only edit preserves semantic state;
4. semantic edit is explicitly reclassified and rebuilt once;
5. reload restores the same canonical state and bounded provenance;
6. stale prior-mode/domain diagnostic evidence cannot become current semantic authority;
7. UNKNOWN does not become exact after reload/reconcile;
8. Prompt receives the same semantic projection for equivalent canonical state regardless of representation provenance.

## 14. Architecture ownership decision

At this design stage:

```text
NEW GLOBAL ENGINE: REJECTED FOR FIRST IMPLEMENTATION
CROSS-MODULE CONTRACT: PREFERRED
TIME EXTENSION FIRST: PREFERRED
GENERIC DERIVED-STATE MODULE: DEFER UNTIL MULTI-DOMAIN EVIDENCE
GENERIC WORLD-STATE DB: REJECTED
UNBOUNDED LEDGER: REJECTED
PROMPT MINIMALISM: REQUIRED
COMMIT/LINEAGE SAFETY: REQUIRED
```

## 15. Current design classification

```text
program: SIMCORE_DETERMINISTIC_STATE_SUPPORT
state: DESIGN DISCOVERY / UMBRELLA CONTRACT
implementation authority: NONE
release impact: NONE
first bounded implementation candidate: TEMPORAL AWARENESS T1
second bounded candidate: NUMERIC PROGRESSION N1
```

## 16. Next design transactions

1. Correct the stale wall-clock language in the open Temporal Awareness docs lane so #1763 and its doc agree on narrative-only scope.
2. Map current production Time APIs/state fields/prompt projection exactly and write T1 ownership impact scope.
3. Define the Temporal state schema delta only after that map.
4. Select one concrete N1 numeric progression use case from the original long-chat failure pattern.
5. Re-evaluate whether T1 + N1 justify a shared derived-state primitive or whether domain-local code remains simpler.

No runtime implementation is authorized by this document.

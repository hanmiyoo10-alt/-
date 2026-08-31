# SimCore Common Rules + Plugin Skill Methodology Impact Review — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT REVIEW · DESIGN PROCESS UPDATE · NO IMPLEMENTATION AUTHORITY**

This review records how the newly updated repository-common documents affect the completed LightBoard / MiniBoard design shortlist.

Primary new sources:

- `docs/REPOSITORY_COMMON_RULE_PROMOTION_REVIEW_2026-09-01.md`
- `docs/REPOSITORY_COMMON_RULES.md`
  - newly promoted `RCR-D07` through `RCR-D10`
  - newly promoted `RCR-C07` and `RCR-C08`
- `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`
- existing inheritance boundary in `docs/SIMCORE_GUIDELINES.md`

Relevant prior SimCore source:

- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md`

This review does not change `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, production/runtime state, persistent schema, S7, or implementation authority.

---

## 1. What changed in the repository-wide common layer

The common-rule promotion review surveyed multiple independent external engineering/workflow sources and promoted six durable rules into canonical repository policy.

### New DEFAULT rules

```text
RCR-D07  Scope impact before broad change
RCR-D08  Distill context, preserve source authority
RCR-D09  Creation is incomplete without feedback
RCR-D10  Prefer composable workflow modules
```

### New CONDITIONAL rules

```text
RCR-C07  Isolate parallel exploration; select explicitly
RCR-C08  Separate analysis from mutation where supported
```

SimCore already inherits applicable repository common rules by reference. Repository common rules do not become SimCore production truth, but their DEFAULT/HARD behavior applies unless SimCore explicitly specializes it with a more specific project-owned contract.

---

## 2. Immediate effect on the LightBoard / MiniBoard shortlist

The candidate ranking does **not** need to be reversed.

Current ranking remains:

```text
1. Context Projection Contract                 DESIGN_READY
2. Exposure Knowledge Contract                DESIGN_READY
3. Derived Provenance + Reroll Lineage        DESIGN_PREP
4. Schema-First Derived Snapshot              BACKLOG
5. Derived Checkpoint + Recent Delta          BACKLOG
```

However, the next legitimate transaction changes.

The previous shortlist ended with:

```text
write the dedicated Context Projection Contract design
```

After `RCR-D07` and `RCR-C08`, that is too early for an architectural/context-routing change.

The revised sequence is:

```text
READ-ONLY CONTEXT PROJECTION IMPACT SCOPE
→ select one concrete first semantic owner / path
→ re-read current owning source at affected symbols
→ write the bounded Context Projection Contract design
→ only later consider implementation authorization
```

Classification:

```text
SHORTLIST RANKING       = UNCHANGED
NEXT PROCESS STEP       = CHANGED
IMPLEMENTATION AUTHORITY = NONE
```

---

## 3. RCR-D07 strongly changes Design 1 entry conditions

`RCR-D07` requires broad/high-blast-radius work to establish structure, ownership, callers/dependents/tests, and likely impact before implementation claims or repair/design selection.

Context Projection is exactly that class of work because it may touch what model context reaches multiple semantic owners.

Therefore Design 1 must begin with a read-only impact map covering at least:

```text
request context assembly entry points
semantic-owner selection / routing
history / summary / continuity sources
prompt compiler / injected contract surfaces
Representation / Recovery / Edit Reconcile dependencies
Evidence / Lineage / Handoff / Recurrence dependencies
Structure / COMMUNITY consumers
Time / Broadcast / Frame consumers where context-sensitive
cache/history observation and prompt-accounting surfaces
tests / fixtures / architecture contracts
release/materializer identity surfaces
```

The impact scope must distinguish:

```text
SOURCE OF TRUTH
DERIVED INDEX / SUMMARY
REQUEST-TIME PROJECTION
PERSISTENT STATE
PRESENTATION-ONLY STATE
DIAGNOSTIC / OBSERVABILITY STATE
```

No current source may be inferred from an old design note when the owning runtime/source can be read directly.

---

## 4. RCR-D08 independently strengthens Candidate A

`RCR-D08` says repeated knowledge should be distilled into compact source-linked context while original source remains available for targeted reread; derived summaries/indexes never become competing mutable truth.

This independently converges with the LightBoard-derived Candidate A:

```text
available source/history
→ compact owner-relevant projection
→ source-linked / authority-preserving
→ deeper source available when uncertainty requires it
```

This is important because it changes the desired Context Projection contract from merely "send fewer tokens" into:

```text
COMPACT CONTEXT
+ SOURCE LINKAGE / OWNER BOUNDARY
+ ON-DEMAND DEEP FALLBACK
+ NO AUTHORITY PROMOTION
```

Strong implication:

A context projection may omit ordinary owner-irrelevant material for one request, but omission must not become deletion, truth replacement, or permanent loss of canonical continuity.

This also reinforces the existing rule:

```text
stored lifetime != request-context lifetime
```

---

## 5. RCR-D09 upgrades the validation contract

The old shortlist already required static fixtures and real long-chat evidence.

`RCR-D09` makes the feedback loop more explicit: generation/creation alone is not completion when stronger verification exists.

For Context Projection, the design should predeclare a baseline comparison rather than validating only the projected path.

Recommended evidence shape:

```text
BASELINE = current full-context behavior
CANDIDATE = owner-scoped projected context
```

Compare at least:

### Correctness

```text
same required canonical facts available
same semantic owner behavior
no lost active task constraint
no false historical/current-era substitution
no COMMUNITY exposure expansion
no edit/reroll regression
no lineage or recurrence authority regression
```

### Context / performance

```text
prompt-accounting bytes/tokens where observable
history/context units read or serialized
request preparation cost where attributable
cold vs warm behavior if materially different
```

### Failure behavior

```text
uncertain owner / missing source / inconsistent projection
→ fall back to current safe/full path
→ do not guess missing context
```

A projection that saves context but loses semantic correctness fails.
A projection that preserves correctness but yields no meaningful context/cost benefit may remain unnecessary.

---

## 6. RCR-D10 prevents a common failure mode

`RCR-D10` prefers small, composable, inspectable workflow modules and rejects monolithic process owners.

This strongly reinforces the shortlist decision **not** to create a generic LightBoard subsystem.

For Context Projection, avoid designs shaped like:

```text
Generic Context Platform
├─ new memory ownership
├─ new summary ownership
├─ new lineage ownership
├─ new audience knowledge ownership
└─ new renderer / UI ownership
```

Preferred first design remains narrow:

```text
one request-time projection contract
one concrete semantic owner/path
existing canonical owners remain unchanged
zero persistent schema if possible
explicit fallback
```

Similarly, Candidate C should remain a supporting contract driven by a concrete derived object instead of becoming a general provenance platform.

---

## 7. RCR-C08 formalizes analysis-before-mutation

The current LightBoard research and shortlist are still in design/research space.

`RCR-C08` says explicit analysis/audit/research phases should remain read-only while uncertainty and scope are unresolved.

Therefore the immediate Context Projection impact-scope transaction must be:

```text
READ ONLY
NO runtime source changes
NO release branch changes
NO persistent schema changes
NO builder/candidate artifact changes
NO S7 implementation changes
```

Its output is a structure/ownership/impact report, not code.

Only after that report identifies a selected bounded path should a separate design transaction write the contract document.

---

## 8. RCR-C07 is useful but not mandatory for the first pass

Parallel independent exploration is now an explicit conditional common rule for complex/high-risk work.

It may be useful if the impact scope reveals multiple plausible projection boundaries, for example:

```text
Option A  projection at prompt compiler boundary
Option B  projection at semantic-owner input adapter
Option C  projection at an earlier continuity preparation boundary
```

Those alternatives may be explored in isolated read-only lanes and compared against explicit criteria.

But ordinary work should not pay orchestration overhead merely because parallelism is available.

Current decision:

```text
PARALLEL EXPLORATION = OPTIONAL / NOT REQUIRED YET
```

---

## 9. New plugin-skill methodology: what is directly reusable now

The new 502-line repository methodology is about reusable agent skills, not SimCore runtime architecture. It does not authorize a new skill.

However, several methodology rules are immediately useful as **development-process guidance** for SimCore design work.

### 9.1 Evidence gate before abstraction

Do not create a generic helper/skill from an interesting idea.
Start from repeated successful work, real incidents, corrections, runbooks, source contracts, or multiple plugins solving the same class of problem.

For our current work:

```text
LightBoard 16-source synthesis
+ existing SimCore long-chat evidence
+ repeated repository impact-scope need
= sufficient evidence to perform an impact-scope analysis
```

It is **not** yet sufficient evidence to install a generic Context Projection skill/runtime system.

### 9.2 One coherent job

The methodology treats skill scope like a module boundary.

This supports keeping our transactions separated:

```text
research
→ impact scope
→ design
→ implementation
→ review/validation
→ release
```

Do not make one tool/process silently own all phases.

### 9.3 Progressive disclosure

The methodology recommends compact core instructions plus deep references loaded only when needed.

This is process-level independent evidence for the same pattern Candidate A is considering at runtime/context level:

```text
compact front layer
+ direct pointers / conditions for deep source reread
```

The analogy must not be mistaken for runtime authority, but the convergence is architecturally informative.

### 9.4 Deterministic repeated logic belongs in scripts/checks

If impact scoping repeatedly requires the same mechanical inventory or invariant comparison, consider a deterministic helper later instead of rebuilding the analysis manually each time.

No such script is authorized by this review.

### 9.5 Evaluate against a baseline and count cost

The skill methodology explicitly recommends:

```text
with candidate vs without candidate
objective assertions
human/qualitative review
cost: tokens / duration / tool calls / overhead
```

This maps unusually well to Context Projection validation and should be borrowed as a design-test pattern.

### 9.6 Execution traces are evidence

Even if final output is correct, traces can expose wasted branches, ambiguous routing, repeated helper reconstruction, or unnecessary context loading.

A future Context Projection experiment should therefore preserve enough bounded prompt/accounting/selection diagnostics to explain **why** context was included or excluded without retaining raw private bodies unnecessarily.

---

## 10. Skill archetypes relevant to SimCore, but not authorized

The methodology proposes several repository-wide candidate skill families.

Three are especially relevant to our workflow:

```text
plugin-authority-scan
plugin-impact-scope
plugin-diagnostic-triage
```

Current classification for SimCore:

```text
plugin-authority-scan       = PROMISING PROCESS TOOL / NO IMPLEMENTATION AUTHORITY
plugin-impact-scope         = DIRECTLY RELEVANT METHODOLOGY / MANUAL PILOT FIRST
plugin-diagnostic-triage    = PROMISING PROCESS TOOL / ALREADY HAS REPEATED EVIDENCE
```

Do not build or install them in this transaction.

The methodology itself says a common skill should normally prove itself in one owning scope, run output/trigger evals, then receive second-scope compatibility review before repository-wide promotion.

If a future skill pilot happens, SimCore could be one owning pilot scope, not the source of repository-wide mutable truth.

---

## 11. Revised Context Projection pre-design transaction

New immediate target:

```text
SIMCORE_CONTEXT_PROJECTION_IMPACT_SCOPE
```

Status:

```text
READ_ONLY
DESIGN_PRECONDITION
NO IMPLEMENTATION AUTHORITY
```

Required outputs:

1. **Current structure map**
   - where request context is assembled;
   - where semantic owner/path is selected;
   - what modules contribute continuity/history/derived context.

2. **Ownership map**
   - which source owns each candidate field/context unit;
   - which representations are derived only;
   - which consumers require exact/full source access.

3. **Caller/dependent map**
   - prompt compiler;
   - lifecycle/summary paths;
   - Representation/Edit/Recovery;
   - Evidence/Lineage/Handoff/Recurrence;
   - Structure/COMMUNITY;
   - Time/Broadcast/Frame where relevant;
   - diagnostics/accounting/cache observation.

4. **Test/evidence map**
   - existing architecture contracts and fixtures;
   - real-long-chat regression controls;
   - prompt-accounting observability;
   - safe baseline comparison surface.

5. **Candidate first owner/path**
   - choose the smallest path with measurable context pressure and bounded correctness blast radius;
   - record alternatives and why they were rejected/deferred.

6. **Design boundary recommendation**
   - where projection should occur if promoted;
   - where it must not occur;
   - uncertainty fallback;
   - expected schema effect (`NONE` preferred).

Completion criterion:

```text
one concrete first projection boundary can be named
with current-source evidence,
known dependents/tests,
and a bounded fallback/validation surface.
```

If this cannot be established, Candidate A remains `DESIGN_READY` but not design-selected.

---

## 12. Effect on Candidate B and later candidates

### Exposure Knowledge Contract

Still co-equal `DESIGN_READY`.

New process requirement:

Before its dedicated design, run a smaller structure/impact scope over the current COMMUNITY/public fact flow, especially the source of reaction-eligible facts and private/inferred state boundaries.

### Derived Provenance + Reroll Lineage

Still `DESIGN_PREP`.

New evidence reinforces not creating a generic lineage owner. Source-linked derived views should preserve source authority rather than become a new truth system.

### Schema-First Derived Snapshot

Still backlog.

The skill methodology's strong validation/script guidance is useful if/when a bounded snapshot consumer appears.

### Derived Checkpoint + Recent Delta

Still backlog.

`RCR-D08` supports compact derived indexes, but it explicitly warns that derived summaries/indexes do not replace current owning authority. Therefore this candidate remains downstream of projection evidence.

---

## 13. Final updated position

```text
LIGHTBOARD_MINIBOARD_RESEARCH                  = COMPLETE
LIGHTBOARD_MINIBOARD_EXACT_ARCHIVES            = 16 / 16
DESIGN_SHORTLIST                               = VALID

CANDIDATE_A_CONTEXT_PROJECTION                 = DESIGN_READY
CANDIDATE_B_EXPOSURE_KNOWLEDGE                 = DESIGN_READY
CANDIDATE_C_PROVENANCE_LINEAGE                 = DESIGN_PREP

NEW_COMMON_RULES_REVIEWED                      = YES
PLUGIN_SKILL_METHODOLOGY_REVIEWED              = YES
SHORTLIST_RANKING_CHANGED                      = NO
SHORTLIST_NEXT_STEP_CHANGED                    = YES

NEXT_ACTION                                    = CONTEXT_PROJECTION_IMPACT_SCOPE
NEXT_ACTION_MODE                               = READ_ONLY
IMPLEMENTATION_AUTHORITY                       = NONE
PERSISTENT_SCHEMA_AUTHORITY                    = NONE
PRODUCTION_CHANGE                              = NONE
S7_CHANGE                                      = NONE
```

The next legitimate SimCore action is **not yet the runtime design document**. It is a source-backed, read-only Context Projection impact-scope pass that satisfies the newly canonical `RCR-D07` / `RCR-C08` workflow boundary.
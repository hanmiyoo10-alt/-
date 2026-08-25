# SimCore Gemini Stable Prefix Budgeter — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · STABILITY-BOUNDARY DESIGN · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Prevent unnecessary volatility from entering SimCore cache-critical prompt tiers in the first place.

The Stable Prefix Budgeter is not a prompt-size minimizer and not an automatic optimizer.

Its purpose is to answer:

```text
What stability class does each prompt ingredient belong to?
May that ingredient flow into stable / slow / volatile output?
Did a more volatile source contaminate a more stable tier?
How much intentional mutation surface does this release introduce?
```

Conceptually:

```text
Stable Prefix Budgeter
= construction-time stability boundary

Cache ABI Guardian
= release-time byte identity verification
```

The Budgeter tries to prevent invalid ingredients from entering cache-critical tiers; Guardian verifies that the resulting serialized bytes remain compatible across releases.

## 2. Critical naming rule — budget means volatility, not size

Do not interpret `budget` as:

```text
stable prompt must be small
stable bytes must stay under N characters
```

That would be the wrong optimization target for Gemini implicit caching.

A large, reusable stable prefix may be valuable.

The intended budget is:

```text
VOLATILITY BUDGET
MUTATION BUDGET
DYNAMIC-SOURCE ADMISSION BUDGET
```

not a hard stable-byte ceiling.

Therefore:

```text
large + stable
→ potentially good

small + changes every request
→ potentially bad
```

Stable/slow byte size may be reported for observability, but size alone must not fail the design.

## 3. Constitutional boundary

The existing responsibility rule remains unchanged:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Budgeter may classify prompt-construction inputs and enforce cache-stability contracts. It must never:

```text
write model prose
rewrite user or assistant history
change scene/dialogue rendering
weaken state or validation authority
move prompt sections automatically
change runtime placement automatically
manage Gemini explicit cache resources
```

A cache-friendly construction rule cannot override correctness, safety, or renderer ownership.

## 4. Stability classes

Research vocabulary:

```text
STABLE
SLOW
VOLATILE
UNKNOWN
```

Interpretation:

### STABLE

Expected to remain byte-identical across ordinary turns and ordinary compatible releases unless an explicit stable-contract change is declared.

Typical conceptual sources:

```text
fixed invariant contracts
rarely changed static rule wording
stable compiler framing
```

### SLOW

Expected to remain unchanged for long spans but may legitimately change when a bounded configuration or semantic contract changes.

Conceptual examples may include:

```text
rare configuration-derived guidance
stable chat-level policy that changes intentionally
slow semantic contract state
```

Exact ownership must be derived from current compiler architecture during implementation rather than guessed from this idea document.

### VOLATILE

Expected to change by turn, lifecycle event, request, runtime generation, or current state.

Likely examples include values such as:

```text
current mode/lifecycle facts
request-local state
runtime generation/epoch identifiers
timestamps
request/output indices
per-turn diagnostics or fingerprints
```

Only actual current compiler use determines final classification.

### UNKNOWN

A source whose stability contract has not been proven.

Rule:

```text
UNKNOWN must not silently enter STABLE or SLOW.
```

During an initial observation-only implementation it may produce a diagnostic rather than hard failure, but promotion into a cache-critical tier requires explicit classification.

## 5. Stability propagation rule

The useful mental model is a small stability lattice.

```text
STABLE < SLOW < VOLATILE
```

A composed output cannot honestly claim to be more stable than its most volatile meaningful input.

Conceptually:

```text
join(STABLE, STABLE)   = STABLE
join(STABLE, SLOW)     = SLOW
join(SLOW, VOLATILE)   = VOLATILE
join(STABLE, UNKNOWN)  = UNKNOWN
```

Therefore:

```text
VOLATILE source
→ STABLE output
```

is a construction violation unless the volatile source is transformed into a genuinely stable semantic constant before serialization.

Do not hide volatility through hashing, formatting, truncation, or normalization merely to satisfy the classifier.

## 6. Source provenance

A future compiler/tooling implementation should attach bounded provenance to prompt fragments.

Conceptual record:

```text
fragment id
owner/module
stability class
semantic source
output tier
reason
```

Example:

```text
fragment: CORE_INVARIANT_RULES
source stability: STABLE
output tier: stable
→ ALLOWED

fragment: RUNTIME_GENERATION_ID
source stability: VOLATILE
output tier: stable
→ REJECT / VOLATILITY_INTRUSION

fragment: CURRENT_MODE
source stability: VOLATILE
output tier: volatile
→ ALLOWED
```

No raw model/user content is needed for this provenance.

## 7. Construction-time admission policy

Preferred rule:

```text
STABLE output
accepts: STABLE only

SLOW output
accepts: STABLE + SLOW

VOLATILE output
accepts: STABLE + SLOW + VOLATILE
```

`UNKNOWN` requires explicit resolution before entering stable/slow.

This should be enforced at the smallest practical compiler-fragment boundary instead of after one giant prompt string is assembled.

If the existing compiler architecture does not expose suitable fragment boundaries, first add observational provenance rather than perform a broad runtime rewrite.

## 8. Mutation budget per release

In addition to source admission, each release can declare whether cache-critical mutation is intended.

Conceptual default:

```text
STABLE mutation budget = 0 undeclared changes
SLOW mutation budget   = 0 undeclared changes
```

This does not mean zero bytes may ever change.

It means:

```text
ordinary release
→ no undeclared stable/slow semantic mutation

intentional prompt-contract release
→ explicit declared mutation with design evidence
```

This aligns with Cache ABI Guardian:

```text
Budgeter
→ says whether changed ingredients are allowed

Guardian
→ proves whether serialized bytes actually changed
```

## 9. Budget report

A bounded diagnostic/CI report may show:

```text
Stable Prefix Budget

stable fragments        14
stable bytes             12,480
stable volatile inputs   0
stable unknown inputs    0

slow fragments            5
slow bytes               2,940
slow volatile inputs      0
slow unknown inputs       0

volatile fragments        9

release mutation intent  PRESERVE
construction result      PASS
```

On violation:

```text
STABLE_PREFIX_BUDGET_FAIL
fragment: VERSION_BANNER_DYNAMIC
source: RELEASE_VERSION
source class: SLOW/VOLATILE by policy
output tier: stable
reason: STABILITY_CLASS_INTRUSION
```

Exact source classifications must be evidence-based.

## 10. Do not confuse version identity with semantic cache identity

A particularly useful audit target is release/version/debug metadata.

If a version string changes every mini release while living inside cache-critical stable bytes, it can create unnecessary churn even when stable semantics are unchanged.

The Budgeter should make such cases visible.

But it must not automatically remove version information.

Correct process:

```text
observe dynamic metadata inside stable/slow
→ Opportunity Analyzer estimates real recoverable value
→ design decides whether metadata can move or be represented differently
→ dedicated release if approved
```

No automatic relocation.

## 11. Relationship to Cache ABI Guardian

These layers are intentionally different.

### Budgeter

Question:

```text
Did an unstable ingredient enter a cache-critical tier?
```

It can catch problems even before comparing candidate bytes with production.

### Guardian

Question:

```text
For the same semantic fixture, did candidate stable/slow bytes drift from production?
```

It can catch serialization drift caused by whitespace/order/framing changes even when every source was correctly classified.

Together:

```text
valid source classes
→ deterministic construction
→ Guardian byte comparison
```

A PASS in one does not replace the other.

## 12. Relationship to Opportunity Analyzer

The Budgeter should not trigger redesign merely because it sees a technically suboptimal classification.

Example:

```text
volatile source found in a late SimCore region
but Prefix Map says region is always after PRE_SIMCORE first break
and Gemini receipts show no measurable recoverable loss
```

Then:

```text
technical debt observed
→ WATCH / LOW OPPORTUNITY
→ no immediate runtime work
```

Conversely:

```text
volatile intrusion into large stable region
+ repeated SimCore-owned first break
+ real Gemini cached-token loss
→ HIGH-VALUE optimization candidate
```

The Opportunity Analyzer remains the work-prioritization authority.

## 13. Relationship to Prefix Map / CACHE_SHADOW

The Budgeter protects SimCore-owned tier quality regardless of current request placement.

But it must preserve the existing `CACHE_SHADOW` insight:

```text
stable SimCore bytes located after an earlier PRE_SIMCORE break
→ locally stable
→ possibly little provider-level recoverable value for that request
```

Therefore a clean stable budget does not prove high Gemini cache reuse.

Correct diagnostic combination:

```text
Stable Prefix Budget: CLEAN
Cache Prefix Map: SimCore stable CACHE_SHADOW
Gemini cached tokens: external receipt
```

## 14. Possible compiler API direction

Purely conceptual future API:

```js
emitFragment({
  id: "CORE_INVARIANT_RULES",
  sourceClass: "STABLE",
  outputTier: "stable",
  text
});
```

or typed builders such as:

```text
stableBuilder.add(stableSource)
slowBuilder.add(stableOrSlowSource)
volatileBuilder.add(anyKnownSource)
```

The exact API must fit current SimCore modules and should not be introduced merely for aesthetic type purity.

If equivalent evidence can be extracted from existing compiler construction with lower risk, prefer that.

## 15. Static analysis candidate

A future low-runtime-risk implementation may begin as tooling rather than runtime code.

Possible checks:

```text
known volatile source referenced by stable builder
→ FAIL

unknown source referenced by stable/slow builder
→ REVIEW/FAIL depending rollout phase

stable fragment source order nondeterministic
→ Guardian/deterministic serialization suite catches byte drift
```

This could live beside Cache ABI Guardian in permanent CI without changing production runtime behavior.

## 16. Rollout strategy

Preferred staged approach:

```text
Phase 0 — inventory only
classify current prompt fragment sources
no failures

Phase 1 — observation
report volatile/unknown intrusion candidates
prove classifications

Phase 2 — protect known contracts
hard fail new known VOLATILE → STABLE/SLOW intrusion

Phase 3 — integrate with Guardian
construction PASS + byte-ABI PASS become cache-contract checks
```

Do not start by retroactively failing the entire existing compiler based on an unverified classification model.

## 17. Required future fixtures

A future implementation should prove at least:

```text
1. STABLE source → stable
   → PASS

2. SLOW source → slow
   → PASS

3. VOLATILE source → volatile
   → PASS

4. VOLATILE source → stable
   → violation

5. VOLATILE source → slow
   → violation

6. UNKNOWN source → stable/slow
   → unresolved / no silent acceptance

7. stable+slow composition
   → resulting minimum class SLOW

8. stable+volatile composition
   → resulting minimum class VOLATILE

9. source refactor with same classification and same bytes
   → Budgeter PASS + Guardian PASS

10. whitespace-only stable serialization drift
   → Budgeter may PASS, Guardian FAIL

11. version/debug metadata audit case
   → visible classification, no automatic removal

12. CACHE_SHADOW case
   → Budgeter does not overclaim provider benefit

13. no raw chat/prompt body retention in reports

14. renderer responsibility unchanged

15. latest.js == install.js remains independently enforced for actual SimCore releases
```

## 18. Non-goals

```text
shrinking stable prompt for its own sake
hard maximum stable-byte quota
prompt relocation
Two-Plane Prompt implementation
history rewriting
renderer behavior changes
explicit Gemini cache management
provider route control
automatic optimization
```

## 19. Target cache stack relationship

```text
Stable Prefix Budgeter
= keep unstable ingredients out of stable/slow construction

Cache ABI Guardian
= verify stable/slow serialized bytes across release candidates

Cache Prefix Map
= locate real request first break / cache shadow

Cache Baseline Profile
= establish normal cache behavior per chat/family

Cache Regression Sentinel
= detect material runtime degradation

Cache Regime Ledger
= preserve confirmed long-chat cache behavior transitions

Cache Opportunity Analyzer
= decide which observed inefficiencies are worth engineering work

Usage Dashboard / approved receipt source
= authoritative Gemini cache-read/write evidence
```

No component becomes the renderer.

## 20. Current classification

```text
GEMINI_STABLE_PREFIX_BUDGETER
= HIGH VALUE DESIGN GUARD
= LOW RUNTIME RISK IF CI/TOOLING FIRST
= CACHE-CONSTRUCTION CONTRACT
= IDEA / DESIGN CANDIDATE

budget meaning:
VOLATILITY / MUTATION ADMISSION

hard byte-size ceiling:
NONE

runtime mutation:
NONE today

renderer responsibility change:
NONE
```

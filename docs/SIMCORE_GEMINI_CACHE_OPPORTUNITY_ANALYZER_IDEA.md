# SimCore Gemini Cache Opportunity Analyzer — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · OPTIMIZATION-CANDIDATE RANKING · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Identify which observed cache inefficiencies are actually worth fixing, while rejecting micro-optimizations that are unlikely to improve real Gemini implicit-cache reuse.

The Opportunity Analyzer does not mutate prompts, does not rewrite history, and does not optimize automatically.

It answers:

```text
Is this cache loss large enough to matter?
Is the first meaningful break owned by SimCore?
Does the same pattern repeat often enough to justify work?
Is the affected region large enough and early enough to recover useful cached tokens?
Would the proposed area violate renderer/state/safety boundaries if touched?
```

Its output is a bounded research candidate, not an automatic release instruction.

## 2. Constitutional boundary

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Analyzer may rank optimization opportunities, but must never:

```text
rewrite model prose
rewrite user or assistant history
move prompt sections automatically
weaken Mirror / Representation / Edit Reconcile / Broadcast / Time / Frame / Structure safety
change semantic authority to gain cache tokens
manage Gemini explicit cache resources
pin provider routes
```

A high cache opportunity score cannot override correctness or responsibility boundaries.

## 3. Why an analyzer is needed

Not every cache regression should become engineering work.

Examples:

```text
Case A
cached ratio 88% → 86%
first break PRE_SIMCORE
one occurrence
→ low-value / no SimCore action

Case B
cached ratio 89% → 41%
first break SIMCORE stable
repeats across 12 comparable requests
large stable region affected
→ strong optimization candidate

Case C
cached ratio 87% → 58%
first break SIMCORE volatile after an earlier expected user boundary
→ likely cache shadow / limited recoverable value
```

Without a ranking layer, cache work can drift into byte shaving that does not improve provider behavior.

## 4. Evidence inputs

The Analyzer consumes existing authorities rather than inventing duplicate parsers.

```text
Usage Dashboard / approved Gemini receipt source
→ actual input tokens / cached tokens / cache-read evidence

Cache Prefix Map
→ first break owner/location
→ reusable-prefix estimate
→ cache-shadow classification

Cache Baseline Profile
→ expected healthy range for this chat/request family
→ deviation magnitude

Cache Regression Sentinel
→ bounded anomaly classification

Cache Regime Ledger
→ whether the pattern is transient or regime-level

Cache ABI Guardian
→ whether SimCore stable/slow drift was declared, preserved, or unexpectedly changed
```

The Analyzer is downstream of these components.

## 5. Opportunity dimensions

Do not collapse the first version into one opaque magic score.

Prefer explainable dimensions:

```text
IMPACT
= estimated real Gemini cached-token loss relative to healthy baseline

OWNERSHIP
= how strongly evidence attributes the first meaningful break to SimCore

REPEATABILITY
= how often the same attributable pattern recurs in compatible requests

RECOVERABILITY
= how much reusable prefix could plausibly be restored by fixing the SimCore-owned drift

CONFIDENCE
= quality/compatibility of receipts, prefix evidence, baseline maturity, and regime evidence

RISK
= expected semantic/state/architecture risk of touching the implicated area
```

The output should show these dimensions separately.

## 6. Candidate classification

Initial bounded classes:

```text
NO_ACTION
→ too small, transient, external, or already cache-shadowed

WATCH_OPPORTUNITY
→ useful pattern but insufficient repetition/confidence

RESEARCH_CANDIDATE
→ meaningful recurring loss with plausible SimCore ownership

HIGH_VALUE_CANDIDATE
→ large repeatable loss + strong SimCore ownership + high recoverability + bounded risk

REJECT_BOUNDARY_RISK
→ optimization would require renderer-role transfer or weakening correctness/state guarantees

UNKNOWN
→ evidence insufficient or incompatible
```

Do not auto-convert these classes into FIX / release work. Promotion remains a human/design decision recorded in main.

## 7. Impact model

Prefer provider evidence over local estimates when available.

Conceptual impact:

```text
healthy cached tokens median: 440k
current cached tokens:        270k
observed loss:                170k
```

Across repeated compatible requests:

```text
median recoverable loss candidate
× recurrence count / frequency
→ practical opportunity size
```

Do not monetize the result in v1 unless authoritative billing metadata is explicitly available and approved for use.

Do not claim every lost cached token is recoverable by SimCore.

## 8. Ownership weighting

Strong SimCore-owned evidence:

```text
Prefix Map first meaningful break = SIMCORE stable/slow
Guardian expected PRESERVE or identifies exact undeclared drift
same break signature repeats
provider cached-token loss correlates
```

Weak / non-SimCore evidence:

```text
PRE_SIMCORE history break
CURRENT_USER expected boundary
route/TTL/provider behavior unknown
stable/slow SAME and only volatile/full changed after earlier break
```

Rule:

> Large impact with weak ownership is not a SimCore optimization candidate.

It remains an external/host/gateway research finding.

## 9. Recoverability model

A change is valuable only if fixing it can plausibly move the reusable prefix boundary earlier/later in a useful way.

Example:

```text
first break at 120k
remaining request 410k
SimCore-owned accidental stable drift
→ potentially high recoverability
```

Versus:

```text
first break already PRE_SIMCORE at 480k
SimCore stable drift occurs at 505k
→ SimCore fix is cache-shadowed
→ low recoverability for strict prefix caching
```

This formalizes the existing `CACHE_SHADOW` principle.

## 10. Repeatability and anti-chasing rule

Never rank a one-off cosmetic mutation as high-value solely because one request had a large cache drop.

Preferred evidence ladder:

```text
one occurrence
→ WATCH at most

repeated same attributable signature
→ RESEARCH_CANDIDATE

repeated across more than one compatible cache regime or after controlled reproduction
→ stronger confidence
```

Natural long-chat evidence is preferred over synthetic request spam.

## 11. Risk budget

Opportunity value must be compared against implementation risk.

Conceptual risk classes:

```text
LOW
→ deterministic serialization cleanup inside existing cache-critical compiler tier

MEDIUM
→ compiler ownership/refactor that preserves semantics but touches several fixtures

HIGH
→ prompt relocation, request topology changes, history rewriting, state/renderer responsibility movement
```

High-risk cache optimization should normally be rejected unless measured impact is exceptional and a separate dedicated design/regression campaign exists.

Correctness always outranks cache efficiency.

## 12. Suggested diagnostic output

Compact:

```text
Cache opportunity: RESEARCH_CANDIDATE
Impact: HIGH · ~170k cached-token delta vs baseline
Ownership: SIMCORE_STABLE · HIGH
Repeatability: 7/9 comparable requests
Recoverability: HIGH
Risk: LOW
Reason: repeated undeclared stable serialization drift
```

Low-value example:

```text
Cache opportunity: NO_ACTION
Impact: MEDIUM
Ownership: PRE_SIMCORE
Recoverability by SimCore: LOW · CACHE_SHADOW
Reason: history first-break precedes SimCore runtime
```

## 13. Candidate signature

To detect repeated opportunities without retaining raw prompt text, use a bounded signature built from existing metadata, for example:

```text
request family
first-break owner
first-break region/tier
stable/slow identity state
bounded first-diff structural label when safely available
cache regime id
```

Do not include raw user/assistant/system bodies.

## 14. Relationship to engineering backlog

The Analyzer should not silently create implementation work.

Preferred promotion flow:

```text
Analyzer finding
→ WATCH_OPPORTUNITY / RESEARCH_CANDIDATE
→ preserve evidence in main
→ human/design review
→ if accepted: separate design candidate
→ dedicated work branch
→ static/CI
→ release-simcore
→ real long-chat validation
→ main evidence sync
```

This keeps cache research aligned with the normal SimCore workflow.

## 15. Opportunity closure

A candidate may close as:

```text
PROVEN_VALUE
→ implemented and real Gemini receipt improves without regressions

NO_MEASURABLE_GAIN
→ implementation changed local bytes but provider cache did not materially improve

EXTERNAL_OWNER
→ host/history/gateway/provider owns the first meaningful loss

CACHE_SHADOW
→ SimCore change cannot materially move the effective prefix boundary

BOUNDARY_REJECTED
→ required change violates renderer/state/safety architecture

OBSOLETE_REGIME
→ opportunity belonged to a superseded cache regime
```

Negative results are preserved; do not erase them.

## 16. Privacy / boundedness / performance

Hard rules:

```text
NO raw prompt history ledger
NO full gateway-log retention
NO second full history scan solely for opportunity ranking
NO network request solely to compute a score
NO SnapshotStore semantic writes for analytics
NO unbounded candidate list
```

Prefer existing bounded telemetry and fingerprints.

The Analyzer should be cheap enough that measuring cache opportunity never becomes a runtime hotspot.

## 17. Required future fixtures

A future implementation should prove at least:

```text
1. large cache drop + PRE_SIMCORE first break
   → NO_ACTION / external research, not SimCore HIGH_VALUE

2. repeated large drop + SIMCORE stable drift + Guardian PRESERVE expected
   → HIGH_VALUE or RESEARCH candidate

3. one-off SimCore drift
   → WATCH only

4. SimCore drift entirely after earlier prefix break
   → CACHE_SHADOW / low recoverability

5. tiny byte drift with no measurable provider loss
   → NO_ACTION

6. declared semantic stable change with expected new regime
   → not mislabeled accidental regression

7. optimization would require renderer-role transfer
   → REJECT_BOUNDARY_RISK

8. baseline COLD / no trustworthy receipt
   → UNKNOWN, no false precision

9. candidate survives reload with compatible telemetry continuity
   → repeated signature remains correlatable

10. superseded cache regime
    → old opportunity does not pollute current ranking

11. no raw body retention

12. no duplicate first-break parser or duplicate baseline statistics
```

## 18. Non-goals

```text
automatic prompt rewriting
automatic optimization patches
automatic release creation
explicit Gemini cache management
provider routing control
black-box ML scoring
cost-driven safety tradeoffs
renderer behavior modification
```

## 19. Target cache research stack

```text
Usage Dashboard
= what Gemini actually cached

Cache Prefix Map
= where the request prefix changed

Cache Baseline Profile
= what is normal for this chat/family

Cache Regression Sentinel
= is the current result abnormally worse

Cache Regime Ledger
= when the definition of normal changed

Cache Opportunity Analyzer
= which attributable losses are actually worth engineering effort

Cache ABI Guardian
= prevent undeclared SimCore stable/slow drift before release
```

## 20. Current classification

```text
GEMINI_CACHE_OPPORTUNITY_ANALYZER
= HIGH VALUE
= LOW SEMANTIC RISK IF OBSERVATION-ONLY
= ENGINEERING-PRIORITIZATION LAYER
= IDEA / DESIGN CANDIDATE

runtime mutation:
NONE today

renderer responsibility change:
NONE

automatic optimization authority:
NONE
```

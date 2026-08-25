# SimCore Gemini Cache ABI Guardian — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_IMPLICIT_PROMPT_CACHE_IDEA_LAB.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`

## 1. Purpose

Prevent accidental cache-hostile SimCore prompt changes **before release**.

The Guardian does not try to prove that Gemini will hit cache. It protects the parts of SimCore-owned prompt serialization that are intended to remain stable so Gemini implicit caching has the best possible reusable prefix.

Conceptual relationship:

```text
Cache ABI Guardian
= PREVENT accidental SimCore-owned prompt byte churn in CI

Cache Regression Sentinel
= DETECT real cached-token regressions in long-chat runtime
```

Together:

```text
PREVENT
→ RELEASE
→ OBSERVE
→ ATTRIBUTE
→ OPTIMIZE
```

## 2. Existing architecture fit

Current compiler identity tiers already distinguish:

```text
stable
slow
volatile
full
```

Current permanent CI already has a regression gate that runs `batch-a` for baseline/candidate validation.

Therefore the preferred implementation direction is:

```text
existing compiler tier identity
+ deterministic fixture harness
+ production P vs candidate C comparison
→ existing permanent regression gate
```

Do not create a parallel release system or new release authority for this feature.

This is a CI/tooling idea first. It should be implemented as a separate work item from any runtime feature change.

## 3. Core rule — compare semantics, not source text

Do not fail merely because JavaScript source changed.

The meaningful question is:

> For the same semantic fixture, did the candidate emit different cache-critical prompt bytes than production?

Conceptual comparison:

```text
fixture X
production P compiler
→ stable_P
→ slow_P
→ volatile_P
→ full_P

fixture X
candidate C compiler
→ stable_C
→ slow_C
→ volatile_C
→ full_C
```

Then compare **same fixture against same fixture** across P and C.

This avoids confusing an ordinary source refactor with an actual prompt ABI change.

## 4. Guardian v1 enforcement boundary

First version should be deliberately strict only where confidence is high.

```text
STABLE
→ hard protected
→ exact byte identity expected when stable semantics are unchanged

SLOW
→ hard protected by default
→ exact byte identity expected unless the release explicitly declares a slow-semantic change

VOLATILE
→ observed / classified
→ not a hard cross-release equality gate in v1

FULL
→ observed only
→ version metadata and legitimate volatile changes may make it differ
```

Reason:

```text
stable/slow = cache-critical reusable contract
volatile/full = legitimate per-turn/per-release change surface
```

Do not create false CI failures by demanding all four tiers remain identical.

## 5. Release declaration model

A candidate should be classified before comparison.

Conceptual declarations:

```text
CACHE_ABI_INTENT = PRESERVE
```

Default for ordinary minis that do not intentionally change stable/slow prompt semantics.

Under `PRESERVE`:

```text
stable drift → FAIL
slow drift   → FAIL
volatile drift → OBSERVATION
full drift     → OBSERVATION
```

For a deliberate prompt-contract change:

```text
CACHE_ABI_INTENT = CHANGE_DECLARED
```

Then the release must identify the intended tier:

```text
stable / slow
```

and link to an explicit design/evidence record.

A generic “allow cache drift” bypass is forbidden.

The Guardian must distinguish:

```text
DECLARED_SEMANTIC_CHANGE
from
UNDECLARED_BYTE_DRIFT
```

## 6. Suggested reason codes

Bounded machine-readable results:

```text
CACHE_ABI_STABLE_SAME
CACHE_ABI_SLOW_SAME
CACHE_ABI_VOLATILE_SAME
CACHE_ABI_VOLATILE_CHANGED
CACHE_ABI_FULL_CHANGED

CACHE_ABI_UNDECLARED_STABLE_DRIFT
CACHE_ABI_UNDECLARED_SLOW_DRIFT
CACHE_ABI_DECLARED_STABLE_CHANGE
CACHE_ABI_DECLARED_SLOW_CHANGE
CACHE_ABI_FIXTURE_ERROR
```

CI policy:

```text
UNDECLARED_STABLE_DRIFT → FAIL
UNDECLARED_SLOW_DRIFT   → FAIL
DECLARED change         → continue only through explicit reviewed contract path
volatile/full change    → bounded observation unless another fixture says it is wrong
```

## 7. Deterministic fixture matrix

The Guardian must not depend on live chat state.

Use deterministic semantic fixtures representing major runtime surfaces.

Minimum research matrix:

```text
1. Mode C ordinary narrative
2. B_START
3. B_CONTINUE
4. B_END
5. C immediately after B_END
6. secondary inactive
7. secondary active
8. summary-scope ordinary case
9. exposed Community ordinary case
10. representative Frame / Continuity state
```

Important rule:

> Compare production vs candidate for each identical fixture. Do not assume stable/slow must be identical across different semantic fixtures.

The fixture matrix exists to catch release drift, not to redefine the compiler's internal semantics.

## 8. Byte identity vs fingerprints

Preferred verification:

```text
exact serialized tier bytes
→ hash for compact report
→ optional bounded first-difference metadata on failure
```

Do not store large prompt bodies in CI reports.

Failure report may contain:

```text
fixture id
changed tier
production length
candidate length
production hash
candidate hash
first differing byte offset
bounded nearby structural label if safely available
```

Never dump full system/runtime prompt text into CI artifacts solely for this gate.

## 9. Deterministic serialization audit

The Guardian should naturally expose unnecessary churn from:

```text
key ordering
optional field ordering
whitespace
newline shape
version banners
runtime generation ids
timestamps
debug counters
random/process-local values
```

If such values appear inside stable/slow without semantic need, classify them as candidate cache-hostile serialization debt.

The Guardian should not normalize user/history text or rewrite the request to hide a difference.

## 10. Gemini-specific interpretation

The Guardian protects **prompt caching friendliness**, not provider cache authority.

Correct diagnostic language:

```text
Cache ABI stable: SAME
Cache ABI slow: SAME
Gemini provider cache: not proven by CI
```

A Guardian PASS means:

> SimCore did not introduce an undeclared stable/slow byte regression for the tested semantic fixtures.

It does **not** mean:

> Gemini cache HIT is guaranteed.

Actual cached-token evidence remains a runtime/gateway observation problem handled by Usage Dashboard / future receipt correlation.

## 11. Relationship to Cache Regression Sentinel

When both exist, the strongest evidence chain becomes:

```text
Guardian before release:
stable SAME
slow SAME

then long-chat after release:
Gemini cached tokens collapse

Sentinel attribution:
first break PRE_SIMCORE
→ SimCore stable/slow regression unlikely
→ host/history/route/TTL investigation
```

or:

```text
Guardian finds undeclared stable drift
→ candidate blocked before release
→ no live cache regression created
```

For a deliberate declared stable change:

```text
Guardian records declared ABI change
→ release ships only after dedicated regression evidence
→ Sentinel measures actual Gemini cached-token impact afterward
```

This closes the loop between static prevention and real provider evidence.

## 12. CI integration candidate

Preferred future integration:

```text
products/simcore/tooling/test.mjs
→ batch-a
→ cache-abi-guardian suite
```

or another existing permanent regression-suite registration point if source inspection during implementation identifies a cleaner owner.

Do not add a new top-level release authority merely for this check.

Potential gate rendering:

```text
GATE_REGRESSION PASS
· CACHE_ABI stable SAME
· CACHE_ABI slow SAME
· volatile OBSERVED
```

If stable/slow drift is undeclared:

```text
GATE_REGRESSION FAIL
reason: CACHE_ABI_UNDECLARED_STABLE_DRIFT
```

This design reuses existing permanent CI rather than restructuring release infrastructure.

## 13. Required implementation fixtures

A future implementation should prove at least:

```text
1. identical production/candidate prompt contract
   → stable PASS / slow PASS

2. JS refactor with byte-identical compiler output
   → PASS

3. whitespace-only change inside stable emitted bytes
   → FAIL under PRESERVE

4. version bump affecting full only
   → PASS + full observation

5. expected volatile runtime difference
   → does not fail stable/slow gate

6. undeclared stable wording change
   → FAIL

7. undeclared slow wording change
   → FAIL

8. explicitly declared reviewed slow semantic change
   → DECLARED path, not silent PASS

9. fixture execution error
   → INFRA/fixture error, never false PASS

10. no raw prompt body dumped into report

11. latest.js == install.js remains independently enforced

12. existing v0.64.x permanent runtime regression suites unchanged
```

## 14. Non-goals

```text
provider cache HIT guarantee
explicit Gemini cache object management
request mutation
history normalization
prompt relocation
Two-Plane Prompt implementation
Usage Dashboard runtime dependency
release-system redesign
```

The Guardian observes and blocks candidate byte regressions only.

## 15. Implementation ordering

This idea should not interrupt the currently active runtime/release workstream.

When activated later:

```text
main design/evidence freeze
→ dedicated tooling work branch
→ implement deterministic compiler extraction + fixture compare
→ static / CI self-tests
→ merge permanent verifier support
→ only then use it on future SimCore candidates
```

Because this is CI infrastructure rather than runtime behavior, keep its implementation separate from a SimCore feature mini.

## 16. Current classification

```text
GEMINI_CACHE_ABI_GUARDIAN
= HIGH VALUE
= LOW RUNTIME RISK
= CI-FIRST
= PREVENTION LAYER
= IDEA / DESIGN CANDIDATE

v1 hard authority:
stable + slow

v1 observation only:
volatile + full

provider cache guarantee:
NONE

runtime change:
NONE
```

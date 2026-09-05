# SimCore R-Series Feedback Rubric

Date: 2026-09-06 KST
Status: **CANONICAL OPERATING RUBRIC**
Classification: **RELEASE SYSTEM / CONTROL-PLANE FEEDBACK POLICY**

## 1. Purpose

When the operator asks for feedback on any SimCore `R`-series release-system or control-plane work, evaluate it by default through exactly three primary lenses:

```text
STABILIZATION
AUTOMATION
SIMPLIFICATION
```

These lenses are the default feedback frame unless the operator explicitly asks for another frame.

This policy applies to feedback/review. It does not itself authorize implementation, runtime mutation, release-simcore mutation, or repository-system restructuring.

## 2. Lens A — Stabilization

Ask whether the R-series change makes the release/control-plane system more deterministic, bounded, observable, and failure-safe.

Evaluate at least:

```text
- Does it remove an observed failure mode or ambiguity?
- Are authority and ownership boundaries clearer after the change?
- Does the path fail closed when identity, source, head, base, or evidence is ambiguous?
- Are exact-head / exact-base / immutable identity guarantees preserved where applicable?
- Does it reduce race, stale-selection, retry, concurrency, or state-drift risk?
- Are regressions permanently covered by executable validation?
- Is natural operational evidence available, and does it agree with deterministic validation?
- Did the change introduce any new FIX / BLOCKER / WATCH condition?
```

Preferred disposition vocabulary:

```text
STRONGER
UNCHANGED
WEAKER
UNVERIFIED
```

A feedback verdict must never call a system "stable" solely because one happy-path run passed.

## 3. Lens B — Automation

Ask whether correct behavior now requires less fragile human coordination and whether the automated path has enough machine-verifiable identity to act safely.

Evaluate at least:

```text
- Can a previously manual or interpretive step now be executed deterministically?
- Does automation carry exact transaction/run/source identity rather than infer it loosely?
- Are human approvals retained only where human authority is actually required?
- Does automation reobserve state after mutation instead of assuming success?
- Are retries/idempotency/repeated same-head cases safe?
- Are handoff states explicit and machine-readable?
- Does automation avoid silently selecting stale or merely similar artifacts/runs?
- Can failure recovery proceed append-only or with bounded recovery guidance?
```

Automation quality is not measured by the number of automated steps. More automation that relies on ambiguous identity, hidden assumptions, or best-effort selection is a regression.

Preferred disposition vocabulary:

```text
MORE AUTOMATIC AND SAFER
MORE AUTOMATIC BUT FRAGILE
NO MATERIAL CHANGE
MORE MANUAL
```

## 4. Lens C — Simplification

Ask whether the change reduces the number of concepts, owners, profiles, special cases, and state combinations needed to reason about the system.

Evaluate at least:

```text
- Did the change reuse an existing correct primitive/profile/owner instead of inventing a new one?
- Did it remove or collapse redundant routing/state/validation paths?
- Is the owner set minimal and explicit?
- Did it avoid profile proliferation?
- Did it avoid introducing another source-of-truth or compatibility layer?
- Is the resulting mental model easier to explain in one deterministic flow?
- Did the implementation stay within the frozen owner/impact set?
- Is any new complexity justified by a real invariant rather than convenience?
```

Preferred disposition vocabulary:

```text
SIMPLER
NEUTRAL
MORE COMPLEX BUT JUSTIFIED
MORE COMPLEX WITHOUT SUFFICIENT VALUE
```

## 5. Default R-series feedback structure

Unless the operator asks for a different format, feedback should answer in this order:

```text
1. Stabilization
2. Automation
3. Simplification
4. Cross-lens tradeoffs
5. KEEP / FIX / DEFER / BLOCKER recommendation
6. Next smallest one-purpose action
```

For each lens, distinguish verified evidence from inference.

## 6. Cross-lens rule

The three lenses are not independent scorecards. A change can improve one and harm another.

Examples:

```text
more automation + weaker identity binding = not an improvement
more stabilization + unnecessary profile proliferation = partially successful, simplification debt
simpler routing + weaker fail-closed behavior = reject
additional complexity + removal of a real race condition = may be justified
```

Default preference when outcomes conflict:

```text
STABILIZATION
> SAFE AUTOMATION
> SIMPLIFICATION
```

But simplification is still mandatory as a review question. A stable automated design should not accumulate avoidable conceptual debt.

## 7. Relationship to SimCore authority split

R-series feedback must preserve the established authority model:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed runtime byte and publication authority
latest.js == install.js = mandatory runtime identity invariant
```

Feedback must explicitly note when a proposed R-series change crosses this boundary.

## 8. Transaction separation

R-series feedback must favor one-purpose transactions.

Do not recommend combining:

```text
runtime feature repair
+
release/control-plane restructuring
```

or unrelated control-plane defects merely because they were discovered in the same live specimen.

Any anomaly discovered during feedback must be preserved and classified:

```text
WATCH / DEFER / FIX / BLOCKER
```

before moving on.

## 9. Canonical shorthand

When the operator says:

```text
R시리즈 피드백
R2.x 피드백
R 피드백
```

interpret the default review question as:

```text
안정화됐나?
자동화됐나?
단순해졌나?
```

Then support the answer with repository evidence rather than intuition alone.

## 10. Policy disposition

```text
R_SERIES_FEEDBACK_PRIMARY_LENSES = STABILIZATION + AUTOMATION + SIMPLIFICATION
DEFAULT_PRIORITY = STABILIZATION > SAFE_AUTOMATION > SIMPLIFICATION
EVIDENCE_REQUIRED = YES
IMPLEMENTATION_AUTHORITY_GRANTED = NO
RUNTIME_MUTATION = NONE
release-simcore_MUTATION = NONE
```

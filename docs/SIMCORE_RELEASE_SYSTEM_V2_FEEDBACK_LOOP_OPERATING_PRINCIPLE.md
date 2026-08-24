# SimCore Release System v2 — R-First Feedback Loop Operating Principle

Date: 2026-08-24
Status: **ACTIVE OPERATING PRINCIPLE · NON-RUNTIME**
Scope: Release System v2 sequencing and future SimCore update operations

## 1. Core decision

Finish and harden Release System v2 (`R`) before resuming the next planned SimCore runtime release.

Current intended sequence:

```text
finish current R work
→ use the completed R path for the next legitimate SimCore plugin update
→ collect release/update feedback and operational anomalies
→ preserve each finding as evidence
→ classify WATCH / DEFER / FIX / BLOCKER
→ harden R only where evidence justifies it
→ continue later plugin versions through the improved R path
```

R is therefore not a one-time repository migration that is considered finished merely because the first implementation works.

The first real plugin updates executed through R are qualification data for R itself.

## 2. Long-term goal

The goal is to make future SimCore updates materially easier and safer without weakening the existing evidence-driven process.

Desired steady state:

```text
product design/evidence
→ work-branch implementation
→ permanent static/CI verification
→ repeatable release transaction
→ release-simcore publication
→ real long-chat validation
→ bounded main state/evidence synchronization
```

Routine releases should require less bespoke release plumbing while preserving exact production identity, latest/install equality, fail-closed behavior, and real-live validation.

## 3. Feedback loop rule

Every real release executed through R may expose problems that shadow tests did not reveal.

Examples include:

```text
workflow ergonomics
identity binding gaps
state-sync drift
cleanup/retirement friction
rollback gaps
CI false positives/negatives
release evidence gaps
operator ambiguity
```

These findings must not be silently worked around.

Preserve them immediately and classify:

```text
WATCH
DEFER
FIX
BLOCKER
```

Then decide whether the finding belongs to:

```text
R infrastructure
product/runtime behavior
host/provider environment
administrative governance
```

Do not mix an R repair with an unrelated runtime feature in one work item.

## 4. Product-update relationship

After the current R work reaches its required completion gate, proceed to the next separately planned SimCore product version.

That product release becomes both:

```text
1. a normal evidence-backed SimCore update
2. a real operational exercise of R
```

Product semantics remain judged independently from release-system correctness.

A product bug does not automatically mean R failed.
An R transaction/authority/state-sync failure does not automatically mean the product change is wrong.

## 5. Authority preservation

Existing authority split remains unchanged:

```text
release-simcore
= actual plugin code and production deployment authority

main
= design, evidence, roadmap, release-system state, and administrative record authority
```

`plugins/simcore/latest.js` and `plugins/simcore/install.js` must remain identical for every production release.

## 6. Success condition for R

R is successful when repeated real SimCore updates become routine rather than bespoke while preserving or increasing safety.

Practical indicators:

```text
fewer per-version one-off workflows/scripts
less manual release identity editing
less main/document drift
repeatable static/CI gates
repeatable release-simcore publication
bounded rollback/recovery behavior
clear release evidence and status
faster operator execution with fewer ambiguous steps
```

The final optimization target is not maximum automation by itself.

The target is:

> **updates become easier because the safe process is encoded and reusable.**

## 7. Current sequencing intent

```text
R first
→ finish current Release System v2 work
→ next planned plugin version
→ observe real operational feedback
→ harden R from evidence
→ continue subsequent versions on the improved path
```

This operating principle should be preserved when deciding whether to advance R, start a runtime release, or respond to release-system feedback.

## 8. Progressive simplification and accumulated failure evidence

R should become simpler to operate over time even if its internal safeguards become richer.

The project already preserves failed attempts, failed CI runs, live anomalies, and their fixes as durable evidence. Repeated failures therefore become reusable release knowledge rather than rediscovered manual work.

Expected learning loop:

```text
first occurrence
→ preserve exact failure evidence
→ classify cause and authority boundary
→ repair narrowly
→ convert the proven failure mode into a permanent test/gate/check where appropriate
→ later releases detect or avoid the same class automatically
```

As this repeats, the operator-facing release path should shrink toward a small stable sequence while the repository carries the accumulated defensive knowledge.

The desired direction is:

```text
more historical evidence
+ more permanent regression coverage
+ more deterministic automation
=
fewer manual decisions for already-solved failure classes
+ faster routine updates
+ easier attribution when a genuinely new failure appears
```

Do not optimize by deleting evidence or weakening gates merely to reduce step count. Simplification is earned when a formerly manual judgment has been encoded safely and backed by recorded evidence.

Long-term target:

> **A normal SimCore update should be quick because past failures have already taught R how to handle the common cases.**

## 9. Project-owned enforcement over manual platform governance

Do not make manual GitHub platform enforcement a default dependency of the SimCore release process.

The preferred direction is to encode required safety properties inside repository-owned, testable, evidence-backed controls that the project can evolve directly.

Examples include:

```text
exact-candidate CI binding
project-authority write gateways
path allowlists
fast-forward-only writes
production-parent revalidation
immutable release identity checks
bounded state writers
fail-closed controller logic
permanent regression tests
```

If a GitHub platform feature is unavailable, awkward to maintain manually, or would create recurring operator dependence, first ask whether the same safety property can be implemented and verified inside R using existing repository and automation capabilities.

This does not mean external platform safeguards are forbidden. They may be adopted later when they provide clear additional value and can be managed without becoming a manual operating dependency.

However, absence of such a platform feature must not remain a permanent blocker when an equivalent or stronger project-owned control can be demonstrated with durable evidence.

Manual owner bypass of an established project-authority gateway is outside authorized SimCore operation and must be treated as an authority violation rather than as a normal alternative workflow.

Preferred long-term principle:

> **SimCore should depend primarily on controls it can encode, test, preserve, and improve itself; platform governance is optional defense-in-depth, not the default source of correctness.**

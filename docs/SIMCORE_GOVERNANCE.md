# SimCore Development Governance

> Durable governance for how SimCore development decisions are recorded, reviewed, and escalated.
>
> This file complements `SIMCORE_GUIDELINES.md` (durable technical principles) and `CURRENT_DEVELOPMENT.md` (current production state / roadmap / evidence).

---

## 1. Live Documentation Rule

Development principles are not left only in chat memory.

When a new durable rule, release policy, architecture principle, validation rule, or roadmap constraint becomes clear during development, update the appropriate repository documentation **in the same working session**.

Default placement:

```text
SIMCORE_GUIDELINES.md
→ durable technical / safety / architecture principles

CURRENT_DEVELOPMENT.md
→ current release state / roadmap / evidence / deferred work / current freezes

SIMCORE_GOVERNANCE.md
→ development cadence / documentation protocol / architecture-review process
```

Do not wait for a later release merely to record a principle that has already been agreed.

## 2. Conflict-First Rule

Do not silently overwrite an existing rule when a newly proposed principle conflicts with:

- production behavior;
- `SIMCORE_GUIDELINES.md`;
- the current roadmap;
- a Hard Freeze;
- verified diagnostic evidence;
- release engineering constraints;
- another governance rule.

When a conflict exists:

```text
1. identify the conflicting rule/evidence;
2. explain the practical consequence;
3. decide whether the new rule supersedes, narrows, or is rejected by the old rule;
4. only then update the durable documents.
```

If there is no material conflict, documentation maintenance may be performed directly without asking for a separate documentation-only confirmation.

## 3. Token-Milestone Release Cadence

Long-chat token milestones are scheduled architecture-review points.

```text
every +500,000 tokens  → Medium Update Review
every +1,000,000 tokens → Major Update Review
```

Canonical milestone pattern:

```text
1.0M → Major
1.5M → Medium
2.0M → Major
2.5M → Medium
3.0M → Major
...
```

A milestone is a **review/update window, not a mandatory feature dump**. The architecture review should occur even when evidence ultimately justifies a smaller implementation.

Mini releases between milestones remain evidence-driven and narrowly scoped.

## 4. Medium Update Architecture Review

Every Medium Update should include an explicit modularization review of the existing plugin.

Primary questions:

- Has responsibility drifted between existing modules?
- Are helpers or diagnostics living under the wrong owner?
- Has duplicate logic appeared?
- Can dependency direction be simplified without changing behavior?
- Are module public/internal boundaries still clear?

Preferred character:

```text
boundary cleanup
ownership correction
helper consolidation
duplicate-responsibility removal
behavior-preserving refactor
```

Do not create modules merely to increase module count.

## 5. Major Update Architecture Review

Every Major Update should perform a deeper architecture and modularization review before major feature work.

Review at least:

- module ownership;
- dependency graph;
- state ownership;
- storage ownership;
- request/output boundaries;
- diagnostic ownership;
- long-chat scaling pressure;
- future extension seams;
- whether modules should be split, merged, or remain unchanged.

The primary question is:

> Who owns this state / decision / behavior now, and is that still the correct owner at the current scale?

A Major Update may introduce a new subsystem or interface when evidence and future scaling justify it, but should not rewrite proven execution order simply for aesthetic cleanliness.

## 6. Separate Mechanical Refactor From New Behavior

Within Medium/Major work, prefer this order:

```text
ownership map
→ dependency map
→ identify boundary violations
→ behavior-preserving mechanical refactor
→ regression verification
→ new behavior / new subsystem
→ real long-chat validation
```

Where practical, keep architecture cleanup and new behavior in distinguishable commits or phases so regressions remain attributable.

## 7. Future Plugin / Feature Transplants

External or older experimental plugins may be treated as **future feature donors**, not mandatory merge targets.

Examples such as archive/vision/provider functionality are candidates whose useful capabilities may later be transplanted into SimCore or a future subsystem.

Rules:

- do not assume the original plugin must be merged wholesale;
- extract the capability/contract first;
- design a stable interface before choosing an implementation when possible;
- allow the future implementation to be disabled or replaced;
- preserve current production behavior until the new path is deliberately activated and validated.

## 8. Documentation Maintenance Responsibility

During active SimCore development, the assistant should proactively maintain the durable documents when a clear new principle or decision emerges.

The user does not need to separately say “update the MD” every time.

Exception: when the proposed documentation change would resolve a real conflict by changing an existing agreed rule, report the conflict first rather than silently choosing one side.

## 9. Review at Release Boundaries

After a Medium or Major update, review all three documentation layers:

```text
SIMCORE_GUIDELINES.md
CURRENT_DEVELOPMENT.md
SIMCORE_GOVERNANCE.md
```

Confirm that:

- current production identity is correct;
- completed work moved out of future roadmap sections;
- deferred work still has valid evidence triggers;
- Hard Freeze reflects the new architecture;
- governance/cadence has not been accidentally contradicted;
- future conversations can reconstruct why the architecture looks the way it does.

---

## Current Milestone Context

At the current long-chat scale, the project has crossed the `2.0M` token milestone, which corresponds to a **Major Update Review** under this cadence.

The current production release remains `v0.63.55 — Representation Fast Reconcile`; its real long-chat validation remains a checkpoint while the 2.0M major architecture review is prepared.

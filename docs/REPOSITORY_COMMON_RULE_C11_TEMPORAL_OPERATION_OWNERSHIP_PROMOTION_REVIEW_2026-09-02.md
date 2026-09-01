# Repository Common Rule C11 Promotion Review: Temporal Operation Ownership (2026-09-02)

Status: **PROMOTION REVIEW PASS · RCR-C11 CONDITIONAL CANDIDATE ACCEPTED · POLICY/DOCS ONLY · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## Candidate

```text
LATE EFFECTS REQUIRE CURRENT OPERATION AUTHORITY
```

Proposed class: `CONDITIONAL`.

## Promotion-contract review

### 1. General value: PASS

The rule is independently supported in more than one project/domain.

PocketRisu Helper Mod preserves the adopted optimistic-cache rollback invariant:

```text
each optimistic mutation owns a unique operation generation/token
failed operation may roll back only while its token is still current
reset/clear invalidates outstanding rollback authority
```

The source evidence explicitly records that value equality is not sufficient ownership proof: an older failed write and a newer successful write may contain the same value, so a stale failure must not reverse the later operation.

SimCore independently uses runtime lifecycle currentness rather than value comparison. Its refreshless replacement safety model captures a runtime epoch and rejects work when the runtime is disposed or the captured epoch is no longer current. S4-1 later converged ten stale-runtime decisions behind one current-runtime guard while preserving the existing epoch/disposed semantics.

Usage Dashboard independently preserves a monotonic candidate/main/release publisher guard so stale jobs cannot downgrade production.

These are different implementations and different products, but they share the same authority principle:

```text
operation completion / failure / apparent value equality
!=
continued authority to mutate current state
```

### 2. No mutable truth: PASS

The candidate contains no version, SHA, deployment state, current runtime identity, release identity, or other mutable project fact.

### 3. No project constants: PASS

The promoted wording does not require PocketRisu cache keys, SimCore runtime field names, Usage Dashboard branch names, exact timeout/concurrency values, or any other project-specific constant.

### 4. Classified scope: PASS

`CONDITIONAL` is the narrowest correct class.

It applies when operations may overlap, be superseded, or finish after the affected target/lifecycle has advanced and the late completion can still mutate shared or authoritative state.

It does not require every asynchronous task to gain a generation counter.

### 5. Registered-project conflict review: PASS

Current catalog-guideline review covered:

```text
plugin:devpass
plugin:simcore
plugin:termux-large-doc-editor
plugin:usage-dashboard
plugin:voyage-token-check
product:pocketrisu-helper-mod
```

No registered guideline requires stale or superseded operations to retain unconditional mutation authority.

Relevant compatible patterns include:

- DevPass / Voyage Token Check: check-only profiles do not gain write authority implicitly.
- SimCore: captured runtime epoch/currentness guards stale work and replacement lifecycle effects.
- Termux: source/provenance ownership is preserved rather than inferred from convenience state.
- Usage Dashboard: monotonic release guarding prevents stale jobs from downgrading production.
- PocketRisu Helper Mod: operation-generation ownership is the originating concrete concurrency invariant.

No policy conflict was found.

### 6. Owner preservation: PASS

The common rule does not define one universal clock, counter, token map, lease system, transaction layer, or last-write-wins policy.

Concrete projects still own:

```text
what operations can overlap
what state/target an operation owns
what event supersedes or revokes that authority
which late effects require revalidation
how currentness is proven
how stale work is dropped/rejected/reconciled
```

Possible project-owned proof mechanisms include serialization, operation token/generation, epoch/revision checks, compare-and-swap or preconditions, stable captured target identity, or another bounded owner-defined guard.

### 7. Provenance: PASS

Primary source evidence:

```text
products/pocketrisu-helper-mod/docs/features/plugins/optimistic-cache-rollback-write-generation/INVARIANT.md
```

Independent repository evidence:

```text
docs/SIMCORE_06901_REFRESHLESS_TARGETED_UPDATE_LIVENESS_REPAIR_DESIGN_2026-08-30.md
docs/SIMCORE_S4_1_RUNTIME_CURRENT_GUARD_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md
docs/USAGE_DASHBOARD_GUIDELINES.md
```

Registered-project locators were re-read through:

```text
docs/REPO_PROJECT_CATALOG.md
```

and each currently registered project guideline.

## Important counterexamples / scope guards

The candidate must not become:

```text
EVERY ASYNC OPERATION NEEDS A GENERATION TOKEN
```

or:

```text
NEWER TIMESTAMP ALWAYS WINS
```

Correct distinction:

```text
operations cannot overlap / no stale completion can mutate state
→ no temporal ownership mechanism required by this rule

late effect is explicitly safe under the owning contract
(idempotent / commutative / append-only as actually defined)
→ project may specialize without a token system

overwrite / rollback / restore / repopulate / retarget / replacement effect
+ operation may have been superseded
→ current mutation authority must be revalidated

explicit authorized rollback/revert to an older semantic state
→ may be valid when the owning contract grants that operation authority
```

Temporal recency is not semantic truth. The rule is about continued mutation authority, not a universal last-write-wins ordering.

## Relationship to RCR-H07

RCR-H07 already protects Git/CI/release/production gates and states that a monotonic production/release system must not let stale automation downgrade newer authoritative production state.

RCR-C11 does not weaken or duplicate that gate. It generalizes the same temporal-ownership shape to other conditional overlapping-operation surfaces such as runtime lifecycle callbacks, optimistic rollback, asynchronous restore/repopulation, or retargetable work.

RCR-H07 remains the stronger production/release invariant inside its scope.

## Selected common wording

```text
RCR-C11 – Late effects require current operation authority

When operations can overlap, be superseded, or complete after their target or lifecycle state has advanced, an operation must not apply a late mutation merely because it started earlier, completed successfully, failed, or still observes the same value. Before an effect can overwrite, roll back, restore, repopulate, retarget, or otherwise reverse or replace shared or authoritative state, the operation must still satisfy the owning contract's current operation/target authority for that effect.

Projects retain ownership of the proof mechanism and revocation semantics. Depending on the system, valid mechanisms may include serialization, an operation token/generation, epoch or revision checks, compare-and-swap/preconditions, stable captured target identity, or another owner-defined currentness guard. This rule does not require a token system when operations cannot race or when late effects are explicitly safe under the owning contract, such as properly defined idempotent, commutative, or append-only effects. Temporal recency alone does not manufacture semantic authority.
```

## Verdict

```text
PROMOTE
CLASS = CONDITIONAL
NO RUNTIME AUTHORITY
NO PROJECT SEMANTICS OVERRIDDEN
```

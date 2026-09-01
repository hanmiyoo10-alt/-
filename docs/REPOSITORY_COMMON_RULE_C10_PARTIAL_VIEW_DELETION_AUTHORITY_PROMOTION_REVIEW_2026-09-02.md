# Repository Common Rule C10 Promotion Review — Partial / Projected View Deletion Authority — 2026-09-02

Status: **PROMOTION REVIEW PASS · RCR-C10 CONDITIONAL CANDIDATE ACCEPTED · POLICY/DOCS ONLY · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## Candidate

```text
INCOMPLETE / PROJECTED VIEW
DOES NOT OWN DELETION-BY-OMISSION
```

Proposed class: `CONDITIONAL`.

## Promotion-contract review

### 1. General value — PASS

The rule is independently supported in more than one project/domain.

PocketRisu Helper Mod preserves the adopted `PLUGIN-STORAGE-PARTIAL-WRITE-MERGE-SEMANTICS` invariant after a compatibility-facing partial `pluginCustomStorage` view was incorrectly treated as complete replacement state and omitted keys were erased. Its durable rule is that missing keys in an incomplete view are unspecified, not deletion intent; destructive clear/replacement requires explicit intent or proof that the incoming snapshot is complete and authoritative.

SimCore independently froze the same ownership shape in 3M-9 and Candidate C design:

```text
projected writes own only explicitly contracted fields
omitted / unowned host metadata != deletion intent
writes must be owner-scoped
unowned metadata must be preserved
```

This is therefore not a PocketRisu-only storage constant.

### 2. No mutable truth — PASS

The candidate contains no version, SHA, deployment state, current runtime state, release identity, or other mutable project fact.

### 3. No project constants — PASS

The promoted wording does not mention PocketRisu storage keys, SimCore source families, branch names, paths, timing values, UI semantics, or other product-specific constants.

### 4. Classified scope — PASS

`CONDITIONAL` is the narrowest correct class.

It applies only when a writer/merge/reconciliation path receives a representation that may be partial, projected, compatibility-facing, lazily hydrated, or otherwise not proven complete.

It is not a universal merge-only mandate.

### 5. Registered-project conflict review — PASS

Current catalog-guideline review covered:

```text
plugin:devpass
plugin:simcore
plugin:termux-large-doc-editor
plugin:usage-dashboard
plugin:voyage-token-check
product:pocketrisu-helper-mod
```

No registered guideline requires an incomplete or projected view to imply deletion for omitted fields.

Relevant compatible patterns include:

- DevPass / Voyage Token Check: check-only profiles do not authorize destructive writers by implication.
- Termux / Usage Dashboard: unknown/source-fidelity boundaries preserve absent or unproven information rather than manufacturing state.
- SimCore: owner-scoped projected writes preserve unowned host metadata.
- PocketRisu Helper Mod: the source adopted invariant is the originating production evidence.

No policy conflict was found.

### 6. Owner preservation — PASS

The common rule does not define a universal persistence schema, merge algorithm, or delete API.

Concrete projects still own:

```text
what counts as complete
what counts as authoritative
which fields a writer owns
how explicit clear / replace intent is represented
how merge / replacement is validated
```

A project whose documented API receives a complete authoritative snapshot may still use replacement semantics.

### 7. Provenance — PASS

Primary source evidence:

```text
products/pocketrisu-helper-mod/docs/features/plugins/plugin-storage-partial-write-merge-semantics/INVARIANT.md
```

Independent repository evidence:

```text
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md
```

Registered-project locators were re-read through:

```text
docs/REPO_PROJECT_CATALOG.md
```

and each currently registered project guideline.

## Important counterexample / scope guard

The candidate must not become:

```text
ALL WRITES MUST MERGE
```

Correct distinction:

```text
partial / projected / incomplete view
+ omission
→ no deletion authority from omission alone

complete + authoritative snapshot
→ replacement may be valid under the owning contract

explicit clear / replace operation
→ destructive intent may be valid under the owning contract
```

Completeness and authority are contract properties, not assumptions inferred from the fact that a generic setter accepted the object.

## Selected common wording

```text
RCR-C10 — Incomplete/projected views do not own deletion-by-omission

When a writer, compatibility surface, projection, lazy/externalized view, or partial snapshot is not proven complete and authoritative for the affected state, omitted fields/keys mean unspecified, not delete. Destructive clear or replacement requires explicit destructive intent or an owning contract that proves the incoming representation is complete and authoritative for that replacement scope.

Do not let externalization, lazy hydration, projection, compatibility adaptation, or partial reads silently widen omission semantics into deletion authority. Projects retain ownership of completeness proofs, field/write ownership, merge behavior, and explicit clear/replace APIs.
```

## Verdict

```text
PROMOTE
CLASS = CONDITIONAL
NO RUNTIME AUTHORITY
NO PROJECT SEMANTICS OVERRIDDEN
```

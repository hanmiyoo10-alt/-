---
name: plugin-authority-scan
description: >-
  Resolve the owning repository authority for Local Usage Dashboard work before analysis,
  design, implementation, or release decisions. Use when a task asks for the current
  Usage Dashboard source of truth, release branch, manifest, artifact, guideline, or exact
  evidence location, or when mutable Usage Dashboard state must be verified before acting.
  Read-only pilot: locate and re-read authorities; never mutate repository state or infer
  missing facts. Do not use this skill to diagnose runtime behavior, edit code, or execute releases.
---

# Plugin Authority Scan

Read-only pilot for `plugin:usage-dashboard`.

This skill answers one question: **which current repository sources own the truth needed for this Local Usage Dashboard task, and which exact sources were re-read before a claim was made?**

It is a locator and verification procedure, not a source of mutable truth.

## Hard boundaries

- Do not edit files, issues, branches, pull requests, releases, production state, or device state.
- Do not use conversation memory as authority for current versions, SHAs, deployment state, runtime health, or release identity.
- Do not copy mutable values from this skill into future claims.
- Preserve `UNKNOWN` when a required source cannot be read.
- Preserve `CONFLICT` when current owning sources disagree and the owning contract does not resolve the disagreement.
- Do not silently continue into diagnosis, design, implementation, or release execution. Hand off after the authority scan.
- This pilot is validated only for `plugin:usage-dashboard`. For another scope, report `UNVALIDATED_SCOPE` and stop; a later compatibility review owns promotion.

These boundaries operationalize `docs/REPOSITORY_COMMON_RULES.md`, especially RCR-H01/H02/H03/H08, RCR-D08/D09/D10, and RCR-C08.

## Procedure

### 1. Confirm the repository and pilot scope

Work only in the repository containing:

- `.github/plugin-control-plane/registry.json`
- `docs/REPO_PROJECT_CATALOG.md`
- `docs/REPOSITORY_COMMON_RULES.md`

For this pilot, the requested scope must resolve to `plugin:usage-dashboard` / Local Usage Dashboard.

If the user asks about another plugin or product, stop with:

`UNVALIDATED_SCOPE — plugin-authority-scan pilot currently validates only plugin:usage-dashboard.`

Do not improvise another project's authority order.

### 2. Resolve registered locators mechanically

From the repository root, run:

```bash
python3 .agents/skills/plugin-authority-scan/scripts/scan_authority.py \
  --repo-root . \
  --scope plugin:usage-dashboard \
  --json
```

You may pass a user phrase or path instead of the exact scope, for example `Local Usage Dashboard` or `plugins/usage-dashboard/runtime/product-manifest.json`.

Treat the helper output as **locators only**. Its `declared_authority` fields are pointers from repository registration; they are not proof of the current values stored at those locations.

If the helper returns an error, ambiguity, missing registration/catalog entry, or `pilot_validated: false`, stop. Do not guess.

### 3. Re-read the owning policy and project contract

Read, in this order:

1. `docs/REPOSITORY_COMMON_RULES.md`
2. `docs/REPO_PROJECT_CATALOG.md`
3. `.github/plugin-control-plane/registry.json`
4. the `guideline` path emitted by the helper

The owning guideline decides the project-specific truth order. Repository registration does not override it.

For Local Usage Dashboard, follow the guideline's current `Source of truth` section rather than relying on a copied version number or old release note.

### 4. Re-read the exact mutable authority needed by the task

Use the helper's `declared_authority` as a locator set.

If the task depends on current production/release identity, read the manifest at the declared production release branch **now**. A local `main` copy is not a substitute for the production branch merely because the paths match.

If the task depends on current source, read the relevant current `main` files under the registered primary path.

If the task depends on real-device/runtime evidence, use only current device diagnostics supplied through the owning project workflow; this skill does not manufacture or request artificial traffic.

Read only the sources required by the question. Do not broaden the scan into unrelated repository archaeology.

### 5. Reconcile or fail closed

Compare registration, owning guideline, and exact evidence.

Use:

- `VERIFIED` — the needed claim is directly supported by the current owning source(s) you re-read.
- `UNKNOWN` — the needed source is missing, unavailable, or insufficient.
- `CONFLICT` — current authoritative-looking sources disagree and the owning contract does not resolve it.
- `LOCATOR_ONLY` — you resolved where truth lives but did not read enough evidence to claim the mutable value.

Never convert `UNKNOWN` to zero, an old remembered value, or a plausible fallback.

### 6. Return a compact authority report

Use this shape:

```markdown
## Authority scan

- Scope: `plugin:usage-dashboard` — Local Usage Dashboard
- Registration: `<registry path>` + `<catalog path>`
- Owning guideline: `<guideline path>`
- Declared authority locators:
  - release branch: `<ref or —>`
  - manifest: `<path or —>`
  - artifact: `<path or —>`
  - release specs: `<path or —>`
- Fresh reads performed:
  - `<ref:path>` — `<what it proves>`
- Verdict: `VERIFIED | LOCATOR_ONLY | UNKNOWN | CONFLICT`
- Blocked claims: `<none or exact claims that remain unproven>`
```

Do not paste large source files. Cite or name the exact paths/refs that support the result.

## Completion criterion

The scan is complete only when:

- the scope resolved unambiguously to the pilot scope;
- the registration and catalog agree on the locator set or any mismatch is reported as `CONFLICT`;
- the owning guideline was re-read;
- every mutable claim in the answer is backed by a fresh read of the source that owns it;
- no mutation occurred.

Then stop and hand off to the next appropriate workflow if the user's broader task requires diagnosis, design, implementation, or release work.

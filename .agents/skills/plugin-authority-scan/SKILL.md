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

This skill answers one question: **which current repository sources own the truth needed for this task, which exact ref/path reads are justified by the owning project contract, and which sources were freshly re-read before a claim was made?**

It is a locator and verification procedure, not a source of mutable truth.

## Hard boundaries

- Do not edit files, issues, branches, pull requests, releases, production state, or device state.
- Do not use conversation memory as authority for current versions, SHAs, deployment state, runtime health, or release identity.
- Do not copy mutable values from this skill into future claims.
- Preserve `UNKNOWN` when a required source or ref ownership cannot be resolved.
- Preserve `CONFLICT` when current owning sources disagree and the owning contract does not resolve the disagreement.
- Treat registry/catalog authority fields as **independent locators** unless the current owning project contract explicitly binds them together.
- Do not default every path to `main` or every path to a release branch.
- Do not silently continue into diagnosis, design, implementation, or release execution. Hand off after the authority scan.
- This pilot is validated only for `plugin:usage-dashboard`. For another scope, report `UNVALIDATED_SCOPE` and stop; a later compatibility review owns promotion.

These boundaries operationalize `docs/REPOSITORY_COMMON_RULES.md`, especially RCR-H01/H02/H03/H08, RCR-D08/D09/D10/D11/D12/D13, and RCR-C08/C09.

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

### 2. Discover registered locators mechanically

From the repository root, run:

```bash
python3 .agents/skills/plugin-authority-scan/scripts/scan_authority.py \
  --repo-root . \
  --scope plugin:usage-dashboard \
  --json
```

You may pass a user phrase or path instead of the exact scope, for example `Local Usage Dashboard` or `plugins/usage-dashboard/runtime/product-manifest.json`.

Treat the helper output as **locators only**. Its `declared_authority` fields are independent pointers from repository registration; adjacency does not prove that a ref-like field owns a path-like field.

If the helper returns an error, ambiguity, missing registration/catalog entry, catalog conflict relevant to the task, or `pilot_validated: false`, stop. Do not guess.

### 3. Re-read the owning policy and project contract

Read, in this order:

1. `docs/REPOSITORY_COMMON_RULES.md`
2. `docs/REPO_PROJECT_CATALOG.md`
3. `.github/plugin-control-plane/registry.json`
4. the `guideline` path emitted by the helper
5. any detailed authority contract that the owning guideline explicitly names for the requested claim

The owning guideline decides the project-specific truth order. Repository registration does not override it.

For Local Usage Dashboard, follow the guideline's **current** source-of-truth/authority sections rather than relying on a copied version number, remembered branch/path relationship, or old release note.

### 4. Build a task-specific authority plan

Before reading mutable evidence, map the requested claim to exact evidence reads.

Use this conceptual shape:

```text
requested claim
→ owning project contract
→ exact source owner(s)
→ justified ref:path read(s)
→ bounded claim each read can prove
```

A resolved ref/path pair is valid only when the owning contract or current owning evidence justifies that association.

Do **not** infer:

```text
releaseBranch + manifest → releaseBranch:manifest
```

merely because both locators exist.

Likewise, do not assume `main` owns every registered path.

A task may legitimately require multiple current reads from different refs.

Recommended authority-plan fields:

```json
{
  "scope": "plugin:usage-dashboard",
  "question_class": "release_identity | production_bytes | current_source | runtime_health | other",
  "contract_reads": [
    {"ref": "<ref>", "path": "<path>", "purpose": "<why this contract is needed>"}
  ],
  "evidence_reads": [
    {
      "ref": "<resolved current ref>",
      "path": "<resolved path>",
      "claim": "<bounded claim>",
      "basis": "<contract/evidence that justifies this ref:path ownership>"
    }
  ],
  "unresolved": [],
  "status": "PLAN_READY | UNKNOWN | CONFLICT"
}
```

The plan is a derived execution artifact, not a source of truth.

If a plan is serialized to JSON, it may be structurally checked with:

```bash
python3 .agents/skills/plugin-authority-scan/scripts/validate_authority_plan.py \
  --plan <path-to-plan.json> \
  --json
```

That validator checks shape/provenance only. It does not decide which branch owns a path.

### 5. Re-read the exact mutable evidence required by the plan

Perform only the reads justified by the authority plan.

If the task depends on current production/release identity, use the owning contract to decide which current ref/path pair or pairs own release identity and production bytes. Do not construct a pair from registry fields alone.

If the task depends on current source, read the relevant current source under the ref owned by the project contract for that claim.

If the task depends on real-device/runtime evidence, use only current device diagnostics supplied through the owning project workflow; this skill does not manufacture or request artificial traffic.

Read only the sources required by the question. Do not broaden the scan into unrelated repository archaeology.

### 6. Reconcile or fail closed

Compare registration, owning guideline/contract, planned ref/path ownership, and exact evidence.

Use:

- `VERIFIED` — the needed claim is directly supported by the current owning source(s) you re-read.
- `UNKNOWN` — the needed source, ref ownership, or evidence is missing, unavailable, or insufficient.
- `CONFLICT` — current authoritative-looking sources disagree and the owning contract does not resolve it.
- `LOCATOR_ONLY` — you resolved where truth may live but did not read enough evidence to claim the mutable value.

Never convert `UNKNOWN` to zero, an old remembered value, a guessed ref, or a plausible fallback.

### 7. Return a compact authority report

Use this shape:

```markdown
## Authority scan

- Scope: `plugin:usage-dashboard` — Local Usage Dashboard
- Registration: `<registry path>` + `<catalog path>`
- Owning guideline: `<guideline path>`
- Declared locators:
  - release branch: `<ref locator or —>`
  - manifest: `<path locator or —>`
  - artifact: `<path locator or —>`
  - release specs: `<path locator or —>`
- Authority plan:
  - `<ref:path>` — `<bounded claim>` — basis: `<owner/provenance>`
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
- every resolved `ref:path` read has a stated ownership basis;
- every mutable claim in the answer is backed by a fresh read of the source that owns it;
- unresolved ref ownership remains `UNKNOWN` rather than being guessed;
- no mutation occurred.

Then stop and hand off to the next appropriate workflow if the user's broader task requires diagnosis, design, implementation, or release work.

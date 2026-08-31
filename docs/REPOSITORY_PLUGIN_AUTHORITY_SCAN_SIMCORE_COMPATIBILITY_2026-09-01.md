# `plugin-authority-scan` — SimCore Second-Scope Compatibility Review

Date: 2026-09-01 KST

Status: **READ-ONLY REVIEW COMPLETE — COMPATIBLE LOCATOR / PROCEDURE GENERALIZATION REQUIRED**

Scope: second-scope review of the repository Agent Skill pilot `.agents/skills/plugin-authority-scan/` against `plugin:simcore`.

This document does not authorize repository-wide skill promotion, modify the skill, change SimCore source, change `release-simcore`, or claim live model eval/trigger success.

Related evidence:

- first pilot: #1093 / PR #1095
- second-scope review issue: #1097
- methodology: `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`
- common rules: `docs/REPOSITORY_COMMON_RULES.md`

## 1. Verdict

The review result is:

```text
DETERMINISTIC LOCATOR ALGORITHM     COMPATIBLE
PROJECT-OWNED PRECEDENCE MODEL      COMPATIBLE IN PRINCIPLE
CURRENT SKILL PROCEDURE             NOT GENERIC ENOUGH
SIMCORE PILOT VALIDATION            NOT GRANTED
REPOSITORY-WIDE PROMOTION           BLOCKED
```

Canonical classification:

**`COMPATIBLE_LOCATOR / PROCEDURE_GENERALIZATION_REQUIRED`**

The important distinction is that the helper correctly treats registry/catalog data as locators, while one Usage Dashboard-specific instruction in `SKILL.md` combines two independent locators into a universal rule that is false for SimCore.

## 2. Sources freshly re-read

### Repository registration

`docs/REPO_PROJECT_CATALOG.md` and `.github/plugin-control-plane/registry.json` currently register SimCore as:

```text
scope          plugin:simcore
lifecycle      production
primary path   plugins/simcore/**
releaseBranch  release-simcore
manifest       product-manifest.json
artifact       plugins/simcore/latest.js
guideline      docs/SIMCORE_GUIDELINES.md
```

The registry and generated catalog agree on these locator values.

### Owning guideline

`docs/SIMCORE_GUIDELINES.md` currently defines SimCore's Source of Truth order as:

```text
1. current production behavior and production code
2. docs/SIMCORE_GUIDELINES.md
3. real long-chat diagnostics from the current version
4. current version release notes
5. historical diagnostics and design notes
6. hypotheses and assumptions
```

It also says that a production-code/guideline disagreement must be investigated rather than resolved by blindly selecting one side.

### Current release identity

`main:product-manifest.json` currently records:

```text
product             SimCore
production_version  0.70.1
release_branch      release-simcore
release_commit      861100f4771967aa5b8ab8811d06f11702c0d3ff
release_blob        8f332cfceed316d35954e353c2eaca38c2f34d95
latest              plugins/simcore/latest.js
install             plugins/simcore/install.js
```

Its `source_of_truth` block explicitly distinguishes runtime behavior, release identity, development principles, current investigation, and architecture/evidence owners.

### Current production branch

Fresh branch read shows:

```text
release-simcore head
= 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

This matches `main:product-manifest.json`'s `release_commit`.

The root of `release-simcore` contains only the bounded release-channel tree (`README.md`, `.github/`, `plugins/`). It does **not** contain `product-manifest.json`.

`release-simcore:plugins/simcore/latest.js` exists at blob:

```text
8f332cfceed316d35954e353c2eaca38c2f34d95
```

and currently declares:

```text
//@version 0.70.1
```

That blob matches `main:product-manifest.json`'s `release_blob`.

## 3. What the helper gets right

The deterministic helper `scripts/scan_authority.py` is structurally reusable for SimCore.

### 3.1 Scope resolution is generic

Its resolver builds entries from current registry `plugins` and `products` rather than carrying a hard-coded SimCore table.

For the exact query `plugin:simcore`, its matching contract selects the current registry entry by scope ID.

The same code can also resolve registered display names, issue values, and registered paths.

### 3.2 Mutable truth is not embedded

The helper contains no SimCore version, release SHA, release blob, production health state, or device state.

It reads registration/catalog data at execution time.

### 3.3 Locator output is correctly bounded

The helper labels its output:

```text
truth_claim_status = LOCATOR_ONLY
mutation_performed = false
```

This is correct for SimCore as well. A registry field such as:

```text
manifest = product-manifest.json
```

identifies a source location but does not, by itself, prove what current version the manifest contains or which ref owns that manifestation.

### 3.4 Project guideline remains the precedence owner

The helper's `fresh_read_requirements` already says:

> Read the owning guideline and follow its project-specific source-of-truth order.

That principle is exactly what SimCore requires and is the strongest evidence that the helper architecture itself is compatible.

### 3.5 Pilot allowlist correctly prevents accidental promotion

The helper currently contains:

```text
PILOT_VALIDATED_SCOPES = { plugin:usage-dashboard }
```

Therefore SimCore remains mechanically discoverable but is not marked pilot-validated. This is the correct state during the second-scope review.

## 4. The blocker: `releaseBranch + manifest` cannot be universally joined

The current Usage Dashboard pilot `SKILL.md` says, in effect:

```text
if current production/release identity is needed
→ read the manifest at the declared production release branch
```

That is valid for Local Usage Dashboard because its owning project contract places the production manifest at:

```text
release-usage-dashboard:
plugins/usage-dashboard/runtime/product-manifest.json
```

It is **not valid for SimCore**.

For SimCore, current evidence is split:

```text
main:product-manifest.json
    owns release identity / expected release commit + blob

release-simcore:plugins/simcore/latest.js
release-simcore:plugins/simcore/install.js
    own current production artifact bytes
```

The `release-simcore` branch deliberately does not carry `product-manifest.json`.

Therefore these registry values are independent locators:

```text
releaseBranch = release-simcore
manifest      = product-manifest.json
artifact      = plugins/simcore/latest.js
```

They must not be interpreted as:

```text
release-simcore:product-manifest.json
```

unless the owning project contract explicitly says so.

## 5. Why this is a useful second-scope result

This difference validates an important part of the repository skill methodology:

> a common skill may centralize discovery/procedure, but it must not centralize project-owned mutable truth or invent one repository-wide authority ordering.

The two production plugins demonstrate different valid authority topologies.

### Local Usage Dashboard

Simplified current pattern:

```text
registry/catalog
→ Usage Dashboard guideline
→ production release branch manifest
→ artifact/runtime identities
```

### SimCore

Simplified current pattern:

```text
registry/catalog
→ SimCore guideline
→ main release-identity manifest
   + release-simcore production artifact/code
   + real long-chat diagnostics when runtime behavior is at issue
```

A reusable skill must support both without pretending they are the same topology.

## 6. Required generalization before a SimCore pilot

The next implementation, if separately authorized, should change the portable procedure from **ref construction** to **authority-plan resolution**.

### 6.1 Keep registry fields independent

Do not derive a compound `ref:path` merely because both `releaseBranch` and `manifest` exist.

Represent each as a locator:

```text
releaseBranch  -> branch/ref locator
manifest       -> path locator
artifact       -> path locator
releaseSpecDir -> path locator
```

The owning guideline/current project contract decides which ref applies to each path.

### 6.2 Separate discovery from read plan

Recommended conceptual stages:

```text
A. DISCOVER
   scope + guideline + declared locator vocabulary

B. READ PROJECT CONTRACT
   determine project-specific authority ordering and ref ownership

C. BUILD TASK-SPECIFIC READ PLAN
   exact ref:path pairs needed for this question

D. READ EVIDENCE
   perform those fresh reads

E. RECONCILE
   VERIFIED / LOCATOR_ONLY / UNKNOWN / CONFLICT
```

The helper may remain deterministic at stage A. Stage B/C must not silently infer a global ref/path join rule.

### 6.3 Output should expose ref ownership explicitly

A future generalized authority report should distinguish:

```text
declared locator:
  manifest = product-manifest.json

resolved read plan:
  main:product-manifest.json
  release-simcore:plugins/simcore/latest.js
```

The resolved read plan is derived from the current owning project contract/evidence and must carry provenance.

### 6.4 Keep unresolved cases fail-closed

If the project guideline does not specify enough information to associate a locator with a ref, the skill should return:

```text
UNKNOWN — locator resolved, owning ref unresolved
```

It must not default all paths to `main` or all paths to the release branch.

## 7. No registry repair is justified by this review

The missing `release-simcore:product-manifest.json` is **not** by itself evidence that registry/catalog are wrong.

Current SimCore main manifest and release branch form a coherent pair:

```text
main manifest release_commit
= release-simcore head

main manifest release_blob
= release-simcore latest.js blob
```

The observed problem is the skill pilot's Usage Dashboard-specific interpretation, not proven registry corruption.

Do not add a duplicate manifest to the release branch merely to satisfy the first pilot's assumption. That would invert the authority relationship and violate RCR-H02/H05.

## 8. Eval implications

The existing Usage Dashboard eval set is not enough for promotion.

A generalized version needs second-scope cases including at least:

### Positive SimCore cases

1. "SimCore current production version and exact evidence?"
   - must read `main:product-manifest.json` for release identity;
   - must cross-check release branch head/artifact as required by the project contract;
   - must not request `release-simcore:product-manifest.json` as if it existed.

2. "Where is SimCore production code?"
   - must resolve `release-simcore:plugins/simcore/latest.js`;
   - should not use main source as proof of deployed bytes when production bytes are the question.

3. "SimCore runtime behavior is healthy?"
   - authority scan may locate sources but must hand off to diagnostic triage / real long-chat evidence rather than declaring health from manifest/version alone.

### Negative/near-miss cases

- SimCore code repair request;
- full diagnostic interpretation;
- architecture impact analysis;
- release execution.

Those should not turn the authority-scan skill into a mega workflow.

## 9. Promotion gates after this review

Repository-wide promotion remains blocked until all of the following are complete:

1. a reviewed procedure generalization removes the release-branch-manifest assumption;
2. tests lock independent ref/path locator semantics;
3. SimCore task fixtures prove the split manifest/artifact topology;
4. existing Usage Dashboard tests remain green;
5. isolated with-skill vs baseline output evals are run and graded on both scopes;
6. repeated trigger evals include positive and near-miss cases for both scopes;
7. a promotion review confirms no project-owned mutable truth moved into the shared skill;
8. PR/CI remains green.

This review does not claim items 1–8 are complete.

## 10. Second-scope closure

The second scope provides **positive evidence for the locator architecture** and **negative evidence for one pilot-specific procedure rule**.

Final state:

```text
plugin:usage-dashboard
  FIRST PILOT MERGED

plugin:simcore
  STRUCTURAL LOCATOR COMPATIBILITY VERIFIED
  PROCEDURE COMPATIBILITY BLOCKED BY REF/PATH ASSUMPTION
  PILOT_VALIDATED = false

repository-wide
  NOT PROMOTED
```

The appropriate next transaction is a bounded **generalization design**, not immediate scope expansion.

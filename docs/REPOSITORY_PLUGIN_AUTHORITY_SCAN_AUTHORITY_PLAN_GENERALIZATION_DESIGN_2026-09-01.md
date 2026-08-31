# `plugin-authority-scan` Authority-Plan Generalization Design — 2026-09-01

Status: **DESIGN COMPLETE — IMPLEMENTATION NOT STARTED**

Scope: bounded design for generalizing `.agents/skills/plugin-authority-scan/` from the Local Usage Dashboard first pilot toward a second validated plugin scope without inventing one repository-wide ref/path authority topology.

This document does not modify the skill, add SimCore to the pilot allowlist, run live model evals, change any plugin/runtime/release authority, or promote the skill repository-wide.

## 1. Why this design exists

The first pilot proved a useful read-only locator workflow for `plugin:usage-dashboard`.

The SimCore compatibility review then produced a concrete counterexample to one pilot-specific procedure assumption:

```text
releaseBranch + manifest
!= automatically one ref:path pair
```

For Local Usage Dashboard, the owning project contract currently makes a production release-branch manifest a valid authority surface.

For SimCore, release identity and production bytes are split across independent authorities. Its current repository registration contains separate locators for a release branch, a manifest path, and an artifact path, but the owning contract does not define those fields as a universal compound path.

Therefore the reusable skill must generalize from **ref construction** to **authority-plan resolution**.

## 2. Design goal

Generalize the workflow so it can support different valid project authority topologies while preserving all of these properties:

- read-only behavior;
- fresh current-authority reads;
- registry/catalog data used only as locators;
- project guideline remains the project-specific precedence owner;
- no mutable version/SHA/deployment truth embedded in the skill;
- unresolved ref ownership fails closed;
- no silent expansion into diagnosis, repair, release, or product mutation;
- existing Usage Dashboard pilot behavior remains valid.

The intended generalized flow is:

```text
DISCOVER LOCATORS
→ READ PROJECT CONTRACT
→ BUILD TASK-SPECIFIC AUTHORITY PLAN
→ READ EXACT EVIDENCE
→ RECONCILE
→ HAND OFF
```

## 3. Architectural split

### Stage A — deterministic locator discovery

Owner: `scripts/scan_authority.py`

Responsibilities:

- resolve one registered scope from current registry/catalog;
- expose scope, lifecycle, primary paths, guideline locator, and declared authority fields;
- expose registry/catalog consistency;
- expose current-checkout existence checks only as local locator diagnostics;
- report `LOCATOR_ONLY`;
- perform no mutation;
- perform no project-specific ref/path joins.

This stage remains intentionally dumb about project authority topology.

### Stage B — project-contract read

Owner: `SKILL.md` procedure using the current owning guideline and any detailed authority contract it references.

Responsibilities:

- identify the source-of-truth ordering for the selected project;
- determine which current sources own the requested claim type;
- determine whether a declared path belongs on `main`, a release branch, another current ref, device evidence, or an unresolved surface;
- preserve project-specific specialization.

This stage must not be replaced by a global hard-coded map.

### Stage C — task-specific authority plan

Owner: skill workflow; optionally machine-validated by a bounded read-only validator.

The plan is a derived execution artifact, not source truth.

Recommended shape:

```json
{
  "scope": "plugin:example",
  "question_class": "release_identity | production_bytes | current_source | runtime_health | other",
  "declared_locators": {
    "releaseBranch": "...",
    "manifest": "...",
    "artifact": "..."
  },
  "contract_reads": [
    {
      "ref": "main",
      "path": "docs/EXAMPLE_GUIDELINES.md",
      "purpose": "project precedence owner"
    }
  ],
  "evidence_reads": [
    {
      "ref": "<resolved current ref>",
      "path": "<resolved path>",
      "claim": "<bounded claim this read can prove>",
      "basis": "<owning contract section/path that authorizes this ref:path association>"
    }
  ],
  "unresolved": [],
  "status": "PLAN_READY | UNKNOWN | CONFLICT"
}
```

Required invariant:

> Every resolved `ref:path` pair must carry provenance showing why that ref owns that path for the requested claim.

The plan must never infer a pair merely because the registry contains both a ref-like field and a path-like field.

### Stage D — exact evidence read

The executor performs only the reads required by the plan.

Each mutable claim must be supported by a fresh read from the source named by the owning contract.

If a planned source cannot be read, the result becomes `UNKNOWN` unless another current owning source explicitly resolves the same claim.

### Stage E — reconcile and hand off

Final authority-scan verdict remains one of:

- `VERIFIED`
- `LOCATOR_ONLY`
- `UNKNOWN`
- `CONFLICT`

The skill then stops. Runtime diagnosis, implementation, release execution, or device interpretation belong to narrower follow-on workflows.

## 4. Required `SKILL.md` generalization

A future implementation should remove the Usage Dashboard-specific universal assumption equivalent to:

```text
current production/release identity
→ read manifest at declared release branch
```

Replace it with:

```text
1. resolve independent locators;
2. read owning project contract;
3. determine task-specific ref:path ownership from that contract;
4. read exact current evidence;
5. fail closed if ownership remains unresolved.
```

The skill should explicitly state:

- `releaseBranch`, `manifest`, `artifact`, `releaseSpecDir`, and similar fields are independent locators unless an owning contract binds them;
- current-checkout existence does not prove ref ownership;
- `main` is not a universal fallback;
- release branch is not a universal fallback;
- repository registration does not become production truth;
- a task may legitimately require multiple evidence reads from different refs.

## 5. Deterministic helper compatibility contract

`scan_authority.py` is structurally reusable and should be changed minimally.

### Preserve

- registry-driven scope discovery;
- catalog consistency checks;
- read-only operation;
- `pilot_validated` gate;
- machine-readable errors;
- `LOCATOR_ONLY` semantics;
- no frozen mutable product values.

### Change or clarify

The helper's textual guidance must not imply one global production read topology.

Recommended future `fresh_read_requirements` wording:

```text
- Read the owning guideline and follow its project-specific source-of-truth order.
- Treat every registry/catalog authority field as an independent locator unless the owning contract binds fields together.
- Build exact ref:path reads from current project authority, not from locator adjacency.
- Read only the evidence needed for the requested claim.
- Preserve UNKNOWN or CONFLICT when ref ownership or evidence cannot be resolved.
```

Optional schema evolution:

- keep `declared_authority` for backward compatibility;
- add `locator_semantics = "INDEPENDENT_UNTIL_BOUND_BY_OWNING_CONTRACT"`;
- do not add resolved mutable `ref:path` values to the deterministic discovery output.

No schema version bump is required unless the machine-readable shape changes incompatibly.

## 6. Optional validator-first slice

Consistent with RCR-C09, a future implementation may add a read-only structural validator before any broader automation.

Candidate:

```text
.agents/skills/plugin-authority-scan/scripts/validate_authority_plan.py
```

The validator may check structure, not project truth.

It can reject:

- evidence reads missing `ref`, `path`, `claim`, or `basis`;
- resolved `ref:path` pairs with empty provenance;
- `PLAN_READY` with unresolved entries;
- contradictory duplicate claims mapped to incompatible reads without an explicit conflict state;
- mutation instructions inside the authority plan;
- unknown status values.

It must **not** decide that a specific branch owns a path merely from registry fields.

## 7. Regression design

The generalized implementation must preserve the current Usage Dashboard fixtures and add a second authority topology.

### Fixture topology A — colocated production authority

Represents a project where the owning contract explicitly binds a production manifest to the release branch.

Expected behavior:

- the authority plan may resolve a release-ref manifest read;
- the basis field must cite the fixture's owning contract;
- no hard-coded project name/version is required.

### Fixture topology B — split release identity and production bytes

Represents a project where:

```text
main manifest
→ release identity

release branch artifact
→ production bytes
```

Expected behavior:

- plan includes two independent reads when both claims are required;
- plan must not attempt `<release branch>:<manifest path>` unless the fixture contract explicitly says it exists;
- missing ref ownership returns `UNKNOWN`, not a guessed fallback.

### Mechanical tests to add

At minimum:

1. independent locator fields never auto-join;
2. explicit contract binding permits a ref:path pair;
3. split-topology fixture produces separate reads;
4. unresolved path/ref ownership fails closed;
5. Usage Dashboard existing tests remain green;
6. SimCore-like locator discovery remains `pilot_validated: false` until all promotion gates pass;
7. plan validator rejects missing provenance;
8. skill/script still contain no frozen production version/SHA constants;
9. no repository file changes occur during scanner/validator execution.

## 8. Output and trigger eval design

Mechanical regressions are not enough to promote the second scope.

### Output evals

Run isolated comparisons:

```text
with generalized skill
vs
without skill
```

for both topology families.

Required positive cases include:

- current production version/evidence;
- exact production artifact location;
- current source location;
- runtime-health question that must stop at the diagnostic handoff boundary.

A pass requires fresh-authority behavior, not merely a coincidentally correct remembered value.

### Trigger evals

Add positive second-scope authority questions and near-miss negatives for:

- code repair;
- runtime diagnosis;
- architecture impact analysis;
- release execution;
- repository-wide enumeration.

The skill must remain narrow rather than becoming a generic plugin mega-agent.

Live trigger/output eval success is a promotion gate and is not claimed by this design.

## 9. Scope-promotion gate

Do not add `plugin:simcore` or any second scope to `PILOT_VALIDATED_SCOPES` until all are true:

1. generalized procedure merged;
2. independent-locator semantics locked by tests;
3. both topology fixtures green;
4. existing Usage Dashboard regression remains green;
5. second-scope output evals run and graded;
6. trigger evals run with positive + near-miss negatives;
7. no mutable project truth moved into the skill;
8. PR/CI green;
9. a final compatibility/promotion review explicitly authorizes the allowlist expansion.

Repository-wide skill promotion requires further evidence beyond a two-scope pilot.

## 10. Common-rule alignment

The design composes with the current repository common rules:

- RCR-H01/H02/H03/H08 — fresh authority, no manufactured truth, uncertainty preserved;
- RCR-D07 — scope impact before broad change;
- RCR-D08 — locator/index layers do not replace source authority;
- RCR-D09 — skill completion requires feedback;
- RCR-D10 — keep the workflow composable;
- RCR-D11 — choose the narrowest capable semantic owner/effect surface;
- RCR-D12 — make the authority/data flow explicit before multi-layer action;
- RCR-D13 — validate the boundary between locator, contract, ref, path, and claim;
- RCR-C08 — keep authority analysis read-only;
- RCR-C09 — prefer read-only validators before broader shared automation.

## 11. Non-goals

This design does not authorize:

- automatic parsing of arbitrary project guidelines into a universal precedence engine;
- one repository-wide production authority order;
- automatic joining of registry locators;
- code repair or release execution inside `plugin-authority-scan`;
- device-health claims from manifests alone;
- new manifests or duplicated authority files merely to fit the skill;
- replacement of project guidelines with skill-local truth tables.

## 12. Recommended implementation transaction

The next separately authorized implementation should remain one bounded read-only slice:

```text
1. generalize SKILL.md procedure;
2. clarify scan_authority.py independent-locator semantics;
3. add authority-plan structural validator if useful;
4. add colocated + split-topology mechanical fixtures/tests;
5. preserve Usage Dashboard pilot behavior;
6. do NOT expand PILOT_VALIDATED_SCOPES yet;
7. run repository CI;
8. only then perform second-scope output/trigger eval work.
```

Final design state:

```text
FIRST PILOT                 IMPLEMENTED
SECOND-SCOPE COUNTEREXAMPLE VERIFIED
AUTHORITY-PLAN DESIGN       FROZEN
SKILL GENERALIZATION        NOT STARTED
SECOND-SCOPE VALIDATION     NOT GRANTED
REPOSITORY-WIDE PROMOTION   BLOCKED
```

# Repository `plugin-impact-scope` Pilot Design — 2026-09-01

Status: **PILOT DESIGN READY — IMPLEMENTATION NOT STARTED**

Issue: #1120

Pilot scope: `plugin:usage-dashboard` / Local Usage Dashboard

This document freezes the design for the next repository Agent Skill candidate after `plugin-authority-scan`. It is a read-only workflow design only. It does not install the skill, change plugin/runtime/release bytes, promote SimCore support, or authorize repository-wide triggering.

## 1. Evidence for choosing this skill next

The repository skill methodology lists `plugin-impact-scope` as the read-only archetype for broad changes: establish ownership, callers/dependents, tests, release/materializer surfaces, and likely blast radius before design or mutation.

The candidate now has independent repository evidence:

1. `plugin-authority-scan` has landed and gives downstream work a current authority boundary instead of remembered mutable facts.
2. `docs/REPOSITORY_COMMON_RULES.md` defines:
   - RCR-D07: scope impact before broad change;
   - RCR-D12: map state/data/effect flow before multi-layer mutation;
   - RCR-D13: validate contracts across boundaries, not files in isolation;
   - RCR-C08: keep analysis/audit/research read-only while uncertainty remains.
3. Local Usage Dashboard work repeatedly performs manual impact mapping across Plugin, Engine, Manager, tests, materializers, manifests, diagnostics, and physical acceptance.
4. SimCore's 2026-09-01 common-rule impact review independently concluded that Context Projection must begin with a read-only impact-scope pass and explicitly classified `plugin-impact-scope` as `DIRECTLY RELEVANT METHODOLOGY / MANUAL PILOT FIRST`.

This is therefore an extracted repeated workflow, not a generic skill invented from model knowledge.

## 2. One coherent job

`plugin-impact-scope` answers:

> Given one verified plugin scope plus one proposed change/question, what current source-backed semantic surfaces could be affected, how are those surfaces connected, which tests/contracts protect them, and which impact claims remain unknown?

It does **not** answer:

- what the current production version is without fresh authority evidence;
- which repair/design should be selected;
- how code should be changed;
- whether a release should be created or deployed.

Those belong to other workflow stages.

## 3. Composition with `plugin-authority-scan`

Preferred composition:

```text
plugin-authority-scan
→ verified owning refs/paths for the task
→ plugin-impact-scope
→ source-linked impact map
→ later separate design / implementation / release workflow
```

The impact skill must not duplicate the entire authority skill or become another production truth owner.

Entry condition:

- consume a current `VERIFIED` authority report when one is already available in the same workflow; or
- perform only the minimum fresh authority rereads required by the owning project contract before impact claims.

If authority is `UNKNOWN` or `CONFLICT` for an impact-critical source, the affected impact claim remains blocked.

## 4. Trigger boundary

Candidate name:

`plugin-impact-scope`

Desired trigger intent:

- broad/architectural plugin change;
- multi-layer data/state flow change;
- user asks what a change would touch;
- design preflight asks for callers/dependents/tests/release surfaces;
- migration/refactor where blast radius must be established before mutation.

Near-miss negatives:

- simple current-version/authority lookup → `plugin-authority-scan`;
- supplied runtime diagnostics asking why something failed → later `plugin-diagnostic-triage`;
- narrow one-file wording/copy change with no cross-layer contract;
- explicit request to implement already-frozen work → implementation workflow;
- release parity/production verification only → later release verifier.

Pilot trigger validation is only for `plugin:usage-dashboard`.

## 5. Read-only hard boundary

The skill and any helper script must not:

- modify source, docs, issues, branches, PRs, releases, production, or device state;
- create implementation patches;
- write a design document as part of the impact pass;
- run destructive commands;
- infer semantic ownership from directory proximity;
- infer runtime execution from text-reference existence alone;
- infer "no dependents" merely because search returned none;
- persist a dependency graph as repository truth;
- cache mutable versions/SHAs as permanent skill constants.

The output is an analysis artifact only.

## 6. Impact model

The output should separate evidence classes instead of collapsing everything into one graph.

### `DIRECT`

Use when exact current source or a current project contract proves the relationship.

Examples:

- producer writes field `X`, consumer reads field `X`;
- manifest binds Engine version/hash;
- materializer rewrites a named runtime artifact;
- registered regression explicitly asserts the same contract.

### `SUPPORTED_LIKELY`

Use when multiple current source signals make relevance likely but direct semantic/runtime execution has not been proven.

Examples:

- helper referenced by a wrapper whose runtime branch is conditional;
- diagnostics surface reads a broad object where the exact changed field may or may not alter output;
- dynamic module/path discovery suggests a candidate edge that needs targeted reread.

Every `SUPPORTED_LIKELY` claim must say what is still unproven.

### `UNKNOWN`

Use when the edge cannot be established from current available evidence.

Search silence is not negative proof.

### `CONFLICT`

Use when current owning source/contract evidence disagrees and the project contract does not resolve the relationship.

No generic numeric confidence score is introduced.

## 7. Required impact dimensions

For a broad/multi-layer task, inspect only the relevant dimensions:

1. **Semantic owner / affected symbols**
   - exact current owners of the behavior/data/identity being discussed.
2. **Producer/consumer/caller/dependent flow**
   - direct reads/writes/calls/imports/registered consumers;
   - dynamic edges remain bounded by evidence class.
3. **State/data/effect flow**
   - `input/event → semantic owner → transform → persistence if any → consumer/presentation → validation`.
4. **Contract/test surfaces**
   - focused regressions;
   - current-release/architecture contracts;
   - privacy/UNKNOWN/identity invariants.
5. **Generated/build surfaces**
   - canonical source vs generated artifact;
   - deterministic build/parity owner.
6. **Release/materializer/manifest surfaces**
   - only when the proposed change would alter shipped bytes, versions, package identity, hashes, or release specs.
7. **Diagnostics/physical acceptance surfaces**
   - only when current project contracts use them to verify the changed semantic boundary.
8. **Explicit non-impact/forbidden inference**
   - healthy sibling surfaces that current evidence says should remain untouched;
   - edges not proven.

## 8. Narrowest-boundary rule

The skill may conclude:

```text
narrowest supported impact boundary = <current owners/surfaces>
```

This is not a design decision. It means only that current evidence does not justify broadening beyond those surfaces yet.

If evidence suggests two plausible boundaries, report both and the unresolved distinction instead of selecting a repair architecture.

This composes with RCR-D11 but does not implement it.

## 9. Proposed output shape

```markdown
## Plugin impact scope

- Scope: `<plugin scope>`
- Question/change class: `<bounded description>`
- Authority inputs: `<fresh verified owner refs/paths>`
- Verdict: `IMPACT_SCOPED | PARTIAL | UNKNOWN | CONFLICT`

### Semantic owners
- `<ref:path:symbol>` — `<bounded ownership claim>`

### State / data / effect flow
`<input> -> <owner> -> <transform> -> <consumer> -> <validation>`

### Direct impact
- `DIRECT` — `<surface>` — basis: `<current evidence>`

### Supported-likely impact
- `SUPPORTED_LIKELY` — `<surface>` — basis: `<evidence>` — unresolved: `<gap>`

### Tests / contracts / validation
- `<test/contract>` — `<what boundary it protects>`

### Generated / release surfaces
- `<surface or none proven>`

### Unknown / conflicts
- `<explicit unresolved edge>`

### Narrowest supported impact boundary
- `<bounded current conclusion>`

### Blocked claims
- `<claims the evidence cannot support>`
```

Do not paste large source bodies.

## 10. Mechanical helper design direction

A deterministic helper is useful only for **candidate discovery**, not semantic verdicts.

Possible implementation shape:

```text
scripts/scan_impact_candidates.py
```

Inputs:

- repository root;
- bounded scope root(s);
- one or more seed paths/symbols/field names;
- optional include/exclude patterns owned by current project registration/guideline.

Outputs:

- exact textual references;
- imports/requires where mechanically discoverable;
- test files containing the seed;
- generated/materializer/manifest candidate references;
- bounded JSON mode.

Rules:

- standard library preferred;
- non-interactive;
- no mutation;
- deterministic ordering;
- bounded result count with truncation notice;
- no claim that a candidate reference is a semantic dependency;
- no frozen current Product/version/SHA constants;
- local checkout existence is not ref ownership proof.

A later model/source reread upgrades candidate edges to `DIRECT`, `SUPPORTED_LIKELY`, `UNKNOWN`, or `CONFLICT`.

## 11. Usage Dashboard pilot eval family

### Eval A — Service Tier Selection-Source Fidelity (#577)

Prompt class:

> Before we implement the service-tier selection-source design, map what current Usage Dashboard source/tests/release surfaces could be affected. Do not design or edit anything.

Expected impact logic:

- Engine `/logs` sanitize/normalize path is an affected owner;
- request metadata producer/Plugin consumer flow is inspected;
- request identity/dedupe is checked as a protected non-impact boundary;
- Recent Requests/hourly/Diagnostics consumers are inspected;
- existing tier/provenance regressions are located;
- no new I/O is inferred;
- exact Product/Engine bump is **not** guessed from an old issue; current release authority would be reread only if release-impact classification is needed.

### Eval B — Managed Models / Diagnostics Identity

Prompt class:

> If the exact managed Models package changes, what current layers and regressions must be checked before a release design?

Expected impact logic:

- Manager exact package-pair provisioning/verification;
- Engine catalog identity/classifier consumer;
- Plugin full/compact diagnostics identity presentation;
- manifest/materializer/hash surfaces if shipped bytes change;
- P61/P62/P64-like current applicable regressions located from repository evidence;
- CLI identity remains a separate axis unless current source proves otherwise.

### Eval C — No-version lifecycle audit

Prompt class:

> I want to add a lifecycle accumulation audit only. Show what should and should not change.

Expected impact logic:

- repository test/audit/doc surfaces may change;
- current runtime ownership source is reread for observed counters/cleanup contracts;
- Product/Engine/Manager bytes remain non-impact unless implementation changes them;
- no runtime cleanup is silently authorized.

### Eval D — Narrow negative

Prompt class:

> Fix a typo in one Usage Dashboard design note.

Expected behavior:

- do not invoke broad impact scoping or return a repository-wide graph.

### Eval E — Authority-only negative

Prompt class:

> What is the current production version and where is its authority?

Expected behavior:

- route to `plugin-authority-scan`, not impact scope.

## 12. Mechanical regression requirements

Implementation tests should at minimum prove:

1. only `plugin:usage-dashboard` is pilot-validated initially;
2. ambiguous/unknown scope fails closed;
3. helper performs no mutation;
4. deterministic ordering/bounded output;
5. current-version/SHA constants are absent;
6. textual reference candidates are labelled as candidate discovery only;
7. search silence cannot produce a semantic `NO_DEPENDENTS` claim;
8. evidence class requires a non-empty basis for non-UNKNOWN claims;
9. `CONFLICT`/`UNKNOWN` survive serialization unchanged;
10. a narrow task can terminate without broad scan;
11. mutation-shaped plan/output fields are rejected if a validator is used;
12. Agent Skills CI compiles/runs the new Python tests.

## 13. Output and trigger evaluation boundary

The existing Agent Skills CI is mechanical only.

It may prove:

- Python syntax;
- helper/validator tests;
- no-mutation and bounded mechanics.

It does **not** prove:

- actual model output quality;
- trigger precision/recall;
- with-skill improvement versus baseline;
- SimCore compatibility.

Promotion therefore requires isolated output/trigger evaluation evidence when a genuine runner is available. Static eval JSON must never be treated as a live PASS.

## 14. Pilot and promotion lifecycle

```text
DESIGN READY
→ implement skill + mechanical helper/tests
→ Agent Skills CI GREEN
→ Usage Dashboard isolated output eval vs baseline
→ Usage Dashboard trigger eval
→ pilot acceptance
→ second-scope candidate eval
→ explicit second-scope review
→ only then consider validated-scope expansion
```

Any SimCore fixtures created during implementation remain candidate-only until the second-scope gates are actually executed and reviewed.

## 15. Non-goals

This pilot does not authorize:

- repository-wide dependency graph infrastructure;
- AST/callgraph completeness claims;
- runtime instrumentation;
- semantic inference from grep alone;
- diagnosis or repair;
- design generation;
- implementation or release execution;
- automatic production-version classification;
- a new mutable repository index;
- SimCore scope promotion;
- product/runtime/release changes.

## 16. Completion criterion

The design is complete when implementation can be started without inventing the skill's job, evidence classes, read-only boundary, pilot scope, eval family, or promotion gates.

Current verdict:

```text
NEXT COMMON SKILL          = plugin-impact-scope
FIRST PILOT SCOPE          = plugin:usage-dashboard
MODE                       = READ_ONLY
AUTHORITY MODEL            = compose with current project authority / plugin-authority-scan
MECHANICAL DISCOVERY       = candidate-only
SEMANTIC EDGE CLAIMS       = source-linked + evidence-classified
SIMCORE PROMOTION          = NOT AUTHORIZED
IMPLEMENTATION             = NOT STARTED
PRODUCT/RUNTIME CHANGE     = NONE
```

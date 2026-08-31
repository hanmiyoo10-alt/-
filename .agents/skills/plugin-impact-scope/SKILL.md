---
name: plugin-impact-scope
description: >-
  Build a read-only, source-linked impact map before a broad or multi-layer plugin change.
  Use when a proposed plugin change may affect multiple semantic owners, producer/consumer
  boundaries, tests, generated artifacts, materializers, manifests, diagnostics, or release
  surfaces. Resolve current project authority first. Do not design, edit, repair, release,
  deploy, or treat text-search results as proven semantic dependencies.
---

# Plugin Impact Scope

Read-only pilot for `plugin:usage-dashboard` / Local Usage Dashboard.

This skill answers one question:

> Given one verified plugin scope plus one proposed change/question, what current source-backed semantic surfaces could be affected, how are those surfaces connected, which tests/contracts protect them, and which impact claims remain unresolved?

It is an analysis module between authority resolution and later design/implementation. It is not an authority resolver, repair skill, design writer, or release runner.

## Hard boundaries

- Pilot validation is limited to `plugin:usage-dashboard`.
- Resolve current authority before impact claims. Prefer a current `VERIFIED` `plugin-authority-scan` report when already available in the same workflow.
- Do not use conversation memory as authority for versions, SHAs, deployment state, source ownership, or runtime state.
- Do not edit source, docs, issues, branches, pull requests, releases, production state, or device state.
- Do not select a repair or implementation mechanism.
- Do not upgrade grep/text-search/path proximity into semantic ownership.
- Do not infer that an absent static reference proves no runtime/dynamic dependency exists.
- Preserve `UNKNOWN` and `CONFLICT` rather than inventing edges.
- Derived impact maps are context-management artifacts, not mutable project truth.
- Narrow one-file copy edits or authority-only questions normally do not justify this skill.

These boundaries compose with `docs/REPOSITORY_COMMON_RULES.md`, especially RCR-H01/H02/H03/H08, RCR-D07/D08/D12/D13, and RCR-C08.

## Evidence classes

Use only these impact evidence classes:

- `DIRECT` — exact current source/reference/contract proves the relationship.
- `SUPPORTED_LIKELY` — multiple current source signals support relevance, but direct runtime/semantic execution is not proven.
- `UNKNOWN` — evidence is insufficient.
- `CONFLICT` — current owning evidence disagrees or cannot be reconciled by the owning contract.

Do not invent numeric confidence scores.

A mechanical helper result is always `CANDIDATE_ONLY`; it cannot directly produce `DIRECT` or `SUPPORTED_LIKELY` impact edges.

## Procedure

### 1. Confirm scope and authority input

The requested scope must resolve to `plugin:usage-dashboard` for this pilot.

If the scope is another plugin/product, return:

`UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.`

Before mutable/source ownership claims, either:

1. consume a current `VERIFIED` authority report produced in the same workflow by `plugin-authority-scan`; or
2. re-read the minimum owning repository/project authority needed for this impact question.

Do not duplicate the entire authority-scan procedure inside this skill.

### 2. Decide whether a broad impact scope is justified

Use impact scoping when the proposed change is broad, architectural, cross-layer, generated-artifact-sensitive, or likely to cross producer/consumer boundaries.

Typical signals:

- Engine -> request metadata -> Plugin UI/Diagnostics;
- Manager provisioning -> Engine identity -> Diagnostics -> manifest/materializer;
- state writer -> persistence -> state reader -> presentation;
- source -> deterministic build -> generated artifact -> release identity;
- lifecycle owner -> listener/timer/cache/in-flight cleanup -> diagnostics/tests.

If the task is a narrow typo/copy edit or authority-only lookup, stop with a compact `NARROW_TASK` handoff rather than broad repository archaeology.

### 3. Define bounded seeds and roots

Translate the proposed change into a small seed set:

- relevant symbol names;
- public field names;
- owning files/modules already established by authority/current source;
- contract/test names;
- generated/release paths only when the project contract makes them relevant.

Keep search roots bounded to the affected project and shared contracts that current evidence justifies.

Do not start with a repository-wide sweep merely because it is available.

### 4. Discover candidate references mechanically

For repeated text/reference discovery, the bundled helper may be used:

```bash
python3 .agents/skills/plugin-impact-scope/scripts/discover_impact.py \
  --repo-root . \
  --scope plugin:usage-dashboard \
  --root plugins/usage-dashboard \
  --seed <symbol-or-path> \
  --json
```

Multiple `--root` and `--seed` arguments are allowed.

Treat every helper hit as `CANDIDATE_ONLY`. The helper proves only that bounded current-checkout text/path references exist. It does not prove semantic ownership, runtime execution, release impact, or absence of dynamic edges.

### 5. Re-read exact source at candidate boundaries

For each candidate that matters to the requested change, re-read the current owning source/contract at the exact symbol/path.

Build a source-backed flow such as:

```text
input/event
-> semantic owner
-> state/data transform
-> persistence boundary if any
-> consumer/presentation
-> validation surface
```

Classify each edge conservatively.

Examples:

- producer writes field `x`; consumer reads exact field `x` -> usually `DIRECT` when current source proves both ends;
- sibling test mentions the same feature but does not execute the boundary -> at most `SUPPORTED_LIKELY` until the test contract is re-read;
- dynamic listener/callback may be connected but static evidence cannot prove registration path -> `UNKNOWN` until source/runtime evidence resolves it.

### 6. Map validation surfaces

Identify current tests/contracts that protect the affected boundaries, including where relevant:

- focused unit/regression tests;
- producer <-> consumer contract tests;
- source <-> generated artifact parity checks;
- manifest/component identity checks;
- diagnostics identity/presentation checks;
- full project regression registry;
- physical acceptance surfaces when the owning project requires device evidence.

Do not claim a test protects a boundary merely because its filename sounds related.

### 7. Map generated/release/materializer surfaces

Only when the current project contract makes them relevant, identify whether the proposed change could touch:

- canonical source;
- deterministic builder/materializer;
- generated distributable;
- manifest/component hashes or identities;
- release spec/evidence;
- production promotion/parity checks.

A repository-only audit/documentation change may legitimately have no shipped-byte impact. Preserve that as a bounded conclusion only when current source/contracts support it.

### 8. State the narrowest supported impact boundary

Summarize the smallest current source-backed boundary that a later design must consider.

Do not turn this into a solution recommendation. The result should say what must be preserved/validated, not how to implement the change.

### 9. Validate serialized impact maps

If the impact report is serialized to JSON, it may be structurally/provenance checked with:

```bash
python3 .agents/skills/plugin-impact-scope/scripts/validate_impact_map.py \
  --map <impact-map.json> \
  --json
```

The validator checks shape, evidence-class/provenance requirements, fail-closed verdict consistency, and read-only boundaries. It does not prove that a claimed source relationship is semantically correct.

### 10. Return a compact impact report

Use this shape:

```markdown
## Impact scope

- Scope: `plugin:usage-dashboard`
- Question/change class: `<bounded description>`
- Authority input: `<current verified report or exact owning reads>`
- Semantic owners:
  - `<owner/path/symbol>`
- State/data/effect flow:
  - `<from> -> <to>` — `DIRECT | SUPPORTED_LIKELY | UNKNOWN | CONFLICT` — basis: `<source>`
- Tests/contracts/validation:
  - `<surface>` — `<what boundary it protects>`
- Generated/release/materializer surfaces:
  - `<surface or none proven>`
- Narrowest supported impact boundary: `<bounded statement>`
- Blocked claims: `<none or unresolved claims>`
- Verdict: `IMPACT_SCOPED | PARTIAL | UNKNOWN | CONFLICT`
```

Every non-`UNKNOWN` edge must name a concrete current source basis.

## Verdict rules

- `IMPACT_SCOPED` — required relevant boundaries are source-backed and no material unresolved/conflicting edge blocks the requested impact conclusion.
- `PARTIAL` — useful impact boundaries are proven, but at least one material edge remains `UNKNOWN`.
- `UNKNOWN` — evidence is insufficient to establish a useful boundary.
- `CONFLICT` — current owning evidence conflicts and the owning contract does not resolve it.

## Completion criterion

The impact scope is complete only when:

- pilot scope is valid;
- mutable/current authority inputs were freshly verified;
- search roots/seeds stayed bounded;
- mechanical hits remained candidate-only until exact reread;
- semantic owner and cross-layer edges are evidence-classified;
- relevant tests/contracts were read rather than inferred from names;
- generated/release/materializer impact is bounded rather than assumed;
- unresolved dynamic edges remain `UNKNOWN`;
- no design, repair, implementation, or repository mutation occurred.

Then stop and hand off to the next workflow stage.
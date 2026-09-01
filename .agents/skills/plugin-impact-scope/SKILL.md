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

Current normal validated pilot scope: `plugin:usage-dashboard` / Local Usage Dashboard.

The analysis procedure below is written against a verified plugin scope and bounded project root. Scope-specific examples must not become semantic truth for another project.

This skill answers one question:

> Given one verified plugin scope plus one proposed change/question, what current source-backed semantic surfaces could be affected, how are those surfaces connected, which tests/contracts protect them, and which impact claims remain unresolved?

It is an analysis module between authority resolution and later design/implementation. It is not an authority resolver, repair skill, design writer, or release runner.

## Hard boundaries

- Pilot validation is limited to `plugin:usage-dashboard`.
- An explicitly isolated candidate evaluation may authorize a different scope for evaluation only. That bypasses only the validated-scope gate; it does not promote the scope, change normal invocation authority, or relax any rule below.
- Resolve current authority before impact claims. Prefer a current `VERIFIED` `plugin-authority-scan` report when already available in the same workflow.
- Do not use conversation memory as authority for versions, SHAs, deployment state, source ownership, or runtime state.
- Do not edit source, docs, issues, branches, pull requests, releases, production state, or device state.
- Do not select a repair or implementation mechanism.
- Do not upgrade grep/text-search/path proximity into semantic ownership.
- Do not infer that an absent static reference proves no runtime/dynamic dependency exists.
- Preserve `UNKNOWN` and `CONFLICT` rather than inventing edges.
- Derived impact maps are context-management artifacts, not mutable project truth.
- A cross-layer impact map is not complete when it only lists files. It must state source-backed producer/consumer edges and preservation boundaries when those boundaries are material to the proposed change.
- Evidence bundle order, file order, document order, roadmap succession, or section adjacency never proves a producer/consumer edge by itself.
- A negative authority or exclusion statement constrains claims; it must not be inverted into a positive runtime, generated-artifact, materializer, or release-surface claim.
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

Evidence-document ordering is also candidate context only. Never classify a chain of files or documents as `DIRECT` merely because the files were supplied together or describe successive roadmap stages.

## Procedure

### 1. Confirm scope and authority input

Let `<verified-plugin-scope>` be the plugin scope established by current authority evidence.

For normal invocation, `<verified-plugin-scope>` must resolve to `plugin:usage-dashboard` for this pilot.

If the normal requested scope is another plugin/product, return:

`UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.`

An isolated candidate evaluation may explicitly supply evaluation authority for another scope. In that case, analyze that exact candidate scope while preserving every other boundary in this skill. Candidate evaluation authority is not validated-scope promotion.

Before mutable/source ownership claims, either:

1. consume a current `VERIFIED` authority report produced in the same workflow by `plugin-authority-scan`; or
2. re-read the minimum owning repository/project authority needed for this impact question.

Do not duplicate the entire authority-scan procedure inside this skill.

### 2. Decide whether a broad impact scope is justified

Use impact scoping when the proposed change is broad, architectural, cross-layer, generated-artifact-sensitive, or likely to cross producer/consumer boundaries.

Typical signals:

- request/event producer -> request/state metadata -> presentation or diagnostics consumer;
- provisioning/configuration owner -> runtime identity -> diagnostics -> manifest/release surface;
- state writer -> persistence -> state reader -> presentation;
- canonical source -> deterministic build -> generated artifact -> release identity;
- lifecycle owner -> listener/timer/cache/in-flight cleanup -> diagnostics/tests.

These are relationship shapes, not literal answers. Do not substitute supplied file names or documentation order into these shapes unless current owning source proves each semantic edge.

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

For repeated text/reference discovery, the bundled helper may be used with the verified scope/root:

```bash
python3 .agents/skills/plugin-impact-scope/scripts/discover_impact.py \
  --repo-root . \
  --scope <verified-plugin-scope> \
  --root <bounded-project-root> \
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

For a cross-layer scalar, request-metadata field, identity value, diagnostics value, or similar producer/consumer change, a file inventory is not a completed flow. Explicitly trace every source-backed edge that is material to the question, for example:

```text
producer capture/write
-> request/state metadata propagation
-> presentation consumer
-> diagnostic or validation consumer
```

Each non-`UNKNOWN` edge must include its evidence class and the exact current source basis. If the current source does not prove one link, mark that link `UNKNOWN`; do not skip the edge or replace it with a path list.

Semantic flow endpoints should represent actual owners, state/data/effect boundaries, or consumers established by current source. Do not turn the sequence of evidence files, design documents, or roadmap documents into flow endpoints merely because those documents were supplied together. A document may be a semantic owner only when the question concerns that document contract itself or current source/authority establishes the document as the owning contract for the relationship.

Classify each edge conservatively.

Examples:

- producer writes field `x`; consumer reads exact field `x` -> usually `DIRECT` when current source proves both ends;
- sibling test mentions the same feature but does not execute the boundary -> at most `SUPPORTED_LIKELY` until the test contract is re-read;
- dynamic listener/callback may be connected but static evidence cannot prove registration path -> `UNKNOWN` until source/runtime evidence resolves it.

### 6. Map validation and preservation surfaces

Identify current tests/contracts that protect the affected boundaries, including where relevant:

- focused unit/regression tests;
- producer <-> consumer contract tests;
- source <-> generated artifact parity checks;
- manifest/component identity checks;
- diagnostics identity/presentation checks;
- full project regression registry;
- physical acceptance surfaces when the owning project requires device evidence.

Do not claim a test protects a boundary merely because its filename sounds related. Do not repeat an instruction phrase from this skill as the claimed boundary; state the grounded boundary or `UNKNOWN`.

For a change that adds or propagates data through an existing request, ledger/state, diagnostics, refresh, source, CLI, or network path, explicitly check these preservation boundaries when current source/contracts make them relevant:

- **Request identity** — whether existing request identity/dedupe/correlation semantics must remain unchanged. State the current source basis, or `UNKNOWN` if not proven.
- **No-extra-I/O** — whether the proposed data can travel on an existing source/read/refresh path without adding an extra network request, CLI invocation, source fetch, refresh, or other observable I/O. State the current source basis, or `UNKNOWN` if not proven.

These are preservation checks, not implementation instructions. Do not invent a new identity rule or I/O mechanism merely to fill the report.

### 7. Map generated/release/materializer surfaces

Only when the current project contract makes them relevant, identify whether the proposed change could touch:

- canonical source;
- deterministic builder/materializer;
- generated distributable;
- manifest/component hashes or identities;
- release spec/evidence;
- production promotion/parity checks.

A repository-only audit/documentation change may legitimately have no shipped-byte impact. Preserve that as a bounded conclusion only when current source/contracts support it.

Treat authority exclusions as exclusions. If current evidence says a path or branch is not production/runtime/release authority, that statement cannot by itself support listing the excluded path as a generated, shipped, materialized, or release surface.

### 8. State the narrowest supported impact boundary

Summarize the smallest current source-backed boundary that a later design must consider.

For a source-proven cross-layer change, do not collapse the boundary to one generated entry file or one convenient path when the semantic impact spans multiple owners/consumers. Name the minimal connected semantic boundary instead, such as producer + propagated state/data + affected consumers + the preservation/test surfaces required by current contracts.

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

Return a compact report containing these fields in this order:

1. `Impact scope` — the actual verified/evaluation scope and a compact change class.
2. `Authority input` — the actual verified authority report or exact owning reads used. If not established, write `UNKNOWN`.
3. `Semantic owners` — only source-backed semantic owners; do not list every evidence file.
4. `State/data/effect flow` — source-backed producer/consumer edges with evidence class and concrete source basis. If a material edge is unproven, write `UNKNOWN` for that edge.
5. `Preservation boundaries` — request identity and no-extra-I/O when material, each with grounded basis or `UNKNOWN`.
6. `Tests/contracts/validation` — only surfaces whose protecting relationship was actually read; state the protected boundary or `UNKNOWN`.
7. `Generated/release/materializer surfaces` — only positively supported surfaces; otherwise `none proven` or `UNKNOWN`.
8. `Narrowest supported impact boundary` — the smallest connected semantic boundary supported by current evidence.
9. `Blocked claims` — unresolved material claims, or `none`.
10. `Verdict` — exactly one of `IMPACT_SCOPED`, `PARTIAL`, `UNKNOWN`, or `CONFLICT`.

Never emit report-template placeholder or instruction text as a field value. In particular, do not copy phrases that describe what a field should contain. If a value cannot be grounded from current evidence, emit `UNKNOWN` instead.

Keep the report bounded: normally no more than 4 semantic owners, 4 flow edges, and 3 validation surfaces. Prefer the minimal material subset over exhaustive enumeration. If output budget is tight, shorten inventories first and always reserve enough space to emit `Blocked claims` and `Verdict`.

Every non-`UNKNOWN` edge must name a concrete current source basis.

For broad cross-layer questions, do not substitute a list of candidate files for `State/data/effect flow` or `Preservation boundaries`. If either material boundary cannot be proven, keep it `UNKNOWN` and choose a fail-closed verdict rather than omitting it.

## Verdict rules

- `IMPACT_SCOPED` — required relevant boundaries are source-backed and no material unresolved/conflicting edge blocks the requested impact conclusion.
- `PARTIAL` — useful impact boundaries are proven, but at least one material edge remains `UNKNOWN`.
- `UNKNOWN` — evidence is insufficient to establish a useful boundary.
- `CONFLICT` — current owning evidence conflicts and the owning contract does not resolve it.

## Completion criterion

The impact scope is complete only when:

- the normal validated-scope gate passed, or explicit isolated candidate-eval authority supplied the evaluation scope without promotion;
- mutable/current authority inputs were freshly verified;
- search roots/seeds stayed bounded;
- mechanical hits remained candidate-only until exact reread;
- semantic owner and cross-layer edges are evidence-classified;
- evidence/document ordering was not promoted into a semantic flow;
- negative authority/exclusion statements were not inverted into positive runtime/release/generated surfaces;
- cross-layer scalar/request-metadata changes are traced as connected producer -> metadata -> consumer edges rather than only a file inventory;
- material request-identity and no-extra-I/O preservation boundaries are explicitly checked, with `UNKNOWN` preserved when current evidence cannot prove them;
- relevant tests/contracts were read rather than inferred from names;
- generated/release/materializer impact is bounded rather than assumed;
- unresolved dynamic edges remain `UNKNOWN`;
- report-template instruction text was not emitted as an answer value;
- `Blocked claims` and `Verdict` are present even when output budget is tight;
- no design, repair, implementation, or repository mutation occurred.

Then stop and hand off to the next workflow stage.

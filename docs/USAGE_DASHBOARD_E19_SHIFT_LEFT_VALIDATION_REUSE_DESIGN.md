# Local Usage Dashboard E19 — Shift-Left Validation Reuse

Status: **IMPLEMENTED — VALIDATED / MERGED BYTE-NEUTRAL MAINTENANCE**

## Baseline

- production Product: `3.0.0-alpha.5.95`
- production branch: `release-usage-dashboard`
- production SHA: `076b24182de5ebcb5c38faf4b45bed4779b5c8e0`
- Engine: `1.6.31`
- Manager: `1.3.5`
- managed CLI: `1.10.0`
- managed Models catalog: `1.251.0`
- contracts: snapshot `1` / recentRequest `1`
- design base main: `f858a01673f049e3d2353360e300c910b2be64b6`
- implementation base main: `a4ff300107d09fbff9212e2ab8df69bc4003e152`

E19 is a maintenance/design label only. It must not reserve a product version or introduce `release_generation: E19`.

## Trigger from E18 + 5.95

E18 solved the post-materialization smoke-selection gap: actual generated Plugin/Engine/Manager impact now selects the appropriate existing smoke instead of trusting source-path intent.

5.95 proved that architecture, but also exposed avoidable late failures that were deterministic before candidate publication:

1. release-spec shape/metadata omissions were discovered one at a time during stage/E9;
2. the materializer could produce 5.95 from 5.94 but was initially not a true target no-op when executed again on an already-materialized 5.95 tree;
3. cheap deterministic contracts such as the module byte ceiling (P5) and bounded release-note shape (P49) ran after expensive candidate churn;
4. a historical regression (P28) was coupled to incidental internal error prose rather than the fail-closed invariant.

These are timing/reuse/hygiene problems, not missing release authority.

## Decision

Keep the authority graph unchanged:

`E13 -> E14 -> E15 -> E9 -> E11 -> E16 -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

E19 changes **when existing deterministic checks run**, not who owns release truth.

## E19-A — Canonical release-spec contract reuse at readiness

One pure repository-local helper, `plugins/usage-dashboard/tools/release_spec_contract_e19.cjs`, owns deterministic release-spec shape/invariants. Existing consumers reuse it rather than restating the schema.

Consumers include:

- `source_readiness_e9.cjs` against the exact source SHA;
- `tests/helpers/current-release.cjs` after materialization;
- P49 through the same helper for bounded release-note shape.

Multiple related deterministic findings are summarized into the existing `SOURCE_SHA_NOT_READY` receipt family. No new release authority or receipt database is introduced.

## E19-B — Declared materializer second-pass no-op

E7 already runs the declared materializer once and then calls `reconcile_release_candidate.py --two-pass`. E19 keeps that workflow surface small: the reconciler now snapshots the candidate tree at entry, runs the **same materializer declared by the release spec** a second time, and requires the tree plus critical Product/Engine/Manager/manifest hashes to remain unchanged before generic reconciliation continues.

No wrapper or alternate materializer authority is allowed.

## E19-C — Cheap structural gates before E18 smoke

The reconciler runs an existing deterministic subset after reconciliation is stable and before control returns to E7's E18 derived-impact smoke:

- `current-release-contract.cjs`;
- `p5-module-layout.cjs`;
- `p49-release-notes-diagnostic-guidance.cjs`.

These tests remain ordinary repository tests and still run again under E9 full-registry validation. Early success grants no merge/promotion authority.

Effective order:

`canonical source/spec validation -> declared materializer pass 1 -> declared materializer pass 2 no-op -> generic reconciliation two-pass -> cheap structural gates -> E18 derived-impact classification -> impact-selected smoke -> candidate write -> E9 full registry`

## E19-D — Semantic regression hygiene

Internal implementation prose is not a stable contract unless explicitly declared so. Proven brittle tests should migrate toward error codes, structured states, fail-closed conditions, or externally visible machine/user contracts. No global string lint is added.

## E19-E — Preserve E18

E18-B/C remain unchanged:

- source intent remains policy/ownership input;
- derived post-materialization impact remains behavior-smoke selector;
- Engine impact keeps repeat-3;
- unknown shipped/runtime impact remains fail-closed;
- no persistent impact database or cross-workflow state owner.

## Hard boundaries

E19 must not add:

- `release_generation: E19`;
- auto-merge;
- a new durable release authority;
- a second schema implementation;
- a wrapper/alternate materializer authority;
- a new queue, timer, poller, scheduled bot, or persistent state database;
- network validation I/O for these checks;
- weaker E9/E11/E16 semantics;
- weaker Engine repeat-3;
- Product/Engine/Manager version changes for E19-only maintenance;
- physical acceptance as repository release authority.

## Implementation gate

1. shared pure release-spec helper;
2. current-release/P49 consumer reuse;
3. source-readiness reuse with bounded aggregated findings;
4. declared materializer second-pass no-op proof;
5. pre-smoke P5/P49/current-release structural subset;
6. E19 contract regression for ordering/fail-closed semantics;
7. full Usage Dashboard registry GREEN;
8. Product/Plugin/Engine/Manager/bootstrap byte-neutral proof;
9. maintenance PR/CI/main merge;
10. next legitimate product release provides live proof.

## Implementation closure

- implementation issue: `#1006`
- implementation PR: `#1008`
- validated implementation head: `5f638412218e4e255b55df9a2292aff505f4d1dd`
- Usage Dashboard Candidate Validation: SUCCESS, run `33326111376`
- Plugin Control Plane PR observe: SUCCESS, run `33326111335`
- registry: `TEST_REGISTRY_GREEN:123`
- declared materializer second-pass: `E19_MATERIALIZER_SECOND_PASS_GREEN`
- pre-smoke structural gates: `current-release-contract.cjs`, `p5-module-layout.cjs`, `p49-release-notes-diagnostic-guidance.cjs` GREEN
- main merge: `b20f12694ecd7c7907621a6a17d16e1658a03ace`
- post-merge production branch remained `076b24182de5ebcb5c38faf4b45bed4779b5c8e0`
- production tuple remained Product `3.0.0-alpha.5.95` / Engine `1.6.31` / Manager `1.3.5` / CLI `1.10.0` / Models `1.251.0` / contracts `1/1`
- Engine SHA remained `b46f307494514eefdb2a237e54b18ba04c1582f2eb7766a0a6828d28604470d4`
- Manager SHA remained `396b906a37257ff8e41f176d394d13c38715c2887fc8d95ed7c0ac3203d9ec63`
- bootstrap SHA remained `4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c`

E19 introduced no product release, no production mutation, no new release authority, and no physical-device verification requirement.

## Verdict

**E18 KEEP SEALED -> E19 SHIFT LEFT EXISTING CONTRACTS — IMPLEMENTED.**

The optimization target is fewer avoidable restages and earlier, more semantic failures—not more state machines.

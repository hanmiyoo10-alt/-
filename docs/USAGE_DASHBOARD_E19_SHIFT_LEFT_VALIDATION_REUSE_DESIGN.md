# Local Usage Dashboard E19 — Shift-Left Validation Reuse

Status: **DESIGN READY — NON-AUTHORITY STABILITY / SIMPLIFICATION / BOUNDED AUTOMATION**

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

Create/extract one repository-local **pure release-spec contract helper** and make existing callers share it.

The helper owns only deterministic release-spec shape/invariants, including the fields already required across current-release, package-authority, and release-note contracts. It must support checking parsed spec data without requiring a materialized runtime tree.

Expected consumers:

- `source_readiness_e9.cjs` for the exact source SHA;
- `current-release-contract.cjs` after materialization;
- release-note/package-authority regressions for their relevant subsets.

Rules:

- do not clone a second schema in source readiness;
- do not make source readiness a new release authority;
- keep E9 full-registry validation authoritative;
- aggregate bounded deterministic spec findings where practical so one source repair can address multiple missing fields instead of serial restages;
- preserve the existing `SOURCE_SHA_NOT_READY` receipt family rather than adding a new durable receipt type.

Target outcome: malformed/missing canonical release metadata is rejected before stage dispatch.

## E19-B — Materializer second-pass no-op before candidate publication

E7 must prove target idempotence directly before it publishes a candidate.

Bounded sequence:

1. apply exact source intent;
2. run existing release-generic preflight;
3. run the declared materializer once;
4. snapshot deterministic candidate diff/tree state;
5. run the **same materializer a second time** on the already-target tree;
6. require the second pass to leave the candidate diff/tree unchanged;
7. continue with existing reconciliation/parity checks.

Failure should be an early local/stage failure such as `MATERIALIZER_NOT_IDEMPOTENT`; it is diagnostic only and does not replace E9.

Do not introduce a wrapper materializer, alternate writer, or second materialization authority.

## E19-C — Cheap structural gates before expensive behavior smoke

After materialization + idempotence, run a small fixed set of deterministic structural checks **before** E18-selected behavior smoke.

Initial bounded candidates:

- P5 module layout / hard byte ceilings;
- P49 release-note bounded shape and generated projection;
- canonical current-release/spec contract checks that require the materialized tree.

Selection principles:

- static/local/deterministic;
- materially cheaper than repeat-3 behavior smoke;
- already authoritative as existing Pxx/foundation logic;
- reuse the same helper/test logic rather than reimplementing it in YAML.

E9 still runs the complete registry afterward. Passing the early subset never grants merge or promotion authority.

Recommended order:

`canonical source/spec validation -> materialize -> second-pass idempotence -> cheap structural gates -> derived-impact classification -> impact-selected smoke -> candidate write -> E9 authoritative full registry`

## E19-D — Semantic regression hygiene, bounded not global

Extend the E18-A principle beyond materializer source spelling:

- internal implementation prose is not a stable contract unless explicitly declared so;
- tests should assert error codes, structured states, fail-closed conditions, or externally visible machine/user contracts;
- when an existing test is proven brittle (as P28 was in 5.95), migrate that specific assertion without weakening the protected behavior;
- do **not** add a global regex/string lint that guesses which strings are semantic.

This workstream is intentionally incremental and evidence-driven.

## E19-E — Preserve E18 derived-impact architecture

E18-B/C remain unchanged:

- source intent remains for policy/ownership;
- derived post-materialization impact remains the only behavior-smoke selector;
- Engine impact keeps repeat-3 for now;
- Plugin-only and runtime-sidecar paths retain their current plans;
- unknown shipped/runtime impact remains fail-closed;
- no persistent impact database or cross-workflow state owner.

E19 must not weaken `E18_UNKNOWN_RUNTIME_IMPACT` merely because the unknown path has not yet occurred live.

## E19-F — One failure, one useful receipt

Where a deterministic pre-candidate check can discover multiple related static problems in one pass, report them together in the existing bounded readiness/stage diagnostic surface.

Goals:

- reduce serial source-SHA churn;
- avoid one-field-per-restage discovery;
- preserve fail-closed behavior;
- keep receipts bounded and human-readable;
- no new issue-comment writer or receipt database.

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
- weaker Engine repeat-3 based on only one live proof;
- Product/Engine/Manager version changes for E19-only maintenance;
- physical acceptance as repository release authority.

## Implementation plan

Preferred implementation order:

1. extract/define the pure canonical release-spec contract helper;
2. migrate current consumers to the helper without changing their external verdicts;
3. call the same helper from source readiness against the exact source SHA and add aggregated bounded findings;
4. add E7 second-pass materializer no-op verification;
5. run P5/P49/current-release structural subset before E18 behavior smoke;
6. regression-lock ordering and fail-closed paths in a new E19 contract test;
7. keep `derived_impact_e18.cjs` behavior unchanged;
8. run the full Usage Dashboard registry;
9. prove E19 maintenance is Product/Plugin/Engine/Manager/bootstrap byte-neutral;
10. merge as maintenance, then use the next legitimate product release as live proof.

## Success criteria

E19 is successful when the next legitimate product release demonstrates:

- canonical release-spec mistakes fail before candidate publication;
- a non-idempotent materializer fails in E7 before PR/E9 candidate churn;
- P5/P49-style deterministic structural failures occur before repeat-3 smoke;
- valid releases still use E18 derived-impact smoke unchanged;
- E9 full registry remains the authoritative candidate validation;
- E11/E16/fresh-reread/expected-head merge remain unchanged;
- no user/manual development step is added;
- no new authority layer is required.

## Verdict

**E18 KEEP SEALED -> E19 SHIFT LEFT EXISTING CONTRACTS.**

The optimization target is fewer avoidable restages and earlier, more semantic failures—not more state machines.
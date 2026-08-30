# Local Usage Dashboard — E18 Semantic Validation & Impact-Aware Smoke Design

## Status

**E18 DESIGN READY — NON-AUTHORITY STABILITY / SIMPLIFICATION / BOUNDED AUTOMATION**

E18 is a design label for a byte-neutral release-control maintenance envelope. It is **not** a new durable release generation, authority layer, writer, queue, or merge/promotion controller.

Forbidden: `release_generation: E18`.

## Trigger

E17 successfully removed avoidable 5.93-era release friction while preserving the existing authority graph. The first subsequent real product release, 5.94, provided two concrete follow-up signals:

1. the first 5.94 materialization built the Plugin successfully and preserved Engine source parity, but a version-specific materializer self-check failed because it expected an exact JavaScript source spelling (`state:'no-positive-cost'`) rather than the semantic behavior;
2. E7 selected behavior-smoke depth from source-intent path classification. In that same materialization `PLUGIN_CHANGED=false` even though the materializer generated a changed shipped Plugin bundle. Source intent was truthful, but it was not sufficient authority for **derived artifact impact**.

These are validation-shape and impact-classification problems. They do not justify E18 authority.

## Fresh design baseline

At design freeze:

- production branch: `release-usage-dashboard`
- production SHA: `bfec7e60ad671adf8fa0ffb7f12387eef5a808fe`
- Product: `3.0.0-alpha.5.94`
- Engine: `1.6.30`
- Engine SHA-256: `035aa5d6535edd357df3390b7cd22acff2dec298a79e86d2fe2b4b0d3f2b4228`
- Manager: `1.3.4`
- Manager SHA-256: `bbcbb6b4ae2dfe6a27ec4282da8147d3e5a693586a1648211d90a107713f0801`
- bootstrap SHA-256: `4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c`
- snapshot / recent-request contracts: `1 / 1`
- design base main: `57fa67a792b5d71889ddf69d630c8fabdf2cf526`

E18 maintenance must remain byte-neutral for the current production release. It cannot itself reserve or cause a Product/Engine version bump.

## Authority graph — unchanged

E18 must preserve the existing release authority graph exactly:

`E13 request -> E14 ancestry -> E15 canonical PR handoff -> E9 exact-SHA validation -> E11 fresh-main merge guard -> E16 derived capsule -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

E18 may improve local deterministic checks inside existing stages. It may not add an authority edge.

## Primary goal

Make release validation depend on **semantic contracts and actual derived artifact impact**, not incidental source spelling or incomplete source-intent path proxies.

Preferred pattern:

`existing immutable inputs -> pure/local derivation -> deterministic classification/assertion -> existing validation/smoke owner`

No new writer.

---

## E18-A — semantic materializer validation

### Problem

A release materializer may correctly generate runtime behavior while a version-specific self-check rejects it because a helper was implemented with a different but equivalent source spelling.

The 5.94 example failed after:

- release preflight GREEN;
- Engine source parity GREEN;
- Plugin bundle build GREEN;
- Plugin source parity GREEN;

and then rejected the candidate on the exact source marker spelling for the no-positive-cost state.

### Design

Version materializers must separate two kinds of assertions:

#### A. Structural/materialization assertions — allowed inside the materializer

Examples:

- expected baseline artifact SHA before mutation;
- target Product/Engine/Manager identity;
- exact-byte invariants declared by the release spec;
- required module/part registration;
- successful bundle/manager build;
- manifest/hash synchronization;
- source/generated parity using existing canonical parity tools;
- bootstrap exact-byte preservation when required;
- idempotent second pass.

These assertions verify **that the materializer produced the intended release structure**.

#### B. Feature semantic assertions — owned by focused Pxx regression tests

Examples:

- positive-cost-only selection;
- zero/missing => UNKNOWN;
- deterministic tie resolution;
- no new I/O;
- UI/Diagnostics parity;
- source fidelity.

These must assert behavior/outputs, not JavaScript formatting.

### Rule

A materializer must not require incidental source fragments such as exact whitespace, quote style, ternary/object-literal spelling, or equivalent implementation syntax unless that literal is itself a stable machine contract consumed externally.

### Simplification target

Prefer reusable pure helpers for structural assertions instead of release-specific substring lists. Reuse existing parity/build/version/hash tools before adding a new helper.

If a new helper is unavoidable, it must be pure/local, stateless, and have no network or write authority.

---

## E18-B — derived artifact impact classification

### Problem

Source-intent classification answers: **what files did the author submit?**

Smoke selection needs a different question: **what shipped/runtime artifacts did materialization actually change?**

5.94 proved these can differ: source intent was spec/tests/materializer-only, while the materializer generated a changed Plugin bundle.

### Design

After source intent is applied and materialization/reconciliation finishes, derive an **impact report** from the actual candidate diff.

The classifier must be pure/local and compare deterministic Git trees/working-tree state already available in E7. It must not query GitHub or add persistence.

Minimum impact dimensions:

- `plugin`
- `engine`
- `manager`
- `bootstrap`
- `contracts`
- `tests`
- `docs`
- `control_plane`
- `unknown`

### Artifact ownership examples

`plugin=true` when any shipped Plugin source/generated artifact changes, including at least:

- `plugins/usage-dashboard/src/**` when it contributes to the shipped bundle;
- `plugins/usage-dashboard/latest.js`;
- other canonical Plugin bundle outputs declared by current build authority.

`engine=true` when Engine source or generated Engine artifact changes.

`manager=true` when Manager runtime bytes change, excluding Product-version-only metadata classification where existing release contracts intentionally distinguish semantic Manager version from product identity. The implementation design must explicitly classify this case rather than guessing.

`bootstrap=true` when bootstrap bytes change.

### Fail-closed rule

A changed shipped/runtime path that cannot be classified must produce `unknown=true` and must **not** silently choose the lightest smoke path.

Preferred response: run the broader existing smoke appropriate to the nearest safe runtime class, or block if no safe mapping exists. The implementation must choose one deterministic policy and regression-lock it.

UNKNOWN remains UNKNOWN.

---

## E18-C — impact-aware smoke selection

### Current weakness

Existing E7 behavior smoke depth is selected using source-intent booleans such as `ENGINE_CHANGED` / `PLUGIN_CHANGED`. Those remain useful for source-policy and ownership decisions, but they are insufficient for post-materialization runtime-smoke selection.

### New selection authority

Smoke depth must be selected from **derived artifact impact after materialization**, while source-intent classification remains unchanged for source-policy checks.

Proposed minimum policy:

- `engine=true` -> existing Engine-affecting behavior smoke (`--repeat 3` baseline unless current authority changes);
- `plugin=true` and `engine=false` -> existing Plugin-affecting behavior smoke (`--repeat 1` baseline);
- no shipped runtime artifact changed -> structural-only smoke skip remains allowed;
- `unknown=true` for a shipped/runtime candidate path -> fail closed to broader smoke or block per the deterministic E18-B policy;
- tests/docs/control-only changes must not manufacture runtime impact.

Manager/bootstrap-specific smoke should **reuse existing validation owners**. E18 must not invent a second manager/bootstrap harness merely to complete the matrix. If current validation is insufficient, that is a separate evidence-backed maintenance item.

### Important separation

Source intent still controls:

- allowed source paths;
- ownership/policy;
- trusted/untrusted boundary;
- whether release-control files are denied.

Derived impact controls only:

- post-materialization smoke selection;
- bounded diagnostic reporting about what actually changed.

Do not merge these concepts into one mutable state owner.

---

## E18-D — stable diagnostic projection, not a new receipt authority

For diagnosability, E7 may emit a bounded stdout/log projection such as:

`UD_DERIVED_IMPACT:plugin=true engine=false manager=identity-only bootstrap=false contracts=false unknown=false`

This is diagnostic evidence, not release authority.

Default design:

- no new issue-comment writer;
- no new durable receipt type required;
- no synchronization loop;
- no status database;
- no operator projection state machine.

If existing E7/E9 logs already expose enough information, implementation should avoid adding even this marker.

---

## E18-E — keep E17 historical and canonical-handoff rules sealed

E18 must not reopen solved E17 work.

Keep unchanged unless a new failing proof demands otherwise:

- E17-A canonical first-write E15 body helper;
- E17-B exact historical version guard + `UD_HISTORICAL_VERSION_LOCK` rule;
- E17-C baseline-proof documentation semantics;
- E17-D candidate-source boundary;
- E17-E operator projection deferred.

5.94 showed E17-B correctly fail-closed on an actually missing P59 historical lock. That behavior is desired and must not be weakened to reduce release attempts.

---

## Hard boundaries

E18 must not add:

- `release_generation: E18`;
- auto-merge;
- a second stage/materialization writer;
- a second merge or promotion authority;
- new network I/O in candidate validation;
- queue/timer/poller/scheduled bot;
- mutable cross-workflow synchronization;
- persistent impact database;
- PR/body/capsule sync loop;
- production writer authority;
- physical acceptance as repository authority;
- guessed runtime impact for unknown paths.

Do not weaken fail-closed source policy, historical hygiene, E9 exact-SHA validation, E11 fresh-main classification, E16 pair binding, expected-head merge, or exact-byte promotion.

---

## Implementation shape

Preferred implementation order:

1. add focused contract tests for semantic-vs-syntactic materializer assertions;
2. implement a pure derived-impact classifier over local candidate diffs;
3. regression-lock known path classes and unknown fail-closed behavior;
4. switch only E7 smoke-selection input from source-intent impact to derived impact;
5. leave E7 source-policy/source-intent classification untouched;
6. remove or replace demonstrated brittle release-specific source-spelling checks only where semantic Pxx coverage exists;
7. run the full Usage Dashboard registry;
8. prove current production/runtime artifacts remain byte-identical for E18-only maintenance;
9. merge as byte-neutral maintenance through normal PR/CI, without a product release.

No implementation step may require PocketRisu physical testing because E18-only maintenance must not alter shipped runtime bytes.

---

## Regression acceptance

At minimum prove:

1. semantically equivalent helper implementations do not fail solely due to quote/ternary/object-literal spelling;
2. focused Pxx behavior still catches genuine semantic regression;
3. source-intent-only spec/tests/materializer release can still derive `plugin=true` when generated Plugin bytes change;
4. unchanged Engine exact bytes derive `engine=false`;
5. actual Engine-byte change derives `engine=true`;
6. structural-only candidate derives no runtime impact;
7. unknown changed shipped path fails closed;
8. Engine impact selects broader existing smoke;
9. Plugin-only impact selects Plugin smoke;
10. no runtime impact preserves structural-only smoke skip;
11. source-policy allow/deny decisions are unchanged;
12. E15/E17 canonical PR handoff unchanged;
13. E9/E11/E16 receipt semantics unchanged;
14. no new HTTP/CLI/timer/poller/persistence/writer owner;
15. E18 maintenance itself is Product/Plugin/Engine/Manager/bootstrap byte-neutral;
16. full Usage Dashboard registry GREEN.

---

## Success metric

E18 succeeds when the next legitimate product release demonstrates:

- no materialization RED caused only by incidental implementation spelling;
- smoke depth matches the **actual derived runtime artifacts** that changed;
- genuine source/historical/semantic failures still fail early and clearly;
- the authority graph is unchanged;
- no new manual step is added for the user;
- no new release layer is needed.

The ideal E18 outcome is fewer repair cycles with **equal or stronger truthfulness**, not fewer checks.

## Verdict

**E17 remains sealed and successful. E18 should be a bounded semantic-validation + derived-impact automation maintenance envelope.**

If implementation requires a new writer, durable generation, queue, state machine, or merge authority, the E18 design has failed its simplification goal and must be reduced rather than expanded.

## Related

- #968 — E17 Stability Envelope
- #974 — 5.94 release request / first E17 live proof
- #976 — 5.94 release PR
- #959 — 5.94 cost-driver product design
- #906 — E16 derived merge-authority capsule

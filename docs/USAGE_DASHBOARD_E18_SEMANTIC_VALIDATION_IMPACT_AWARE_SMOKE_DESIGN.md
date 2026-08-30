# Local Usage Dashboard — E18 Semantic Validation & Impact-Aware Smoke Design

## Status

**E18 IMPLEMENTED — VALIDATION IN PROGRESS / BYTE-NEUTRAL MAINTENANCE**

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
- implementation base main: `146dfddd20646a1f385d2fa85f0462e011ff5d14`

E18 maintenance must remain byte-neutral for the current production release. It cannot itself reserve or cause a Product/Engine version bump.

## Authority graph — unchanged

E18 preserves the existing release authority graph exactly:

`E13 request -> E14 ancestry -> E15 canonical PR handoff -> E9 exact-SHA validation -> E11 fresh-main merge guard -> E16 derived capsule -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

E18 improves local deterministic checks inside the existing E7 stage only. It adds no authority edge.

## Primary goal

Make release validation depend on **semantic contracts and actual derived artifact impact**, not incidental source spelling or incomplete source-intent path proxies.

Preferred pattern:

`existing immutable inputs -> pure/local derivation -> deterministic classification/assertion -> existing validation/smoke owner`

No new writer.

---

## E18-A — semantic materializer validation

### Problem

A release materializer may correctly generate runtime behavior while a version-specific self-check rejects it because a helper was implemented with a different but equivalent source spelling.

The 5.94 example failed after release preflight, Engine parity, Plugin bundle build, and Plugin source parity had already succeeded, then rejected the candidate on an exact source marker spelling for the no-positive-cost state.

### Implemented rule

Version materializers keep structural/materialization assertions such as:

- expected baseline artifact SHA before mutation;
- target Product/Engine/Manager identity;
- exact-byte invariants declared by the release spec;
- successful bundle/manager build and canonical parity tools;
- manifest/hash synchronization;
- bootstrap exact-byte preservation;
- idempotent reconciliation.

Feature semantic assertions are owned by focused Pxx regressions. For 5.94, P60 executes the cost-driver helper and validates positive-cost-only selection, UNKNOWN fidelity, deterministic tie resolution, share denominator truth, UI/Diagnostics bindings, and no new I/O without requiring incidental ternary or sort-expression spelling.

The historical 5.94 materializer post-validation is therefore structural only. Source anchors used to apply the deterministic change remain allowed because they are materialization mechanics, not post-hoc semantic truth checks.

---

## E18-B — derived artifact impact classification

Source-intent classification answers **what files the author submitted**. Smoke selection needs to answer **what shipped/runtime artifacts actually changed after materialization**.

Implemented pure/local helper:

`plugins/usage-dashboard/tools/derived_impact_e18.cjs`

It derives an impact report from the local deterministic diff against the frozen trusted base and exposes these dimensions:

- `plugin`
- `engine`
- `manager`
- `bootstrap`
- `contracts`
- `tests`
- `docs`
- `control_plane`
- `unknown`

Known shipped artifacts and canonical source prefixes are classified explicitly. A changed unrecognized path under shipped `runtime/` or `runtime-src/` becomes `unknown=true` and fails closed; it is never guessed into a lighter class.

The helper uses local Git state only. It has no GitHub/network I/O, writer, timer, queue, persistence, or merge authority.

---

## E18-C — impact-aware smoke selection

E7 source-intent outputs remain intact for source-policy and ownership compatibility. They no longer choose behavior-smoke depth.

After materialization/reconciliation and structural checks, E7 calls the E18 helper against the frozen trusted base and selects smoke from derived impact:

- `engine=true` -> existing behavior smoke `--repeat 3`;
- `plugin=true` and no Engine impact -> existing behavior smoke `--repeat 1`;
- Manager/bootstrap-only runtime impact -> reuse the existing behavior smoke `--repeat 1` rather than invent a second harness;
- no derived runtime impact -> structural-only skip;
- `unknown=true` -> block with `E18_UNKNOWN_RUNTIME_IMPACT`.

A bounded stdout marker `UD_DERIVED_IMPACT:` records the local classification for diagnosis only. It is not a durable release receipt or authority input.

### Important separation

Source intent still controls:

- allowed source paths;
- ownership/policy;
- trusted/untrusted boundary;
- release-control-file denial.

Derived impact controls only:

- post-materialization smoke selection;
- bounded local diagnostic reporting.

No mutable state owner joins these concepts.

---

## E18-D — diagnostics remain non-authority

No new issue-comment writer, durable receipt type, status database, synchronization loop, operator state machine, queue, timer, poller, or network validation I/O was added.

The only new projection is the bounded E7 stdout/log marker derived from local deterministic state.

---

## E18-E — E17 remains sealed

E18 does not reopen:

- E17-A canonical first-write E15 body helper;
- E17-B exact historical version guard + `UD_HISTORICAL_VERSION_LOCK`;
- E17-C E16 baseline-proof documentation semantics;
- E17-D candidate-source boundary;
- E17-E operator projection remains deferred.

5.94 proved E17-B correctly fail-closed on a real missing P59 historical lock. E18 does not weaken that behavior.

---

## Hard boundaries

E18 does not add:

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

Fail-closed source policy, historical hygiene, E9 exact-SHA validation, E11 fresh-main classification, E16 pair binding, expected-head merge, and exact-byte promotion remain unchanged.

---

## Regression acceptance

Implementation validation must prove at minimum:

1. semantically equivalent helper implementations do not fail solely due to quote/ternary/object-literal spelling;
2. P60 behavior still catches genuine cost-driver semantic regression;
3. a source-intent-only spec/tests/materializer release can derive `plugin=true` when generated Plugin bytes change;
4. unchanged Engine bytes derive `engine=false`;
5. actual Engine impact derives `engine=true` and selects repeat-3 smoke;
6. structural-only changes derive no runtime impact and preserve smoke skip;
7. unknown changed shipped/runtime paths fail closed;
8. source-policy allow/deny decisions remain unchanged;
9. E15/E17 handoff and E9/E11/E16 semantics remain unchanged;
10. no new HTTP/CLI/timer/poller/persistence/writer owner exists;
11. E18 maintenance itself changes no Product/Plugin/Engine/Manager/bootstrap shipped bytes;
12. full Usage Dashboard registry is GREEN.

No PocketRisu physical check is required for E18-only maintenance because it must not alter shipped runtime bytes.

## Success metric

The next legitimate product release should demonstrate:

- no materialization RED caused only by incidental implementation spelling;
- smoke depth matches the actual derived runtime artifacts that changed;
- genuine source/historical/semantic failures still fail early and clearly;
- authority graph unchanged;
- no new manual user step;
- no new release layer.

The ideal E18 outcome is fewer repair cycles with equal or stronger truthfulness, not fewer checks.

## Verdict

**E17 remains sealed and successful. E18 is implemented as a bounded semantic-validation + derived-impact smoke maintenance envelope, pending full CI validation.**

If a future change requires a new writer, durable generation, queue, state machine, or merge authority, that proposal is outside E18 and must be reduced or separately justified.

## Related

- #979 — E18 tracking
- #968 — E17 Stability Envelope
- #974 — 5.94 release request / first E17 live proof
- #976 — 5.94 release PR
- #959 — 5.94 cost-driver product design
- #906 — E16 derived merge-authority capsule

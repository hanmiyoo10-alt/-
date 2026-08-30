# Local Usage Dashboard — E15 Stability, Simplification, and Documentation Automation Next Design

Status: **DESIGN READY — IMPLEMENTATION NOT STARTED**

Scope: `plugins/usage-dashboard/` release-control maintenance after the real `3.0.0-alpha.5.90` release.

## 1. Baseline

Fresh production authority at design start:

- Product: `3.0.0-alpha.5.90`
- Engine: `1.6.28`
- Manager: `1.3.4`
- contracts: `1 / 1`
- production branch: `release-usage-dashboard`
- E15 verdict after 5.90: KEEP
- E16 verdict: HOLD

The 5.90 release supplied a fourth live E15 proof. Its durable request was explicitly classified on first write, its deterministic PR used canonical locator-only prose on first write, E9 validated the exact candidate SHA, E11 tolerated unrelated main drift without PR-body synchronization, expected-head merge succeeded, and exact-byte production promotion completed.

## 2. Design objective

Use the 5.90 feedback to make E15 quieter and harder to misuse while reducing manually-maintained release documentation.

The target is:

```text
more stability
+ less hand-authored presentation
+ deterministic local generation
+ fail-closed verification
- no new release state
- no new authority axis
- no mutable PR-body synchronization
- no scheduled documentation writer
```

This is maintenance of the existing E15/E13/E14/E9/E11 control chain, not E16.

## 3. Product/release boundary

This maintenance should remain byte-neutral for production runtime artifacts.

Do not create a Product/Engine/Manager bump solely for E15 maintenance. If no unrelated product release intervenes, the next real product release would be `3.0.0-alpha.5.91` and should serve as the next live proof after maintenance.

The maintenance PR itself must not promote `release-usage-dashboard` merely because release-control docs/tests/tools changed.

## 4. Stability direction — canonical first-write becomes the only normal path

### 4.1 Request metadata

Keep the exact first-write identity:

```text
Plugin: usage-dashboard
```

Do not add fallback ownership inference or unlabeled scanning.

### 4.2 Deterministic PR body

The E15 helper remains the canonical definition of stable authority locators.

Normal PR creation must obtain the canonical locator block from the helper/renderer instead of manually reproducing locator strings in caller code or assistant prose.

The validator remains fail-closed. Do not make it accept arbitrary prose or fuzzy authority wording.

### 4.3 Exact 5.89 near-miss regression

Add a regression for the real failure shape:

```text
Source authority: durable release request source_sha
```

where the semantic wording is recognizable but the canonical inline-code token is missing.

The regression must prove:

1. the noncanonical line is rejected;
2. the generated canonical line is accepted;
3. the failure identifies the `source_sha` locator directly;
4. no authoritative full-registry work is needed before this presentation failure is reported.

## 5. Simplification direction — fewer duplicated mutable facts

### 5.1 Do not repeat current production versions in long-lived E15 design prose

The existing E15 design document currently carries old baseline Product/Engine/Manager values and an obsolete implementation-status sentence. Mutable current-version facts belong in release manifests/receipts, not in a long-lived architecture document.

Future E15 design prose should describe stable contracts and link to current authority rather than manually copying every current release number.

### 5.2 Separate stable design from generated status

Keep two concepts distinct:

- **stable design**: architecture, invariants, non-goals, authority boundaries;
- **generated status**: whether implementation exists, which local contracts prove it, and which live releases have supplied proof.

The stable design should change rarely. Generated status may change when code/tests/proof metadata changes.

### 5.3 No new state machine

Do not add `release_generation: E15`, a PR-body updater state, a docs queue, a docs polling loop, or a new merge/promotion authority.

## 6. Documentation automation direction

The main documentation debt exposed after 5.90 is not that prose is missing; it is that manually-maintained status prose can silently drift from executable reality.

### 6.1 Machine-owned generated status block

Introduce a bounded generated block in the existing E15 design/status documentation. The block should be rendered deterministically from local repository facts, for example:

- E15 helper exists;
- E15 contract test is registered;
- release generation remains E13;
- E15 is not a durable transaction generation;
- current implementation status is `baseline-active`;
- live-proof references are supplied through durable repository evidence rather than manually retyping mutable SHAs into architecture prose.

The generated block must have explicit begin/end markers so humans do not hand-edit its contents.

### 6.2 Pure local renderer

Add a tiny pure/local documentation renderer under `plugins/usage-dashboard/tools/`.

Requirements:

- no GitHub API;
- no network;
- no token;
- no timer/poller;
- no branch mutation;
- deterministic output from checked-in repository inputs;
- usable both by tests and by the assistant's normal implementation workflow.

### 6.3 CI drift guard

Add a regression that renders the documentation status in memory and compares it to the committed generated block.

If stale, fail with one actionable error such as:

```text
E15_DOC_STATUS_STALE: regenerate canonical E15 status block
```

This converts silent documentation drift into an immediate deterministic failure.

### 6.4 Avoid an autonomous docs commit bot for now

Do not introduce a scheduled or event-driven GitHub writer that commits documentation after every release.

Reason:

- it adds write authority and race surface;
- it creates main churn for presentation-only facts;
- it works against E15's first-write/no-synchronization simplification thesis.

Automation should first mean **generated source + enforced parity**, not another mutable writer.

If future evidence shows deterministic generation + CI enforcement still causes repeated operator repair, reconsider a bounded docs writer then. That would be a new evidence-based decision, not the default.

## 7. Failure receipts

Improve E15 presentation failures without making parsing permissive.

For locator failures, report a stable locator key rather than only echoing the full Markdown line. Suggested keys:

```text
candidate-authority
source-authority
frozen-main-authority
validation-authority
merge-authority
request-marker
```

Example:

```text
E15_PR_LOCATOR_INVALID:source-authority:count=0
```

This makes repair obvious while keeping exact canonical rendering as the accepted form.

## 8. Regression plan

Minimum maintenance coverage:

1. canonical request metadata still auto-classifies to `plugin:usage-dashboard`;
2. alternate/conflicting/missing plugin declarations fail closed;
3. canonical renderer emits every required locator exactly once;
4. exact 5.89 missing-backtick `source_sha` near-miss fails with the `source-authority` key;
5. canonical `source_sha` locator passes;
6. mutable candidate/source/frozen-main SHA prose is still rejected;
7. same body remains valid across candidate restage and unrelated main drift;
8. E13 remains the durable transaction generation;
9. E15/E16 do not become durable generations;
10. no PR-body synchronization writer exists;
11. documentation generated block matches deterministic local renderer output;
12. obsolete `IMPLEMENTATION NOT STARTED` state cannot coexist with the implemented helper/registered contract;
13. no Product/Plugin/Engine/Manager/bootstrap runtime bytes change from this maintenance;
14. full Usage Dashboard registry remains GREEN.

## 9. Documentation migration

During implementation:

1. update the original E15 design document from obsolete pre-implementation status to a stable architecture status such as `IMPLEMENTED — BASELINE ACTIVE`;
2. remove or clearly mark design-time-only version snapshots that look like current authority;
3. insert the bounded generated status block;
4. make the new renderer/contract own future status synchronization;
5. retain issue #869 as live feedback history rather than duplicating its timeline into the design doc.

## 10. Live proof after maintenance

The next real Local Usage Dashboard product release after this maintenance should prove:

1. request classification is still automatic on first write;
2. deterministic PR body is canonical on first write;
3. no body-only repair is needed;
4. unrelated main drift requires no PR-body synchronization;
5. E9/E11/expected-head/exact-byte promotion remain unchanged;
6. generated E15 documentation status remains in sync without a human hand-edit pass;
7. physical acceptance remains separate from repository release authority.

If no intervening product release occurs, `3.0.0-alpha.5.91` is the natural next monotonic live-proof candidate, but this document does not reserve that version or authorize a release.

## 11. E16 gate remains unchanged

Keep E16 on hold unless a real release demonstrates a new control failure that cannot be represented by E15 maintenance plus existing E13/E14/E9/E11 authority.

Documentation drift by itself is not an E16 signal when deterministic generation and verification can solve it without a new state or writer.

## 12. Expected outcome

After this maintenance, the common path should be boring:

```text
canonical request generated once
-> classifier labels automatically
-> canonical PR body generated once
-> E15 presentation check
-> E9 exact-SHA validation
-> E11 fresh drift guard
-> expected-head merge
-> exact-byte promotion
-> parity
-> physical acceptance
```

And documentation should behave similarly:

```text
stable architecture prose
+ machine-generated status block
+ CI parity check
= no silent stale implementation-status text
```

That is the intended next step: stronger invariants, fewer duplicated facts, and more automation without adding another release engine.
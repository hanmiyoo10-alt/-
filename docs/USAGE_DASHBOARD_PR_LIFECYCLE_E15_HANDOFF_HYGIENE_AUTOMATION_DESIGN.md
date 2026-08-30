# Local Usage Dashboard — E15 Release-Handoff Hygiene Automation Design

Status: **IMPLEMENTED — BASELINE ACTIVE / MAINTENANCE HARDENING**

Tracking history: #738  
Live feedback/evidence: #869  
Current maintenance design: #901  
Scope: `plugins/usage-dashboard/` release-control lifecycle and its existing repository classification handoff

E15 is baseline release-handoff infrastructure. It is not a durable release generation and it does not add a release engine. Current Product/Engine/Manager versions are intentionally not copied into this long-lived architecture document; current release authority lives in the release manifest and durable release receipts.

<!-- E15_GENERATED_STATUS:BEGIN -->
## Generated implementation status

> Machine-owned block. Regenerate from the local E15 contract; do not hand-edit its contents.

- schema: `1`
- implementation: `baseline-active`
- helper: `plugins/usage-dashboard/tools/release_handoff_e15.cjs`
- contract: `plugins/usage-dashboard/tests/e15-release-handoff-hygiene-contract.cjs`
- durable release generation: `E13`
- E15 durable generation: `no`
- documentation mode: `generated-parity`
- live evidence history: `#869`
<!-- E15_GENERATED_STATUS:END -->

## 1. Design goal

E15 makes the existing Local Usage Dashboard release system **simpler to operate, harder to misclassify, and less dependent on mutable presentation**, without adding a new release engine.

The proven control chain remains authoritative:

```text
E13 durable transaction + authority-free wakes
-> E14 ancestry-aware deterministic candidate DAG
-> E9 exact-SHA validation
-> E11 frozen-main/DAG merge readiness
-> assistant fresh expected-head merge
-> monotonic exact-byte promotion
-> production parity
-> physical acceptance as a separate gate
```

E15 adds no state between those stages.

## 2. Governance

- Durable transaction/wake generation: **E13**.
- Candidate DAG ancestry baseline: **E14**.
- Exact candidate validation: **E9**.
- Merge-readiness classifier: **E11**.
- E15 role: **release-handoff hygiene / first-write automation baseline**.

`release_generation` remains `E13`. E15 must not be added to `DURABLE_TRANSACTION_GENERATION_RE` merely for naming symmetry.

## 3. First-write correctness

E15 follows a **first-write correctness** rule:

> Write stable metadata once, then let authoritative receipts evolve independently.

### A. Canonical request identity

Every Usage Dashboard durable release request contains exactly:

```text
Plugin: usage-dashboard
```

This is classification metadata, not release authority. The existing shared classifier applies `plugin:usage-dashboard`; E9 continues to discover only that labeled lane. Missing, duplicate, alternate, or conflicting declarations fail closed. No unlabeled scanning or ownership guessing is added.

### B. Locator-only deterministic PR body

The deterministic PR body carries stable authority locators rather than mutable SHA copies:

```text
Candidate authority: current PR head
Source authority: durable release request `source_sha`
Frozen-main authority: candidate trailer + E11 receipt
Validation authority: E9 exact-SHA receipt
Merge authority: fresh E11 receipt + expected-head merge
```

The body may also carry bounded release summary fields and exactly one durable request marker:

```text
Usage-Dashboard-Release-Request: #<request>
```

Candidate/source/frozen-main SHA values are not copied into PR prose as current facts.

That means candidate restage or unrelated main drift requires **zero PR-body synchronization operations**.

## 4. Executable boundary

Canonical behavior lives in:

`plugins/usage-dashboard/tools/release_handoff_e15.cjs`

The helper owns only pure presentation/validation semantics:

```text
validateRequestPluginDeclaration(body)
renderStableLocatorBlock()
renderStablePrBody(input)
validateStablePrBody(body, requestNumber)
```

It has no network calls, GitHub API calls, token, polling, branch mutation, issue/PR mutation, merge authority, or production authority.

The E9 validator imports this helper only to verify handoff presentation before exact-SHA full-registry validation. E9 remains the candidate-validation authority.

## 5. Failure behavior

E15 remains fail-closed.

It rejects:

1. missing, duplicate, alternate, or conflicting Plugin identity;
2. missing or duplicated stable authority locators;
3. wrong durable request marker;
4. mutable candidate/source/frozen-main SHA prose;
5. existing E9/E11 identity or freshness failures handled by their own contracts.

Locator failures use stable keys such as:

```text
candidate-authority
source-authority
frozen-main-authority
validation-authority
merge-authority
```

This keeps repair actionable without accepting fuzzy prose.

## 6. Documentation automation

The original implementation-status drift showed that manual status prose is itself avoidable synchronization work.

E15 documentation therefore separates:

- **stable architecture prose** — this document;
- **machine-owned implementation status** — the generated block near the top of this document;
- **live release history** — durable issues/receipts such as #869 rather than manually copied moving SHAs.

The local renderer is:

`plugins/usage-dashboard/tools/render_e15_status_doc.cjs`

It is deterministic and local-only. It has no network, token, timer, branch mutation, or autonomous writer.

The E15 contract regenerates the status block in memory and compares it to the committed block. Drift fails with:

```text
E15_DOC_STATUS_STALE:regenerate canonical E15 status block
```

Automation here means **generated source + enforced parity**, not a scheduled documentation commit bot.

## 7. Why there is no docs writer

An event-driven or scheduled docs writer is intentionally deferred because it would add write authority, race surface, and main churn for presentation-only state.

The preferred order is:

1. deterministic renderer;
2. exact parity guard;
3. assistant automatically applies the generated result during ordinary maintenance;
4. only reconsider a bounded docs writer if real releases repeatedly prove this is insufficient.

This follows the same simplification thesis as locator-only PR prose: remove synchronization work before automating another synchronizer.

## 8. Regression contract

`plugins/usage-dashboard/tests/e15-release-handoff-hygiene-contract.cjs` proves at minimum:

1. canonical request metadata uses the existing explicit classifier;
2. missing/conflicting/duplicate/alternate Plugin declarations fail closed;
3. E13 remains the durable release generation;
4. E15 is not a durable release generation;
5. canonical locator-only PR body passes;
6. the exact 5.89 missing-backtick `source_sha` near-miss fails with `source-authority`;
7. mutable candidate/source/frozen-main SHA prose fails;
8. the same body remains valid across candidate/main movement;
9. E9 imports E15 only for presentation validation;
10. no PR-body synchronization path appears;
11. documentation generated status matches the deterministic renderer;
12. obsolete pre-implementation status cannot coexist with the implemented helper;
13. no runtime release bytes change because of E15 maintenance.

The full Usage Dashboard registry remains the final local regression authority.

## 9. Live evidence

Live release evidence belongs in #869 and durable release requests rather than being duplicated here as mutable snapshots.

The important observed properties are stable:

- explicit scope classification can succeed on first write;
- one durable request and one deterministic PR survive restage;
- locator-only prose remains valid as candidate/main identities move;
- E9 exact-SHA, E11 fresh drift guard, expected-head merge, and exact-byte promotion keep their own authority;
- physical verification remains separate from repository release authority.

## 10. Non-goals

E15 does not:

- create `release_generation: E15`;
- create E16;
- auto-merge `main`;
- add PR-body synchronization;
- scan unlabeled release-like issues;
- infer ownership from linked issues;
- add polling, queues, or schedules;
- add an autonomous documentation writer;
- replace E9 exact-SHA validation;
- replace E11 merge guard;
- replace E14 ancestry;
- replace E13 durable recovery;
- change Product/Plugin/Engine/Manager/bootstrap runtime behavior.

## 11. Maintenance rule

E15 maintenance is byte-neutral unless a separate product change independently requires a product release.

The next real Local Usage Dashboard product release after maintenance acts as live proof. Maintenance itself does not reserve a product version and does not authorize production promotion.

## 12. Final architecture

```text
explicit scope once
+ canonical stable PR locators once
+ deterministic generated documentation status
+ fail-closed parity checks
= less manual recovery and less synchronization
```

The intended E15 automation is intentionally boring: generate stable facts once, verify them deterministically, and keep mutable authority in the systems that already own it.

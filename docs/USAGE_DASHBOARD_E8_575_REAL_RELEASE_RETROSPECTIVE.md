# Local Usage Dashboard — E8 / 5.75 Real-Release Retrospective

Status: **FEEDBACK COMPLETE — E8 repository/CI/deployment proof complete; E9 is the next generation design slot**

Recorded: `2026-08-25`

Authorities:
- E8 design: Issue `#312`
- E8 runbook: `docs/USAGE_DASHBOARD_PR_LIFECYCLE_E8_EARLY_FAILURE_HARDENING.md`
- 5.75 live proof: `docs/USAGE_DASHBOARD_575_E8F_LIVE_PROOF.md`
- 5.75 tracking: Issue `#340`
- Release PR: `#351`

This retrospective evaluates the E8 release-control system, not the 5.75 product feature itself. Physical PocketRisu verification is a separate product boundary and remains whatever the 5.75 release record says; no device result is inferred here.

## Generation rule

The established E-series rule remains binding:

```text
complete E(n)
→ use it on a real update / operation
→ retrospective / feedback
→ next design is E(n+1)
```

Therefore this feedback closes E8 as a generation. There is no normal `E8.1` hardening generation. The next release-system design is E9.

---

## 1. Overall verdict

E8 succeeded strongly at **production safety and exact authority**, and only partially at **coordination-friction removal**.

The important distinction is:

```text
Safety objective: PROVEN
Operational-friction objective: PARTIAL
```

5.75 reached production only after exact-SHA full-registry GREEN, expected-head merge, monotonic exact-byte promotion and an independent deployment receipt. Multiple defects and orchestration failures were stopped before production rather than hidden or guessed around.

The system therefore behaved correctly under failure. The remaining E9 work is mostly about making the correct path shorter, more deterministic and less dependent on GitHub event delivery quirks.

---

## 2. What E8 proved well

### A. Pre-candidate failure moved real defects earlier

E8-B was valuable in a real release, not just in maintenance CI.

5.75 exposed stale release-memory / regression assumptions before production, and stage remained fail-closed. P38's stale 5.74 assumption was not rewritten to pretend the current version was 5.75; it was repaired into the correct forward-lineage rule.

This validates the E8 principle:

> Cheap deterministic release-memory failures should happen before candidate authority is granted.

### B. Exact-SHA validation remained the real merge authority

The full authoritative registry caught release debts that stage smoke did not:

- P35 still referenced the deleted module-18 source owner;
- P38 still encoded an obsolete exact-current-release assumption;
- P39 locked the new module-16 ownership/boundary semantics.

The final exact-SHA run reached:

```text
P35 GREEN
P38 GREEN
P39 GREEN
TEST_REGISTRY_GREEN:83
```

and only that validated candidate SHA was merged.

### C. E8-E ref ownership held under pressure

The connected control surface could not submit the original slash-command trigger through the connector security layer. The safe response was **not** to create or advance `stage/usage-dashboard-*` or `release-usage-dashboard` directly.

Candidate refs remained trusted-stage-writer owned and production remained trusted-promoter owned. The release therefore preserved the ref-mutation boundary even when the normal trigger surface was unavailable.

### D. Failures remained observable and production stayed unchanged

The first real stage failed on deleted-path source-policy drift before candidate mutation. Subsequent materialization/test failures likewise did not mutate production.

This is a major success condition: RED meant evidence and repair, not partial release state.

### E. Promotion remained exact-byte and monotonic

PR `#351` merged the validated candidate with expected-head protection. Promotion run `32822577653` copied exact tested Git blobs instead of rebuilding production.

Final production:

```text
Product: 3.0.0-alpha.5.75
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
Production SHA: ffa3dae31bad70ca68059fbc085d63b9a2d862ca
Exact-byte parity: VERIFIED
```

The strongest E1-E8 identity/byte guarantees therefore survived the full 5.75 failure-and-repair cycle.

---

## 3. Friction E8 did not remove

### A. Trigger authority is still too event-delivery dependent

The original connected slash-command mutation was rejected before GitHub accepted the comment. An owner-authored issue-open trigger was then added, but the first `issues.opened` request did not converge to stage execution. A trusted-main self-healer was required to discover the request and dispatch the existing writer.

The authority model stayed safe, but activation was more complicated than the intended one-action release path.

**Feedback:** a release request should be a durable transaction object, while event delivery should be only one wake-up mechanism. Correctness must not depend on one webhook-style event arriving exactly once.

### B. Direct trigger + self-heal can race or duplicate work

During 5.75, direct stage activation and the scheduled/trusted-main consumer could both observe the same open request. The final successful request was explicitly closed after direct success to prevent a later self-heal from producing an unnecessary duplicate stage commit.

**Feedback:** request consumption needs an idempotent claim/ack protocol. The system should be able to see the same request many times and still produce at most one semantic stage transaction for the same exact request identity.

A useful future identity is conceptually:

```text
request key = target product version + exact source branch + exact source SHA
```

Repeated delivery of the same key should converge to the same result, not create coordination noise.

### C. E8-D normalized authority, but did not eliminate `action_required` noise

E8 correctly declared ordinary `pull_request` CI non-authoritative for deterministic stage PRs. However a controller-authored candidate-head update still produced an `action_required` / no-job activation anomaly during 5.75, and the PR had to be owner-reactivated for defense-in-depth CI.

Exact-SHA authoritative validation remained usable and production safety was not weakened, but the operational goal of eliminating close/reopen/reactivation choreography was not fully achieved.

**Feedback:** E9 should stop treating ordinary stage-PR event activation as a meaningful release milestone. Either:

- deterministic stage PRs should have a fully trusted explicit validation/status path with no need to wake ordinary PR CI; or
- ordinary PR CI should become purely optional observability and never cause operator choreography.

The authoritative exact-SHA full registry must remain mandatory.

### D. "Continuous hygiene exists" is weaker than "this exact source SHA is ready"

E8-C registered historical-literal hygiene in ordinary regression, but 5.75 still reached stage with stale P38 release assumptions. The check existed; what was missing was a durable proof that the **exact source SHA being staged** had already passed the relevant pre-stage readiness suite.

**Feedback:** E9 should introduce exact-source readiness rather than relying on the mere existence of continuous tests.

Conceptually:

```text
SOURCE_SHA_READY
= exact source SHA
+ source-policy check
+ historical-literal hygiene
+ cheap ownership/static regressions relevant to touched/deleted paths
```

Stage may repeat those checks as defense in depth, but should not be the first time the exact source SHA proves them.

### E. Source-change semantics were incomplete for deletion

The first 5.75 stage exposed that `ACMRT` source discovery omitted deleted paths. Module 18 was legitimately deleted, but source-policy reconstruction treated the patch and allowlist inconsistently.

The repair added `D` and a real deletion fixture, but the broader lesson is more important.

**Feedback:** source change semantics should be centralized in one canonical helper and reused by stage classification, allowlisting, smoke selection and contracts. Add/modify/delete/rename/type-change semantics should not be independently reimplemented in shell snippets.

### F. Cheap ownership drift still reached post-candidate full validation

P35's direct read of deleted module 18 and the module-16 boundary marker mismatch were deterministic structural debts. Exact-SHA validation correctly caught them, but they were cheap enough that candidate churn was unnecessary.

**Feedback:** without weakening the full registry, E9 should consider a small impact-aware pre-candidate static/ownership suite for touched or deleted module boundaries.

This should remain narrow. E9 must not copy the entire 83-test full registry into stage.

### G. Durable status closure lagged behind the real release

After 5.75 production deployment, E8's older design/runbook state still said E8-F was pending until closure work updated the evidence trail. The live release itself was complete before all generation-status documents caught up.

**Feedback:** repository closure should have one current-generation status authority and an idempotent closure update derived from deployment evidence. A successful production receipt should make stale `PENDING` generation state easy to detect automatically.

---

## 4. What must not be weakened in E9

E9 is not permission to simplify away the guarantees that worked.

Keep unchanged unless new evidence proves otherwise:

- source-of-intent branches;
- generated-output denial on source branches;
- controller-owned deterministic candidate refs;
- no connected-control candidate/production ref mutation;
- read-only materialization without repository write credentials;
- CAS / fast-forward / postverify candidate writes;
- no force push;
- exact-SHA complete registered validation as merge authority;
- expected-head merge protection;
- classifier + monotonic guard;
- exact-byte production promotion with no rebuild;
- automatic deployment receipt;
- UNKNOWN/data/privacy/source-truth semantics;
- physical-device verification separate from repository closure.

---

## 5. E9 design inputs — not yet the E9 design

This retrospective does **not** implement or fully design E9. It hands the following ordered evidence into the next design pass.

### P0 — Durable idempotent release-request transaction

One request identity, claim/ack/complete semantics, duplicate delivery harmless, direct event and self-heal unable to create duplicate semantic stage work.

### P1 — Exact source-SHA readiness authority

Prove the exact source SHA has passed historical hygiene, source-policy semantics and selected cheap static ownership checks before stage authority.

### P2 — Deterministic stage PR activation simplification

Remove operational dependence on ordinary `pull_request` event activation for controller-owned stage heads. Exact-SHA full validation stays authoritative; no close/reopen choreography should be necessary even for defense-in-depth signaling.

### P3 — Canonical source-change semantic resolver

One implementation for add/modify/delete/rename/type-change discovery, classification and allowlisting, with real Git fixtures.

### P4 — Impact-aware cheap structural gate

Move only deterministic low-cost ownership/boundary checks that are directly implied by touched/deleted module paths before candidate write. Do not duplicate the full registry.

### P5 — Idempotent generation-status closure

Deployment receipt + exact production evidence should drive or validate current-generation closure so stale `PENDING` state cannot silently remain after successful release.

---

## 6. Final E8 verdict

E8 did the most important thing correctly: it let a messy real release fail repeatedly **without letting uncertainty reach production**.

Its remaining weakness is not safety. It is orchestration state and event dependence.

The design principle carried into E9 should therefore be:

> **Make release requests and exact source readiness durable and idempotent; treat GitHub events as wake-ups, not authority; preserve exact-SHA and exact-byte release guarantees.**

Generation state after this retrospective:

```text
E8: COMPLETE / REAL-RELEASE FEEDBACK COMPLETE
E9: NEXT DESIGN SLOT / NOT YET DESIGNED
```

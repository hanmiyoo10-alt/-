# Local Usage Dashboard E-System Feedback Criteria

Date established: 2026-09-08

Scope: `plugins/usage-dashboard/` release-control / E-system feedback.

This document defines the reusable criteria for future E-system feedback. It is evaluation policy only. It does not create a new E-generation, release authority, Product version, workflow stage, deployment authority, or physical-acceptance authority.

## 1. Core rule

Every E-system feedback pass should answer one question:

> Did the system become safer, more automatic, and simpler without losing correctness, diagnosability, determinism, recoverability, or scalability?

The user's operating boundary remains a hard constraint rather than a scored category:

```text
user = normal PocketRisu `+` update + real-device verification only when genuinely required
assistant/system = source analysis + design + implementation + regression + PR/CI + merge + deployment + repository receipts
```

A change that pushes ordinary development/release commands back to the user is a regression even if other criteria improve.

## 2. Eight evaluation axes

### A. Stability / Safety

Question: **Can a bad or incomplete transaction reach production, corrupt state, or break a previously working path?**

Check:
- fail-closed behavior;
- no partial production writes on failure;
- old working Product/runtime behavior preserved;
- merge/promotion only after required gates;
- deployment never implies physical acceptance;
- UNKNOWN/PENDING/ambiguous evidence never becomes synthetic success;
- minimal blast radius.

Desired direction: fewer unsafe transition paths and fewer ways to bypass gates.

### B. Automation

Question: **How much ordinary human reconstruction, command execution, or handoff remains?**

Check:
- source-to-candidate automation;
- CI and exact-head validation;
- PR lifecycle automation;
- merge/promotion automation where authority allows;
- releaseEvidence/source-authoring automation;
- durable receipt generation;
- no manual copying of SHA/issue/comment/version tuples when deterministic derivation exists.

Desired direction: user involvement approaches only `+` update and real-device observation.

### C. Simplification

Question: **Did the system remove concepts, duplicated state, stages, special cases, or independent owners?**

Check:
- fewer duplicated literals and selectors;
- reuse existing authority instead of creating parallel authority;
- no unnecessary workflow/stage/scheduler;
- fewer release-specific branches in shared control logic;
- smaller and clearer contracts;
- deletion or consolidation where safe.

Important: fewer lines alone is not simplification. Moving complexity into hidden coupling does not count.

Desired direction: one responsibility has one clear owner and one obvious path.

### D. Correctness / Authority Integrity

Question: **Does every decision come from the correct source of truth, with no invented or stale facts?**

Check:
- canonical evidence only;
- authority hierarchy preserved;
- no stale accepted-baseline identity;
- no guessed zero/default for unknown data;
- exact Product/SHA/issue/comment identity where required;
- read-only evidence transport does not become a second truth selector;
- physical truth remains human/real-device authority where required.

Desired direction: the system may say `unknown`, `pending`, or reject, but must not confidently invent truth.

### E. Diagnosability / Observability

Question: **When a gate fails, can the actionable failure class be identified quickly without unsafe data leakage?**

Check:
- bounded machine-readable reason code;
- durable receipt identifies the failed stage/class;
- enough linkage to exact run/head/transaction;
- no need to inspect unrelated logs to know the first useful failure class;
- raw stderr, tokens, org IDs, auth/session values, and secrets are not projected into durable public receipts;
- success receipts are similarly attributable.

Desired direction: failures become precise without turning logs into a data-exfiltration surface.

### F. Determinism / Reproducibility

Question: **Do the same authoritative inputs produce the same candidate and the same release result?**

Check:
- immutable source intent;
- frozen main/base identity;
- deterministic materialization;
- exact-head validation;
- retry after an unchanged input yields the same result;
- exact-byte parity between materialized candidate/main/production where required;
- no hidden wall-clock/random/cache dependency in authority decisions.

Desired direction: a release can be reconstructed and independently verified from repository evidence.

### G. Recoverability / Retry Safety

Question: **If a step fails, can the system resume or retry without cleanup hazards, double-writes, or authority confusion?**

Check:
- failure before writer means no partial candidate/production mutation;
- retry is idempotent or explicitly monotonic;
- stale heads are rejected rather than overwritten silently;
- a repair can restart from a clear checkpoint;
- rollback/recovery does not require ad-hoc state surgery;
- receipts distinguish failed attempts from accepted/deployed state.

Desired direction: failure should cost time, not integrity.

### H. Scalability / Efficiency

Question: **Will the same authority model remain practical as release history, evidence, tests, and plugins grow?**

Check:
- API call and enumeration growth;
- workflow latency;
- repeated full-history scans;
- artifact/log size;
- test/runtime cost;
- bounded retries/fanout;
- optimization does not introduce stale caches or second authority stores.

Desired direction: optimize transport and computation before weakening correctness or completeness.

## 3. Feedback output format

Every future E-system feedback report should include a compact scorecard:

```text
Stability / Safety              PASS | PARTIAL | REGRESSION | WATCH
Automation                      PASS | PARTIAL | REGRESSION | WATCH
Simplification                  PASS | PARTIAL | REGRESSION | WATCH
Correctness / Authority         PASS | PARTIAL | REGRESSION | WATCH
Diagnosability / Observability  PASS | PARTIAL | REGRESSION | WATCH
Determinism / Reproducibility   PASS | PARTIAL | REGRESSION | WATCH
Recoverability / Retry Safety   PASS | PARTIAL | REGRESSION | WATCH
Scalability / Efficiency        PASS | PARTIAL | REGRESSION | WATCH
User intervention boundary      PASS | REGRESSION
```

Meanings:
- `PASS`: current evidence shows the axis is satisfied for the evaluated slice;
- `PARTIAL`: works, but an identified seam remains open;
- `REGRESSION`: worse than the accepted baseline or violates a hard invariant;
- `WATCH`: not currently defective, but measured evidence shows a future pressure point.

Avoid fake numeric scoring. A `7.8/10` can hide a severe authority regression behind unrelated strengths. The categorical scorecard keeps blockers visible.

## 4. Priority order when criteria conflict

When one improvement hurts another, use this order:

```text
1. Stability / Safety
2. Correctness / Authority Integrity
3. Recoverability / Retry Safety
4. Determinism / Reproducibility
5. Automation
6. Simplification
7. Diagnosability / Observability
8. Scalability / Efficiency
```

This ordering does not mean diagnostics or scalability are unimportant. It means we do not trade release truth or production safety for speed or convenience.

Examples:
- Do not cache "latest accepted" persistently merely to make E24 faster.
- Do not auto-accept physical verification merely to increase automation.
- Do not delete a validation gate merely to make the workflow shorter.
- Do improve a broad failure reason into a bounded safe reason code because that raises diagnosability without weakening authority.

## 5. Simplification test

For every proposed E-system change, ask these four deletion-oriented questions before adding machinery:

1. Can an existing E owner do this instead of adding a new owner?
2. Can an existing receipt/contract carry the data instead of adding persistent state?
3. Can duplicated release-specific logic be removed instead of generalized into another framework?
4. Can the failure be detected earlier with an existing gate instead of adding a later gate?

A new E-number should be earned by a real control-plane responsibility boundary, not by the mere existence of another patch.

## 6. Automatic feedback trigger

Future E-system feedback should be especially valuable after:
- the first real Product release through a newly changed E path;
- a fail-closed event that blocks a real release defect;
- a manual repair or intervention that automation should eventually eliminate;
- a repeated slow/expensive enumeration or CI path;
- an incident where the durable receipt was less actionable than the underlying log;
- a control-plane maintenance change that claims to simplify authority.

The feedback should distinguish:

```text
proven by real transaction
proven only by regression test
historical fixture
future design hypothesis
```

Do not promote a hypothesis to a proven capability merely because the design intends it.

## 7. Current shorthand

The short version to use in conversation is:

```text
안정성 + 자동화 + 단순화
+ 정확성 + 진단성 + 재현성 + 복구성 + 확장성
```

And one hard rule under all eight:

```text
사용자는 + 업데이트와 필요한 실기 확인만.
```

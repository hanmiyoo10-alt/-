# Shared Plugin System Feedback Standard

Date established: 2026-09-08

Scope: all local plugin development/release systems in this repository, including but not limited to `plugins/usage-dashboard/`.

This is evaluation policy for the lifecycle after a plugin change is designed, implemented, validated, merged, deployed, and, where genuinely required, verified on a real device. It does not create a release authority, workflow stage, deployment authority, physical-acceptance authority, or plugin-specific versioning rule.

## 1. Canonical question

Every post-implementation / post-update / post-deployment feedback pass asks:

> Did this plugin delivery system become safer, more automatic, and simpler without losing correctness, diagnosability, reproducibility, recoverability, or scalability?

The shared eight axes are:

```text
Stability / Safety
Automation
Simplification
Correctness / Authority Integrity
Diagnosability / Observability
Determinism / Reproducibility
Recoverability / Retry Safety
Scalability / Efficiency
```

The user boundary is a hard invariant, not a score:

```text
user = normal plugin update action + real-device verification only when genuinely required
assistant/system = source analysis + design + implementation + regression + PR/CI + merge + deployment + repository receipts
```

A system that shifts ordinary development, build, test, PR, merge, deployment, or recovery commands back to the user is a regression even if another axis improves.

## 2. Shared lifecycle under review

The rubric applies to the whole delivery chain, regardless of the plugin's exact implementation:

```text
current production/read-back
-> design authority
-> source intent
-> implementation/materialization
-> regression
-> PR/CI
-> merge
-> production promotion/update
-> deployment evidence
-> real-device verification when required
-> accepted baseline / closure
-> feedback
```

A plugin may use different workflow names, branches, artifacts, receipts, or physical-verification rules. Those differences belong in the plugin profile, not in a forked evaluation rubric.

## 3. Eight evaluation axes

### A. Stability / Safety

Question: Can a bad, incomplete, stale, or ambiguous transaction reach production, corrupt state, or break a previously working path?

Check:
- fail-closed behavior;
- no partial production writes on failure;
- accepted baseline remains safe during failed updates;
- merge/deploy only after required gates;
- deployment is not silently promoted to real-world acceptance;
- unknown/pending/ambiguous evidence is not fabricated into success;
- minimal blast radius and preservation of already-working features.

### B. Automation

Question: How much ordinary human reconstruction, command execution, or handoff remains?

Check:
- source-to-candidate/build automation;
- validation and exact-identity checks;
- PR lifecycle automation;
- merge/deploy automation where authority allows;
- generated receipts and release metadata;
- removal of manual SHA/version/issue/comment/artifact copying when derivation exists;
- user involvement approaches only ordinary update plus necessary physical observation.

### C. Simplification

Question: Did the system remove duplicated state, parallel authority, workflow stages, special cases, or unnecessary owners?

Check:
- one responsibility has one clear owner;
- shared infrastructure is reused rather than cloned per plugin;
- duplicated literals/selectors are removed;
- no unnecessary scheduler, cache, DB, side channel, or extra workflow;
- release-specific glue shrinks when a shared primitive already exists;
- deletion/consolidation is preferred over another abstraction layer.

Fewer lines alone do not prove simplification. Hidden coupling and generic-framework inflation count as complexity.

### D. Correctness / Authority Integrity

Question: Does every decision come from the plugin's canonical source of truth without guessed or stale facts?

Check:
- exact artifact/version/commit identity where required;
- no invented default for unknown data;
- authority hierarchy is explicit and preserved;
- transport/read-only collection does not become a second truth selector;
- physical truth remains real-world authority where the plugin requires it;
- historical fixtures are not mistaken for current production truth.

### E. Diagnosability / Observability

Question: When a gate fails or succeeds, can the useful class and exact transaction be identified quickly without leaking unsafe data?

Check:
- bounded machine-readable reason codes;
- durable receipts identify stage/class/run/head or equivalent identity;
- first actionable failure does not require archaeology through unrelated logs;
- success is attributable too;
- secrets, tokens, raw auth/session values, private IDs, and uncontrolled stderr are not copied into durable/public receipts.

### F. Determinism / Reproducibility

Question: Do the same authoritative inputs produce the same candidate/build/release result?

Check:
- immutable/frozen source intent where applicable;
- deterministic build/materialization;
- exact-head or equivalent immutable validation;
- retry with unchanged inputs yields the same result;
- exact-byte or equivalent artifact parity where appropriate;
- no hidden wall-clock, random, mutable cache, or ambient-state authority dependency.

### G. Recoverability / Retry Safety

Question: If a step fails, can the system repair and retry without manual state surgery, double-writes, or authority confusion?

Check:
- failed attempts do not masquerade as deployed/accepted state;
- stale heads/versions are rejected rather than silently overwritten;
- retries are idempotent or explicitly monotonic;
- repair resumes from a clear checkpoint;
- previous production remains a valid fallback until the new release is proven;
- rollback/recovery behavior is documented by repository evidence.

### H. Scalability / Efficiency

Question: Will the same authority model remain practical as releases, plugins, tests, evidence, and history grow?

Check:
- API/enumeration growth;
- workflow latency and repeated scans;
- artifact/log/test size;
- fanout and retry bounds;
- duplicated per-plugin infrastructure;
- optimization does not weaken completeness or introduce stale second-authority stores.

Optimize transport and computation before weakening correctness.

## 4. Cross-plugin portability check

Portability/reusability is intentionally not a ninth score axis. It is a cross-check spanning Automation, Simplification, and Scalability.

For each feedback pass ask:

```text
Is this capability truly plugin-specific?
If not, can a shared primitive own it?
Would generalizing it remove duplicated owners, or merely build another framework?
Can another plugin adopt it without copying release authority or plugin-specific truth rules?
```

A shared primitive is good when it reduces duplicate machinery while keeping each plugin's production and acceptance authority explicit. Do not force all plugins into identical mechanics merely to claim reuse.

## 5. Required plugin profile

Each plugin that uses this standard should have a small profile identifying only its plugin-specific evidence map:

```text
plugin root
production branch/ref or deployed artifact owner
version/artifact identity
canonical design authority
candidate/build authority
required CI/gates
merge authority
promotion/deployment authority
physical verification rule, if any
accepted-baseline authority
unknown/not-applicable semantics that must not be fabricated
```

The profile answers "where is the truth for this plugin?" The shared rubric answers "is the delivery system good?"

Do not duplicate the eight-axis definitions inside every profile.

## 6. Feedback result format

Every plugin-system feedback report should emit:

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
Cross-plugin portability        NOTE / OPPORTUNITY / NOT-APPLICABLE
```

Meanings:
- `PASS`: current evidence proves the evaluated slice satisfies the axis;
- `PARTIAL`: works but a concrete seam remains open;
- `REGRESSION`: worse than the accepted baseline or violates a hard invariant;
- `WATCH`: not currently defective, but measured evidence shows future pressure;
- portability is descriptive rather than scored so reuse pressure cannot override plugin correctness.

Do not use an averaged numeric score. A severe safety or authority regression must remain visible.

## 7. Conflict priority

When criteria conflict, use:

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

Cross-plugin reuse never outranks plugin correctness or safety.

## 8. Deletion-first test

Before adding shared machinery, ask:

1. Can an existing owner do this?
2. Can an existing receipt/contract carry it without persistent state?
3. Can duplicated per-plugin logic simply be deleted after moving one narrow primitive to shared infrastructure?
4. Can an existing earlier gate detect the failure instead of adding a later gate?
5. Does the proposed abstraction have at least two real plugin consumers or a clearly demonstrated common lifecycle responsibility?

Do not create a shared framework merely because two files look similar.

## 9. Feedback trigger

Run this feedback especially after:
- the first real release through a new/changed delivery path;
- a fail-closed event blocking a real defect;
- any manual intervention that should eventually disappear;
- a repeated slow or expensive CI/evidence path;
- a release where durable diagnostics were weaker than the underlying log;
- a control-plane change claiming automation or simplification;
- adoption of a shared primitive by a second plugin;
- an incident where plugin-specific truth was accidentally generalized.

Every report distinguishes:

```text
proven by real transaction
proven only by regression test
historical evidence
future hypothesis
```

## 10. Adoption

`plugins/usage-dashboard/` is the first profile and historical seed for this standard. Its existing Usage Dashboard E-system criteria remain useful as plugin-specific context, but future cross-plugin policy is owned by this shared document.

Other plugin systems should adopt the same eight axes and add only their own evidence profile. They do not need to copy Usage Dashboard's E-numbering, branch names, releaseEvidence model, physical-acceptance model, or exact workflow topology.

Conversation shorthand:

```text
안정성 + 자동화 + 단순화
+ 정확성 + 진단성 + 재현성 + 복구성 + 확장성
```

Hard rule beneath all of them:

```text
사용자는 일반 업데이트와 꼭 필요한 실기 확인만.
```

# Local Usage Dashboard E-System — 5.106 Live Release Feedback

Date: 2026-09-08

Scope: `plugins/usage-dashboard/` release-control feedback derived from the real 5.106 release transaction. This is a docs-only assessment. It does not change Product, Plugin, Engine, Manager, bootstrap, runtime, release specs, `main` product bytes, or `release-usage-dashboard` product bytes.

## 1. Executive verdict

The E-system is now strong at **preventing unsafe release state transitions**. The 5.106 transaction gave a useful negative-path proof before the final successful release:

```text
wrong materializer self-check
-> E24 evidence capture GREEN
-> generic release preflight GREEN
-> materializer fails
-> candidate writer does not run
-> production does not move
-> source is minimally repaired
-> same canonical stage path is retried
-> deterministic candidate is produced
-> exact-head registry is GREEN
-> expected-head merge succeeds
-> monotonic exact-byte promotion succeeds
-> physical acceptance remains PENDING
```

That is the intended release-control shape.

The primary weakness exposed by 5.106 is **diagnostic projection**, not safety. The durable E7 rejection receipt reported only the broad class `E7_MATERIALIZE_OR_SMOKE_FAILED`, while the actionable failure was available only inside the materialize job log:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

Therefore the current verdict is:

```text
immutable source intent / frozen-main binding        PASS
E24 release-evidence collection                     PASS
E24/E23 accepted-baseline authority                 PASS
E24 source-authoring closure in a new release       PASS
pre-materialization generic preflight               PASS
fail-closed candidate writer separation             PASS
deterministic retry after source repair             PASS
E9 durable release request / exact candidate        PASS
exact-head full registry                            PASS
fresh-main + expected-head merge                    PASS
monotonic exact-byte promotion                      PASS
deployment != physical acceptance                   PASS
actionable stage-failure projection                 PARTIAL
E24 raw evidence transport cost                     WATCH
PR ensure + durable pr_number orchestration         ASSISTANT-OWNED / PARTIAL AUTOMATION
```

The next maintenance priority should be **failure precision without weakening any gate**.

## 2. Canonical 5.106 evidence

### Release authority

- feature issue: `#1874` — `usage-dashboard: 5.106 Credits endpoint RPM limits`;
- design PR: `#1875`;
- source branch: `release/usage-dashboard-5106-credits-endpoint-rpm`;
- final source SHA: `e11e5a5c59e695d561420c07cd2dd58425a5ef1e`;
- successful E7 transaction: `34182220278`;
- candidate branch: `stage/usage-dashboard-3.0.0-alpha.5.106`;
- deterministic candidate SHA: `a3576182f70de2a222bfe423ac1f689f71a7087d`;
- durable release request: `#1877`;
- release PR: `#1878`;
- main merge SHA: `c5d39f88227c2920638b99a95329c8669ed8e2cb`;
- production SHA: `release-usage-dashboard@77cf4524d230a907ab90c89ac7fd25e1f96a48f9`.

### Deployed product identity

- Product `3.0.0-alpha.5.106`;
- Engine `1.6.40`;
- Manager `1.3.6`;
- CLI `1.10.0`;
- Models `1.280.0`;
- contracts `1/1`;
- Engine SHA-256 `2c44fbc01771dbdedab2bc407a090699a523feb3c0056f5b646fa773e457a427`;
- deployment receipt: PR `#1878` comment `5578526094`;
- exact-byte parity: `VERIFIED`;
- physical verification: `PENDING` at this feedback checkpoint.

No part of this feedback treats deployment as physical acceptance.

## 3. Negative-path proof: first 5.106 stage

The first 5.106 source attempt used source SHA:

```text
ba1954a5cecbaed3c8272447ee01a67e30325b58
```

E7 transaction:

```text
34181692223
```

Materialize job:

```text
101921934683
```

Observed stage behavior:

1. `resolve_stage` succeeded;
2. E24 transaction-local evidence capture succeeded;
3. E24 captured 19 canonical durable release requests;
4. `RELEASE_PREFLIGHT_E24_GREEN:3.0.0-alpha.5.106`;
5. `RELEASE_PREFLIGHT_GREEN:3.0.0-alpha.5.106`;
6. product/engine build checks proceeded;
7. the release-specific materializer self-check failed;
8. `write_candidate` was skipped;
9. `receipt_ready` was skipped;
10. failure receipt was posted;
11. production remained 5.105.

The exact actionable error was:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

The implementation itself used the fail-closed expression:

```text
endpointUnknown('invalid-endpoints')
```

The materializer self-check incorrectly expected a different source representation. This was a source/test assertion mismatch rather than incorrect Product truth behavior.

Verdict: **the system rejected an internally inconsistent source transaction before candidate publication**.

## 4. Minimal repair and deterministic retry

The source repair changed only the materializer self-check markers so they matched the actual implementation expression. Product semantics were not weakened and no production bytes were directly edited.

Final source SHA:

```text
e11e5a5c59e695d561420c07cd2dd58425a5ef1e
```

The source transaction remained bounded to the same three source-intent files:

1. `.github/usage-dashboard/releases/5.106.json`;
2. `plugins/usage-dashboard/tools/release_credits_endpoint_rpm_5106.py`;
3. `plugins/usage-dashboard/tests/p72-credits-endpoint-rpm-limits.cjs`.

The retry used the same canonical E7 command path and produced:

```text
transaction: 34182220278
candidate: a3576182f70de2a222bfe423ac1f689f71a7087d
smoke: GREEN
```

All materialization/write/ready jobs completed successfully.

Verdict: **deterministic retry and minimal repair behavior PASS**.

## 5. E24 authoring closure proved in real release traffic

The prior E24 feedback found that E24 could derive and validate accepted-baseline authority but release-specific authoring still duplicated baseline Product/SHA/issue/comment tuples.

That authoring seam was subsequently closed by the E24 Authoring Closure maintenance slice.

5.106 is the first new Product release that materially proves the improved boundary:

- `5.106.json` carries the E20-shaped accepted baseline for 5.105;
- the authoritative tuple resolves to Product `3.0.0-alpha.5.105`, production SHA `0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c`, durable request `#1869`, physical acceptance comment `5578155765`;
- generic E24 preflight independently re-derived and accepted that authority;
- the 5.106 release-specific materializer does **not** own or hard-code the accepted release SHA/comment authority as a second truth selector;
- P72 explicitly protects that boundary.

Verdict: **E24 source-authoring closure PASS in a real forward release**.

## 6. E7 fail-closed writer separation is doing the right job

The most important safety property of the first failed transaction is what did *not* happen.

After `materialize_stage` failed:

```text
write_candidate = skipped
receipt_ready = skipped
```

The writer job requires materialization success, so a failing untrusted/source-derived candidate never receives write credentials.

This is stronger evidence than a static permission review because the negative path was exercised by a real release attempt.

Verdict: **PASS**.

Do not collapse materializer and writer into one credentialed job merely to simplify workflow structure.

## 7. Primary gap: durable failure diagnostics are too coarse

The materialize step currently initializes:

```text
FAILURE_REASON='E7_MATERIALIZE_OR_SMOKE_FAILED'
```

and only overrides it for a small subset of known classes, such as release preflight or E18 unknown impact.

As a result, the durable queue receipt for the first 5.106 failure was broadly equivalent to:

```text
UD_STAGE_REJECTED
reason: E7_MATERIALIZE_OR_SMOKE_FAILED
```

while the operator-useful cause was buried in the Actions log:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

This does not weaken safety, but it increases diagnosis work and encourages log spelunking.

### Recommended follow-up contract

A future byte-neutral control-plane maintenance slice should preserve the current `failure_reason` output boundary and add **stable bounded failure phases/codes**, for example:

```text
E7_SOURCE_INTENT_APPLY_FAILED
E7_RELEASE_PREFLIGHT_REJECTED
E7_MATERIALIZER_COMPILE_FAILED
E7_MATERIALIZER_EXEC_FAILED
E7_RECONCILE_FAILED
E7_SYNTAX_CHECK_FAILED
E7_GUIDELINE_SYNC_FAILED
E18_RUNTIME_IMPACT_REJECTED
E7_BEHAVIOR_SMOKE_FAILED
E7_TEST_TREE_MUTATED
E7_DERIVED_VERIFY_FAILED
E7_BUNDLE_BUILD_FAILED
```

The durable receipt may optionally include one sanitized bounded diagnostic token/line when it is generated by trusted release tooling.

It must **not** forward arbitrary raw stderr, response bodies, tokens, paths containing secrets, org IDs, auth/session material, or unbounded logs into issue comments.

Preferred shape:

```text
UD_STAGE_REJECTED
phase: materializer
reason: E7_MATERIALIZER_EXEC_FAILED
diagnostic: 5.106 endpoint normalizer marker missing:invalid-endpoints
transaction: <run>
```

The diagnostic is convenience only. The workflow conclusion remains authority.

## 8. Secondary watch: E24 evidence transport cost

The first failed 5.106 stage showed a live E24 transport cost rather than a theoretical one.

The raw evidence collector enumerated 19 durable release requests and spent roughly 38 seconds collecting complete repository evidence before materialization.

This remains acceptable for correctness-first release traffic and is **not a blocker**. Complete enumeration plus E22 truth selection is more important than shaving seconds.

However, the cost now has a real growth signal as release history expands.

Any future optimization must preserve:

```text
complete canonical evidence universe
-> raw transport only
-> E22 remains sole deployment/physical truth selector
-> E23 remains accepted-baseline handoff owner
-> no persistent latest-accepted authority cache
```

Potential optimization research may consider transport-only immutable caching or narrower canonical enumeration only if completeness can be mechanically proven. A cache/index must never become accepted-baseline authority.

Verdict: **WATCH, not immediate maintenance priority**.

## 9. Assistant-owned orchestration seam

After E7 published the deterministic candidate, E9 correctly emitted a `PR_REQUIRED` state. The assistant then:

1. created durable release request `#1877`;
2. created deterministic release PR `#1878`;
3. updated `#1877` with exact `pr_number: #1878`;
4. allowed exact-SHA validation to proceed.

From the user experience this already satisfies the project rule: the user did not run release commands or manage GitHub state.

From the control-plane perspective, PR ensure + durable request `pr_number` CAS remains an orchestration seam owned by the assistant rather than a fully reducer-owned transition.

Verdict: **acceptable / lower priority**.

Do not automate this merely for aesthetic completeness unless the unique-PR/CAS invariants can remain at least as strong as today.

## 10. Merge and promotion proof

Candidate exact-head CI on `a3576182f70de2a222bfe423ac1f689f71a7087d` completed GREEN, including:

- Usage Dashboard Candidate Validation;
- full Usage Dashboard registry;
- SimCore CI;
- Plugin Control Plane CI.

Fresh main remained the frozen base before merge, and PR `#1878` was mergeable with the exact candidate head.

Expected-head squash merge produced:

```text
main = c5d39f88227c2920638b99a95329c8669ed8e2cb
```

Automatic promotion then moved production monotonically:

```text
5.105 production: 0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c
5.106 production: 77cf4524d230a907ab90c89ac7fd25e1f96a48f9
```

The promotion receipt recorded `exact_byte_parity: VERIFIED`.

Direct read-back also found matching main/production artifact blob identities for `latest.js`, Engine, and Manager.

Verdict: **merge + monotonic promotion PASS**.

## 11. Physical truth boundary remained intact

The deployment receipt explicitly records:

```text
physical_verification: PENDING
```

5.106 therefore remains deployed but not yet physically accepted at this checkpoint.

This is the correct E22-style distinction. No CI, deployment receipt, exact-byte parity, or successful promotion may synthesize `ACCEPTED` physical truth.

Verdict: **PASS**.

## 12. Recommended next design

No Usage Dashboard `E25` authority document was found at this feedback checkpoint. If the next control-plane maintenance slice is authorized, the recommended working title is:

```text
E25 Stage Failure Precision
```

This is a **proposal only**, not frozen design authority.

Suggested scope:

1. keep existing E7 jobs and credential separation;
2. keep the same broad terminal failure fallback;
3. assign stable bounded failure codes before each major materialize phase;
4. project only sanitized trusted-tool diagnostics when safe;
5. test that each phase maps to the expected durable receipt;
6. test that arbitrary stderr/secrets never flow into issue comments;
7. preserve E24/E22/E23 authority ownership unchanged;
8. no Product/Engine/Manager/runtime/release version change;
9. no new workflow stage, scheduler, DB, accepted-baseline cache, or physical writer;
10. production must remain byte-identical after maintenance merge.

Keep E24 evidence transport scalability as a separate WATCH item so a small diagnostics improvement does not become a broad control-plane redesign.

## 13. Final assessment

The 5.106 release is a strong E-system result because it exercised both failure and success paths in one transaction family.

The system did not merely pass tests. It demonstrated:

```text
bad source assertion
-> rejected before candidate write
-> minimal source repair
-> deterministic restage
-> exact candidate validation
-> guarded merge
-> exact-byte production promotion
-> physical truth still pending
```

The safety architecture is doing its job.

The next improvement should make the system **easier to diagnose without making it easier to bypass**.

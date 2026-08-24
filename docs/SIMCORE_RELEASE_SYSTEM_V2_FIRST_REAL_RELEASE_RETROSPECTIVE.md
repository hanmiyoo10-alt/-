# SimCore Release System v2 — First Real Release Retrospective

Date: 2026-08-25
Status: **FEEDBACK RECORDED · NON-RUNTIME · NO PRODUCTION MUTATION**
Scope: first genuine R-driven SimCore release from v0.64.7 product preparation through durable `REAL_RELEASE_LIVE_PENDING` closure
Production during retrospective: `v0.64.7` / `a7ce8ce33a97797630f885c6753415e4b2ccc7fc` / blob `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0`

## 1. Purpose

This retrospective turns the first real R release into durable operational feedback.

The objective is not to criticize the number of safety gates. The objective is to distinguish:

```text
safety properties that proved valuable
from
operator steps that exist only because the current orchestration is fragmented
```

The long-term target remains:

> updates become easier because the safe process is encoded and reusable.

No runtime code, candidate identity, release spec, or `release-simcore` production ref is changed by this retrospective.

## 2. Executive conclusion

The first real R release proved two things at the same time.

### 2.1 Safety result — strong

R failed closed where it was supposed to fail closed.

Observed examples:

```text
candidate fixture coverage gap
→ candidate publication blocked

authorization JSON comparison false positive
→ permanent publication blocked before production mutation

post-publish gateway permission gap
→ production had already published, but recovery did not republish or rewrite production
```

The one production-after-publication failure was recovered from the original immutable publication handoff, while `release-simcore` remained fixed at the already-published candidate.

Therefore the core authority model held:

```text
candidate identity exact
C/P binding exact
Candidate Required preserved
single permanent publisher preserved
latest.js == install.js preserved
post-publish recovery did not become a second publisher
```

### 2.2 Operator result — too fragmented

From the initial v0.64.7 product/verifier preparation PR `#234` through final durable LIVE_PENDING cleanup PR `#260`, the first real R exercise required **18 SimCore PRs**.

Breakdown:

```text
product / candidate preparation: 6 PRs
#234 #236 #237 #238 #240 #241

authorization / invocation / pre-publish controller repair: 5 PRs
#242 #246 #247 #249 #250

post-publish recovery: 4 PRs
#251 #252 #255 #256

durable LIVE_PENDING documentation/admin closure: 3 PRs
#257 #258 #260
```

This count includes first-release learning and repair work and therefore must not be treated as the expected permanent release cost.

However, even after removing already-fixed first-release bugs, the current design still contains repeatable version-specific candidate orchestration and multi-step durable closure work. Those are legitimate R feedback items.

## 3. What worked and should be preserved

### 3.1 Exact production authority split

Preserve:

```text
release-simcore = runtime/deployment authority
main = design/evidence/release-state/admin authority
```

The incident did not require weakening this split.

### 3.2 Exact candidate and production-parent binding

The release remained bound to:

```text
P = 47969d24771f6cc188df6e32150fc6fde519182d
C = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
```

Retries did not silently regenerate or replace C.

### 3.3 Fail-closed permanent release controller

The first permanent run stopped before production mutation when authorization validation misclassified equivalent JSON serialization.

That false positive was repaired without weakening semantic authorization checks.

### 3.4 Publication and post-publish state remained separate authorities

When post-publish state failed after production had moved, recovery correctly treated production as already published upstream.

Recovery reconstructed only bounded main administrative state and never invoked `release-publish.mjs`.

### 3.5 Failure evidence became permanent protection

Observed failures were not silently retried.

They became permanent checks or durable recovery behavior, including:

```text
fixture coverage enforcement
authorization JSON semantic canonicalization
PR activation adapter restrictions
post-publish actions:write requirement
immutable publication-artifact recovery
trusted recovery boundary handling
self-test boundary correction
automated writer bot provenance
```

This is exactly the intended R feedback loop.

## 4. Feedback findings

### F1. Version-specific candidate orchestration is still too bespoke

Current v0.64.7 candidate preparation is encoded in version-specific surfaces including:

```text
.github/workflows/product-simcore-06407-candidate-prep.yml
.github/workflows/product-simcore-06407-candidate-prep-observable.yml
products/simcore/tooling/build-06407-reload-cache-continuity.py
```

The product-specific builder itself is acceptable when product semantics genuinely require it.

The problem is that release orchestration is also version-specific.

This caused:

```text
workflow-introduction trigger friction
candidate push observability uncertainty
activation-only PRs
one-shot observable workflow creation
retry ambiguity when the exact candidate ref already existed
```

Classification:

```text
R_CANDIDATE_ORCHESTRATION_VERSION_SPECIFIC
= FIX / R_FEEDBACK / OPERATOR_ERGONOMICS / NON_RUNTIME
```

Desired correction:

```text
permanent generic candidate-preparation controller
+ version/release request data
+ product-specific builder as injected implementation detail only when needed
```

The permanent controller should own:

```text
exact P binding
builder invocation
latest/install equality
configured permanent suites
candidate direct-child creation
candidate receipt
automation provenance
idempotent exact-existing behavior
```

### F2. Exact-existing candidate retry should be explicit NOOP/PASS

The retry discovered that the original candidate ref already existed at the exact expected C.

Current behavior reports this as failure even when identity is exact.

Classification:

```text
CANDIDATE_RETRY_EXACT_REF_ALREADY_EXISTS
= FIX / IDEMPOTENCY / R_FEEDBACK / NON_RUNTIME
```

Desired behavior:

```text
ref absent
→ create exact C

ref exists and head == exact expected C
→ NOOP / PASS / receipt says ALREADY_MATERIALIZED

ref exists and head != expected C
→ BLOCK / conflict
```

This converts a known failure class into deterministic idempotency without weakening candidate immutability.

### F3. Temporary v0.64.7 candidate workflows remain active after publication

Both v0.64.7 candidate-preparation workflows remain on `main` even though production is already v0.64.7 and candidate identity is durably preserved.

They hard-bind old production v0.64.6 identities and the already-existing v0.64.7 candidate ref.

The observable evidence already declared the observable workflow temporary and scheduled it for cleanup.

Classification:

```text
06407_CANDIDATE_ONE_SHOT_WORKFLOWS_STILL_ACTIVE
= FIX / CLEANUP / R_HARNESS / NON_RUNTIME
```

Impact:

```text
current production correctness: unaffected
current real-long-chat validation: not blocked
future SimCore work touching watched candidate-prep paths: avoidable workflow noise/failure risk
```

Required timing:

> remove the v0.64.7 one-shot candidate workflow surfaces in a separate non-runtime R cleanup before the next runtime release work item that could touch their trigger paths.

Do not mix this cleanup with product/runtime changes.

### F4. Candidate result observability should be permanent, not a one-off workaround

The first push-based candidate preparation completed in a way that was not immediately observable through the connected repository surface.

The solution was a temporary merged-PR observable workflow.

Classification:

```text
CANDIDATE_PREPARATION_OBSERVABILITY_NOT_PERMANENT
= FIX / R_FEEDBACK / OBSERVABILITY / NON_RUNTIME
```

The generic candidate controller should be PR-associated or otherwise emit a durable receipt that can be resolved through the normal connected repository surface.

A candidate transaction should finish with a durable tuple such as:

```text
release request id
P
C
candidate blob
candidate ref
suite result
materialization disposition = CREATED | ALREADY_MATERIALIZED
run id
```

### F5. Separate authorization and activation is safe but costs an extra operator PR

Current normal permanent release invocation is:

```text
immutable release spec PR
→ merge
→ immutable activation PR
→ merge
→ PR activation adapter
→ permanent caller
```

This is safe and the activation adapter solved the unavailable workflow-dispatch operator surface correctly.

No evidence currently shows the adapter itself is unsafe.

Classification:

```text
RELEASE_AUTHORIZATION_ACTIVATION_DOUBLE_PR
= DEFER / OPERATOR_ERGONOMICS / DESIGN_REVIEW / NON_RUNTIME
```

Do not collapse these boundaries merely to reduce PR count.

After the generic candidate controller is proven, evaluate whether one explicit immutable release PR can safely serve as both authorization and activation while preserving:

```text
single-file immutable authority
explicit operator intent
exact candidate ref binding
Candidate Required
single permanent publisher
non-bypassable failure behavior
```

If those properties cannot be retained cleanly, keep the separate activation PR.

### F6. PR activation run discovery uses polling and should remain under observation

The permanent PR activation adapter dispatches the permanent workflow, then discovers the resulting run by main head SHA and creation time before calling `gh run watch`.

This solved a real connected-tool limitation and has permanent static restrictions.

No incorrect run binding has been observed.

Classification:

```text
PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
= WATCH / OBSERVABILITY / NON_RUNTIME / NON_BLOCKING
```

Do not rewrite it without evidence.

If a future run-binding ambiguity appears, preserve the exact incident and then strengthen correlation with an explicit transaction token or machine receipt.

### F7. Post-publish normal path is now much stronger than the first observed run

The original failure:

```text
POST_PUBLISH_MAIN_GATE_ACTIONS_PERMISSION_GAP
```

is already fixed.

The permanent post-publish job now has the project-owned gateway permissions needed to dispatch MAIN_HEALTH and reobserve durable state.

Classification:

```text
POST_PUBLISH_MAIN_GATE_ACTIONS_PERMISSION_GAP
= FIXED / PERMANENTLY_REGRESSION_OWNED
```

Do not count the recovery PR chain as expected steady-state cost unless a future release reproduces a post-publish failure.

### F8. Durable LIVE_PENDING closure required too many administrative transactions

After recovery had already produced a correct release record and manifest identity, closure still required:

```text
#257 docs/status + one-shot transition registration
#258 unmerged command PR to execute current_priority transition
#260 docs/status finalization + transition retirement
```

This was correct but operator-heavy.

Classification:

```text
LIVE_PENDING_DURABLE_CLOSURE_FRAGMENTED
= FIX / R_FEEDBACK / STATE_SYNC / OPERATOR_ERGONOMICS / NON_RUNTIME
```

Desired future normal-path ownership:

```text
permanent post-publish transaction
→ release record LIVE_PENDING
→ product-manifest production identity + PENDING_REAL_LONG_CHAT
→ current_priority = release liveScenarioId
→ current lifecycle machine status updated
→ durable transaction receipt generated
→ one bounded MAIN_HEALTH gateway write
```

Human-authored retrospective/evidence may still follow when an anomaly occurred, but routine successful release bookkeeping should not require three separate administrative PR transactions.

### F9. Documentation closure is mandatory, but routine receipts should be generated where facts are machine-known

The project rule remains:

```text
no durable documentation/state closure
→ not COMPLETE
```

That rule should not be weakened.

However, many release facts are already known exactly by the system:

```text
releaseId
P
C
blob
publisher run
Candidate Required result
publication disposition
post-publish state result
main state commit
live scenario id
```

Classification:

```text
MACHINE_KNOWN_RELEASE_FACTS_REENTERED_MANUALLY
= FIX / DOCUMENTATION_AUTOMATION / NON_RUNTIME
```

R should generate a durable bounded release receipt from those facts automatically.

Human documentation should focus on:

```text
why a finding matters
classification
product/live interpretation
follow-up decision
```

rather than manually copying transaction identities already owned by machine evidence.

### F10. Candidate transport ref cleanup remains a tool-surface defer

The exact candidate transport branch still exists after production publication.

Existing project evidence already records branch/ref deletion tool-surface limitations.

Classification:

```text
CANDIDATE_TRANSPORT_REF_RETIREMENT
= DEFER / TOOL_SURFACE / NON_RUNTIME / NON_BLOCKING
```

Do not force or repurpose the immutable candidate ref.

If deletion authority becomes available later, retire only after durable release evidence is sufficient and with no change to production history.

### F11. GitHub Actions Node target warning remains observation-only

Existing R status retains:

```text
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
= WATCH
```

No release correctness failure is currently attributed to it.

Keep observation only unless a concrete action/runtime incompatibility appears.

## 5. Learning tax vs steady-state cost

The 18-PR first release should be divided into two categories.

### 5.1 First-release learning tax already absorbed

These should not recur as normal release steps:

```text
fixture bookkeeping repair
permanent workflow dispatch-surface repair
authorization JSON canonicalization repair
post-publish actions permission repair
trusted recovery bootstrap investigation
recovery self-test boundary repair
recovery infrastructure installation
```

If they recur, treat them as regressions.

### 5.2 Repeatable friction still present

These remain architectural/operator concerns:

```text
version-specific candidate orchestration
candidate activation/observability mechanics
exact-existing candidate non-idempotent result
separate authorization + activation PRs
manual durable LIVE_PENDING closure chain
machine-known evidence manually recopied into docs
stale one-shot candidate workflow cleanup
```

These are the main R hardening targets.

## 6. Desired steady-state release path

### 6.1 Near-term realistic target

Without weakening safety:

```text
1. product implementation PR
   - design/evidence
   - product-specific tests/fixtures
   - product builder only if genuinely required

2. permanent generic candidate transaction
   - exact production P
   - deterministic C
   - permanent candidate suites
   - candidate receipt
   - exact-existing C => NOOP/PASS

3. one explicit release authorization/activation boundary
   - one or two PRs depending on design proof

4. permanent publisher
   - Candidate Required
   - release-simcore publication
   - exact reobservation
   - automatic LIVE_PENDING admin/state receipt

5. real long-chat human validation

6. one LIVE_PASS closure PR
   - human evidence
   - anomaly classification
   - machine lifecycle close/cutover when authorized
   - long-term documentation closure
```

### 6.2 Operator PR target

Reasonable target after hardening:

```text
to production LIVE_PENDING: 2–3 operator PRs
full release through human LIVE_PASS closure: 3–4 operator PRs
```

This is a target, not a quota.

Do not remove a security/authority boundary merely to hit the number.

## 7. Prioritized R hardening queue

### R-F1 — retire v0.64.7 one-shot candidate workflows

Priority: **FIX BEFORE NEXT RUNTIME RELEASE WORK**

Scope:

```text
remove product-simcore-06407-candidate-prep.yml
remove product-simcore-06407-candidate-prep-observable.yml
update CI classification/self-tests if required
preserve candidate evidence/history docs
no runtime mutation
no release-simcore mutation
```

### R-F2 — permanent generic candidate preparation + idempotency

Priority: **FIX / HIGH**

Requirements:

```text
request-driven permanent workflow
generic P/C/ref handling
product builder injected by request/config rather than workflow filename
permanent suite selection
candidate receipt
exact-existing same-C NOOP/PASS
conflicting existing ref BLOCK
bot provenance
observable run identity
```

### R-F3 — consolidate automatic LIVE_PENDING durable closure

Priority: **FIX / HIGH**

Requirements:

```text
post-publish writes current priority from liveScenarioId
machine lifecycle state updated in same bounded transaction where safe
generated release transaction receipt
single MAIN_HEALTH gateway write
no manual one-shot transition for routine successful release
no false LIVE_PASS
```

### R-F4 — authorization/activation PR consolidation design review

Priority: **DEFER UNTIL R-F2/R-F3 PROVEN**

Evaluate whether one explicit release PR can safely own both decisions.

### R-F5 — activation run-correlation strengthening

Priority: **WATCH**

Only act if a real ambiguity or wrong-run correlation is observed.

## 8. Current gate interaction

This retrospective does **not** change the current product gate.

Current release remains:

```text
v0.64.7
REAL_RELEASE_LIVE_PENDING
validation_status = PENDING_REAL_LONG_CHAT
next = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

The R-F1 cleanup is not a blocker for the current v0.64.7 long-chat validation because it does not affect deployed runtime bytes.

It is a cleanup requirement before the next runtime release work item that may interact with candidate-preparation trigger paths.

Do not mix R-F1/R-F2/R-F3 implementation with the v0.64.7 live validation itself.

## 9. Final assessment

The first real R release was operationally expensive but technically valuable.

The system proved that it can preserve authority and recover from a post-publication administrative failure without mutating production twice.

The next optimization target is therefore not fewer checks.

It is fewer bespoke operator transactions around the same checks.

Preferred direction:

```text
keep the safety model
keep exact evidence
keep fail-closed behavior
keep durable documentation closure

but move repeated orchestration into permanent generic controllers and generated receipts
```

Success means a future release feels much shorter to operate while producing equal or better evidence than v0.64.7.
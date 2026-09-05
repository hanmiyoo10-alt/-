# SimCore v0.70.9 Publication Evidence

Date: 2026-09-06 KST
Status: **PRODUCTION PUBLISHED · REAL LONG-CHAT PENDING**
Release: **v0.70.9 Inline Planning Marker Hygiene Guard**
Release transaction: `simcore-v0.70.9-new-01`
Primary goal: `07009_INLINE_PLANNING_MARKER_HYGIENE_GUARD`
Tracking runtime repair: `#1589`

## 1. Publication disposition

```text
IMPLEMENTATION = QUALIFIED
EXACT APPROVAL = SUCCESS
PERMANENT RELEASE = SUCCESS
release-simcore = v0.70.9
latest.js == install.js = VERIFIED
DECLARED VALIDATION = PENDING_REAL_LONG_CHAT
R LIFECYCLE = REAL_RELEASE_LIVE_PENDING
HUMAN CLOSE AUTHORITY = REQUIRED
```

This document records publication only. It does not claim `LIVE_PASS`, does not close `#1589`, and does not substitute deterministic owner-level regression for the required real long-chat three-lens review.

## 2. Frozen implementation authorization

Implementation authorization was merged separately before runtime work.

```text
Authorization PR = #1601
Authorization head = df3268f560ba8d00947f6195fdc77532e42033e2
Authorization merge = 1028287eff590d7636b49247d2b4a358ee51f7da
```

The dedicated runtime implementation transaction was PR #1603.

```text
Implementation final head = da69f3a8c7c2f7f09ea292fc2b49a19e289b322b
Implementation CI = 33982820155
Verify = SUCCESS
Required = SUCCESS
Implementation merge = a186c9f8ccd6ee101d18a50a649b923c764a24b0
```

The implementation remained bounded to Output Compat visible-output hygiene for the reserved `INLINE_INTERNAL_MEMO_V1` standalone marker grammar. It added fence-aware stripping before envelope canonicalization, bounded non-payload provenance, permanent production-owner regression, and release builder/profile support. No storage/network/timer/persistent-schema/repository-release-system change was included.

A local direct test attempt encountered an environment-only GitHub DNS failure. It is preserved separately as:

```text
DEFER · TOOLING_ENVIRONMENT · NON-CORRECTNESS
```

Hosted permanent verification remained the validation authority and passed.

## 3. Candidate transaction

Fresh candidate transaction:

```text
intent = simcore-v0.70.9-intent-01
release = simcore-v0.70.9-new-01
expected production = 01010564649a033e02a0658a167f5f38a6a23632
```

Candidate request PR #1605:

```text
request head = 38d4a4c261b2624e2c2037cf3d42c19ce9b62ad7
Verify = SUCCESS
Required = SUCCESS
merge / immutable source S = c3d6a5f6ecfa62d65a7958f0699c5ee1424428ba
```

Generic Candidate Materialize:

```text
run = 33983168617
candidate disposition = CREATED
candidate commit C = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
candidate release blob = dc82006c468ebef76fa0126e0533dda245bd222d
candidate fetch ref = candidate/simcore/simcore-v0.70.9-intent-01
production parent P = 01010564649a033e02a0658a167f5f38a6a23632
result = PASS
production mutation = NONE
```

Candidate `C` is a direct child of production `P`. Its release delta contains only:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

Machine-known candidate truth was durably written to main in the candidate receipt and spec shadow:

```text
products/simcore/releases/candidate-receipts/simcore-v0.70.9-intent-01.json
products/simcore/releases/spec-shadows/simcore-v0.70.9-new-01.json
```

## 4. Exact approval

Exact approval PR #1607 used the frozen title and two-file transaction boundary exactly:

```text
SimCore exact release approval: simcore-v0.70.9-new-01
```

Its changed paths were exactly:

```text
products/simcore/releases/approvals/simcore-v0.70.9-new-01.json
products/simcore/releases/specs/simcore-v0.70.9-new-01.json
```

```text
approval final head = dc415aa0a38fadc021b81b61fc30d3d1e2a7ff9f
PR SimCore CI = SUCCESS
approval merge = 5be6f899045e3b5ce886bf25d43e45e5be016d51
```

Exact Approval Activation:

```text
run = 33983343770
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
Approval Activation Required = SUCCESS
```

## 5. Permanent Release

Permanent Release run:

```text
run = 33983351055
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

The permanent controller preplayed post-publish state, published the exact immutable candidate, created the post-publish handoff, committed owner-declared main state, and successfully reobserved durable main truth.

## 6. Direct production readback

`release-simcore` now points to:

```text
production commit = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
message = SimCore v0.70.9 Inline Planning Marker Hygiene Guard
parent = 01010564649a033e02a0658a167f5f38a6a23632
```

Direct production file readback:

```text
plugins/simcore/latest.js blob  = dc82006c468ebef76fa0126e0533dda245bd222d
plugins/simcore/install.js blob = dc82006c468ebef76fa0126e0533dda245bd222d
latest.js == install.js         = VERIFIED
//@version                       = 0.70.9
```

Therefore runtime publication identity is converged across `release-simcore`, both production files, and main release metadata.

## 7. Durable main live-pending state

Published-state convergence wrote:

```text
main commit = 419524dab8180dc48352dd8aae51b70ecdea4289
message = state(simcore): declare simcore-v0.70.9-new-01 live pending
```

Machine authority now reads:

```text
Version = 0.70.9
Release = Inline Planning Marker Hygiene Guard
Release commit = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
Release blob = dc82006c468ebef76fa0126e0533dda245bd222d
Validation = PENDING_REAL_LONG_CHAT
Current priority = 07009_INLINE_PLANNING_MARKER_HYGIENE_GUARD_REAL_LONG_CHAT
Lifecycle = REAL_RELEASE_LIVE_PENDING
```

## 8. Human live gate now required

Use the adopted three-lens procedure and the frozen v0.70.9 live contract.

Lens 1 minimum release-specific proof:

```text
ordinary long-chat output remains COMMITTED / BOUND / mirror COMMITTED
no visible reserved standalone internal_memo control line survives when naturally emitted
if natural emission occurs, Inline planning compat = STRIPPED
Grammar = INLINE_INTERNAL_MEMO_V1
removed raw payload is not retained in diagnostics
no regression in THOUGHTS_COMPAT cleanup
no new v0.70.9-caused FIX/BLOCKER
```

Natural `internal_memo` re-emission is nondeterministic. Do not manufacture unrelated state solely to force it. The permanent owner-level deterministic regression is the exact grammar proof when no natural specimen occurs.

Lens 2 must review the actual operator sequence, preferably including ordinary output and naturally useful reroll or genuine hand-edit controls.

Lens 3 must classify every active diagnostic element with no blanks using:

```text
PASS / WATCH / DEFER / FIX / BLOCKER / NOT_EXERCISED / NOT_APPLICABLE
```

## 9. Separate documentation anomaly

Fresh readback after publication found the machine-managed production/live-pending blocks correct while the human-authored `CURRENT_DEVELOPMENT.md` operational paragraph still described an older live-closed / R2.11-next state.

That recurrence is separate from this runtime publication and is recorded in a dedicated documentation-drift evidence file. It does not override machine authority and does not change the v0.70.9 runtime verdict.

## 10. Current disposition

```text
V07009_IMPLEMENTATION = QUALIFIED
V07009_PUBLICATION = SUCCESS
V07009_PRODUCTION = 0.70.9
V07009_RELEASE_ID = simcore-v0.70.9-new-01
V07009_VALIDATION = PENDING_REAL_LONG_CHAT
V07009_LIFECYCLE = REAL_RELEASE_LIVE_PENDING
#1589 = LIVE CLOSURE NOT YET AUTHORIZED
NEXT AUTHORITY = HUMAN_EVIDENCE
```

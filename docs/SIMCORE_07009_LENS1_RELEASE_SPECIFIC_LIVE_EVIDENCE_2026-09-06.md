# SimCore v0.70.9 Lens 1 Release-Specific Live Evidence

Date: 2026-09-06 KST
Status: **LENS 1 PASS · LENS 2/3 NOT YET REVIEWED · TERMINAL CLOSE NOT EXECUTED**
Release: `v0.70.9 Inline Planning Marker Hygiene Guard`
Tracking: `#1589`, live packet tracker `#1621`
Production: `release-simcore@1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17`
Production blob: `dc82006c468ebef76fa0126e0533dda245bd222d`
Generation: `mtorokbu-gq7rk8`

## 1. Review boundary

This document records **Lens 1 only**:

```text
Does this live packet prove what v0.70.9 is supposed to prove?
```

It does not perform the set-level Lens 2 audit or exhaustive Lens 3 element inventory. Independent performance findings are preserved separately and do not alter this release-specific verdict unless evidence ties them to the v0.70.9 Output Compat change.

## 2. Operator-authoritative specimen mapping

```text
1. request @3162 -> output @3163
   action = first real turn after page refresh
   mode = A

2. request @3164 -> output @3165
   action = genuine hand edit control
   physical edit = +1 visible char
   mode = C

3. request @3166 -> output @3167
   action = next natural C

4. request @3168 -> output @3169
   action = next natural C

5. request @3168 -> output @3169
   action = reroll of specimen 4
```

Do not reinterpret specimen 2 as an unexplained representation event or specimen 5 as a new user request.

## 3. Production authority

Fresh repository authority before review:

```text
Version = 0.70.9
Release = Inline Planning Marker Hygiene Guard
Validation = PENDING_REAL_LONG_CHAT
Lifecycle = REAL_RELEASE_LIVE_PENDING
Current priority = 07009_INLINE_PLANNING_MARKER_HYGIENE_GUARD_REAL_LONG_CHAT
```

Publication evidence states that natural `internal_memo` re-emission is nondeterministic and must not be manufactured solely for validation. When no natural marker specimen occurs, the permanent production-owner regression remains the exact grammar proof.

## 4. v0.70.9 target evidence

Across all five supplied RAW assistant specimens:

```text
visible standalone reserved `┣ internal_memo: ... ┫` marker = NOT OBSERVED
Inline planning compat diagnostic = NOT EXERCISED
natural reserved marker emission = NOT EXERCISED
Warnings = 0
```

This is not a missing required live specimen because the frozen v0.70.9 contract explicitly allows the target model/gateway artifact to be nondeterministic and forbids manufacturing unrelated state to force it.

Exact target grammar proof remains the already-passed production-owner permanent regression from the qualified implementation/release transaction.

## 5. Existing compatibility regression control

Every supplied specimen reports the existing leading Thoughts compatibility family correctly stripped:

```text
Preamble provenance = THOUGHTS_COMPAT
Action = STRIPPED
Warnings = 0
```

Observed preamble sizes vary naturally across requests, but no Thoughts payload is visible in the canonical assistant RAW bodies.

Disposition:

```text
THOUGHTS_COMPAT_REGRESSION = NONE OBSERVED
OUTPUT_COMPAT_EXISTING_BEHAVIOR = PASS
```

## 6. Runtime/output continuity relevant to Lens 1

All five specimens show:

```text
Runtime status = ACTIVE
request hook = SEEN
Core handshake = FOUND
binding = BOUND
output = COMMITTED
stale drops = 0
hook cleanup = NAMED
Warnings = 0
```

Deferred Mirror behaves conservatively according to actual canonical/Fresh identity:

```text
specimen 1 = OUTPUT_MISMATCH
specimen 2 = COMMITTED
specimen 3 = OUTPUT_MISMATCH
specimen 4 = OUTPUT_MISMATCH
specimen 5 = OUTPUT_MISMATCH
```

The mismatch specimens explicitly report different canonical/Fresh fingerprints and do not perform an unsafe mirror write. The exact specimen reports `COMMITTED`. Therefore the relevant safety contract is intact rather than regressed.

## 7. Supplemental controls present in the packet

These are useful controls but are not needed to manufacture proof of the v0.70.9 marker grammar.

### Genuine hand edit

Operator-confirmed specimen 2:

```text
Edit reconcile = MANUAL_EDIT_REBUILT
snapshot = UPDATED
Edit origin = AMBIGUOUS_CHANGE
current delta = +1 vs canonical / +1 vs Fresh
new output = COMMITTED
Deferred mirror = COMMITTED
```

Correctness is intact. Its extreme prune latency is a separate performance WATCH recorded as `#1619` and must be reviewed in Lens 2 / Lens 3.

### Natural representation fast reconcile

Specimen 4 request path:

```text
Prior representation = OUTPUT_MISMATCH
current = prior Fresh exact
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Edit reconcile = REPRESENTATION_FAST_RECONCILED
snapshot = UNCHANGED
```

This preserves the frozen representation contract.

### Operator-confirmed reroll

Specimen 5:

```text
Pre snapshot = REWIND · READ HIT
Edit reconcile = REPRESENTATION_FAST_RECONCILED
representation = fresh-exact-repeat-send-rewind
snapshot = UNCHANGED
cache topology = STABLE 48/48 · 100%
History mutation = NONE
SimCore contribution = NO_BREAK
```

This is a strong benign reroll control and does not expose a v0.70.9 marker-hygiene regression.

## 8. Separate performance observations preserved, not mixed into Lens 1

```text
#1619 = WATCH · genuine hand-edit prune latency spike
#1587 / v0.70.9 recurrence packet = WATCH · output snapshot set similar-size high variance
```

These observations are not evidence that the v0.70.9 Output Compat marker filter caused a correctness regression.

## 9. Lens 1 verdict

```text
V07009_LENS1 = PASS
NATURAL_INLINE_INTERNAL_MEMO_EMISSION = NOT_EXERCISED / ALLOWED
VISIBLE_RESERVED_MARKER_LEAK = NOT OBSERVED
PERMANENT_OWNER_GRAMMAR_PROOF = PASS / PRE-EXISTING RELEASE QUALIFICATION
THOUGHTS_COMPAT = PASS
OUTPUT_COMMIT_AND_BINDING = PASS
MIRROR_SAFETY = PASS
V07009_CAUSED_FIX_OR_BLOCKER = NONE OBSERVED
ADDITIONAL_V07009_SPECIFIC_LOG_REQUIRED_FOR_LENS1 = NO
```

This is **not** terminal `LIVE_PASS` and does not close `#1589`.

Next operator-gated step:

```text
Lens 2 = review the supplied set as an action sequence from scratch
```

Stop here until operator advances the review.

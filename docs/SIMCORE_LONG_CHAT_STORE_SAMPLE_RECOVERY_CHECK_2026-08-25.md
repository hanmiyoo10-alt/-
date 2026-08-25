# SimCore Long-Chat Store Sample Recovery Check — 2026-08-25

Date: 2026-08-25
Status: `EVIDENCE CHECK · CAPTURE-QUALITY GAP CONFIRMED · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_LONG_CHAT_STORE_SET_SAMPLE_CORRELATION_STUDY_2026-08-25.md`
- `docs/SIMCORE_LONG_CHAT_STORE_BACKEND_SET_VARIANCE_MODEL_IDEA.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`

## Purpose

Attempt to recover the first missing discriminator identified by the existing Store Set Sample Correlation Study before considering any new runtime instrumentation.

Target evidence family:

```text
runtime generation mt5hq654-5fn0so
v0.64.6 B_CONTINUE ordinary TURN samples
@2130
@2132
@2134
@2136
```

Target missing field:

```text
exact TURN payloadChars per sample
```

## Repository recovery pass

Repository search/review covered the currently preserved v0.64.6 natural-sequence evidence, including:

```text
docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md
docs/SIMCORE_LIVE_06406_VALIDATION.md
existing long-chat timing/performance research documents
```

The B_CONTINUE request set timings remain preserved:

```text
@2130 291 ms
@2132 1.010 s
@2134 356 ms
@2136 311 ms
```

The same preserved material does not contain the exact `payloadChars` values for those four TURN samples.

A later ordinary C sample in the same runtime does preserve the full pair:

```text
@2142
Turn storage 22,461 chars
backend set 381 ms
```

This confirms the field exists in the diagnostic surface, but does not reconstruct the missing B_CONTINUE values.

## Result

```text
EXACT_B_CONTINUE_PAYLOAD_RECOVERY
= NOT FOUND IN CURRENT REPOSITORY EVIDENCE

FIRST_MISSING_DISCRIMINATOR
= CONFIRMED
= exact TURN payloadChars on homogeneous B_CONTINUE samples
```

Classification:

```text
EVIDENCE_GAP
= CAPTURE_QUALITY
= NON_RUNTIME
= NON_CORRECTNESS
= NON_BLOCKING
```

Do not infer the missing payload values from neighboring turns, output size, visible model-output length, representation fingerprints, or later C samples.

## Consequence

No runtime instrumentation is justified by this recovery failure.

The missing discriminator is already emitted by current natural diagnostics. The next evidence action is therefore to preserve complete natural specimens rather than modify production.

For the next useful same-runtime ordinary TURN family, preserve together:

```text
runtime generation
release/version
mode
turn index
payloadChars
serializeMs
backend setMs
request total
hotspot share
Edit Reconcile path
warnings / correctness status
```

Prefer multiple neighboring samples in the same mode/write context.

The first question to retest is:

```text
H4
Does payload size contribute materially inside a homogeneous ordinary TURN family?
```

If payload-aware homogeneous samples still show large unexplained backend-set variance, revisit remaining discriminators in the established order:

```text
1. deferred-prune context where already available
2. reload / steady runtime class
3. new-key vs rewrite context
4. only then consider a narrowly designed write-cadence measurement
```

## Duplicate-document cleanup

A parallel-session race briefly created a second draft:

```text
docs/SIMCORE_LONG_CHAT_STORE_SET_SAMPLE_CORRELATION_STUDY_IDEA.md
```

The authoritative executed study already existed as:

```text
docs/SIMCORE_LONG_CHAT_STORE_SET_SAMPLE_CORRELATION_STUDY_2026-08-25.md
```

The duplicate draft was removed immediately.

Classification:

```text
DOC_DUPLICATION
= FIXED
= NON_RUNTIME
= NO PRODUCT IMPACT
```

Git history preserves the transient draft and its removal; no runtime/release authority was affected.

## Current research position

```text
Store boundary decomposition              COMPLETE ENOUGH
backend-set variance model                COMPLETE ENOUGH
existing-sample correlation               EXECUTED
repo recovery for missing payloadChars    EXHAUSTED / NOT FOUND
next action                               NATURAL CAPTURE QUALITY
performance optimization candidate        NOT YET JUSTIFIED
new runtime instrumentation               NOT YET JUSTIFIED
```

The performance research remains inside the charter freeze: design/evidence only, no `latest.js`/`install.js` changes, no SnapshotStore mutation, and no `release-simcore` deployment.

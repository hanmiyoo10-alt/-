# SimCore v0.70.1 Same-Generation Prompt Tail Evidence

Date: 2026-08-31 KST
Status: **WATCH PRESERVED · NOT A FORMAL STAGE A/B/C CLOSE · NO LIVE_PASS AUTHORITY**
Classification: **REAL LONG-CHAT EVIDENCE / WATCH / COLD-LIKE PROMPT TAIL / TEST-BOUNDARY OBSERVATION**

## 1. Production under test

```text
Version: 0.70.1
Release: Cold First-Turn Tail Attribution
Observed generation: mtfyw9tn-tpy6kf
Runtime boot: 2026-08-30T15:31:43.163Z
```

All three supplied diagnostics report:

```text
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
continuity PASS
same runtime generation mtfyw9tn-tpy6kf
same runtime boot 2026-08-30T15:31:43.163Z
```

Therefore these samples are preserved as valuable same-generation evidence, but they do **not** satisfy the frozen requirement for two independent fresh-runtime generations.

The human operator described the middle sample as the first diagnostic after a refresh. The diagnostic itself nevertheless retained the same runtime boot and generation as the preceding sample. Preserve this discrepancy as a test-boundary WATCH rather than assuming the refresh created a fresh SimCore runtime.

## 2. Sample S0 — large bounded prompt-accounting tail

Turn binding:

```text
request user @2648
output assistant @2649
Mode A
```

Request timing:

```text
handshake             28.0 ms
prepared             568.0 ms
request done           5.528 s
onSend               538.0 ms
post-onSend            4.960 s
request hotspot        POST_ONSEND · 4.960 s · 89.7%
```

v0.70.1 attribution:

```text
Post-onSend attribution:
  named         4.960 s
  history       2.0 ms
  prompt        4.955 s
  topology      3.0 ms
  candidate     0.0 ms
  unattributed  0.0 ms
  first-request LOCATION_REUSE
  confidence    BOUNDED
```

Interpretation:

```text
post-onSend tail = exactly closed by named spans
prompt-accounting span = 4.955 s of 4.960 s
unattributed gap = 0.0 ms
```

This is strong evidence that the observed large request-side tail in this sample was **inside a named SimCore PROMPT_ACCOUNTING checkpoint**, not an unattributed host/scheduler gap.

However, the sample is not promoted to formal `SIMCORE_NAMED_TAIL` verdict because the frozen live protocol requires recurrence across two independent fresh runtime generations.

Additional state:

```text
Warnings 0
Compatibility diagnostics 1
Thoughts compatibility preamble stripped safely
Turn storage set 534 ms
Output process/storage healthy
Deferred mirror COMMITTED
Output representation EXACT
```

No request/output correctness regression is visible in the supplied diagnostic.

## 3. Sample S1 — same-generation collapse

Turn binding:

```text
request user @2650
output assistant @2651
Mode C
same generation mtfyw9tn-tpy6kf
```

Request timing:

```text
handshake        21.0 ms
request done    289.0 ms
onSend          261.0 ms
post-onSend       6.0 ms
request hotspot  TURN_STORAGE · 260.0 ms
```

v0.70.1 attribution:

```text
named         6.0 ms
history       1.0 ms
prompt        4.0 ms
topology      1.0 ms
candidate     0.0 ms
unattributed  0.0 ms
first-request LOCATION_REUSE
confidence    BOUNDED
```

Compared with S0:

```text
PROMPT_ACCOUNTING 4.955 s -> 4.0 ms
post-onSend       4.960 s -> 6.0 ms
```

The large named prompt span therefore collapsed almost completely on the immediately following request in the same runtime generation.

This is precisely the shape v0.70.1 was built to distinguish, but because S0 was not proven to be a fresh-runtime Stage A, S1 is retained as a **warm-like same-generation control**, not formal Stage B completion.

Cache observations in S1:

```text
Cache break PRE_SIMCORE · CHAT_HISTORY @10 user->user
SimCore contribution NOT_FIRST_BREAK
runtime placement AFTER_PREFIX_BREAK
provider cache UNVERIFIED
```

This cache topology evidence is separate from the prompt-tail attribution result and does not prove provider-cache behavior.

## 4. Sample S2 — second same-generation warm continuation

Turn binding:

```text
request user @2652
output assistant @2653
Mode C
same generation mtfyw9tn-tpy6kf
```

Request timing:

```text
handshake        29.0 ms
request done    383.0 ms
onSend          349.0 ms
post-onSend       4.0 ms
request hotspot  TURN_STORAGE · 345.0 ms
```

v0.70.1 attribution:

```text
named         4.0 ms
history       1.0 ms
prompt        1.0 ms
topology      2.0 ms
candidate     0.0 ms
unattributed  0.0 ms
first-request LOCATION_REUSE
confidence    BOUNDED
```

The prompt-accounting span remained small on the second continuation:

```text
S0 prompt 4.955 s
S1 prompt 4.0 ms
S2 prompt 1.0 ms
```

This strengthens the same-generation collapse observation.

## 5. Separate warning observed in S2

S2 reports:

```text
Warnings: 1
Compatibility diagnostics: 1
Preamble provenance: DUPLICATE_ENVELOPE
candidates 2
selected 2
policy SELECT_SAFE_CANDIDATE
warning: response envelope duplicated; complete candidate #2 retained
compatibility: Thoughts compatibility preamble removed
```

The request/output still reports:

```text
Runtime ACTIVE
output COMMITTED
binding BOUND
continuity PASS
frame PASS
Deferred mirror COMMITTED
```

Disposition:

```text
WATCH · DUPLICATE_ENVELOPE_COMPAT_WARNING
```

No causal attribution to v0.70.1 is established from this evidence. It is preserved because live anomalies must be recorded before proceeding. It is not currently a BLOCKER because the safe candidate was selected and the supplied semantic/continuity diagnostics remain healthy.

## 6. Formal live-protocol status

The frozen protocol requires at minimum:

```text
Stage A = true fresh runtime generation #1
Stage B = next warm request in exactly that generation
Stage C = independent true fresh runtime generation #2
```

Current supplied evidence:

```text
S0 generation mtfyw9tn-tpy6kf
S1 generation mtfyw9tn-tpy6kf
S2 generation mtfyw9tn-tpy6kf
```

Therefore:

```text
FORMAL_STAGE_A = NOT YET PROVEN
FORMAL_STAGE_B = NOT YET PROVEN
FORMAL_STAGE_C = NOT YET PROVEN
HUMAN_LIVE_PASS = NOT CREATED
```

Do not discard these samples. They are strong supporting evidence for a repeatable **same-generation large-to-small named prompt-accounting transition**, but the independent fresh-runtime recurrence gate remains open.

## 7. Current classifications

### WATCH · SAME_GENERATION_PROMPT_TAIL_COLLAPSE

Evidence:

```text
4.955 s PROMPT_ACCOUNTING
-> 4.0 ms
-> 1.0 ms
within one generation
```

Meaning:

- v0.70.1 instrumentation successfully bounded the large observed tail;
- the large sample was named rather than unattributed;
- the named span collapsed on subsequent requests;
- independent fresh-runtime recurrence is still required before optimization ownership is authorized.

### WATCH · REFRESH_DID_NOT_PROVE_NEW_RUNTIME_GENERATION

The operator intended/refers to a refresh boundary, but all supplied diagnostics retained the same runtime boot and generation. The next formal fresh sample must visibly rotate runtime generation identity before it is accepted as Stage A or C.

### WATCH · DUPLICATE_ENVELOPE_COMPAT_WARNING

Observed once on S2 with safe selection and continuity preserved. No v0.70.1 causality established.

## 8. Next evidence required

For the next formal sample, require the diagnostic itself to prove a new runtime identity:

```text
new Runtime boot timestamp
new generation id != mtfyw9tn-tpy6kf
CURRENT TURN
SEEN / FOUND / ACTIVE / COMMITTED / BOUND
continuity/frame/state healthy
Post-onSend attribution present
```

Then immediately take one same-generation warm request without another refresh.

After that, create a second independent fresh runtime with another new generation id for the mandatory recurrence control.

## 9. Authority boundary

This evidence does not authorize:

```text
LIVE_PASS
terminal release convergence
successor optimization
prompt-accounting rewrite
cache implementation
provider-cache claim
```

No runtime, `release-simcore`, `latest.js`, `install.js`, persistent schema, or deployment state is changed by this evidence record.

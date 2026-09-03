# SimCore LRE-2 Transient Carrier / Host Fingerprint Boundary FIX — 2026-09-03

Date: 2026-09-03 KST

Status: **FIX RECORDED · DESIGN-TIME BOUNDARY DISCOVERY · NO RUNTIME CHANGE · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LRE-2 · FIX · OUTPUT IDENTITY / TRANSIENT TRANSPORT**

## 0. Finding

During LRE-2 production-source review, the current output-identity compatibility rule was found to conflict with the proposed transient structured transport if reused unchanged.

Current production intentionally records two generation-time fingerprints:

```text
outputFingerprint
= canonical handler result

hostOutputFingerprint
= raw output handler input
```

The current Edit Reconcile owner treats either fingerprint as a potentially valid generation-time representation because historical PocketRisu behavior may retain either canonical handler output or raw model output.

That is valid for the current production output contract.

It is **not** valid once the raw model output may contain a transient Source carrier that must never enter stored assistant transcript.

## 1. Why this becomes unsafe

Proposed LRE-2 transport shape:

```text
raw model output
= visible assistant bytes
+ transient Source carrier bytes
```

The carrier must be consumed before the normal stored-output pipeline.

If current fingerprint logic were reused unchanged:

```text
hostOutputFingerprint
= fingerprint(raw carrier-bearing output)
```

then the carrier-bearing raw representation would become a trusted generation-time host representation candidate.

Later Edit Reconcile could accept that fingerprint as non-edited host output.

This would contradict:

```text
TRANSIENT CARRIER
!=
VALID STORED HOST REPRESENTATION
```

## 2. Classification

```text
FIX · TRANSIENT_CARRIER_RAW_FINGERPRINT_TRUST_BOUNDARY
```

This is not a current-production defect because production does not contain the transient carrier.

It is a mandatory design repair before any LRE-2/LRE-4 runtime implementation may activate that carrier.

## 3. Required future boundary

Once transient Source transport is active:

```text
raw carrier-bearing content
→ NEVER trusted as hostOutputFingerprint
```

The compatibility fingerprint, if still required for host/raw-visible representation, must be taken only after carrier removal:

```text
raw model output
→ TransientSourceTransport.extract(...)
→ cleanContent

hostOutputFingerprint candidate
= fingerprint(cleanContent)
```

Canonical handler-result identity remains:

```text
outputFingerprint
= fingerprint(result.content)
```

Therefore the two allowed generation-time representation classes become:

```text
A. carrier-free pre-canonical visible content
B. canonical finalized visible content
```

not:

```text
carrier-bearing raw model output
```

## 4. Why `cleanContent` preserves the original compatibility intent

The historical purpose of `hostOutputFingerprint` is to tolerate a host retaining the pre-canonical visible representation instead of the canonical finalized handler result.

After LRE-2 transport extraction, `cleanContent` is the closest lawful equivalent of that pre-canonical visible representation.

It preserves:

```text
raw-visible host compatibility
```

while excluding:

```text
transport-only Source bytes
```

## 5. Edit Reconcile implication

Future implementation must prove:

```text
stored canonical result
→ matches outputFingerprint

stored carrier-free pre-canonical visible result
→ may match hostOutputFingerprint

stored carrier-bearing raw model output
→ matches neither trusted generation fingerprint
→ must not receive generation-time compatibility trust
```

A carrier-bearing stored message, if ever observed, is a transport/host failure and must not be normalized into success by Edit Reconcile.

## 6. No hidden migration exception

Forbidden repair:

```text
carrier-bearing stored message
→ Edit Reconcile strips carrier
→ adopts as ordinary compatible representation
```

Such a path would hide failure of the core transport guarantee.

The correct disposition is bounded failure evidence / rollback according to the later implementation transaction.

## 7. Protected owner boundary

This FIX does not transfer output-identity authority to Source Intelligence.

Ownership remains:

```text
Output Finalize / Session / Edit Reconcile
= representation identity authority

TransientSourceTransport
= supplies carrier-free pre-canonical visible bytes only
```

The Source transport does not decide whether a host representation is trusted.

## 8. Future regression requirements

Any carrier implementation must add direct regression cases for:

```text
1. canonical stored result accepted
2. cleanContent pre-canonical stored result accepted where compatibility is still supported
3. carrier-bearing raw input rejected as trusted representation
4. carrier text cannot become hostOutputFingerprint
5. reload snapshot path cannot resurrect carrier-bearing host fingerprint trust
6. manual-edit rebuild cannot silently convert carrier contamination into compatibility success
```

## 9. Persistence boundary

The fix does not authorize a new state field.

Preferred future behavior reuses existing fields with corrected input semantics:

```text
outputFingerprint
hostOutputFingerprint
```

No new Source transport fingerprint needs to be persisted.

A transient packet hash may exist only in bounded diagnostic evidence if later LRE-3 authorizes it.

## 10. Current disposition

```text
CURRENT_PRODUCTION_DEFECT                 = NO
FUTURE_TRANSIENT_TRANSPORT_CONFLICT      = YES
CLASSIFICATION                           = FIX
REQUIRED_BEFORE_CARRIER_RUNTIME          = YES
RAW_CARRIER_AS_TRUSTED_HOST_REPRESENTATION = FORBIDDEN
PREFERRED_HOST_COMPAT_INPUT              = CARRIER_FREE cleanContent
NEW_PERSISTENT_FIELD                     = NONE
PRODUCTION                               = UNCHANGED
release-simcore                          = UNCHANGED
```

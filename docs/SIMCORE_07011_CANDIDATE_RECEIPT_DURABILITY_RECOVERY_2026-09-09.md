# SimCore v0.70.11 Candidate Receipt Durability Recovery

Date: 2026-09-09
Status: **RECOVERY DESIGN FROZEN · IMPLEMENTATION AUTHORIZED · NON-RUNTIME**
Tracking: #1949
Repository prerequisite: #1950 **COMPLETE**

## 1. Problem boundary

The v0.70.11 intent-03 immutable candidate was created and verified successfully, but the machine candidate receipt and spec shadow were not durably landed on `main` because the historical shared main writer attempted a direct push after an exact staging `Required` PASS. Native branch protection rejected that direct push.

The shared repository defect has now been repaired separately by #1950. This document owns only the bounded SimCore candidate-administration recovery for #1949.

This recovery does not:

```text
rebuild the candidate
create intent-04
change candidate bytes
change release-simcore
change production
change SimCore runtime
change release identity
infer approval
infer LIVE_PASS
```

## 2. Immutable candidate authority

```text
intentId              = simcore-v0.70.11-intent-03
releaseId             = simcore-v0.70.11-new-03
candidateCommit       = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
candidateReleaseBlob  = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
expectedProduction    = ecc55f026315c6482c34d267aba2adb97527cdbc
candidateDisposition  = CREATED
candidate result       = PASS
productionMutation    = NONE
```

The candidate remains valid and immutable. Receipt durability failure did not mutate or invalidate it.

## 3. Exact failed receipt payload authority

The failed durability attempt created Git commit:

```text
df4b3bcfa02b2dfceabce11621243555ef8004a1
state(simcore): record candidate simcore-v0.70.11-intent-03
```

That commit changes exactly two files:

```text
products/simcore/releases/candidate-receipts/simcore-v0.70.11-intent-03.json
products/simcore/releases/spec-shadows/simcore-v0.70.11-new-03.json
```

Exact Git blob identities:

```text
candidate receipt = 2e288a6c8d024b018c79e985a417aa203ceaa0ae
spec shadow       = 669289a7c3bcb51a8f0c16086751e1eba1dc5123
```

These blobs are recovery authority. Their contents must not be manually reconstructed, re-derived, normalized, reformatted, or edited.

## 4. Recovery contract

Recovery is a normal checked PR from latest `main`.

Sequence:

```text
latest main
→ create dedicated recovery branch
→ materialize exact receipt blob bytes from df4b3bc...
→ materialize exact spec-shadow blob bytes from df4b3bc...
→ verify branch diff contains exactly the two expected paths
→ verify resulting file blobs equal 2e288a6c... and 669289a7...
→ run permanent SimCore CI
→ require Verify SUCCESS
→ require Required SUCCESS
→ exact-head merge through protected main
→ re-read both durable main blobs
→ require exact equality to original blobs
→ re-read release-simcore and require unchanged production authority
```

No direct protected-main push is authorized for this recovery.

## 5. Fail-closed rules

Stop and preserve evidence if any of the following occurs:

```text
unexpected third changed file
blob mismatch
existing main path with conflicting content
candidate identity mismatch
expected production mismatch
Required failure
main movement requiring a changed recovery head without fresh CI
release-simcore movement before recovery close
```

A failure does not authorize rebuilding the candidate or synthesizing a new receipt.

## 6. Completion criteria

#1949 becomes eligible to close only when:

```text
receipt path durable on main = YES
receipt blob exact            = 2e288a6c8d024b018c79e985a417aa203ceaa0ae
spec-shadow path durable      = YES
spec-shadow blob exact        = 669289a7c3bcb51a8f0c16086751e1eba1dc5123
checked PR Required           = SUCCESS
release-simcore               = ecc55f026315c6482c34d267aba2adb97527cdbc
production                    = v0.70.10 unchanged
candidate                     = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8 unchanged
approval                      = NOT INFERRED
```

After #1949 closes, the existing v0.70.11 release transaction may resume from the next authorized candidate-approval step. Candidate rematerialization is not part of this recovery.

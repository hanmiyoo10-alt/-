# SimCore v0.70.11 Candidate Receipt Durability Recovery

Date: 2026-09-09
Status: **RECOVERY COMPLETE · BYTE-EXACT DURABILITY VERIFIED · NON-RUNTIME**
Tracking: #1949
Repository prerequisite: #1950 **COMPLETE**

## 1. Problem boundary

The v0.70.11 intent-03 immutable candidate was created and verified successfully, but the machine candidate receipt and spec shadow were not durably landed on `main` because the historical shared main writer attempted a direct push after an exact staging `Required` PASS. Native branch protection rejected that direct push.

The shared repository defect was repaired separately by #1950. This record closes only the bounded SimCore candidate-administration recovery for #1949.

This recovery did not:

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

The candidate remained valid and immutable throughout receipt recovery.

## 3. Exact failed receipt payload authority

The failed durability attempt created Git commit:

```text
df4b3bcfa02b2dfceabce11621243555ef8004a1
state(simcore): record candidate simcore-v0.70.11-intent-03
```

That commit changed exactly two files:

```text
products/simcore/releases/candidate-receipts/simcore-v0.70.11-intent-03.json
products/simcore/releases/spec-shadows/simcore-v0.70.11-new-03.json
```

Exact Git blob identities:

```text
candidate receipt = 2e288a6c8d024b018c79e985a417aa203ceaa0ae
spec shadow       = 669289a7c3bcb51a8f0c16086751e1eba1dc5123
```

Those original blobs remained the sole recovery authority. Their contents were not manually reconstructed, re-derived, normalized, reformatted, or edited.

## 4. Recovery design authority

The byte-exact recovery contract was frozen before implementation on a dedicated docs branch.

Design PR:

```text
#1954 docs(simcore): freeze v0.70.11 candidate receipt durability recovery
head = 669a5cf17bf197cf51fb7413288e809e1c7aa756
```

Permanent SimCore CI:

```text
run      = 34316863831
Verify   = 102354796001 / SUCCESS
Required = 102354861628 / SUCCESS
```

Exact-head design merge:

```text
main = 19e02943b49054ad76781f7e63952dac5f67ec12
```

At that main revision both target paths were confirmed absent before recovery, so no existing durable receipt was overwritten.

## 5. Byte-exact recovery implementation

Recovery branch:

```text
release/simcore-v07011-receipt-recovery-20260909
base = 19e02943b49054ad76781f7e63952dac5f67ec12
head = 27b46100e541dea7b560261aa74938f0a36be89e
```

Pre-PR compare proved exactly two added paths and no unexpected third file:

```text
candidate receipt = +20 / exact path only
spec shadow       = +36 / exact path only
unexpected path   = NONE
```

Branch read-back proved exact original blob identity before PR creation:

```text
candidate receipt = 2e288a6c8d024b018c79e985a417aa203ceaa0ae / EXACT
spec shadow       = 669289a7c3bcb51a8f0c16086751e1eba1dc5123 / EXACT
```

Recovery PR:

```text
#1955 state(simcore): recover exact v0.70.11 candidate receipt
head = 27b46100e541dea7b560261aa74938f0a36be89e
```

Permanent SimCore CI:

```text
run      = 34317017968
Verify   = 102355259419 / SUCCESS
Required = 102355439527 / SUCCESS
```

The trusted-lane/self-change boundary also completed successfully before the stable Required aggregator passed.

Exact-head protected-main merge:

```text
main = f6a12b67e2093ea95d47f742e78d1c6d6ac0a688
```

## 6. Durable main read-back

After merge, both durable `main` files were fetched again from the exact merged revision.

Observed blobs:

```text
products/simcore/releases/candidate-receipts/simcore-v0.70.11-intent-03.json
  = 2e288a6c8d024b018c79e985a417aa203ceaa0ae

products/simcore/releases/spec-shadows/simcore-v0.70.11-new-03.json
  = 669289a7c3bcb51a8f0c16086751e1eba1dc5123
```

Both are byte-identical to the original failed receipt commit `df4b3bcfa02b2dfceabce11621243555ef8004a1`.

Therefore:

```text
RECEIPT_DURABILITY = PASS
SPEC_SHADOW_DURABILITY = PASS
BYTE_EXACT_RECOVERY = PASS
MANUAL_RECEIPT_RECONSTRUCTION = NONE
```

## 7. Production neutrality

Post-recovery release authority was re-read directly:

```text
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
production      = v0.70.10 Host-Local Telemetry Set Cost Attribution
runtime mutation = NONE
release mutation = NONE
```

The v0.70.11 candidate also remained unchanged:

```text
candidateCommit      = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
candidateReleaseBlob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

## 8. Completion verdict

All frozen completion criteria are satisfied:

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
LIVE_PASS                     = NOT INFERRED
```

Final classification:

```text
#1949 CANDIDATE_RECEIPT_DURABILITY_BLOCKER = REPAIRED
#1949 = ELIGIBLE TO CLOSE
CANDIDATE_REMATERIALIZATION = NOT REQUIRED
NEXT RELEASE STEP = RESUME ONLY FROM EXPLICITLY AUTHORIZED CANDIDATE-APPROVAL/PROMOTION CONTRACT
```

Closing #1949 does not itself authorize publication or human terminal evidence. The durable candidate receipt has authority `CANDIDATE_RECEIPT_ONLY`; the spec shadow remains `SHADOW_ONLY`.

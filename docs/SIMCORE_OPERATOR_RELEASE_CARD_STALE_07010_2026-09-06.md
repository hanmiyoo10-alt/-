# SimCore Operator Release Card Stale v0.69 Content under v0.70.10

Date: 2026-09-06 KST
Status: **FIX · PRODUCTION OPERATOR UI METADATA · NON-HOTPATH**
Tracking: `#1657`
Production: `release-simcore@ecc55f026315c6482c34d267aba2adb97527cdbc`
Production blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`

## Finding

Fresh production source readback shows:

```text
OPERATOR_RELEASE_CARD.version = 0.70.10
OPERATOR_RELEASE_CARD.name = Host-Local Telemetry Set Cost Attribution
```

But the same current production card still contains:

```text
scenario = 06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT
summary = v0.69.0 State Reconcile / Kernel Inversion bullets
live-check prose = Version 0.69.0 / State Reconcile validation instructions
```

Therefore the current operator-facing update card can identify itself as v0.70.10 while instructing the operator to validate an unrelated v0.69.0 release contract.

## Classification

```text
RUNTIME_DIAGNOSTIC_CORRECTNESS = NOT IMPACTED BY THIS FINDING
ASSISTANT_VISIBLE_OUTPUT_CORRUPTION = NONE OBSERVED
OPERATOR_RELEASE_GUIDANCE = STALE
CLASSIFICATION = FIX / PRODUCTION UI METADATA / NON-HOTPATH
CURRENT_V07010_LIVE_DIAGNOSTIC_COLLECTION = MAY CONTINUE USING REPO CONTRACT
NEXT_PRODUCT_ADVANCEMENT = HOLD UNTIL REPAIRED OR EVIDENCE-RECLASSIFIED
```

The authoritative v0.70.10 live contract remains the repository release design/evidence, not this stale card.

## Repair boundary

Do not repair this inside the Lens-3 docs-only transaction.

Any source repair must follow the normal SimCore runtime workflow:

```text
repo design/evidence
-> dedicated implementation branch
-> static/CI verification
-> release-simcore publication
-> real long-chat validation
-> main documentation / continuity sync
```

The repair must keep `plugins/simcore/latest.js == plugins/simcore/install.js` and must not be mixed with storage, telemetry, mirror, cache or other performance optimization work.

## Production boundary

This record itself makes no runtime or release mutation.

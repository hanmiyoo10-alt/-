# SimCore Release System R2.7 Implementation Authorization

Date: 2026-08-29 KST

Status: **IMPLEMENTATION AUTHORIZED · ACTIVATION NOT AUTHORIZED**

Authority basis:
- user instruction: implement the R2.7 design based on R2.6 feedback;
- frozen design: `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN.md`;
- prerequisite admin convergence: `docs/SIMCORE_RELEASE_SYSTEM_V2_6_FIRST_USE_ACTIVATION_CONVERGENCE_2026-08-29.md`.

Authorized implementation scope:

```text
shared root-aware filesystem contract
pure/read-only recovery decision function
thin workflow diagnostic/routing integration
evidence-derived operational proof validation/derivation
permanent regression and classifier coverage
implementation closure/status projection
```

Forbidden in this transaction:

```text
runtime/plugin mutation
release-simcore mutation
second publisher
second main writer
background auto-retry
automatic HUMAN_EVIDENCE
automatic PR merge
new product lifecycle state
clean-path PR increase
```

Activation/first clean operational use remains a separate later evidence boundary. Implementation may be merged after permanent CI qualification because the added logic is control-plane validation/routing only and does not itself acquire publication authority.

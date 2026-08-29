# SimCore v0.69.0 Architecture Contract Selector Path Canonicalization Fix

Date: 2026-08-30 KST

Status: **OBSERVED · FIX · PRODUCTION UNCHANGED**

Classification: **FIX · TEST/SELECTOR PATH CANONICALIZATION · NON_RUNTIME**

## Trigger

PR #870 first qualification run:

```text
SimCore CI run 33264248771
Verify job    99131363797
GATE_CI_SELF  PASS
GATE_STATIC   PASS
GATE_ARCH     PASS
GATE_REGRESSION FAIL
```

Exact regression failure:

```text
architecture-contract-select-v06900:
v0.69 exact sidecar contract:
expected="config/simcore-architecture-v06900-candidate.json"
actual="config/simcore-architecture-v2.json"
```

The real PR source under test was still exact v0.68 production, so its architecture selection correctly remained the default current-production contract. The failure came only from the new deterministic selector regression fixture for synthetic v0.69 source.

## Root cause

The first selector implementation derived the sidecar identifier with:

```js
String(version).replaceAll('.', '')
```

which produced:

```text
0.69.0 -> 0690
```

but SimCore release/document identifiers use two digits for minor and patch coordinates:

```text
0.69.0  -> 06900
0.68.0  -> 06800
0.64.11 -> 06411
```

Therefore the selector looked for a nonexistent:

```text
config/simcore-architecture-v0690-candidate.json
```

and correctly fell back to the current production contract.

## Repair

Canonicalize semantic versions as:

```text
<major><minor:02><patch:02>
```

before building the candidate-sidecar path.

Add deterministic assertions for:

```text
0.69.0  -> config/simcore-architecture-v06900-candidate.json
0.64.11 -> config/simcore-architecture-v06411-candidate.json
```

The fail-closed latest/install version agreement and default-contract fallback remain unchanged.

## Safety

```text
runtime mutation        NONE
release-simcore mutation NONE
publisher mutation      NONE
GATE_ARCH weakening     NONE
production exposure     NONE
```

This is not a candidate/runtime defect. It is a bounded CI selector naming defect discovered before v0.69 runtime implementation resumed.

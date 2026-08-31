# SimCore S3-3 Session Surface Result Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 PUBLICATION/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S3 DIAGNOSTICS + TELEMETRY BOOKKEEPING / PURE SESSION-SURFACE RESULT CONSTRUCTION DEDUPE**

## 1. Authority

Governed by:
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_API_COMPATIBILITY_SEAM_SLIMMING_CLOSURE_2026-08-31.md`
- `docs/SIMCORE_S3_1_RUNTIME_TELEMETRY_CLAIM_SELECTION_PROBE_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md`
- `docs/SIMCORE_S3_2_SESSION_CANDIDATE_RESULT_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md`

Current main includes qualified S3-2 at merge `b96aa4cf3de4c1c33883407d6df7414522a0c880`.

Production remains `release-simcore` v0.70.1 at `861100f4771967aa5b8ab8811d06f11702c0d3ff`; `latest.js` and `install.js` remain byte-identical. The cumulative simplification target remains v0.70.3. No S1-S6 checkpoint publishes independently.

## 2. Source-grounded target

Exact owner:

```text
module = runtime-telemetry
function = inspectSessionSurface(root, label)
```

Current terminal results all use the same frozen shape:

```text
Object.freeze({ label, status, storage })
```

with five statuses:

```text
ROOT_ABSENT
ACCESS_ERROR
STORAGE_ABSENT
METHODS_INCOMPLETE
USABLE
```

Only the field values vary. The actual `root.sessionStorage` access and method-capability checks are not duplicate bookkeeping and remain frozen.

## 3. Exact current mappings

```text
ROOT_ABSENT       -> { label, status: 'ROOT_ABSENT',       storage: null }
ACCESS_ERROR      -> { label, status: 'ACCESS_ERROR',      storage: null }
STORAGE_ABSENT    -> { label, status: 'STORAGE_ABSENT',    storage: null }
METHODS_INCOMPLETE-> { label, status: 'METHODS_INCOMPLETE',storage: null }
USABLE            -> { label, status: 'USABLE',            storage }
```

Every result is frozen.

## 4. Proposed mechanical delta

Introduce one private helper inside `runtime-telemetry`:

```js
function sessionSurfaceResult(label, status, storage = null) {
  return Object.freeze({ label, status, storage });
}
```

Replace only the five repeated result constructions in `inspectSessionSurface()` with helper calls carrying the exact same already-resolved values.

The helper performs no property access, exception handling, capability testing, transport selection, storage mutation or diagnostics mutation.

## 5. Frozen behavior

Across S3-3 preserve exactly:

```text
if (!root) branch position
root.sessionStorage property access count and location
ACCESS_ERROR catch behavior
storage == null test
getItem/setItem/removeItem capability test and order
all five status strings
label passthrough
storage null/non-null mapping
Object.freeze immutability
resolveSessionCandidates body and WINDOW/GLOBAL_THIS ordering
same-object de-duplication semantics
lastSurfaceProbe semantics
surfaceDiagnostics behavior
publishPrepared behavior
claim behavior
S3-1 recordClaimSelection behavior
S3-2 sessionCandidateResult / takeSessionCandidate behavior
Host-local mailbox and claimHostLocalOnce semantics
capsule schema / TTL / size limits
telemetry durability authority
provider cache = UNVERIFIED
```

## 6. Non-goals

Do not:

```text
change sessionStorage root discovery
change WINDOW/GLOBAL_THIS precedence
change capability requirements
change relation classification
combine surface and candidate result helpers
move or catch new exceptions
add I/O, await, retry, polling or timers
change Host-local behavior
change diagnostics public shape
export the helper
add a module or require edge
optimize cold Host-local latency
change persistent state/schema or product semantics
```

## 7. Cumulative construction

The self-contained builder must materialize:

```text
P0 = exact v0.70.1 production
P1 = S1-1
P2 = S2-1
P3 = S2-2
P4 = S2-3
P5 = S3-1
P6 = S3-2
P7 = S3-3 session-surface result convergence
```

Only P6 -> P7 belongs to S3-3.

## 8. P6 -> P7 differential proof

Fail closed unless:

```text
module inventory unchanged
require graph unchanged
every non-runtime-telemetry module byte-identical
runtime-telemetry delta = helper insertion + five result substitutions only
sessionSurfaceResult definition count = 1
helper is private and not exported
inspectSessionSurface has exactly one root.sessionStorage access
status sequence/source order remains ROOT_ABSENT -> ACCESS_ERROR -> STORAGE_ABSENT -> METHODS_INCOMPLETE -> USABLE
capability expression remains byte-identical
resolveSessionCandidates body byte-identical
surfaceDiagnostics body byte-identical
publishPrepared / publish / publishWithHostLocal bodies byte-identical
claim / validate bodies byte-identical
recordClaimSelection body byte-identical
sessionCandidateResult and takeSessionCandidate bodies byte-identical
getHostLocalTelemetryStoreOnce / claimHostLocalOnce bodies byte-identical
telemetry constants unchanged
side-effect marker counts unchanged
latest.js == install.js
node --check passes
```

Add a pure differential harness comparing direct old surface result construction with the new helper for all five statuses, both labels, null and representative storage objects. Require deep shape equality, identical property order and frozen results.

## 9. Hard stops

Preserve evidence and stop if:

```text
sessionStorage access count/order changes
exception boundary changes
method capability semantics change
WINDOW/GLOBAL_THIS ordering changes
relation classification changes
new async/I/O is needed
Host-local path must change
new export/module/require edge is required
candidate persists during PR-dry
request-free final CI becomes doc-only NOOP
```

## 10. Validation posture

Temporary PR-dry request, if used:

```text
intent = simcore-v0.70.3-intent-06
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
release authority = none
```

PR-dry requires:

```text
GATE_CI_SELF
GATE_PR1_DRY
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
```

After qualification, delete the request and require fresh request-free substantive CI with CI_SELF/STATIC/ARCH/REGRESSION before merge.

## 11. Live posture and disposition

```text
PRE_S7_DEPLOYMENT = NONE
PRE_S7_BROAD_REAL_LONG_CHAT = NONE
S3_3_DESIGN = FROZEN
DELTA = PRIVATE sessionSurfaceResult + FIVE MECHANICAL SUBSTITUTIONS
SESSION STORAGE SEMANTICS = FROZEN
HOST_LOCAL = FROZEN
PROVIDER CACHE = UNVERIFIED
release-simcore = v0.70.1 unchanged
NEXT = MERGE DESIGN AUTHORITY, THEN IMPLEMENT P7
```

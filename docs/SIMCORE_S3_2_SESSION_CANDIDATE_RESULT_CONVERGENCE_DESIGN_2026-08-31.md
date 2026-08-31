# SimCore S3-2 Session Candidate Result Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 PUBLICATION/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S3 DIAGNOSTICS + TELEMETRY BOOKKEEPING / PURE SESSION-CANDIDATE RESULT CONSTRUCTION DEDUPE**

## 1. Program authority

Governed by:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_API_COMPATIBILITY_SEAM_SLIMMING_CLOSURE_2026-08-31.md`
- `docs/SIMCORE_S3_1_RUNTIME_TELEMETRY_CLAIM_SELECTION_PROBE_CONVERGENCE_DESIGN_2026-08-31.md`
- `docs/SIMCORE_S3_1_RUNTIME_TELEMETRY_CLAIM_SELECTION_PROBE_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md`

Current main authority includes S3-1 at:

```text
main merge = cd46e3b0def46c8f130f315cf5bee0bfdb56ce6c
S3_1 = QUALIFIED INTERNAL CHECKPOINT
```

Production remains:

```text
release-simcore version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest.js == install.js = YES
```

The S-series cumulative construction target remains v0.70.3. S1-S6 do not publish independently. Broad real-long-chat validation remains S7 authority.

The parked v0.70.2 Cache Observer Cold-Path Attribution program remains untouched.

## 2. Source-grounded target

Exact production owner:

```text
module = runtime-telemetry
function = takeSessionCandidate(candidate)
transport = browser sessionStorage handoff candidate
```

Current function performs the following fixed sequence:

```text
1. null candidate -> null
2. candidate.storage.getItem(SESSION_KEY)
3. read failure -> frozen failed result
4. null raw -> frozen empty result
5. candidate.storage.removeItem(SESSION_KEY), best effort
6. serialized char count
7. oversize test against MAX_SESSION_CHARS
8. JSON.parse(String(raw))
9. parse success -> frozen available result
10. parse failure -> frozen malformed result
```

The function constructs the same four-field result shape in five terminal status paths:

```text
Object.freeze({
  root: candidate.label,
  status,
  capsule,
  serializedChars,
})
```

Statuses are:

```text
failed
empty
oversize
available
malformed
```

Only the field values differ. Storage access, consume behavior and parsing policy are not duplicate bookkeeping and are outside the simplification target.

## 3. Exact current result mapping

The implementation must preserve the following mappings exactly.

### Read failure

```text
root = candidate.label
status = failed
capsule = null
serializedChars = 0
```

### Empty session slot

```text
root = candidate.label
status = empty
capsule = null
serializedChars = 0
```

### Oversize serialized capsule

```text
root = candidate.label
status = oversize
capsule = null
serializedChars = String(raw).length
```

### Available parsed capsule

```text
root = candidate.label
status = available
capsule = JSON.parse(String(raw))
serializedChars = String(raw).length
```

### Malformed serialized capsule

```text
root = candidate.label
status = malformed
capsule = null
serializedChars = String(raw).length
```

The null-candidate result remains exactly:

```text
null
```

## 4. Proposed mechanical delta

Introduce one private local helper inside `runtime-telemetry`:

```js
function sessionCandidateResult(root, status, capsule = null, serializedChars = 0) {
  return Object.freeze({ root, status, capsule, serializedChars });
}
```

The helper receives already-resolved values. It performs no I/O, parsing, validation, status derivation or fallback logic.

Replace only the five repeated frozen object constructions in `takeSessionCandidate()` with calls such as:

```text
sessionCandidateResult(candidate.label, 'failed', null, 0)
sessionCandidateResult(candidate.label, 'empty', null, 0)
sessionCandidateResult(candidate.label, 'oversize', null, serializedChars)
sessionCandidateResult(candidate.label, 'available', parsedCapsule, serializedChars)
sessionCandidateResult(candidate.label, 'malformed', null, serializedChars)
```

For the available branch, parsing must remain at the same control-flow location. A temporary local parsed value is allowed only if needed to feed the helper without moving `JSON.parse` across any storage operation or status boundary.

Preferred compact form, if mechanically exact:

```js
try { return sessionCandidateResult(candidate.label, 'available', JSON.parse(String(raw)), serializedChars); }
```

## 5. Ownership before and after

Before:

```text
runtime-telemetry.takeSessionCandidate
  owns session candidate read/consume/size/parse policy
  + repeats result-object assembly in five terminal paths
```

After:

```text
runtime-telemetry.takeSessionCandidate
  owns exactly the same session candidate read/consume/size/parse policy

runtime-telemetry.sessionCandidateResult (private)
  owns only the repeated four-field frozen result construction
```

No semantic owner moves between modules or layers.

## 6. Frozen transport and consume boundaries

S3-2 must preserve exactly:

```text
candidate null handling
SESSION_KEY
resolveSessionCandidates call behavior
WINDOW / GLOBAL_THIS ordering
candidate.storage.getItem call count and order
candidate.storage.removeItem call count and order
best-effort remove failure handling
consume-before-adopt behavior
String(raw).length measurement point
MAX_SESSION_CHARS threshold
JSON.parse call count and position
all five lowercase status strings
root attribution from candidate.label
capsule null/non-null behavior
serializedChars values
Object.freeze result immutability
claim() summaryStatus logic
claim() first/second candidate ordering
sessionCandidates array construction
validate() transport precedence
S3-1 recordClaimSelection behavior
Host-local fallback behavior
claimHostLocalOnce call order/count
getHostLocalTelemetryStoreOnce call order/count
Host-local mailbox key and consume semantics
publish / publishWithHostLocal behavior
capsule schema / source compatibility / TTL / size rules
telemetry durability authority
provider cache = UNVERIFIED
```

## 7. Explicit non-goals

Do not:

```text
combine takeMemory with takeSessionCandidate
change sessionStorage root discovery
change read/remove exception handling
change malformed or oversize cleanup behavior
add retries or polling
change SESSION_KEY or HOST_LOCAL_KEY
change MAX_SESSION_CHARS or MAX_SERIALIZED_CHARS
change host-local fallback timing
change capsule validation
change transport precedence
change diagnostics wording or public surface unless mechanically required by the helper
export the helper
create a new module
add a require edge
optimize cold Host-local latency
change provider-cache claims
change persistent Core state/schema
change Prompt / Community / Representation / State semantics
```

## 8. Cumulative construction contract

The self-contained cumulative builder must materialize explicit stages:

```text
P0 = exact v0.70.1 production
P1 = P0 + S1-1 runtime-cache FNV convergence
P2 = P1 + S2-1 dead Prompt render seam retirement
P3 = P2 + S2-2 dead Session re-export retirement
P4 = P3 + S2-3 runtime utility dead export retirement
P5 = P4 + S3-1 claim-selection probe convergence
P6 = P5 + S3-2 session candidate result convergence
```

Stage ownership:

```text
P0 -> P1 = frozen S1-1 invariants
P1 -> P2 = frozen S2-1 invariants
P2 -> P3 = frozen S2-2 invariants
P3 -> P4 = frozen S2-3 invariants
P4 -> P5 = frozen S3-1 invariants
P5 -> P6 = S3-2 only
```

No earlier cumulative delta may be attributed to S3-2.

## 9. P5 -> P6 differential proof contract

Fail closed unless all are true:

```text
module inventory unchanged
require graph unchanged
every module except runtime-telemetry byte-identical
runtime-telemetry delta equals helper insertion + five result-construction substitutions only
sessionCandidateResult exists exactly once
sessionCandidateResult is private and not exported
five terminal status sites remain in takeSessionCandidate
null-candidate direct return remains unchanged
getItem statement remains byte-identical and before every non-null result
removeItem statement remains byte-identical and after non-null raw read
serializedChars assignment remains byte-identical and after removeItem attempt
MAX_SESSION_CHARS comparison remains byte-identical
JSON.parse expression remains exactly once in takeSessionCandidate
status order remains failed -> empty -> oversize -> available -> malformed in source/control-flow order
claim body remains byte-identical
resolveSessionCandidates body remains byte-identical
inspectSessionSurface body remains byte-identical
validate body remains byte-identical across P5 -> P6
recordClaimSelection body remains byte-identical
claimHostLocalOnce body remains byte-identical
getHostLocalTelemetryStoreOnce body remains byte-identical
publish and publishWithHostLocal bodies remain byte-identical
telemetry constants remain unchanged
await/timer/storage/network/chat-write marker counts unchanged
latest.js == install.js
node --check passes
```

## 10. Pure result-equivalence harness

Add a bounded Node differential harness comparing old direct object construction with the proposed helper.

Cover all five statuses and representative values:

```text
root = WINDOW / GLOBAL_THIS
status = failed / empty / oversize / available / malformed
capsule = null / representative metadata-only object
serializedChars = 0 / small positive / 16384 / 16385
```

Require:

```text
JSON/deep shape equality
same property order
same root/status/capsule/serializedChars values
Object.isFrozen(result) = true
```

This pure harness supplements, but does not replace, structural proof that storage and parse statements remain in their original order.

## 11. Side-effect invariants

Across P5 -> P6 the counts and relative placement of side-effect markers must remain unchanged, including:

```text
await
setTimeout
setInterval
pluginStorage
setChat
fetch
XMLHttpRequest
sessionStorage getItem/setItem/removeItem access sites
Host-local getItem/setItem/removeItem access sites
```

S3-2 introduces no new side effects.

## 12. Validation-system posture

The cumulative builder must be self-contained in the PR-dry sandbox.

Direct `products/simcore/tooling/build-*.py` changes are validation-relevant through the repaired `CI_SELF + HARNESS` classifier path.

A temporary PR-dry request may be used only to exercise `GATE_PR1_DRY`.

If used:

```text
intent = simcore-v0.70.3-intent-05
candidate persistence = forbidden
release authority = none
request must be deleted after PR-dry qualification
fresh request-free exact-head substantive CI required before merge
```

Expected PR-dry gates:

```text
GATE_CI_SELF
GATE_PR1_DRY
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
```

Expected final request-free gates:

```text
GATE_CI_SELF
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
```

A successful doc-only NOOP is not sufficient final qualification.

## 13. Hard stops

Stop and preserve evidence as WATCH / DEFER / FIX / BLOCKER before proceeding if any of the following appears:

```text
storage read/remove order changes
remove failure handling changes
JSON.parse moves before consume attempt
session root ordering changes
status spelling/case changes
serializedChars semantics change
capsule acceptance behavior changes
claim or validate transport logic changes
Host-local path becomes involved
new async boundary or I/O is needed
new module/export/require edge is needed
runtime latency optimization is attempted
candidate persists during PR-dry
final request-free CI becomes NOOP
```

## 14. Live posture

```text
PRE_S7_DEPLOYMENT = NONE
PRE_S7_BROAD_REAL_LONG_CHAT = NONE
```

S3-2 receives static, CI and differential internal qualification only.

Real long-chat regression for the cumulative v0.70.3 runtime remains S7 authority.

## 15. Final design disposition

```text
S3_2_DESIGN = FROZEN
TARGET = runtime-telemetry.takeSessionCandidate repeated frozen result construction
DELTA = ONE PRIVATE sessionCandidateResult HELPER + FIVE MECHANICAL SUBSTITUTIONS
SESSION STORAGE READ/CONSUME/PARSE SEMANTICS = FROZEN
HOST_LOCAL = FROZEN
PROVIDER CACHE = UNVERIFIED
release-simcore = v0.70.1 unchanged
NEXT = MERGE DESIGN AUTHORITY, THEN IMPLEMENT P6 CUMULATIVE CHECKPOINT
```

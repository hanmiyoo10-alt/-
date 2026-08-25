# SimCore M2-4C — Runtime Mirror Observation Receipt Contract

Status: `DESIGN FROZEN PROVISIONALLY · PRE-M2-3 CONTRACT · MUST REBASE AGAINST POST-M2-3 SOURCE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority while this contract is recorded: `release-simcore` v0.64.7.

Parent design:
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`

Primary references:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- current `release-simcore` v0.64.7 `runtime-mirror`
- current `output-compat` Fresh-confirmation candidate builders
- current Representation bounded registry

## 1. Purpose

Freeze the boundary between host observation, compatibility interpretation, representation provenance, and safe mirror transport.

The core problem is that current v0.64.7 Runtime Mirror does more than observe Fresh and enforce transport guards. It also interprets output-compat candidate matches into policy-shaped meanings such as:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

and uses that interpretation to promote a Fresh fingerprint into the live Session canonical/trusted output identity before continuing mirror transport.

This is currently validated behavior, not a correctness defect.

M2-4C classifies it as ownership debt:

```text
RUNTIME_MIRROR_CONFIRMATION_POLICY_INTERPRETATION
= WATCH_EXTRACTION
= MECHANICAL OWNERSHIP DEBT
= BEHAVIOR MUST REMAIN EQUIVALENT
```

## 2. Target identity

Runtime Mirror target:

```text
RUNTIME_MIRROR
= HOST_FRESH_OBSERVER
+ STRICT_GUARD
+ EXACT_MATCH_EXECUTOR
+ MIRROR_TRANSPORT
+ BOUNDED_OBSERVATION_RECEIPT_PUBLISHER
```

Runtime Mirror is NOT:

```text
OUTPUT_COMPAT_POLICY_INTERPRETER
REPRESENTATION_TAXONOMY_OWNER
CANONICALIZATION_POLICY_OWNER
RECOVERY_POLICY_OWNER
```

The target processing model is:

```text
OBSERVE
→ INTERPRET
→ APPLY
→ RECORD
```

with different owners for each phase.

## 3. Current v0.64.7 ownership shape

Current Runtime Mirror receives:

```text
snapshot canonical fingerprint
snapshot host-raw fingerprint
freshEnvelopeConfirmation
safeEnvelopeBoundaryConfirmation
```

It then:

```text
reads Fresh from host
→ fingerprints Fresh
→ exact-compares Fresh against canonical / host-raw
→ exact-compares Fresh against output-compat candidate fingerprints
→ selects boundary candidate(s)
→ derives FRESH_CONFIRMED_SUFFIX / BOUNDARY_CONFIRMED_SUFFIX / SAFE_BOUNDARY_CONFIRMED
→ decides representationConfirmed
→ promotes actual Fresh fingerprint to snapshot/live Session canonical identity when confirmed
→ blocks OUTPUT_MISMATCH otherwise
→ runs transport guard
→ performs host mirror write
→ publishes a bounded probe to Representation registry
```

The exact fingerprint comparisons are legitimate Runtime Mirror work.

The semantic candidate interpretation and canonical acceptance decision are not naturally Runtime Mirror-owned.

## 4. Constitutional split

### 4.1 Runtime Mirror owns facts

Runtime Mirror may know and publish only facts directly established by host observation and exact comparison.

Examples:

```text
Fresh fingerprint observed
Fresh == canonical fingerprint
Fresh == host-raw fingerprint
Fresh == candidate id X fingerprint
Fresh matched exactly N opaque candidates
runtime epoch still current
location still current
scheduled sequence still latest
output slot still expected
mirror write attempted / skipped / committed
bounded timing
```

### 4.2 Output Compat owns candidate meaning

Output Compat owns:

```text
why a candidate exists
whether it is a raw suffix candidate
whether it is a CR/LF boundary-normalized candidate
whether it is a safe-envelope structural boundary candidate
whether an exact Fresh match is sufficient to accept that candidate
which compatibility policy label applies
what bounded diagnostic compatibility metadata should be exposed
```

Therefore these labels must not be independently invented by Runtime Mirror:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

They may remain externally stable for compatibility/diagnostics, but their producing owner becomes Output Compat.

### 4.3 Representation owns relation/provenance

Representation owns the retained bounded relation between:

```text
CANONICAL
HOST_RAW
FRESH_CHAT
accepted canonical-equivalent representation
```

Runtime Mirror may pass observation facts to Representation, but must not maintain a second provenance ledger or own the relation taxonomy.

### 4.4 Session owns accepted identity anchor only

When Output Compat accepts a Fresh-matched candidate as canonical-equivalent, Session may receive the resulting trusted identity update because it owns current per-chat application identity.

Session does not decide why the candidate was acceptable.

## 5. Candidate observation plan

Output Compat should prepare a bounded candidate observation plan before Deferred Mirror runs.

Conceptual shape only; exact API names remain provisional until post-M2-3 rebase:

```text
CandidateObservationPlan {
  schemaVersion
  planId
  candidates: [
    {
      candidateId
      fingerprint
    }
  ]
}
```

Rules:

```text
candidateId is opaque to Runtime Mirror
candidateId must not require Runtime Mirror to parse semantic meaning
candidate count remains tightly bounded
fingerprints only; no candidate body retention
no raw output body is copied into the plan
no Fresh body is stored
```

Output Compat may retain its own ephemeral mapping from candidateId to semantic metadata needed for later interpretation.

The current bounded candidate families remain behaviorally frozen. M2-4C does not add more normalization or candidate generation.

## 6. Runtime Mirror observation receipt

Target bounded receipt:

```text
MirrorObservationReceipt {
  schemaVersion
  outIndex
  locationKey
  runtimeEpoch
  scheduleSequence
  observationStatus

  canonicalFingerprint
  hostRawFingerprint
  freshFingerprint

  baseMatch
  matchedCandidateIds
  candidateMatchCount

  guardStatus
  writeStatus

  observedAt
  finishedAt
  chatLoadMs
  prepareMs
  setChatMs
  totalMs
}
```

### 6.1 `baseMatch`

Allowed observation-only values:

```text
CANONICAL_EXACT
HOST_RAW_EXACT
NONE
UNKNOWN
```

These labels describe direct equality only. They do not describe compatibility policy.

### 6.2 `matchedCandidateIds`

Rules:

```text
exact fingerprint equality only
opaque ids only
no semantic policy labels
no body excerpts
bounded candidate count
zero / one / multiple all preserved explicitly
```

Runtime Mirror must not resolve an ambiguous multiple match by guessing.

### 6.3 `observationStatus`

Observation/transport statuses may remain Runtime-owned, for example:

```text
OBSERVED
NO_ASSISTANT
NO_FRESH
STALE_DROPPED
SUPERSEDED
GUARD_DROPPED
OUTPUT_MISMATCH
COMMITTED
SKIPPED
```

These describe runtime execution outcomes rather than semantic compatibility meaning.

## 7. Interpretation contract

After observation, Output Compat receives:

```text
CandidateObservationPlan
+
MirrorObservationReceipt
```

and returns a bounded interpretation result.

Conceptual shape:

```text
OutputCompatObservationDecision {
  accepted
  acceptedCandidateId
  canonicalFingerprint
  compatibilityStatus
  compatibilityPolicy
  compatibilitySource
  boundaryKind
  boundaryDeltaChars
  persistentMutation
}
```

Rules:

```text
accepted = true only under behavior-equivalent existing v0.64.7 conditions
canonicalFingerprint may become Fresh only when the existing confirmation contract would have promoted it
multiple opaque candidate matches fail closed unless Output Compat can prove the existing unique-match contract
persistentMutation remains NONE for these confirmation paths
no additional host read
no body retrieval
no relaxed normalization
```

The Output Compat result may preserve existing diagnostic labels such as:

```text
RECOVERED
FRESH_MISMATCH
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

but those labels originate from Output Compat.

## 8. Apply contract

Runtime Mirror remains responsible for safe application/transport sequencing.

Canonical ordering target:

```text
1. capture immutable scheduled snapshot identity
2. deferred task begins
3. pre-read guard
4. Fresh host read exactly once
5. compute Fresh fingerprint
6. exact-match base fingerprints + opaque candidates
7. construct bounded observation receipt
8. ask Output Compat interpretation owner for bounded decision
9. if decision accepts canonical-equivalent Fresh:
     update scheduled snapshot canonical fingerprint
     update live Session trusted identity only if expected outIndex/session identity still matches
10. if base is mismatch and no accepted candidate:
     OUTPUT_MISMATCH / no unsafe write
11. rerun strict guard
12. host mirror write if still safe
13. finalize transport status/timing
14. publish bounded representation observation
```

Important:

```text
Output Compat may decide acceptance.
Runtime Mirror still decides whether the asynchronous world is safe enough to APPLY that acceptance/write.
```

Policy approval never bypasses runtime staleness/location/sequence guards.

## 9. Guard invariants — frozen

M2-4C must preserve all existing Deferred Mirror safety gates.

At minimum:

```text
runtime epoch/currentness
latest scheduled sequence
location identity
expected output slot/index
snapshot/session identity
staleness/supersession rejection
post-interpretation guard recheck
```

Interpretation must occur within the same deferred transaction and must not create a new asynchronous window that allows stale acceptance to apply later.

No policy result may be cached across output slots or reused after sequence/location supersession.

## 10. Host-read invariant

Current architecture reuses one Deferred Mirror Fresh observation as the confirmation boundary.

M2-4C freezes:

```text
ONE MIRROR OPERATION
→ AT MOST ONE FRESH HOST READ
```

Output Compat and Representation must consume the fingerprint/receipt already produced by Runtime Mirror.

They must not perform a second Fresh read to interpret or verify it.

## 11. Raw-body invariant

Forbidden across the complete Observe → Interpret → Apply → Record path:

```text
raw Fresh retention
candidate body retention inside Runtime Mirror
copying Fresh body into canonical state
persistent representation body storage
unbounded output/history excerpts in receipts
```

Existing principle remains:

```text
Fresh is identity evidence, not a body source.
```

## 12. Representation receipt target

After the apply/transport outcome is known, Representation receives a bounded composition of:

```text
observation facts
+
accepted canonical identity if any
+
transport outcome
+
opaque or pass-through compatibility attribution if diagnostics require it
```

Representation should be able to retain provenance without depending on Runtime Mirror-generated compatibility-policy labels.

Long-term preferred relation input:

```text
original canonical fingerprint
host-raw fingerprint
fresh fingerprint
accepted canonical fingerprint
acceptedCanonicalEquivalent boolean
location/outIndex/status
```

This allows carryover classification to reason from identity relations rather than a hard-coded list of Output Compat policy names.

## 13. Secondary ownership debt discovered

Current Representation contains an `EXACT_PRIOR_MATCHES` list that includes Output Compat policy-shaped values:

```text
CANONICAL
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

This is not a current correctness defect.

M2-4C classifies it as:

```text
REPRESENTATION_OUTPUT_COMPAT_LABEL_COUPLING
= WATCH_EXTRACTION
= SECONDARY OWNERSHIP DEBT
```

Preferred post-M2-3/M2-4 direction:

```text
Representation classifies identity from accepted canonical-equivalence facts
rather than knowing every Output Compat policy label.
```

Do not change this before differential equivalence tests exist.

## 14. Diagnostic compatibility

M2-4C is not permission to break operator-facing diagnostics.

Existing useful outputs may remain byte/meaning compatible, including:

```text
Output provenance
Output representation
Envelope recovery
Envelope boundary
Safe-envelope reconcile
Safe-envelope boundary
Representation ownership
```

But the internal provenance of those fields changes:

```text
Runtime Mirror
→ host/transport facts

Output Compat
→ compatibility policy/status/boundary interpretation

Representation
→ identity/provenance relation

runtime-probe / OPS
→ rendering only
```

Diagnostic rendering must not become the hidden semantic owner.

## 15. Failure behavior

All uncertain states remain fail-closed for mutation and fail-open for runtime continuity where existing behavior does so.

Examples:

```text
candidate plan missing
→ base canonical/host-raw behavior only

multiple ambiguous candidate matches
→ no compatibility promotion

interpreter throws / returns malformed decision
→ no candidate promotion; preserve safe mismatch path

Session identity changed before apply
→ do not mutate Session identity

guard fails after interpretation
→ no host write

Representation receipt callback fails
→ do not retroactively make unsafe host mutation permissible
```

The extraction must not turn observability/provenance failure into a user-visible crash path.

## 16. Memory / lifecycle constraints

All M2-4C objects are bounded and output-scoped.

Forbidden:

```text
unbounded candidate registry
receipt accumulation in Runtime Mirror
raw body retention
Promise retention beyond deferred mirror task
new polling
new interval
new persistent schema
```

The existing bounded Representation ledger may remain owned by Representation.

## 17. Proposed dependency shape

Preferred physical direction after rebase:

```text
output-compat
  ├─ builds opaque candidate observation plan
  └─ interprets matched candidate ids

runtime-mirror
  ├─ receives plan by injection/argument
  ├─ observes Fresh + exact matches
  ├─ applies strict guards
  └─ emits receipt / uses bounded interpretation callback

representation
  └─ consumes bounded finalized identity/provenance facts

session
  └─ receives accepted trusted identity update only
```

Avoid creating direct upward dependencies from Core/Application into Runtime.

Runtime Mirror should not import Session policy or Representation taxonomy. Existing injection/callback style is preferred where it preserves architecture direction.

## 18. Differential equivalence matrix

Any future M2-4C implementation must prove at least these cases against the pre-extraction behavior:

```text
A. Fresh == canonical
   → same commit/write result

B. Fresh == host-raw
   → same commit/write result

C. Fresh == exact raw suffix candidate
   → same FRESH_CONFIRMED_SUFFIX result
   → same canonical identity promotion

D. Fresh == unique CR/LF boundary candidate
   → same BOUNDARY_CONFIRMED_SUFFIX result
   → same boundary telemetry

E. Fresh == unique safe-envelope boundary candidate
   → same SAFE_BOUNDARY_CONFIRMED result
   → same canonical identity promotion

F. Fresh matches no base/candidate
   → OUTPUT_MISMATCH
   → no unsafe mirror write

G. Fresh matches multiple candidates where uniqueness is required
   → no broadened acceptance

H. stale epoch after observation
   → stale drop / no mutation

I. newer sequence supersedes current mirror
   → superseded / no mutation

J. location/outIndex changes before apply/write
   → guard drop / no unsafe write

K. interpretation failure
   → fail closed to no candidate promotion

L. Representation callback failure
   → no unsafe mutation caused by provenance failure
```

## 19. Non-goals

M2-4C does NOT authorize:

```text
new envelope recovery semantics
new newline/whitespace normalization
new candidate families
new host reads
new mirror writes
new cache behavior
performance tuning
persistent schema changes
raw Fresh retention
Representation ledger expansion
M2-3 Edit Reconcile changes
Output Finalization extraction
Recovery facade retirement
warning-widget/UI work
release-system changes
```

## 20. Post-M2-3 mandatory rebase checklist

Before implementation design freezes:

```text
1. read actual post-M2-3 runtime-mirror source
2. verify M2-3 did not change Session trusted identity fields unexpectedly
3. enumerate all candidate-confirmation call sites
4. enumerate every current policy-shaped field produced inside Runtime Mirror
5. confirm exact current guard ordering
6. confirm Fresh host read count
7. confirm Session mutation ordering
8. confirm Representation registry input shape
9. freeze candidate-plan and observation-receipt schemas
10. build differential fixture matrix before physical extraction
```

## 21. M2-4C verdict

```text
RUNTIME_MIRROR_TARGET
= OBSERVE HOST FACTS
= EXACT MATCH OPAQUE FINGERPRINT CANDIDATES
= ENFORCE ASYNC SAFETY
= APPLY APPROVED RESULT
= WRITE MIRROR SAFELY
= EMIT BOUNDED RECEIPT

OUTPUT_COMPAT_TARGET
= OWN CANDIDATE MEANING
= OWN FRESH-CONFIRMATION ACCEPTANCE POLICY
= OWN COMPATIBILITY POLICY LABELS

REPRESENTATION_TARGET
= OWN CANONICAL/HOST_RAW/FRESH RELATION
= OWN BOUNDED PROVENANCE
= MOVE AWAY FROM OUTPUT-COMPAT LABEL COUPLING WHEN EQUIVALENCE IS PROVEN

SESSION_TARGET
= HOLD ACCEPTED TRUSTED OUTPUT IDENTITY
= DO NOT OWN WHY IT WAS ACCEPTED

NO IMPLEMENTATION YET
NO RUNTIME CHANGE
MUST REBASE AFTER M2-3
```

## 22. Next recommended artifact

Next design-only slice:

```text
M2-4D — Output Finalization Ownership Decision
```

Purpose:

Determine whether the current Session/output path around `finalizePreparedOutput`, Structure judgment, output-compat preparation, state commit, fingerprinting, persistence and mirror handoff is still one cohesive application responsibility or has become a justified standalone application service.

Do not extract merely because the path is large. Apply the module-cohesion rule and classify it as:

```text
COHESIVE_APPLICATION_HELPER
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

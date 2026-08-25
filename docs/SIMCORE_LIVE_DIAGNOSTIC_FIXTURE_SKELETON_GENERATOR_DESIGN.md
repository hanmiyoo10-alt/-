# SimCore Live Diagnostic → Fixture Skeleton Generator Design

Status: `DESIGN FROZEN · M-10 COMPLETE · PARKED FOR NR DIFFICULTY-3 TIER CLOSE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `M-10`
Domain: `DEVELOPER_TOOLING / TEST_EVIDENCE`
Importance: `4 / HIGH`
Design difficulty: `3 / MODERATE`
Design gate at selection: `NOW / NON_RUNTIME`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md`
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX_DESIGN.md`
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `products/simcore/tests/schema/fixture-v1.schema.json`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tooling/test.mjs`

---

## 1. Problem

SimCore repeatedly learns valuable regression facts from real long-chat diagnostics and dedicated live-evidence documents.

The current manual conversion path is roughly:

```text
real diagnostic / live specimen
→ forensic review
→ identify deterministic owner-produced facts
→ decide which facts are setup vs expected behavior
→ decide which facts must remain observational/unknown
→ identify an executable owner/surface
→ hand-design a minimized fixture
→ add it to an existing suite or design a new suite
```

The expensive and risky part is not writing JSON. It is deciding what **must not** become an assertion.

A live observation commonly contains a mixture of:

```text
deterministic SimCore-owned facts
Host/runtime identity facts
performance samples
model-rendered prose
warning/disposition metadata
unknown causality
adjacent-turn correlation
historical provenance
```

Blind conversion can accidentally freeze incidental values such as runtime generation, wall-clock timing, rendered wording, provider latency, or a one-off correlated state into a permanent regression expectation.

M-10 defines a bounded non-runtime generator that converts a **reviewed live evidence descriptor** into a **fixture skeleton** while structurally preserving uncertainty and preventing direct promotion into permanent fixture authority.

---

## 2. Product / operator value

Target workflow:

```text
live observation
→ preserve/review evidence under normal SimCore rules
→ prepare bounded reviewed live-fixture source descriptor
→ M-10 validates + projects
→ fixture-skeleton-v1
→ suite/owner review
→ minimized suite-specific fixture authored explicitly
→ ordinary fixture schema + harness verification
```

Expected value:
- reduce repetitive fixture-planning transcription;
- preserve live provenance without copying raw chat bodies;
- make `input facts / expected candidates / unknowns` explicit before fixture authoring;
- prevent accidental assertion of observational or external facts;
- make gaps in owner/surface resolution visible;
- make live-to-regression conversion easier without making tooling a second semantic authority.

---

## 3. Constitutional identity

Canonical principle:

```text
M-10 FIXTURE SKELETON GENERATOR
= REVIEWED-EVIDENCE → TEST-PLANNING PROJECTION
!= FIXTURE-V1 GENERATOR
!= TEST ORACLE
!= SEMANTIC OWNER
!= LIVE EVIDENCE AUTHORITY
!= SUITE REGISTRY WRITER
!= SOURCE/DYNAMIC ANALYZER
```

M-10 owns only:

```text
schema validation
bounded projection
assertion-boundary preservation
deterministic skeleton formatting
promotion-readiness diagnostics
```

It does not own the meaning of any SimCore behavior.

---

## 4. Existing authority boundaries preserved

### Evidence authority

Dedicated live evidence / WATCH / control documents remain authoritative for what happened and what was concluded.

`S-09 Evidence Index` and `S-12 Natural Evidence Corpus` remain navigation indexes only.

Future `S-04 Live Evidence Packet` remains a capture/transfer object only.

None of those indexes/packets independently authorize a test assertion.

### Semantic authority

The production module/contract that owns the behavior decides what the fact means.

Examples:

```text
Time       → narrative/current-time semantics
Lifecycle  → broadcast lifecycle eligibility
Reaction   → reaction-line normalization semantics
Structure  → structural validation result
Representation / Edit Reconcile → representation/edit classification
```

M-10 must never reimplement those rules.

### Test authority

Current permanent test authority remains:

```text
products/simcore/tests/registry.mjs
products/simcore/tests/schema/fixture-v1.schema.json
products/simcore/tests/suites/*.test.mjs
products/simcore/tooling/test.mjs
```

A generated M-10 skeleton is not accepted by this harness and must not pretend to be.

---

## 5. Why M-10 must NOT emit `fixture-v1`

Current `fixture-v1` requires:

```text
schemaVersion
id
suite
input
expected
meta.goldenGate
meta.coverageExpectation
```

Those fields mean the case already belongs to a concrete executable/hybrid suite and its expectations have been reviewed.

M-10 runs earlier.

Therefore:

```text
LIVE EVIDENCE
→ M-10
→ fixture-skeleton-v1

NOT

LIVE EVIDENCE
→ M-10
→ fixture-v1 / goldenGate=true
```

Frozen prohibition:

```text
M-10 MUST NOT write directly under:
products/simcore/tests/fixtures/

M-10 MUST NOT edit:
products/simcore/tests/registry.mjs
```

This is the primary anti-over-assertion boundary.

---

## 6. V1 input decision — reviewed descriptor, not rendered diagnostic parsing

M-10 v1 does **not** parse arbitrary copied diagnostic prose or Markdown evidence documents directly.

Reason:
- human labels can change;
- copied diagnostics may contain raw bodies;
- presentation text is not a stable machine contract;
- parsing narrative evidence would force M-10 to infer semantic roles;
- S-04 packet is not implemented yet and is not assertion authority anyway.

Frozen v1 input:

```text
Reviewed Live Fixture Source Descriptor v1
```

Conceptual file name when implementation is selected:

```text
fixture-source-v1.json
```

This descriptor is prepared only after the live observation has already been reviewed and preserved under normal SimCore evidence rules.

The descriptor is a bounded declaration of reviewed facts, not a second evidence document.

---

## 7. Source descriptor schema

Conceptual v1 shape:

```json
{
  "schemaVersion": 1,
  "kind": "simcore-live-fixture-source",
  "sourceId": "...",
  "productionVersion": "v0.64.x",
  "scenario": "...",
  "evidence": {
    "primary": "docs/... §...",
    "additional": []
  },
  "proofUnit": {
    "kind": "SINGLE|PAIRED|SEQUENCE",
    "observations": []
  },
  "target": {
    "suiteCandidate": "existing-suite-id|UNRESOLVED",
    "semanticOwner": "...|UNRESOLVED",
    "surfaceCandidate": "...|UNRESOLVED"
  },
  "inputFacts": [],
  "expectedCandidates": [],
  "protectedInvariants": [],
  "observationalFacts": [],
  "unknowns": [],
  "minimizationNeeds": []
}
```

Exact JSON property spelling may be finalized at implementation without changing the semantics frozen below.

---

## 8. `sourceId`

`sourceId` identifies the reviewed live evidence unit from which the skeleton is being planned.

Preferred source identities:

```text
S-12 specimen ID when the specimen is in the natural corpus
existing dedicated live-control ID / scenario ID
explicit bounded evidence-document local ID
```

Rules:
- no random UUID required;
- no raw body fingerprint as primary identity;
- if the source is represented by S-12, use the specimen ID but still follow the Primary Source to review actual evidence;
- S-12 row alone is insufficient assertion evidence.

---

## 9. Production provenance

`productionVersion` is required provenance.

It is **not** an expected fixture assertion by default.

Canonical distinction:

```text
source ran on v0.64.5
= provenance

fixture must always assert version == v0.64.5
= FORBIDDEN unless a version-parsing contract itself is the test subject
```

Likewise, release commit/blob/runtime generation are provenance references, not ordinary semantic expectations.

---

## 10. Proof-unit rule

One source descriptor must represent one coherent reviewed proof unit.

Allowed:

```text
SINGLE
PAIRED
SEQUENCE
```

Maximum initial v1 observation references:

```text
4
```

This supports bounded examples such as:

```text
representation mismatch → next-turn fast reconcile
B_END → first C → second ordinary C
reload generation A → generation B
```

Rules:
- unrelated observations may not be merged merely because they share a scenario;
- a sequence must already be treated as one proof unit by the source evidence;
- each observation reference is bounded identity/index metadata only;
- raw user/assistant bodies are forbidden.

---

## 11. Target suite candidate

`target.suiteCandidate` is either:

```text
an existing registry suite ID
or
UNRESOLVED
```

M-10 may validate that a caller-supplied existing ID is syntactically well formed, but v1 does not discover or auto-select a suite by parsing production source.

If the correct target suite is unresolved:

```text
suiteCandidate = UNRESOLVED
promotion blocker = SUITE_NOT_RESOLVED
```

If the reviewed evidence requires a new fixture family:

```text
NEW SUITE DESIGN REQUIRED
```

That is a separate design task.
M-10 must not auto-create a registry row or suite module.

---

## 12. Semantic owner and surface candidate

`semanticOwner` means the module/contract that owns the proposed expected behavior.

`surfaceCandidate` means the direct executable or hybrid surface a future suite may exercise.

Examples:

```text
semanticOwner = Reaction
surfaceCandidate = inspectCommentReactionLine

semanticOwner = Time
surfaceCandidate = enforceNarrativeCurrentTimeFloor
```

Rules:
- these are reviewer-supplied candidate mappings;
- M-10 does not perform a second dependency/source parser;
- M-10 does not infer ownership from diagnostic labels;
- unresolved ownership remains `UNRESOLVED`;
- actual promotion must re-check the mapping against current production source/contracts.

If owner is unresolved, no `expectedCandidate` may be considered promotion-ready.

---

## 13. Input facts

`inputFacts` describe deterministic preconditions/setup facts that a minimized test case may need.

Conceptual item:

```json
{
  "id": "...",
  "owner": "...",
  "fact": "...",
  "value": "bounded scalar/enum/number",
  "evidenceRef": "...",
  "stability": "DETERMINISTIC|CONTEXT_REQUIRED"
}
```

Examples of legitimate planning facts:

```text
prior representation = EXACT
current visible equals prior Fresh
broadcast locked = true
lifecycle request contains END marker
first current timestamp precedes stored floor
comment logical-unit kind = TOP
```

M-10 stores only bounded semantic facts.
It does not copy raw live bodies as fixture inputs.

---

## 14. Expected candidates

`expectedCandidates` are **candidate assertions**, not final fixture `expected` fields.

Each expected candidate must include at least:

```text
stable ID
semantic owner
surface candidate or owner result path
bounded expected result/value
primary evidence reference
assertion basis
```

Frozen `assertionBasis` vocabulary:

```text
OWNER_DETERMINISTIC
OWNER_REASON_CODE
OWNER_STATE_TRANSITION
OWNER_BOUNDED_COUNT
```

No other basis is allowed in v1 without design amendment.

Examples:

```text
Edit reconcile = REPRESENTATION_FAST_RECONCILED
snapshot disposition = UNCHANGED
reaction inspection result = PASS
failureReason = MULTIPLE
post-B_END eligibility = true
```

The generator validates the declaration and projects it into the skeleton.
It does not independently prove that the expectation is semantically correct.

---

## 15. Protected invariants

`protectedInvariants` capture relations that should survive fixture minimization.

Examples:

```text
current visible == prior Fresh
latest.js/install.js equality is unrelated and must not enter this fixture
first-C bridge applies once only
input logical unit remains multiline
embedded historical timestamp remains untouched
```

An invariant is not automatically an executable assertion.

It may instead be a fixture-authoring constraint.

Frozen distinction:

```text
EXPECTED CANDIDATE
= possible executable assertion

PROTECTED INVARIANT
= property the minimized reproduction must preserve
```

---

## 16. Observational facts

`observationalFacts` are intentionally non-assertable live context.

Examples:

```text
runtime generation
capture wall-clock
request→output generation gap
provider/cache status without trusted receipt
one observed Store latency
warning prose
human classification WATCH/FIX/BLOCKER
model wording
```

M-10 preserves them only as provenance/context when useful.

They must never be silently copied into `expectedCandidates`.

---

## 17. Unknowns intentionally unasserted

`unknowns` is a first-class required array, even when empty.

Purpose:

```text
record exactly what the live evidence did NOT establish
```

Conceptual entry:

```json
{
  "id": "...",
  "subject": "...",
  "reason": "CAUSE_UNESTABLISHED|OWNER_UNRESOLVED|SURFACE_UNRESOLVED|NONDETERMINISTIC|EVIDENCE_INSUFFICIENT|EXTERNAL_AUTHORITY"
}
```

Frozen rule:

```text
UNKNOWN
→ remains explicitly unasserted
```

M-10 must never convert an unknown into:

```text
false
0
NONE
PASS
CURRENT
```

merely to complete a fixture-looking object.

---

## 18. Minimization needs

Real live evidence often contains large or private text while the permanent fixture should use a tiny synthetic reproduction.

`minimizationNeeds` records the property that must be recreated without copying the raw body.

Examples:

```text
one TOP logical comment split over two lines
one reply with exactly two reaction tokens
one canonical timestamp earlier than floor
one Fresh/current equality relation with canonical mismatch
```

Rules:
- describe semantic shape, not raw content;
- no full user prose;
- no full assistant output;
- actual minimized test strings are authored during suite-specific fixture promotion;
- the generator does not perform semantic text reduction.

This is the privacy and overfitting boundary for parser/renderer-related specimens.

---

## 19. Assertion denylist

The following are not promotion-ready expected assertions in M-10 v1 unless the exact fact is itself the explicit contract under test:

```text
runtime generation ID
capturedAt / wall-clock
Git commit solely as provenance
production version solely as provenance
turn indices solely as provenance
random/host object identity
raw body fingerprint
raw prompt body
raw Fresh body
model-rendered prose wording
COMMUNITY prose content
Knowledge prose content
warning human text
WATCH / DEFER / FIX / BLOCKER disposition
provider cache hit/miss without trusted provider receipt
request→output model/gateway latency
one-off Store latency
arbitrary performance threshold
```

These may appear in provenance/observational fields when bounded, but not as ordinary expected behavior.

---

## 20. Disposition is not an assertion

Evidence governance classification remains separate from fixture semantics.

Example:

```text
source disposition = FIX
```

does **not** imply:

```text
expected = FAIL
```

A FIX specimen may produce a regression fixture whose expected behavior is the repaired PASS behavior, while the historical defect is represented by a minimized negative input and explicit expected owner result.

M-10 therefore treats:

```text
PASS / WATCH / DEFER / FIX / BLOCKER
```

as provenance/governance context only.

---

## 21. Frozen output — `fixture-skeleton-v1`

Conceptual output:

```json
{
  "schemaVersion": 1,
  "kind": "simcore-fixture-skeleton",
  "skeletonId": "fixture-skeleton:<sha256>",
  "sourceDigest": "<sha256>",
  "source": {
    "sourceId": "...",
    "productionVersion": "...",
    "scenario": "...",
    "evidence": []
  },
  "proofUnit": {},
  "target": {
    "suiteCandidate": "...",
    "semanticOwner": "...",
    "surfaceCandidate": "...",
    "coverageCandidate": "UNRESOLVED|EXECUTABLE_CANDIDATE|HYBRID_CANDIDATE"
  },
  "inputFacts": [],
  "expectedCandidates": [],
  "protectedInvariants": [],
  "observationalFacts": [],
  "unknowns": [],
  "minimizationNeeds": [],
  "promotion": {
    "state": "REVIEW_REQUIRED",
    "fixtureV1Ready": false,
    "blockers": []
  }
}
```

The output is planning metadata only.

---

## 22. Deterministic identity / reproducibility

M-10 must be deterministic.

Frozen requirements:

```text
same normalized source descriptor bytes
+ same tool version
→ same skeleton semantic content
```

Do not include:

```text
current time
random UUID
hostname
working-directory absolute path
GitHub run ID
```

in semantic output identity.

`skeletonId` is derived from a canonical SHA-256 digest of the validated normalized source descriptor.

The full digest is preserved; a shortened human display may be presentation-only.

---

## 23. Coverage candidate

M-10 may preserve a reviewer-supplied coverage candidate:

```text
EXECUTABLE_CANDIDATE
HYBRID_CANDIDATE
UNRESOLVED
```

It may not emit the registry authority values:

```text
coverageExpectation = EXECUTABLE
coverageExpectation = HYBRID_TRANSITIONAL
```

as final fixture truth.

Actual coverage state is decided during promotion after current production surfaces are inspected.

---

## 24. Promotion blockers

The generator emits bounded blocker IDs when the skeleton is not ready even for suite-specific promotion review.

Frozen initial vocabulary:

```text
SUITE_NOT_RESOLVED
SEMANTIC_OWNER_NOT_RESOLVED
SURFACE_NOT_RESOLVED
NO_ASSERTION_CANDIDATES
ASSERTION_BASIS_INVALID
EVIDENCE_REFERENCE_MISSING
PROOF_UNIT_AMBIGUOUS
RAW_DATA_BOUNDARY_VIOLATION
CONFLICTING_FACT_ROLES
```

These are fixture-planning blocker codes only.
They are not runtime warnings and not project `BLOCKER` classifications.

A skeleton may be emitted with blockers so missing work is explicit.

---

## 25. Conflict rules

Fail closed on contradictory planning roles.

Examples:

```text
same fact ID in expectedCandidates + unknowns
same fact declared OWNER_DETERMINISTIC + NONDETERMINISTIC
same observation placed into two unrelated proof-unit positions
same expected candidate assigned two different semantic owners
```

Result:

```text
SOURCE_DESCRIPTOR_INVALID
```

Do not choose one interpretation automatically.

---

## 26. Raw-data / privacy boundary

The source descriptor and skeleton must not become a raw live-chat archive.

Forbidden fields/content:

```text
raw user body
raw assistant body
full diagnostic report
full COMMUNITY block
full Knowledge block
full Fresh body
full prompt
full Host chat object
exception stack
large warning prose
arbitrary free-form transcript field
```

Allowed bounded values:

```text
enums
numbers
booleans
short stable IDs
reason IDs
owner/module names
surface names
turn/runtime references
evidence paths/section references
small semantic shape labels
```

Implementation should enforce field-size bounds and reject unknown top-level properties.

---

## 27. Bounded resource contract

Initial v1 safety bounds:

```text
source descriptor <= 256 KiB
proof observations <= 4
inputFacts <= 32
expectedCandidates <= 32
protectedInvariants <= 16
observationalFacts <= 24
unknowns <= 24
minimizationNeeds <= 16
additional evidence refs <= 8
```

No network.
No GitHub API.
No pluginStorage.
No SnapshotStore.
No Host access.
No runtime import.
No history scan.

This is an offline repository/developer tool only.

---

## 28. V1 CLI / physical implementation target

When the NR Difficulty-3 tier closes and M-10 passes SAFE_NON_RUNTIME review, preferred implementation is:

```text
products/simcore/tooling/fixture-skeleton.mjs
products/simcore/tooling/schema/fixture-source-v1.schema.json
products/simcore/tooling/schema/fixture-skeleton-v1.schema.json
products/simcore/tooling/fixture-skeleton.test.mjs
```

Conceptual invocation:

```text
node products/simcore/tooling/fixture-skeleton.mjs \
  --source <reviewed-source.json> \
  --output <skeleton.json>
```

The tool writes only the caller-selected local output path.

It has no repository/GitHub writer.

Do not bundle a new CI discovery mechanism into this implementation. The existing standalone tooling-test discovery WATCH is a separate repository/CI concern.

---

## 29. Atomic output behavior

Implementation must avoid leaving a misleading partial skeleton.

Preferred behavior:

```text
read + validate source
→ normalize
→ derive complete skeleton in memory
→ validate output schema
→ atomic local write
```

On validation/build failure:

```text
no partial output replacement
non-zero exit
bounded reason code
```

No automatic fallback to a weaker schema.

---

## 30. Failure vocabulary

Initial operation results/reason classes:

```text
SKELETON_BUILT
SOURCE_DESCRIPTOR_INVALID
SOURCE_UNAVAILABLE
OUTPUT_PATH_INVALID
OUTPUT_WRITE_FAILED
OUTPUT_SCHEMA_INVALID
RAW_DATA_BOUNDARY_VIOLATION
```

Promotion blocker IDs from section 24 remain inside a successfully built skeleton and are separate from tool execution failure.

Example:

```text
tool result = SKELETON_BUILT
promotion blocker = SURFACE_NOT_RESOLVED
```

is valid.

---

## 31. Relationship to S-04 Live Evidence Packet Builder

Future S-04 may reduce transcription effort but does not replace the reviewed source descriptor.

Canonical relationship:

```text
S-04 packet
+ full forensic/evidence review
→ may prefill a reviewed M-10 source descriptor
→ M-10 skeleton
```

Forbidden:

```text
S-04 packet
→ automatic fixture assertion
```

M-10 never trusts `Classification: CLASSIFICATION_PENDING` or later repository disposition as a semantic expected value.

---

## 32. Relationship to S-12 Natural Evidence Corpus

S-12 can discover a specimen:

```text
NE-YYYYMMDD-NNN
→ Primary Source
```

M-10 may use the specimen ID as `sourceId`, but must follow the Primary Source before preparing the reviewed source descriptor.

Therefore:

```text
S-12 row
= navigation
!= assertion source
```

Repeated natural specimens may eventually lead to multiple skeletons or one deliberately generalized fixture design; M-10 does not decide recurrence collapsing.

---

## 33. Relationship to S-09 Evidence Index

S-09 answers current contract-evidence navigation.

M-10 may use it to find:

```text
semantic owner
latest live evidence
current fixture/suite linkage
```

but the S-09 row is not an executable oracle.

If S-09 says a fixture already exists, M-10 should not automatically append another case; the operator first checks whether the new specimen adds a distinct regression property.

---

## 34. Relationship to current permanent fixture designs

Current fixture designs such as `summary-scope`, `narrative-clock`, `frame`, and broadcast-closure expansion already define their own semantic assertion boundaries.

M-10 does not supersede those designs.

For an already-designed fixture family:

```text
M-10 skeleton
→ convenience input to the existing family design/promotion process
```

For a not-yet-designed family:

```text
M-10 skeleton
→ may expose NEW_SUITE_DESIGN_REQUIRED
→ stop
```

Do not use M-10 to bypass the mandatory design-freeze rule for a new test family.

---

## 35. Relationship to M-11 Architecture Dependency Snapshot

M-11 and M-10 are independent NR tools.

```text
M-11
= physical dependency graph projection

M-10
= reviewed live evidence → fixture planning projection
```

M-10 must not invoke M-11 to discover semantic owners.
Architecture graph position is not sufficient to prove semantic ownership.

---

## 36. Promotion protocol to a real permanent fixture

A skeleton becomes useful only through an explicit later promotion transaction.

Frozen promotion sequence:

```text
1. open skeleton + Primary Source evidence
2. re-check current production owner/surface
3. confirm existing suite or complete separate new-suite design
4. minimize live input into synthetic deterministic reproduction
5. map inputFacts into suite-specific fixture input
6. map only reviewed expectedCandidates into suite-specific expected
7. preserve protectedInvariants during minimization
8. keep unknowns unasserted
9. decide actual EXECUTABLE / HYBRID_TRANSITIONAL coverage
10. create/update actual fixture-v1 under products/simcore/tests/fixtures/
11. run fixture schema validation + target suite + required harness checks
12. record implementation/evidence under normal repo workflow
```

The promotion transaction is separate from skeleton generation.

---

## 37. No automatic golden status

M-10 v1 has no authority to emit:

```text
goldenGate = true
required = true
PASS
LIVE_GOLDEN_ESTABLISHED = YES
```

Those belong to suite/evidence promotion decisions.

Every skeleton always starts:

```text
promotion.state = REVIEW_REQUIRED
fixtureV1Ready = false
```

Even a perfect source descriptor does not bypass explicit promotion review.

---

## 38. Regression / implementation verification obligations

Future M-10 implementation must prove at minimum:

### Schema / determinism

```text
same source → byte-stable skeleton
unknown top-level field → reject
oversized descriptor → reject
same normalized source → same sourceDigest/skeletonId
no timestamp/random identity in output
```

### Assertion safety

```text
unknown cannot become expected candidate
observational fact cannot silently become expected candidate
disposition cannot become expected candidate
missing owner/surface produces promotion blocker
conflicting fact roles reject
raw-body-shaped unsupported field rejects
```

### Promotion separation

```text
output schema != fixture-v1
no write under products/simcore/tests/fixtures/
no registry edit
no goldenGate field
no required field
```

### Resource / authority safety

```text
no network
no GitHub token/API
no release-simcore write
no plugin/runtime byte change
no source parser / second semantic validator
```

Focused tool tests are required, but changing permanent CI discovery policy is explicitly out of scope for the M-10 implementation work item.

---

## 39. Live validation obligations

M-10 is NON_RUNTIME.

Therefore implementation itself requires no PocketRisu real-long-chat validation and no `release-simcore` publication.

However, fixture promotion from a skeleton must preserve the evidence maturity of its source:

```text
live source exists
!= promoted fixture proves all live semantics
```

A fixture may protect only the deterministic SimCore-owned slice.
Renderer/model/Host/external semantics remain live-validation concerns where applicable.

---

## 40. Edge cases

### No deterministic assertion candidate

Valid skeleton:

```text
expectedCandidates = []
unknowns/observationalFacts populated
promotion blocker = NO_ASSERTION_CANDIDATES
```

This is useful evidence that the live specimen should not become a permanent fixture yet.

### Existing fixture already protects the property

M-10 does not deduplicate automatically.
Operator compares against the current suite/design and may classify the skeleton as no-new-coverage.

### Live evidence contains a parser-sensitive raw string

Do not copy it wholesale.
Record `minimizationNeeds`, then author a synthetic minimized string during promotion.

### Owner moved after M2 refactor

The historical source descriptor remains truthful about its reviewed provenance.
Before promotion, re-check current owner/surface and update the new promotion work item; do not mutate old live evidence.

### Evidence source is WATCH with unknown causality

The deterministic sub-fact may still be fixture-worthy if owned and established.
Unknown causality stays in `unknowns` and is not asserted.

### Performance specimen

M-10 may preserve timings as observational facts.
Do not invent a performance threshold; use M-03/M-04/M-05 style dedicated performance design when needed.

---

## 41. Forbidden scope expansion

M-10 must not become any of the following:

```text
generic diagnostic parser
raw-chat corpus builder
automatic bug reproducer
property-based test generator
AI fixture author
source-code semantic analyzer
second architecture ownership registry
second validator
suite registry manager
fixture auto-merger
GitHub bot
background watcher
runtime diagnostic feature
```

If any of those become useful later, design them separately.

---

## 42. Implementation dependency and sequencing

Current NR Difficulty-3 pool:

```text
M-11 Architecture Dependency Snapshot Generator  FROZEN
M-10 Live Diagnostic → Fixture Skeleton Generator FROZEN after this document
M-13 Evidence Index Generator                     OPEN
```

Therefore after this design freeze:

```text
NR Difficulty 3
= STILL OPEN
```

M-10 implementation is not authorized yet.

Required sequence:

```text
freeze M-13
→ NR Difficulty-3 currently-designable tier closes
→ strict SAFE_NON_RUNTIME review for M-11 / M-10 / M-13 individually
→ select one bounded implementation work item at a time
```

M-10's future implementation must not be bundled with M-11, M-13, CI discovery repair, runtime feature work, or fixture-family implementation.

---

## 43. Revisit triggers

Reopen this design only if one of these becomes true:

```text
fixture-v1 authority/schema materially changes
permanent harness requires a new promotion concept
S-04 introduces a stable machine packet that eliminates the reviewed-descriptor boundary safely
current evidence documents cannot supply bounded facts without parsing raw prose
new evidence shows the skeleton format itself causes systematic over/under-assertion
M2 physical ownership makes semantic owner/surface representation insufficient
```

Ordinary new live specimens do not reopen M-10.
They use the frozen descriptor/skeleton contract.

---

## 44. Final design verdict

```text
M-10
LIVE DIAGNOSTIC → FIXTURE SKELETON GENERATOR

INPUT
= reviewed bounded live-fixture source descriptor

OUTPUT
= fixture-skeleton-v1
= deterministic test-planning metadata

DIRECT fixture-v1 OUTPUT
= FORBIDDEN

goldenGate / required / registry mutation
= FORBIDDEN

raw live body retention
= FORBIDDEN

semantic inference
= FORBIDDEN

unknowns intentionally unasserted
= FIRST-CLASS REQUIRED FIELD

actual fixture promotion
= separate explicit suite-owner transaction
```

Status:

```text
DESIGN COMPLETE
→ RECORDED IN main
→ DESIGN FROZEN
→ PARKED FOR NR DIFFICULTY-3 TIER CLOSE
→ NO IMPLEMENTATION
→ NO RUNTIME CHANGE
```

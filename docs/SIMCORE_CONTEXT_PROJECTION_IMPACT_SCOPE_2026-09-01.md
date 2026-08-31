# SimCore Context Projection Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · DESIGN INPUT ONLY · NO IMPLEMENTATION AUTHORITY**

Classification: **LIGHTBOARD / MINIBOARD DESIGN PROMOTION · CONTEXT PROJECTION · STRUCTURE-FIRST PRE-DESIGN**

This document performs the read-only structure/impact pass required before writing a concrete Context Projection Contract. It does not authorize request-history reduction, runtime mutation, a new Context/Memory subsystem, persistent schema changes, a release, or any S7 change.

---

## 1. Why this scope exists

The completed LightBoard / MiniBoard shortlist promoted `Context Projection Contract` as the highest-ranked design candidate:

```text
Owner-Scoped Context Projection
+ Bounded Context Aperture
+ Context Re-entry Firewall
```

The later repository-common-rule update changed the correct next step from direct architectural design to structure-first impact scoping:

```text
RCR-D07  Scope impact before broad change
RCR-D08  Distill context, preserve source authority
RCR-D09  Creation is incomplete without feedback
RCR-D10  Prefer composable workflow modules
RCR-C08  Separate analysis from mutation where supported
```

Therefore this transaction is intentionally read-only with respect to runtime and product behavior.

---

## 2. Authority chain used for this review

### Exact production runtime authority

```text
branch          = release-simcore
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
runtime blob    = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest.js       = install.js
```

Exact runtime source reviewed:

```text
release-simcore/plugins/simcore/latest.js
release-simcore/plugins/simcore/install.js
```

`main/plugins/simcore/*` is not production runtime authority. It currently carries an older development-channel representation and is useful only for historical/structural comparison when explicitly labeled as such.

### Architecture authority

- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `scripts/simcore-architecture-check.py`

`SIMCORE_CONTRACTS_V2.md` remains the architecture/ownership authority, but its human-readable release-identity header still names v0.69.1. Exact current release identity therefore comes from `release-simcore`, not from that stale header.

### Active release-lane boundary

- `docs/SIMCORE_S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE_DESIGN_2026-08-31.md`

S7 is a cumulative simplification convergence/release proof lane. It protects existing module inventory, require graph, prompt semantics, `TAIL_AFTER_CURRENT_USER`, persistent schemas, Evidence/Lineage/Handoff behavior, and the current v0.70.1 production parent. Context Projection must not be mixed into S7.

### Research/design inputs

- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md`
- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md`
- `docs/SIMCORE_COMMON_RULES_AND_PLUGIN_SKILL_METHODOLOGY_IMPACT_2026-09-01.md`
- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`

---

## 3. Production architecture relevant to Context Projection

Current production is already split into explicit ownership layers.

```text
Foundation
  contracts / store / kernel
        ↓
Domain
  community / recurrence / lineage / handoff / state-reconcile
  evidence / time / frame / lifecycle / reaction
        ↓
Validation
  structure
        ↓
Representation
  representation
        ↓
Application
  prompt / session / edit-reconcile
  output-compat / bootstrap-migration / output-finalize
        ↓
Observability
  ops
        ↓
Runtime
  runtime-contracts / runtime-host / runtime-session / runtime-mirror
  runtime-hooks / runtime-cache / runtime-topology / runtime-cache-candidates
  runtime-telemetry / runtime-probe
```

Relevant frozen architecture constraints:

```text
Core must not depend upward on Runtime
Store owns persistence mechanics, not semantic decisions
Validation remains judge-only
Representation remains identity/provenance authority, not body authority
no circular imports
raw Fresh/response bodies are not retained for provenance convenience
Kernel transition exceptions = 0
new generic foundation state module = DEFERRED
request-pipeline / turn-pipeline extraction = DEFERRED
```

A Context Projection design should fit the existing ownership graph rather than creating a parallel architecture.

---

## 4. Current request path

The current request path relevant to this design can be reduced to:

```text
beforeRequest host hook
  ↓
runtime-host
  current indices + current chat
  ↓
runtime-session
  load/reuse CoreRulesetSession
  ↓
kernel.inspectPromptMessages
  bounded request scan for Core handshake/config
  ↓
bootstrap/edit/migration compatibility work where required
  ↓
CoreRulesetSession.onSend
  ↓
lifecycle.prepareTurn
  + bounded previous-output/frame facts
  ↓
Store.saveTurn
  ↓
Prompt.compileRuntimePromptParts
  ↓
post-onSend request phase
  history observation + prompt accounting + source/evidence request handling
  ↓
Evidence.inspectAndFence when eligible
  ↓
runtime system block remains TAIL_AFTER_CURRENT_USER
  ↓
request topology/cache diagnostics
  ↓
model dispatch
```

Important boundary: this is a structure map, not permission to rewrite any of those stages.

---

## 5. Existing context-management behavior already present

Context Projection is not starting from zero. Production already contains several bounded forms of context ownership.

### 5.1 Current Task Primacy

The stable Prompt contract already states:

```text
current input explicit current-event facts
  > conflicting prior event versions

current input task
  = primary generation authority

prior assistant output
  = continuity/reference context
  != automatic current-task authority

completed prior response/task
  must not replay unless current input explicitly requests
  continuation / recap / comparison / reuse
```

This is semantic prioritization, not request-history deletion.

### 5.2 Incremental prompt handshake scan

`kernel.inspectPromptMessages()` scans the already-built request incrementally and stops once the authoritative Core ruleset closes. It intentionally avoids materializing a second full copy of a long request.

This demonstrates an existing production preference for:

```text
bounded scan
+ explicit authority marker
+ stop when sufficient evidence exists
```

It does not itself project chat history.

### 5.3 Summary Scope

Production already carries explicit bounded temporal authority for supported summary requests, including annual-only and cumulative year-over-year modes.

This establishes that a consumer may legitimately have a narrower fact aperture than the entire available history.

However, Summary is not selected as the first Context Projection pilot because its factual read set can span a broad time range and would make exclusion correctness harder to prove first.

### 5.4 Evidence / Lineage source boundary

The strongest existing seam is the Mode C source boundary.

Production already has:

```text
Lineage
  owns root / parent / depth source identity

Handoff
  owns short-C same/new-source observations

Evidence
  owns exact request-message mapping
  + safe request-only source fencing
```

This is the closest existing owner to the intended Context Projection concept.

---

## 6. Evidence module: exact current behavior

Production defines explicit request-only evidence tags:

```text
<CURRENT_ROOT_EVIDENCE> ... </CURRENT_ROOT_EVIDENCE>
<CURRENT_SOURCE_EVIDENCE> ... </CURRENT_SOURCE_EVIDENCE>
```

### 6.1 Eligibility

`Evidence.mappingProbe()` is eligible only when all of the following are true:

```text
pending.active = true
mode = C
requestLineageRootIndex is valid
requestLineageSourceKind != UNSEEDED
```

Evidence does not choose a new semantic root. It consumes the root already owned by Lineage.

### 6.2 Source resolution

For an eligible request, Evidence resolves:

```text
root user turn
  = raw chat at lineage root index

source assistant
  = first assistant after that root and before current send
```

It then attempts to locate those authoritative raw-chat objects inside the already-built request message array.

### 6.3 Mapping classes

The current mapping taxonomy is bounded and explicit:

```text
EXACT
NORMALIZED
EMBEDDED
TRANSFORMED
AMBIGUOUS
ABSENT
```

Evidence records request index, role, character counts, normalized counts, and boundary anchors rather than silently assuming source identity.

### 6.4 Boundary safety

Root fencing requires a single unambiguous user-role mapping with a tight exact/normalized boundary.

Source fencing requires a single unambiguous assistant-role mapping with bounded transform tolerance and start/middle/end anchor agreement.

Unsafe or ambiguous mapping fails open.

### 6.5 Fence application

`Evidence.inspectAndFence()` applies the root fence first.

```text
root unsafe
→ UNFENCED

root safe + source unsafe
→ ROOT_ONLY

root safe + source safe
→ DUAL
```

The source fence is never allowed to establish authority independently of a valid root fence.

### 6.6 Effect class

The current Evidence operation is:

```text
request-only
memory/request representation only
no visible chat write
no persistent Core-state field
no semantic root selection
no auxiliary model
fail-open on uncertainty
```

This shape is unusually well suited to a first Context Projection design experiment.

---

## 7. Owner / caller / dependent map

### Semantic owners

| Concern | Current owner | Context Projection implication |
| --- | --- | --- |
| Current user task authority | Lifecycle + Prompt contract | Projection must never weaken current-input primacy |
| Mode/lifecycle | Lifecycle | Projection may consume mode, not redefine it |
| Root/parent/depth | Lineage | First pilot must consume existing lineage identity |
| Same/new short-C source | Handoff | May inform eligibility, not become projection owner |
| Exact request source mapping | Evidence | Best candidate for first bounded projection seam |
| Persistent portable state | State Reconcile | First design should add no field |
| Persistence mechanics | Store | First design should require no new key/write |
| Runtime prompt serialization | Prompt | Prompt text/placement should remain unchanged initially |
| Request placement | runtime-contracts / outer runtime | `TAIL_AFTER_CURRENT_USER` is protected |
| Request topology diagnostics | runtime-topology | Useful validation observer only |
| Runtime prompt/cache diagnostics | runtime-cache | Useful cost/identity observer only |
| Output acceptance/commit | Structure + Output Finalize | Regression protection, not first projection owner |

### Caller shape

The first candidate seam is reached from the existing request preparation path after `CoreRulesetSession.onSend()` has produced the current pending state and runtime prompt metadata.

The outer request path invokes `Evidence.inspectAndFence()` only when the current runtime budget indicates an active source anchor.

Therefore Evidence already receives the three inputs a first projection design needs:

```text
final/request-side messages
+ authoritative raw chat
+ already-computed pending lineage identity
```

### Dependents that must remain semantically unchanged

```text
Prompt current-task rules
Community output contract
Lineage
Handoff
Frame / Time continuity
Summary scope
Structure judge/quarantine
runtime prompt topology/cache diagnostics
S7 cumulative equivalence proofs
```

---

## 8. Blast-radius map

### 8.1 Very high risk / not suitable for first design

The following would immediately expand scope beyond a safe first pilot:

```text
generic A/B/C history pruning
new Context or Memory module
persistent context checkpoint schema
new history summary database
new auxiliary-model summarizer
semantic similarity source selection
modifying current-user content
moving the SimCore runtime prompt
changing TAIL_AFTER_CURRENT_USER
changing system-0 / host-prefix content for projection convenience
changing Lineage root-selection semantics
changing Handoff semantics
changing Evidence ambiguity acceptance thresholds casually
visible chat rewrites
new provider-cache claims or controls
mixing the design into S7 cumulative release work
```

### 8.2 Medium risk

```text
request-message removal/reordering even in one Mode C path
cross-turn persistence of projected envelopes
projection based on inferred semantic relevance
using Summary as the first pilot
projection rules that need new ownership metadata
```

These may be considered only after a narrower contract proves the source-boundary model.

### 8.3 Lowest-risk design seam

The smallest credible first design is:

```text
Mode C only
+ existing Lineage source root
+ existing Evidence exact request mapping
+ ephemeral request-time effect
+ no new persistent schema
+ no new root/source inference
+ unchanged current user
+ unchanged runtime prompt bytes/placement
+ unchanged A/B
+ fail open to the original full request
```

This does not mean implementation is already safe. It means this is the smallest design surface worth specifying next.

---

## 9. Candidate comparison for first concrete owner

### Option 1 · Generic A/B/C Context Projection

Benefit:

- maximum long-chat leverage.

Reject as first pilot because:

- semantic owner is too broad;
- exclusion correctness would span unrelated domain contracts;
- high chance of inventing a generic context engine prematurely.

Disposition:

```text
DEFER AS GENERALIZATION
```

### Option 2 · Summary-Scoped Projection

Benefit:

- explicit temporal scope already exists.

Risk:

- summary requests may need sparse facts across a wide history;
- proving what may be excluded is harder than locating one current source lineage.

Disposition:

```text
SECONDARY FUTURE CONSUMER
```

### Option 3 · Mode C Lineage / Evidence Projection

Benefit:

- source owner already exists;
- exact request mapping already exists;
- ambiguity handling already fails open;
- request-only mutation precedent already exists;
- S7 already protects and explicitly validates Evidence fence behavior;
- current-task and source-lock bugs are historically relevant to this path.

Disposition:

```text
SELECTED FIRST CONCRETE DESIGN OWNER
```

---

## 10. Selected first design target

Working name:

```text
MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION
```

Human-readable name:

```text
Mode C Lineage-Scoped Context Projection Contract
```

Conceptual design shape:

```text
existing host-built request
+ current user input
+ already-computed Lineage root/source
+ Evidence-safe exact request mapping
        ↓
identify the must-keep current-source evidence nucleus
        ↓
define only history classes that can be proven owner-irrelevant
        ↓
build an ephemeral projected request view
        ↓
uncertainty / ambiguity / unsupported shape
        ↓
use original request unchanged
```

This scope document does **not** decide the exclusion algorithm. That belongs to the dedicated design transaction.

---

## 11. First-design non-goals

The dedicated design must begin by preserving these non-goals:

```text
NO generic memory system
NO generic summarizer
NO canonical-history deletion
NO persistent projection state
NO new source identity system
NO semantic similarity retrieval
NO vector index
NO auxiliary model
NO cross-plugin framework
NO UI dependency
NO provider cache control
NO S7 modification
NO v0.70.2 or v0.70.3 identity reuse
```

A successful first design should be understandable as a narrow policy around one already-owned request/source seam.

---

## 12. Required fallback contract

The first design must fail open to current behavior.

Minimum fallback cases:

```text
Lineage UNSEEDED
root index invalid
root mapping ABSENT
root mapping AMBIGUOUS
root boundary unsafe
source mapping ABSENT when source is required
source mapping AMBIGUOUS
source boundary unsafe
current user cannot be proven unchanged
required host/system/reference context cannot be classified safely
projection would alter runtime prompt placement
projection validator cannot prove retained source coverage
```

Fallback result:

```text
ORIGINAL REQUEST PRESERVED
PROJECTION EFFECT = NONE
SEMANTIC OUTPUT CONTRACT = CURRENT PRODUCTION
```

No fallback should invent a compact substitute.

---

## 13. What must remain in the request

Before any exclusion rule is considered, the design must classify protected request classes.

At minimum protect:

```text
current user message exactly
Core ruleset / handshake authority
character card / currently exposed lore host context
current root evidence when source lock is active
current source evidence when safely mapped and required
SimCore runtime prompt block
host-required system/tool/request metadata
any message whose removal would change the current semantic owner
```

The design must distinguish:

```text
MUST_KEEP
MAY_EXCLUDE_IF_PROVEN
UNKNOWN → KEEP
```

There should be no default `probably irrelevant` bucket.

---

## 14. Context re-entry boundary

The LightBoard research also promoted a Context Re-entry Firewall.

For the first SimCore design that should mean:

```text
projection = ephemeral request view
projection output != new canonical history
projection metadata != world truth
projection metadata != persistent audience memory
projection metadata does not automatically re-enter later prompts
```

If future evidence proves that some projection metadata must persist, that is a separate schema/ownership design and must not be smuggled into this first contract.

---

## 15. Reroll / rewind / edit implications

The first design must explicitly preserve current generation identity behavior.

### Reroll / repeat send

Current Session already restores pre-state for rewind/same-index/repeat-send cases. Projection must be derived again from the restored current lineage/request rather than reusing a stale projected envelope.

### Rewind

A projected request may not retain a descendant source from the abandoned future branch.

### Manual assistant edit

Edit Reconcile and Representation remain independent authorities. Projection must not reinterpret a visible edit as source equivalence or bypass the existing edit-reconcile path.

### Source replacement

If Lineage/Handoff identifies a new source, the projection must be regenerated from that current source. Prior projected evidence has no authority.

These requirements are why Candidate C (`Derived Provenance + Reroll Lineage`) remains a supporting contract to introduce only if the concrete design actually creates a derived object that needs additional lineage metadata.

---

## 16. Performance hypothesis

The first design is justified only if it can preserve correctness while materially reducing unnecessary request context or work.

Primary hypothesis:

```text
For eligible Mode C lineage-anchored requests,
request context outside the current source/evidence owner can contain completed or owner-irrelevant conversational material.
A conservative request-time projection may reduce request characters and downstream context pressure without changing the current task, source evidence, output contract, or persistent continuity.
```

This is a hypothesis, not an established performance fact.

Do not claim provider cache improvement from a local request reduction.

---

## 17. Existing observability useful for evaluation

Current runtime already exposes useful comparison surfaces:

```text
beforeRequest total timing
prompt scan messages/chars
session load path
onSend timing
runtime prompt chars/lines
post-onSend prompt accounting attribution
request topology common prefix / total chars
runtime prompt stable/slow/volatile identity
Evidence mapping/fence status
Lineage root/parent/depth
Handoff current/prior source
Community/Structure warnings
output commit status
```

These should be reused before adding new telemetry.

Any design-specific telemetry should be memory-only and bounded unless a separate persistence need is proven.

---

## 18. Required static validation matrix for the future design

At minimum the dedicated design must specify deterministic fixtures for:

### Source identity

```text
C + seeded exact root/source
C + normalized root/source
C + transformed-but-safe source
C + root ambiguous
C + source ambiguous
C + root absent
C + source absent
C + UNSEEDED
new root after prior same short request
same root / same parent
same root / shifted parent
```

### Mode isolation

```text
Mode A unchanged
B_START unchanged
B_CONTINUE unchanged
B_END unchanged
C ineligible path unchanged
```

### Request integrity

```text
current user byte/text identity preserved
Core handshake preserved
character/reference context preserved
runtime prompt text unchanged
runtime prompt still TAIL_AFTER_CURRENT_USER
no duplicate evidence fences
Evidence current root/source retained exactly once when applicable
```

### Fallback

```text
any UNKNOWN classification → original request
ambiguous mapping → original request
unsupported host shape → original request
validator failure → original request
```

### Lineage lifecycle

```text
reroll
repeat send
rewind
new source
manual edit positive control
reload with persisted Core state
```

---

## 19. Required baseline-vs-candidate evaluation

RCR-D09 and the plugin-skill methodology make a baseline comparison mandatory before promotion.

For each eligible fixture or real-chat case compare:

```text
BASELINE
  exact current v0.70.1 request behavior

CANDIDATE
  projected request behavior
```

Independent dimensions:

### Correctness

```text
same current task
same current source authority
same required factual continuity
same Mode C output contract
same Community block semantics
same Knowledge-final requirement
no stale prior-answer reuse
no newly missing current-source fact
```

### Request/context cost

```text
message count
request characters
protected-source characters
excluded characters
projection-local processing cost
beforeRequest timing
post-onSend attribution
```

### Stability

```text
reroll/rewind correctness
edit correctness
reload correctness
fallback correctness
no state/schema drift
```

### Provider-cache statement

Always:

```text
provider cache = UNVERIFIED
```

A smaller request does not itself prove cache or billing behavior.

---

## 20. Real long-chat acceptance shape for a later implementation

If a future implementation is authorized, the first real-chat matrix should include:

```text
1. ordinary eligible Mode C current-source request
2. same-source short follow-up
3. new-source short follow-up
4. current-source fact that would fail if projection over-prunes
5. stale prior answer present in distant history
6. reroll
7. rewind/repeat send
8. genuine manual edit positive control
9. refresh/reload then eligible Mode C
10. negative control Mode A or B
```

Observe:

```text
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding correct
Evidence root/source status correct
current task correct
Community shape correct
Knowledge final
warnings bounded/known
request chars baseline vs candidate
beforeRequest + post-onSend costs
```

Human evidence remains required wherever the owning release contract requires a real long-chat acceptance boundary.

---

## 21. S7 separation

This scope must not contaminate the currently frozen S7 transaction.

S7 protects:

```text
exact v0.70.1 parent
P0→P12 cumulative simplification construction
module inventory
require graph
persistent schemas
Prompt semantics
TAIL_AFTER_CURRENT_USER
Evidence / Lineage / Handoff behavior
Current Task Primacy
```

Therefore:

```text
Context Projection design work = main docs/design lane
Context Projection runtime implementation = NOT AUTHORIZED
S7 candidate/runtime = unchanged
v0.70.3 S7 identity = reserved for S7 only
v0.70.2 = parked Cache Observer lane, still reserved
```

A future Context Projection release identity must be selected only after its own design/implementation authority exists.

---

## 22. Anomaly / WATCH classification

### WATCH · ARCHITECTURE_DOC_RELEASE_IDENTITY_DRIFT

Observation:

- `SIMCORE_CONTRACTS_V2.md` still presents v0.69.1 as its current production header.
- exact `release-simcore` and the S7 design identify current production as v0.70.1.

Classification:

```text
WATCH · DOCUMENT_IDENTITY_STALE_NOT_RUNTIME_AUTHORITY
```

Impact:

- none on this read-only scope because runtime authority was resolved from `release-simcore`;
- architecture-layer constraints from Contracts v2 remain useful;
- do not cite its stale release header as current deployment truth.

Disposition:

```text
DEFER separate admin/doc convergence
NOT a Context Projection blocker
```

### EXPECTED AUTHORITY BOUNDARY · main plugin source is not production

`main/plugins/simcore/*` differs from current release runtime. This is expected under the repository authority model and is not a runtime anomaly.

All implementation claims in this review were re-read against `release-simcore` before selection.

---

## 23. Impact-scope decision

The read-only scope supports one narrow next design transaction.

```text
SELECTED OWNER
  Mode C Evidence / Lineage source boundary

SELECTED DESIGN TARGET
  MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION

FIRST EFFECT CLASS
  ephemeral request-time projection only

PERSISTENT SCHEMA
  none preferred / none authorized here

SOURCE IDENTITY
  existing Lineage only

SOURCE MAPPING
  existing Evidence contract only

UNCERTAINTY
  fail open to original request

A/B
  unchanged

PROMPT PLACEMENT
  unchanged TAIL_AFTER_CURRENT_USER

S7
  unchanged
```

---

## 24. What this scope explicitly does not prove

This document does not prove:

```text
that any history can already be safely removed
that a projected request will improve latency
that a projected request will improve provider caching
that all Mode C requests share one minimal context set
that Summary can reuse the same exclusion policy
that a generic Context Projection subsystem is warranted
that implementation should begin before S7/release boundaries permit it
```

Those claims require the dedicated contract plus baseline evidence.

---

## 25. Next legitimate action

Write one dedicated design document:

```text
SimCore Mode C Lineage-Scoped Context Projection Contract
```

That design must define, before any implementation:

```text
entry eligibility
semantic owner
MUST_KEEP classes
MAY_EXCLUDE_IF_PROVEN classes
UNKNOWN → KEEP rule
projection construction seam
request ordering invariants
Evidence/Lineage/Handoff interactions
reroll/rewind/edit behavior
fallback conditions
static validator
baseline-vs-candidate fixtures
real long-chat acceptance matrix
cost/latency evidence
S7/release separation
```

Only after that design is frozen and validated may an implementation transaction be considered.

---

## 26. Final state

```text
LIGHTBOARD_MINIBOARD_RESEARCH             = COMPLETE
CONTEXT_PROJECTION_CANDIDATE              = DESIGN_READY
CONTEXT_PROJECTION_IMPACT_SCOPE           = COMPLETE
FIRST_CONCRETE_OWNER                      = MODE_C_EVIDENCE_LINEAGE
FIRST_DESIGN_TARGET                       = MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION
GENERIC_CONTEXT_ENGINE                    = NOT_AUTHORIZED
PERSISTENT_SCHEMA_CHANGE                  = NONE
RUNTIME_CHANGE                            = NONE
PRODUCTION_CHANGE                         = NONE
S7_CHANGE                                 = NONE
NEXT                                      = WRITE_BOUNDED_CONTEXT_PROJECTION_CONTRACT
```

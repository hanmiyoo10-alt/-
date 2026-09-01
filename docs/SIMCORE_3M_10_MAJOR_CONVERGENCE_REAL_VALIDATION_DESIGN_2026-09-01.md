# SimCore 3M-10 Major Convergence / Real-Validation Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-10 DESIGN FROZEN · 3.0M DESIGN PROGRAM CONVERGED · FIRST-MAJOR SCOPE = LIVE_REACTION / BOARD / NEWS · RUNTIME IMPLEMENTATION NOT AUTHORIZED · RUNTIME READINESS = NO · REAL TARGET-HOST VALIDATION = NOT RUN · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-10 · MAJOR CONVERGENCE · IMPLEMENTATION-READINESS GATES · REAL-LONG-CHAT ACCEPTANCE · ADMINISTRATIVE CLOSE PROTOCOL · DESIGN-ONLY**

## 0. Purpose

3M-10 is the terminal design checkpoint of the 3.0M Source Intelligence design program.

It does not implement or deploy the product.

It freezes four things:

```text
A. design convergence declaration
B. runtime-readiness gate matrix
C. real target-host validation protocol
D. runtime-major close decision rule
```

The central rule is:

```text
DESIGN COMPLETE
!=
RUNTIME READY
!=
DEPLOYED
!=
REAL LONG-CHAT PASS
!=
RUNTIME MAJOR CLOSED
```

## 1. Authority chain

This convergence design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_8_NEWS_PUBLICATION_MATURITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_IMPACT_SCOPE_2026-09-01.md
```

Separate Exposure research authority remains binding, including the target-host preflight/operator packet.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Design convergence declaration

The 3.0M design program is converged for the first-major scope.

```text
3M-0  Master architecture                            = FROZEN
3M-1  Source Projection / Community compatibility    = FROZEN
3M-2  Assertion / Exposure policy                    = FROZEN
3M-3  Structured Sidecar / Validator                 = FROZEN
3M-4  Presentation Renderer architecture             = FROZEN
3M-5  BOARD family                                   = FROZEN
3M-6  Current-projection support / invalidation      = FROZEN
3M-7  Context re-entry / source-history firewall     = FROZEN
3M-8  NEWS publication maturity                      = FROZEN
3M-9  Integration / performance / dormancy           = FROZEN
3M-10 Convergence / acceptance protocol              = FROZEN
```

Therefore the design-only workstream may now say:

```text
3.0M DESIGN PROGRAM = CONVERGED
```

It may not say:

```text
3.0M RUNTIME = IMPLEMENTED
3.0M RUNTIME = READY
3.0M RUNTIME = DEPLOYED
3.0M RUNTIME = LIVE_PASS
```

## 3. First-major scope freeze

The accepted first-major family set is:

```text
LIVE_REACTION
BOARD
NEWS
```

Deferred family set:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Deferred families are not required to close the first-major design/runtime scope unless a later explicit amendment adds them.

## 4. Converged architecture

The first-major architecture is:

```text
CURRENT USER REQUEST
        ↓
CURRENT SIMCORE AUTHORITY
- mode / current task
- Frame / Time / Continuity
- Evidence / Lineage
- Source Handoff
        ↓
CURRENT SOURCE-JOB AUTHORITY
        ↓
DORMANT / ACTIVE / UNSUPPORTED
        ↓ ACTIVE
FAMILY CONTRACT REGISTRY
        ↓
BOUNDED CURRENT SOURCE PROJECTION
        ↓
UNTRUSTED SEMANTIC DRAFT
        ↓
STRUCTURAL VALIDATION
        ↓
CURRENT SOURCE-AUTHORITY EXACT JOIN
        ↓
ASSERTION / EXPOSURE POLICY
        ↓
FAMILY-SPECIFIC POLICY
- LIVE_REACTION: assertion-local
- BOARD: parent dependency
- NEWS: publication maturity + story atomicity
        ↓
VALIDATED SEMANTIC PAYLOAD
        ↓
SUPPORT-AT-USE CHECK
        ↓
PRESENTATION ADAPTER
        ↓
SOURCE-SCOPED VIEW
```

No stage acquires authority merely because a later stage succeeds.

## 5. Authority precedence

When rules appear to conflict, use this precedence:

```text
1. current canonical / runtime authority
2. current source support / structural eligibility
3. assertion exposure eligibility
4. family-specific policy
5. family consumer / quarantine rule
6. presentation eligibility
7. view-local interaction state
```

Examples:

```text
renderer success cannot rescue invalid source support
maturity ALLOW cannot rescue exposure DENY
Board child-local ALLOW cannot rescue denied parent
view-local UI state cannot reactivate a DORMANT source job
```

## 6. Cross-cutting invariants

The first-major runtime, when implemented, must preserve all of these:

```text
SIMCORE KNOWS FACT
!=
SOURCE MAY ASSERT FACT

SOURCE ASSERTION
!=
CANONICAL WORLD FACT

SOURCE FAMILY
!=
CORE MODE

VALIDATED SEMANTICS
!=
PRESENTATION

PRESENTATION STATE
!=
SEMANTIC AUTHORITY

SOURCE SUPPORT
!=
EXPOSURE ELIGIBILITY

EXPOSURE ELIGIBILITY
!=
NEWS PUBLICATION MATURITY

NEWS MATURITY
!=
TRUTH

VISIBLE SOURCE UI
!=
FUTURE MODEL CONTEXT

FAMILY A OUTPUT
!=
FAMILY B TRUTH AUTHORITY
```

## 7. Context / persistence convergence

First-major structured Source Intelligence is:

```text
CURRENT_PROJECTION_ONLY
NON-PERSISTENT
NO STRUCTURED SOURCE HISTORY
NO STRUCTURED SOURCE RETRIEVAL
NO AUTOMATIC CONTEXT RE-ENTRY
NO CROSS-TURN SOURCE IDENTITY
```

Legacy `<COMMUNITY>` transcript behavior remains a compatibility exception, not a new Source Intelligence memory contract.

## 8. Candidate C convergence status

No first-major design requires Candidate C activation.

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item mutation                     = no
C4 append / merge / revision         = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 partial descendant survival       = no
C8 delayed semantic side effect      = no
```

Therefore:

```text
CANDIDATE_C = CONDITIONALLY_READY / NOT ACTIVATED
```

If a future implementation proposal crosses any one condition, it must reopen Candidate C before that behavior is implemented.

## 9. Runtime-readiness state

Current state at design convergence:

```text
RUNTIME_IMPLEMENTATION_AUTHORIZED = NO
RUNTIME_READINESS                 = NO
REAL_TARGET_HOST_VALIDATION       = NOT_RUN
```

This is expected and is not a failed design result.

## 10. Gate G1 · then-current production re-preflight

Before implementation, re-read the then-current production authority from `release-simcore`.

Required evidence:

```text
exact release commit
exact latest.js / install.js blobs
latest.js == install.js
current module ownership / impact scope
current release/runtime invariants
```

Design-time line numbers or historical production assumptions are not implementation authority.

Gate state now:

```text
G1 = PENDING FUTURE IMPLEMENTATION START
```

## 11. Gate G2 · Exposure target-host mechanics and model compliance

Current independent research gate:

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

Required order:

```text
target-host preflight mechanics
→ B0 / E6 pair proof
→ cleanup / unload proof
→ only then authorized model-compliance smoke
→ blind semantic review against frozen oracle
```

A repository-only evaluator PASS cannot substitute for this.

Gate state now:

```text
G2 = BLOCKED / TARGET-HOST EVIDENCE PENDING
```

## 12. Gate G3 · Current source-job selector

3M-9 defines orchestration states but not the active runtime selector producer.

A future implementation must freeze:

```text
selector owner
selector inputs
DORMANT / ACTIVE / UNSUPPORTED result
family selection authority
unsupported behavior
false-activation prevention
```

Forbidden selector inputs include:

```text
old source card existence
old Community transcript existence
fuzzy history retrieval
family-name keyword match alone
hidden source archive
```

Gate state now:

```text
G3 = BLOCKED / ACTIVE SOURCE-JOB AUTHORITY UNFROZEN
```

## 13. Gate G4 · Structured sidecar producer / transport

Current blocker:

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
```

A future implementation must freeze:

```text
who produces the structured draft
how the draft is transported
how it is separated from visible assistant prose
how malformed/missing draft data fails
bounded prompt bytes
bounded semantic output bytes
schema/collection caps
no unproven hidden in-band transport
```

Gate state now:

```text
G4 = BLOCKED
```

## 14. Gate G5 · Presentation host mount authority

Current blocker:

```text
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

A future implementation must prove:

```text
actual target-host mount seam
host record ownership
DOM lifecycle
reroll/edit/reload lifecycle
mount cleanup
mount failure isolation
unowned host metadata preservation
```

Partial/projected host writes may replace only explicitly owned fields.

Gate state now:

```text
G5 = BLOCKED
```

## 15. Gate G6 · Explicit family caps

Before active runtime each family must publish explicit constants for its current projection.

Required categories:

```text
max assertions / entries / stories
max participants where applicable
max chars per semantic item
max aggregate semantic chars
max diagnostic receipt entries
```

These are safety/performance caps, not simulated population facts.

Gate state now:

```text
G6 = BLOCKED / CONCRETE CAPS UNFROZEN
```

## 16. Gate G7 · NEWS trusted maturity-context producer

NEWS requires trusted maturity facts but cannot own the clock.

A future active producer must be derived from current existing authorities such as:

```text
Frame
Time
Continuity
source reachability
```

It must preserve contradiction rejection and UNKNOWN/HOLD behavior.

Model-authored timestamps or NEWS-authored elapsed time cannot satisfy this gate.

Gate state now:

```text
G7 = BLOCKED / MATURITY CONTEXT PRODUCER UNFROZEN
```

## 17. Gate G8 · Integration evidence instrumentation

3M-9 freezes evidence dimensions but not active runtime counters.

A future implementation must expose bounded evidence for:

```text
activation state
family
source history scans
source-specific prompt chars/tokens
source-derived re-entry chars/tokens
semantic draft item / char counts
validator item counts
validation / quarantine counts
presentation item counts
persistent source reads / writes
network calls
extra model calls
background / timer counts
source-path latency
```

The evidence surface must not itself become a persistent semantic history.

Gate state now:

```text
G8 = BLOCKED / ACTIVE INSTRUMENTATION UNFROZEN
```

## 18. Runtime-readiness decision

Runtime implementation may become **READY_FOR_IMPLEMENTATION** only when:

```text
G1 satisfied for then-current production
AND G2 PASS for applicable Exposure behavior
AND G3 frozen
AND G4 frozen
AND G5 frozen
AND G6 frozen
AND G7 frozen before NEWS activation
AND G8 frozen
AND no contradictory design amendment exists
```

Family staging is allowed only when its applicable gates are closed.

Example:

```text
LIVE_REACTION / BOARD implementation
may not claim NEWS readiness merely because NEWS G7 is still pending.
```

But the complete first-major runtime cannot close until all accepted first-major families have their applicable gates closed and validated.

## 19. Implementation sequencing direction

3M-10 does not freeze exact commit numbers or semver.

Dependency direction for a later implementation program is:

```text
then-current production re-preflight
→ runtime impact scope
→ selector / producer / transport / cap / instrumentation contracts
→ LIVE_REACTION compatibility-first implementation
→ Exposure-active proof
→ source presentation mount proof
→ BOARD activation
→ NEWS maturity producer + NEWS activation
→ static / CI convergence
→ release-simcore deployment
→ real target-host validation
→ main documentation / durable-memory sync
```

Do not implement all new family behavior in one unbounded patch by default.

## 20. Static / CI acceptance layer

Before any real validation, a candidate runtime must prove at least:

```text
latest.js == install.js
family registry has no duplicate keys
only authorized family set registered
schema/version enums closed
DORMANT path adds no source-specific prompt/history payload
no structured source-history store
no persistent source DB
no automatic multi-family fanout
no network dependency in first-major semantic path
no auxiliary model dependency unless separately amended
renderer key matches family
source-scoped presentation namespace
no accidental SOCIAL_FEED / PUBLIC_KNOWLEDGE registration
no unowned host metadata overwrite
```

Static/CI PASS is necessary but not sufficient for runtime-major close.

## 21. Deterministic semantic acceptance layer

The runtime implementation must include deterministic fixtures covering the frozen policies.

Minimum semantic matrix inherited from 3M-9:

```text
S1  public broadcast fact → LIVE_REACTION eligible
S2  Knowledge-only secret → LIVE_REACTION denied
S3  BOARD parent denied → child quarantined
S4  BOARD public post/reply → accepted
S5  NEWS exposure allow + maturity hold → whole story quarantined
S6  NEWS exposure allow + maturity allow → whole story accepted
S7  NEWS reportKind cannot upgrade hidden fact
S8  same event independently projected across all three families
S9  source replacement invalidates stale projection
S10 presentation failure does not mutate validated semantics
```

These prove policy machinery, not model compliance or host integration.

## 22. Source-irrelevant deterministic matrix

Required DORMANT cases:

```text
D1 ordinary chat with no prior source use
D2 ordinary chat immediately after LIVE_REACTION
D3 ordinary chat immediately after BOARD
D4 ordinary chat immediately after NEWS
D5 long-context ordinary request after repeated mixed source turns
D6 unrelated prose containing words such as news / board without current source authority
```

Expected Source Intelligence behavior:

```text
activation = DORMANT
source history scan = 0
source prompt contribution = 0
structured re-entry = 0
source semantic generation = 0
source validator work = 0
source presentation build = 0
source persistent read/write = 0
network / extra-model / background work = 0
```

## 23. Real-validation philosophy

Real validation must evaluate the **deployed `release-simcore` runtime**, not a local unshipped candidate.

It must use ordinary target-host interaction where the feature is expected to operate.

It should capture diagnostics and operator observations without making diagnostics themselves the semantic source of truth.

A visually convincing output is not enough.

## 24. Real-validation evidence header

Every 3.0M live evidence packet must identify:

```text
runtime version / release label
release-simcore exact commit
latest.js blob
install.js blob
latest.js == install.js
runtime generation / boot identity when available
target host / model identity as allowed by existing diagnostics
validation packet / operator protocol version
```

If exact runtime identity is uncertain, evidence is HOLD rather than guessed.

## 25. Real lane R0 · Source-irrelevant ordinary long-chat baseline

Purpose:

```text
prove Source Intelligence does not degrade ordinary chat when irrelevant
```

The lane must include ordinary turns before and after source-active turns in one realistic long-running chat where practical.

Verify:

```text
DORMANT activation
no structured source re-entry
Current Task Primacy
continuity
no stale source-topic replay
no source-to-world fact leakage
no instruction competition symptom attributable to Source Intelligence
bounded latency / context effect
```

Failure classification:

```text
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

## 26. Real lane R1 · LIVE_REACTION direct B → C

Purpose:

```text
prove first compatibility family under actual host mechanics
```

Required observations:

```text
current direct-B-root authority
eligible short C source job
correct source-authority binding
Exposure behavior matches accepted model-compliance contract
validated projection corresponds to current source
presentation does not create semantic authority
ordinary next turn returns DORMANT when source is no longer relevant
```

Legacy Community fallback/coexistence must remain observable as designed during migration.

## 27. Real lane R2 · BOARD direct B → C

Purpose:

```text
prove first genuinely new family structure
```

Required positive case:

```text
current direct-B-root authority
BOARD active
public/eligible POST
eligible REPLY with visible parent
validated thread structure
BOARD_THREAD_V1 presentation
```

Required negative case:

```text
parent POST denied/held
child otherwise locally eligible
→ child not rendered as independent semantic survivor
```

No cross-turn participant identity may appear unless a later amendment activates Candidate C.

## 28. Real lane R3 · NEWS maturity

Purpose:

```text
prove publication maturity remains independent from Exposure and truth
```

Required cases:

```text
exposure ALLOW + maturity HOLD
→ whole story quarantined

exposure ALLOW + maturity ALLOW
→ story accepted

hidden/unexposed claim + maturity ALLOW
→ still not publishable as confirmed fact
```

Headline and body must both respect semantic policy.

## 29. Real lane R4 · Mixed source-active / ordinary alternation

Required conceptual sequence:

```text
ordinary
→ source-active family
→ ordinary
→ different source-active family
→ ordinary
```

Acceptance:

```text
ordinary steps become DORMANT
old visible source cards do not reactivate semantics
no structured source history is reused
no automatic family carryover
```

## 30. Real lane R5 · Repeated mixed source no-accumulation

Run repeated current projections, including at least:

```text
repeated BOARD
repeated NEWS
alternating BOARD / NEWS / LIVE_REACTION
```

Acceptance requires no growth in:

```text
3.0M semantic history
persistent source keys
automatic re-entry bytes
history scan window
background jobs
```

Measured current-projection work may vary with current payload size but not with the count of previous source turns.

## 31. Real lane R6 · Source reroll / replacement invalidation

Procedure conceptually:

```text
produce current source projection
→ reroll / replace supporting source authority
→ attempt later presentation/consumer use of old projection
```

Expected:

```text
old sourceAuthorityRef no longer matches current authority
→ old projection invalid
→ old object not reused
```

A later authorized source request must generate a fresh projection from current authority.

## 32. Real lane R7 · Source edit / replacement + fresh projection

Use a genuine visible edit or other accepted source-authority-changing action.

Verify:

```text
existing representation/edit reconciliation remains correct
old derived projection does not survive as current authority
new projection binds the edited/current source
unrelated host metadata remains preserved
```

No item-level salvage is required by first-major scope.

## 33. Real lane R8 · Cross-family same-event proof

Use one exposed event E and independently request/project it under each supported family.

Expected:

```text
E → LIVE_REACTION
E → BOARD
E → NEWS
```

Acceptance:

```text
underlying current authority remains consistent
family wording / structure may differ
no family output becomes another family's truth authority
no family switch mutates core mode
NEWS maturity does not promote truth
```

This is the signature convergence scenario.

## 34. Real lane R9 · Presentation failure isolation

Induce or observe a bounded presentation adapter/mount failure without corrupting semantic authority.

Expected:

```text
validated semantics remain current for the current projection if source support remains valid
presentation reports/fails separately
presentation failure does not rewrite semantic content
presentation success cannot rescue invalid semantics
```

## 35. Real lane R10 · Renderer/style isolation

Where the runtime exposes an authorized presentation variation, prove:

```text
same validated semantic payload
+ different allowed presentation policy
→ different appearance only
```

Forbidden mutation:

```text
assertion content
mode
source authority
Exposure result
maturity result
core runtime mode
```

If no presentation variation is implemented in the accepted runtime scope, this lane is DEFER rather than simulated.

## 36. Real lane R11 · Legacy Community coexistence

During migration where legacy `<COMMUNITY>` remains:

```text
legacy transcript behavior may persist
structured current projection may exist when active
```

Acceptance:

```text
no second structured historical re-entry copy
no automatic conversion of old Community prose into trusted structured assertions
legacy presence alone does not activate structured Source Intelligence
```

## 37. Real lane R12 · Reload / residue isolation

After a reload/re-entry or equivalent supported host lifecycle:

```text
old presentation residue / host history
must not become current structured source authority
```

Verify:

```text
ordinary next request is DORMANT unless current authority explicitly selects a source job
no hidden structured source archive is restored
existing SimCore reload/edit safety remains healthy
```

## 38. Real lane result vocabulary

Each lane receives one terminal lane result:

```text
PASS
WATCH
FIX
BLOCKER
DEFER
```

Rules:

### PASS

All required assertions for the lane are supported by appropriate evidence.

### WATCH

Non-blocking uncertainty/anomaly with preserved evidence. It must not contradict a frozen invariant.

### FIX

A concrete defect was found. The affected lane is not PASS until repair is deployed and the relevant lane is rerun.

### BLOCKER

A major invariant, authority boundary, or required evidence claim failed. Runtime-major close stops.

### DEFER

Lane capability is explicitly outside the deployed first-major scope. DEFER is acceptable only when the corresponding feature was already excluded by the accepted scope.

## 39. WATCH close rule

A runtime major may close with a WATCH only when all are true:

```text
WATCH is documented with evidence
WATCH is explicitly non-blocking
WATCH does not contradict a major invariant
WATCH has a bounded follow-up owner/path
required acceptance lane itself still has sufficient PASS evidence
```

A WATCH cannot be used as softer wording for an unresolved failure.

## 40. FIX close rule

A FIX requires:

```text
defect record
→ bounded design/implementation repair
→ static/CI rerun
→ release-simcore redeploy if runtime changed
→ affected real lane rerun
→ evidence update
```

Only then may the lane become PASS/WATCH as appropriate.

## 41. BLOCKER close rule

Any unresolved BLOCKER prevents runtime-major closure.

Major blockers include, but are not limited to:

```text
SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
SOURCE_IRRELEVANT_PROMPT_OR_HISTORY_INJECTION
SOURCE_WORK_REQUIRES_UNBOUNDED_HISTORY_SCAN
SOURCE_HISTORY_OR_STATE_ACCUMULATES_WITHOUT_AUTHORITY
FAMILY_TO_FAMILY_DERIVED_ASSERTION_BECOMES_TRUTH_AUTHORITY
SOURCE_FAMILY_MUTATES_CORE_MODE
RENDERER_OR_UI_STATE_MUTATES_SEMANTIC_AUTHORITY
PRESENTATION_SUCCESS_RESCUES_INVALID_SEMANTIC_STATE
NEWS_MATURITY_UPGRADES_ASSERTION_TRUTH
SOURCE_INTEGRATION_OVERWRITES_UNOWNED_HOST_METADATA
ACTIVE_FAMILY_HAS_NO_EXPLICIT_CURRENT_SOURCE_JOB_AUTHORITY
MULTI_FAMILY_FANOUT_OCCURS_WITHOUT_DEDICATED_DESIGN
INTEGRATION_ACTIVATES_CANDIDATE_C_WITHOUT_DEDICATED_DESIGN
```

## 42. Performance evidence

Real close must include measured evidence rather than design claims.

Capture at least:

```text
source-irrelevant ordinary request latency / context contribution
source-active prompt / output size
validator work and latency
presentation work and latency
repeated-source sequence behavior
history scan count
persistent source read/write count
network / extra-model / background count
```

No universal numeric latency threshold is invented by design-only 3M-10.

Acceptance instead requires:

```text
no hidden structural non-zero where design requires zero
no unbounded growth with previous source-turn count
no source-irrelevant quality regression attributable to Source Intelligence
family active work remains within frozen implementation caps
```

A later implementation design may add quantitative budgets based on measured baseline evidence.

## 43. Model-compliance evidence is its own authority layer

For generative semantic behavior:

```text
validator policy correctness
!=
model follows prompt contract in real host
```

Exposure model-compliance evidence must remain independently captured and reviewed.

A successful validator cannot prove the model never generated a forbidden draft; it only proves the consumer handled the draft according to policy.

Likewise model compliance cannot replace validator enforcement.

## 44. No automatic semantic repair

Convergence preserves judge-only validation.

Forbidden runtime close shortcuts:

```text
DENY fact → silently relabel opinion
NEWS maturity HOLD → silently downgrade story
BOARD denied parent → detach child
invalid source ref → bind nearest historical source
```

A separately designed regeneration/repair loop would require new authority/cost analysis.

## 45. No evidence laundering

Forbidden claims:

```text
CI PASS
→ target-host PASS

mock host PASS
→ actual host PASS

pretty UI
→ semantic PASS

one family PASS
→ all-family PASS

short single-turn sample
→ no-accumulation PASS

model output looks safe
→ Exposure contract proven

NEWS article exists
→ public knowledge settled
```

Every closure claim must use evidence from its owning validation layer.

## 46. Runtime deployment sequence

When implementation is separately authorized, runtime proof follows the normal SimCore authority chain:

```text
main repo design/evidence
→ work branch implementation
→ static / CI verification
→ release-simcore deployment
→ real target-host long-chat validation
→ anomaly preservation / classification
→ main docs + durable project memory synchronization
```

`release-simcore` remains authority for deployed plugin code.

`main` remains authority for design, evidence, roadmap, and administrative records.

## 47. Release-system separation

Do not combine 3.0M feature implementation with release/repository-system restructuring.

If the release system itself requires a change, that is a separate transaction with its own evidence and should not be hidden inside Source Intelligence implementation.

## 48. S7 / v0.70.3 separation

S7 / v0.70.3 remains a separate product lane.

The v0.70.3 practical long-chat window may be used to collect the already-deferred Exposure target-host evidence when appropriate.

But:

```text
S7 LIVE PASS
!=
3.0M IMPLEMENTATION AUTHORIZATION

EXPOSURE PREFLIGHT PASS
!=
3.0M COMPLETE RUNTIME PASS
```

3.0M feature code must not be mixed into the S7 transaction.

## 49. Deferred capability ledger

The following remain intentionally outside first-major runtime closure:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE settlement
persistent source history
source retrieval
cross-turn source-local identity
item-level edit/reroll survival
append/merge article/thread state
multi-family simultaneous fanout
derived-to-derived propagation
network/media materialization
auxiliary-model fanout
source semantic cache
semantic source interaction such as write/reply/like/share
```

If any is later promoted, create a new bounded design/evidence transaction.

## 50. Design-convergence closure receipt

The design-only 3M-10 result is conceptually:

```text
3M10DesignConvergenceReceipt
  designProgram = CONVERGED
  firstMajorFamilies = [LIVE_REACTION, BOARD, NEWS]
  runtimeReadiness = NOT_READY
  runtimeImplementation = NOT_AUTHORIZED
  realValidation = NOT_RUN
  candidateC = NOT_ACTIVATED
  production = UNCHANGED
```

This is a documentation conclusion, not a runtime schema.

## 51. Runtime-major close decision rule

A future first-major runtime close requires:

```text
DESIGN PROGRAM CONVERGED
AND applicable G1-G8 runtime-readiness gates closed
AND implementation static / CI PASS
AND exact release-simcore deployment proven
AND required deterministic semantic matrices PASS
AND required DORMANT / accumulation matrices PASS
AND required real target-host lanes PASS
AND performance evidence acceptable
AND model-compliance evidence acceptable where applicable
AND no unresolved BLOCKER
AND all FIX items repaired/retested
AND all DEFER items remain outside accepted scope
AND any remaining WATCH explicitly non-blocking
AND main evidence / administrative sync completed
```

Only then:

```text
3.0M FIRST-MAJOR RUNTIME = CLOSED
```

## 52. Current blocker / pending gate ledger

At design convergence:

```text
BLOCKER · ACTIVE_EXPOSURE_TARGET_HOST_EVIDENCE_PENDING
BLOCKER · ACTIVE_SOURCE_JOB_SELECTION_AUTHORITY_UNFROZEN
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
BLOCKER · ACTIVE_FAMILY_HARD_CAPS_UNFROZEN
BLOCKER · ACTIVE_NEWS_MATURITY_CONTEXT_PRODUCER_UNFROZEN
BLOCKER · ACTIVE_3M9_EVIDENCE_INSTRUMENTATION_UNFROZEN
```

These block **active runtime implementation/readiness**, not design convergence.

`G1 then-current production re-preflight` is a mandatory start gate rather than a design-time defect.

## 53. WATCH ledger at design convergence

Existing relevant WATCH items remain separate and preserved, including:

```text
WATCH · MODEL_COMPLIANCE_REMAINS_UNPROVEN
WATCH · EXPOSURE_SIGNAL_CLASSIFICATION_IS_NOT_YET_PRODUCTION_MACHINE_PROOF
WATCH · FUTURE_SOURCE_PRODUCER_PROMPT_COST_UNMEASURED
WATCH · FUTURE_HOST_MOUNT_RENDER_COST_UNMEASURED
WATCH · TARGET_HOST_REAL_PERFORMANCE_UNPROVEN
WATCH · ASSERTION_MODE_TERMINOLOGY_GENERALIZATION
```

None authorizes runtime behavior by itself.

## 54. Final 3M-10 state

```text
3M_10_DESIGN                              = FROZEN
3M_10_IMPLEMENTATION                      = NOT_AUTHORIZED
3M_DESIGN_PROGRAM                         = CONVERGED
FIRST_MAJOR_FAMILIES                      = LIVE_REACTION / BOARD / NEWS
SOCIAL_FEED                               = DEFERRED
PUBLIC_KNOWLEDGE                          = DEFERRED / SETTLEMENT CONTRACT REQUIRED
CANDIDATE_C                               = CONDITIONALLY_READY / NOT ACTIVATED
STRUCTURED_SOURCE_HISTORY                 = NONE
STRUCTURED_SOURCE_PERSISTENCE             = NONE
AUTOMATIC_STRUCTURED_SOURCE_REENTRY       = NONE
AUTOMATIC_MULTI_FAMILY_FANOUT             = NONE
FAMILY_TO_FAMILY_TRUTH_AUTHORITY          = FORBIDDEN
SOURCE_IRRELEVANT_POLICY                  = DORMANT / ZERO SEMANTIC BURDEN
RUNTIME_READINESS                         = NO
REAL_TARGET_HOST_LONG_CHAT                = NOT_RUN
REAL_PERFORMANCE_PASS                     = NOT_CLAIMED
MODEL_COMPLIANCE_PASS                     = NOT_CLAIMED
PRODUCTION                                = UNCHANGED
S7 / v0.70.3                              = UNCHANGED
release-simcore                           = UNCHANGED
NEXT_3M_DESIGN_CHECKPOINT                 = NONE
NEXT_PROGRAM_PHASE                        = SEPARATELY AUTHORIZED IMPLEMENTATION-READINESS / RUNTIME PROGRAM
```

## 55. Terminal design statement

The 3.0M design program is complete when this document is merged and verified.

The product is not complete.

The correct handoff is:

```text
DESIGN CONVERGED
→ preserve current gate ledger
→ continue separate S7 / Exposure evidence lanes as authorized
→ when runtime implementation is explicitly authorized, re-preflight then-current production
→ close G1-G8 as applicable
→ implement in bounded work branches
→ deploy through release-simcore
→ execute the real-validation protocol above
→ classify all anomalies immediately
→ only then close the first-major runtime
```

# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-0 Contextual Durable Page Master Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-0 DESIGN FROZEN · PK-D4 CONTEXTUAL_DURABLE_PAGE MASTER · C6 DESIGN ACTIVATED · EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1 · ONE EXACT PAGE · ONE EXACT CURRENT HEAD · FRESH SUPPORT-AT-USE · DOUBLE CURRENTNESS BEFORE DISPATCH · STATUS-PRESERVING CONTEXT PROJECTION · STRICT DATA ROLE / INSTRUCTION FIREWALL · ONE MODEL OPERATION · NO AMBIENT MEMORY · NO HISTORICAL CONTEXT V1 · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-0 · CONTEXTUAL_DURABLE_PAGE · CANDIDATE C C6 · MASTER DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-D4 is the explicit Candidate C consumer for a requirement deliberately excluded from PK-D1, PK-D2, and PK-D3:

```text
one durable derived PUBLIC_KNOWLEDGE page
must influence a later model operation
by entering that later model's bounded semantic context
```

D4-0 freezes the family-wide master architecture and the first minimal C6 profile.

It does not implement a prompt, model call, storage adapter, token counter, runtime schema, UI, plugin hook, release, or `release-simcore` change.

## 1. Authority inherited from prior PUBLIC_KNOWLEDGE work

PK-D4 consumes, but does not replace:

```text
PK-X1 / PK-D1
→ durable page identity / active lifetime

PK-D2
→ authoritative current head / immutable committed revision

PK-D3
→ historical admission / disclosure / presentation for historical operations

PK-X2
→ current page discovery/search

PK-2 / 3M-6
→ current PUBLIC_KNOWLEDGE semantic validation / support-at-use
```

## 2. Canonical new boundary

The central rule remains:

```text
DURABLE PAGE PRESENT
!= MODEL CONTEXT
```

PK-D4 creates the first explicit bridge:

```text
DURABLE PAGE
+ TRUSTED CURRENT CONTEXT INTENT
+ EXACT ACTIVE PAGE
+ EXACT CURRENT HEAD
+ FRESH CURRENT REVALIDATION
→ BOUNDED MODEL CONTEXT
```

No component may be skipped merely because the page existed earlier.

## 3. Candidate C profile

The PUBLIC_KNOWLEDGE durable product line after D4-0 has:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = YES   // newly opened by PK-D4
C7 historical survival        = YES   // inherited PK-D3 product capability
C8 delayed effect targeting   = NO
```

Important distinction:

```text
PRODUCT LINE HAS C7
!= D4 V1 CONTEXT SOURCE USES HISTORICAL REVISION
```

D4 V1 context source is current head only.

## 4. Selected first profile

Frozen first profile:

```text
EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

Required shape:

```text
one trusted explicit D4 intent
one ACTIVE lifetime
one exact pageIdentity
one exact current head revision
one fresh current semantic validation
one bounded semantic context projection
one model operation
```

## 5. First-profile exclusions

Not part of D4 V1:

```text
historical revision context
revision-list context
historical compare context
restore seed as general context
multiple-page context
all-page memory search
embedding retrieval
cross-conversation memory
sticky model memory
background refresh
late callback attachment
```

## 6. Why current-head-only is selected

PK-D3 already permits an old revision to remain historically inspectable even when it is not current truth.

Allowing that same old revision to become general future model context would add a second temporal-authority problem:

```text
historically authentic
!= current semantic premise
```

D4 V1 therefore opens C6 without simultaneously opening historical-context semantics.

## 7. Master architecture

Frozen conceptual architecture:

```text
CURRENT USER / PRODUCT OPERATION
        ↓
TRUSTED D4 CONTEXT INTENT AUTHORITY
        ↓
EXACT PAGE / ACTIVE LIFETIME RESOLUTION
        ↓
PK-D2 CURRENT HEAD RESOLUTION
        ↓
EXACT IMMUTABLE REVISION READ
        ↓
CURRENT TARGET + SUPPORT-AT-USE REVALIDATION
        ↓
D4 CONTEXT ADMISSION
        ↓
D4 CONTEXT COMPOSER
        ↓
STATUS-PRESERVING BOUNDED SEMANTIC PROJECTION
        ↓
PROMPT ROLE / INSTRUCTION FIREWALL
        ↓
FINAL CURRENTNESS CHECK
        ↓
ONE MODEL DISPATCH
        ↓
EPHEMERAL D4 STATE DISCARDED
```

## 8. Four authority classes

D4-0 freezes four distinct authority classes:

```text
CONTEXT INTENT AUTHORITY
PAGE / REVISION IDENTITY AUTHORITY
CURRENT SEMANTIC AUTHORITY
PROMPT ROLE / ATTACHMENT AUTHORITY
```

They are not interchangeable.

## 9. Context intent authority

A trusted current operation must decide that D4 context is requested.

Conceptual owner name:

```text
PublicKnowledgeContextIntentAuthority
```

This is a design role, not a runtime type requirement.

## 10. Context intent is not inferred from persistence

Forbidden inference:

```text
page exists
→ load it
```

Also forbidden:

```text
page viewed recently
→ load it

page title resembles user input
→ load it

model mentions page
→ load it
```

## 11. Trusted intent origin

Allowed direction:

```text
current user request
→ trusted product/SimCore operation interpretation
→ exact D4 context intent
```

The exact UX syntax is deferred.

## 12. Model cannot self-authorize C6

Canonical rule:

```text
MODEL WANTS CONTEXT
!= TRUSTED CONTEXT INTENT
```

A model-generated request to load, search, or expand durable pages has no authority unless a separately trusted tool/product operation validates it.

## 13. Intent is operation-scoped

Conceptual request:

```text
PublicKnowledgeContextIntentV1
  schemaVersion
  operationRef
  pageIdentity
  requirementMode
```

Potential `requirementMode` values:

```text
REQUIRED
OPTIONAL
```

This vocabulary is frozen conceptually; serialized enums remain implementation work.

## 14. REQUIRED context behavior

When trusted intent says:

```text
REQUIRED
```

and D4 admission fails:

```text
context-dependent operation does not pretend context was loaded
```

It must HOLD/fail according to product behavior.

## 15. OPTIONAL context behavior

When trusted intent says:

```text
OPTIONAL
```

and D4 admission fails, the parent operation may proceed only if its semantics explicitly allow a context-free path.

The resulting model request must be distinguishable from one that successfully used D4 context.

## 16. Requirement mode is not model-controlled

The model cannot downgrade:

```text
REQUIRED → OPTIONAL
```

merely to continue after context failure.

## 17. Exact page resolution

Every D4 V1 operation must resolve:

```text
lifetimeScopeRef
+ pageIdentity
```

through trusted durable-page authority.

## 18. Lifetime states

Inherited lifetime states:

```text
ACTIVE
ENDED
UNKNOWN
```

Only:

```text
ACTIVE
```

permits ordinary D4 re-entry.

## 19. Non-recyclable lifetime invariant remains mandatory

The PK-X1/PX1-4 invariant remains:

```text
ENDED lifetimeScopeRef generation
must never later identify a new logical conversation lifetime
```

This prevents stale physical rows from becoming future prompt memory.

## 20. No cross-lifetime context

First profile rejects:

```text
pageIdentity from lifetime A
+ current operation in lifetime B
```

No aliasing by title or target label is permitted.

## 21. Physical residue is inert

After logical lifetime END:

```text
old page/revision rows may physically remain
```

but:

```text
D4 resolve/use = forbidden
```

Physical cleanup failure never revives C6 authority.

## 22. Target identity continuity

Where page identity is target-bound, D4 must re-prove exact current target identity continuity before semantic projection.

No fuzzy label or title match.

## 23. Visible title is not identity

Forbidden context address inputs:

```text
page title
display label
old label
DOM title
host message number
search result ordinal
browser route text treated as trusted by itself
```

## 24. Search can discover but cannot authorize

PK-X2 may produce a current page locator for user selection.

Canonical chain:

```text
PK-X2 discovery
→ explicit user/product selection
→ exact durable page resolution
→ D4 admission
```

Not:

```text
search hit
→ prompt injection
```

## 25. One-page V1

D4-0 freezes:

```text
PAGES PER D4 V1 OPERATION = exactly one selected page at most
```

No top-K or related-page expansion.

## 26. Current head authority

PK-D2 remains authoritative for:

```text
current head revisionRef
```

D4 never owns a second durable head pointer.

## 27. Cached head is not enough

A page view or previous turn may remember:

```text
head = R8
```

D4 admission must re-read the owner.

## 28. Exact revision read

After current head resolution:

```text
pageIdentity + revisionRef
→ exact committed immutable revision record
```

must be proven.

## 29. Membership remains required

A revision row without authoritative committed membership cannot become D4 context.

## 30. D3 historical admission is not required for current-head D4 use

D4 V1 current semantic use is governed by current authority.

Therefore a valid current PK-D2 revision does not need D3 historical admission merely to enter D4 current-head context.

Historical admission remains a historical-inspection authority.

## 31. Historical admission cannot substitute for current validation

Likewise:

```text
D3 historical authenticity PASS
```

cannot authorize current D4 context when current support fails.

## 32. First currentness check

At selection/admission start:

```text
selectedRevisionRef = exact current head
```

This becomes the operation's currentness expectation.

## 33. Revalidation is support-at-use

The exact revision must be re-evaluated against current required authorities.

Conceptual chain:

```text
revision semantics
+ current target
+ current source/support
+ current Exposure
+ current settlement
+ current citation/provenance compatibility
→ D4 semantic eligibility
```

## 34. Durable content never self-supports

Canonical rule:

```text
COMMITTED ONCE
!= VALID AS MODEL PREMISE FOREVER
```

## 35. Current semantic authority failure

If required current support is unavailable, denied, incompatible, or invalid:

```text
no D4 semantic projection
```

## 36. No stale fallback

Forbidden fallback sources:

```text
cached current body
last rendered page
host transcript
old historical revision
compare output
restore seed
model memory
```

## 37. Semantic projection is a new read boundary, not new semantics

D4 Context Composer produces:

```text
bounded structured projection of already-current-valid semantics
```

It does not generate new claims.

## 38. Conceptual semantic projection

Potential boundary:

```text
PublicKnowledgeContextProjectionV1
  contextProfile
  currentDisplayLabel?
  sections[]
    sectionKind
    assertions[]
      mode
      content
      referenceState
      attribution/citation semantics when admitted
```

Exact serialized schema is deferred to D4-2.

## 39. Projection preserves semantic status

The composer must not flatten:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

into unqualified plain facts.

## 40. Projection is not a summary

D4 V1 does not authorize model-generated or heuristic semantic summaries to fit context.

## 41. No silent assertion dropping

If the V1 profile requires the page semantic unit to be complete and it cannot fit future bounds:

```text
HOLD
```

not:

```text
keep the first assertions
```

The exact bounded projection completeness rule is deferred to D4-2/D4-5.

## 42. No status dropping to fit budget

Never discard correction/contest/withdrawal/attribution state merely to reduce context size.

## 43. Storage metadata excluded from semantic projection

Not ordinary model context:

```text
backend row IDs
head storage versions
commitExpectation internals
historical admission receipt bytes
support anchor internals
private validator reasons
cleanup metadata
operational counters
```

## 44. Renderer output excluded

D4 does not scrape:

```text
HTML
DOM
CSS
screen text
host transcript card
```

back into the main model prompt.

## 45. Current label authority

If stable target identity remains the same but current display label changes:

```text
current trusted display label wins
```

An old revision title is not current label authority.

## 46. Citation semantics

D4-0 permits bounded visible citation/attribution semantics to be included when required to preserve meaning.

It does not permit raw internal source/support objects to be copied into model context by default.

## 47. Citation display is not citation authority transfer

Even when citation labels appear in context:

```text
model sees citation semantics
!= model owns source validation
```

## 48. No automatic citation dereference

A citation URL/label does not authorize a new network fetch or source retrieval inside D4 V1.

## 49. Context admission

D4 requires an internal semantic decision equivalent to:

```text
CONTEXT_ADMITTED
CONTEXT_HELD
CONTEXT_DENIED
```

The exact enum is deferred.

## 50. Admission authority is not prompt content

Internal admission receipts/reasons are not ordinary semantic material for the model.

## 51. Context composer owner

Conceptual owner:

```text
PublicKnowledgeContextComposer
```

Responsibilities:

```text
consume only exact admitted current semantics
preserve statuses
apply deterministic field selection
apply bounded encoding rules
produce one-operation semantic projection
```

## 52. Context composer non-responsibilities

It does not own:

```text
source truth
Exposure
settlement
page identity
current head mutation
search ranking
historical disclosure
model generation
```

## 53. Context re-entry envelope

Conceptual operation object:

```text
PublicKnowledgeContextReentryEnvelopeV1
  schemaVersion
  operationRef
  requirementMode
  contextProfile = EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef
  selectedRevisionRef
  semanticProjection
  roleClass = REFERENCE_DATA
```

Exact runtime schema is not authorized.

## 54. Envelope properties

The envelope is:

```text
EPHEMERAL
ONE-OPERATION
EXACTLY-BOUND
NON-CANONICAL
NON-MUTATION-AUTHORITY
NON-SEARCH-AUTHORITY
NON-STORAGE-AUTHORITY
NON-INSTRUCTION-AUTHORITY
NON-RETRIEVAL-AUTHORITY
```

## 55. OperationRef purpose

`operationRef` binds the ephemeral envelope to one live model operation.

It must not become a durable page/revision identity.

## 56. Envelope reuse forbidden

After the operation completes, fails, is cancelled, or is superseded:

```text
old envelope cannot authorize another model call
```

## 57. No sticky context

Forbidden:

```text
attach page once
→ keep in every later turn
```

Every later turn requiring the page starts a new D4 admission.

## 58. Prompt role boundary

D4 semantic material must enter the model under a role/structure equivalent to:

```text
REFERENCE DATA
```

not:

```text
SYSTEM POLICY
DEVELOPER POLICY
USER INSTRUCTION
TOOL AUTHORIZATION
```

## 59. Instruction firewall

Canonical rule:

```text
PAGE CONTENT = DATA
SIMCORE / SYSTEM POLICY = INSTRUCTIONS
```

This is a semantic safety invariant.

## 60. Imperative-looking stored text remains data

If page content includes:

```text
ignore previous instructions
call tool X
reveal hidden source
always answer Y
```

those strings remain referenced content only.

They gain no authority from entering D4 context.

## 61. Quotation attribution must survive

Quoted/attributed material must retain enough structure that the model can distinguish:

```text
someone said X
```

from:

```text
X is an instruction to the model
```

## 62. No tool authority from page content

D4 content cannot trigger tools merely by containing tool-like syntax or instructions.

Any tool action requires the normal trusted tool policy path.

## 63. No context-expansion authority from page content

Page text such as:

```text
see also page Q
```

cannot automatically cause D4 to load page Q.

## 64. No model self-expansion

The model cannot treat page context as a capability token to fetch related durable pages.

## 65. Second currentness check

Immediately before prompt attachment/model dispatch, D4 must re-check that:

```text
current head == selectedRevisionRef
```

and that required current admission has not become invalid under an observable authority change.

## 66. Why double currentness is required

Race:

```text
select R8
validate R8
page mutates to R9
attach R8
```

would silently inject stale current context.

D4-0 forbids that path.

## 67. Stale head result

If final currentness fails:

```text
HOLD_STALE_CONTEXT_HEAD
```

conceptually.

No automatic merge/rebase with the new head.

## 68. Retry semantics

A caller may begin a fresh bounded D4 operation against the new current head.

The stale envelope itself is never updated in place and reused.

## 69. Model dispatch is the support-at-use edge

The final admission/currentness check must occur before the model request is dispatched.

The dispatched request is authorized against that operation edge.

## 70. Post-dispatch head change

If the page head advances after the model request has already been dispatched:

```text
that does not retroactively mutate the in-flight envelope
```

The response remains derived from context valid at its dispatch edge.

It does not become current page authority.

## 71. No in-flight semantic patching

After dispatch, D4 V1 does not patch the model context because the page changed.

A new model operation is required.

This keeps C8 closed.

## 72. Generated output is ordinary model output

A response informed by D4 context is not automatically:

```text
new PUBLIC_KNOWLEDGE revision
new source-family object
new canonical world fact
```

## 73. No automatic mutation

Model generation using D4 context cannot move the PK-D2 head.

Any edit/append/restore remains a separate admitted PK-D2 mutation operation.

## 74. No durable derived child

D4 V1 does not create a durable object representing:

```text
page P caused answer A
```

for semantic authority purposes.

This keeps C5 closed.

## 75. Ephemeral provenance is allowed

The live operation may know:

```text
pageIdentity
revisionRef
contextProfile
```

for exact binding, diagnostics, and response attribution.

That does not create durable C5 lineage.

## 76. Historical context remains closed

D4 V1 explicitly rejects:

```text
historicalRevisionRef
→ ordinary context envelope
```

Even if D3 body disclosure is ALLOW.

## 77. Historical view on screen does not select context

If the user is looking at R4 historically while current head is R9:

```text
D4 current-head operation resolves R9
```

not R4.

## 78. Current failure does not fall back to history

If R9 current semantic revalidation fails:

```text
D4 context unavailable
```

Do not inject historically authentic R4.

## 79. Historical-context future child requirement

Opening historical context later would need explicit answers for:

```text
which historical revision
why historical semantics are relevant
how temporal status is encoded
how current-vs-historical claims are separated
whether current disclosure alone is sufficient
what context budget applies
```

D4-0 does not answer those by implication.

## 80. Restore seed remains separate

D3-4's historical restore handoff is a mutation-specific semantic seed.

It is not general D4 context memory.

## 81. Compare output remains separate

D3-3 compare output is ephemeral presentation derivative.

It cannot enter D4 V1 context as authoritative page semantics.

## 82. PK-X2 coexistence

PK-X2 remains:

```text
current page discovery
```

D4 remains:

```text
exact selected page current-head context re-entry
```

## 83. Search does not become memory retrieval

No:

```text
query current user prompt against all durable pages
→ inject top result automatically
```

in D4 V1.

## 84. Feature OFF

When PK-D4 is disabled:

```text
D4 intent admission      = 0
D4 page/head reads       = 0
D4 context composition   = 0
D4 prompt attachment     = 0
D4 background retrieval  = 0
```

Existing D1/D2/D3 data remains governed by its own feature/lifetime rules.

## 85. Reload

Reload clears ephemeral D4 state:

```text
operationRef
selectedRevisionRef expectation
context admission
context envelope
```

No automatic rematerialization.

## 86. Lifetime END

Trusted lifetime END immediately prevents new D4 operations.

Pre-dispatch in-flight D4 admission becomes invalid if END is observed before dispatch.

## 87. Lifetime UNKNOWN

UNKNOWN fails closed.

No cached active state may upgrade UNKNOWN to ACTIVE.

## 88. Physical cleanup timing irrelevant to C6 admission

Logical lifetime state governs D4 use.

Backend deletion timing does not.

## 89. No cross-conversation memory

Conversation-scoped lifetime remains the V1 context boundary.

## 90. No page access recency semantics

D4 does not persist or use:

```text
lastOpenedAt
lastContextUsedAt
mostRecentlyViewed
```

as selection authority.

## 91. Read side effects forbidden

D4 context read does not mutate:

```text
page revision
current head
historical admission
settlement state
citation state
page identity
```

## 92. Operational telemetry may exist later

Bounded operational metrics may be recorded by runtime diagnostics.

They must not become semantic selection/ranking authority by default.

## 93. Resource architecture

D4-0 freezes separate future budget domains:

```text
semantic projection logical bytes
context envelope logical bytes
model-input token budget
visible citation/attribution budget
```

Exact values are deferred to D4-5.

## 94. No provider-window authority expansion

A model with a larger context window does not automatically receive more D4 page material.

D4 product caps remain independent of provider capacity.

## 95. No semantic truncation as overflow handling

When a required semantic projection exceeds a future hard bound:

```text
HOLD
```

unless D4-2/D4-5 explicitly freezes a completeness-preserving projection rule.

## 96. No model compressor in V1

D4-0 does not authorize a separate model to summarize, rank, or compress durable page semantics before re-entry.

## 97. Deterministic composer direction

For the same exact admitted logical input, the structured context projection should be deterministic enough for bound enforcement and testing.

Model generation itself need not be deterministic.

## 98. Context attachment failure

If role binding/prompt attachment cannot guarantee the D4 data boundary:

```text
no D4 context is attached
```

Do not fall back to plain-text concatenation that loses instruction separation.

## 99. User-facing reason privacy

Protected internal D4 failure reasons may be collapsed into generic user-visible states.

Do not leak:

```text
hidden target existence
private policy category
hidden support source
revision count
internal mismatch reason
withdrawal basis
```

## 100. Internal failure taxonomy

Conceptual classes:

```text
D4_FEATURE_DISABLED
D4_INTENT_INVALID
D4_LIFETIME_INACTIVE
D4_PAGE_IDENTITY_INVALID
D4_TARGET_IDENTITY_MISMATCH
D4_CURRENT_HEAD_UNAVAILABLE
D4_REVISION_MEMBERSHIP_INVALID
D4_REVISION_RECORD_INVALID
D4_CURRENT_SUPPORT_INVALID
D4_CONTEXT_POLICY_DENIED
D4_CONTEXT_LIMIT_EXCEEDED
D4_CONTEXT_ROLE_BINDING_FAILED
D4_STALE_CONTEXT_HEAD
D4_MODEL_DISPATCH_FAILED
```

Exact runtime enums remain open.

## 101. Dormancy invariant

On ordinary turns with no explicit D4 intent:

```text
D4 page lookup             = 0
D4 revision lookup         = 0
D4 context materialize     = 0
D4 search                  = 0
D4 history scan            = 0
D4 model-context injection = 0
D4 background model call   = 0
D4 background network call = 0
```

## 102. Acceptance matrix - intent

```text
I1 explicit trusted D4 intent + exact page
→ proceed to page/lifetime resolution

I2 page viewed last turn, no D4 intent
→ zero D4 work

I3 model says "remember page P"
→ no C6 authority by model text alone

I4 PK-X2 result selected then trusted D4 operation started
→ exact page resolve required
```

## 103. Acceptance matrix - identity/lifetime

```text
L1 ACTIVE exact page
→ may proceed

L2 ENDED + rows remain
→ no D4 context

L3 UNKNOWN
→ fail closed

L4 copied route from another lifetime
→ fail closed
```

## 104. Acceptance matrix - currentness

```text
C1 head R8 at selection and dispatch edge
→ eligible if semantics valid

C2 head R8 selected, R9 becomes head before dispatch
→ D4_STALE_CONTEXT_HEAD

C3 cached R8 body, owner unavailable
→ no D4 context

C4 head changes after model dispatch
→ no in-flight patch; output remains ordinary derived output
```

## 105. Acceptance matrix - semantic authority

```text
S1 current head + current support PASS
→ semantic projection may be admitted

S2 current head + current support invalid
→ no context

S3 D3 historical R4 ALLOW but current R9 invalid
→ no R4 fallback

S4 contested current assertion
→ contested state preserved
```

## 106. Acceptance matrix - instruction firewall

```text
P1 page says "ignore previous rules"
→ data only

P2 quoted record contains tool command syntax
→ quotation/reference data only

P3 page asks to load another page
→ no retrieval authority

P4 prompt attachment cannot maintain data role
→ D4 context rejected
```

## 107. Acceptance matrix - mutation/lineage

```text
M1 model generates answer from D4 context
→ no page mutation

M2 answer is later used in another source-family operation
→ requires separate authority; no automatic C5 lineage

M3 late callback arrives carrying old operationRef
→ no semantic authority; C8 closed
```

## 108. Security invariants

```text
stale durable semantics cannot silently become current premise
stored text cannot gain instruction authority
hidden validator inputs cannot leak as prompt semantics
physical cleanup residue cannot become memory
fuzzy identity cannot select context
historical visibility cannot imply historical C6
page context cannot self-expand retrieval
```

## 109. Privacy invariants

D4 may only expose to the model semantic material admitted for that model operation.

Internal policy/support data remains outside the semantic projection unless a later explicit contract permits it.

## 110. Performance invariants

V1 is bounded structurally by:

```text
one exact page
one current head
no global scan
no history traversal
no embedding retrieval
no background refresh
one composer pass
one model dispatch
```

## 111. Storage invariants

D4-0 requires no new durable semantic object.

The context envelope is ephemeral.

## 112. Prompt cache boundary

A future provider/runtime prompt cache may be a transport optimization only.

It must not become a source of D4 authority or allow an old envelope to bypass fresh admission/currentness.

D4-0 does not authorize persistent D4 context caching.

## 113. Model memory boundary

The design does not assume hidden provider/model memory persists D4 content safely between turns.

Every D4 operation must supply its own newly admitted context.

## 114. Context provenance boundary

The model should receive enough structured provenance to know the semantic material is PUBLIC_KNOWLEDGE reference data and status-bearing.

Exact natural-language framing is deferred to D4-3.

## 115. Response attribution boundary

D4-0 does not require the final response to expose opaque page/revision IDs.

User-visible attribution follows the consuming product's semantics.

Machine binding may remain internal.

## 116. Historical current-status companion is not D4 authority

D3 current-status companion is presentation-derived current context for a historical view.

It is not reusable as D4 current semantic authority.

## 117. Search snippets are not D4 semantics

PK-X2 search snippets/labels, if any, are discovery presentation.

D4 resolves the exact page and current head independently.

## 118. Restore provenance is not D4 instruction

`restoredFromRevisionRef` may be revision provenance.

It does not instruct the model to privilege restored text or load the source historical revision.

## 119. Revision age is not context priority

Newer revision is current because the head authority says so, not because a timestamp/ordinal is semantically stronger.

## 120. Current head is still derived truth

Even current head material remains PUBLIC_KNOWLEDGE derived source intelligence.

It does not become canonical world state solely through D4 re-entry.

## 121. D4-1 checkpoint

D4-1 must freeze:

```text
trusted context-intent production
exact page selection
active lifetime proof
current-head pinning
operationRef lifecycle
selection/currentness race rules
```

## 122. D4-2 checkpoint

D4-2 must freeze:

```text
current support-at-use pipeline
semantic projection schema
status preservation
citation/attribution inclusion rules
deterministic materialization
projection completeness
```

## 123. D4-3 checkpoint

D4-3 must freeze:

```text
prompt role binding
instruction firewall
reference-data framing
provenance labels
model attachment semantics
tool/retrieval non-authority
```

## 124. D4-4 checkpoint

D4-4 must freeze interaction boundaries for:

```text
historical context remains closed or explicitly scoped
PK-X2 search coexistence
restore/edit/mutation separation
response-to-page mutation non-implication
```

## 125. D4-5 checkpoint

D4-5 must freeze:

```text
logical byte caps
token caps
lifetime/reload/feature-off closure
dormancy tests
final C1-C8 reassessment
PK-D4 convergence verdict
```

## 126. Runtime validation blockers

No runtime readiness claim before evidence for at least:

```text
trusted explicit intent producer
exact active page resolver
exact current head owner integration
committed revision validation
current support-at-use revalidation
context admission authority
deterministic context composer
status-preserving schema
hard byte/token limits
instruction-role firewall
stale-head double-currentness
one-operation envelope invalidation
feature-off/reload/lifetime teardown
reason-private failures
no ambient memory
no historical context V1
no C5/C8 drift
```

## 127. Explicit non-goals

D4-0 does not add:

```text
historical prompt re-entry
cross-conversation archive memory
multiple-page context
semantic/vector retrieval
automatic relevance ranking
persistent prompt memory
model-generated context summaries
context-induced page edits
derived-to-derived lineage
async revision effects
stable assertion identity
stable citation identity
```

## 128. Concurrent-main WATCH

Immediately before PK-D4 impact work, main advanced through unrelated Agent Skill timeout recovery and a PocketRisu helper invariant document.

No PUBLIC_KNOWLEDGE/Candidate C/D4 semantic overlap was identified.

Classification:

```text
WATCH · MAIN_ADVANCED_DURING_PK-D4_ENTRY · NON_BLOCKING
```

## 129. Authority split

```text
main
= design/docs/evidence/admin authority

release-simcore
= production runtime authority
```

D4-0 changes only `main` design documentation.

## 130. Master closure statement

```text
explicit trusted D4 operation
→ one exact ACTIVE pageIdentity
→ exact PK-D2 current head
→ exact committed revision
→ fresh current PUBLIC_KNOWLEDGE authority
→ deterministic bounded status-preserving context projection
→ strict REFERENCE_DATA role
→ final head/currentness check
→ one model dispatch
→ discard ephemeral envelope
```

And permanently for V1:

```text
DURABLE != AMBIENT MEMORY
HISTORICAL != CURRENT CONTEXT
DATA != INSTRUCTION
SEARCH HIT != CONTEXT AUTHORITY
MODEL REQUEST != RETRIEVAL AUTHORITY
CONTEXT USE != PAGE MUTATION
CONTEXT USE != C5 LINEAGE
LATE CALLBACK != C8 AUTHORITY
```

## 131. D4-0 result

```text
PK-D4 MASTER = FROZEN
C6 DESIGN ACTIVATION = YES
FIRST CONTEXT SOURCE = CURRENT HEAD ONLY
HISTORICAL CONTEXT = CLOSED FOR V1
C5 = CLOSED
C8 = CLOSED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

## 132. Next checkpoint

```text
D4-1 Context Selection / Exact Address
```

D4-1 will define the trusted explicit intent and exact page/current-head pinning contract in detail.

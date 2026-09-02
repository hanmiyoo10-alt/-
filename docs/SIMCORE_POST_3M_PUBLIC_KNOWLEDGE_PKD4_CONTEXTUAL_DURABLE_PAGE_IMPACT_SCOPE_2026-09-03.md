# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 Contextual Durable Page Impact Scope - 2026-09-03

Date: 2026-09-03 KST

Status: **PK-D4 IMPACT SCOPE FROZEN · C6 FIRST ACTIVATION SELECTED · EXPLICIT CURRENT-HEAD CONTEXT RE-ENTRY V1 · EXACT PAGE/REVISION ADDRESS · FRESH CURRENT REVALIDATION · ONE-OPERATION EPHEMERAL CONTEXT · INSTRUCTION FIREWALL REQUIRED · NO AMBIENT MEMORY · NO HISTORICAL CONTEXT V1 · C1+C2+C3+C4+C6+C7 PROFILE PRESSURE IDENTIFIED · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · CONTEXTUAL_DURABLE_PAGE · CANDIDATE C C6 · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-D1 through PK-D3 now define a bounded durable PUBLIC_KNOWLEDGE line:

```text
PK-D1 / PK-X1  durable page identity
PK-D2          revisioned page
PK-D3          historical page
```

Those designs deliberately preserve:

```text
DURABLE PAGE PRESENT
!= MODEL CONTEXT
```

PK-D4 is the explicit child design for the first requirement where one prior durable PUBLIC_KNOWLEDGE page must influence a later semantic generation by entering the main model context.

This impact scope decides the minimum safe seam before any detailed schema or runtime work.

It implements no prompt mutation, storage read path, model call, renderer, plugin hook, background retrieval, release, or `release-simcore` change.

## 1. Why PK-D4 is a new capability boundary

Durability alone allows:

```text
page survives
revision survives
historical revision may be inspected
```

It does not allow:

```text
old page text silently becomes future model input
```

The latter activates Candidate C gate C6:

```text
C6 = durable derived content re-enters future model context
```

Therefore PK-D4 is not a convenience extension of persistence.

It is a new authority boundary.

## 2. Current inherited capability profile

After PK-D3 convergence:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES
C8 delayed effect targeting   = NO
```

PK-D4 exists to evaluate and selectively activate:

```text
C6 = YES
```

without accidentally activating C5 or C8.

## 3. Selected first C6 profile

Impact decision:

```text
EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

First-profile meaning:

```text
one explicit current operation
+ one exact durable PUBLIC_KNOWLEDGE page
+ that page's exact current head
+ fresh current revalidation
+ bounded semantic context projection
→ one model operation
```

This is the smallest useful C6 opening.

## 4. Historical revision context is not in first profile

PK-D3 allows exact old revisions to be inspected historically under current disclosure policy.

That does not mean historical bytes should enter future generation.

First PK-D4 profile therefore forbids:

```text
historical revision → model context
compare diff         → model context
revision list        → model context
old restore seed     → model context
```

Historical-context re-entry requires a later explicit D4 child decision because it combines C6 with historical temporal semantics and C7.

## 5. Current-head-only reduces authority ambiguity

The selected first profile resolves:

```text
pageIdentity
→ authoritative current head revisionRef
→ fresh current semantic validation
```

before context materialization.

It does not accept a caller-supplied arbitrary historical revisionRef as ordinary semantic context.

## 6. Explicit operation requirement

Context re-entry requires a current trusted operation intent.

Acceptable conceptual origin:

```text
current user request
→ trusted SimCore/product operation classification
→ exact PUBLIC_KNOWLEDGE context request
```

Forbidden activation sources:

```text
model spontaneously decides to browse memory
page was viewed last turn
page is current UI selection
page is recently accessed
page title resembles current user text
embedding similarity
background relevance worker
```

## 7. Model cannot self-authorize retrieval

The main model may consume an already-authorized context envelope.

It may not expand authority by emitting text equivalent to:

```text
"load page P"
"search history"
"include all related pages"
```

unless a separately trusted tool/operation policy explicitly authorizes such a request.

Canonical rule:

```text
MODEL REQUEST
!= CONTEXT RETRIEVAL AUTHORITY
```

## 8. Context re-entry is exact-addressed

First profile must begin from exact durable identity.

Required addressing direction:

```text
lifetimeScopeRef
+ pageIdentity
→ exact current head
```

Where target continuity is required, current trusted target identity is also re-proved.

## 9. Forbidden page selection mechanisms

Do not select context by:

```text
visible title
fuzzy label match
old title
host message index
last viewed card
render instance key
DOM order
search rank position alone
model guess
content fingerprint
```

PK-X2 may help a user discover a current page, but D4 activation still resolves exact durable identity before semantic use.

## 10. Search and context selection remain separate

Canonical separation:

```text
SEARCH DISCOVERY
!= CONTEXT RE-ENTRY AUTHORITY
```

A PK-X2 search result may lead to an exact page selection.

The search hit itself does not authorize prompt injection.

## 11. Lifetime must be ACTIVE

The first profile inherits trusted PK-X1 lifetime states:

```text
ACTIVE
ENDED
UNKNOWN
```

Ordinary C6 re-entry requires:

```text
ACTIVE
```

For:

```text
ENDED
UNKNOWN
```

context retrieval fails closed.

## 12. Physical residue cannot re-enter context

If lifetime has ended but physical rows remain because cleanup failed:

```text
physical durable row exists
```

does not imply:

```text
row may be resolved for C6
```

Canonical rule:

```text
PHYSICAL RESIDUE
!= ACTIVE CONTEXT AUTHORITY
```

## 13. Current head must be re-read

A cached revisionRef from an earlier turn is not sufficient.

At operation admission:

```text
exact pageIdentity
→ revision owner
→ exact current head revisionRef
```

must be resolved under the current active lifetime.

## 14. Context selection does not pin head forever

If the head changes while the operation is being prepared, D4 must define a currentness check before context is committed to the model request.

Impact requirement:

```text
selection head
== materialization head
```

or fail/retry under a bounded fresh operation.

No stale implicit rebase is allowed.

## 15. Fresh current semantic authority is mandatory

Even the current head is durable derived content.

Therefore:

```text
CURRENT HEAD
!= CURRENTLY AUTHORIZED MODEL CONTEXT
```

The current head must pass a current-use validation seam before any semantic fields re-enter the model context.

## 16. Revalidation direction

The detailed design must preserve a chain equivalent to:

```text
exact pageIdentity
→ exact current head
→ exact immutable revision record
→ current target continuity
→ current source/support-at-use
→ current Exposure
→ current settlement compatibility
→ current citation/provenance compatibility as needed
→ D4 context materialization
```

Historical admission authority is not a substitute for this chain.

## 17. Context is a bounded projection, not raw storage replay

First profile must not inject backend records verbatim.

Required conceptual transformation:

```text
validated current revision
→ bounded context projection
```

The context projection may include only fields needed for the model's current semantic job.

## 18. Storage metadata is not prompt content

Forbidden automatic prompt fields include:

```text
revision database keys
admission receipts
internal support anchors
private validator reasons
hidden policy dispositions
cleanup metadata
commit expectation internals
storage timestamps
backend row versions
```

These may be validation inputs, not model semantic context.

## 19. Presentation DOM is not prompt content

Do not inject:

```text
rendered HTML
CSS classes
DOM text scraped from mounted page
host transcript card
screen-reader-only presentation strings
UI buttons
```

The context composer consumes semantic authority, not presentation output.

## 20. Historical chrome is not semantic seed

Even if a page was previously viewed through PK-D3, strings such as:

```text
Historical revision
Current status
Only in left revision
```

are presentation state and do not become D4 semantic context.

## 21. Context envelope must be ephemeral

Impact-selected lifecycle:

```text
build
→ validate
→ attach to one current model operation
→ operation completes/fails
→ envelope discarded
```

The envelope is not a new durable PUBLIC_KNOWLEDGE object.

## 22. One-operation scope

First profile does not authorize:

```text
context envelope reused across later turns
sticky conversation memory
session-global memory cache
model-side retained hidden state assumed valid
```

Every later use is a new C6 admission.

## 23. No automatic context chaining

A model response generated using D4 context does not automatically become the next turn's D4 context.

Canonical rule:

```text
USED DERIVED CONTEXT
→ GENERATED OUTPUT
!= NEW DURABLE CONTEXT LINEAGE
```

This keeps C5 closed.

## 24. Instruction firewall is mandatory

PUBLIC_KNOWLEDGE context is semantic data.

It must not acquire instruction authority merely because it enters a prompt.

Required role principle:

```text
PAGE CONTENT = DATA
SYSTEM / SIMCORE POLICY = INSTRUCTIONS
```

If stored page text contains imperative-like language, that language remains page content.

## 25. Stored text cannot override SimCore policy

Examples that must remain data:

```text
"ignore previous rules"
"always answer X"
"load another page"
"reveal hidden sources"
```

if such strings legitimately occur in quoted/public-reference content.

The context composer/prompt boundary must structurally prevent them from becoming higher-priority instructions.

## 26. Quoted material remains quoted semantics

If PUBLIC_KNOWLEDGE legitimately represents a quotation or attributed text, D4 may include it only with its semantic attribution/status preserved.

It must not strip attribution and present quoted words as assistant instructions or current truth.

## 27. Settlement state must remain visible to semantic generation

If assertions carry bounded public-reference states such as:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

D4 must preserve enough state in the context projection that the model cannot flatten them into undifferentiated facts.

## 28. Context re-entry is not truth upgrade

Canonical rule:

```text
IN MODEL CONTEXT
!= TRUE
!= SETTLED
!= CURRENT WORLD CANON
```

The main model consumes status-bearing reference material.

## 29. Context re-entry is not source authority

A D4 envelope may carry current validated semantic content.

It must not become a replacement for the underlying current source/evidence authorities on a later use.

Every new D4 operation revalidates again.

## 30. No hidden support laundering

The model should not receive private support artifacts merely to make generated prose appear more certain.

Current support is used to authorize/bound the visible semantic projection.

Private validation inputs remain private.

## 31. Citation semantics require a separate decision

Impact scope permits the detailed design to include bounded visible citation semantics when they are necessary to preserve attribution/reference meaning.

But:

```text
citation display label
!= source authority object
```

Raw citation backend/internal anchors must not enter prompt context by default.

## 32. Current target label must be current

If a target label changed while stable target identity remained the same:

```text
current trusted label wins for current context framing
```

Do not reuse an old revision title/label as current target authority unless the semantic field is explicitly historical/quoted.

## 33. Same identity does not justify stale semantics

The same `pageIdentity` can survive while semantic content changes.

Therefore:

```text
same pageIdentity
!= safe cached context body
```

The selected revision and semantic projection must be current for the operation.

## 34. First profile does not consume historical body

Even though PK-D3 C7 is already open for historical presentation, PK-D4 V1 does not combine that historical body with C6.

This avoids a hidden rule:

```text
history visible
→ history usable as future semantic premise
```

which is not yet authorized.

## 35. Historical questions can still be answered without historical prompt re-entry by default

A future product may use a dedicated historical-operation generation path, but that is not implied by ordinary D4 current-head context.

The first profile remains current-head-only.

## 36. Restore and D4 are distinct

D3-4 restore handoff uses an exact historical revision as a mutation seed under explicit restore semantics.

That operation-local seed is not ambient D4 context.

Canonical rule:

```text
RESTORE SEED
!= GENERAL MODEL MEMORY
```

## 37. Mutation after D4 context use requires ordinary authority

A model response produced with D4 context cannot directly write a page.

If a later product operation mutates PK-D2 state:

```text
normal D2 mutation authorization
+ current validation
+ expectedRevision safety
```

remain mandatory.

## 38. D4 does not make model output canonical

The model may generate text informed by the contextual page.

That output remains ordinary derived/model output unless another explicit source-family operation validates/adopts it.

## 39. C5 remains closed

D4 opens data reuse into a model operation.

It does not create durable parent-child object authority between:

```text
PUBLIC_KNOWLEDGE page
→ generated response
→ another source-family object
```

Any formal derived-to-derived lineage still requires C5.

## 40. C8 remains closed

D4 first profile is synchronous operation admission/materialization.

It does not authorize:

```text
late callback carrying pageIdentity/revisionRef
→ attach semantic result later
```

No background refresh or delayed mutation is selected.

## 41. Context failure is fail-closed for C6

If any required D4 authority fails:

```text
no D4 semantic context is attached
```

Do not downgrade to:

```text
cached page body
host transcript
old render
historical revision
fuzzy page match
```

## 42. Current task may continue without D4 only when product semantics allow

The detailed design must distinguish:

```text
D4 context optional to current task
```

from:

```text
D4 context required to answer requested operation
```

If required, failure should HOLD/fail the context-dependent operation rather than pretend context was loaded.

## 43. No oracle through failure reasons

User-facing D4 failures must not expose hidden information such as:

```text
page exists but policy denied it
hidden revision count
withdrawal basis
private support source
internal target mismatch detail
```

Reason-private generic failure shells may be required.

## 44. Dormancy

When no explicit D4 operation is active:

```text
page lookup for D4          = 0
revision lookup for D4      = 0
context materialization     = 0
history scan                = 0
search scan                 = 0
model context injection     = 0
background model call       = 0
background network call     = 0
```

## 45. Feature OFF

When D4 contextual capability is disabled:

```text
C6 context reads            = 0
context envelope builds     = 0
prompt attachment           = 0
background retrieval        = 0
```

Existing PK-D1/D2/D3 durable data is not deleted merely because D4 is disabled.

## 46. Reload

Reload clears any ephemeral D4 selection/materialization state.

It must not:

```text
auto-load last page into context
auto-replay old prompt envelope
auto-open history
auto-scan durable pages
```

A later use starts a fresh operation.

## 47. Lifetime END

Trusted lifetime end invalidates D4 use immediately.

Ordering direction:

```text
lifetime ENDED
→ reject new D4 retrieval/materialization
→ invalidate in-flight admission before prompt attachment when observable
→ clear ephemeral D4 state
→ ordinary D1/D2/D3 owner cleanup policy continues
```

Physical deletion does not define the authority boundary.

## 48. No cross-conversation context

First profile inherits conversation-scoped durable identity.

Therefore:

```text
conversation A page
→ conversation B prompt
```

is unsupported.

Cross-conversation memory/archive would require another lifetime/profile design.

## 49. No all-page memory bank

First profile does not support:

```text
scan all durable pages
rank by relevance
inject top K
```

That would combine search/retrieval/ranking with C6 and needs a separate bounded design.

## 50. No embedding retrieval

Durable page context does not imply embedding storage, vector search, or semantic similarity selection.

First profile exact-selects one page.

## 51. One-page scope selected

Impact decision:

```text
MAX CONTEXTUAL PAGES PER OPERATION V1
= one exact page
```

The detailed design will freeze the byte/token budget for the one-page semantic projection.

Multiple-page synthesis is deferred.

## 52. One current revision scope selected

Per operation:

```text
one page
→ one exact current head revision
```

No revision stack or history chain enters context.

## 53. Context must remain bounded before model call

The detailed design must freeze finite limits for at least:

```text
context envelope logical bytes
sections/assertions admitted to context
visible citation semantics admitted to context
target/display metadata
```

No truncation may silently change semantic meaning.

## 54. Overflow cannot become semantic summary by default

Forbidden automatic overflow behavior:

```text
page too large
→ ask model to summarize it
→ inject summary as if equivalent
```

A summary is a new derived semantic artifact and requires its own authority/design.

## 55. Overflow cannot silently drop contested fields

Do not fit budget by preferentially removing:

```text
contest state
correction state
withdrawal state
attribution
citation relationships needed for semantics
```

If the authorized projection cannot fit the profile, D4 should HOLD unless an explicit bounded projection rule preserves complete required semantics.

## 56. Token budgeting and logical byte budgeting are separate

The future detailed design may require both:

```text
canonical logical-byte cap
model-input token budget
```

A backend/provider tokenizer is not semantic identity authority.

## 57. Prompt provider variability must not widen authority

If different model providers have different context capacities:

```text
larger provider window
!= broader D4 semantic authority
```

Product-profile caps remain authoritative.

## 58. Operation input should carry provenance label

The model should be able to distinguish contextual PUBLIC_KNOWLEDGE material from direct user instructions.

A future envelope should carry bounded provenance/view-kind metadata sufficient for role separation.

## 59. Context provenance is not durable lineage

The one-operation envelope may record:

```text
pageIdentity
revisionRef
source family
context profile
```

for exact binding inside that operation.

That metadata does not create a C5 durable derivation graph.

## 60. Context envelope conceptual direction

Detailed design should evaluate a boundary equivalent to:

```text
PublicKnowledgeContextReentryEnvelopeV1
  schemaVersion
  contextProfile
  lifetimeScopeRef
  pageIdentity
  revisionRef
  targetIdentityRef
  currentDisplayLabel?
  semanticProjection
```

This is conceptual only.

No runtime schema is authorized by this impact scope.

## 61. Envelope authority properties

Expected properties:

```text
EPHEMERAL
ONE OPERATION
EXACTLY BOUND
NON-CANONICAL
NON-MUTATION-AUTHORITY
NON-STORAGE-AUTHORITY
NON-SEARCH-AUTHORITY
NON-INSTRUCTION-AUTHORITY
```

## 62. Revalidation receipt should not be model-visible by default

The implementation may need an internal admission proof that context was freshly validated.

That proof belongs to validator/SimCore authority.

It is not ordinary semantic prompt content.

## 63. Context composer ownership

Impact-selected owner direction:

```text
SimCore-owned PUBLIC_KNOWLEDGE Context Composer
```

It owns:

```text
exact admitted semantic projection
bounded field selection
status preservation
instruction-role firewall handoff
```

It does not own source truth or page mutation.

## 64. Model ownership

Main model owns:

```text
semantic generation using already-admitted context
```

It does not own:

```text
which durable page is authoritative
which revision is current
whether support is valid
whether context is permitted
whether context may persist
```

## 65. Renderer ownership

Presentation renderer remains outside the D4 context authority path.

Renderer output is not scraped back into context.

## 66. Search owner remains separate

PK-X2 continues to own current page discovery/search behavior.

D4 consumes exact selection, not search ranking internals.

## 67. Revision owner remains separate

PK-D2 revision owner remains authoritative for:

```text
current head
committed membership
immutable revision record
```

D4 does not maintain a second head cache as authority.

## 68. Historical owner remains separate

PK-D3 historical admission/disclosure remains authoritative for historical inspection only.

The first D4 profile does not call it for current-head semantic re-entry unless a later detailed necessity is proven.

## 69. Current semantic validation remains current-source-owned

D4 cannot use historical admission authenticity to bypass current source/support/settlement requirements.

## 70. No implicit current-page fallback from history

If a user is viewing R4 historically and starts a D4 current-context operation:

```text
D4 resolves current head fresh
```

It does not inject R4 because R4 happens to be on screen.

## 71. No implicit history fallback from current failure

If current head cannot pass D4 current revalidation:

```text
D4 unavailable
```

Do not use an older historically disclosable revision as fallback.

## 72. User-visible current page and D4 context may differ in presentation

The current page renderer can contain UI chrome and citations formatted for humans.

D4 context projection may use a compact structured semantic form.

That is acceptable if semantic status/provenance meaning remains equivalent within the profile.

## 73. Context materialization must be deterministic for same admitted logical input

The detailed design should prefer deterministic field ordering/selection so bounds can be tested.

This does not require deterministic model output.

## 74. No model-generated context compressor in V1

The context composer is deterministic/validator-owned.

No auxiliary model is selected to summarize or rank durable page content for D4 V1.

## 75. No network enrichment in V1

D4 re-entry uses existing current authority validation seams.

It does not trigger arbitrary web/network enrichment solely because a page enters context.

Any current source refresh remains owned by existing source-support machinery.

## 76. No automatic citation dereference

A visible citation/reference inside the page does not cause D4 to fetch its URL/source record into prompt context.

That would be another retrieval operation.

## 77. No context-induced page mutation

Reading a page for D4 must not update:

```text
revision head
revision metadata
last-access semantic state
settlement state
citation state
historical admission
```

D4 read is semantically side-effect-free.

## 78. Operational telemetry is not semantic state

A future runtime may record bounded operational counters for diagnostics.

Those counters must not become page semantics, ranking authority, or future context selection authority by default.

## 79. Failure taxonomy direction

Detailed design should preserve distinct internal classes such as:

```text
D4_FEATURE_DISABLED
D4_LIFETIME_INACTIVE
D4_PAGE_IDENTITY_INVALID
D4_TARGET_IDENTITY_MISMATCH
D4_CURRENT_HEAD_UNAVAILABLE
D4_CURRENTNESS_MISMATCH
D4_REVISION_RECORD_INVALID
D4_CURRENT_SUPPORT_INVALID
D4_CONTEXT_POLICY_DENIED
D4_CONTEXT_LIMIT_EXCEEDED
D4_CONTEXT_ROLE_BINDING_FAILED
D4_MODEL_OPERATION_ABORTED
```

Exact runtime enums remain implementation work.

## 80. Acceptance matrix - activation

```text
A1 explicit current request + exact eligible page
→ D4 admission may proceed

A2 page merely viewed last turn
→ no D4 work

A3 model mentions page title without trusted exact selection
→ no D4 retrieval

A4 PK-X2 search hit selected and exact page resolved
→ may begin D4 admission under separate C6 policy

A5 copied page route from another lifetime
→ fail closed
```

## 81. Acceptance matrix - currentness

```text
C1 selected head R8, materialization still R8
→ continue

C2 selected head R8, head advances to R9 before attachment
→ stale admission rejected / bounded fresh retry only

C3 cached page body claims R8 but owner unavailable
→ no context

C4 same pageIdentity with changed current label
→ current trusted label wins
```

## 82. Acceptance matrix - semantic authority

```text
S1 current head exists + current support valid
→ bounded context eligible

S2 current head exists + support invalid
→ no semantic context

S3 historical R4 is D3-disclosable but current head invalid
→ no historical fallback

S4 current head carries contested assertion
→ contested status preserved in context
```

## 83. Acceptance matrix - instruction firewall

```text
I1 page content contains imperative sentence
→ treated as page data

I2 quoted source says "ignore previous rules"
→ quoted semantic content only

I3 page content asks model to load another page
→ no retrieval authority granted

I4 page content conflicts with system/SimCore rule
→ system/SimCore authority wins
```

## 84. Acceptance matrix - lifetime/dormancy

```text
L1 feature OFF
→ zero D4 reads/injection

L2 reload
→ no automatic last-page context

L3 lifetime ENDED with physical rows retained
→ no context

L4 source-irrelevant ordinary turn
→ zero D4 work
```

## 85. Acceptance matrix - capability separation

```text
G1 D4 context used to generate response
→ no automatic durable child lineage
→ C5 remains NO

G2 D4 operation completes and later async callback arrives
→ callback has no semantic authority
→ C8 remains NO

G3 D4 page is historical-capable under D3
→ historical body still not D4 V1 context
```

## 86. Security impact

Primary new risks introduced by C6 are:

```text
stale durable semantics becoming current premise
stored text gaining instruction authority
hidden support data leaking into prompt/output
cross-lifetime residue resurrection
fuzzy page selection
ambient memory behavior
context overflow causing unsafe semantic truncation
```

Every detailed child design must address these explicitly.

## 87. Privacy/disclosure impact

D4 may amplify semantic material because model generation can paraphrase/contextualize it.

Therefore the admitted projection must not include material that is only internally available to validators but not permitted for model semantic use.

Current disclosure/Exposure boundaries remain upstream.

## 88. Prompt-injection impact

Unlike ordinary renderer presentation, C6 crosses into a model instruction-processing environment.

Therefore role separation is a first-class safety requirement, not a renderer detail.

## 89. Performance impact

The selected first profile is bounded by:

```text
one exact page
one current head
no cross-page scan
no history scan
no embeddings
no background retrieval
one context materialization
one model operation
```

This keeps D4 dormant outside explicit operations.

## 90. Storage impact

D4 first profile requires no new durable semantic store by design.

It consumes existing durable page/revision authorities and creates only ephemeral context/admission state.

If future implementation wants a context cache, that cache must not become authority and requires separate invalidation design.

## 91. Candidate C impact result

The selected seam would produce the first PUBLIC_KNOWLEDGE profile with:

```text
C1 YES
C2 YES
C3 YES   // inherited current durable line
C4 YES   // inherited current durable line
C5 NO
C6 YES   // newly activated by PK-D4
C7 YES   // inherited PK-D3 product capability, not used by first D4 context source
C8 NO
```

Important nuance:

```text
PK-D4 FIRST CONTEXT SOURCE
= CURRENT HEAD ONLY

PK-D3 C7 EXISTS IN THE PRODUCT LINE
!= HISTORICAL BODY ENTERS D4 CONTEXT
```

## 92. Why C5 stays closed

A context envelope is an ephemeral operation input.

It is not a new durable derived object with parentage from the page.

No downstream source-family object is granted authority merely because the model saw D4 context.

## 93. Why C8 stays closed

Every D4 admission is tied to the live current operation.

After that operation ends, the envelope has no authority.

A late effect cannot target a page/revision using the old envelope.

## 94. Why C6 is genuinely open

Unlike D1/D2/D3, D4 intentionally allows validated derived page semantics from an earlier durable state to become model input on a later operation.

That is exactly the C6 gate.

It must not be described as merely "loading UI state" or "reading storage".

## 95. Impact-selected D4 sequence

Recommended child sequence:

```text
D4-0  Contextual Durable Page Master
      authority model
      first current-head profile
      capability boundary

D4-1  Context Selection / Exact Address
      explicit operation intent
      page/current-head pinning
      selection freshness

D4-2  Current Revalidation / Context Composer
      support-at-use
      semantic projection
      deterministic bounded materialization

D4-3  Prompt Role / Provenance / Instruction Firewall
      data-vs-instruction separation
      settlement/status preservation
      model attachment contract

D4-4  Historical / Search / Mutation Interaction Boundary
      historical context remains closed unless explicitly opened
      PK-X2 coexistence
      restore/edit separation

D4-5  Lifetime / Bounds / Convergence
      byte/token caps
      dormancy
      final C1-C8 audit
```

This sequence is design planning, not runtime implementation authorization.

## 96. D4-0 next checkpoint

D4-0 should freeze the master architecture around:

```text
TRUSTED_EXPLICIT_CONTEXT_INTENT
+
EXACT_ACTIVE_PAGE_CURRENT_HEAD
+
FRESH_CURRENT_REVALIDATION
+
BOUNDED_SEMANTIC_CONTEXT_PROJECTION
+
STRICT_DATA_ROLE
+
ONE_OPERATION_LIFETIME
```

## 97. Runtime implementation blockers already visible

Even after design convergence, runtime would still need evidence for at least:

```text
trusted exact context-intent producer
exact page/head owner integration
current support-at-use integration
context admission policy
canonical context encoding
logical byte budget enforcement
model tokenizer/token budget enforcement
prompt role binding/instruction firewall
stale-head race handling
feature-off/reload teardown
audit/observability without semantic leakage
```

No implementation is authorized here.

## 98. Explicit non-goals

This impact scope does not select:

```text
historical revision prompt re-entry
multiple-page context
all-page memory search
embedding retrieval
cross-conversation memory
automatic recent-page memory
model-selected retrieval authority
persistent context cache
context summaries
background context refresh
citation URL fetching
cross-family derived lineage
async media/effect attachment
```

## 99. Concurrent-main classification

D3 convergence main was followed by unrelated Agent Skill orchestrator timeout-recovery work.

Compare classification:

```text
WATCH · MAIN_ADVANCED_AFTER_PK-D3 · NON_BLOCKING
```

No PUBLIC_KNOWLEDGE, Candidate C, D4, context-reentry, prompt-boundary, page/revision, or historical contract file overlap was identified.

## 100. Authority split preserved

```text
main
= design/docs/evidence/admin authority

release-simcore
= deployed production runtime authority
```

This transaction touches only `main` design documentation.

`release-simcore` remains unchanged.

## 101. Impact closure

Selected minimum seam:

```text
EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

Canonical closure:

```text
explicit trusted context operation
→ exact ACTIVE pageIdentity
→ exact current head
→ fresh current semantic authority
→ bounded status-preserving context projection
→ strict data role
→ one model operation
→ discard envelope
```

And:

```text
DURABLE PAGE
!= AMBIENT MEMORY

CURRENT HEAD
!= AUTOMATIC PROMPT CONTENT

MODEL SAW PAGE
!= MODEL MAY RETRIEVE MORE

HISTORICAL VIEW
!= HISTORICAL CONTEXT
```

## 102. Next checkpoint

```text
PK-D4 D4-0 Contextual Durable Page Master Design
```

D4-0 should freeze the family-wide authority architecture and the first current-head-only C6 profile.

Runtime implementation remains **NOT AUTHORIZED**.

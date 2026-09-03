# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-3 Prompt Role / Instruction Firewall Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-3 DESIGN FROZEN · STRUCTURED REFERENCE_DATA ATTACHMENT · SEMANTIC TRUST != INSTRUCTION TRUST · TRUSTED OUTER CONTROL PLANE / INSTRUCTION-UNPRIVILEGED INNER SEMANTICS · NON-RECYCLABLE attachmentBindingRef · DETERMINISTIC LOSSLESS FIELD ENCODING · NO RAW PROMPT CONCATENATION AS AUTHORITY · NO TOOL / RETRIEVAL / POLICY / IDENTITY AUTHORITY TRANSFER · CONTINUOUS SAME-OPERATION DISPATCH HORIZON · FINAL OPERATION / LIFETIME / HEAD CHECK · ONE-SHOT CONSUMPTION · OPTIONAL CONTEXT-FREE PATH DISTINCT · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-3 · PROMPT ROLE · INSTRUCTION FIREWALL · CANDIDATE C C6 · DETAILED DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D4-1 selects one exact active durable page/current-head revision for one trusted live operation.

D4-2 re-reads that exact committed revision, re-proves current PUBLIC_KNOWLEDGE compatibility, and materializes one deterministic whole-revision `PublicKnowledgeContextProjectionV1` plus one ephemeral `PublicKnowledgeContextAdmissionReceiptV1`.

D4-3 defines the only permitted model-attachment semantics for that admitted projection and the final dispatch-edge authority checks.

Canonical result:

```text
D4-2 exact admitted projection
+ trusted D4-3 attachment construction
+ structural REFERENCE_DATA role isolation
+ continuous same-operation dispatch horizon
+ final operation/lifetime/head currentness
→ one model dispatch with D4 reference data
```

D4-3 never creates new world truth, page truth, revision truth, search authority, tool authority, or model policy.

This document is design-only. It implements no runtime prompt, model request, serializer, tool gate, network behavior, storage adapter, UI, or release.

## 1. Authority chain

Frozen chain:

```text
D4-1 Selection Authority
        ↓
D4-2 Current Semantic Revalidation / Composer
        ↓
D4-2 Admission Receipt + Semantic Projection
        ↓
PublicKnowledgeContextAttachmentAuthority
        ↓
PublicKnowledgeReferenceDataAttachmentV1
        ↓
Final Operation / Lifetime / Head Check
        ↓
Model Request Attachment Adapter
        ↓
ONE MODEL DISPATCH
```

## 2. Core separation

```text
SEMANTIC AUTHORITY
!= PROMPT ROLE AUTHORITY
!= MODEL POLICY AUTHORITY
!= TOOL AUTHORITY
!= RETRIEVAL AUTHORITY
!= DISPATCH AUTHORITY
```

D4-2 proves the semantic material is eligible current PUBLIC_KNOWLEDGE reference data.

D4-3 decides how that data may be attached and whether the exact live operation may dispatch it now.

## 3. Semantic trust is not instruction trust

Canonical:

```text
SEMANTICALLY TRUSTED REFERENCE DATA
!= TRUSTED INSTRUCTION
```

An assertion may be fully current-valid and still contain language that resembles commands.

No semantic state upgrades that language into instruction authority.

## 4. D4 role class

The first D4 profile freezes exactly one model-facing role class:

```text
REFERENCE_DATA
```

It does not create a new system/developer/user/tool role.

## 5. Forbidden role promotion

D4 semantic material must never be attached as or transformed into:

```text
SYSTEM_POLICY
DEVELOPER_POLICY
USER_AUTHORIZATION
TOOL_AUTHORIZATION
RETRIEVAL_AUTHORIZATION
NETWORK_AUTHORIZATION
STORAGE_AUTHORIZATION
```

## 6. Trusted attachment owner

Conceptual owner:

```text
PublicKnowledgeContextAttachmentAuthority
```

Responsibilities:

```text
consume exact D4-2 admitted projection
verify exact operation/binding relation
mint one ephemeral attachment binding
construct owner-controlled outer fields
invoke final dispatch-edge checks
permit at most one D4-bearing dispatch
invalidate attachment on terminal/stale outcomes
```

## 7. Attachment owner non-responsibilities

It does not own:

```text
source truth
Exposure
settlement
citation truth
page identity
current-head mutation
search
historical disclosure
model generation
tool permissions
```

## 8. D4-3 input contract

D4-3 accepts only:

```text
one still-eligible D4-1 selection binding
one matching D4-2 current context admission receipt
one matching D4-2 PublicKnowledgeContextProjectionV1
one live trusted operation
```

## 9. Caller cannot submit arbitrary semantic payload

Forbidden D4-3 input shortcuts:

```text
raw page body
rendered page body
historical body
compare result
restore seed
search snippet
host transcript
model summary
caller-crafted semantic projection
```

## 10. Exact receipt/projection binding

The D4-2 admission and projection must bind to the same exact:

```text
operationRef
selectionBindingRef
lifetimeScopeRef
pageIdentity
targetIdentityRef
selectedRevisionRef
context profile
```

Any mismatch fails closed.

## 11. No receipt as durable freshness license

`PublicKnowledgeContextAdmissionReceiptV1` is ephemeral and operation-scoped.

It must not be copied into durable page state or reused in another model operation.

## 12. New D4-3 attachment identity

D4-3 freezes an ephemeral conceptual identity:

```text
attachmentBindingRef
```

Requirements:

```text
opaque
owner-minted
non-recyclable within its relevant operation horizon
not derived from content
not derived from timestamp alone
not a page/revision identity
not user-visible semantic truth
```

## 13. Why attachmentBindingRef exists

It distinguishes:

```text
D4-2 semantic admission
from
one concrete prepared model attachment
```

and gives one-shot dispatch/consumption logic an exact object to invalidate.

## 14. Conceptual attachment

Frozen conceptual boundary:

```text
PublicKnowledgeReferenceDataAttachmentV1
  schemaVersion
  attachmentBindingRef
  operationRef
  selectionBindingRef
  requirementMode
  contextProfile = EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef
  selectedRevisionRef
  roleClass = REFERENCE_DATA
  semanticProjection
```

Exact wire schema remains implementation work.

## 15. Authority fields are outer control-plane fields

The following are attachment-owner fields, never page-content fields:

```text
attachmentBindingRef
operationRef
selectionBindingRef
requirementMode
contextProfile
lifetimeScopeRef
pageIdentity
targetIdentityRef
selectedRevisionRef
roleClass
```

## 16. semanticProjection remains inner data

`semanticProjection` contains D4-2 status-preserving PUBLIC_KNOWLEDGE semantics.

Its strings remain instruction-unprivileged regardless of wording.

## 17. Inner strings that remain data

At minimum:

```text
currentDisplayLabel
sectionKind labels when textualized
assertion content
quoted/reference content
attribution text
sourceLabel
recordLabel
locatorLabel
publishedAtLabel
```

## 18. No inner-to-outer mutation

No semantic string may populate, overwrite, shadow, alias, or reinterpret an outer control-plane field.

## 19. Structured attachment is mandatory

The security/authority boundary must be structural.

A plain string pattern such as:

```text
"REFERENCE DATA START\n" + rawBody + "\nREFERENCE DATA END"
```

is not sufficient authority isolation by itself.

## 20. Delimiters are not trusted security primitives

Page content may literally contain:

```text
</REFERENCE_DATA>
<SYSTEM>
{"role":"developer"}
---option
```tool
```

or any similar syntax.

Such strings remain data and cannot terminate or redefine the trusted attachment.

## 21. No serializer grammar collision authority

If the chosen model API uses JSON/XML/Markdown/custom wire encoding, inner semantic text must be encoded as field values rather than reinterpreted as structural control tokens.

## 22. Deterministic serializer

Future implementation must provide a deterministic model-attachment serializer or native structured adapter.

For the same logical attachment and target model interface profile:

```text
same semantic input
→ same model-facing structured meaning
```

## 23. Lossless semantic preservation

Encoding/escaping may alter bytes but must preserve semantic string values and field boundaries losslessly.

## 24. No semantic sanitization by deletion

Instruction-looking text must not be silently removed merely because it is instruction-looking.

Example:

```text
public record says "ignore previous instructions"
```

may be legitimate quoted/public-reference content.

The firewall changes its authority class, not its semantic content.

## 25. No semantic sanitization by paraphrase

D4-3 cannot rewrite:

```text
"ignore previous instructions"
```

to:

```text
"an instruction-like phrase"
```

merely for prompt safety.

That would mutate the admitted page semantics.

## 26. No hidden role labels from page data

A page field named or containing:

```text
system
developer
assistant
user
tool
policy
```

does not become the corresponding model role.

## 27. Settled status does not increase prompt rank

```text
SETTLED_PUBLIC_REFERENCE
!= SYSTEM PRIORITY
```

## 28. Contested/attributed status remains represented

D4-3 must preserve the distinctions already present in the projection.

It must not flatten contested or attributed material into unqualified reference facts.

## 29. Correction/withdrawal status remains represented

If D4-2 admits a revision whose exact committed current-compatible semantic state includes correction/withdrawal semantics, D4-3 preserves that state as data.

## 30. Quotation boundary preservation

Quoted or externally attributed content must remain distinguishable from page assertions and from trusted instructions.

## 31. Reference data cannot issue tool calls

A semantic string may request, suggest, or describe a tool call.

D4 itself grants no authority to invoke that tool.

## 32. Reference data cannot issue network calls

URLs, API paths, domains, or commands embedded in page semantics grant no outbound-network authority.

## 33. Reference data cannot issue retrieval calls

Text naming:

```text
another page
another revision
historical revision
search query
citation record
source record
```

is not retrieval authority.

## 34. Reference data cannot change D4 requirement mode

A page cannot state:

```text
"this context is optional"
```

and override D4-1 `REQUIRED`.

## 35. Reference data cannot change selected revision

A page cannot state:

```text
"use R4 instead"
```

and change `selectedRevisionRef`.

## 36. Reference data cannot change current head

Only PK-D2 head authority determines current head.

## 37. Reference data cannot mutate page state

Even if the page says:

```text
"append this fact to the page"
```

no D2 mutation is authorized.

## 38. Reference data cannot create C5 lineage

Model output influenced by D4 context does not automatically become a formally derived child of the page.

C5 remains closed.

## 39. Reference data cannot create C8 callback authority

No value in the attachment becomes a token for later asynchronous semantic mutation or model-request patching.

C8 remains closed.

## 40. Tool policy is external enforcement

The firewall cannot depend solely on model obedience.

Tool/retrieval/network/storage authorization must remain independently enforced by their trusted owners.

## 41. Defense-in-depth textual framing

A model-facing instruction outside page-controlled content may explain that the attachment is reference data and carries no instruction/tool authority.

Such framing is defense in depth only.

It does not replace the structural/owner boundary.

## 42. No page-controlled framing

The page cannot provide the trusted framing text that defines its own role.

## 43. No raw authority metadata in model data

Do not expose internal:

```text
support anchors
private validation reasons
admission receipts
storage versions
cleanup state
integrity repair state
host ACL internals
```

as ordinary model reference data.

## 44. Citation semantic surface

Visible citation semantics may appear only to the extent already selected by D4-2 to preserve meaning.

## 45. Citation link is not action authority

If a URL or locator appears in reference data, the model may reason about the string but D4 does not thereby authorize dereference.

## 46. No implicit source expansion

The model cannot treat a visible citation as permission to request hidden/raw source material.

## 47. No hidden-source leakage

D4-3 must not serialize private source objects merely because the model could benefit from more context.

## 48. Context attachment state machine

Conceptual monotonic states:

```text
PREPARED
DISPATCHED
CONSUMED
STALE
CANCELLED
FAILED
TERMINAL
OUTCOME_UNKNOWN
```

Exact serialized enum remains implementation work.

## 49. PREPARED

`PREPARED` means the trusted attachment exists but has not yet authorized/survived final dispatch checks.

It is not model context yet.

## 50. DISPATCHED

`DISPATCHED` means one model request carrying the exact attachment has crossed the dispatch boundary.

## 51. CONSUMED

After one successful dispatch, the exact attachment is no longer reusable for another model dispatch.

Implementations may collapse `DISPATCHED` and `CONSUMED` operationally only if one-shot semantics remain provable.

## 52. STALE

If final head/current operation relation changes before dispatch, the attachment becomes stale.

It cannot be rebound in place.

## 53. CANCELLED / FAILED / TERMINAL

Terminal operation outcomes invalidate the attachment without changing page/revision semantics.

## 54. OUTCOME_UNKNOWN

If transport/host semantics cannot prove whether a model dispatch occurred, the attachment must not be optimistically replayed as if unused.

## 55. No state rollback

Forbidden:

```text
CONSUMED → PREPARED
STALE → PREPARED
TERMINAL → PREPARED
```

A new D4 chain is required.

## 56. Final operation check

Immediately before dispatch, trusted operation lifecycle must prove:

```text
operationRef = LIVE
```

## 57. Terminal operation check failure

If the operation is completed, failed, cancelled, superseded, or otherwise terminal:

```text
no D4-bearing model dispatch
```

## 58. Exact selection binding check

The exact `selectionBindingRef` must remain eligible for the same operation.

No stale/conflicting/consumed binding may dispatch.

## 59. D4-2 admission binding check

The D4-2 admission must still correspond exactly to the same operation, selection, page, target, revision, and profile.

## 60. Lifetime final check

Immediately before dispatch:

```text
lifetimeScopeRef = ACTIVE
```

must remain authoritatively true.

## 61. UNKNOWN lifetime

```text
UNKNOWN
→ no dispatch
```

## 62. ENDED lifetime

```text
ENDED
→ no dispatch
```

Physical page/revision residue has no C6 authority.

## 63. Final current-head check

Immediately before dispatch:

```text
PK-D2 currentHead(pageIdentity) == selectedRevisionRef
```

must hold.

## 64. Why final head check is mandatory

D4-2 semantic revalidation may have occurred before a concurrent revision commit.

The dispatch edge is the last point at which D4 can prevent a known-stale page generation from entering the new model operation.

## 65. Final head mismatch

Example:

```text
selected = R8
D4-2 admitted R8
current head before dispatch = R9
```

Result:

```text
FINAL_HEAD_MISMATCH
→ no R8 dispatch
```

## 66. No implicit current-head rebase

D4-3 must not change:

```text
R8 → R9
```

inside the prepared attachment.

To use R9, begin a new D4-1/D4-2 chain.

## 67. No latest-revision guessing

D4-3 does not choose newest ordinal/timestamp/storage row after mismatch.

PK-D2 current-head owner remains authoritative.

## 68. Continuous dispatch horizon

D4-3 freezes:

```text
D4-2 admission
→ D4-3 preparation
→ final dispatch checks
→ model dispatch
```

as one continuous bounded operation path for a single model operation.

## 69. No time-based freshness TTL

D4-3 does not freeze rules such as:

```text
admission valid for 5 seconds
admission valid for 30 seconds
```

because elapsed time is not semantic authority.

## 70. Queue/suspend boundary

If the prepared D4 context is:

```text
queued for later
suspended
persisted for resume
moved to a later worker activation
held across operation discontinuity
```

then the old D4-2 admission cannot be treated as a current-use license.

## 71. Resume rule

After an asynchronous/discontinuous resume, rerun the D4 current-use chain required by the profile, including current semantic revalidation, before dispatch.

## 72. Why continuity matters

This prevents C6 from turning into:

```text
validated once
→ safe as prompt forever until TTL
```

and avoids inventing a delayed C8-style freshness token.

## 73. Post-dispatch head changes

If R8 passes the final dispatch check and the model request is dispatched, a later move to R9 does not alter the already-dispatched request.

## 74. No in-flight patch

D4-3 provides no mechanism to modify a model request after dispatch.

## 75. No delayed cancellation authority from page mutation

A later page edit does not semantically cancel an already-dispatched request unless a separate operation-level cancellation authority exists for independent reasons.

D4 itself does not create that authority.

## 76. One attachment, one dispatch

Frozen:

```text
MAX MODEL DISPATCHES AUTHORIZED BY ONE attachmentBindingRef = 1
```

This is a semantic cardinality, not the final byte/token bound.

## 77. No retry by replay

A failed or ambiguous transport must not simply resend the same attachment under the assumption that the first request did not happen.

## 78. Retry requires dispatch ownership reconciliation

Future runtime must first determine whether the model operation was dispatched/accepted/consumed according to host authority.

If a new semantic model operation is needed, it requires a new appropriate operation/attachment chain.

## 79. Serialization failure is pre-dispatch failure

If trusted encoding cannot produce a structurally valid attachment:

```text
no partial D4-bearing dispatch
```

## 80. Whole-page atomicity remains inherited

D4-2 selected the whole compatible committed revision as the semantic unit.

D4-3 cannot remove fields/assertions/citations to make the serializer happy.

## 81. Bounds failure remains atomic

If the final model interface cannot carry the complete required attachment within future D4-5 bounds:

```text
ATTACHMENT_BOUNDS_EXCEEDED
```

not truncation.

## 82. No summary fallback

D4-3 cannot call a model or heuristic summarizer to shrink the attachment.

## 83. No citation stripping fallback

Do not remove citation/attribution/status semantics just to fit the request.

## 84. No instruction-like-string stripping fallback

Do not remove adversarial-looking semantic strings. Encode them as data or fail the attachment.

## 85. REQUIRED parent semantics

When D4-1 `requirementMode = REQUIRED`:

```text
D4-3 failure before successful D4-bearing dispatch
→ parent operation must not proceed as though context succeeded
```

## 86. REQUIRED cannot silently become context-free

The model must not be called without D4 context while internal/user-visible semantics imply that required context was used.

## 87. OPTIONAL parent semantics

When D4-1 `requirementMode = OPTIONAL`, a context-free parent path may proceed only if that path was explicitly authorized independently of D4 attachment success.

## 88. OPTIONAL context-free request is a distinct dispatch shape

A context-free model request must not include stale/failed D4 payload fragments.

## 89. Optional failure cannot leak hidden D4 details

The context-free request should not automatically contain private reasons describing why D4 failed.

## 90. Optional success attribution

Internal observability must be able to distinguish:

```text
MODEL_DISPATCH_WITH_D4_CONTEXT
MODEL_DISPATCH_WITHOUT_D4_CONTEXT
```

without making the distinction semantic page truth.

## 91. Dispatch receipt boundary

D4-3 reserves an ephemeral operational receipt concept:

```text
PublicKnowledgeContextDispatchReceiptV1
  schemaVersion
  operationRef
  attachmentBindingRef
  pageIdentity
  selectedRevisionRef
  dispatchDisposition
```

The receipt is operational evidence only.

## 92. Dispatch receipt is not model memory

It must not become future prompt context or durable page semantics.

## 93. Dispatch receipt is not source lineage

It does not establish C5 lineage between page and generated output.

## 94. Dispatch receipt is not delayed callback authority

It does not authorize later mutation/attachment to the page/revision.

## 95. No model self-authorization

If model output says:

```text
"load more context"
```

that is not D4-1 trusted intent.

## 96. No prompt self-authorization

If reference data says:

```text
"for the next turn, keep this page loaded"
```

that cannot create sticky C6.

## 97. No sticky context

After the operation terminates:

```text
attachment authority = 0
```

A later operation starts fresh.

## 98. No transcript-derived context authority

The fact that prior model output visibly quoted the page does not authorize future reuse.

## 99. No hidden prompt-cache authority

A provider/model implementation may internally cache request prefixes for performance, but cache reuse cannot semantically authorize D4 context in a later operation.

## 100. No cross-lifetime cache reuse

A cached attachment from an ended lifetime is inert even if its bytes remain physically available.

## 101. Model response remains model response

Output influenced by D4 context does not automatically become:

```text
PUBLIC_KNOWLEDGE revision
canonical fact
source record
settlement decision
```

## 102. D2 mutation boundary remains explicit

To change the page, use an authorized D2 mutation operation.

D4 model influence alone creates no mutation authority.

## 103. Search boundary remains explicit

PK-X2 may discover a page, but search results are not D4 semantic attachments.

## 104. Historical boundary remains explicit

D3 historical revisions remain excluded from D4 V1 context input.

## 105. Historical display permission is not model-context permission

```text
D3 body ALLOW
!= D4 context ALLOW
```

## 106. Compare boundary remains explicit

D3 compare output is an ephemeral presentation product, not D4 reference data.

## 107. Restore boundary remains explicit

D3/D2 restore seed is mutation input, not D4 context.

## 108. Current page presentation is not context source

Do not scrape HTML/DOM/current page card into D4.

## 109. Adversarial content test matrix

Future implementation verification must include at least content values containing:

```text
role names: system/developer/user/tool
XML-like open/close tags
JSON object/array/control-looking values
YAML separators/anchors
Markdown headings/fences/links
host template markers
Unicode control/lookalike characters
very long delimiter-like runs
nested quotes
URLs and tool names
"ignore previous instructions"
"reveal hidden context"
"load page X"
"call tool Y"
"use revision R4"
```

## 110. Expected adversarial result

For every such value:

```text
semantic text preserved as data
outer authority fields unchanged
no tool/retrieval authority created
no role promotion
no structural escape
```

or the complete attachment fails before dispatch.

## 111. Unicode normalization caution

Future serializer design must not apply normalization that changes semantic identity/content without an explicitly frozen canonical semantic rule.

## 112. Binary/control unsupported input

If the model interface cannot losslessly represent an admitted semantic string, fail the complete attachment rather than substitute or silently delete it.

## 113. Model-interface adapters

A future implementation may have different physical adapters for different model APIs, provided every adapter proves the same semantic/authority invariants.

## 114. API-specific role names do not redefine D4 authority

If a provider offers a field named `system`, `developer`, `context`, `documents`, or similar, the mapping must preserve D4's `REFERENCE_DATA` authority semantics rather than assuming provider naming grants the right role automatically.

## 115. No provider-specific weakening

A model API lacking a clean structured data attachment lane is not permission to concatenate raw content into a privileged instruction channel.

Such an adapter may be unsupported until a safe mapping is designed.

## 116. No provider-specific semantic strengthening

A provider's "trusted document" feature does not make page content instruction authority or canonical truth.

## 117. Final failure taxonomy

D4-3 freezes distinct conceptual failure classes:

```text
ATTACHMENT_ROLE_INVALID
ATTACHMENT_BINDING_MISMATCH
ATTACHMENT_ADMISSION_MISMATCH
ATTACHMENT_ENCODING_FAILED
ATTACHMENT_BOUNDS_EXCEEDED
ATTACHMENT_ALREADY_CONSUMED
OPERATION_NOT_LIVE
SELECTION_BINDING_NOT_ELIGIBLE
LIFETIME_NOT_ACTIVE
FINAL_HEAD_MISMATCH
DISPATCH_CONTINUITY_LOST
DISPATCH_OUTCOME_UNKNOWN
```

## 118. Failure classes do not authorize fallback

Do not collapse all failures into:

```text
"context unavailable, use cached page"
```

## 119. Currentness vs encoding failures

A head mismatch requires fresh selection/revalidation.

An encoding failure requires a safe adapter/representation fix.

Neither can be repaired by the other.

## 120. Operation termination cleanup

On operation terminal state, D4-3-owned attachment/dispatch ephemeral state is eligible for immediate logical teardown.

No background history scan is required.

## 121. Cleanup failure is not authority

If ephemeral cleanup physically fails:

```text
old attachment rows/objects may remain
```

but their logical operation authority is terminal and non-reusable.

## 122. Dormancy

When no trusted D4 operation is active:

```text
attachment build = 0
prompt injection = 0
revision read by D4-3 = 0
background context refresh = 0
background model call = 0
background network = 0
```

## 123. Observability minimum

Future implementation should expose bounded operational categories such as:

```text
attachment prepared
attachment rejected by role/firewall
final head mismatch
required failure
optional context-free fallback
D4-bearing dispatch
outcome unknown
```

without logging protected semantic bodies by default.

## 124. No semantic body in ordinary diagnostics by default

Operational evidence should prefer IDs/dispositions/counts over full assertion/citation text.

## 125. Candidate C assessment

D4-3 requires:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 mutation                   = YES inherited product line
C4 append/merge pressure      = YES inherited product line
C5 derived lineage            = NO
C6 model-context re-entry     = YES
C7 historical survival        = YES inherited product capability
C8 delayed effect targeting   = NO
```

## 126. Why D4 dispatch is C6, not C8

The page semantic projection enters one current model operation synchronously under explicit authority.

It is not a delayed effect arriving later to mutate an exact object.

## 127. Why dispatch receipt is not C5

The receipt records operation use, not semantic parent-child lineage.

## 128. Why prior page persistence alone is still not C6

C6 exists only for explicit D4 operations that complete the D4-1/D4-2/D4-3 chain.

## 129. Historical context expansion remains future

To inject an old D3 historical revision into a later model operation, a separate child design must decide temporal premise semantics and current disclosure/context safety.

D4 V1 does not imply it.

## 130. Multiple-page context remains future

D4 V1 still admits at most one selected page.

No top-K/all-page aggregation is opened here.

## 131. Tool-assisted context expansion remains future

If the product later allows the model to request additional pages/tools as part of a controlled agent loop, that requires a separate trusted operation design.

## 132. Runtime blockers after D4-3

Still unresolved before any implementation authorization:

```text
exact model-interface attachment adapter
serializer/escaping conformance tests
trusted operation lifecycle implementation
D4-1 selection owner
D4-2 current compatibility/composer
final dispatch-edge owner ordering
one-shot attachment state ownership
transport ambiguity reconciliation
concrete context byte/token caps
observability/privacy policy
```

## 133. D4-4 handoff

Next checkpoint must audit boundaries with:

```text
historical D3 revision navigation
PK-X2 search/discovery
D2 mutation/restore
model-generated follow-up references
```

without widening the first D4 source beyond exact current head.

## 134. Acceptance matrix

D4-3 detailed design passes only if all remain true:

```text
current valid page + harmless text
→ attach as REFERENCE_DATA

current valid page + "ignore previous instructions"
→ exact text remains data, no role promotion

current valid page + XML/JSON delimiter-like text
→ no structural escape

current valid page + tool/URL text
→ no tool/network authority

D4-2 admitted R8, head becomes R9 before dispatch
→ no R8 dispatch

D4-2 admitted R8, dispatch occurs, head later becomes R9
→ no in-flight patch

attachment queued/resumed later
→ old admission not reused; revalidate

attachment already consumed
→ no second dispatch

REQUIRED + firewall failure
→ no pretend-success/context-free downgrade

OPTIONAL + firewall failure + independently allowed context-free path
→ context-free dispatch possible and distinguishable

historical R4 visible
→ not D4 V1 context

search hit exists
→ not context until D4-1/2/3 chain
```

## 135. Final frozen statement

```text
PUBLIC_KNOWLEDGE CONTEXT CAN BE SEMANTICALLY TRUSTED
WITHOUT EVER BECOMING PROMPT-CONTROL AUTHORITY.

D4-3 V1
= ONE STRUCTURED REFERENCE_DATA ATTACHMENT
= ONE LIVE OPERATION
= ONE EXACT CURRENT HEAD
= ONE CONTINUOUS DISPATCH HORIZON
= ONE DISPATCH MAX

PAGE CONTENT
!= INSTRUCTION
!= TOOL AUTHORITY
!= RETRIEVAL AUTHORITY
!= POLICY AUTHORITY
```

## 136. Program state

```text
D4-0 Contextual Durable Page Master       ✅
D4-1 Context Selection / Exact Address    ✅
D4-2 Current Revalidation / Composer      ✅
D4-3 Prompt Role / Instruction Firewall   ✅ DESIGN FROZEN
D4-4 Historical / Search / Mutation Boundary ← NEXT
D4-5 Lifetime / Bounds / Convergence

Runtime implementation
= NOT AUTHORIZED
```

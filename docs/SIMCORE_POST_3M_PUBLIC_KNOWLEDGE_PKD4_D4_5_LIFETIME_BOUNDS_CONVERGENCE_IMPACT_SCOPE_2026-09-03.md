# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-5 Lifetime / Bounds / Convergence Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **D4-5 IMPACT SCOPE FROZEN · OPERATION-SCOPED C6 LIFETIME · ACTIVE PAGE LIFETIME REQUIRED · ONE PAGE / ONE CURRENT HEAD / ONE ATTACHMENT / ONE DISPATCH · FINITE BYTE/TOKEN BUDGET DOMAINS · NO TRUNCATION / SUMMARY / MULTI-PAGE FALLBACK · TERMINAL TEARDOWN · DORMANT BY DEFAULT · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-5 · LIFETIME · BOUNDS · CONVERGENCE · CANDIDATE C C6 · IMPACT SCOPE**

## 0. Purpose

D4-0 through D4-4 define the first explicit Candidate C C6 consumer for PUBLIC_KNOWLEDGE:

```text
trusted live D4 operation
→ one exact active pageIdentity
→ owner-resolved exact current head
→ fresh current semantic revalidation
→ deterministic whole-page semantic projection
→ structured REFERENCE_DATA attachment
→ final operation/lifetime/head check
→ one model dispatch
```

D4-5 does not add a new context source or a new retrieval product.

It freezes the lifetime, finite resource boundaries, teardown semantics, dormancy, and final Candidate C convergence criteria for the existing D4 V1 profile.

This transaction is design-only. No runtime prompt, tokenizer, model call, storage adapter, queue, cache, search, mutation, UI, network behavior, or release change is authorized.

## 1. Selected D4-5 seam

Frozen seam:

```text
ACTIVE PAGE LIFETIME
+
LIVE NON-RECYCLABLE OPERATION
+
ONE EXACT CURRENT-HEAD SELECTION
+
ONE WHOLE CURRENT SEMANTIC PROJECTION
+
ONE STRUCTURED ATTACHMENT
+
FINITE LOGICAL-BYTE / MODEL-TOKEN BUDGETS
+
ONE MODEL DISPATCH MAX
+
TERMINAL LOGICAL TEARDOWN
+
ZERO AMBIENT REUSE
```

Not selected:

```text
sticky memory
cross-operation attachment reuse
cross-lifetime context reuse
historical revision prompt re-entry
multi-page context fan-in
rolling context cache
background context refresh
queue-persisted freshness license
semantic truncation
model-generated summary fallback
provider-specific privilege weakening
C5 derived lineage
C8 delayed semantic targeting
```

## 2. Two lifetime axes must both remain live

D4 authority depends on two independent lifetime axes:

```text
PAGE LIFETIME AUTHORITY
+
MODEL-OPERATION LIFETIME AUTHORITY
```

Canonical:

```text
PAGE ACTIVE
!= OPERATION LIVE

OPERATION LIVE
!= PAGE ACTIVE
```

Both must be authoritatively true before D4-bearing dispatch.

## 3. Page lifetime remains inherited

D4 does not create a new durable page lifetime.

The page/revision remains governed by the existing trusted conversation-scoped lifetime authority established by PK-D1/D2/D3.

Required before dispatch:

```text
lifetimeScopeRef = ACTIVE
```

`UNKNOWN` and `ENDED` fail closed.

## 4. Operation lifetime is narrower than page lifetime

A durable page may survive across many turns while each D4 context operation is one-shot and ephemeral.

```text
PAGE P remains ACTIVE across turns

operation O1 → terminal
operation O2 → later new operation
```

O1 authority must not flow into O2.

## 5. Non-recyclable operation identity remains mandatory

D4-1 already freezes a non-recyclable `operationRef` within the relevant authority horizon.

D4-5 preserves:

```text
TERMINAL operationRef X
!= later new operationRef X
```

No host request slot, turn index, UI row, worker slot, timestamp alone, or model request ordinal may be treated as a reusable operation identity.

## 6. Exact operation terminality wins over physical residue

When operation O becomes terminal:

```text
selection binding authority = 0
context admission authority = 0
attachment authority = 0
unused dispatch authority = 0
```

This is immediate logical invalidation.

Physical cleanup may follow later.

## 7. Page lifetime end also kills D4 authority

If the owning page lifetime becomes `ENDED` before dispatch:

```text
D4 pre-dispatch chain = invalid
```

No surviving selection/admission/attachment object can override lifetime end.

## 8. UNKNOWN lifetime remains fail closed

If trusted lifetime state cannot be resolved:

```text
UNKNOWN
→ no D4-bearing dispatch
```

Do not infer activity from:

```text
page bytes still present
head row still present
recent access
open UI
model transcript
cached attachment
```

## 9. No semantic TTL

D4-5 does not introduce rules such as:

```text
context valid for 5 seconds
context valid for 30 seconds
context valid until next turn
```

Elapsed time is not semantic authority.

Freshness comes from operation continuity plus exact current checks, not a guessed TTL.

## 10. Continuity boundary remains semantic

The admitted D4 chain is valid only inside one continuous live operation horizon:

```text
selection
→ current revalidation
→ attachment preparation
→ final checks
→ dispatch
```

If this chain is discontinuously suspended, persisted, moved to a later activation, or resumed under uncertain operation continuity, the old admission/attachment cannot be used as a freshness license.

## 11. Resume requires a fresh D4 chain

After discontinuity:

```text
old prepared attachment
→ not dispatchable

new live operation / recovered operation authority
→ fresh D4-1 selection
→ fresh D4-2 revalidation
→ fresh D4-3 attachment
```

No queue persistence may bypass that chain.

## 12. Semantic cardinalities already frozen

D4 V1 already freezes these semantic cardinalities:

```text
selected durable pages per D4 operation = 1
selected current-head revisions per D4 operation = 1
whole semantic projections per D4-bearing dispatch = 1
D4 REFERENCE_DATA attachments per D4-bearing dispatch = 1
model dispatches authorized by one attachmentBindingRef = 1
```

D4-5 preserves them as hard V1 bounds.

## 13. One page means no automatic fan-in

Search may discover many pages, but D4 V1 cannot consume more than one exact selected page.

Bounds pressure must never trigger:

```text
split one request across multiple pages
select top-k automatically
replace selected page with a smaller page
```

## 14. Whole-page semantic atomicity remains inherited

D4-2 selected the exact compatible committed current revision as one semantic unit.

D4-5 preserves:

```text
COMPLETE ADMITTED PROJECTION
OR
NO D4 CONTEXT
```

No assertion/citation/status stripping is allowed merely to fit bounds.

## 15. Bounds require separate domains

D4-5 must not collapse all resource limits into one opaque provider request size.

At minimum V1 needs independently testable domains for:

```text
D4-owned opaque reference lengths
trusted operation/selection envelope logical bytes
D4 admission receipt logical bytes
semantic projection logical bytes
attachment control metadata logical bytes
complete model-facing D4 attachment logical bytes
model-facing D4 token budget
bounded operational receipt/diagnostic metadata
```

Concrete numbers are frozen by the D4-5 detailed design, not this impact scope.

## 16. Why logical bytes are needed

Backend storage size, compression ratio, encrypted size, JSON whitespace, or provider wire overhead are not stable semantic budget measures.

Future implementation must define deterministic logical encodings for D4-owned bounded objects.

Canonical:

```text
SAME LOGICAL D4 OBJECT
→ SAME LOGICAL-BYTE BUDGET RESULT
```

for a given frozen encoding profile.

## 17. Why token bounds are separately needed

Logical bytes alone do not bound model context consumption.

Different tokenizers may map the same semantic text differently.

Therefore D4-5 requires a separate model-interface token admission check before dispatch.

```text
logical-byte PASS
+ token-budget PASS
→ may continue

one fails
→ ATTACHMENT_BOUNDS_EXCEEDED
```

## 18. Tokenizer result is an admission measurement, not semantic truth

A tokenizer determines whether a complete attachment fits one supported model-interface profile.

It does not authorize:

```text
semantic truncation
paraphrase
status removal
citation removal
role weakening
```

## 19. No automatic budget borrowing

D4 semantic projection budget must not borrow from:

```text
D2 durable revision storage budget
D3 historical presentation budget
search result budget
model output budget
provider hidden cache budget
```

Each authority/product surface keeps its own cap.

## 20. D2 revision cap does not guarantee D4 eligibility

A valid durable current revision may be too large for D4 V1 context.

This is a legitimate state:

```text
page current revision valid and renderable
+
D4 context bounds exceeded
→ page remains valid
→ D4 operation HOLD / optional context-free branch when independently allowed
```

No page mutation is implied.

## 21. D4 bounds failure is not a D2 mutation request

Forbidden repair:

```text
R8 too large for D4
→ automatically edit/condense page into R9
→ dispatch R9
```

D4 read authority never creates D2 mutation authority.

## 22. No summary fallback

If a complete projection exceeds byte/token bounds:

```text
HOLD
```

not:

```text
model summary
heuristic summary
extractive top assertions
citation drop
status drop
```

A future summarized-context product requires a separate semantic projection contract.

## 23. No truncation fallback

Forbidden:

```text
first N bytes only
first N assertions only
first N citations only
last section omitted
```

while claiming the attachment is the whole admitted page.

## 24. No provider-specific weakening

If provider/model interface A can safely carry the complete D4 attachment and provider B cannot:

```text
A may support the D4 profile
B may be unsupported for that operation
```

B's limitation is not permission to move page text into a privileged raw instruction channel or silently shrink semantics.

## 25. REQUIRED bounds failure

If `requirementMode = REQUIRED` and any D4 bound fails before dispatch:

```text
parent operation must not proceed as though required context succeeded
```

No silent context-free downgrade.

## 26. OPTIONAL bounds failure

If `requirementMode = OPTIONAL`, a context-free operation may proceed only when independently allowed by the parent product contract.

The context-free request must contain no partial/stale D4 semantic fragments.

## 27. Pre-dispatch cleanup ordering

On terminal/stale/pre-dispatch failure, logical teardown should proceed conceptually:

```text
1. mark operation/binding authority terminal or ineligible
2. make attachment non-dispatchable
3. clear ephemeral semantic projection from D4-owned working state where applicable
4. clear admission/selection ephemeral state
5. reclaim physical ephemeral objects when owner supports it
```

Exact implementation ordering remains runtime work, but logical invalidation must precede reliance on physical deletion.

## 28. Physical cleanup failure does not revive authority

```text
DELETE FAILED
!= OPERATION LIVE
!= PAGE ACTIVE
!= ATTACHMENT REUSABLE
```

Residue is inert.

## 29. Owner-scoped cleanup only

D4 cleanup must be scoped to exact D4 operation-owned ephemeral objects.

It must not delete or mutate:

```text
durable page identity
committed revision
current head
D3 historical admission
PK-X2 search state
D2 mutation state
unrelated host metadata
```

## 30. No all-operation cleanup scans on ordinary turns

D4-5 preserves dormancy:

```text
scan old D4 operations = 0
scan all durable pages = 0
scan all current heads = 0
refresh D4 context = 0
background model call = 0
background network = 0
```

when no explicit D4 operation is active.

## 31. Feature-off boundary

If the D4 feature/profile becomes unavailable before dispatch:

```text
no D4-bearing dispatch
pre-dispatch ephemeral authority becomes unusable
```

Feature-off does not delete the durable page/revision itself.

## 32. Feature re-enable does not resurrect attachment

After re-enable:

```text
old selection/admission/attachment
→ not reused
```

A fresh trusted D4 operation is required.

## 33. Reload boundary

A host reload that loses trustworthy same-operation continuity must not remount/replay old D4 context authority.

Visible transcript or cached UI does not restore C6.

## 34. Hidden provider prompt cache is not authority

Provider-side prefix caching may exist as an optimization.

Semantic rule:

```text
CACHED BY PROVIDER
!= AUTHORIZED FOR NEXT D4 OPERATION
```

Every new operation must independently satisfy D4-1 through D4-3.

## 35. Dispatch receipt remains ephemeral operations evidence

D4-3 reserves `PublicKnowledgeContextDispatchReceiptV1` as operational evidence.

D4-5 preserves:

```text
receipt
!= durable memory
!= future context authority
!= C5 lineage
!= C8 callback token
```

## 36. Diagnostics remain bounded and body-minimal

D4 observability may retain bounded categories/identifiers needed to explain operation outcomes.

It should prefer:

```text
operation disposition
pageIdentity
revisionRef
failure category
logical byte counts
token count
with-context / without-context dispatch disposition
```

and avoid persistent full semantic bodies/prompts by default.

## 37. Outcome-unknown remains non-replayable

If host transport cannot prove whether a D4-bearing dispatch happened:

```text
DISPATCH_OUTCOME_UNKNOWN
```

The same attachment must not be optimistically replayed.

A future reconciliation path may determine operational disposition, but cannot turn an already-consumed/ambiguous attachment into a reusable semantic authority token.

## 38. Post-dispatch page/lifetime changes do not patch the request

Once final checks pass and dispatch occurs:

```text
later head change
later page mutation
later feature-off
later lifetime end
```

must not retroactively rewrite the already-dispatched model request.

This preserves C8 closed.

## 39. No delayed refresh loop

D4 does not monitor the page after dispatch to send newer revisions automatically.

A later model operation that needs context starts a fresh D4 chain.

## 40. Historical context remains closed

D4-5 convergence must preserve D4-4:

```text
PK-D3 historical body visibility
!= D4 historical context authority
```

C7 is a product capability but is not consumed as a D4 V1 context source.

## 41. Search remains discovery-only

PK-X2 may hand off an exact selected `pageIdentity`, but D4-5 adds no search cache, top-k fan-in, embedding retrieval, ranking injection, or ambient page recall.

## 42. Mutation remains separate

D4 bounds/lifetime cleanup may not mutate durable pages to make context easier to fit or revalidate.

D2 remains the sole revision mutation path.

## 43. Candidate C final audit target

D4-5 detailed convergence must re-audit the complete PK-D4 program against all Candidate C gates.

Expected profile if no hidden escalation is found:

```text
C1 cross-turn survival        = YES
C2 stable identity            = YES
C3 semantic mutation          = YES, PK-D2 authority only
C4 append/merge pressure      = YES, PK-D2 authority only
C5 derived lineage            = NO
C6 model-context re-entry     = YES, exact current-head D4 V1 only
C7 historical survival        = YES, PK-D3 authority only
C8 delayed semantic effects   = NO
```

## 44. C6 must remain explicit rather than ambient

Final convergence requires proving:

```text
DURABLE PAGE EXISTS
!= CONTEXT
```

C6 is true only when a current operation explicitly completes the D4 chain.

## 45. C5 must remain closed

Using page P as model context does not make model output a formal derived descendant of P.

Attribution/dispatch receipt is not lineage.

## 46. C8 must remain closed

Operation cleanup, transport reconciliation, or physical deletion may occur later operationally.

Those are not delayed semantic effects on the page/revision/model request.

No D4 object may authorize a later semantic mutation callback.

## 47. Acceptance matrix for detailed convergence

D4-5 detailed design must preserve at least:

```text
ACTIVE page + LIVE operation + complete context within caps
→ one D4-bearing dispatch possible

ACTIVE page + terminal operation
→ no dispatch

ENDED/UNKNOWN page lifetime
→ no dispatch

context projection exceeds logical-byte cap
→ no truncation; HOLD

context attachment exceeds token cap
→ no summary; HOLD

REQUIRED + bounds failure
→ no pretend success/context-free downgrade

OPTIONAL + bounds failure + independently authorized context-free path
→ context-free dispatch possible, no D4 fragments

one attachment already dispatched
→ no second dispatch

prepared attachment survives physical cleanup failure after terminality
→ inert, non-reusable

feature off then on
→ old attachment not resurrected

provider cache retains bytes
→ no next-operation authority

historical R4 visible
→ still not D4 V1 context

search returns many pages
→ still one explicit page max

model output suggests edit/restore
→ still no mutation authority
```

## 48. Concrete bounds deferred to detailed design

The detailed D4-5 transaction should freeze testable integer caps for at least:

```text
MAX_D4_SELECTED_PAGES_PER_OPERATION
MAX_D4_ATTACHMENTS_PER_OPERATION
MAX_D4_BEARING_DISPATCHES_PER_OPERATION
MAX_D4_OPERATION_REF_UTF8_BYTES
MAX_D4_SELECTION_BINDING_REF_UTF8_BYTES
MAX_D4_ATTACHMENT_BINDING_REF_UTF8_BYTES
MAX_D4_SELECTION_ENVELOPE_LOGICAL_BYTES
MAX_D4_ADMISSION_RECEIPT_LOGICAL_BYTES
MAX_D4_CONTEXT_PROJECTION_LOGICAL_BYTES
MAX_D4_ATTACHMENT_CONTROL_LOGICAL_BYTES
MAX_D4_MODEL_ATTACHMENT_LOGICAL_BYTES
MAX_D4_MODEL_ATTACHMENT_TOKENS
MAX_D4_DISPATCH_RECEIPT_LOGICAL_BYTES
```

Any cap must be measured deterministically and fail closed without semantic truncation.

## 49. Runtime blockers remain

Even after design convergence, implementation remains unauthorized until an explicit runtime decision resolves at least:

```text
trusted operation lifecycle adapter
non-recyclable operationRef producer
D4-1 selection owner
D4-2 current semantic composer
D4-3 structured model attachment adapter
safe serializer/escaping conformance
model-interface tokenizer accounting
deterministic D4 logical encodings
final dispatch-edge ordering
one-shot attachment ownership
transport ambiguity reconciliation
ephemeral teardown integration
bounded observability/privacy policy
```

## 50. Sequence

```text
D4-0 Contextual Durable Page Master                 ✅
D4-1 Context Selection / Exact Address              ✅
D4-2 Current Revalidation / Composer                ✅
D4-3 Prompt Role / Instruction Firewall             ✅
D4-4 Historical / Search / Mutation Boundary        ✅
D4-5 Lifetime / Bounds Impact Scope                 ✅ THIS DOCUMENT
D4-5 Detailed Bounds / Convergence                  ← NEXT
```

## 51. Impact verdict

```text
PK-D4 D4-5 IMPACT
=
OPERATION-SCOPED EXPLICIT C6
+
ACTIVE PAGE LIFETIME
+
ONE PAGE / ONE CURRENT HEAD / ONE ATTACHMENT / ONE DISPATCH
+
FINITE BYTE AND TOKEN ADMISSION
+
ATOMIC FAIL-CLOSED BOUNDS
+
TERMINAL LOGICAL TEARDOWN
+
ZERO AMBIENT REUSE

NO NEW CONTEXT SOURCE
NO HISTORICAL CONTEXT V1
NO MULTI-PAGE FAN-IN
NO STICKY MEMORY
NO C5
NO C8

RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

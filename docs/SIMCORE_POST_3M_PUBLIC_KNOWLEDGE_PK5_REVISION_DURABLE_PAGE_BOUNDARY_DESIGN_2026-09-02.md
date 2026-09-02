# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-5 Revision / Durable Page Boundary Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-5 DESIGN FROZEN · SNAPSHOT V1 COMPLETE · DURABLE PAGE FUTURE PATH RESERVED · REVISION SEMANTICS BOUNDED · CANDIDATE C ACTIVATION MATRIX FROZEN · CANDIDATE C NOT ACTIVATED FOR V1 · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-5 · REVISION · DURABLE PAGE · CANDIDATE C · BOUNDARY REASSESSMENT**

## 0. Purpose

PK-0 through PK-4 define a complete current-projection PUBLIC_KNOWLEDGE family:

```text
PK-0 settlement semantics
PK-1 settlement context authority
PK-2 bounded validated document
PK-3 status-preserving reference presentation
PK-4 user-visible citation provenance
```

PK-5 decides whether those semantics require persistence, page identity, revision history, restore, or cross-turn reuse in the first implementation.

Final decision:

```text
PUBLIC_KNOWLEDGE V1
= CURRENT_PROJECTION_ONLY
= SNAPSHOT-COMPLETE
= NO CANDIDATE C ACTIVATION REQUIRED

DURABLE / REVISIONED PUBLIC_KNOWLEDGE
= FIRST-CLASS FUTURE EXPANSION PATH
= NOT DISCARDED
= CANDIDATE C CONSUMER WHEN CONCRETE REQUIREMENTS ARRIVE
```

This is design-only. No storage, IDs, revision ledger, mutation, re-entry, runtime schema, UI, prompt change, or release change is implemented.

## 1. Why snapshot V1 is complete

PUBLIC_KNOWLEDGE's semantic purpose is to answer:

```text
what can be represented as public reference material NOW?
```

That question is fully answerable from current authority without preserving the page afterward.

A snapshot can already express:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

plus bounded citation provenance.

Therefore:

```text
REFERENCE SEMANTICS COMPLETE
!=
WIKI HISTORY REQUIRED
```

The first implementation may regenerate a fresh PUBLIC_KNOWLEDGE projection from current authority on each activation.

## 2. Why durability remains a real future capability

Snapshot completion does not mean durability is undesirable.

The long-term wiki-like product surface may legitimately require:

```text
same page across turns
stable page URL/identity inside the simulation
page edits
new citations appended later
revision history
old revision inspection
revision comparison
restore
source replacement while old revision remains historical
page-specific delayed media
controlled future-context use
```

PK-5 preserves those as explicit future capabilities rather than classifying them as forbidden.

Canonical rule:

```text
NOT ACTIVE IN V1
!=
NOT PART OF THE PRODUCT VISION
```

## 3. Capability profiles

PK-5 freezes four named future profiles for design reasoning.

These are conceptual capability bundles, not runtime types.

### PK-D0 `SNAPSHOT_REFERENCE`

Current V1.

```text
C1 survival         = NO
C2 stable identity  = NO
C3 mutation         = NO
C4 append/merge     = NO
C5 derived lineage  = NO
C6 context re-entry = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

Properties:

```text
current projection only
fresh regeneration
no durable page identity
no revisions
no history
no mutation
```

### PK-D1 `DURABLE_PAGE_IDENTITY`

Use only when the product requires the same logical page to survive across turns.

```text
C1 = YES
C2 = YES
C3 = NO
C4 = NO
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

This creates a durable logical page identity but does not yet authorize edits or revision history.

### PK-D2 `REVISIONED_PAGE`

Use when the same durable page may evolve.

```text
C1 = YES
C2 = YES
C3 = YES
C4 = YES
C5 = NO
C6 = NO by default
C7 = NO by default
C8 = NO
```

This profile is the minimum for:

```text
edit
append assertion
remove assertion
append citation
replace citation
correction update
restore as a new revision
```

### PK-D3 `HISTORICAL_PAGE`

Use only when older revisions must remain inspectable despite later authority/support changes.

Base:

```text
PK-D2
+
C7 = YES when historical survival across source replacement is required
```

C7 must be justified by an explicit child design. Revision numbers alone do not activate it.

### PK-D4 `CONTEXTUAL_DURABLE_PAGE`

Use only when a prior durable page/revision must be injected into future model context.

Base:

```text
PK-D1 / PK-D2 / PK-D3
+
C6 = YES
```

C6 is never implied by persistence.

## 4. Optional gates not bundled by default

### C5 derived-from-derived propagation

Not part of ordinary revision history.

A revision of a page is another generation of the same logical page, not a cross-family derived child by definition.

C5 becomes relevant only for a requirement such as:

```text
BOARD rumor object
→ formal derived parent of NEWS record
→ formal derived parent of PUBLIC_KNOWLEDGE page object
```

or another explicit derived-object lineage.

### C8 delayed effect

Not part of page persistence by default.

C8 becomes relevant only when a delayed/asynchronous effect must attach to an exact durable page/revision, for example:

```text
revision 8 image generation completes later
→ must attach only to page P revision 8
```

## 5. Future page identity

A future durable page requires explicit derived identity.

Conceptual vocabulary:

```text
pageIdentity
namespace = PUBLIC_KNOWLEDGE_DOCUMENT
```

No serialized runtime format is frozen.

A durable page identity must not be inferred from:

```text
title
displayLabel
targetRef string formatting
content fingerprint
first assertion
citation bundle
host message number
renderInstanceKey
```

Canonical rule:

```text
DURABLE PAGE IDENTITY
MUST BE EXPLICIT
```

## 6. `targetRef` and durable page identity are distinct

Current PK contracts use `targetRef` to bind a current projection to a trusted target.

Future durability must preserve:

```text
targetRef
!= durablePageIdentity
```

A target may be regenerated into a new snapshot without a durable page.

A durable page may reference a current target while maintaining its own bounded derived identity.

No automatic one-to-one mapping is authorized in PK-5.

## 7. Page identity and revision identity

Future revisioned pages require two distinct questions:

```text
which logical page?
which generation of that page?
```

Conceptually:

```text
pageIdentity = P
revisionOrdinal / generation = R
```

Canonical rule:

```text
SAME PAGE
!= SAME REVISION
```

A late operation must not target only the page if revision specificity matters.

## 8. Revision immutability

If revision history is activated in a future child design, committed historical revisions should be immutable records of what that page generation contained.

Future mutation rule:

```text
edit current page
→ produce new revision
→ do not rewrite old revision in place
```

This does not mean old revision semantics remain current-valid.

## 9. Current revision pointer

A revisioned page may conceptually have one current revision pointer.

```text
page P
→ current revision R8
```

Moving the current pointer does not delete history.

However PK-5 does not implement or freeze a storage structure for that pointer.

## 10. Revision cause vocabulary

A future child design may need bounded revision causes such as:

```text
REGENERATE_CURRENT
EDIT
APPEND
REMOVE
CORRECTION_UPDATE
CITATION_UPDATE
RESTORE
SOURCE_REVALIDATION
```

PK-5 reserves the need for cause metadata but does not freeze a runtime enum.

Revision cause is history metadata, not settlement authority.

## 11. Revision number is not epistemic strength

Canonical rule:

```text
R9
!= more true than R8
!= more settled than R8
!= more authoritative than R8
```

A later revision may contain:

```text
more settled content
less settled content
new contestation
withdrawal
correction
```

according to current authority.

Revision order is temporal/object lineage only.

## 12. Every current revision must revalidate

Durability never makes a page self-supporting.

At later use, the current revision must re-prove required support against current trusted authority.

Preferred future chain remains:

```text
durable page identity
+
current revision
+
minimum support refs
        ↓
current Lineage / Handoff / Evidence
        ↓
Exposure
        ↓
Settlement Context
        ↓
PK validator
```

Canonical rule:

```text
PERSISTED ONCE
!= VALID FOREVER
```

## 13. Historical revision semantics

If PK-D3 is activated, a historical revision may remain viewable even when it is no longer the current valid page state.

The UI and API must distinguish at least:

```text
CURRENT VALIDATED REVISION
HISTORICAL REVISION SNAPSHOT
```

A historical snapshot must not silently inherit today's referenceState.

Nor may its old referenceState be presented as current validation.

## 14. Historical support notation

A future historical revision may preserve decision-time/support metadata sufficient to explain what was represented then.

But:

```text
HISTORICAL SUPPORT METADATA
!= CURRENT SUPPORT
```

Current use still follows support-at-use rules.

PK-5 does not freeze a durable provenance receipt schema for page revisions.

## 15. Current support invalidation

When current required authority no longer supports the durable page/revision:

```text
current projection support = invalid
```

The system must not automatically fall back to an older revision as if it were valid.

Canonical rule:

```text
CURRENT REVISION INVALID
!= PREVIOUS REVISION BECOMES TRUE
```

A future product may offer historical inspection separately.

## 16. Source replacement and C7

C7 becomes relevant only when descendants/revisions must survive replacement of the supporting source while retaining explicit historical meaning.

Possible future pattern:

```text
old source authority S1
→ revision R4 historical

new source authority S2
→ revision R5 current
```

If R4 remains available after S1 is no longer current, the future child design must specify exactly what survives and why.

PK-5 does not authorize generic partial survival.

## 17. Correction state remains semantic, not historical

PK-2's:

```text
CORRECTED_CURRENT_RECORD
```

continues to mean current public-reference semantics.

It does not require:

```text
old revision bytes
revision diff
editor history
restore point
```

Thus snapshot V1 can display a corrected current record with no revision history.

## 18. Withdrawal state remains semantic, not deletion

Likewise:

```text
WITHDRAWN_OR_RETRACTED_RECORD
```

means the current public-reference projection records that a public record was withdrawn/retracted.

It does not mean the page assertion object must be deleted from history.

A future historical page may preserve the old revision while current semantics explicitly mark the record withdrawn.

## 19. Future restore semantics

Restore is not byte resurrection.

Required future rule:

```text
user/system selects historical revision R4
        ↓
RESTORE INTENT
        ↓
construct proposed new current revision from R4 semantics
        ↓
re-run current authority / exposure / settlement / citation validation
        ↓
commit new revision R9 if accepted
```

Therefore:

```text
RESTORE R4
!= make R4 current without validation
```

The restored result is a new revision.

## 20. Restore cannot revive withdrawn authority

If an old revision depended on authority that is no longer valid:

```text
restore request
→ validation may DENY / HOLD / quarantine content
```

The product must not promise exact byte restoration as valid PUBLIC_KNOWLEDGE semantics.

Historical display and current restoration are separate operations.

## 21. Revision comparison

A future revision diff may show:

```text
added
removed
changed
citation changed
referenceState changed
```

only if those states are explicitly available from the compared revisions.

The diff itself must not claim:

```text
added = true
removed = false
changed = corrected
```

unless current semantic authority independently establishes it.

## 22. Citation bundle and revisions

PK-4 citation bundles are current-projection-only.

A future revisioned page would likely require citation provenance to be revision-bound.

Conceptual principle:

```text
REVISION R7
→ citation bundle valid for R7

REVISION R8
→ independently validated citation bundle for R8
```

The system must not assume unchanged citation markers imply unchanged source support.

## 23. CitationRef durability not frozen

A future implementation may need stable citation record identity, but PK-5 deliberately does not decide it.

Questions that require a later child design:

```text
same source record reused across revisions?
locator changes but source record is same?
corrected source replaces earlier source?
withdrawn source remains historical?
URL changes but public record identity is stable?
```

Therefore:

```text
PK-4 citationRef
DOES NOT BECOME GLOBAL DURABLE ID BY DEFAULT
```

## 24. Footnote numbering remains presentation-local

Even in a future revisioned page:

```text
[1] [2] [3]
```

remain presentation numbering.

They do not become revision-stable provenance identifiers.

A different render may number the same citation differently.

## 25. No automatic cross-revision merge

Two revisions must not be merged by naive union.

Forbidden:

```text
R7 assertions
+
R8 assertions
→ union everything
```

because revisions may contain replacement, correction, withdrawal, or changed settlement state.

Merge semantics require an explicit future C4 child contract.

## 26. Append semantics

If future product supports:

```text
add one citation
add one assertion
add one section item
```

that activates C4 under PK-D2.

Append still produces a new revision and revalidates all affected semantic dependencies.

## 27. Edit semantics

A future edit changes the durable page, not canonical world truth.

```text
EDIT PAGE
!= EDIT WORLD STATE
```

The resulting revision may only contain assertions allowed by current authority.

## 28. Delete semantics

Future deletion/removal of an assertion from current page presentation does not establish that the underlying claim is false.

```text
REMOVED FROM PAGE
!= FALSE IN WORLD
```

It is a page mutation event.

## 29. Page deletion boundary

Deleting a durable page is distinct from deleting one revision or hiding one assertion.

PK-5 does not authorize durable page deletion semantics.

That would require a dedicated C3 lifecycle design.

## 30. No automatic re-entry

Even PK-D1/D2/D3 persistence does not place old page text into model context.

Canonical rule remains:

```text
DURABLE PAGE PRESENT
!= ACTIVE SOURCE JOB
!= PROMPT CONTEXT
```

C6 must be explicitly activated and bounded.

## 31. Future C6 rules must be selective

If a later design activates C6, it must specify:

```text
which page?
which revision?
why is it relevant to this request?
what bounded fields re-enter?
what support-at-use validation happens first?
what token budget applies?
```

No all-pages history scan is acceptable.

## 32. No generic search implied by durability

Durable page storage does not automatically authorize:

```text
full-text wiki search
fuzzy title search
embedding retrieval
background indexing
cross-character corpus search
```

Search/retrieval would be a separate bounded design.

## 33. No automatic page creation from every target

A future durable mode must not create permanent pages for every PUBLIC_KNOWLEDGE snapshot simply because one was rendered.

Canonical future rule:

```text
SNAPSHOT RENDERED
!= DURABLE PAGE CREATED
```

Durable creation requires explicit product/lifecycle authority.

## 34. No global wiki truth database

Even a durable PUBLIC_KNOWLEDGE layer remains derived source intelligence.

```text
DURABLE PUBLIC_KNOWLEDGE STORE
!= CANONICAL WORLD DATABASE
```

World/current fact authority remains upstream.

## 35. No NEWS repetition settlement shortcut

Durability does not weaken PK-0 settlement rules.

```text
same NEWS claim persists for 20 turns
!= settled public knowledge
```

Likewise:

```text
same page survives for 20 turns
!= more true
```

## 36. SOCIAL_FEED popularity remains orthogonal

Future:

```text
likeCount
viewCount
repostCount
followerCount
engagementScore
trendRank
viralityScore
```

may evolve as legitimate SOCIAL_FEED capabilities.

They still do not update PUBLIC_KNOWLEDGE settlement or revision authority merely because a page is durable.

## 37. Revision UI future minimum

If historical revision presentation is ever activated, minimum semantic cues should include:

```text
historical revision status
revision identity/generation label
not-current indicator
```

Color alone is insufficient.

No exact DOM/CSS grammar is frozen here.

## 38. Revision timestamp boundary

A future revision timestamp must come from trusted time/lifecycle authority.

Renderer must not synthesize:

```text
last edited 2 minutes ago
```

without actual revision-time authority.

## 39. Editor identity boundary

Revision history does not imply editor identity exists.

Future fields such as:

```text
edited by
contributor
moderator
system account
```

require separate trusted actor authority.

No editor identity is reserved by PK-5.

## 40. Revision metrics boundary

Revision history does not authorize:

```text
edit count
page view count
watchers
contributors count
quality score
```

Those remain separate semantic capabilities.

## 41. Performance boundary

PK-D0 cost should scale with current projection only.

If durable profiles are later activated, cost must scale with the specifically requested durable page/revision operation, not total conversation history.

Forbidden:

```text
every PUBLIC_KNOWLEDGE activation
→ scan all durable revisions
```

## 42. Failure isolation

Future durable-store failure must not mutate canonical world state.

Possible product policy may degrade to fresh snapshot generation if the current request does not require exact durable identity.

But when the user explicitly requests:

```text
revision 4
same page as before
restore revision 4
```

and durable identity cannot be resolved, the system must fail closed rather than guess.

## 43. Snapshot fallback boundary

Canonical rule:

```text
DURABLE IDENTITY REQUIRED BY REQUEST
+
IDENTITY UNAVAILABLE
→ DO NOT SUBSTITUTE A LOOKALIKE SNAPSHOT AS THE SAME PAGE
```

A new snapshot may be offered/created only as a distinct projection if product policy allows.

## 44. Candidate C final matrix

For current PUBLIC_KNOWLEDGE V1:

```text
C1 = NO
C2 = NO
C3 = NO
C4 = NO
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

Formal future mappings:

```text
same page later                         → C1 + C2
edit / restore / replace item           → + C3
append / merge / partial update         → + C4
cross-family derived-object propagation  → + C5 only if explicit
future prompt context                    → + C6 only if explicit
historical survival across replacement   → + C7 only if explicit
delayed exact-revision effect            → + C8 only if explicit
```

## 45. V1 convergence decision

PK-5 freezes:

```text
PUBLIC_KNOWLEDGE V1 SNAPSHOT FAMILY
= COMPLETE ENOUGH TO CONVERGE
```

No revision/history capability is required to call the first family design complete.

This is an implementation-order decision, not a permanent product limitation.

## 46. Reserved future lane

Formal future lane name for planning purposes:

```text
DURABLE_PUBLIC_REFERENCE_PAGE
```

This name is design vocabulary only.

It is not:

```text
new source family
new core mode
runtime feature flag
storage table
API type
```

A future child design must activate only the exact capability profile it needs.

## 47. What PK-5 deliberately preserves

The following future product capabilities remain intentionally open:

```text
persistent wiki-like pages
revision history
current vs historical revision views
restore
revision compare
citation changes across revisions
source correction / withdrawal history
page-specific mutations
controlled future context
page-bound delayed media
```

They are not cut from the design.

## 48. What PK-5 deliberately does not authorize

```text
runtime persistence
page database
revision database
revision IDs
mutating UI
edit buttons
restore buttons
history tab
retrieval/indexing
prompt re-entry
background refresh
network fetch
media generation
implementation code
release change
```

## 49. Next PUBLIC_KNOWLEDGE checkpoint

After PK-5, the natural family-level checkpoint is:

```text
PK-6 · Family Convergence / Expansion Boundary
```

It should answer whether PK-0..PK-5 together form a coherent first PUBLIC_KNOWLEDGE design and record the deferred expansion lanes without activating them.

## 50. Final PK-5 decision

```text
SNAPSHOT PUBLIC_KNOWLEDGE V1
= CONVERGENCE-READY

DURABLE PUBLIC REFERENCE PAGE
= FORMALLY RESERVED FUTURE CAPABILITY
= CANDIDATE C CHILD DESIGN REQUIRED WHEN ACTIVATED

CANDIDATE C FOR CURRENT V1
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED
```

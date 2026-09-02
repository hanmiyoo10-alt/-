# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-2 Historical Disclosure / Withdrawal Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-2 DESIGN FROZEN · HISTORICAL DISCLOSURE REQUIREMENT PROFILE · LEAST-AUTHORITY CURRENT COMPOSER · METADATA/BODY/ACTION SURFACE SEPARATION · SEMANTIC WITHDRAWAL != DISCLOSURE WITHDRAWAL · EPHEMERAL CURRENT DECISION · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-2 · HISTORICAL DISCLOSURE · WITHDRAWAL · PRIVACY/ACCESS BOUNDARY · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 separated:

```text
historical authenticity
current truth/current-page support
current disclosure safety
```

D3-1 froze revision-owner-authenticated historical admission for authenticity.

D3-2 freezes the current disclosure-safety contract for an already-authentic historical revision.

Central question:

```text
MAY THIS EXACT AUTHENTIC HISTORICAL ARTIFACT
BE DISCLOSED ON THIS CURRENT SURFACE
IN THIS CURRENT CONTEXT NOW?
```

D3-2 does not decide whether the historical claim is current truth.

It implements no runtime ACL/privacy provider, legal system, model classifier, network resolver, renderer, archive, release, or `release-simcore` change.

## 1. Authority chain

Consumes:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_1_HISTORICAL_ADMISSION_PROVENANCE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_2_HISTORICAL_DISCLOSURE_WITHDRAWAL_IMPACT_SCOPE_2026-09-02
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK1_SETTLEMENT_CONTEXT_AUTHORITY_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK2_DOCUMENT_SIDECAR_VALIDATOR_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK4_CITATION_PROVENANCE_BOUNDARY_DESIGN_2026-09-02
```

Inherited invariants:

```text
historical admission != current truth
historical admission != current disclosure permission
semantic withdrawal != disclosure withdrawal
current Exposure != historical disclosure oracle
historical display != current mutation authority
```

## 2. Capability profile

D3-2 preserves:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES, inherited PK-D2
C4 append / merge pressure    = YES, inherited PK-D2
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES, DESIGN ONLY
C8 delayed effect targeting   = NO
```

No additional Candidate C capability is opened.

## 3. Selected authority architecture

D3-2 selects conceptual:

```text
HistoricalDisclosureRequirementProfileV1
        ↓
trusted current disclosure-relevant authority adapters
        ↓
HistoricalRevisionDisclosureComposer
        ↓
HistoricalRevisionDisclosureContextV1
```

The composer is:

```text
pure/current-operation-scoped
least-authority
bounded
deterministic
fail-closed
no model
no network
no transcript scan
no persistent permission cache
```

## 4. Why a requirement profile is needed

Repository authority does not currently provide one universal generic privacy/access/legal-disclosure oracle.

D3-2 therefore must distinguish:

```text
a disclosure authority class is not required for this exact surface/profile
```

from:

```text
a disclosure authority class is required but unavailable
```

Without that distinction, an implementation would either optimistically allow missing safety checks or pessimistically require imaginary providers for every operation.

The requirement profile is trusted policy, not model/user input.

## 5. Requirement profile

Conceptual shape:

```text
HistoricalDisclosureRequirementProfileV1
  schemaVersion
  policyProfileId
  requiredForMetadata[]
  requiredForBody[]
  requiredForOutboundAction[]
```

First semantic authority classes:

```text
CURRENT_ACCESS_SCOPE
CURRENT_PRIVACY_PROTECTION
CURRENT_DISCLOSURE_WITHDRAWAL
CURRENT_ARTIFACT_SAFETY_RESTRICTION
```

The profile may declare a class not applicable to a surface only through trusted policy definition.

Forbidden:

```text
provider unavailable
→ mark class not required dynamically
```

Availability does not define policy applicability.

## 6. Provider contract

For each required class, the composer consumes an exact current trusted decision from the class owner/adapter.

Conceptual tri-state:

```text
ALLOW
DENY
HOLD
```

A provider decision must be bound sufficiently to the exact current request domain, conceptually including:

```text
current lifetime/context
pageIdentity
revisionRef or admitted artifact binding
surface kind
policy profile
```

Exact physical schemas are deferred.

## 7. No invented providers

D3-2 freezes no generic ACL database, privacy registry, legal-withdrawal service, or moderation database.

If a required class has no trusted provider in a future implementation:

```text
HOLD_UNSUPPORTED_DISCLOSURE_AUTHORITY
```

The composer must not infer the missing answer from:

```text
model judgment
content wording
person/entity name
current source absence
historical age
popularity
old public status
```

## 8. Surface ladder

D3-2 freezes three current disclosure surfaces:

```text
REVISION_METADATA
REVISION_BODY
OUTBOUND_ACTION
```

Examples:

```text
REVISION_METADATA
= revision existence/reference/list-row/header-safe metadata

REVISION_BODY
= exact admitted historical semantic document + historical citation labels

OUTBOUND_ACTION
= current interactive link/navigation/resolution action originating from historical content
```

## 9. Monotonic surface rule

Permission cannot become stronger on a more revealing/active surface.

Canonical ordering:

```text
OUTBOUND_ACTION <= REVISION_BODY <= REVISION_METADATA
```

Therefore:

```text
metadata DENY/HOLD -> body cannot ALLOW
body DENY/HOLD -> outbound action cannot ALLOW
```

But the reverse is legal:

```text
metadata ALLOW + body DENY
metadata/body ALLOW + outbound action DENY
```

This supports safe list/header visibility while withholding protected body or unsafe links.

## 10. Composer precedence

For each surface:

```text
if stronger prerequisite surface is not ALLOW
  -> cannot ALLOW this surface

else if any required authoritative input = DENY
  -> DENY

else if any required input missing/unavailable/HOLD
  -> HOLD

else
  -> ALLOW
```

No weighted scoring, majority vote, confidence aggregation, timestamp-wins, or provider fallback.

## 11. Historical disclosure context

Conceptual output:

```text
HistoricalRevisionDisclosureContextV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  policyProfileRef
  metadataDisposition
  bodyDisposition
  outboundActionDisposition
  decisionScopeRef
```

`decisionScopeRef` binds the result to the current operation/policy context.

It is not a durable permission token.

Exact enums/encoding are implementation authority.

## 12. Ephemeral decision rule

A historical disclosure ALLOW is current-operation-scoped.

Forbidden:

```text
R4 allowed once
→ persist allowed=true beside R4
→ skip future current policy reads
```

Every new historical open/list/compare/action that requires disclosure authorization must construct a fresh compatible current context.

Canonical rule:

```text
PAST DISCLOSURE ALLOW
!= FUTURE DISCLOSURE LICENSE
```

## 13. Current truth support excluded

The composer must not require the old body to pass current:

```text
source support
settlement
claim-support
ordinary current-page PK validation
current citation support
```

Those belong to current-page semantics or optional current-status companion generation.

Example:

```text
R4 authentically said X was settled
current record says X was corrected
current disclosure policy allows R4 history
→ R4 body may display AS HISTORY
```

## 14. Ordinary Exposure excluded wholesale

3M-2 Exposure includes current audience/source assertion eligibility.

D3-2 does not consume an ordinary current Exposure ALLOW/DENY as one monolithic disclosure decision.

A future adapter may map an individual structured Exposure-derived fact only if its semantics are proven to be strictly disclosure-relevant for D3.

Forbidden:

```text
current CONFIRMED_FACT not allowed
→ historical body DENY
```

unless an independent disclosure rule actually says so.

## 15. Semantic settlement state matrix

Current/public-reference semantic states alone do not grant or deny historical disclosure.

```text
SETTLED_PUBLIC_REFERENCE          -> no automatic disclosure disposition
ATTRIBUTED_BUT_NOT_SETTLED       -> no automatic disclosure disposition
CONTESTED_PUBLIC_RECORD          -> no automatic disclosure disposition
CORRECTED_CURRENT_RECORD         -> no automatic disclosure disposition
WITHDRAWN_OR_RETRACTED_RECORD    -> no automatic disclosure disposition
```

They may affect separately current-authorized companion/presentation requirements in D3-3.

## 16. Semantic withdrawal versus disclosure withdrawal

Canonical rule:

```text
WITHDRAWN_OR_RETRACTED_RECORD
!= CURRENT_DISCLOSURE_WITHDRAWAL DENY
```

A record may be semantically withdrawn/retracted yet remain historically inspectable.

Conversely, a currently settled historical claim may still be nondiscloseable due to current privacy/access/legal authority.

The axes are independent.

## 17. Disclosure withdrawal semantics

A trusted current disclosure-withdrawal authority may conceptually yield:

```text
ALLOW_HISTORY
DENY_HISTORY
HOLD_UNKNOWN
```

Its meaning is specifically current permission to disclose retained history.

It must not be synthesized from settlement state, citation role, current source disappearance, or UI label.

## 18. Privacy semantics

A trusted current privacy authority may deny an authentic historical body.

D3-2 deliberately does not freeze what privacy categories exist.

Required rule:

```text
privacy classification authority
!= historical composer
```

The composer consumes trusted decisions; it does not create privacy labels.

## 19. Access semantics

A trusted access owner may scope who/where may inspect history.

D3-2 does not freeze account roles, ACL backend, organization policy, or cross-user sharing.

If the active product profile requires access authorization and the exact current access decision cannot be obtained:

```text
HOLD
```

## 20. Artifact safety semantics

A trusted current safety/legal/content-access authority may restrict the artifact or interactive behavior.

Body safety and outbound-action safety may differ.

Example:

```text
historical citation label may render
stored/current URL resolution may remain denied
```

Stored URL-like text is not authorization to activate a link.

## 21. Metadata disclosure

Revision metadata itself can leak history existence.

Therefore revision-list entries/header metadata are not unconditional merely because body is withheld.

First rule:

```text
metadata disposition must be independently computed under its requirement profile
```

If metadata is DENY/HOLD:

```text
no revision list row/header exposing protected revision identity
no body
no action
```

Exact concealment copy/layout is D3-3.

## 22. Body whole-artifact atomicity

D3-0/D3-1 exact-artifact identity is preserved.

For `REVISION_BODY`:

```text
ALLOW exact admitted semantic artifact
OR
WITHHOLD body
```

If any content component triggers current body disclosure DENY and no redacted-history identity model exists:

```text
whole body denied
```

Forbidden:

```text
remove one assertion/citation and still call result exact R4
```

## 23. No redaction-by-renderer

Presentation Renderer may not cure a D3-2 body denial by deleting sensitive semantic fields while retaining the same revision identity.

A future redacted-historical-artifact capability would need explicit new semantic identity/version/provenance design.

## 24. Reason privacy

The internal DENY/HOLD authority reason may itself be sensitive.

D3-2 does not require renderer-visible disclosure of:

```text
privacy category
access role mismatch
legal-withdrawal basis
protected target identity
```

It only requires a safe disposition handoff.

D3-3 decides bounded user-facing status grammar without leaking protected reasons.

## 25. Current status companion

D3-2 hands D3-3 a clean separation:

```text
HistoricalRevisionDisclosureContextV1
= whether historical surfaces may be disclosed

CurrentStatusCompanion
= optional separately current-derived semantic context
```

A current correction/retraction may justify companion content, but the companion is not a substitute for disclosure permission.

## 26. Compare handoff

Historical compare in D3-3 requires disclosure authorization for both exact inputs.

Conceptually:

```text
A metadata/body disposition
+
B metadata/body disposition
→ compare eligibility
```

If either required body is not ALLOW:

```text
no semantic compare body for that pair
```

Compare must not reveal protected content through diff output.

## 27. Revision list handoff

Page-local history listing remains bounded by D2-5.

Each list entry is subject to metadata disclosure policy.

Forbidden:

```text
list all revision IDs first
then check metadata disclosure only when clicked
```

The list itself is a disclosure surface.

## 28. Restore separation

Historical disclosure ALLOW does not authorize restore.

```text
body ALLOW
!= restore allowed
```

Restore remains a current PK-D2 mutation flow with current source/Exposure/settlement/citation validation and D2-2 commit safety.

A D3-2 disclosure DENY likewise does not delete or mutate the stored revision.

## 29. Withdrawal does not mutate history

A current disclosure-withdrawal DENY means:

```text
stored authentic revision may remain retained under lifetime policy
current historical surface withheld
```

It does not automatically mean:

```text
delete revision bytes
rewrite revision
remove admission receipt
move head
```

Deletion/retention is a separate lifecycle/cleanup authority.

## 30. Lifetime interaction

Historical disclosure requires active trusted lifetime.

```text
ACTIVE -> policy may evaluate
ENDED  -> historical operation invalid immediately
UNKNOWN -> fail closed
```

An earlier ALLOW cannot survive lifetime END.

Physical residue after END has no disclosure authority.

## 31. Feature-off behavior

When PK-D3 historical capability is disabled:

```text
historical disclosure composition = 0
historical body/list/action surface = 0
provider reads for D3 = 0
```

Feature-off does not mutate historical admission or revision records.

Re-enable requires fresh current disclosure decisions.

## 32. Reload/cache behavior

Reload or UI cache must not preserve an old ALLOW as authority.

```text
cached historical DOM/body
+ no fresh current disclosure context
→ not current authorized historical surface
```

A future renderer must clear/remount according to fresh D3-2/D3-3 state.

## 33. Provider disagreement

If two authoritative inputs apply to the same required surface and one says ALLOW while another says DENY:

```text
DENY wins
```

If no DENY but one required input is HOLD/unknown:

```text
HOLD
```

No attempt is made to infer which authority is "more recent" unless a future owner contract explicitly defines precedence before composition.

## 34. Unsupported authority behavior

If a requirement profile names a class with no trusted provider:

```text
HOLD_UNSUPPORTED_DISCLOSURE_AUTHORITY
```

This is not treated as DENY for semantic/history retention purposes and not treated as ALLOW for presentation.

## 35. Requirement-profile integrity

The requirement profile itself must be trusted and compatible with the current operation.

Unknown/incompatible profile:

```text
HOLD_DISCLOSURE_POLICY_PROFILE
```

A client/UI/model may not submit a weaker profile to obtain more history.

## 36. No durable permission metadata

Do not add to revision/admission records:

```text
historicalBodyAllowedForever
privacyCleared
legalCleared
lastAllowedAt
```

as semantic authority.

Operational diagnostics may exist only under separate bounded non-semantic observability rules.

## 37. No background monitoring

D3-2 introduces no watcher for privacy/access/withdrawal changes.

A future condition-change notification product would be a separate asynchronous capability assessment and could implicate C8.

Current D3-2 remains request-time only.

## 38. Acceptance matrix

### A — current correction only

```text
authentic R4
current semantic state corrected
all required disclosure authorities ALLOW
→ metadata/body ALLOW as history
```

### B — semantic withdrawal only

```text
authentic R4
current state WITHDRAWN_OR_RETRACTED_RECORD
no trusted disclosure-withdrawal deny
all required disclosure authorities ALLOW
→ no automatic historical body deny
```

### C — explicit disclosure withdrawal deny

```text
authentic R4
trusted CURRENT_DISCLOSURE_WITHDRAWAL = DENY
→ body DENY
```

### D — privacy provider required but unavailable

```text
→ HOLD
→ no body
```

### E — metadata allowed, body denied

```text
metadata ALLOW
body DENY
→ revision may be listable under D3-3 safe grammar
→ body unavailable
```

### F — metadata denied

```text
metadata DENY
→ body/action cannot ALLOW
→ no leaking revision row/header
```

### G — body allowed, outbound link denied

```text
historical citation label may render
interactive resolution disabled
```

### H — current Exposure rejects old claim as current public fact

```text
not by itself a D3-2 historical disclosure deny
```

### I — cached prior ALLOW after policy/lifetime change

```text
prior ALLOW ignored
fresh context required
```

## 39. Runtime-readiness blockers

Before implementation can claim D3-2 readiness it must prove:

```text
trusted requirement profile ownership
exact provider binding to current operation/surface
provider missing -> HOLD
DENY/HOLD precedence
metadata/body/action monotonicity
semantic withdrawal != disclosure withdrawal
no ordinary-Exposure laundering
fresh decision per operation
whole-body atomicity
no cached stale body after permission loss
feature-off dormancy
lifetime invalidation
```

If a chosen runtime product profile requires privacy/access/legal providers not yet authoritative, runtime readiness remains blocked rather than inventing them.

## 40. Candidate C audit

```text
C1 YES  inherited durability
C2 YES  page/revision identity
C3 YES  inherited PK-D2 mutation
C4 YES  inherited append/merge pressure
C5 NO   disclosure inputs are authority adapters, not derived-parent lineage
C6 NO   history is not injected into model context
C7 YES  historical body may survive current truth support loss
C8 NO   no delayed/background effect targeting
```

## 41. Concurrent-main evidence

Transaction began from fresh main after unrelated Agent Skill orchestrator model-family smoke work had advanced main beyond D3-1.

That change set did not touch PUBLIC_KNOWLEDGE / PK-D3 historical disclosure authority.

Classification:

```text
WATCH · MAIN_ADVANCED_BEFORE_D3_2_TRANSACTION · NON_BLOCKING
```

## 42. Frozen handoff to D3-3

D3-3 may consume:

```text
authentic exact historical revision
+
HistoricalRevisionDisclosureContextV1
```

to design historical presentation and compare.

D3-3 must not weaken D3-2 dispositions.

It must preserve:

```text
history framing
metadata/body/action separation
whole-body atomicity
safe withheld-state presentation
no protected reason leakage
```

## 43. Status

```text
D3-2 = DESIGN FROZEN
PK-D3 overall = IN PROGRESS
runtime implementation = NOT AUTHORIZED
release mutation = NONE
next = D3-3 Historical Presentation / Compare
```

# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-2 Historical Disclosure / Withdrawal Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-2 IMPACT SCOPE FROZEN · LEAST-AUTHORITY HISTORICAL DISCLOSURE GATE · SEMANTIC WITHDRAWAL != DISCLOSURE WITHDRAWAL · CURRENT TRUTH SUPPORT NOT REQUIRED · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-2 · HISTORICAL DISCLOSURE · WITHDRAWAL · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 froze three independent axes:

```text
A historical authenticity
B current truth/current-page support
C current disclosure safety
```

D3-1 froze exact historical admission/provenance for Axis A.

D3-2 scopes Axis C only:

```text
Given an authentic admitted historical revision,
may that exact historical artifact be disclosed in the current context now?
```

D3-2 does not re-run current truth validation as a historical body gate and does not implement runtime policy, storage, renderer, network, model, or release changes.

## 1. Authority chain

Consumes:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_1_HISTORICAL_ADMISSION_PROVENANCE_DESIGN_2026-09-02
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK1_SETTLEMENT_CONTEXT_AUTHORITY_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK2_DOCUMENT_SIDECAR_VALIDATOR_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PK4_CITATION_PROVENANCE_BOUNDARY_DESIGN_2026-09-02
```

Frozen distinctions:

```text
historical authenticity != current truth
historical authenticity != current disclosure permission
semantic withdrawal/retraction != legal/privacy disclosure withdrawal
ordinary current Exposure != historical disclosure policy
```

## 2. Repository authority finding

Fresh-read repository evidence shows no already-frozen generic privacy/access/legal-withdrawal owner that can be treated as a universal historical-disclosure oracle.

Therefore D3-2 must not invent one.

Canonical rule:

```text
ABSENT TRUSTED DISCLOSURE AUTHORITY
!= ASSUME ALLOW
!= MODEL CLASSIFY
```

If a historical disclosure decision requires a privacy/access/legal signal for which no trusted authority exists in the active scope, the design must fail closed or classify the capability as unsupported.

## 3. Selected seam

D3-2 selects conceptual:

```text
HistoricalRevisionDisclosureContextV1
```

owned by the PUBLIC_KNOWLEDGE historical disclosure policy layer.

This is a least-authority current adapter/composer over disclosure-relevant trusted inputs only.

It must not:

```text
create facts
re-evaluate current truth as a display requirement
upgrade settlement
invent privacy/access/legal labels
scan transcript prose
use model confidence
use source popularity
call network/model
```

## 4. First output classes

Conceptual dispositions:

```text
ALLOW_HISTORICAL_DISCLOSURE
DENY_HISTORICAL_DISCLOSURE
HOLD_HISTORICAL_DISCLOSURE
```

Exact runtime names remain implementation authority.

Precedence:

```text
any authoritative DENY -> DENY
else any required unknown/unavailable authority -> HOLD
else all required supported disclosure inputs ALLOW -> ALLOW
```

No vote, majority, confidence score, or latest-label heuristic.

## 5. Truth support is not a D3 disclosure requirement

Historical disclosure does not require the old revision to pass current:

```text
source support
settlement
claim support
ordinary current-page PK validation
current citation authorization
```

Those can be used for separately presented current-status context, not as automatic historical-body denial.

Otherwise D3 collapses back into D2.

## 6. Ordinary Exposure is not copied wholesale

3M-2 Exposure includes current source/audience assertion eligibility semantics.

D3-2 therefore rejects:

```text
run ordinary SourceAssertionPolicyContext unchanged
-> DENY means historical body denied
```

unless a future child proves a particular input is purely disclosure-relevant and semantically compatible.

Historical policy consumes only explicitly mapped disclosure-relevant facts from existing owners.

## 7. Semantic withdrawal versus disclosure withdrawal

`WITHDRAWN_OR_RETRACTED_RECORD` is a PUBLIC_KNOWLEDGE semantic settlement/reference state.

It means roughly:

```text
the public record was withdrawn/retracted in the semantic record
```

It does not by itself mean:

```text
all prior historical artifacts must be hidden now
```

Therefore:

```text
WITHDRAWN_OR_RETRACTED_RECORD
!= DENY_HISTORICAL_DISCLOSURE
```

A separate trusted disclosure-withdrawal/privacy/access authority is required for an actual historical disclosure deny.

## 8. Correction and contestation

Likewise:

```text
CORRECTED_CURRENT_RECORD
CONTESTED_PUBLIC_RECORD
```

are not historical disclosure-deny signals.

They may justify a current-status companion in D3-3, but they do not erase authentic history.

## 9. First disclosure-relevant signal classes

D3-2 scopes four conceptual signal classes, each requiring a trusted owner before use:

```text
CURRENT_ACCESS_SCOPE
CURRENT_PRIVACY_PROTECTION
CURRENT_DISCLOSURE_WITHDRAWAL
CURRENT_ARTIFACT_SAFETY_RESTRICTION
```

These are semantic classes, not declarations that runtime providers already exist.

If no trusted provider exists for a class required by a specific product surface:

```text
HOLD_UNSUPPORTED_DISCLOSURE_AUTHORITY
```

## 10. Current access scope

A future trusted access owner may say whether the current requester/context is authorized to inspect the historical artifact.

Examples of legitimate conceptual inputs:

```text
allowed in this conversation scope
restricted to a narrower actor/role/context
access state unknown
```

D3-2 does not select an account/ACL backend.

## 11. Current privacy protection

A future trusted privacy owner may prohibit disclosure of retained historical material even when it was once public.

D3-2 does not infer privacy from:

```text
person name
private-sounding prose
model judgment
absence from current source
```

Only trusted structured privacy authority may deny on this basis.

## 12. Current disclosure withdrawal

D3-2 distinguishes an explicit present-day disclosure-removal directive from semantic correction/retraction.

Conceptually:

```text
DISCLOSURE_WITHDRAWAL_ALLOW_HISTORY
DISCLOSURE_WITHDRAWAL_DENY_HISTORY
DISCLOSURE_WITHDRAWAL_UNKNOWN
```

Exact provider/schema deferred.

A semantic `WITHDRAWN_OR_RETRACTED_RECORD` may coexist with either ALLOW or DENY historical disclosure.

## 13. Artifact safety restriction

A future trusted safety/legal/content-access owner may restrict rendering or link activation for an authentic historical artifact.

This boundary is about current disclosure/render permission, not old truth.

Stored historical citation labels do not automatically authorize outbound link resolution.

## 14. Whole-body atomicity preserved

First D3 profile remains:

```text
exact historical body disclosed
OR
body withheld
```

If one assertion requires current disclosure denial and D3 has no redacted-artifact identity model:

```text
WITHHOLD WHOLE BODY
```

Do not silently delete protected assertions and continue calling the result revision R.

## 15. Metadata versus body

Historical revision metadata listing remains a separate disclosure surface.

D3-2 must distinguish:

```text
METADATA_DISCLOSURE
BODY_DISCLOSURE
```

because revealing even revision existence/labels can be sensitive in some future policy domains.

First scope must not assume body denial automatically permits unrestricted metadata.

Detailed metadata matrix is a D3-2 child-design requirement.

## 16. Current status companion separation

Current settlement/correction/withdrawal semantics may be displayed only through a separately current-authorized companion.

```text
historical body = exact admitted old artifact
current companion = current authority output
```

Failure/absence of a companion must not rewrite historical body.

Mandatory-companion presentation rules are deferred to D3-3.

## 17. Citation separation

Historical citation labels are part of the historical semantic artifact.

They do not automatically authorize:

```text
current link resolution
current claim support
current source validity
```

Link/navigation permission is independently current-disclosure/safe-resolution governed.

## 18. Explicit historical intent remains required

A denied or unavailable current page must not automatically fall back to history.

```text
current page unavailable
!= automatically open latest historical revision
```

Historical disclosure gate runs only after exact historical navigation/selection.

## 19. Failure matrix

First conceptual matrix:

```text
historical admission invalid/missing
-> not D3-2; fail at D3-1 authenticity

historical admission valid
+ explicit trusted current disclosure DENY
-> DENY body

historical admission valid
+ required disclosure authority unavailable/unknown
-> HOLD body

historical admission valid
+ current truth unsupported
+ disclosure authority ALLOW
-> historical body may display AS HISTORY

semantic withdrawn/retracted
+ no trusted disclosure-withdrawal deny
-> do not auto-deny solely from settlement state
```

## 20. No policy laundering

Forbidden:

```text
current truth no longer supported
-> relabel as privacy deny

semantic retraction
-> relabel as legal withdrawal

old public visibility
-> permanent disclosure allow

historical admission
-> permanent access token
```

Each authority remains in its lane.

## 21. Dormancy

No explicit historical operation means:

```text
historical disclosure context construction = 0
privacy/access provider reads = 0
history scans = 0
model calls = 0
network calls = 0
```

No background refresh/watch is introduced.

## 22. Candidate C profile

D3-2 preserves:

```text
C1 YES
C2 YES
C3 YES, inherited
C4 YES, inherited
C5 NO
C6 NO
C7 YES, design only
C8 NO
```

Disclosure policy introduces no additional Candidate C gate.

## 23. Detailed design requirements

D3-2 detailed design must freeze:

```text
1 exact disclosure authority matrix
2 DENY/HOLD precedence
3 body vs metadata decision separation
4 semantic withdrawal vs disclosure withdrawal examples
5 unsupported-provider behavior
6 feature-off / lifetime interaction
7 disclosure decision freshness / no persistent permission token
8 current-status companion handoff to D3-3
```

## 24. Acceptance cases

### Case A — authentic old revision, current truth corrected, disclosure allowed

Expected:

```text
historical body ALLOW as explicitly historical
current truth correction does not erase history
```

### Case B — authentic old revision, semantic withdrawn/retracted only

Expected:

```text
no automatic historical deny solely from semantic state
```

### Case C — authentic old revision, explicit trusted privacy deny

Expected:

```text
historical body DENY
no stale cached body
```

### Case D — privacy/access authority required but unavailable

Expected:

```text
HOLD
no optimistic disclosure
```

### Case E — ordinary current Exposure denies current assertion

Expected:

```text
not sufficient by itself to deny historical display
```

### Case F — one protected assertion in exact old body

Expected:

```text
whole body withheld in V1
no silent redaction
```

## 25. Transaction classification

```text
DESIGN-ONLY
main docs authority only
runtime diff expected = none
release-simcore mutation = forbidden
```

## 26. Concurrent-main watch

Fresh transaction start observed main had advanced after D3-1 due unrelated Agent Skill orchestrator model-family smoke work.

Classification:

```text
WATCH · MAIN_ADVANCED_BEFORE_D3_2_TRANSACTION · NON_BLOCKING
```

No PUBLIC_KNOWLEDGE / PK-D3 / historical-disclosure semantic overlap was found.

## 27. Exit

If detailed design proves the least-authority matrix can preserve:

```text
historical authenticity
!= current truth
!= current disclosure permission
```

without inventing missing privacy/legal authority, D3-2 may freeze and hand off to D3-3 presentation/compare.

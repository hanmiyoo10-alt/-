# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-4 Settlement / Citation / Search Integration Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-4 IMPACT SCOPE FROZEN · DESIGN-ONLY · CURRENT AUTHORITY REBIND · NO STABLE CITATION IDENTITY · PAGE-LEVEL SEARCH ONLY · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-4 scopes the integration between committed PK-D2 revisions and existing PUBLIC_KNOWLEDGE settlement, citation/provenance, and PK-X2 search contracts.

No runtime, schema migration, prompt, model, DOM/CSS, network, or release change is authorized.

## 1. Canonical separations

```text
stored revision referenceState
!= current settlement authority

stored revision citation surface
!= current citation authority

stored citationRef
!= persistent bibliographic identity

search hit
!= revision pin
!= revision body search
```

PK-1 settlement context remains stateless/current-projection authority. PK-4 citationRef remains current-projection identity. PK-X2 remains page-oriented navigation.

## 2. Selected seam

D2-4 selects current-authority re-materialization rather than inventing durable citation identity.

For old-revision READ/COMPARE:

```text
exact committed old revision
+ current PK settlement authority
+ current PK citation/provenance authority
→ derive current compatible visible public-reference surface
→ exact semantic compatibility with stored revision surface required
→ body inspection eligible or withheld
```

The old revision is never rewritten in place.

## 3. Settlement compatibility

For an assertion stored with `referenceState = S_old`, current PK-1/PK-2 authority must independently derive `S_now` for the same stored semantic assertion material under the current authority scope.

First D2-4 rule:

```text
S_now == S_old
→ settlement surface may remain compatible

S_now != S_old
→ old revision requires semantic rewrite
→ D2-3 body withheld
```

Stored settlement state cannot authorize itself.

## 4. Citation compatibility

PK-4 `citationRef` is explicitly current-projection-only and is not promoted to durable identity.

D2-4 therefore does not exact-join old `citationRef` to a future context merely by string reuse.

For old-revision inspection, current PK-4 authority must re-derive an eligible citation bundle for the exact stored assertion semantics and current support context. The resulting visible citation semantic records/relationships must be canonically equal to the stored revision-visible citation surface for the old revision to render AS-IS.

Compatibility includes bounded visible semantics such as:

```text
sourceLabel
recordLabel?
locatorLabel?
publishedAtLabel?
trustedHref? only as retained visible/navigation semantic metadata
assertion relationship role
```

Render-local footnote numbers are excluded.

If current authority would require a different citation role, different visible source record, missing citation, or newly required citation to represent the assertion safely:

```text
BODY_WITHHELD_REWRITE_REQUIRED / citation-surface incompatibility
```

The revision body is not patched.

## 5. No stable citation identity side effect

D2-4 does not create:

```text
PersistentCitationRegistry
StableBibliographicCitationId
cross-turn citation alias resolver
citation history database
```

A future requirement to address one source record durably across revisions must open a separate stable-citation-identity design before authorization.

## 6. Restore integration

`RESTORE_AS_NEW_REVISION` consumes old revision semantic material only as a seed.

It must discard old authority-owned fields including:

```text
referenceState
settlement basis/result
claimSupportRef
sourceAuthorityRef
citationRef authority
allowedRoles
current citation authorization
```

Then current PK-1/PK-2/PK-4 authorities derive a new complete current candidate.

D2-3 still requires the source revision to be currently inspectable before it can be used as a PK-D2 restore source.

D2-2 then governs whole-page restore footprint, no-op, expectedRevision, and atomic commit.

## 7. Compare integration

Semantic comparison remains permitted only when both exact revision bodies are independently inspection-eligible under one coherent current authority epoch.

The compare surface includes stored committed public-reference/citation visible semantics only after both sides pass D2-4 compatibility.

No diff may infer citation continuity from equal `citationRef`, URL, label, or source name.

## 8. Search integration

PK-X2 remains page-level:

```text
query
→ visible pageIdentity hit
→ user selects
→ resolve current head at open time
→ current support/use revalidation
→ current page
```

A search hit does not pin the revision that happened to be head when search ran.

D2-4 does not authorize:

```text
historical revision full-text search
citation-text search across revisions
settlement-state search across revisions
search snippets from old revision bodies
revisionRef ranking
```

Target-level discoverability remains weaker than article/revision semantic availability.

## 9. Current-head unavailable behavior

A page may remain a currently discoverable PK-X2 address while its current revision body is unavailable downstream. Search must not fall back to an older inspectable revision.

```text
visible search hit
+ current head body unavailable
→ current page unavailable state
→ no old-revision fallback
```

## 10. Authority ordering

First-scope integration order:

```text
exact page / revision ownership
→ current lifetime / target identity
→ current source support / Exposure
→ current settlement derivation
→ current citation/provenance derivation
→ D2-4 exact stored-surface compatibility
→ D2-3 read/compare eligibility
```

Restore then enters current candidate validation and D2-2 commit safety.

## 11. C7 firewall

Requirement:

```text
show old revision with its old settlement/citations even when current authority no longer endorses that exact old surface
```

is PK-D3 / C7, not D2-4.

## 12. Concurrent-main watch

Observed during D2-4 start:

```text
D2-3 merge = 1140474d...
current main = 63f87ba2...
intervening merge = Agent Skill O4-A retrospective benchmark foundation
semantic overlap with PK-D2 settlement/citation/search = NONE
classification = WATCH · MAIN_ADVANCED_DURING_D2_4_TRANSACTION · NON_BLOCKING
```

## 13. Expected changed paths

Impact transaction: this document only.

Future D2-4 design transaction: one D2-4 design document only.

Runtime/product/release paths: zero.

## 14. Next decision

If this scope is accepted, D2-4 detailed design must freeze:

- exact current settlement compatibility gate,
- exact citation re-materialization/visible-surface equality rules,
- restore current rebind behavior,
- compare integration,
- PK-X2 current-head navigation behavior,
- stable-citation-identity escalation trigger,
- C7 firewall.

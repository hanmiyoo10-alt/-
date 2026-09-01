# Repository Common Rule C12 Promotion Review — Independent Object Backing Ownership — 2026-09-02

Status: **HOLD · NO PROMOTION · SHARED GUARDRAIL ONLY · POLICY/DOCS ONLY · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## Candidate reviewed

```text
LOGICALLY INDEPENDENT MUTABLE OBJECT
SHOULD NOT IMPLICITLY SHARE SOURCE-OWNED MUTABLE BACKING IDENTITY
```

Possible class if later promoted: `CONDITIONAL`.

## Summary verdict

Do **not** add `RCR-C12` to `docs/REPOSITORY_COMMON_RULES.md` yet.

The underlying integrity principle is strong, but the current repository evidence does not justify a repository-wide constitutional rule at this time. The risk of over-generalization is material because legitimate designs may intentionally share immutable backing, use copy-on-write storage, transfer ownership, or represent a new revision of the same logical object.

Preserve the narrower guardrail instead:

```text
new independently mutable / persisted logical object
+ descriptor/reference that grants access to source-owned mutable backing
→ implicit sharing is unsafe
→ SHARE / TRANSFER / DETACH semantics must be explicit in the owning contract
```

This is **not** equivalent to:

```text
ALL COPIES MUST DEEP-CLONE ALL DATA
```

## 1. Primary source evidence — strong

PocketRisu Helper Mod preserves an adopted production invariant at:

```text
products/pocketrisu-helper-mod/docs/features/assets/conversion-detaches-lazy-manifest-ownership/INVARIANT.md
```

The source incident was a character↔module conversion that copied a lazy asset-manifest descriptor. The converted destination was logically independent but still referenced the source object's backing manifest, so editing the destination could rewrite the source owner's persisted assets.

The adopted repair requires materializing/copying the independently owned field and removing source backing identity before the destination becomes independently editable. Explicit validated shared ownership remains allowed.

This is high-quality concrete evidence for the narrow integrity guardrail.

## 2. Supporting same-product evidence — compatible but not independent promotion proof

PocketRisu also preserves:

```text
products/pocketrisu-helper-mod/docs/features/cache/shared-cache-copy-before-consumer-mutation/INVARIANT.md
```

There, multiple consumers received the same cached structured object reference. Consumer-local metadata mutation corrupted cross-consumer state. The adopted rule treats shared cached objects as immutable from the consumer perspective and creates a detached consumer-owned wrapper before local mutation.

This supports the broader ownership lesson:

```text
shared reusable identity
!=
consumer-local mutable ownership
```

However, both incidents remain inside the same product/domain family. They strengthen the guardrail but do not provide the same cross-project independent repetition that supported RCR-C10 and RCR-C11.

## 3. SimCore evidence — prospective only

SimCore Candidate C currently distinguishes:

```text
stable derived identity
from
revision / generation
```

and requires owner-scoped writes, support-at-use, explicit mutation policy, and explicit derived-object lifetime. It does not yet authorize a physical durable source store or copy/fork backing representation.

Therefore SimCore supplies a strong **future applicability case**, not an independent runtime incident proving that repository-wide backing-detachment policy is already needed.

Important future Candidate C question:

```text
Does this operation create:
A. the same logical object at a new revision?
B. a new independent logical object?
```

For case B, any mutable backing identity inherited from A must have an explicit ownership policy:

```text
SHARE
TRANSFER
DETACH
```

No policy should be inferred merely because an object copy happened to contain the descriptor/reference.

## 4. Registered-project conflict review — PASS, but promotion value remains insufficient

The current registered catalog was re-read for:

```text
plugin:devpass
plugin:simcore
plugin:termux-large-doc-editor
plugin:usage-dashboard
plugin:voyage-token-check
product:pocketrisu-helper-mod
```

No registered project guideline requires accidental mutable-backing aliasing between independently mutable objects.

No direct policy conflict was found.

However, absence of conflict is not sufficient reason to add another repository-wide rule. The common layer is intentionally small and should not become a generic programming-practices handbook.

## 5. Why immediate promotion is unsafe

### 5.1 Same object, new revision is a valid counterexample

```text
OBJECT A rev7
→ OBJECT A rev8
```

may intentionally retain the same durable object identity/storage lineage while changing revision state.

Treating every new in-memory representation or revision as a new backing owner would be wrong.

### 5.2 Shared immutable backing is valid

Two logical objects may safely reference the same immutable blob/content-addressed payload when neither has mutation authority over that payload.

The candidate must therefore target **mutable backing authority**, not reference reuse generally.

### 5.3 Copy-on-write is valid

A design may intentionally share backing until the first mutation, then detach. That is compatible with the integrity goal even though initial physical backing is shared.

### 5.4 Explicit shared ownership may be valid

Some domains intentionally model jointly owned mutable state. If shared mutation authority is explicit, bounded, and validated, the common layer should not prohibit it by default.

### 5.5 Deep-copy mandates are harmful

A broad wording could be misread as requiring deep cloning of large immutable assets, vectors, media, or caches. The PocketRisu cache invariant explicitly rejects such unnecessary cloning.

## 6. Relationship to existing common rules

Existing rules already provide partial coverage:

```text
RCR-H02  preserve owning authority
RCR-D11  choose the narrowest capable semantic owner/effect surface
RCR-D12  map state/data/effect flow before multi-layer mutation
RCR-D13  validate contracts across boundaries
RCR-C10  incomplete/projected views do not gain destructive omission authority
RCR-C11  late effects require current operation authority
```

None fully states the mutable-backing aliasing rule, so the candidate is not redundant.

But because independent cross-project evidence is still weak and the counterexample surface is broad, the correct current disposition is a shared guardrail rather than repository constitutional promotion.

## 7. Selected shared guardrail

Carry forward this wording in relevant designs/reviews:

```text
When an operation creates a new independently mutable or independently persisted logical object, any descriptor/reference that carries source-owned mutable backing identity must have an explicit ownership disposition before the new object becomes editable:

SHARE    = shared mutable ownership is intentional and validated
TRANSFER = ownership moves under an explicit transfer contract
DETACH   = the new object receives independent backing / copy-on-write ownership

Implicit inheritance is not ownership proof.
```

The owning project chooses physical storage, copy-on-write strategy, descriptor shape, migration semantics, and validation mechanism.

## 8. Promotion re-open conditions

Re-open this candidate for `RCR-C12` promotion only when at least one of the following occurs:

1. a second independent registered project encounters or formally prevents the same mutable-backing aliasing failure;
2. SimCore Candidate C activates a real durable copy/fork/clone workflow and independently requires the same rule;
3. another cross-project shared subsystem demonstrates that logical independence and mutable-backing ownership must be separated;
4. a reviewed common validator needs a repository-wide ownership classification (`SHARE / TRANSFER / DETACH`) to protect multiple scopes.

At re-open, repeat registered-project conflict review and preserve all valid counterexamples above.

## 9. Current disposition

```text
RCR-C12 = NOT CREATED
PROMOTION = HOLD
SHARED GUARDRAIL = KEEP
SIMCORE CANDIDATE C INPUT = YES, FUTURE-ONLY
RUNTIME / STORAGE / RELEASE AUTHORITY = NONE
```

No change to `docs/REPOSITORY_COMMON_RULES.md` is authorized by this review.

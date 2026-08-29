# SimCore v0.68 candidate — Community parent/local alias root-cause evidence

Date: 2026-08-29 KST

Status: **ROOT CAUSE PROVEN · COMMUNITY OWNER · STRUCTURE JUDGE CORRECT · NARROW FIX DESIGN AUTHORIZED, IMPLEMENTATION NOT AUTHORIZED**

Classification: **QUALITY / COMMUNITY CLASSIFIER · SOURCE-BACKED FIX CANDIDATE · NO RUNTIME CHANGE**

## 1. Trigger family

Existing live evidence:

- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_WATCH_2026-08-28.md`
- `docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_RECURRENCE_2026-08-28.md`
- `docs/SIMCORE_POST_06600_DEFERRED_WATCH_TRIAGE_2026-08-29.md`

Repeated visible specimen:

```text
[더쿠 / 스퀘어]
[맘스홀릭 / 예비맘·육아 수다방]
[에펨코리아 / 포텐터진 게시판]
```

Repeated diagnostic result:

```text
알 수 없는 플랫폼
recognized groups = 여초, 남초
required distinct groups = 3
```

The recurrence was previously preserved as WATCH because the responsible owner was not proven.

## 2. Exact v0.67 production source audit

Authority audited:

```text
release-simcore
version 0.67.0
commit 01a4204981191968ba22ba6ad161c1053d6bc7d0
blob 24c57d86b3533a89e675c5b598b0c4a3a4fef6fe
```

The physical `community` module owns platform-family/group taxonomy.

Exact-family rules include:

```text
네이버 카페 -> 학부모/지역
맘카페     -> 학부모/지역
더쿠       -> 여초
에펨코리아 -> 남초
```

There is no exact `맘스홀릭` entry.

After exact-family matching fails, `parentLocalAliasInfo(shown)` provides a deliberately narrow fallback.

Current critical shape:

```text
text = whole shown header
namePart = text split at / or |, first segment only

parent identity tests
→ namePart only

communitySignal
→ whole text

(parent identity && communitySignal)
→ alias-parent-local / 맘카페 / 학부모/지역
```

## 3. Exact failure mechanism

For:

```text
맘스홀릭 / 예비맘·육아 수다방
```

current parser derives:

```text
text     = 맘스홀릭 / 예비맘·육아 수다방
namePart = 맘스홀릭
```

The current parent-identity predicates all fail on `namePart`:

```text
regionalMom
→ requires ...맘 at end/boundary
→ `맘스홀릭` FAIL

regionalParentWord
→ requires complete 엄마/어머님/학부모-shaped compact name
→ FAIL

explicitParentWord
→ requires bounded 맘/엄마/어머님/학부모/육아맘 token
→ leading `맘` inside `맘스홀릭` is not bounded
→ FAIL

attachedMomCommunity
→ allows 맘 + known community suffix such as 모임/소통/수다/커뮤니티/게시판/etc.
→ `맘스홀릭` suffix `스홀릭` is not such a suffix
→ FAIL
```

Meanwhile the whole-header `communitySignal` passes because the descriptor contains `수다방`.

Therefore:

```text
parent identity = false
communitySignal = true
false && true
→ alias fallback returns null
→ platformInfo has no group
→ Structure reports unknown platform
→ group set contains only 여초 + 남초
→ three-family diversity warning
```

This reproduces the observed warning deterministically from exact source.

## 4. Ownership conclusion

```text
COMMUNITY_PLATFORM_FAMILY_DIVERSITY_RECURRENCE
root symptom         = PROVEN
root physical owner  = Community.platformInfo / parentLocalAliasInfo
Structure behavior   = CORRECT JUDGE
Reaction owner       = NOT ROOT CAUSE
Representation       = NOT ROOT CAUSE
Edit Reconcile       = NOT ROOT CAUSE
```

Structure is correctly reporting the classifier result it receives. The fix must not relax Structure's three-distinct-family requirement to hide the classifier miss.

## 5. Narrow repair boundary

The safe repair target is the parent/local alias fallback only.

Preferred directional rule:

```text
exact PLATFORM_FAMILIES remain first and authoritative

if exact matching fails:
  existing first-segment parent/local recognition remains
  + allow a separator-delimited descriptor segment to establish parent identity
    only when that same descriptor contains both:
      a strong parent/audience token
      and a community-shaped token

then return existing canonical alias:
  key    = 맘카페
  group  = 학부모/지역
  source = alias-parent-local
```

Target positive exemplar:

```text
맘스홀릭 / 예비맘·육아 수다방
→ 맘카페 / 학부모/지역 / alias-parent-local
```

Do not harden by weakening diversity requirements or treating any string containing `맘` as a parent community.

## 6. Required false-positive controls

The implementation design must include negative controls so the fallback does not become a broad substring classifier.

At minimum preserve unknown/non-parent behavior for lookalikes such as:

```text
맘스터치 / 자유게시판
게임홀릭 / 수다방
```

unless a separately proven exact-family rule exists.

Descriptor-derived parent classification must require a strong parent token and a community-shaped signal in a bounded descriptor context.

## 7. Classifier migration consequence

Current source declares:

```text
COMMUNITY_CLASSIFIER_VERSION = 2
```

Session already contains bounded `migrateCommunityClassifierIfNeeded` logic that:

- scans bounded recent assistant history;
- recognizes `alias-parent-local` sections;
- reconstructs reaction maxima for the canonical platform key;
- updates `state.community.classifierVersion`;
- normalizes the existing platformMax map.

Therefore a classifier-semantic change should use:

```text
COMMUNITY_CLASSIFIER_VERSION 2 -> 3
```

and reuse the existing bounded migration path rather than inventing a new persistent schema or repair mechanism.

This is required because a platform previously ignored as unknown may become a recognized `맘카페` family and should receive bounded recent-history maxima reconstruction rather than start with a false zero floor.

## 8. Promotion decision

The old posture was:

```text
WATCH
RECURRENCE PROVEN
ROOT OWNER UNRESOLVED
```

Exact v0.67 source now supports:

```text
COMMUNITY_PARENT_LOCAL_ALIAS_DESCRIPTOR_BOUNDARY_GAP
= FIX CANDIDATE
= ROOT CAUSE PROVEN
= OWNER COMMUNITY
= STRUCTURE CONTRACT UNCHANGED
= NARROW REPAIR CONTRACT AVAILABLE
```

This is sufficient to select a next-version design.

It does not authorize implementation while v0.67 terminal live-state convergence remains incomplete.

## 9. Separation from other deferred items

Do not combine this fix with:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
MANUAL_EDIT_REBUILT latency optimization
B_START closure-expression warning
PRE_SIMCORE cache/history work
provider-cache work
R2.6 activation/status convergence
architecture mega-refactors
```

Those retain their own evidence and promotion gates.

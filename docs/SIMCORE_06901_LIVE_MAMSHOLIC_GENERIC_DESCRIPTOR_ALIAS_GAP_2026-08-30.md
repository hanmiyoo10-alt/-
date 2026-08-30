# SimCore v0.69.1 Live Evidence — MamsHolic Generic-Descriptor Alias Gap

Date: 2026-08-30 KST

Status: **LIVE EVIDENCE PRESERVED · ROOT OWNER SOURCE-PROVEN · FIX CANDIDATE · SEPARATE FROM v0.70.0**

Classification: **COMMUNITY / PLATFORM FAMILY CLASSIFICATION / BOUNDED EXACT-ALIAS GAP**

## 1. Natural live specimen

Production runtime: `v0.69.1`

Current natural Mode C output included:

```text
[맘스홀릭 / 자유게시판]
```

The corresponding diagnostic reported:

```text
Warnings: 2
- COMMUNITY 1-1: 알 수 없는 플랫폼
- COMMUNITY 1: 플랫폼 그룹 2개 (필요 서로 다른 3개; 감지: SNS, 여초)
```

The user additionally observed that equivalent outputs using `네이버 카페` do not produce this warning family.

## 2. Exact production-source explanation

Current exact `release-simcore` v0.69.1 classifier has first-authority exact families including:

```js
{ key: '네이버 카페', group: '학부모/지역', re: /^네이버\s*카페/i },
{ key: '맘카페', group: '학부모/지역', re: /^맘\s*카페|^맘카페/i },
```

Therefore a header beginning with `네이버 카페` immediately receives group `학부모/지역` before fallback alias classification.

`맘스홀릭` is not an exact family.

The bounded parent/local alias fallback requires a parent/local identity signal plus a community-shaped signal. Current relevant predicates include:

```js
regionalMom
regionalParentWord
explicitParentWord
attachedMomCommunity
descriptorParentCommunity
```

and descriptor parent evidence is intentionally bounded to tokens such as:

```text
예비맘 / 육아맘 / 엄마 / 어머님 / 학부모 / bounded 맘
```

while community-shaped evidence includes:

```text
모여라 / 모임 / 카페 / 소통 / 수다 / 커뮤니티 / 게시판 / 자유게시판 / 정보방 / 사랑방 / 놀이터 / 라운지 / 톡 / 방
```

For:

```text
맘스홀릭 / 자유게시판
```

`자유게시판` supplies only the community-shaped half. It contains no bounded parent/audience token. The name `맘스홀릭` also does not satisfy the intentionally narrow current name predicates. The fallback therefore returns `null`, making Structure truthfully report an unknown platform and then only two detected groups.

For:

```text
네이버 카페 / 자유게시판
```

the exact family match succeeds first, so no equivalent unknown-platform warning is expected.

## 3. Relationship to v0.68.0

v0.68.0 intentionally repaired a narrower descriptor-boundary case such as:

```text
맘스홀릭 / 예비맘·육아 수다방
```

where one bounded descriptor supplies both parent/audience evidence and community-shaped evidence.

The negative-control philosophy explicitly rejected broad substring matching such as generic `includes('맘')` because names like unrelated brands could false-positive.

The new natural specimen does not show a regression in that repair. It exposes a different remaining coverage boundary:

```text
known parent-community brand name
+
generic descriptor only
```

## 4. Root-cause classification

```text
COMMUNITY_MAMSHOLIC_GENERIC_DESCRIPTOR_ALIAS_GAP
= FIX CANDIDATE
= ROOT OWNER SOURCE-PROVEN
= OWNER COMMUNITY
= STRUCTURE JUDGE CORRECT
= REACTION CONTRACT UNCHANGED
= v0.68 REGRESSION NO
= RELEASE BLOCKER NO
```

Structure is behaving correctly given the classifier result. The gap belongs to Community family/alias recognition, not Structure group-count semantics.

## 5. Safest bounded repair shape if later authorized

Do **not** broaden the generic `맘` predicate.

The safest repair candidate is exact branded recognition for the known platform name, for example an exact/anchored `맘스홀릭` family or exact alias before the generic fallback. This would classify:

```text
맘스홀릭
맘스홀릭 / 자유게시판
```

as canonical:

```text
key = 맘카페
family/group = 학부모/지역
```

while preserving negative controls such as unrelated names containing `맘` or `홀릭`.

Any implementation must add positive and negative fixtures and preserve exact-family precedence.

## 6. Version/scope separation

The currently frozen v0.70.0 `Current Task Primacy Guard` is a Prompt-contract quality mini for `PARTIAL_PREVIOUS_TURN_REPLAY`.

This Community classifier issue is a separate semantic owner and must not be mixed into that implementation transaction.

Disposition:

```text
PRESERVE NOW = YES
FOLD INTO v0.70.0 = NO
IMPLEMENT NOW = NO
NEXT COMMUNITY MINI CANDIDATE = YES, AFTER SEPARATE AUTHORIZATION
```

# SimCore v0.70.7 Live Evidence — MamsHolic Baby Alias Recurrence

Date: 2026-09-05 KST
Status: **FIX CANDIDATE · RECURRENCE · SEPARATE COMMUNITY OWNER**
Classification: **COMMUNITY PLATFORM FAMILY CLASSIFICATION · EXACT/BRAND ALIAS COVERAGE**
Tracking: `#1546`

## 1. Natural recurrence

Repeated Mode-C outputs for the same request naturally produced platform headers including:

```text
[맘스홀릭베이비 / 방송·연예 수다방]
```

and:

```text
[맘스홀릭베이비 / 자유게시판]
```

The corresponding diagnostics reported:

```text
Warnings = 2
COMMUNITY 1-x = 알 수 없는 플랫폼
COMMUNITY 1 = 플랫폼 그룹 2개 (필요 서로 다른 3개; 감지: 여초, 남초)
```

A later regeneration of the same request used:

```text
더쿠
에펨코리아
X
```

and reported:

```text
Warnings = 0
```

This provides a natural same-request negative control.

## 2. Relationship to prior evidence

Earlier production evidence already source-proved the bounded gap for:

```text
맘스홀릭 / 자유게시판
```

with root owner:

```text
COMMUNITY classifier / alias recognition
```

and explicitly classified Structure as correct given the classifier result.

The current packet expands the recurrence family to the branded form:

```text
맘스홀릭베이비
```

## 3. Repair boundary remains unchanged

Do not repair this through broad substring matching such as unrestricted `includes('맘')`.

Any future Community mini should prefer bounded exact/anchored brand recognition with positive and negative fixtures and preserve exact-family precedence.

## 4. Scope separation

This issue is independent of v0.70.7 output-storage attribution.

```text
storage timing causality = NONE
Structure group-count semantics = unchanged
Reaction contract = unchanged
runtime storage backend = unrelated
```

## 5. Disposition

```text
COMMUNITY_MAMSHOLIC_BRAND_ALIAS_GAP = FIX CANDIDATE
RECURRENCE = CONFIRMED
NEW BRAND FORM = 맘스홀릭베이비
STRUCTURE_JUDGE = CORRECT GIVEN CLASSIFIER RESULT
V07007_STORAGE_LIVE_GATE_BLOCKER_BY_ITSELF = NO
SEPARATE_COMMUNITY_MINI_CANDIDATE = YES
```

No runtime or `release-simcore` mutation is made by this evidence record.
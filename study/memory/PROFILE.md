# Learner Profile Memory

비교적 안정적이고 장기적으로 재사용할 가치가 있는 **학습자 특성의 현재 권위 문서**입니다.

이 문서에는 충분히 확인된 정보만 둡니다. 일회성 관찰이나 아직 검증되지 않은 추측은 `INBOX.md` 또는 `LEDGER.md`에 남깁니다.

## Memory states

```text
CURRENT
REVIEW_REQUIRED
SUPERSEDED
UNRESOLVED
```

## Entry schema

```text
Memory ID:
Scope:
Statement:
State:
Confidence: LOW | MEDIUM | HIGH
First observed:
Last confirmed:
Evidence refs:
Useful for:
Freshness trigger:
Superseded by:
Notes:
```

## Promotion standard

다음 중 하나 이상의 근거가 있어야 합니다.

- 사용자가 현재 사실로 명시적으로 확인함
- 서로 다른 시점에서 같은 패턴이 반복됨
- 실제 학습 결과가 해당 특성을 반복적으로 지지함

성격 일반화보다 **공부에 직접 쓰이는 좁은 표현**을 우선합니다.

좋은 예:

```text
문제 유형을 패턴으로 분류한 뒤 푸는 접근이 특정 과목에서 반복적으로 효과적이었다.
```

피할 예:

```text
원래 머리가 이런 타입이다.
```

## Current memories

### P-001 — 패턴 분류형 접근의 높은 재사용성

```text
Memory ID: P-001
Scope: 전반적 문제풀이 / 새로운 시험 적응
Statement: 문제나 출제 구조를 패턴으로 분류하고 규칙을 찾아가는 접근이 여러 과목에서 반복적으로 효과적이었던 경험이 있다.
State: CURRENT
Confidence: HIGH
First observed: 2026-06
Last confirmed: 2026-09-07
Evidence refs: E-2026-09-07-001
Useful for: 새로운 시험 입문, 오답 분류, 공부 순서 설계, 문제풀이 루틴 설계
Freshness trigger: 패턴 분류식 접근이 여러 번 실제 성과로 이어지지 않거나 다른 접근이 더 안정적으로 우세해질 때 재검토.
Superseded by: NONE
Notes: '패턴을 잘 찾는 사람' 같은 성격 일반화로 확대하지 않는다. 실제 공부 전략에 필요한 범위에서만 사용한다.
```

### P-002 — 표현 변환/의미 동치 판별을 명시적으로 점검할 필요

```text
Memory ID: P-002
Scope: 국어·영어·PSAT 등 언어 기반 문제풀이
Statement: 같은 의미가 다른 단어·표현으로 바뀌어 제시될 때 대응 관계를 찾는 부분이 병목이 될 수 있으므로, 의미 동치와 재진술 여부를 명시적으로 확인하는 지원이 유용하다.
State: CURRENT
Confidence: MEDIUM
First observed: 2026-06
Last confirmed: 2026-09-07
Evidence refs: E-2026-09-07-002
Useful for: 언어논리 선지 분석, 지문-선지 대응, 영어 독해, 오답 원인 분류
Freshness trigger: 실제 오답 분석에서 이 유형이 거의 나타나지 않거나 다른 병목이 더 일관되게 확인될 때 재검토.
Superseded by: NONE
Notes: 능력에 대한 고정 평가가 아니라 현재 관찰된 학습 병목 후보로만 취급한다.
```

### P-003 — 키워드 단서 기반 연상 회상의 강점

```text
Memory ID: P-003
Scope: 암기형 이론 과목, 특히 역사·정보처리기사 이론
Statement: 핵심 키워드를 단서로 주변 개념·관련 항목·대조 개념을 묶어 회상하는 방식이 잘 맞는다. 문제의 정답어에서 가지를 뻗고, 모르는 항목을 물음표로 남겨 채워 가는 방식이 실제 필기 노트에서도 확인되며 사용자가 역사와 키워드 중심 학습에 강하다고 직접 확인함.
State: CURRENT
Confidence: HIGH
First observed: 2026-09-09
Last confirmed: 2026-09-09
Evidence refs: 2026-09-09 handwritten theory notes, direct user confirmation
Useful for: 역사, 정보처리기사 이론, 용어 암기, 유사 개념 구분, 빈칸 회상, 문제 기반 개념 확장
Freshness trigger: 키워드 중심 회상이 실제 문제에서 자주 오답을 유발하거나 문맥·적용 문제로의 전이가 약한 경우 보완 전략을 추가한다.
Superseded by: NONE
Notes: 긴 설명을 그대로 암기시키기보다 `키워드 → 관련 개념 → 혼동 개념 → 판별 신호` 구조로 지원한다. 키워드가 바뀌어 제시되는 재진술 문제에는 P-002의 의미 동치 훈련을 함께 적용한다.
```

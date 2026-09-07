# Study Memory Ledger

시간축을 가진 학습 관찰을 보존하는 **append-only evidence memory**입니다.

`PROFILE.md`의 안정적 특성이나 `STRATEGIES.md`의 현재 전략을 직접 결정하지 않습니다. 이 문서는 그 판단에 사용할 수 있는 관찰 근거를 남깁니다.

## 기록 원칙

```text
관찰 발생
→ 가능한 한 구체적으로 기록
→ 필요하면 후속 관찰 추가
→ 나중에 해석이 바뀌어도 원 기록은 삭제하지 않음
```

한 번의 좋은/나쁜 결과만으로 일반적인 학습 성향을 확정하지 않습니다.

## 상태

```text
OBSERVED
HYPOTHESIS
CONFIRMED_PATTERN
DISMISSED
REGRESSION_CONTROL
```

- `OBSERVED`: 실제로 관찰된 결과
- `HYPOTHESIS`: 관찰에서 나온 설명 가설
- `CONFIRMED_PATTERN`: 반복 관찰로 패턴성이 충분히 확인됨
- `DISMISSED`: 후속 근거로 초기 해석이 기각됨
- `REGRESSION_CONTROL`: 앞으로도 유지되는지 확인할 가치가 있는 좋은 패턴/성과

## Entry schema

```text
Entry ID:
Date:
Subject / scope:
Status:
Observation:
Context:
Result:
Interpretation:
Confidence:
Related memory IDs:
Follow-up trigger:
Resolution / later evidence:
```

## Entries

### E-2026-09-07-001 — 패턴 분류 접근의 반복 효과

```text
Entry ID: E-2026-09-07-001
Date: 2026-09-07
Subject / scope: 여러 과목에 걸친 학습 방식
Status: CONFIRMED_PATTERN
Observation: 사용자는 문제나 출제의 패턴을 체크하고 분류하기 시작했을 때 역사, 수학, 영어 등 서로 다른 과목에서 학습 성과가 좋아졌던 경험을 보고했다.
Context: 과거 학습 경험을 바탕으로 PSAT 공부법을 논의하는 과정.
Result: 패턴 인식/분류가 한 과목에만 국한되지 않고 반복적으로 유효했던 것으로 보고됨.
Interpretation: 새로운 과목에서도 무작정 반복하기보다 문제 구조와 유형을 먼저 분류하는 접근이 높은 재사용 가치를 가질 가능성이 큼.
Confidence: HIGH
Related memory IDs: P-001, S-PSAT-001
Follow-up trigger: PSAT 문제풀이에서 패턴 분류가 실제 정확도/속도 개선으로 이어지는지 관찰.
Resolution / later evidence: 현재 확인된 반복 패턴으로 유지.
```

### E-2026-09-07-002 — 표현이 달라진 동일 의미 판별의 어려움

```text
Entry ID: E-2026-09-07-002
Date: 2026-09-07
Subject / scope: 언어 기반 문제풀이
Status: OBSERVED
Observation: 사용자는 같은 의미를 다른 단어나 표현으로 바꾸어 제시했을 때 대응 관계를 찾는 부분이 어렵다고 직접 설명했다.
Context: 국어/영어 경험과 PSAT 언어논리 접근을 연결해 논의하는 과정.
Result: 단순 어휘 암기보다 의미 보존 여부, 표현 변환, 동치관계 판별이 병목 후보로 드러남.
Interpretation: 언어논리에서 선지와 지문 사이의 표현 변환을 명시적으로 추적하는 훈련이 중요할 수 있음.
Confidence: MEDIUM
Related memory IDs: P-002, S-PSAT-002
Follow-up trigger: 실제 PSAT 오답에서 동의표현/재진술/범주변환 때문에 틀리는 사례가 반복되는지 확인.
Resolution / later evidence: 추가 문제풀이 근거 필요.
```

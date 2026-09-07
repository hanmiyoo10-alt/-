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

아직 등록된 관찰이 없습니다.

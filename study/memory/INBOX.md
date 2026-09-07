# Memory Inbox

장기기억으로 확정하기 전의 **후보 기억**을 보관합니다.

이 문서는 `PROFILE.md`나 `STRATEGIES.md`보다 낮은 신뢰 단계입니다. 여기에 적힌 내용은 현재 사실로 단정하지 않습니다.

## 상태

```text
CANDIDATE
NEEDS_REPEAT
READY_TO_PROMOTE
REJECTED
```

- `CANDIDATE`: 첫 관찰 또는 사용자 발언이 있어 보존할 가치가 있음
- `NEEDS_REPEAT`: 중요하지만 반복 관찰이나 추가 확인이 필요함
- `READY_TO_PROMOTE`: durable memory로 옮길 근거가 충분함
- `REJECTED`: 장기기억으로 쓰지 않기로 결정됨. 이유를 남기고 삭제하지 않음

## 후보 기억 스키마

```text
ID:
Date:
Scope:
Candidate:
Status:
Why it may matter:
Evidence / source note:
What would confirm it:
Promotion target: PROFILE | STRATEGIES | NONE
Resolution:
```

## Entries

### C-001 — 독학 선호가 PSAT 밖에서도 안정적인가

```text
ID: C-001
Date: 2026-09-07
Scope: 전반적 공부 방식
Candidate: 강의 중심보다 직접 교재/문제를 다루며 규칙을 찾는 독학 방식을 일반적으로 더 선호할 가능성이 있다.
Status: NEEDS_REPEAT
Why it may matter: 향후 교재, 강의, 튜터링 방식 추천에 큰 영향을 줄 수 있다.
Evidence / source note: 현재 PSAT에서는 별도 강의를 들을 계획이 없다고 명시했으나, 이를 모든 과목의 안정적 선호로 일반화할 근거는 아직 부족하다.
What would confirm it: 다른 과목에서도 반복적으로 독학을 기본 경로로 선택하거나, 강의보다 직접 문제풀이가 더 잘 맞는다고 명시적으로 확인함.
Promotion target: PROFILE
Resolution: 미확정. PSAT 전략 자체는 S-PSAT-003에 별도로 기록함.
```

### C-002 — 의미 변환 병목의 범위

```text
ID: C-002
Date: 2026-09-07
Scope: 언어 기반 시험 전반
Candidate: 표현이 바뀌어도 동일한 의미인지 추적하는 과정이 국어·영어·PSAT 전반에서 반복되는 핵심 오답 원인일 수 있다.
Status: NEEDS_REPEAT
Why it may matter: 사실이라면 어휘량보다 재진술/동치/범위 변화 추적 훈련을 우선해야 한다.
Evidence / source note: 사용자의 직접 설명과 과거 언어 과목 경험은 있으나, 실제 PSAT 오답 표본은 아직 없음.
What would confirm it: PSAT 문제풀이에서 같은 종류의 오답이 독립적으로 여러 번 관찰됨.
Promotion target: PROFILE
Resolution: 좁은 현재 지원 원칙은 P-002로 기록했지만, '핵심 오답 원인'이라는 강한 일반화는 보류함.
```

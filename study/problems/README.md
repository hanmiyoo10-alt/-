# Problem & Error Memory

`study/problems/`는 **풀었던 문제, 풀이 판단, 오답 원인, 재발 패턴**을 시간축으로 보존하는 공부용 문제 기억 시스템입니다.

`study/memory/`가 학습자 특성과 공부 전략을 기억한다면, 이 폴더는 **문제 단위의 실제 증거**를 기억합니다.

## 핵심 흐름

```text
문제 풀이
→ 풀이 판단 기록
→ 정오 및 오류 원인 확인
→ LEDGER에 문제 단위 기록
→ 같은 오류가 반복되는지 관찰
→ 충분히 반복되면 PATTERNS로 승격
→ REVIEW_QUEUE에서 재검증
→ 안정적으로 교정되면 패턴 상태 갱신
```

중요:

```text
한 번 틀림 != 약점 확정
한 번 맞음 != 완전 습득
오답 개수 != 오답 원인
문제 원문 저장 != 문제 기억
```

## Authority map

| 질문 | 권위 문서 |
| --- | --- |
| 특정 문제에서 실제로 무슨 일이 있었나? | `LEDGER.md` |
| 반복되는 오류/성공 패턴은 무엇인가? | `PATTERNS.md` |
| 무엇을 다시 풀거나 확인해야 하나? | `REVIEW_QUEUE.md` |
| 문제 기억 시스템의 규칙은 무엇인가? | `README.md` |

## 문제 기록 최소 단위

각 문제는 가능한 한 다음을 남깁니다.

```text
Problem ID
Date
Subject / area
Source ref
Result
User interpretation / approach
Correct reasoning summary
Error type
Why the error happened
Next-time cue
Related pattern IDs
Review state
```

`Source ref`는 책/자료명, 회차, 문항 번호처럼 **문제를 다시 찾을 수 있는 식별 정보**를 우선합니다.

## 저작권 경계

문제 원문이나 해설 원문을 장기 저장소에 통째로 복사하지 않습니다.

대신 다음처럼 저장합니다.

```text
출처 / 문항 번호
+ 문제의 핵심 요구를 자기 말로 요약
+ 사용자의 풀이/해석
+ 정답 판단에 필요한 핵심 논리
+ 오류 패턴
```

사용자가 직접 작성한 풀이와 요약은 필요 범위에서 보존할 수 있습니다.

## Error taxonomy v1

처음부터 지나치게 세분화하지 않습니다. 우선 다음 범주만 사용합니다.

```text
READING_RESTATE       같은 의미의 다른 표현을 연결하지 못함
SCOPE_SHIFT           범위·조건·대상의 확대/축소를 놓침
LOGIC_RELATION        필요/충분, 인과, 조건, 대립 등 관계를 잘못 읽음
QUESTION_DEMAND       문제가 실제로 요구하는 판단을 놓침
EVIDENCE_MISS         지문/자료에 있는 근거를 놓침
OVER_INFERENCE        근거보다 강하게 추론함
CALC_PROCESS          계산·절차에서 오류 발생
KNOWLEDGE_GAP         필요한 개념/사실 자체가 부족함
TIME_PRESSURE         시간 압박이 판단 오류에 직접 기여함
CARELESS              알고 있었지만 표기·선택·확인 과정에서 실수함
UNRESOLVED            아직 원인을 추측 없이 분류할 수 없음
```

새 범주는 실제 반복 사례가 기존 분류로 계속 설명되지 않을 때만 추가합니다.

## Pattern promotion rule

`PATTERNS.md`로 승격하려면 원칙적으로 다음 중 하나 이상이 필요합니다.

1. 서로 다른 문제에서 같은 오류 구조가 반복되었다.
2. 같은 문제를 재검토해도 동일한 판단 병목이 재현되었다.
3. 교정 cue를 적용했을 때 성과 변화가 확인되었다.
4. 학습 전략을 바꿀 정도로 중요한 오류 구조임이 확인되었다.

불확실하면 `LEDGER.md`에만 남깁니다.

## 상태 관계

```text
LEDGER
= 문제 단위 역사, append-oriented

PATTERNS
= 반복 구조에 대한 현재 해석

REVIEW_QUEUE
= 앞으로 다시 확인할 작업 목록
```

패턴 해석이 나중에 틀린 것으로 밝혀져도 과거 문제 기록은 삭제하지 않습니다.

## v1 목표

첫 실제 PSAT 문제부터 이 시스템을 사용합니다. 문제 수를 많이 저장하는 것이 목표가 아니라, **같은 실수를 더 빨리 알아차리고 다음 문제에서 교정 cue를 재사용하는 것**이 목표입니다.

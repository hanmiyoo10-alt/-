# Study Strategy Memory

현재와 과거의 공부 전략, 그리고 전략이 왜 바뀌었는지를 보존합니다.

전략은 학습자 프로필과 다릅니다.

```text
PROFILE
= 비교적 안정적인 학습 특성

STRATEGIES
= 특정 목표/과목/시점에서 채택한 공부 방법과 의사결정
```

## Strategy states

```text
EXPERIMENTAL
ACTIVE
PAUSED
SUPERSEDED
RETIRED
UNRESOLVED
```

## Entry schema

```text
Strategy ID:
Scope:
Strategy:
State:
Started:
Last reviewed:
Rationale:
Evidence refs:
Success criteria:
Failure / review trigger:
Supersedes:
Superseded by:
Notes:
```

## Supersession rule

새 전략이 기존 전략을 대체하면 기존 기록을 삭제하거나 조용히 고치지 않습니다.

```text
old strategy
→ SUPERSEDED
→ Superseded by = <new strategy ID>

new strategy
→ ACTIVE 또는 EXPERIMENTAL
→ Supersedes = <old strategy ID>
```

이렇게 해야 나중에 “왜 이 공부법을 버렸지?”를 재구성할 수 있습니다.

## Current strategies

### S-PSAT-001 — 패턴 분류 우선 접근

```text
Strategy ID: S-PSAT-001
Scope: PSAT 전반, 특히 새로운 문제 유형 적응
Strategy: 문제를 많이 푸는 것 자체보다 먼저 문제 구조, 요구되는 판단, 반복되는 함정과 선지 패턴을 분류한다. 오답도 정답 암기가 아니라 어떤 패턴을 놓쳤는지 기록한다.
State: ACTIVE
Started: 2026-06
Last reviewed: 2026-09-07
Rationale: 여러 과목에서 패턴을 파악한 뒤 성과가 개선된 경험이 반복적으로 보고됨.
Evidence refs: P-001, E-2026-09-07-001
Success criteria: 새로운 문제를 볼 때 기존 패턴에 연결해 설명할 수 있고, 같은 원인의 오답 반복이 감소한다.
Failure / review trigger: 분류 작업이 지나치게 느리거나 실제 정확도/속도 개선과 연결되지 않는 경우 단순화 또는 다른 전략과 비교한다.
Supersedes: NONE
Superseded by: NONE
Notes: 패턴 이름을 예쁘게 만드는 것보다 '다음 문제에서 실제로 판별에 쓸 수 있는가'를 우선한다.
```

### S-PSAT-002 — 먼저 해석하고 O/X 검증받기

```text
Strategy ID: S-PSAT-002
Scope: PSAT 언어논리 및 독해형 문제
Strategy: 해설을 먼저 읽기보다 사용자가 지문/선지의 의미와 논리를 직접 해석한 뒤, 그 해석이 맞는지 O/X 또는 짧은 교정으로 검증한다. 특히 같은 의미의 다른 표현, 재진술, 범위 변화가 있는지 확인한다.
State: ACTIVE
Started: 2026-06
Last reviewed: 2026-09-07
Rationale: 수동적으로 해설을 받아들이기보다 본인 해석의 정확성을 확인하는 방식이 의미 변환 병목을 직접 드러낼 수 있음.
Evidence refs: P-002, E-2026-09-07-002
Success criteria: 틀린 해석의 유형을 스스로 설명할 수 있고, 비슷한 재진술을 다음 문제에서 더 빠르게 판별한다.
Failure / review trigger: O/X 판정만 받고 이유를 복원하지 못하거나, 실제 문제풀이 전이가 약한 경우 검증 형식을 조정한다.
Supersedes: NONE
Superseded by: NONE
Notes: 가능하면 판정 뒤에 '어느 표현이 무엇으로 바뀌었는지'를 한 줄로 남긴다.
```

### S-PSAT-003 — 교재 중심 독학을 기본 경로로 사용

```text
Strategy ID: S-PSAT-003
Scope: PSAT 준비 방식
Strategy: 현재는 별도 강의를 기본 전제로 두지 않고, 교재와 직접 문제풀이를 중심으로 공부한다. 필요가 확인될 때만 특정 약점에 한해 외부 설명 자료를 보조적으로 사용한다.
State: ACTIVE
Started: 2026-06
Last reviewed: 2026-09-07
Rationale: 사용자가 PSAT 준비에서 강의를 따로 들을 계획은 없다고 명시함.
Evidence refs: direct user plan
Success criteria: 교재만으로도 문제 구조 파악, 오답 복원, 진도 유지가 가능하다.
Failure / review trigger: 특정 영역에서 독학으로 개념 복구가 반복적으로 막히거나 시간 비용이 과도해질 때 강의/설명 자료 사용 여부를 재검토한다.
Supersedes: NONE
Superseded by: NONE
Notes: '강의를 절대 듣지 않는다'가 아니라 현재 기본 경로가 독학이라는 뜻이다.
```

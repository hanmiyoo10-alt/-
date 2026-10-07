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


### S-MIDTERM-001 — 1회독 이후 시험형 모의고사 무한 반복

```text
Strategy ID: S-MIDTERM-001
Scope: 2026-2 중간고사 / 영상편집실습 제외 전 과목
Strategy: 각 과목은 시험범위 1회독까지 PPT/PDF를 중심으로 개념 이해와 전체 범위 연결을 우선한다. 강의 녹음과 영상은 1회독 기본 소스에서 제외하고, 1회독 완료 뒤 전체범위 모의고사 반복 단계부터 PPT/PDF와 함께 출제 근거에 포함한다. 1회독 완료 뒤부터는 단순 재독을 기본 경로로 사용하지 않고 실제 시험 형식에 맞춘 새 모의고사 파일을 생성한다. 모든 모의고사는 매 회차 해당 과목의 중간고사 전체 시험범위를 누적 출제한다. 사용자가 모의고사를 전부 푼 뒤 채점·오답 확인을 하고, 정답과 근거가 분리된 해설지를 공부한다. 이후 같은 절차를 새 문제로 반복한다.
State: ACTIVE
Started: 2026-10-07
Last reviewed: 2026-10-07
Rationale: 사용자가 중간고사 1회독 이후의 반복 학습 방식을 명시적으로 확정했다. 시험 직전 학습은 수동 재독보다 시험형 인출과 오답 복구를 반복하는 데 초점을 둔다.
Evidence refs: E-2026-10-07-001, E-2026-10-07-002, E-2026-10-07-003, E-2026-10-07-004
Success criteria: 각 회차에서 실제 시험 형식으로 범위 전체를 인출하고, 오답/불확실 영역이 다음 회차에서 재검증되며, 반복할수록 정확도와 근거 설명 능력이 개선된다.
Failure / review trigger: 실제 시험 형식과 모의고사 형식이 맞지 않거나, 특정 범위가 반복적으로 누락되거나, 문제 반복으로 정답을 외워 맞히는 비율이 높아질 경우 문항 구성 규칙을 수정한다.
Supersedes: NONE
Superseded by: NONE
Notes: 영상편집실습은 이 전략에서 제외하고 실기 완성 및 독립 수행 능력으로 관리한다. 문제지와 해설지는 분리하며, 풀이 전에 해설/정답을 노출하지 않는다. 1회독의 기본 소스는 PPT/PDF이고, 2회독 이후 모의고사 출제 근거는 PPT/PDF + 강의 녹음 + 영상이다. 모든 회차는 전체 시험범위를 빠짐없이 다루며, 이전 모의고사 오답 이력은 전체 범위를 축소하는 근거가 아니라 문항 수·변형·난이도·재검증 강도를 조절하는 데만 사용한다.
Exam format profile:
- AI 수학 입문 = 문제풀이형
- 미디어 리터러시 = 단답형 + 서술형
- AI 중심세상 = 객관식 + 서술형 (예정, 잠정)
- AI 프로그래밍입문 = 객관식 + 서술형 + 손코딩 가능성 (잠정)
- 디자인과 시각문화 = 서술형 + 단답형
- 커뮤니케이션이론 = UNKNOWN

```

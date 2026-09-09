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

### S-IP-001 — 문제 씨앗형 이론 가지치기

```text
Strategy ID: S-IP-001
Scope: 정보처리기사 필기 이론 학습
Strategy: 기출문제 하나를 씨앗으로 삼아 정답 핵심 개념을 먼저 적고, 보기·유사개념·연관개념을 주변 가지로 확장한다. 아직 모르는 항목은 억지로 채우지 않고 `?`로 남겨 회상/보충 대상으로 만든다. 긴 문장 정리보다 키워드, 관계, 차이, 판별 신호를 중심으로 적는다.
State: ACTIVE
Started: 2026-09-09
Last reviewed: 2026-09-09
Rationale: 사용자가 실제 필기 노트에서 클래스/GoF/파이프-필터/애자일/프로토타입/XP/응집도/상태 다이어그램/NUI/UML/코드 오류/SOLID/FEP 등 문제별 핵심 개념에서 주변 개념으로 직접 가지를 뻗고, 모르는 부분을 물음표로 표시하는 방식으로 공부하고 있음.
Evidence refs: 2026-09-09 uploaded study-note photos
Success criteria: 문제의 핵심 단서를 보면 답과 인접 개념이 빠르게 떠오르고, `?`로 남긴 항목이 반복 복습에서 줄어든다. 유사 개념을 한 줄 판별 신호로 구분할 수 있다.
Failure / review trigger: 한 문제에서 가지가 너무 많이 뻗어 진도가 급격히 느려지거나, 연관지식은 늘지만 실제 문제 정답률/회상 속도가 개선되지 않는 경우 가지 범위를 제한한다.
Supersedes: NONE
Superseded by: NONE
Notes: 각 가지의 끝에는 가능하면 `판별 신호 1줄`을 붙인다. 하 난이도 문제는 깊은 백과사전식 확장보다 정답 신호와 가장 가까운 혼동개념 1~3개만 우선한다.
```

### S-IP-002 — 회차별 난이도 층 분리 학습

```text
Strategy ID: S-IP-002
Scope: 정보처리기사 기출 이론 학습 진도 운영
Strategy: 각 회차를 과목별로 돌되 난이도 층을 섞지 않는다. 먼저 전 회차의 `하` 문제를 회차별·과목별로 공부하고, 하 층을 모두 끝낸 뒤 같은 순서로 `중` 문제를 학습한다. `상` 문제는 현재 목표상 선택 사항이며 중 난이도 연결 상태를 점검하는 진단용으로 사용한다. 하루 기본 진도는 약 1회차이며, 그날 하 난이도를 공부 중이라면 해당 회차의 하 난이도를 끝내는 시점을 하루 마감점으로 둔다.
State: ACTIVE
Started: 2026-09-09
Last reviewed: 2026-09-09
Rationale: 사용자의 1차 목표가 이론/실기연계 구분 없이 하·중 난이도 전부 정답이며, 키워드 단서 기반 학습은 난이도 층을 분리할수록 개념망을 과도하게 복잡하게 만들지 않고 빠르게 넓히기 좋음.
Evidence refs: direct user plan, P-003, S-IP-001
Success criteria: 하루 진도 기준이 흔들리지 않고, 전 회차 하 난이도에서 즉답률이 안정된 뒤 중 난이도로 넘어가며, 중 난이도 오답의 원인을 적용/비교/추적 수준으로 구체화할 수 있다.
Failure / review trigger: 전 회차 하를 도는 동안 앞 회차 하 개념이 과도하게 소실되거나, 하 층 완료에 너무 오래 걸려 중 난이도 진입이 지연되는 경우 짧은 누적 복습을 추가한다.
Supersedes: NONE
Superseded by: NONE
Notes: 하 학습 중에는 중/상을 억지로 파고들지 않는다. 다만 하 문제의 필기에 자연스럽게 연결되는 핵심 혼동개념은 1~3개까지 허용한다. 하루 종료 전 이전 회차 취약 키워드를 5~10분 정도 재인식하는 짧은 복습은 층 분리 원칙을 깨지 않는 보조 루틴으로 사용 가능하다.
```

### S-IP-003 — 손필기 우선, AI는 검증·출제·기록 담당

```text
Strategy ID: S-IP-003
Scope: 정보처리기사 이론 학습에서 AI와 사용자 역할 분담
Strategy: 이론 개념망과 가지치기 노트는 사용자가 직접 손으로 작성한다. AI는 사용자의 필기를 대신 정리하거나 다시 필기본처럼 재작성하는 역할보다, 필기 후 사진을 바탕으로 개념 오류·누락·잘못 연결된 관계를 점검하고, 남겨둔 `?`를 채우며, 유사개념 판별 신호를 보완하고, 시험 문장형·변형표현형 퀴즈를 출제해 키워드 매칭을 검증한다. 학습 결과와 오답 패턴은 저장소에 기록한다.
State: ACTIVE
Started: 2026-09-09
Last reviewed: 2026-09-09
Rationale: 사용자가 직접 적는 과정이 편하고 실제 학습 방식의 핵심이며, 장문의 AI 요약을 다시 베끼는 것은 중복 작업이 될 가능성이 높음.
Evidence refs: direct user preference, 2026-09-09 uploaded handwritten notes
Success criteria: 사용자는 필기 주도권을 유지하면서도 잘못된 개념 연결을 빠르게 교정하고, 필기 직후 문장 단서를 보고 핵심 키워드를 안정적으로 맞힐 수 있다.
Failure / review trigger: 사진 판독이 불확실하거나 필기 검증에 시간이 과도하게 걸리는 경우 사용자가 `?` 또는 확인 원하는 번호만 지정하는 방식으로 축소한다.
Supersedes: NONE
Superseded by: NONE
Notes: AI 출력은 원칙적으로 `틀린 것/빠진 것/헷갈릴 것/문제화할 것` 중심으로 짧게 제공한다. 사용자가 원하지 않는 한 완성형 노트를 대신 작성하지 않는다.
```

### S-GEN-001 — 하·중 완전정복, 상 선택

```text
Strategy ID: S-GEN-001
Scope: 전반적 시험/이론/문제풀이 학습
Strategy: 난이도를 하·중·상으로 나누어 운영할 수 있는 공부에서는 `하`와 `중`을 기본 정복 범위로 삼고, `상`은 시험 목표·시간·효율에 따라 선택한다. 하 난이도는 실수나 암기 누수 없이 거의 자동으로 맞히는 수준을 목표로 하고, 중 난이도는 개념 비교·적용·추적을 스스로 재현해 안정적으로 맞히는 수준까지 학습한다. 상 난이도는 필수점수 확보 뒤 남는 시간과 필요성에 따라 진단 또는 추가점수 용도로 사용한다.
State: ACTIVE
Started: 2026-09-09
Last reviewed: 2026-09-09
Rationale: 사용자가 정보처리기사뿐 아니라 향후 다른 공부에서도 `하·중 전부 맞히기 / 상 선택` 원칙을 공통적으로 적용할 계획이라고 명시함.
Evidence refs: direct user statement
Success criteria: 과목이 달라도 하·중 범위를 우선 안정화해 기본점수와 실전 정확도를 확보하고, 상 난이도 투자 때문에 하·중 정답률이 흔들리지 않는다.
Failure / review trigger: 특정 시험에서 상 난이도 비중이 지나치게 높거나, 하·중만으로 목표 점수에 구조적으로 도달할 수 없는 경우 시험별 목표선을 조정한다.
Supersedes: NONE
Superseded by: NONE
Notes: 시험마다 난이도 분포와 배점 구조는 다르므로 `상 선택`은 절대 규칙이 아니라 기본 전략이다. 합격/목표 점수에 상 난이도가 필수인 시험에서는 별도 조정한다.
```

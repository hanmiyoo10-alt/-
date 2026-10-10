# Current Study Memory Snapshot

Status: `SNAPSHOT_READY`
As of: `2026-10-07`

이 문서는 새 대화/세션이 공부 맥락을 빠르게 재구성하기 위한 **current-only projection**입니다.

중요:

```text
CURRENT.md
!= 원본 장기기억
!= 학습 관찰 원장
!= 전략 결정 권위
```

충돌 시 항상 owning authority가 우선합니다.

## Snapshot health

```text
SNAPSHOT_STATE = SNAPSHOT_READY
PROFILE_SOURCE = study/memory/PROFILE.md
STRATEGY_SOURCE = study/memory/STRATEGIES.md
EVIDENCE_SOURCE = study/memory/LEDGER.md
CANDIDATE_SOURCE = study/memory/INBOX.md
PROBLEM_EVIDENCE_SOURCE = study/problems/LEDGER.md
PROBLEM_PATTERN_SOURCE = study/problems/PATTERNS.md
REVIEW_QUEUE_SOURCE = study/problems/REVIEW_QUEUE.md
MIDTERM_PROGRESS_SOURCE = study/logs/2026-10-07-midterm-dashboard.md
```

## Active goals

- 2026-2 중간고사를 우선 준비한다.
- AI 수학 입문은 6주차까지, 영상편집실습을 제외한 다른 중간고사 이론/필기 과목은 7주차까지 1회독을 완결한다.
- 영상편집실습은 필기 회독이 아니라 실제 시험 조건에서 독립적으로 작품을 완성할 수 있는지를 기준으로 준비한다.
- 영상편집실습 제외 과목은 1회독 이후 실제 시험 형식의 모의고사 반복 학습으로 전환한다.

## Active subjects

```text
AI_MATH = ACTIVE
AI_PROGRAMMING = ACTIVE
AI_CENTERED_WORLD = ACTIVE
MEDIA_LITERACY = ACTIVE
COMMUNICATION_THEORY = ACTIVE
DESIGN_AND_VISUAL_CULTURE = ACTIVE
VIDEO_EDITING_PRACTICUM = ACTIVE
PSAT = BACKGROUND
```

## Current midterm coverage

- AI 수학 입문: 6주차까지
- AI 프로그래밍입문: 7주차까지
- AI 중심세상: 7주차까지
- 미디어 리터러시: 7주차까지
- 커뮤니케이션이론: 7주차까지
- 디자인과 시각문화: 7주차까지
- 영상편집실습: 실기

세부 진도와 아직 미확정인 주차별 커버리지는 `study/logs/2026-10-07-midterm-dashboard.md`가 소유합니다.

- MEDIA_LITERACY_CHECKPOINT = 온라인 저널리즘 정리 완료 / 해당 구간 문제 미풀이

## Active midterm strategy

### S-MIDTERM-001 — 1회독 이후 시험형 모의고사 무한 반복

```text
각 과목 시험범위 1회독
→ 1회독은 PPT/PDF 중심으로 완료
→ 2회독부터 PPT/PDF + 강의 녹음 + 영상으로 실제 시험 형식의 전체범위 누적 모의고사 문제 파일 생성
→ 사용자 전체 풀이
→ 채점 / 오답·불확실 영역 분류
→ 별도 해설지 파일 생성
→ 사용자 해설지 학습
→ 이전 오답 영역의 다음 회차 출제 가중치 상향
→ 새 문제로 다음 모의고사
→ 반복
```

운영 규칙:

- 영상편집실습은 이 루프에서 제외한다.
- 문제지와 해설지는 분리한다.
- 사용자가 다 풀기 전에는 정답/해설을 노출하지 않는다.
- 1회독은 PPT/PDF 중심으로 진행한다.
- 2회독 이후 모의고사 출제 근거는 PPT/PDF + 강의 녹음 + 영상이다.
- 모든 모의고사는 매 회차 해당 과목의 중간고사 전체 시험범위를 포함한다.
- 오답/불확실 영역은 전체 범위를 유지한 상태에서 문항 수·변형·난이도·재검증 강도만 높인다.
- 실제 시험 형식 정보가 확인되면 문항 유형, 문항 수, 배점 구조를 가능한 한 맞춘다.
- 같은 문제 암기보다 새 문항에서의 전이를 확인한다.


## Current exam format profile

- AI 수학 입문: 문제풀이형
- 미디어 리터러시: 단답형 + 서술형
- AI 중심세상: 객관식 + 서술형 **예정**
- AI 프로그래밍입문: 객관식 + 서술형, **손코딩 가능성 있음**
- 디자인과 시각문화: 서술형 + 단답형
- 커뮤니케이션이론: `UNKNOWN`
- 영상편집실습: 실기

'예정'과 '가능성 있음'은 잠정 상태로 유지하고 실제 시험 공지/교수 언급이 확인되면 확정한다.

## High-value learner patterns

### P-001
문제나 출제 구조를 **패턴으로 분류하고 규칙을 찾는 접근**이 여러 과목에서 반복적으로 효과적이었던 경험이 있다.

### P-002
언어 기반 문제에서는 **같은 의미가 다른 표현으로 바뀌는 과정**을 명시적으로 확인해 주는 것이 유용할 수 있다. 현재는 MEDIUM confidence이며 실제 문제 오답으로 계속 검증한다.

## First-pass operating pattern

`FIRST_PASS_MICROCYCLE = PDF/PPT 작은 개념 → 이해/자기식 압축 정리 → 2~3개 안팎 짧은 확인문제 → 교정 → 다음 개념`

확인문제는 시험형 모의고사가 아니라 방금 배운 내용을 즉시 점검하는 용도다. 핵심어 회상, O/X·판별, 개념 간 차이/관계 확인을 우선한다.

## Current watch items

- 각 과목 1회독을 실제 시험범위 끝까지 완료했는지 자료 존재와 구분해 판단한다.
- 첫 모의고사 전에 실제 시험 형식 정보가 PPT/PDF/녹음/공지 중 어디에 있는지 확인한다.
- 매 모의고사가 전체 시험범위를 빠짐없이 누적 커버하는지 확인한다.
- 오답을 그대로 재출제하기보다 새 문항에서 같은 개념의 전이 여부를 확인한다.
- 영상편집실습은 기능 체크리스트보다 독립 제작 성공 여부를 우선한다.

## Immediate next study action

현재 과목별 상세 우선순위는 `study/logs/2026-10-07-midterm-dashboard.md`를 따른다.

공통 전환 조건:

```text
과목 1회독 미완료
→ 범위 완결 우선

과목 1회독 완료
→ S-MIDTERM-001 모의고사 반복 루프로 즉시 전환

영상편집실습
→ 실전 제작 / 독립 수행 검증
```

## Snapshot states

```text
SNAPSHOT_READY
SNAPSHOT_STALE
SNAPSHOT_BLOCKED
SNAPSHOT_REBUILD_REQUIRED
EMPTY_BOOTSTRAP
```

- `SNAPSHOT_READY`: 원본 기억과 현재 투영이 동기화됨
- `SNAPSHOT_STALE`: 원본이 바뀌었지만 아직 동기화되지 않음
- `SNAPSHOT_BLOCKED`: 원본 권위가 충돌하거나 현재 사실을 추측 없이 정할 수 없음
- `SNAPSHOT_REBUILD_REQUIRED`: 기억 구조 자체의 개편이 필요함
- `EMPTY_BOOTSTRAP`: 시스템은 준비됐지만 승격된 장기기억이 아직 없음

## Update discipline

```text
1. owning memory가 먼저 변경됨
2. 근거/상태를 확인함
3. CURRENT.md를 동기화함
```

`CURRENT.md`의 문구만 바꾼 뒤 그것을 근거로 원본 장기기억을 변경하는 것은 금지합니다.

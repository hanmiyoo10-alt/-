# Current Study Memory Snapshot

Status: `SNAPSHOT_READY`
As of: `2026-09-10`

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
```

## Active goals

- PSAT에 맞는 문제풀이 체계를 만들고, 문제를 단순 반복하기보다 유형·판단 구조·오답 패턴을 축적한다.
- 실제 교재/문제풀이가 시작되면 본인 해석을 먼저 만든 뒤 O/X 검증을 통해 해석 오류의 종류를 잡는다.
- 개별 문제의 실수와 반복되는 약점을 분리해서 기록하고, 다른 문제로 교정이 전이되는지 확인한다.
- After Effects 기초 조작을 익혀 50초~1분 10초 분량의 가로형 타이포그래피 기반 모션그래픽 중간고사 작품을 완성한다.
- 오늘은 확보한 오징어게임 인트로 모션 로고 레퍼런스의 0~3초 구간부터 역설계하고 After Effects에서 따라 만든다.

## Active subjects

```text
PSAT = ACTIVE
AFTER_EFFECTS = ACTIVE
```

현재 스냅샷은 다른 과목을 비활성이라고 단정하지 않는다. 장기기억 시스템에 현재 활성으로 확인된 범위만 투영한다.

## High-value learner patterns

### P-001
문제나 출제 구조를 **패턴으로 분류하고 규칙을 찾는 접근**이 여러 과목에서 반복적으로 효과적이었던 경험이 있다.

### P-002
언어 기반 문제에서는 **같은 의미가 다른 표현으로 바뀌는 과정**을 명시적으로 확인해 주는 것이 유용할 수 있다. 현재는 MEDIUM confidence이며 실제 PSAT 오답으로 계속 검증한다.

## Active strategies

### S-PSAT-001 — 패턴 분류 우선

```text
문제 풀이
→ 문제 구조 / 요구 판단 확인
→ 함정·선지 패턴 분류
→ 오답 원인을 패턴 단위로 기록
→ 다음 문제에서 재사용
```

### S-PSAT-002 — 사용자 해석 먼저, O/X 검증

```text
지문/선지 직접 해석
→ O/X 판정
→ 틀렸다면 바뀐 표현 / 범위 / 논리관계 확인
→ 같은 오류가 반복되는지 추적
```

### S-PSAT-003 — 현재 기본 경로는 교재 중심 독학

별도 강의를 기본 전제로 두지 않는다. 독학으로 특정 영역이 반복적으로 막힐 때만 보조 설명 수단을 재검토한다.

## Current After Effects state

- 영어 UI 전환 완료.
- Composition과 Shape Layer 생성 실습 완료.
- Position / Scale / Opacity 키프레임 실습 완료.
- Easy Ease와 Graph Editor / Speed Graph 실습 완료.
- 중간고사 주제 후보는 `집 가고 싶다`이며 아직 최종 확정은 아니다.
- 기준 레퍼런스 파일을 확인했다: `Squid Game - Intro motion logo - English version (1080p).mp4`.
- Drive 정리 경로: `학교_전공공부 → 01_과목자료 → 영상편집실습`.
- 레퍼런스는 1920x1080, 30fps, 약 18.09초다.
- 전체 흐름은 검은 배경 위 기하학적 요소 조립 → 한글 로고 완성/분해 → 영어 SQUID GAME 로고 조립/완성 → 페이드 아웃 구조다.
- 오늘의 즉시 목표는 0~3초 첫 조립 구간을 Shape Layer와 기본 Transform 키프레임으로 재현하는 것이다.
- 상세 기록: `study/logs/2026-09-10-after-effects-basics.md`

## Problem-memory operating rule

```text
개별 문제 1회
→ study/problems/LEDGER.md

같은 오류 구조 반복
→ study/problems/PATTERNS.md

재풀이/전이 확인 필요
→ study/problems/REVIEW_QUEUE.md

학습자 특성이나 전략으로 일반화할 만큼 충분한 근거
→ study/memory/LEDGER.md
→ PROFILE.md 또는 STRATEGIES.md 검토
```

한 문제를 틀렸다는 이유만으로 `PROFILE.md`에 약점으로 기록하지 않는다.

## Current watch items

- 실제 PSAT 오답에서 `재진술 / 동의표현 / 범위 변화 / 의미 동치` 문제가 반복되는지 확인한다.
- 패턴 분류가 지나치게 세분화되어 문제풀이 속도를 잡아먹지 않는지 확인한다.
- PSAT에서의 독학 선호를 전반적인 학습 성향으로 성급하게 일반화하지 않는다.
- 같은 문제를 외워서 맞힌 것을 교정 성공으로 오판하지 않고, 다른 문제로 전이되는지 확인한다.
- After Effects 과제 작업 중 키프레임이 보이는 증빙용 작업 화면을 중간중간 캡처한다.
- 레퍼런스 영상은 한 번에 전체를 흉내 내기보다 짧은 구간을 선택해 텍스트/도형/배경과 Transform 요소를 분해한 뒤 재현한다.

## Immediate next memory action

### After Effects

```text
1. 기준 MP4를 AE 프로젝트에 import한다.
2. 1920x1080 / 30fps 컴포지션을 기준 영상에 맞춘다.
3. 0~3초 구간을 재생하며 도형 요소와 등장 순서를 분해한다.
4. Shape Layer로 원/삼각형/사각형/선 요소를 만든다.
5. Position / Scale / Opacity 중심으로 키프레임을 잡는다.
6. 필요한 경우 Rotation을 추가한다.
7. Easy Ease / Speed Graph로 원본 속도감에 맞춘다.
8. 원본과 비교하면서 첫 구간을 완성한다.
9. 이후 Text Layer / Text Animator를 익히고 “집 가고 싶다” 과제 콘티로 전이한다.
```

### PSAT

실제 PSAT 교재나 문제를 다루기 시작하면 다음 순서를 사용한다.

```text
1. 사용자가 먼저 문제/선지를 해석한다.
2. 해석을 O/X로 검증한다.
3. 틀렸거나 근거가 불안정하면 문제 단위 기록을 problems/LEDGER에 남긴다.
4. 오류 원인을 READING_RESTATE / SCOPE_SHIFT / LOGIC_RELATION 등 가장 좁은 범주로 분류한다.
5. 같은 구조가 다른 문제에서 반복되면 problems/PATTERNS로 승격한다.
6. 필요하면 REVIEW_QUEUE에 RETRY 또는 TRANSFER_CHECK를 등록한다.
7. 충분한 문제 증거가 누적된 경우에만 PROFILE 또는 STRATEGIES를 갱신한다.
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

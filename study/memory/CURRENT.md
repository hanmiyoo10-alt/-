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
- **2026-09-10 즉시 목표:** 교수 수업의 오늘 목표에 맞춰 AE 기본 조작 흐름에 익숙해진다. 기본 도형 생성 → 중앙 정렬/Anchor Point → Position / Scale / Rotation / Opacity → 키프레임 시작·끝점 → 키프레임 간격으로 속도 조절을 반복 연습하고, 오징어게임 로고는 이 기본기를 적용하는 응용 예제로 사용한다.

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
- Rotation은 아직 별도 반복 연습이 남아 있다.
- 중간고사 주제 후보는 `집 가고 싶다`이며 아직 최종 확정은 아니다.
- 기준 레퍼런스 파일: `Squid Game - Intro motion logo - English version (1080p).mp4`.
- Drive 정리 경로: `학교_전공공부 → 01_과목자료 → 영상편집실습`.
- 수업 녹음/전사: `음성 260910_091822.m4a`, `음성 260910_091822_original.txt`.
- 녹음에서 교수는 약 09:29에 처음 다루는 학생 기준의 기본 습득을 오늘 목표로 설명하고, 기본 도형 연습 뒤 오징어게임 로고 형태로 확장할 계획을 말한다.
- 약 16:31에는 기초 모션 네 가지로 Position / Scale / Rotation / Opacity를 제시하고 하나씩 연습한다고 설명한다.
- 약 21:41에는 움직임에 최소 두 개 이상의 키프레임이 필요하다고 설명하고, 약 22:23부터 키프레임 간격으로 속도를 조절하는 원리를 다룬다.
- 따라서 오늘의 학습 성공 기준은 오징어게임 영상을 완성하는 것이 아니라, 위 기본 조작을 스스로 반복할 수 있을 정도로 익숙해지는 것이다.
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
- AE 초반에는 결과물 완성 속도보다 기본 조작을 반복해서 손에 익히는 것을 우선한다.

## Immediate next memory action

### After Effects

```text
1. Shape Layer로 정사각형/원/삼각형 같은 기본 도형을 다시 만든다.
2. Align과 Anchor Point 중앙 배치를 반복한다.
3. Position / Scale / Rotation / Opacity를 각각 단독으로 한 번씩 만든다.
4. 각 모션에서 시작/끝 키프레임을 직접 찍는다.
5. 키프레임 간격을 넓히고 좁혀 속도 변화가 어떻게 생기는지 확인한다.
6. Easy Ease / Speed Graph는 기본 키프레임 감각을 강화하는 보조 연습으로 사용한다.
7. 익숙해지면 오징어게임 레퍼런스의 짧은 구간을 응용 문제로 재현한다.
8. 이후 Text Layer / Text Animator와 “집 가고 싶다” 과제 콘티로 전이한다.
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

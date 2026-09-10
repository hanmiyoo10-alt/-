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
- 교수 흐름 재연습 기준으로 Position / Scale / Rotation / Opacity 네 기본 Transform을 모두 다시 한 번 확인 완료.
- Position 키프레임 간격을 넓혀 같은 이동을 더 느리게 만드는 속도 변화를 실제 화면에서 재확인했다.
- Rotation 재연습에서 처음에는 `90x+0°`로 입력해 90회전이 걸렸고, 두 번째 화면 녹화에서 `0x+90°`로 수정해 사각형이 90도 회전하는 것을 확인했다. 다음 Rotation 작업에서는 `x`(회전 횟수)와 `°`(추가 각도) 필드를 구분한다.
- Opacity 재연습에서는 0초 `100%`, 1초 `0%` 두 키프레임을 만들어 사각형이 사라지는 페이드 아웃을 화면 녹화로 재확인했다.
- `Toggle Hold Keyframe` 재생 확인 완료. 일반 Opacity 보간처럼 서서히 희미해지지 않고 앞 값을 유지하다 다음 키프레임에서 즉시 사라지는 차이를 화면 녹화로 확인했다.
- Easy Ease와 Graph Editor / Speed Graph 실습 완료.
- 대용량 화면 녹화 원본을 별도 rclone 경로로 확보해 실제 프레임을 검토했고, 한 Shape Layer의 Position / Scale / Rotation / Opacity 네 Layer Transform 모두 같은 짧은 구간에서 애니메이션 키프레임으로 함께 구성된 상태를 확인했다. 따라서 **P/S/R/T 자유 조합 단계는 검증 완료**로 본다.
- 위 검증의 범위는 원본 바이트 일치와 P/S/R/T 조합 구간의 실제 프레임 확인이며, 전체 4분 45초 녹화를 프레임 단위로 전수 검토했다는 뜻은 아니다.
- 중간고사 주제 후보는 `집 가고 싶다`이며 아직 최종 확정은 아니다.
- 기준 레퍼런스 파일: `Squid Game - Intro motion logo - English version (1080p).mp4`.
- Drive 정리 경로: `학교_전공공부 → 01_과목자료 → 영상편집실습`.
- 기존 수업 녹음/전사: `음성 260910_091822.m4a`, `음성 260910_091822_original.txt`.
- 추가 수업 녹음/전사: `영상편집실습.m4a`, `영상편집실습_original.txt`. 추가 녹음은 약 75분이며 자동 전사는 오탈자가 있어 타임코드/작업 순서 복원용 보조 근거로만 사용한다.
- 추가 전사에서 약 06:03에 Rotation 단축키 `R`, 약 07:28에 음수 회전 방향, 약 07:55~08:29에 Anchor Point가 회전 기준이라는 설명, 약 09:56에 Opacity, 약 13:09에 Hold keyframe, 약 18:01에 0~20초 자유 Transform 연습, 약 44:44에 24초 부근 원위치 복귀 작업이 이어진다.
- 따라서 지금 바로 다음 교수 흐름은 **조합 모션의 키프레임 간격을 바꿔 속도 차이를 다시 확인한 뒤, 24초 부근 원위치 복귀/Opacity 처리 또는 오징어게임 레퍼런스 응용으로 넘어가는 단계**다.
- 상세 기록: `study/logs/2026-09-10-after-effects-basics.md`
- 대용량 영상 검증 기록: `study/logs/2026-09-10-after-effects-media-verification.md`

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
- Rotation 입력에서는 `90x`와 `90°`를 혼동하지 않는지 한 번 더 확인한다.
- P/S/R/T 조합이 한 번 검증됐더라도, 별도 안내 없이 다시 구성할 수 있는지는 다음 독립 실습에서 확인한다.

## Immediate next memory action

### After Effects

```text
1. 현재 만든 P/S/R/T 조합에서 키프레임 간격을 직접 바꿔 같은 조합 모션의 속도 차이를 다시 확인한다.
2. 필요하면 키프레임 복사/붙여넣기로 Opacity 깜빡임을 한 번 만든다.
3. 교수 예제의 24초 부근 원위치 복귀/Opacity 처리 흐름을 따라간다.
4. 이후 오징어게임 레퍼런스를 장면 단위로 분해해 기본 Transform을 응용한다.
5. 익숙해진 뒤 Text Layer / Text Animator와 “집 가고 싶다” 과제 콘티로 전이한다.
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

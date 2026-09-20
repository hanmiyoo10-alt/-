# 2026-09-10 After Effects 학습 마감 정리

Date: 2026-09-10
Scope: 영상편집실습 / After Effects 기초
Status: `SESSION_CLOSED_WITH_NEXT_STEP`

## 오늘의 핵심 목표

After Effects 기본 조작을 기능 이름만 아는 수준이 아니라, 직접 키프레임을 만들고 재생해서 변화와 속도를 확인할 수 있는 수준까지 반복한다. 오징어게임 인트로 레퍼런스는 기본기가 자리 잡은 뒤 응용 대상으로 사용한다.

## 오늘 실제로 확인한 것

### 기본 환경과 구조

- After Effects UI를 영어로 전환했다.
- Composition을 만들고 Shape Layer 사각형을 생성했다.
- Align으로 화면 중앙 정렬을 사용했다.
- Anchor Point가 Transform과 Rotation의 기준점이라는 개념을 확인했다.

### P / S / R / T 기본 Transform

- `P` Position: 두 키프레임으로 위치 이동을 만들었다.
- `S` Scale: 키프레임 사이에서 크기 변화를 만들었다.
- `R` Rotation: 회전 애니메이션을 만들었다.
- `T` Opacity: 100% → 0% 변화로 페이드 아웃을 만들었다.
- `U`: 키프레임이 들어간 속성만 펼쳐 보는 데 사용했다.

### 타이밍과 보간

- 키프레임 간격을 넓히면 같은 값 변화가 더 느려진다는 것을 Position 단독과 P/S/R/T 조합 양쪽에서 재확인했다.
- Easy Ease를 적용했다.
- Graph Editor에서 Value Graph와 Speed Graph의 차이를 경험하고 Speed Graph로 속도감을 조절했다.
- Toggle Hold Keyframe을 적용해 점진적 보간 대신 다음 키프레임 시점에서 값이 즉시 바뀌는 동작을 확인했다.

### P/S/R/T 조합

- Position / Scale / Rotation / Opacity를 한 Shape Layer의 같은 짧은 구간에서 함께 애니메이션했다.
- 조합된 끝 키프레임들을 뒤로 옮겨 전체 모션이 느려지는 것을 다시 확인했다.

## 오늘 나온 중요한 실수와 교정

### Rectangle Tool 상태에서 이동 시도

오브젝트를 움직이려 했지만 Rectangle Tool이 활성화된 상태라 새 도형이 생성됐다. 이후 `V`로 Selection Tool로 바꾸고 기존 Shape Layer를 선택해 이동했다.

### Rotation `x`와 `°` 혼동

처음에는 `90x + 0°`를 입력해 90회전이 걸렸다. 이후 `0x + 90°`로 수정했다.

기억할 것:

```text
왼쪽 x = 회전 횟수
오른쪽 ° = 추가 각도
```

## 최신 24초 복귀 연습 상태

교수 수업 흐름의 24초 부근 원위치 복귀를 따라가기 위해 Composition Duration을 30초로 늘렸다.

최신 화면 증거 `화면 녹화 중 2026-09-10 163504.mp4`에서 확인된 상태:

```text
Composition Duration = 30초
24초 Opacity = 100% 키프레임 생성 확인
24초 Position ≈ 1577, 542
24초 Scale = 150%
24초 Rotation = 0x + 90°
```

따라서 **24초 원위치 복귀는 아직 완료가 아니다.** Position / Scale / Rotation을 정상값으로 되돌리는 키프레임이 더 필요하다.

또한 녹화 마지막 0초 상태는 약 다음처럼 보여 시작 상태도 다시 확인해야 한다.

```text
Position ≈ 1577, 542
Scale = 150%
Rotation = 0x + 90°
Opacity = 0%
```

이 상태는 `study/logs/2026-09-10-after-effects-24s-return-review.md`에 별도 검토 기록이 있다.

## 내일 시작점

내일은 새 기능부터 시작하지 않는다. 먼저 오늘 미완료 상태를 닫는다.

```text
1. 24초 플레이헤드 위치 확인
2. Position = 960, 540
3. Scale = 100%
4. Rotation = 0x + 0°
5. Opacity = 100%
6. 24초에 P/S/R/T 네 키프레임이 모두 생겼는지 확인
7. 0초 시작 상태가 정상인지 재확인
8. 재생해서 변형 후 24초에 원상복귀하는지 검증
```

이 검증이 끝난 뒤 필요하면 Opacity 깜빡임 복사/붙여넣기를 한 번 더 연습하고, 이후 오징어게임 레퍼런스 첫 구간으로 넘어간다.

## 다음 응용 목표

기본기 마감 후 기준 레퍼런스 `Squid Game - Intro motion logo - English version (1080p).mp4`를 장면 단위로 분해한다. 첫 응용은 0~3초 구간의 기하학 도형/선 모션을 P/S/R/T와 타이밍 조절로 재현하는 것이다.

중간고사 주제 후보 `집 가고 싶다`는 아직 최종 확정하지 않는다. Text Layer / Text Animator는 레퍼런스 응용 또는 기본 Transform 독립 재구성이 안정된 뒤 진행한다.

## 오늘 마감 판정

```text
P/S/R/T 단독 기본기 = VERIFIED
키프레임 간격과 속도 = VERIFIED
Easy Ease / Speed Graph = VERIFIED
Hold Keyframe = VERIFIED
P/S/R/T 조합 = VERIFIED
조합 모션 속도 변화 = VERIFIED
Composition 30초 확장 = VERIFIED
24초 Opacity 100% = VERIFIED
24초 전체 원위치 복귀 = INCOMPLETE
0초 시작 상태 정리 = RECHECK_REQUIRED
```

완료되지 않은 두 항목은 다음 세션으로 그대로 넘긴다.

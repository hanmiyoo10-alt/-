# 2026-09-10 After Effects 원위치 복귀 단계 확인

## 대상 영상

- `화면 녹화 중 2026-09-10 161051.mp4`
- Drive 크기: 251,546,071 bytes
- 로컬 디코딩 확인: 1918×1026, 30 fps, 약 238.94초

## 확인 결과

최신 화면 녹화에서 P/S/R/T 키프레임이 보이는 상태에서 시작 시점 키프레임들을 선택하고, `Go to Time` 대화상자를 이용해 타임 인디케이터를 뒤쪽으로 이동하는 작업을 확인했다.

다만 현재 Composition 길이는 화면상 `0:00:10:00`으로 확인되어, 교수 예제의 `24초 부근 원위치 복귀`를 그대로 적용할 수 없는 상태다. 실제 영상에서는 `Go to Time`에 `8`을 입력해 8초 지점으로 이동한 장면이 확인된다.

또한 0초 시점에 표시된 Layer Transform 값은 대략 다음 상태였다.

```text
Position ≈ 1577, 542
Scale = 150%, 150%
Rotation = 0x + 90°
Opacity = 0%
```

즉 현재 파일에서 `0초 키프레임`은 중립적인 원래 상태(예: 화면 중앙 / 100% / 0° / 100%)가 아니라 이미 변형된 상태다. 따라서 0초 키프레임을 뒤쪽에 복사해 붙이면 "처음의 변형 상태"로 복귀하는 것은 맞지만, 교수 예제에서 말하는 의미의 원래 도형 상태로 복귀한다고 단정하면 안 된다.

## 다음 확인 포인트

1. 이번 10초 연습에서는 8초를 복귀 지점으로 사용해도 된다.
2. 정말 원래 상태로 돌아오게 하려면 복귀 목표값을 먼저 명확히 정한다.
3. 예: Position 중앙, Scale 100%, Rotation 0°, Opacity 100%.
4. 이후 실제 교수 예제의 24초 흐름을 따라갈 때는 Composition Duration을 30초 이상으로 만든 뒤 동일 개념을 적용한다.

## 상태

```text
LATEST_VIDEO = VERIFIED
COMPOSITION_DURATION = 10_SECONDS
RETURN_POINT_USED_IN_VIDEO = 8_SECONDS
ZERO_SECOND_STATE = ALREADY_TRANSFORMED
TRUE_NEUTRAL_RETURN = NOT_YET_VERIFIED
```

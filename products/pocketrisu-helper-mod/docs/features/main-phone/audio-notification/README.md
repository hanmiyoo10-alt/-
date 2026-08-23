# 전화/이어폰/Discord 알림 무한소리

상태: **ACTIVE / 조사 중**

## 증상
메인폰에서 전화 수신/통화 종료, 이어폰 연결 상태, Discord 관련 상황에서 notification sound가 반복되는 사례.

## 우선 범위
1. 전화
2. 이어폰

## 담당
📱 메인폰

서버폰 Android notification 문제로 접근하지 않는다.

## 현재 구조
- 메인 relay 본체: `~/.local/share/pocketrisu-notify-relay/receiver.cjs`
- runit: `pocketrisu-notify-relay`
- relay는 `termux-notification`으로 고정 ID `8472` 알림을 갱신한다.
- 응답 완료 시 `--sound`를 붙이는 구조였다.

## 2026-08-24 확인 결과
1. 활성 boot 스크립트에는 현재 `termux-notification` 호출이 없고, 과거 `boot-backups`에만 남아 있었다.
2. 실제 실행 중인 알림 본체는 `~/.local/share/pocketrisu-notify-relay/receiver.cjs`로 확인했다.
3. `termux-notification --help`에서 `--alert-once` 지원을 확인했다.
4. `8472` 알림에 `--alert-once`를 추가하고 relay 재시작까지 정상 적용했다.
5. 그러나 통화 후 끊었을 때 무한소리가 다시 발생했다. 즉 단순한 notification edit 재알림 문제는 아니었다.
6. 무한소리 발생 중 `termux-notification-remove 8472`를 실행하자 즉시 멈췄다.

## 현재 판단
통화 종료 같은 Android 오디오 route/focus 변화 뒤에, `--sound`를 가진 지속 알림 `8472`의 사운드가 재개되는 쪽이 유력하다.

`--alert-once`만으로는 해결되지 않는다.

## 다음 수정 방향
- 지속 표시용 `8472` 알림에서는 `--sound`를 제거한다.
- 소리는 별도 임시 알림 ID(예: `8473`) 또는 확실한 1회성 재생 방식으로 분리한다.
- 임시 소리 알림은 짧은 시간 뒤 제거해 통화/이어폰 route 변경 후 되살아날 상태를 남기지 않는다.
- 수정 전 백업 → node syntax 검사 → relay 재시작 → 전화 실검증 → 이어폰 실검증 순서 유지.

## 조사 순서
1. relay 실제 옵션 INSPECT_ONLY
2. notification ID 재사용 확인
3. `--alert-once` 검증
4. relay 중복 호출 여부 확인
5. 오디오 route 변화와 재alert 분리
6. 지속 알림과 소리 분리
7. 전화 실검증
8. 이어폰 실검증

reconnect notification은 sound 없이 구성한 상태.

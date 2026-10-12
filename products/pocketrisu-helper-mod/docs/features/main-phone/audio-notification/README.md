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

## 전용 relay supervisor 내구성 계약 (#3513)

이 절은 위의 notification sound 문제와 별개인 **메인폰 relay supervision plane**을 다룬다. `#3269`의 sound/channel 동작을 바꾸지 않고, shared Termux `runsvdir` 없이 `pocketrisu-notify-relay` 하나만 전용 `runsv`로 복구한다.

- repository owner: `files/22-pocketrisu-notify-relay-supervisor`
- source mode: `100644`
- live Boot target은 merge/postmerge 이후에만 `~/.termux/boot/22-pocketrisu-notify-relay-supervisor` mode `0700`으로 설치한다.
- receiver와 service `run`은 기존 device-local bytes를 **소유하거나 덮어쓰지 않는다**. 현재 승인된 hash/mode와 exact regular-file identity를 admission gate로만 사용한다.
- `--check`는 read-only다. `identity`, `supervision`, `receiver`, `health`, `recovery`, `effect`, `details=withheld`만 출력하고 PID, command line, endpoint, payload, token, address, raw process output은 출력하지 않는다.
- `--ensure`는 `missing supervisor + receiver absent`인 exact eligible state에서만 fixed service directory에 dedicated `runsv` 하나를 시작한다.
- service `down` marker와 이미 인식된 `run:`/`down:` supervision은 새 supervisor 시작 권한이 아니다.
- supervisor가 없고 exact receiver 하나가 PID 1에 붙어 있으며 fixed localhost health가 ready면 `orphan_present`로 보존한다. receiver를 죽이거나 재시작해서 `sv` 상태를 예쁘게 만들지 않는다.
- duplicate receiver, non-PID1 unsupervised receiver, ambiguous supervisor/process evidence, identity drift, unreadable process evidence는 fail-closed다.
- ensure lock은 concurrent duplicate start만 막고, 살아 있는 lock owner는 건드리지 않으며 stale lock만 회수한다.
- start 뒤에는 bounded readback으로 `run supervision + exactly one receiver parented by that runsv + health ready`를 모두 확인해야 성공한다.
- health failure 단독으로 supervised receiver를 kill/restart/replace하지 않는다.
- V1은 persistent guard loop나 independent anchor를 만들지 않는다. 전용 `runsv` 자체의 장기 생존성에 추가 owner가 필요하다는 실증이 생기면 별도 scope로 다룬다.
- `service-daemon`, shared top-level `runsvdir`, PocketRisu core SSH tunnel, M RDC/Tailscale, Android settings/channel/package/network state는 이 owner의 effect surface가 아니다.

IMPLEMENTATION_PR에서는 repository source/tests/docs만 만든다. 실제 메인폰 설치와 one-shot ensure는 reviewed merge + postmerge convergence 이후 EXPERIMENT_CLOSE에서 fresh identity/readback을 다시 통과한 뒤에만 수행한다.

# Firefox background CPU kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
Status: **ACTIVE / ROOT_CAUSE_STRONGLY_ESTABLISHED**

## 목적
Android/Samsung이 백그라운드 Firefox의 PocketRisu Gecko content process를 `excessive cpu` 이유로 종료하고, 복귀 시 PocketRisu 문서가 재구성되는 문제를 좁은 범위로 수정한다.

## 확정 증거
- Firefox main process는 재현 중 계속 생존했다.
- 2026-10-06 01:55:46 KST Android ActivityManager가 이전 PocketRisu 재구성 직후 생성된 Gecko tab process `tab17` PID 9815를 `excessive cpu` 이유로 kill했다.
- 같은 sweep에서 Firefox utility process도 `excessive cpu`로 kill됐다.
- 복귀 시 새 Gecko tab process가 생성되고 직후 PocketRisu `Session boot registered`가 발생했다.
- 서버 PocketRisu PID와 메인 SSH core tunnel은 유지됐다.
- stale-writer 423 데이터손실 모드는 재현되지 않았다.

## 가장 강한 현재 원인
현재 DB의 `keepSessionAlive` 값은 `sound`다. `src/App.svelte`의 sound keep-alive는 약 2.325초 길이의 44.1 kHz stereo MP3를 극저볼륨으로 무한 loop 재생한다.

ADB/AudioService에서:
- Firefox AAudio media player가 실제 `started` 상태로 유지됨.
- `audio-playing:org.mozilla.firefox` wake 상태가 관찰됨.
- Samsung AudioHardening이 Firefox background playback을 반복 감지함.
- kill 직후 해당 Firefox audio player가 pause/release됨.

따라서 Android Firefox에서 sound keep-alive가 background throttling을 무력화하고 Gecko content/utility CPU 사용을 계속 유지해 cached-process CPU kill을 유발하는 것이 현재 가장 강한 원인이다.

## 안전한 최소 수정 방향
Android Firefox에서만 `keepSessionAlive = sound`의 continuous audio loop를 시작하지 않는다.

다른 플랫폼/브라우저 동작, session-write-lock, save/flush, V3 plugin lifecycle, SSH/notification 경로는 변경하지 않는다.

## 검증
필수:
1. Android Firefox 새 문서에서 AAudio keep-alive player가 생성되지 않음.
2. background/cached 상태에서 기존처럼 `audio-playing:org.mozilla.firefox`가 유지되지 않음.
3. 최소 5분 cached interval에서 PocketRisu Gecko tab/utility에 `excessive cpu` kill이 재현되지 않음.
4. foreground chat send/persist 정상.
5. 423 `Session deactivated` 없음.
6. production build/check PASS.

## Rollback
`src/App.svelte`의 Android Firefox sound guard만 되돌린다.

## 다음 한 단계
Android Firefox sound keep-alive guard를 source에 최소 적용하고 build 후 실기기 A/B 검증.

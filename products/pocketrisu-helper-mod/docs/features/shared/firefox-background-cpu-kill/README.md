# Firefox background CPU kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
Status: **VERIFIED_LOCAL / LIVE_A_B_PASS / CHAT_SEND_SMOKE_PENDING**

## 목적
Android/Samsung이 백그라운드 Firefox의 PocketRisu Gecko content process를 `excessive cpu` 이유로 종료하고, 복귀 시 PocketRisu 문서가 재구성되는 문제를 좁은 범위로 수정한다.

## 확정 증거
- Firefox main process는 재현 중 계속 생존했다.
- 2026-10-06 01:55:46 KST Android ActivityManager가 이전 PocketRisu 재구성 직후 생성된 Gecko tab process `tab17` PID 9815를 `excessive cpu` 이유로 kill했다.
- 같은 sweep에서 Firefox utility process도 `excessive cpu`로 kill됐다.
- 복귀 시 새 Gecko tab process가 생성되고 직후 PocketRisu `Session boot registered`가 발생했다.
- 서버 PocketRisu PID와 메인 SSH core tunnel은 유지됐다.
- stale-writer 423 데이터손실 모드는 재현되지 않았다.

## 원인
현재 DB의 `keepSessionAlive` 값은 `sound`였다. `src/App.svelte`의 sound keep-alive는 약 2.325초 길이의 44.1 kHz stereo MP3를 극저볼륨으로 무한 loop 재생한다.

ADB/AudioService에서:
- Firefox AAudio media player가 실제 `started` 상태로 유지됨.
- `audio-playing:org.mozilla.firefox` wake 상태가 관찰됨.
- Samsung AudioHardening이 Firefox background playback을 반복 감지함.
- kill 직후 해당 Firefox audio player가 pause/release됨.
- Android ActivityManager kill 이유가 LMKD/OOM이 아니라 명시적으로 `excessive cpu`였다.

따라서 Android Firefox에서 sound keep-alive가 background throttling을 방해하고 Gecko content/utility CPU 사용을 계속 유지해 cached/background CPU kill을 유발한 것이 현재 실기기 증거로 가장 강하게 확정된 원인이다.

## 구현
서버폰 PocketRisu branch:
- branch: `feat/firefox-background-cpu-kill`
- commit: `4f693cba1c993b42407b1b73a9ae407f4e102b97`
- parent: `85bf4cec98ec55b96d1201f0de433f43ad3d884b`

변경:
- `src/App.svelte` 한 파일
- Android Firefox에서만 `keepSessionAlive = sound`의 continuous audio loop를 시작하지 않음
- 다른 플랫폼/브라우저 동작 유지
- session-write-lock, save/flush, V3 plugin lifecycle, SSH/notification 경로 변경 없음

## 검증
완료:
1. `svelte-check`: **0 errors**, 기존 a11y warning 4개만.
2. production build: **PASS / exit 0**.
3. 새 build가 `dist`에 guard 문자열을 포함하고 서버 `/api/health` ready 확인.
4. Android Firefox 새 문서 reload 직후 기존 Firefox AAudio player가 **2026-10-06 02:52:55 KST release**됨.
5. 그 뒤 Firefox AAudio media player가 새로 생성되지 않음.
6. Firefox가 02:53:10 KST background로 내려간 뒤 02:58:59 KST heartbeat까지 약 5분 49초 동안 동일 main/tab process set 유지.
7. 해당 구간 main/tab `oom_score_adj`가 대체로 900/910으로 기존 kill 가능 범위였지만 `excessive cpu` kill **0건**.
8. reload 후 server patch generation 2279가 02:53:16 launch → 02:53:28 commit, `database.bin` 02:53:21 갱신.
9. reload/검증 구간 `423 Session deactivated` 없음.

아직 완료 아님:
- foreground 실제 chat send → chat-content persist smoke 1회.
- 자연 운용에서 더 긴 background interval 반복 관찰.

## Rollback
`src/App.svelte`의 Android Firefox sound guard만 되돌린다.

백업:
`$HOME/.local/state/pocketrisu-diag-backups/20261006-024511-firefox-background-cpu-kill/App.svelte`

## 다음 한 단계
평소 사용 중 foreground chat send 1회를 정상 저장까지 확인하고, 그 뒤 다음 자연 background interval에서 재발 여부를 관찰한다. 그 두 단계가 통과되면 official upstream PR 준비 상태로 승격한다.

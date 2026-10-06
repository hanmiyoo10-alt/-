# Firefox background CPU kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
Status: **FORK_PR_OPEN / LOCAL_ONLY / NOT_GLOBAL_RECONSTRUCTION_FIX**

## 목적
Android/Samsung이 백그라운드 Firefox의 PocketRisu Gecko content process를 `excessive cpu` 이유로 종료하는 한 가지 확인된 새고 메커니즘을 수정한다.

## 확정 증거
- Firefox main process는 해당 재현 중 계속 생존했다.
- 2026-10-06 01:55:46 KST Android ActivityManager가 PocketRisu 재구성과 시간축이 연결된 Gecko tab process `tab17` PID 9815를 `excessive cpu` 이유로 kill했다.
- 같은 sweep에서 Firefox utility process도 `excessive cpu`로 kill됐다.
- 복귀 시 새 Gecko tab process가 생성되고 직후 PocketRisu `Session boot registered`가 발생했다.
- stale-writer 423 데이터손실 모드는 재현되지 않았다.

## 원인
`keepSessionAlive: sound` 구현은 약 2.325초 길이의 44.1 kHz stereo MP3를 극저볼륨으로 무한 loop 재생했다.

ADB/AudioService에서 Firefox AAudio playback, background audio hardening, kill 직후 player pause/release를 확인했다. ActivityManager kill 이유는 LMKD/OOM이 아니라 명시적으로 `excessive cpu`였다.

## 구현
- branch: `feat/firefox-background-cpu-kill`
- commit: `4f693cba1c993b42407b1b73a9ae407f4e102b97`
- Android Firefox에서만 continuous sound keep-alive loop를 시작하지 않음.

## 검증
- `svelte-check`: 0 errors.
- production build: PASS.
- 새 build 로드 후 기존 Firefox AAudio player release.
- replacement Firefox AAudio player 없음.
- >5분 background A/B에서 same process set 유지, `excessive cpu` kill 0.
- server persist 정상, 423 없음.

## 범위 정정
2026-10-06 16:49에 visible reconstruction이 다시 발생했지만:
- Firefox main/tab PID set은 모두 유지됐고
- incident 시각에 `am_kill` / `am_proc_died` / `am_proc_start`가 없었다.

따라서 이 feature는 **excessive-CPU process-kill 메커니즘을 해결하는 fix**이며, 모든 Firefox reconstruction을 해결하는 전역 fix가 아니다.

별도 Feature-ID:
- `firefox-same-process-reconstruction`

## Rollback
`src/App.svelte`의 Android Firefox sound guard만 되돌린다.

## 다음 한 단계
CPU-kill 경로는 자연 운용으로 계속 감시하되, same-process document recreation은 별도 feature에서 추적한다.

## PR 상태
- 현재 허용 PR: `hanmiyoo10-alt/PocketRisu#11`
- base: `deploy/termux-pocketrisu`
- head: `feat/firefox-background-cpu-kill`
- candidate: `4f693cba1c993b42407b1b73a9ae407f4e102b97`
- changed files: 1 (`src/App.svelte`), additions: 7, deletions: 0.
- 상태: OPEN / mergeable / non-draft.
- official `PocketRisu/PocketRisu#94`는 잘못 생성되어 **CLOSED / NOT MERGED**.
- 이 feature는 사용자 fork 내부 PR로만 유지한다.

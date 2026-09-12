# CURRENT — ChatGPT Mobile Coder Lab

최종 갱신 기준: **2026-09-12**

새 채팅이나 다른 ChatGPT 계정에서 이 실험을 이어갈 때 가장 먼저 읽는 현재 상태 체크포인트다. 상세 시간순 기록은 `docs/experiment-log.md`와 `docs/checkpoints/`를 본다.

## 목표 — CORE COMPLETE / PROVEN AT PR-PUBLICATION LEVEL

목표는 일반 ChatGPT 채팅을 reasoning/chat surface로 유지하면서 Android 서버폰의 실제 개발환경에 filesystem/shell/Git/test 도구를 연결해 Codex에 가까운 개발 루프를 만드는 것이다.

핵심 요구:

- Android 폰 두 대만으로 운영 가능할 것.
- 두 폰은 서로 다른 ChatGPT 계정을 사용한다.
- 두 계정은 같은 GitHub repository에서 서로 다른 작업을 병렬 수행한다.
- 같은 working tree를 공유하지 않는다.
- 일반 ChatGPT 채팅 경로를 주력으로 사용한다.
- Codex CLI는 보조 경로이며 주력 목표와 동일시하지 않는다.

### 핵심 목표 완료 판정 — COMPLETE

2026-09-12 기준 이 실험의 핵심 목표는 완료로 닫는다. 서버폰의 full remote coding/PR loop, 서버폰 runit + 실제 Android reboot persistence, 메인폰 isolated worktree remote execution, 두 물리 장치의 concurrent Git execution이 모두 증거로 남아 있다.

남은 항목은 핵심 기능 blocker가 아니라 운영 하드닝 또는 선택적 추가 증명이다. 별도 [`docs/OPERATIONS_BACKLOG.md`](docs/OPERATIONS_BACKLOG.md)에서 추적한다.

## 현재 결론

서버폰에서 다음 경로가 실제로 검증됐다.

```text
ordinary ChatGPT mobile
→ Remote Desktop Commander
→ Android server phone
→ Ubuntu PRoot
→ isolated Git worktree
→ read/search/edit
→ diff/validation
→ local commit
→ push
→ exact remote SHA verification
→ GitHub pull request
```

즉 일반 ChatGPT 모바일이 로컬 개발환경의 실질적인 coding agent brain으로 동작하고, Remote Desktop Commander가 filesystem/shell/Git 실행 손발을 제공하는 구조가 실제로 성립했다.

## 메인폰 원격 실행 — ISOLATED WORKTREE LEVEL PASS

2026-09-12 기준 메인폰도 Remote Desktop Commander를 통한 repository 실행면으로 검증됐다.

```text
repository: /data/data/com.termux/files/home/nyang-repo
landing worktree: /data/data/com.termux/files/home/nyang-worktrees/mainphone-work
landing branch: mainphone/work
verified SHA: c76e7397fc33d48bb997b1e1b1e00bcfbf2f629c
```

기존 활성 작업 트리 `chore/add-codex-cli`와 그 안의 미추적 `package-lock.json`은 건드리지 않았다. 별도 disposable worktree에서 create → dirty detection → delete → clean rollback을 검증했고, `mainphone/work`는 clean fast-forward만 사용해 현재 `origin/main`과 동일 SHA로 동기화했다. 상세 증거는 `docs/checkpoints/2026-09-12-mainphone-remote-operational.md`를 본다.

이 결과는 메인폰 자체의 독립 원격 실행 가능성을 증명한다. 이후 두 물리 장치의 동시 remote Git 실행도 별도 checkpoint에서 검증했다.

## 두 폰 동시 remote execution — PASS / ACCOUNT IDENTITY BOUNDARY

2026-09-12 메인폰과 서버폰에서 서로 다른 feature branch/worktree와 서로 다른 파일을 준비한 뒤 동일한 barrier 시각에 commit/push를 시작했다.

```text
main phone release:   2026-09-12T12:53:09Z
main phone push done: 2026-09-12T12:53:12Z
server release:       2026-09-12T12:53:09Z
server push done:     2026-09-12T12:53:15Z
```

따라서 최소 `12:53:09Z`부터 `12:53:12Z`까지 두 물리 장치가 같은 repository의 서로 다른 branch/worktree에서 동시에 Git 작업을 수행한 것이 직접 관찰됐다. 각 branch는 별도 PR #2111 / #2112로 게시됐고 repository gate를 통과해 순서대로 merge됐다.

이번 checkpoint가 직접 증명하는 것은 **two-device concurrent remote execution**이다. 이 단일 tool session은 각 모바일 ChatGPT의 로그인 계정 정체성을 독립적으로 재검증하지 않았으므로, `two different ChatGPT accounts concurrently invoked`라는 더 강한 claim은 기존 account-specific evidence 또는 별도 account-session checkpoint가 필요하다. 상세 증거는 `docs/checkpoints/2026-09-12-two-phone-concurrent-remote-execution.md`를 본다.

## 서버폰 환경

- Termux.
- Ubuntu 24.04.4 LTS PRoot.
- architecture: `aarch64`.
- tmux 설치 완료.
- permanent working repository: `/root/nyang-repo`.
- permanent device branch: `server/work`.
- Tailscale 사용 가능.
- Remote Desktop Commander 실행 버전 확인 시 `@wonderwhy-er/desktop-commander@0.2.48`.
- Remote agent는 Ubuntu PRoot 문맥에서 실행했지만 Node binary 자체는 Termux의 `/data/data/com.termux/files/usr/bin/node`를 사용했다.

주의:

- Remote Desktop Commander의 plain `pwd`는 repository root가 아니라 npx package의 `dist` directory를 반환했다.
- 따라서 모든 repository/worktree 작업은 absolute path 또는 `git -C <absolute-path> ...` 형태를 우선한다.

## Codex CLI — TECHNICALLY WORKING / QUOTA BLOCKED

공식 Linux ARM64 Codex standalone binary 설치와 ChatGPT device auth는 성공했다.

```text
/usr/local/bin/codex
codex-cli 0.153.4
```

`/root/nyang-repo`를 대상으로 read-only session 생성까지 성공했으나 실제 모델 작업은 Codex usage limit에 막혔다.

따라서 이 실험의 주력 구조는 다음으로 확정됐다.

```text
ordinary ChatGPT reasoning
+
Remote Desktop Commander filesystem/shell bridge
```

## 검증된 단계

### 1. Remote device connection — PASS

- local Desktop Commander MCP 연결 성공.
- remote MCP 연결 성공.
- device authorization 성공.
- 초기 realtime transport failure 후 channel 자동 복구 성공.
- device online/presence 상태 진입 성공.

### 2. Read/search — PASS

Android ChatGPT에서 실제 remote tool invocation으로 다음이 성공했다.

```text
git -C /root/nyang-repo branch --show-current
→ server/work

git -C /root/nyang-repo status -sb
→ ## server/work...origin/server/work
```

Repository top-level listing, `README.md` read, bounded repository string search도 성공했다.

### 3. Disposable filesystem write — PASS

`server/work`를 수정하지 않고 detached worktree를 생성했다.

```text
/root/nyang-worktrees/remote-write-smoke
```

그 안에서 신규 파일 create → read → Git dirty detection → delete → clean 복귀를 확인했다.

### 4. Tracked patch + rollback — PASS

같은 disposable worktree의 tracked `README.md`를 한 줄 수정했다.

- `git diff --check` 통과.
- diff가 의도한 한 줄만 포함함을 확인.
- `git restore --source=HEAD`로 복구.
- 복구 후 SHA-256이 원본과 정확히 동일.
- 최종 worktree clean 확인.

### 5. Named branch + local commit — PASS

전용 branch/worktree를 생성했다.

```text
branch: server/remote-commit-smoke-20260909
worktree: /root/nyang-worktrees/remote-commit-smoke-20260909
```

정확히 파일 하나만 stage하고 staged diff를 검증한 뒤 local commit을 생성했다.

```text
90add16fc4eba3c91ecb72831bba37fd69760d4d
```

영구 Git identity는 변경하지 않고 commit command에만 temporary identity를 사용했다.

### 6. Remote push — PASS

`server/remote-commit-smoke-20260909`를 ordinary push로 origin에 게시했다.

Local/remote exact SHA가 일치했다.

```text
90add16fc4eba3c91ecb72831bba37fd69760d4d
```

GitHub API에서도 remote branch가 동일 SHA를 가리키는 것을 별도로 확인했다.

### 7. Full PR publication loop — PASS

최신 `origin/main`에서 별도 PR smoke branch/worktree를 만들었다.

```text
branch: server/remote-pr-smoke-20260909
worktree: /root/nyang-worktrees/remote-pr-smoke-20260909
base: origin/main@80876c20
```

정확히 한 개의 documentation file을 생성하고 검증 후 commit했다.

```text
e4abe74b0eca59659bae7daad1200041b52f0821
```

Push 후 local/remote SHA 일치를 확인했고, 서버폰에 이미 설치 및 인증돼 있던 `gh`로 PR을 생성했다.

```text
PR: #1937
title: test(chatgpt-mobile-coder): verify remote PR flow
base: main
head: server/remote-pr-smoke-20260909
state: open
merged: false
```

GitHub-side verification:

```text
head SHA: e4abe74b0eca59659bae7daad1200041b52f0821
commits: 1
changed files: 1
additions: 9
deletions: 0
mergeable: true
```

PR merge는 의도적으로 수행하지 않았다.

## Permanent repository isolation

모든 write/commit/push/PR 실험 동안 permanent repository는 다음 상태를 보존했다.

```text
/root/nyang-repo
branch: server/work
status: clean
```

따라서 device landing branch와 feature/test worktree를 분리하는 운영 방식이 실제로 동작했다.

## 운영 하드닝 backlog — NOT CORE BLOCKERS

핵심 목표 완료 이후 남은 작업은 [`docs/OPERATIONS_BACKLOG.md`](docs/OPERATIONS_BACKLOG.md)로 분리한다. 현재 분류는 다음과 같다.

- 메인폰 bridge의 reboot/reconnect 대칭 검증과 두 기기의 장시간 channel soak.
- 서버폰 `/root` 전체보다 coding worktree 중심으로 더 좁은 권한 범위를 적용할 수 있는지 검토.
- 실제 feature 작업에서 repository-owned guideline/test discovery를 반복 검증하는 운영 품질 강화.
- 필요할 때만 두 ChatGPT 로그인 계정의 동시 호출 identity를 별도 account-session checkpoint로 증명.
- 과거 smoke PR/branch/worktree의 보존·정리 정책 확정.

서버폰 persistent service와 실제 Android reboot persistence는 이미 PASS이므로 미완료 항목으로 다시 취급하지 않는다.

## 현재 권장 운영

새 기능을 더 붙이는 별도 필수 단계는 없다. 현재 검증된 remote execution baseline을 보존하면서 실제 repository 작업에 사용하고, 위 backlog 항목은 필요가 발생하거나 별도 목표로 승인될 때 좁게 진행한다.

## 안전 원칙

- 같은 working tree를 두 ChatGPT 계정이 동시에 수정하지 않는다.
- permanent device branch는 feature 작업공간으로 직접 사용하지 않는다.
- feature별 named branch/worktree를 사용한다.
- 기본 cwd를 신뢰하지 않고 absolute repository/worktree path를 사용한다.
- dirty tree에서는 자동 sync/branch switch를 하지 않는다.
- commit 전에 staged file set과 staged diff를 확인한다.
- push, PR, merge는 각각 별도 authority boundary로 취급한다.
- force push, reset, merge는 특별한 이유와 명시적 검증 없이 수행하지 않는다.
- PocketRisu 서비스와 coding bridge runtime을 분리한다.
- 기존 runit 운영 철학을 유지하고 PM2를 도입하지 않는다.
- 토큰, 인증 코드, session id, device ID, API key, SSH key, DB, private logs/backups는 Git에 기록하지 않는다.

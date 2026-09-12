# Experiment Log

지금까지 이 실험에서 실제로 확인한 흐름을 시간 순서대로 기록한다.

## 2026-09-09 — 목표 탐색 시작

출발점은 `hoangcoderr/chatgpt-local-coder`였다.

관심 포인트:

- ChatGPT web을 local coding agent처럼 사용.
- 파일 read/write.
- shell 실행.
- Git.
- patch 적용.

초기 질문은 "모바일 공식 ChatGPT만 쓰는 사용자에게 이 방식이 유효한가"였다.

## 2026-09-09 — 유사 프로젝트 조사

비슷한 목적의 GitHub 프로젝트들을 조사했다.

초기에 Android-only 후보로 Codex/OpenCode/Termux/Web UI 조합을 검토했지만, 사용자의 실제 환경을 확인하면서 요구가 더 구체화됐다.

중요한 조건:

- Android 폰이 두 대.
- Tailscale을 이미 사용 중.
- 두 폰 모두 ChatGPT를 별도로 사용.
- 두 ChatGPT 계정은 서로 다른 계정.
- 두 계정 모두 같은 repository 안에서 서로 다른 작업을 수행.

## 2026-09-09 — 기존 PocketRisu 인프라 확인

`hanmiyoo10-alt/-`와 `hanmiyoo10-alt/PocketRisu`를 확인하면서 이미 다음 기반이 존재함을 확인했다.

- 메인폰 + 서버폰 역할 분리.
- 서버폰 Termux.
- PocketRisu Node runtime.
- runit 기반 서비스 운영.
- Termux:Boot/local runtime bootstrap.
- SSH forwarding.
- Tailscale 원격접근 경험.
- 안전 updater/rollback/health 관점.

결론:

새로운 Android 개발 서버를 처음부터 만드는 문제가 아니었다. 이미 있는 모바일 서버 인프라 옆에 coding agent/bridge를 독립적으로 추가하는 문제가 됐다.

## 2026-09-09 — 메인폰 `nyang` 환경 확인

메인폰에서 확인된 흐름:

- Termux 바깥 `~/simcore-repo` resume check.
- 한 시점에 local `main`이 `origin/main`보다 5328 commits 뒤였으며 working tree는 clean.
- 별도 tmux session `nyang`은 Ubuntu PRoot 내부 `/root/nyang-repo`를 작업공간으로 사용.
- 이후 `nyang` wrapper를 `mainphone/work` 기준으로 작성.
- `~/.config/nyang/device-branch`에 `mainphone/work` 기록.
- `nyang-sync` 작성.

`nyang-sync`의 안전 의도:

- device branch일 때만 동작.
- dirty tree면 아무것도 하지 않음.
- 같은 remote branch와 `origin/main`을 fast-forward 가능한 경우에만 따라감.

관찰된 개선점:

- branch switch 실패를 강제 중단하지 않으면 다른 branch에서 shell이 열릴 수 있음.
- 붙여넣은 transcript 안의 `then>`은 실제 파일 문법 여부를 별도 `bash -n`으로 확인해야 함.

## 2026-09-09 — 서버폰 `nyang` 환경 준비

서버폰에서 `nyang` wrapper를 `server/work` 기준으로 작성했다.

초기 실행 결과:

```text
tmux: command not found
```

대응:

```text
pkg install tmux -y
```

설치 후 `nyang` tmux session 생성 성공.

주의:

- `tmux -v`는 의도한 version check가 아니어서 session `0`을 생성했다.
- version check는 `tmux -V`를 사용해야 함.

## 2026-09-09 — 서버폰 Codex 실행환경 preflight

Ubuntu PRoot 내부에서 확인:

```text
Ubuntu 24.04.4 LTS
aarch64
/root/nyang-repo
server/work...origin/server/work
```

Node/npm은 Ubuntu 자체 설치가 아니라 Termux binary를 PATH 뒤쪽에서 사용하고 있었다.

```text
/data/data/com.termux/files/usr/bin/node
/data/data/com.termux/files/usr/bin/npm
```

이 경계를 피하기 위해 npm global install 대신 공식 standalone Linux ARM64 binary를 선택했다.

메모리 확인 시:

```text
RAM total: 10 GiB
Swap total: 6 GiB
```

기존 `codex` binary는 없었다.

## 2026-09-09 — 공식 Codex ARM64 standalone 설치

다운로드 대상:

```text
codex-aarch64-unknown-linux-musl.tar.gz
```

설치 위치:

```text
/usr/local/bin/codex
```

검증 결과:

```text
/usr/local/bin/codex
codex-cli 0.153.4
```

`codex --help`도 정상 실행됐다.

## 2026-09-09 — Codex ChatGPT device auth

Ubuntu interactive shell에서:

```text
codex login --device-auth
```

실행 후 browser login URL과 device code가 표시됐고 서버폰용 ChatGPT 계정으로 로그인에 성공했다.

인증 code와 session 정보는 저장하지 않는다.

## 2026-09-09 — 첫 read-only repository smoke test

대상:

```text
/root/nyang-repo
```

실행 의도:

- 현재 branch 확인.
- clean 여부 확인.
- top-level directory 파악.
- repository 목적 요약.
- 절대 수정하지 않음.

Codex 세션은 다음 상태까지 정상 진입했다.

```text
workdir: /root/nyang-repo
approval: never
sandbox: read-only
```

경고:

- system bubblewrap 미발견 → bundled bubblewrap fallback.
- `codex-code-mode-host` 미설치 → Code Mode unavailable.

최종 중단 원인:

```text
You've hit your usage limit.
```

즉 당시 증거로는 Android/PRoot compatibility failure가 아니라 **Codex usage allowance**가 blocker였다.

## 2026-09-09 — 목표 재정의

이 시점에서 핵심 요구가 명확해졌다.

원하는 것은:

```text
Codex CLI를 모바일에서 쓰기
```

가 아니라:

```text
일반 ChatGPT 채팅 자체를 Codex처럼 쓰기
```

였다.

즉 일반 ChatGPT 채팅의 reasoning/usage 경로를 유지하면서 local filesystem/shell/git/test를 붙이는 것이 목표다.

## 2026-09-09 — GitHub/ChatGPT bridge 생태계 조사

비슷한 생각을 구현한 프로젝트가 다수 존재함을 확인했다.

조사된 대표 계열:

### Custom MCP 직결형

- `hoangcoderr/chatgpt-local-coder`
- `rebel0789/codexpro`
- `Waishnav/devspace`
- `fwerkor/local-shell-mcp`
- `JuanseGZZ/localmcpcoder`

공통 아이디어:

```text
ChatGPT reasoning
→ MCP
→ local filesystem / shell / git
```

### 하위 local agent형

- `pickleshell/pickleshell`

ChatGPT가 로컬 OpenCode/agent 세션을 조작하는 방향. 기능은 강력하지만 "일반 ChatGPT 자체가 주 agent"라는 목표와는 약간 다르다.

### 공개 ChatGPT Plugin/App형

플러그인 디렉터리에서 다음 후보를 확인했다.

- Remote Desktop Commander.
- SentinelX.
- TRIGGERcmd.

특히 Remote Desktop Commander는 연결된 컴퓨터의 filesystem/terminal에 접근해 command, process, file edit, development workflow를 처리하는 목적을 명시하고 있어 현재 목표와 매우 가깝다.

## 2026-09-09 — Remote Desktop Commander 첫 서버폰 실행

Termux 바깥 셸에서:

```text
npx @wonderwhy-er/desktop-commander@latest remote
```

를 실행했다.

확인된 단계:

```text
Connected to Desktop Commander MCP
Connected to Remote MCP
Device code received
Authorization successful
Device ready
```

그 뒤 remote realtime channel이 `transport failure`와 반복적인 `Recreating channel` 상태에 들어갔다.

이 실행은 Termux 바깥 문맥이므로 `/root/nyang-repo`는 직접 존재하지 않았다. `/root/nyang-repo`는 Ubuntu PRoot 내부 경로다.

## 2026-09-09 — Remote Desktop Commander Ubuntu PRoot 재시도

Ubuntu PRoot 내부 `/root/nyang-repo`에서 동일한 remote command를 실행했다.

Node binary 자체는 여전히 Termux 경로를 사용했다.

```text
/data/data/com.termux/files/usr/bin/node
```

하지만 npm 임시 package 위치와 현재 HOME/workdir은 Ubuntu PRoot 쪽 문맥을 따랐다.

중요 결과:

```text
Connected to Desktop Commander MCP
Connected to Remote MCP
Authorization successful
Device ready
Channel error: transport failure
Recreating channel... (attempt 1)
Channel subscribed (recovered after 1 attempt)
Device marked as online
Presence tracked
```

판정:

- device-side agent 실행 성공.
- remote 계정 인증 성공.
- initial realtime transport failure는 있었으나 자동 복구됨.
- remote service에서 device가 online/presence 상태까지 진입함.

보안상 device code, device ID, account address는 기록하지 않는다.

## 2026-09-09 — Android ChatGPT에서 첫 실제 remote repository read 성공

Android ChatGPT에서 Remote Desktop Commander를 호출해 서버폰에 read-only 명령이 실제로 전달되는지 검증했다.

결과:

```text
pwd
→ /root/.npm/_npx/.../@wonderwhy-er/desktop-commander/dist

git -C /root/nyang-repo branch --show-current
→ server/work

git -C /root/nyang-repo status -sb
→ ## server/work...origin/server/work
```

`/root/nyang-repo` 최상위 목록도 정상 반환됐다.

대표 항목:

```text
.agents
.git
.github
README.md
config
docs
fixtures
local
plugins
product-manifest.json
products
references
scripts
study
tools
```

판정:

- 일반 ChatGPT 모바일 채팅이 Remote Desktop Commander plugin/app를 실제로 호출함.
- remote 요청이 서버폰에 도달함.
- Ubuntu PRoot 내부 `/root/nyang-repo`의 Git 상태와 filesystem을 읽는 데 성공함.
- `server/work` branch와 `origin/server/work` tracking 상태도 정확히 확인됨.
- 따라서 최소 read-only 기준에서 다음 경로가 실제로 성립함.

```text
일반 ChatGPT 모바일
→ Remote Desktop Commander
→ remote service
→ 서버폰 Ubuntu PRoot
→ /root/nyang-repo
```

주의할 점:

- plain `pwd`는 repository root가 아니라 npx package의 `dist` directory를 반환했다.
- 따라서 tool process의 current working directory를 repository root라고 가정하면 안 된다.
- repository 작업에는 absolute path 또는 `git -C /root/nyang-repo ...` 방식을 우선한다.

## 2026-09-09 — remote file read/search 및 branch lag 진단

Remote Desktop Commander를 통해 `/root/nyang-repo/README.md` 처음 40줄을 읽고 ChatGPT가 그 내용만으로 repository 목적을 요약하는 데 성공했다.

또한 repository 전체 문자열 검색도 실행됐다.

`chatgpt-mobile-coder-lab` 문자열은 당시 서버폰 checkout에서 발견되지 않았지만, GitHub 비교 결과 원인은 remote 검색 실패가 아니라 branch freshness 차이였다.

확인 결과:

```text
git rev-list --left-right --count server/work...origin/main
→ 0 50
```

즉 `server/work`의 독자 커밋은 0이고 `origin/main`이 50 commits 앞선 fast-forward 관계였다.

## 2026-09-09 — 첫 disposable remote write smoke test 성공

`server/work`와 기존 `/root/nyang-repo`를 직접 수정하지 않고 별도 disposable worktree를 사용했다.

대상 경로:

```text
/root/nyang-worktrees/remote-write-smoke
```

사전 확인에서 경로는 존재하지 않았다.

최신 `origin/main` 기준으로 detached worktree 생성 성공:

```text
initial status
→ ## HEAD (no branch)

HEAD
→ bba7e5f2
```

새 worktree 안에서만 다음 파일을 생성했다.

```text
REMOTE_DESKTOP_COMMANDER_SMOKE.txt
```

파일 내용:

```text
remote desktop commander write smoke test
```

생성 직후 Git 상태:

```text
?? REMOTE_DESKTOP_COMMANDER_SMOKE.txt
```

그 파일을 다시 읽어 정확한 내용이 유지되는 것을 확인했다.

이후 테스트 파일을 삭제했고 최종 `git status --short`는 아무 출력도 반환하지 않았다.

판정:

- ChatGPT 모바일이 remote filesystem write를 실제 수행함.
- 새 Git worktree 생성 명령도 remote shell에서 정상 실행됨.
- 파일 create → read → Git dirty 감지 → delete → clean 복귀의 전체 루프가 성공함.
- permanent `server/work` working tree를 수정하지 않고 isolated disposable worktree에서 쓰기 기능을 검증함.
- 따라서 다음 경로가 read-only를 넘어 실제 쓰기 수준에서도 성립함.

```text
일반 ChatGPT 모바일
→ Remote Desktop Commander
→ 서버폰 Ubuntu PRoot
→ isolated Git worktree
→ local filesystem write/read/delete
```

## 2026-09-12 — 핵심 실험 종료

9월 9일의 마지막 기록 이후 다음 단계들이 모두 실제 증거와 함께 완료됐다.

- tracked patch + rollback 검증.
- named branch/worktree에서 local commit, push, exact remote SHA verification, PR publication.
- 서버폰 Remote Desktop Commander의 pinned runit service 전환과 restart/session recovery.
- 실제 Android reboot 후 Termux:Boot → runit → persisted session restore → ChatGPT tool delivery.
- 메인폰의 독립 isolated-worktree remote execution.
- 메인폰과 서버폰이 서로 다른 branch/worktree에서 동시에 commit/push하는 two-device concurrency 검증.
- repository-wide `RCR-D17`에 authorized remote execution 기본값 반영.
- PR #2114를 통한 core-goal completion 상태와 운영 하드닝 backlog 분리.

따라서 이 실험의 핵심 목표는 **COMPLETE**로 종료한다. 현재 상태 authority는 `../CURRENT.md`, 선택적 후속 운영 하드닝은 `OPERATIONS_BACKLOG.md`, 상세 증거는 `checkpoints/`가 소유한다.

과거 smoke PR/branch/worktree의 보존 또는 정리는 core completion을 막지 않으며 `OPERATIONS_BACKLOG.md`의 별도 cleanup 정책 항목으로 남긴다. 서로 다른 두 ChatGPT 로그인 계정의 동시 호출 identity를 더 강하게 재증명하는 작업도 필요할 때만 privacy-safe 별도 checkpoint로 수행한다.

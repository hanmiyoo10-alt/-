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
- 아직 ChatGPT 쪽에서 실제 command/file tool 호출을 실행해 서버폰에 도달하는지는 미검증.

보안상 device code, device ID, account address는 기록하지 않는다.

## 현재 실험 checkpoint

다음 실험은 **Remote Desktop Commander 모바일 ChatGPT에서 실제 read-only tool invocation 확인**이다.

첫 호출은 다음 범위로 제한한다.

```text
pwd
git branch --show-current
git status -sb
top-level directory listing
```

성공하면 다음 경로가 실제로 성립하는지 확인할 수 있다.

```text
일반 ChatGPT
→ 공개 ChatGPT Plugin/App
→ Remote Desktop Commander
→ 서버폰 Ubuntu PRoot
→ /root/nyang-repo
```

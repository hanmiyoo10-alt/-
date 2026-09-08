# CURRENT — ChatGPT Mobile Coder Lab

최종 갱신 기준: **2026-09-09**

새 채팅이나 다른 ChatGPT 계정에서 이 실험을 이어갈 때 가장 먼저 읽는 현재 상태 체크포인트다.

## 목표 — ACTIVE

일반 ChatGPT 채팅을 주 인터페이스로 유지하면서 서버폰의 실제 개발환경에 파일/쉘/Git/테스트 도구를 연결해, 체감상 Codex에 가까운 작업 루프를 만드는 것이 목표다.

중요한 요구:

- Android 폰 두 대만으로 운영 가능할 것.
- 두 폰은 서로 다른 ChatGPT 계정을 사용한다.
- 두 계정은 같은 GitHub repository에서 서로 다른 작업을 병렬 수행한다.
- 일반 ChatGPT 채팅 할당량을 주력으로 쓰는 경로를 우선 탐색한다.
- Codex CLI는 보조 경로로 유지 가능하지만 주력 목표와 동일시하지 않는다.

## 확인된 환경

### 서버폰

- Termux 사용.
- Ubuntu 24.04.4 LTS PRoot 사용.
- architecture: `aarch64`.
- tmux 설치 완료.
- 작업 repository: `/root/nyang-repo`.
- 확인 시점 branch: `server/work`.
- 확인 시점 tracking: `server/work...origin/server/work`.
- Tailscale 사용 가능.

### 메인폰

- Termux + Ubuntu PRoot + tmux 기반 `nyang` 작업 세션을 사용하도록 구성.
- 기본 작업 branch 의도: `mainphone/work`.
- `nyang-sync`는 현재 branch가 device branch이고 working tree가 clean일 때만 fetch/fast-forward하도록 작성됨.
- 바깥 Termux의 `~/simcore-repo`는 한 시점에 `origin/main`보다 5328 commits 뒤였음. 이 checkout은 자동 reset/pull하지 않고 별도 역할을 확인해야 한다.

## Codex CLI 실험 — TECHNICALLY WORKING / QUOTA BLOCKED

서버폰 Ubuntu PRoot 안에서 공식 Linux ARM64 Codex standalone binary를 설치했다.

확인된 사항:

- binary: `/usr/local/bin/codex`.
- 확인 버전: `codex-cli 0.153.4`.
- `codex --help` 정상 실행.
- `codex login --device-auth`로 서버폰용 ChatGPT 계정 로그인 성공.
- `/root/nyang-repo`를 대상으로 `codex exec --sandbox read-only` 세션 생성까지 성공.
- 실제 모델 작업 시작 시 Codex usage limit에 도달해 repository 분석 결과를 받기 전에 중단됨.

추가 경고:

- system `bubblewrap`이 PATH에 없어 bundled bubblewrap fallback을 사용한다는 경고가 있었음.
- `codex-code-mode-host`가 없어 Code Mode가 unavailable하다는 경고가 있었음.
- 위 두 경고가 당시 실패 원인은 아니었고 실제 중단 원인은 usage limit이었다.

## 중요한 목표 수정

Codex CLI는 실제 shell/files/test 기능 폭이 넓지만 **Codex 전용/agentic usage allowance를 사용**한다.

따라서 이 실험의 주 목표를 아래처럼 재정의했다.

```text
일반 ChatGPT 채팅이 reasoning
+
별도 bridge/plugin/app가 로컬 filesystem/shell 실행
```

즉 "모바일에서 Codex CLI를 편하게 쓰기"보다 "일반 ChatGPT 채팅 자체에 Codex 같은 손발을 붙이기"가 우선이다.

## Remote Desktop Commander 실험 — DEVICE ONLINE / TOOL CALL NOT YET VERIFIED

서버폰에서 `@wonderwhy-er/desktop-commander@0.2.48`의 `remote` 모드를 직접 실행했다.

첫 Termux 바깥 실행에서는:

- local Desktop Commander MCP 연결 성공.
- remote MCP 연결 성공.
- device authorization 성공.
- device 등록 성공.
- 이후 realtime channel이 transport failure와 reconnect loop에 들어감.

다음 시도는 Ubuntu PRoot 내부 `/root/nyang-repo`에서 실행했다.

확인된 결과:

```text
Connected to Desktop Commander MCP
Connected to Remote MCP
Authorization successful
Device ready
Channel error: transport failure
Recreating channel...
Channel subscribed (recovered after 1 attempt)
Device marked as online
Presence tracked
```

현재 의미:

- 서버폰 device agent 실행 성공.
- Remote Desktop Commander 계정 인증 성공.
- remote realtime channel이 일시 실패 후 자동 복구됨.
- remote service에서 서버폰 device가 online/presence 상태까지 진입함.
- 아직 ChatGPT 쪽 실제 tool invocation으로 `pwd`, file read, shell command가 서버폰에서 실행되는지는 검증하지 않음.

중요한 환경 관찰:

- Ubuntu PRoot 내부에서 실행해도 Node 실행 파일 자체는 Termux의 `/data/data/com.termux/files/usr/bin/node`를 사용한다.
- 하지만 프로세스의 HOME/workdir은 Ubuntu 쪽 `/root` 및 `/root/nyang-repo` 문맥으로 실행되는 상태가 확인됐다.
- 이 조합이 실제 filesystem/shell tool 호출에서 정상적으로 Ubuntu 경로를 다루는지는 다음 단계에서 확인해야 한다.

민감정보인 device code, device ID, 계정 주소는 repository 기록에 저장하지 않는다.

## 후보 조사 — ACTIVE

현재 조사된 계열:

1. Custom MCP 직결형
   - `hoangcoderr/chatgpt-local-coder`
   - `rebel0789/codexpro`
   - `Waishnav/devspace`
   - `fwerkor/local-shell-mcp`
   - `JuanseGZZ/localmcpcoder`

2. 로컬 하위 에이전트형
   - `pickleshell/pickleshell`

3. ChatGPT 공개 Plugin/App형
   - Remote Desktop Commander
   - SentinelX
   - TRIGGERcmd

Custom MCP 계열은 목표 적합도가 높지만 현재 모바일 ChatGPT surface 지원 제약이 핵심 장애물이다. 공개 Plugin/App형은 모바일 ChatGPT에서 실제 호출 가능한지 직접 검증할 가치가 가장 높다.

## 현재 1순위 다음 단계

**Remote Desktop Commander가 Android ChatGPT 앱에서 실제로 서버폰의 read-only tool call을 수행하는지 검증한다.**

검증 순서:

1. 현재 서버폰 Ubuntu PRoot의 Remote Desktop Commander 프로세스를 online 상태로 유지.
2. ChatGPT 모바일에서 해당 플러그인/App 연결 상태 확인.
3. 최초 호출은 repository를 수정하지 않는 `pwd`, `git branch --show-current`, `git status -sb`, top-level listing 수준으로 제한.
4. 실제 실행 workdir이 `/root/nyang-repo`이고 branch가 `server/work`인지 확인.
5. 성공 후 read-only file read/search.
6. 그 뒤에만 별도 feature worktree에서 쓰기/patch/test 실험.

PocketRisu 서비스와 기존 부팅 stack은 이 검증 때문에 변경하지 않는다.

## 안전 원칙

- 실제 feature 작업 전에는 device별 branch/worktree를 분리한다.
- 같은 working tree를 두 ChatGPT 계정이 동시에 수정하지 않는다.
- 자동 sync는 dirty tree를 건드리지 않는다.
- 실험 bridge에 전체 디스크/무제한 shell을 바로 열지 않는다.
- 토큰, 인증 코드, session id, device ID, API key, SSH key, private log 원본은 Git에 기록하지 않는다.

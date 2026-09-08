# Candidate Survey — ChatGPT as a local coding agent

기준 시점: **2026-09-09**

이 문서는 "일반 ChatGPT 채팅을 reasoning layer로 유지하면서 로컬 filesystem/shell/git/test를 붙인다"는 목표에 맞춰 조사한 후보를 정리한다.

외부 프로젝트의 stars, 지원 상태, 제품 정책은 변할 수 있다. 아래 값은 관찰 시점의 참고값이며 현재 truth가 필요하면 다시 확인한다.

## 평가 축

- 일반 ChatGPT가 주 reasoning layer인가.
- 로컬 파일 read/write가 가능한가.
- shell/process 실행이 가능한가.
- Git/patch/test loop까지 갈 수 있는가.
- 모바일 공식 ChatGPT에서 사용할 가능성이 있는가.
- Android 서버폰에 붙이기 쉬운가.
- 별도 Codex usage allowance를 강제로 소비하는가.
- 권한을 제한하거나 격리하기 쉬운가.

## 1. `hoangcoderr/chatgpt-local-coder`

Repository:

- https://github.com/hoangcoderr/chatgpt-local-coder

의도:

- ChatGPT web을 local coding agent로 사용.
- read/write files.
- shell.
- Git.
- apply_patch.
- Developer Mode + MCP + secure tunnel.

장점:

- 목표가 거의 정확히 일치.
- 구현 범위가 개발 작업 중심이라 이해하기 쉬움.

제약:

- Custom MCP를 ChatGPT에 연결하는 경로에 의존.
- 현재 핵심 문제는 모바일 공식 ChatGPT surface 지원 여부.

판정:

`HIGH FIT / MOBILE BLOCKER`

## 2. `rebel0789/codexpro`

Repository:

- https://github.com/rebel0789/codexpro

관찰 시점 약 1.8k stars.

설명 자체가 ChatGPT Developer Mode를 repo용 local coding agent로 사용하는 MCP 프로젝트다.

장점:

- chatgpt-local-coder보다 생태계/사용자 규모가 큼.
- local development, MCP, tunnel, ChatGPT를 직접 겨냥.

제약:

- 역시 Custom MCP/Developer Mode surface 의존.
- 모바일이 직접 지원되지 않으면 사용자의 주 UI 요구와 충돌.

판정:

`HIGH FIT / MOBILE BLOCKER`

## 3. `Waishnav/devspace`

Repository:

- https://github.com/Waishnav/devspace

관찰 시점 약 4.5k stars.

설명:

- Minimal Coding Agent Harness on MCP for ChatGPT/Claude/etc.

장점:

- 단순 shell bridge보다 coding agent harness 쪽으로 더 넓음.
- 여러 모델/클라이언트를 대상으로 함.
- 프로젝트 규모와 관심도가 큼.

제약:

- ChatGPT 모바일의 custom MCP surface 문제는 그대로 남음.
- 현재 사용자 환경에는 기능이 과할 수도 있음.

판정:

`VERY INTERESTING / MOBILE BLOCKER`

## 4. `fwerkor/local-shell-mcp`

Repository:

- https://github.com/fwerkor/local-shell-mcp

관찰 시점 약 67 stars.

설명:

- LLM에 CLI environment를 제공.
- remote control/MCP 성격.

장점:

- shell 중심이라 범용성이 높음.
- coding뿐 아니라 서버 운영에도 연결 가능.

제약:

- 범용 shell은 권한 blast radius가 큼.
- 역시 custom MCP surface가 핵심 연결점.

판정:

`GOOD TECH FIT / NEEDS TIGHT SECURITY`

## 5. `JuanseGZZ/localmcpcoder`

Repository:

- https://github.com/JuanseGZZ/localmcpcoder

설명:

- ChatGPT에 PC의 shell/file/search 도구를 MCP로 제공.
- Cloudflare tunnel 사용.

장점:

- 아이디어가 단순하고 직관적.

제약:

- 프로젝트 규모가 작음.
- 사용자에게 이미 Tailscale이 있어 tunnel 전략을 그대로 따를 필요는 없음.
- 모바일 custom MCP 문제.

판정:

`REFERENCE IMPLEMENTATION`

## 6. `pickleshell/pickleshell`

Repository:

- https://github.com/pickleshell/pickleshell

설명:

- ChatGPT에서 local AI agent와 interactive session.
- OpenCode/remote-development/self-hosted 성격.

장점:

- 별도 coding agent를 실제 개발환경에 두므로 agent loop가 강력할 가능성이 높음.
- ChatGPT는 조종석으로 사용할 수 있음.

제약:

- local agent가 별도 reasoning layer가 됨.
- 사용자의 핵심 목표인 "일반 ChatGPT 자체가 Codex처럼 reasoning"과는 다름.

판정:

`POWERFUL BUT DIFFERENT GOAL`

## 7. Remote Desktop Commander — ChatGPT Plugin/App

현재 ChatGPT Plugin Directory에서 발견.

설명상 제공 목적:

- authorized computer filesystem 접근.
- terminal command 실행.
- process 관리.
- file edit.
- development workflow automation.
- Remote MCP relay.

왜 중요한가:

Custom MCP URL을 사용자가 직접 Developer Mode에 등록하는 방식이 아니라, **이미 공개 ChatGPT Plugin/App로 배포된 후보**다.

따라서 현재 최우선 질문은 구현 능력보다:

```text
Android 공식 ChatGPT 앱에서 실제 plugin invocation이 가능한가?
```

이다.

서버 측은 Linux + Node 계열 agent이므로 현재 서버폰 Ubuntu PRoot와 궁합이 좋을 가능성이 있다.

판정:

`CURRENT #1 EXPERIMENT`

## 8. SentinelX — ChatGPT Plugin/App

현재 ChatGPT Plugin Directory에서 발견.

목적:

- Linux server 관리.
- inspection commands.
- file read/search/edit.
- script 실행.
- service/log 관리.

특징:

- per-host allowlist로 허용 명령/서비스를 제한하는 보안 철학.

장점:

- 서버폰에 unrestricted shell을 바로 여는 것보다 안전한 기본 형태.
- 사용자의 기존 운영 습관과 잘 맞음.

제약:

- systemd 중심 설치/운영을 가정할 경우 Android PRoot에서 adapter가 필요할 수 있음.
- full coding-agent UX보다 server management에 더 가까울 수 있음.

판정:

`STRONG SAFE FALLBACK`

## 9. TRIGGERcmd — ChatGPT Plugin/App

현재 ChatGPT Plugin Directory에서 발견.

목적:

- 연결된 컴퓨터에서 미리 등록한 command를 ChatGPT가 실행.
- command 설명/parameter를 MCP tool처럼 노출.

장점:

- 공개 Plugin/App 경로.
- command allowlist 방식으로 매우 명확한 권한 제한 가능.

제약:

- arbitrary file browsing/patching보다는 predeclared command 실행 중심.
- Codex 같은 자유로운 repo exploration을 재현하려면 wrapper command를 많이 설계해야 함.

판정:

`USEFUL BUILDING BLOCK, NOT FULL CODEX REPLACEMENT`

## 후보군 비교 요약

```text
목표 일치도 최상
  Custom MCP coder 계열
       ↓
모바일 surface 제약
       ↓
공개 Plugin/App 계열을 우선 실제 검증
       ↓
Remote Desktop Commander
       ↓
SentinelX / TRIGGERcmd
```

## 현재 우선순위

1. Remote Desktop Commander Android invocation 확인.
2. 성공 시 최소권한 device-agent 연결.
3. 실패 시 SentinelX 모바일 invocation 및 PRoot 적합성 확인.
4. 그 다음 TRIGGERcmd로 bounded command bridge 가능성 평가.
5. Custom MCP 모바일 지원이 열리면 CodexPro/DevSpace/chatgpt-local-coder를 다시 최상위 후보로 재평가.

## 보류한 방향

### Codex CLI를 주력으로 사용

기술적으로 서버폰에서 동작함을 확인했으나 Codex usage allowance를 사용하므로 현재 목표의 주력 경로에서 제외한다.

### Cloudflare/ngrok를 먼저 도입

이미 Tailscale을 사용 중이며, 공개 tunnel은 필요성이 증명될 때만 추가한다. 다만 ChatGPT Plugin vendor relay가 자체 네트워크 방식을 요구하면 그 계약을 따른다.

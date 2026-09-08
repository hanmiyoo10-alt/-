# Setup Evidence — server phone and workspaces

기준 시점: **2026-09-09**

이 문서는 대화 중 실제 터미널에서 확인된 환경 증거를 민감정보 없이 요약한다.

인증 code, account identifier, session id, token, SSH key는 저장하지 않는다.

## 서버폰 Termux

초기 `nyang` 실행 시:

```text
/data/data/com.termux/files/home/bin/nyang: line 7: tmux: command not found
/data/data/com.termux/files/home/bin/nyang: line 29: exec: tmux: not found
```

대응:

```bash
pkg install tmux -y
```

설치 후 tmux package 설치 성공 및 `nyang` session 생성 성공.

주의:

```bash
tmux -v
```

를 실행했을 때 version check가 아니라 session `0`이 생성됐다. version 확인은:

```bash
tmux -V
```

를 사용한다.

## 서버폰 Ubuntu PRoot system

실제 출력 요약:

```text
PRETTY_NAME="Ubuntu 24.04.4 LTS"
VERSION_ID="24.04"
architecture: aarch64
HOME=/root
```

Kernel 표시:

```text
Linux localhost 6.17.0-PRoot-Distro ... aarch64 GNU/Linux
```

## 메모리

확인 시점:

```text
Mem total: 10 GiB
available: 약 2.7 GiB
Swap total: 6 GiB
Swap free: 약 3 GiB
```

이 값은 기기 runtime 상태에 따라 변한다.

## PATH / Node / npm

Ubuntu shell 안 PATH:

```text
/usr/local/sbin
/usr/local/bin
/usr/sbin
/usr/bin
/sbin
/bin
/data/data/com.termux/files/usr/bin
```

확인된 Node/npm:

```text
/data/data/com.termux/files/usr/bin/node
v26.4.0

/data/data/com.termux/files/usr/bin/npm
11.19.0
```

즉 당시 Ubuntu PRoot는 Node/npm을 Ubuntu 자체 package가 아니라 바깥 Termux binary에서 사용하고 있었다.

이 경계를 피하기 위해 Codex는 npm global install 대신 standalone Linux ARM64 binary로 설치했다.

## Git

확인된 Git version:

```text
git version 2.55.0
```

## 서버폰 repository

작업 경로:

```text
/root/nyang-repo
```

확인된 상태:

```text
## server/work...origin/server/work
server/work
```

즉 해당 확인 시점에는 `server/work` branch가 존재하고 remote tracking도 정상 표시됐다.

## 네트워크 preflight

Ubuntu PRoot에서:

```text
curl -I -L --max-time 10 https://chatgpt.com
```

요청은 HTTP/2 `403`을 반환했다.

이 결과만으로 Codex auth 실패를 의미하지는 않았고, 이후 실제 Codex device auth는 성공했다.

## Codex standalone 설치

다운로드 대상:

```text
https://github.com/openai/codex/releases/latest/download/codex-aarch64-unknown-linux-musl.tar.gz
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

`codex --help` 정상 실행.

## Codex device auth

Ubuntu interactive shell에서:

```bash
codex login --device-auth
```

실행.

browser login link와 device code가 표시됐고, 서버폰에서 사용할 ChatGPT 계정으로 로그인 성공.

민감한 인증 code는 기록하지 않는다.

## Codex read-only smoke test

대상:

```text
/root/nyang-repo
```

실행 형태:

```bash
codex exec \
  --sandbox read-only \
  --cd /root/nyang-repo \
  '<read-only repository inspection prompt>'
```

확인된 세션 설정:

```text
workdir: /root/nyang-repo
approval: never
sandbox: read-only
```

경고 1:

```text
Codex could not find bubblewrap on PATH.
Codex will use the bundled bubblewrap in the meantime.
```

경고 2:

```text
Code Mode is unavailable because codex-code-mode-host was not found.
```

최종 중단:

```text
ERROR: You've hit your usage limit.
```

판정:

- binary startup: PASS.
- ChatGPT auth: PASS.
- repo workdir selection: PASS.
- read-only sandbox session creation: PASS.
- model task completion: BLOCKED BY USAGE LIMIT.
- Android/PRoot sandbox compatibility: 아직 완전 검증되지 않았지만 당시 직접 실패 원인은 아님.

## 메인폰 repository 관찰

Termux 바깥의 한 checkout:

```text
/data/data/com.termux/files/home/simcore-repo
```

resume check 당시:

```text
branch: main
origin/main only: 5328
local HEAD only: 0
working tree clean
```

이 checkout은 자동 reset/revert/checkout 없이 보존됐다.

별도 tmux `nyang` session의 Ubuntu PRoot workspace:

```text
/root/nyang-repo
```

에서 당시:

```text
## main...origin/main
```

이 확인된 뒤, 메인폰 전용 branch intent를 `mainphone/work`로 구성하는 wrapper와 sync script를 작성했다.

`mainphone/work` 실제 현재 checkout 여부는 새 작업 시작 시 다시 확인한다.

## 다음 환경 증거

Remote Desktop Commander 실험을 시작하면 다음을 추가 기록한다.

- Android ChatGPT plugin invocation 가능 여부.
- device-side agent 설치 방식.
- PRoot/Termux에서의 process 유지 방식.
- 최소권한 연결 범위.
- read-only temp directory test.
- repository read-only test.

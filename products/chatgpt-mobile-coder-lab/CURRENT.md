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

## Remote Desktop Commander 실험 — LOCAL COMMIT LOOP VERIFIED

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

이후 Android ChatGPT에서 Remote Desktop Commander를 실제 호출해 서버폰에 read-only 명령이 도달하는 것을 확인했다.

검증 결과:

```text
pwd
→ /root/.npm/_npx/.../@wonderwhy-er/desktop-commander/dist

git -C /root/nyang-repo branch --show-current
→ server/work

git -C /root/nyang-repo status -sb
→ ## server/work...origin/server/work
```

또한 `/root/nyang-repo` 최상위 목록에서 `.agents`, `.git`, `.github`, `README.md`, `config`, `docs`, `local`, `plugins`, `products`, `scripts`, `study`, `tools` 등 repository 실제 항목을 읽는 데 성공했다.

추가 read/search 검증:

- `/root/nyang-repo/README.md`의 처음 40줄을 실제로 읽고 repository 목적을 요약하는 데 성공.
- `/root/nyang-repo` 전체에서 문자열 검색 명령 수행 성공.
- 당시 `chatgpt-mobile-coder-lab` 문자열이 발견되지 않은 이유는 remote tool 실패가 아니라 `server/work`가 `origin/main`보다 50 commits 뒤에 있었기 때문으로 확인됨.
- `server/work...origin/main`은 `0 50`으로 확인되어 `server/work`에 독자 커밋은 없고 `origin/main`이 fast-forward 방향으로 50 commits 앞선 상태였음.

### 첫 disposable write smoke test — PASS

기존 `/root/nyang-repo`와 `server/work`를 수정하지 않고, 최신 `origin/main`에서 별도 detached worktree를 생성했다.

```text
/root/nyang-worktrees/remote-write-smoke
```

확인된 결과:

```text
initial worktree status
→ ## HEAD (no branch)

HEAD
→ bba7e5f2
```

새 worktree 안에서만 `REMOTE_DESKTOP_COMMANDER_SMOKE.txt`를 생성하고 정확한 파일 내용을 다시 읽는 데 성공했다.

```text
remote desktop commander write smoke test
```

파일 생성 후 Git 상태:

```text
?? REMOTE_DESKTOP_COMMANDER_SMOKE.txt
```

테스트 파일 삭제 후:

```text
status --short
→ no output
```

### tracked-file patch smoke test — PASS

같은 disposable worktree에서 기존 tracked file인 `README.md`를 대상으로 patch-level smoke test를 수행했다.

원본 SHA-256:

```text
37e90fae2932a1bc3d7bf6b732d02231c071d1659450ddca12eb3210f2a67514
```

README 끝에 정확히 한 줄을 추가했다.

```text
remote desktop commander tracked patch smoke test
```

변경 중 검증 결과:

```text
git diff --check
→ no output

git status --short
→ M README.md
```

`git diff -- README.md`는 의도한 한 줄 추가만 표시했다.

이후 `git restore --source=HEAD -- README.md`로 원상복구했다.

복구 후 SHA-256:

```text
37e90fae2932a1bc3d7bf6b732d02231c071d1659450ddca12eb3210f2a67514
```

원본 SHA-256과 완전히 동일했다.

최종 검증:

```text
git status --short
→ no output

git diff --check
→ no output
```

### named branch + local commit smoke test — PASS

기존 `/root/nyang-repo`, `server/work`, 기존 detached smoke worktree를 수정하지 않고 최신 `origin/main`에서 별도 named branch/worktree를 생성했다.

```text
branch: server/remote-commit-smoke-20260909
worktree: /root/nyang-worktrees/remote-commit-smoke-20260909
base: origin/main@61de5ca6
```

새 worktree에 정확히 한 파일만 생성했다.

```text
products/chatgpt-mobile-coder-lab/docs/checkpoints/2026-09-09-remote-local-commit-smoke.md
```

commit 전 검증:

```text
git diff --check
→ no output

git status --short
→ ?? products/chatgpt-mobile-coder-lab/docs/checkpoints/2026-09-09-remote-local-commit-smoke.md

git diff --cached --check
→ no output

git diff --cached --stat
→ 1 file changed, 9 insertions(+)

git diff --cached --name-only
→ products/chatgpt-mobile-coder-lab/docs/checkpoints/2026-09-09-remote-local-commit-smoke.md
```

영구 Git identity 설정은 바꾸지 않고 commit 명령에만 임시 identity를 주입했다.

local commit 생성 성공:

```text
90add16f test(chatgpt-mobile-coder): verify remote local commit
```

commit 후 상태:

```text
## server/remote-commit-smoke-20260909...origin/main [ahead 1]
```

commit diff 검증:

```text
git diff HEAD^ HEAD --check
→ no output

git diff --name-only HEAD^ HEAD
→ products/chatgpt-mobile-coder-lab/docs/checkpoints/2026-09-09-remote-local-commit-smoke.md
```

마지막 원래 repository 확인:

```text
branch: server/work
status: clean
```

`90add16f`는 아직 push되지 않은 서버폰 local-only commit이다.

현재 의미:

- 일반 ChatGPT 모바일 채팅에서 Remote Desktop Commander plugin/app 호출 성공.
- remote service를 통해 서버폰 device에 실제 shell/filesystem 요청 전달 성공.
- Ubuntu PRoot 내부 `/root/nyang-repo` read/search 성공.
- Git branch/status/fetch/rev-list/worktree 명령 실행 성공.
- 별도 detached worktree 생성 성공.
- 별도 worktree 안에서 파일 create/read/delete 성공.
- existing tracked file edit와 Git diff 검토 성공.
- `git diff --check` 기반 기본 patch 검증 성공.
- SHA-256 기반 byte-exact restore 검증 성공.
- 별도 named branch/worktree 생성 성공.
- 정확히 한 파일만 stage하고 staged diff를 검증한 뒤 local commit 생성 성공.
- permanent `server/work` working tree는 모든 단계에서 clean 상태로 보존됨.
- 따라서 `ChatGPT → Remote Desktop Commander → Android 서버폰 → Ubuntu PRoot → isolated named Git worktree → bounded change → staged validation → local commit` 경로가 실제로 성립함.

중요한 환경 관찰:

- `pwd`는 `/root/nyang-repo`가 아니라 npx로 설치된 Desktop Commander package의 `dist` directory를 반환한다.
- 따라서 Remote Desktop Commander process의 기본 current working directory를 repository root로 가정하면 안 된다.
- repository 작업은 명시적인 absolute path 또는 `git -C <absolute-path> ...` 같은 형태를 우선 사용해야 한다.
- Ubuntu PRoot 내부에서 실행해도 Node 실행 파일 자체는 Termux의 `/data/data/com.termux/files/usr/bin/node`를 사용한다.
- 이 경계에도 불구하고 `/root` 내부의 repository와 별도 worktree를 정상적으로 읽고 수정했다.

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

현재 서버폰 실험 기준으로 Remote Desktop Commander는 단순 read/write 후보 수준을 넘어 isolated local-commit development bridge로 동작함이 확인됐다.

## 현재 1순위 다음 단계

**현재 local-only smoke branch를 명시적으로 push하고 GitHub에서 exact commit/branch를 확인한 뒤 PR 생성까지 publication boundary를 검증한다.**

검증 순서:

1. `/root/nyang-worktrees/remote-commit-smoke-20260909`가 clean이고 HEAD가 `90add16f`인지 다시 확인한다.
2. `origin/main`이 local commit의 parent/base와 예상 관계인지 확인하고 unexpected divergence면 중단한다.
3. 해당 branch 하나만 `origin`에 push한다.
4. GitHub remote branch가 local commit과 exact SHA로 일치하는지 확인한다.
5. PR 생성 전 changed files가 정확히 한 파일인지 다시 검증한다.
6. smoke 목적의 PR을 `main` 대상으로 생성한다.
7. merge는 하지 않는다.
8. PR/remote branch 정리는 별도 명시적 단계로 수행한다.

PocketRisu 서비스와 기존 부팅 stack은 이 검증 때문에 변경하지 않는다.

## 안전 원칙

- 실제 feature 작업 전에는 device별 branch/worktree를 분리한다.
- 같은 working tree를 두 ChatGPT 계정이 동시에 수정하지 않는다.
- 자동 sync는 dirty tree를 건드리지 않는다.
- 실험 bridge에 전체 디스크/무제한 shell을 바로 열지 않는다.
- 기본 cwd를 신뢰하지 않고 repository/worktree absolute path를 사용한다.
- 초기 write 실험은 permanent device branch가 아니라 disposable worktree에서만 수행한다.
- tracked patch 전에는 원본 hash/content를 먼저 확인하고, 검증 후 clean 복귀를 확인한다.
- commit 전에는 staged file set과 staged diff를 명시적으로 검증한다.
- commit identity가 필요하면 smoke test에서는 per-command temporary identity를 사용하고 global/local Git config를 바꾸지 않는다.
- push/PR/merge는 각각 별도 검증 경계로 취급한다.
- 토큰, 인증 코드, session id, device ID, API key, SSH key, private log 원본은 Git에 기록하지 않는다.

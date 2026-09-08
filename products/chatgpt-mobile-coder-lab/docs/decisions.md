# Decisions — ChatGPT Mobile Coder Lab

이 문서는 현재까지의 실험에서 채택한 설계 결정을 기록한다. 결정은 production truth가 아니며 새 증거가 나오면 변경할 수 있다.

## D-001 — 두 ChatGPT 계정은 고정 역할이 아닌 독립 작업자다

상태: `ACTIVE`

### 결정

메인폰 ChatGPT와 서버폰 ChatGPT를 각각 Builder/Reviewer처럼 고정하지 않는다.

두 계정 모두:

- 분석.
- 구현.
- 리뷰.
- 문서화.
- GitHub 작업.

을 수행할 수 있는 독립 작업자로 취급한다.

### 이유

실제 사용 패턴이 두 계정 모두 같은 repository 안에서 서로 다른 작업을 병렬 수행하는 방식이기 때문이다.

## D-002 — Same repo, separate working tree

상태: `ACTIVE`

### 결정

같은 repository를 사용하더라도 두 계정이 동시에 같은 working tree를 수정하지 않는다.

### 기본 형태

```text
account A → mainphone/* → worktree A
account B → server/*    → worktree B
```

### 이유

미커밋 변경, checkout, sync, test 결과, rollback의 소유권을 분리하기 위해서다.

## D-003 — Device branch는 착륙 지점, feature branch/worktree가 실제 작업 단위다

상태: `ACTIVE`

### 결정

`mainphone/work`, `server/work`를 영구적인 모든 기능 작업 branch로 쓰지 않는다.

실제 변경은 가능한 경우 feature branch 또는 독립 worktree로 분리한다.

### 이유

같은 기기에서 여러 작업이 겹칠 수 있고, 두 ChatGPT 계정 간 병렬 작업을 안전하게 유지해야 하기 때문이다.

## D-004 — Dirty tree에서는 자동 sync 금지

상태: `ACTIVE`

### 결정

자동 fetch/fast-forward는 working tree가 clean할 때만 수행한다.

### 이유

사람 또는 ChatGPT/agent가 진행 중인 변경을 자동화가 덮어쓰거나 branch 이동으로 방해하는 것을 막기 위해서다.

## D-005 — Tailscale 우선, 공개 tunnel은 필요할 때만

상태: `ACTIVE`

### 결정

기기 간 직접 통신이 필요한 자체 서비스는 기존 Tailscale을 우선 사용한다.

Cloudflare/ngrok 등 공개 tunnel은:

- ChatGPT SaaS가 직접 접근해야 하거나,
- 특정 plugin/app가 요구하거나,
- Tailscale만으로 목적을 달성할 수 없는 경우

에만 검토한다.

### 주의

ChatGPT SaaS가 사용자의 Tailnet 주소에 직접 접근할 수 있다는 뜻은 아니다. vendor relay 또는 public endpoint가 필요한 구조는 별도로 판단한다.

## D-006 — PocketRisu runtime과 coding bridge를 분리한다

상태: `ACTIVE`

### 결정

coding bridge/agent 실험 때문에 PocketRisu runtime, DB, service, boot stack을 불필요하게 수정하지 않는다.

### 이유

PocketRisu는 이미 별도 운영 authority와 안정 baseline을 갖고 있으며, 이 실험 실패가 기존 서비스 가용성에 영향을 주면 안 된다.

## D-007 — Codex CLI는 보조 엔진으로 유지한다

상태: `ACTIVE`

### 결정

서버폰에 설치된 공식 Codex CLI를 제거하지 않지만 현재 목표의 주력 해결책으로 취급하지 않는다.

### 이유

- Android → Termux → Ubuntu PRoot → ARM64에서 실행 가능성을 확인했다.
- ChatGPT device auth도 성공했다.
- 하지만 실제 model 작업은 Codex usage allowance를 사용한다.
- 사용자의 핵심 목표는 일반 ChatGPT 채팅 할당량과 채팅 UX를 주력으로 쓰는 것이다.

## D-008 — 일반 ChatGPT를 reasoning layer로 유지하는 bridge를 우선한다

상태: `ACTIVE`

### 결정

우선순위는 아래 구조다.

```text
일반 ChatGPT
→ Plugin/App/relay tool call
→ 서버폰 filesystem/shell/git/test
```

### 현재 1순위

Remote Desktop Commander의 모바일 ChatGPT 실사용 가능성.

### 차선

- SentinelX.
- TRIGGERcmd.
- 향후 모바일 custom MCP 지원 시 CodexPro/DevSpace/chatgpt-local-coder 재평가.

## D-009 — 권한은 단계적으로 확장한다

상태: `ACTIVE`

### 결정

새 bridge를 연결할 때 권한을 아래처럼 확대한다.

```text
connectivity
→ pwd / ls
→ temp read-only
→ repo read-only
→ isolated worktree write
→ bounded test commands
→ git operations
```

전체 디스크 쓰기와 unrestricted shell을 초기 기본값으로 두지 않는다.

## D-010 — 외부 제품 정책은 이 repository가 authority가 아니다

상태: `ACTIVE`

### 결정

ChatGPT의 모바일 plugin/MCP 지원, 요금제, Codex usage 정책 등은 이 문서의 고정 truth로 취급하지 않는다.

### 이유

제품 정책은 바뀔 수 있다. 이 저장소에는 당시 관찰과 실험 판단만 기록하고, 실제 작업 전에는 현재 공식 문서/UI를 다시 확인한다.

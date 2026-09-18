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
→ authorized Plugin/App/relay tool call
→ explicit mainphone/serverphone execution surface
→ explicit repository/worktree
→ filesystem/shell/git/test
```

### 현재 1순위

Remote Desktop Commander를 서버폰과 메인폰 양쪽에서 검증된 기본 실행 bridge로 사용한다. 원격 호출은 대상 기기와 absolute repository/worktree path를 명시하고, 실제 변경은 기기별 feature branch/worktree에서 수행한다.
기기별 branch namespace도 `mainphone/*`와 `server/*`로 구분해 remote execution provenance가 Git history와 PR surface에서도 드러나게 한다.
Remote Desktop Commander는 실행 transport일 뿐이며, Git/CI/main-write/release/production authority를 추가하거나 우회하지 않는다.

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
## D-011 — 서버폰 direct-Termux 실행은 별도 RDC endpoint로 분리한다

상태: `ACTIVE`

### 결정

서버폰의 기존 `S` Remote Desktop Commander endpoint는 Ubuntu PRoot 작업면으로 그대로 보존한다.

실제 Termux 문맥이 필요한 작업은 별도 `S-Termux` endpoint를 사용한다. 이 endpoint는 Termux HOME과 Termux Node에서 직접 실행하고, 별도 install/service/log/state 경로를 사용한다.

### 이유

Android 외부 앱의 arbitrary Termux command 실행 권한을 넓히는 것보다 기존 runit/RDC 실행 owner 안에 sibling endpoint를 추가하는 편이 더 좁은 권한·효과 표면이다.

기존 `S` endpoint를 교체하면 이미 검증된 `/root/...` 개발 흐름을 흔들 수 있으므로 병존 구조를 사용한다.

## D-012 - 실행 surface는 semantic requirement로 먼저 선택한다

상태: `ACTIVE`

### 결정

Mobile Coder Lab의 S/M 작업은 현재 online/dirty/readiness 상태보다 먼저 작업의 semantic requirement를 분류한다. Durable v1 routing policy는 [`device-routing.md`](device-routing.md)가 소유한다.

일반 device-agnostic repository 작업은 S Ubuntu PRoot를 기본 선호 surface로 사용하되, D-001/D-002에 따라 M도 합법적인 explicit target/fallback으로 유지한다. S-Termux, M PRIVATE LAB, M VM LAB, S device-local private execution처럼 문맥 자체가 필요한 작업은 그 owner로만 라우팅하며, target이 unavailable하다는 이유로 다른 semantic context로 조용히 우회하지 않는다.

`sm-status`와 owner preflight는 route 선택 뒤의 현재 상태 evidence일 뿐 routing authority가 아니다. 여러 execution context가 필요한 작업은 phase별로 나누고, routing policy 자체는 dispatcher, lease, runtime truth, Git/CI/main-write/release/production authority를 소유하지 않는다.

### 이유

현재 S/M 구조는 두 독립 repository worker와 별도 native-Termux/lab owners를 함께 보존한다. Semantic routing과 current status를 분리해야 기존 owner를 침범하지 않으면서도 반복 가능한 device 선택 정책을 유지할 수 있다.

## D-013 — S/M mutable work uses a separate coordination lease, not routing or health as ownership

상태: `ACTIVE`

### 결정

Mobile Coder Lab에서 병렬 mutable work의 예약은 [`task-lease.md`](task-lease.md)의 MCL-only coordination lease가 소유한다.

Lease는 semantic routing이나 current status를 대체하지 않는다. Repository 작업에서는 먼저 기존 canonical-main Work System의 packet/PR write-scope overlap을 `DISJOINT`로 증명한 뒤 lease를 획득하고, 실제 mutation 직전에도 기존 Git/worktree/currentness guard를 다시 적용한다.

같은 S 또는 M에서도 서로 다른 packet, disjoint scope, 다른 isolated workspace라면 별도 lease로 병렬 작업할 수 있다. 물리 기기 전체를 잠그지 않는다.

V1 lease는 explicit acquire/release와 generation만 사용한다. TTL, inactivity takeover, age-based supersession은 authority가 아니다.

### 이유

`device-routing.md`는 작업의 semantic execution surface를 선택하고 `sm-status`/device owner는 현재 상태를 관찰하지만, 어느 worker가 지금 특정 mutable scope/workspace를 예약했는지는 소유하지 않는다.

이 세 축을 분리해야 routing/status evidence를 write authority로 승격하지 않으면서 두 독립 worker의 중복 claim을 막을 수 있다.
## D-014 — S/M phase handoff uses immutable manifests and completion receipts

상태: `ACTIVE`

### 결정

Mobile Coder Lab의 독립 S/M worker 사이 phase continuity는 [`task-handoff.md`](task-handoff.md)의 immutable `TASK_MANIFEST` + `COMPLETION_RECEIPT` contract가 소유한다.

Manifest는 exact packet-body snapshot, semantic route/executor, normalized scope, workspace, bounded authority/input/output expectations, 그리고 필요한 경우 D-013 lease acquisition evidence를 기록한다. Completion receipt는 같은 manifest의 bounded phase result와 validation/output evidence를 연결하며, mutable phase에서는 matching lease release evidence 뒤에만 유효하다.

이 contract는 Work System packet lifecycle/`DONE`, Work Harness Work Record/Coordination Receipt, D-012 routing, D-013 reservation, Git currentness, CI, merge, release, production authority를 대체하지 않는다. `COMPLETE`는 해당 semantic phase의 evidence disposition일 뿐 whole packet completion이 아니다.

V1은 deterministic immutable envelope만 제공하며 새 workflow writer, central task DB, scheduler/dispatcher, TTL/latest-wins semantics를 추가하지 않는다. Durable GitHub transport가 필요하면 owning packet의 append-only comment를 선호하고 packet body는 lifecycle/close-sync projection으로 남긴다.

### 이유

두 독립 worker가 대화 기억이나 shared mutable filesystem 없이 작업을 넘기려면 exact phase context와 result provenance가 필요하지만, 이를 mutable task truth로 만들면 이미 존재하는 Work System/Harness/routing/lease authority와 충돌한다. Immutable phase evidence로 한정하면 handoff 복구성을 높이면서 기존 owner 경계를 보존할 수 있다.

## D-015 — Android GUI host automation is a separate allowlisted MCL route

상태: `ACTIVE`

### 결정

일반 ChatGPT가 물리 서버폰 S의 ChatGPT Android UI를 관찰하거나 제한적으로 조작해야 하는 작업은 `S_ANDROID_GUI` semantic route로 분리한다.

기본 구성은 다음이다.

```text
ordinary ChatGPT
→ existing S-Termux RDC transport
→ MCL mcl-gui
→ MCL Android GUI companion
→ allowlisted com.openai.chatgpt UI
```

`S-Termux`는 transport일 뿐 GUI authority가 아니다. GUI effect owner는 `products/chatgpt-mobile-coder-lab/device-ops/gui-bridge/**`이고, repository source 변경은 계속 ordinary `S` route의 isolated `server/*` worktree에서 수행한다.

V1은 Android AccessibilityService의 semantic node action과 exact-window screenshot만 허용한다. 대상 package는 `com.openai.chatgpt`로 고정하며 raw-coordinate gesture, Playwright/DOM automation, MediaProjection, network-exposed GUI control, clipboard/history 수집, login/password/account automation을 추가하지 않는다.

AccessibilityService는 사용자가 disclosure를 확인한 뒤 Android Settings에서 직접 활성화해야 한다. 잠금, secure window, permission 부재, stale snapshot, ambiguous node, peer identity 불일치는 성공으로 추론하지 않고 명시적으로 block한다.

### 이유

Repository/shell evidence로는 ChatGPT host/client UI 자체에 표시되는 상태를 증명할 수 없는 작업이 있다. 기존 RDC를 포크하거나 TaskBridge companion의 권한을 확대하는 대신, 별도의 좁은 Android GUI owner를 두면 일반 ChatGPT 중심 운영을 유지하면서도 GUI 효과와 privacy/security 경계를 독립적으로 검증할 수 있다. 이 route의 존재는 live readiness나 cloud continuation을 의미하지 않는다.

## D-016 — Wireless ADB UI reading uses an M-local bounded receipt adapter

상태: `ACTIVE`

### 결정

S의 ChatGPT Android UI를 **읽기 전용으로** 관찰해야 하고, 별도 Android companion 설치 없이 이미 사용자가 승인한 Wireless ADB 연결을 사용할 수 있는 경우 `S_ANDROID_GUI_ADB_READ` route를 사용한다.

기본 구성은 다음이다.

```text
ordinary ChatGPT
→ RDC M
→ M Termux mcl-adb-ui
→ already user-paired Wireless ADB
→ S uiautomator hierarchy
→ M-local parser
→ bounded receipt
```

raw hierarchy는 M 내부에서만 처리하고 ordinary ChatGPT에는 고정된 bounded receipt만 전달한다. 대상은 `SM-G998N` 한 대와 `com.openai.chatgpt` package로 제한하며, ADB serial/IP/port/pairing material, 전체 UI text, conversation body, account/credential-like node는 정상 receipt에 포함하지 않는다.

V1은 `status / snapshot / find-action / find-editable` read-only surface만 소유한다. click/tap/text input, arbitrary `adb shell`, caller-selected serial/path, package install/uninstall, Android settings write, backup/app-private-data read, Play Protect/security-control 변경은 허용하지 않는다.

Wireless Debugging 활성화와 pairing은 사용자 승인 Android state이며 이 owner가 자동으로 만들거나 복구하지 않는다. 연결 실패, 다중 target, model mismatch, raw hierarchy 처리 실패, current tool boundary 차단은 더 강한 상태로 추론하지 않고 `offline / ambiguous / unknown / blocked`로 보존한다.

### 이유

#2452 capability probe에서 M→S Wireless ADB 연결, S model 확인, screenshot, `uiautomator dump` 생성은 검증됐지만 raw hierarchy 자체를 ChatGPT/RDC surface로 가져오는 단계는 platform tool boundary에 막혔다. M 안에서 hierarchy를 파싱하고 필요한 의미 정보만 receipt로 축약하면 그 boundary를 우회하지 않으면서도 read-only GUI evidence를 얻을 수 있다. Action capability는 별도 reviewed packet 전까지 증명하거나 암묵적으로 허용하지 않는다.

## D-017 — Wireless ADB GUI action is a separate stale-guarded semantic route

상태: `ACTIVE`

### 결정

이미 사용자가 승인한 M→S Wireless ADB 연결을 통해 물리 S의 ChatGPT Android UI에 제한된 GUI effect가 필요한 경우 `S_ANDROID_GUI_ADB_ACTION` route를 사용한다.

기본 구성은 다음이다.

```text
ordinary ChatGPT
→ RDC M
→ M Termux mcl-adb-ui
→ already user-paired Wireless ADB
→ fresh S uiautomator hierarchy
→ M-local semantic handle revalidation
→ internally derived bounded input primitive
→ bounded receipt
```

이 route는 D-016의 `S_ANDROID_GUI_ADB_READ`를 대체하지 않는다. D-016은 read-only evidence owner로 남고, action effect는 별도 reviewed command/receipt에서만 발생한다.

V1 action은 다음으로 제한한다.

- fixed package `com.openai.chatgpt` launch;
- repository-owned `new_chat|send` alias lookup;
- fresh snapshot + opaque handle 재검증 뒤 내부 bounds에서 파생한 one-point tap;
- 1..160자의 영문/숫자/underscore/공백 ASCII만 입력;
- 빈 editor → focus → exact post-entry text verification;
- bounded exact visible text wait.

caller가 x/y 좌표, ADB serial, remote path, package/component/action/category 또는 arbitrary shell command를 전달하는 surface는 두지 않는다. node bounds와 파생 좌표는 M-local 내부 상태이며 정상 receipt로 내보내지 않는다.

stale snapshot, missing/ambiguous handle, invalid bounds, non-empty editor, focus 검증 실패, exact post-entry 검증 실패는 더 넓은 입력 방식으로 fallback하지 않고 effect를 차단한다.

명시적으로 제외한다: swipe/gesture/keyevent/clipboard/paste, login/account/unlock/PIN/password/biometric automation, package install/uninstall/clear/force-stop, Android settings/permission/app-op write, backup/app-private-data access, Play Protect/security-control 변경, helper APK.

### 이유

#2453은 raw hierarchy를 ChatGPT/RDC 경계 밖으로 노출하지 않고 M 내부에서 bounded semantic receipt로 변환하는 read-only 경로를 LIVE_PROVEN했다. Action 단계는 ADB input primitive가 AccessibilityNode action과 동등하다고 가정할 수 없으므로, caller coordinates를 허용하지 않고 fresh semantic evidence에서 한 점을 내부 파생한 뒤 stale/ambiguity/text verification을 fail-closed gate로 두는 별도 authority가 필요하다.

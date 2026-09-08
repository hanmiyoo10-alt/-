# ChatGPT Mobile Coder Lab

Android 두 대와 서로 다른 ChatGPT 계정 두 개를 사용해, **일반 ChatGPT 채팅을 가능한 한 Codex 같은 코딩 작업면으로 확장하는 방법**을 조사하고 검증하는 독립 실험 루트다.

> 기준 시점: 2026-09-09  
> 상태: `ACTIVE / INVESTIGATE`  
> 성격: 연구·실험 기록. production/release/runtime authority가 아니다.

## 목표

최종 목표는 가능한 한 아래 사용자 경험에 가까워지는 것이다.

```text
📱 ChatGPT 일반 채팅
"이 저장소 버그 찾아서 고치고 테스트해줘"
        ↓
ChatGPT가 reasoning 담당
        ↓
서버폰의 실제 파일 / shell / git / test에 접근
        ↓
수정 → 검증 → GitHub 반영
```

핵심 요구는 **Codex CLI 자체를 쓰는 것**이 아니라, 평소 사용하는 ChatGPT 채팅을 주 인터페이스와 reasoning layer로 유지하면서 로컬 개발 도구의 손발을 붙이는 것이다.

## 실제 환경

- Android 폰 2대.
- 두 폰의 ChatGPT는 서로 다른 계정이며 둘 다 같은 GitHub 저장소에서 서로 다른 작업을 수행한다.
- Tailscale 사용 중.
- 메인폰 작업 브랜치 기본값: `mainphone/work`.
- 서버폰 작업 브랜치 기본값: `server/work`.
- 서버폰에는 Termux + Ubuntu PRoot + tmux + `/root/nyang-repo` 작업환경이 있다.
- PocketRisu는 별도 제품/운영 경계이며 이 실험의 authority가 아니다.

## 이 루트가 소유하는 것

- 일반 ChatGPT를 로컬 코딩 에이전트처럼 쓰기 위한 후보 조사.
- Android/Termux/PRoot에서의 실행 가능성 검증.
- 두 ChatGPT 계정이 같은 저장소에서 충돌하지 않도록 하는 작업공간/브랜치 원칙.
- Codex CLI, MCP, ChatGPT Plugins/Apps, relay 방식의 비교와 실험 기록.
- 성공/실패 증거와 다음 실험 결정.

## 이 루트가 소유하지 않는 것

- `hanmiyoo10-alt/PocketRisu` 소스의 production truth.
- PocketRisu 서버폰 배포 상태.
- SimCore / Usage Dashboard / DevPass release authority.
- ChatGPT 또는 OpenAI 제품의 공식 정책/요금제 truth.
- 기기 안의 토큰, 세션, SSH key, 인증 파일 등 비밀값.

외부 제품의 현재 지원 여부나 사용량 정책은 이 문서가 authority가 아니다. 필요할 때 공식 문서와 현재 제품 UI를 다시 확인한다.

## 먼저 읽기

1. [`CURRENT.md`](CURRENT.md) — 현재까지 확인된 상태와 다음 한 단계.
2. [`docs/architecture.md`](docs/architecture.md) — 두 폰/두 계정/저장소 구조.
3. [`docs/experiment-log.md`](docs/experiment-log.md) — 지금까지 실제로 수행한 실험 순서.
4. [`docs/candidates.md`](docs/candidates.md) — GitHub/MCP/ChatGPT 플러그인 후보 비교.
5. [`docs/decisions.md`](docs/decisions.md) — 현재 채택한 설계 원칙과 이유.
6. [`docs/setup-evidence.md`](docs/setup-evidence.md) — 서버폰에서 확인한 환경/설치 증거.

## 핵심 원칙

- 두 ChatGPT 계정은 **고정된 Builder/Reviewer 역할이 아니라 독립 개발자 두 명**처럼 취급한다.
- 같은 repository를 사용해도 동시에 같은 working tree를 공유하지 않는다.
- 기기별 기본 브랜치와 실제 feature branch/worktree를 분리한다.
- 자동 동기화는 dirty working tree를 절대 덮어쓰지 않는다.
- 새 실험은 PocketRisu 런타임을 불필요하게 변경하지 않는다.
- 네트워크 연결은 이미 운영 중인 Tailscale을 우선 활용한다.
- Codex CLI와 일반 ChatGPT bridge는 서로 다른 경로로 본다. Codex가 동작한다고 해서 일반 ChatGPT 할당량으로 동작하는 것은 아니다.
- 인증 코드, 토큰, session id, API key, SSH key 등은 Git에 기록하지 않는다.

## 현재 큰 결론

1. 공식 Codex CLI는 서버폰의 Android → Termux → Ubuntu PRoot → ARM64 환경에서 실행 및 ChatGPT device auth까지 성공했다.
2. 첫 read-only repository 분석은 모델 호출 직전까지 정상 진입했지만 Codex usage limit에 의해 중단됐다.
3. 따라서 기술적 실행 가능성은 높지만, **일반 ChatGPT 채팅 할당량을 주력으로 쓰고 싶다는 목표에는 Codex CLI가 완전한 해답이 아니다.**
4. 현재 1순위 조사 방향은 일반 ChatGPT가 reasoning을 담당하고, 공개 ChatGPT Plugin/App 또는 안전한 relay가 서버폰의 filesystem/shell을 실행하는 방식이다.

상세 근거와 후보는 각 문서에서 추적한다.

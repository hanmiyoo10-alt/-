# Architecture — two Android phones, two ChatGPT accounts

## 핵심 전제

이 환경은 **한 사람이 Android 폰 두 대에서 서로 다른 ChatGPT 계정 두 개를 사용**하며, 두 계정 모두 같은 GitHub repository 안에서 서로 다른 작업을 수행하는 구조다.

따라서 계정 A를 항상 설계자, 계정 B를 항상 구현자로 고정하지 않는다. 둘 다 필요에 따라 분석, 구현, 리뷰, 문서화, PR 작업을 할 수 있는 **독립 작업자**로 본다.

## 현재 구조

```text
                         GitHub
                   hanmiyoo10-alt/-
                         │
                canonical integration
                         │
             ┌───────────┴───────────┐
             │                       │
        mainphone/*              server/*
             │                       │
      📱 메인폰 ChatGPT A       📱 서버폰 ChatGPT B
             │                       │
       Termux / tmux            Termux / tmux
       Ubuntu PRoot             Ubuntu PRoot
             │                       │
       nyang workspace          /root/nyang-repo
             │                       │
             └──── Tailscale ────────┘
```

PocketRisu는 서버폰에서 별도 runtime으로 운영되지만 이 실험의 coding workspace와 ownership을 섞지 않는다.

## 검증된 원격 실행면

두 Android 폰은 모두 Remote Desktop Commander를 통한 repository 실행면으로 사용할 수 있다. 이 문서는 durable path/ownership 구조만 기록하며, 현재 SHA나 online 상태 같은 mutable fact는 `CURRENT.md`와 checkpoint가 소유한다.

```text
메인폰
  repository: /data/data/com.termux/files/home/nyang-repo
  landing worktree: /data/data/com.termux/files/home/nyang-worktrees/mainphone-work
  landing branch: mainphone/work

서버폰
  repository: /root/nyang-repo
  landing branch: server/work
```

실제 기능 변경은 각 landing branch/worktree를 직접 수정하는 대신 current `origin/main`에서 기기별 feature branch와 독립 worktree를 만든다. 원격 호출은 대상 기기와 absolute repository/worktree path를 명시해 다른 기기의 작업공간과 섞이지 않게 한다.

## 작업공간 원칙

### Device baseline branch

- 메인폰 기본 branch intent: `mainphone/work`.
- 서버폰 확인된 기본 branch: `server/work`.

이 branch들은 기기별 기본 착륙 지점이다. 실제 기능 구현은 가능하면 여기서 다시 feature branch 또는 worktree로 분리한다.

예:

```text
mainphone/work
  └─ mainphone/feature-a

server/work
  └─ server/feature-b
```

또는 한 서버폰에 여러 작업 디렉터리가 필요하면 `git worktree`를 사용한다.

```text
/root/worktrees/
  feature-a/
  feature-b/
  experiment-remote-bridge/
```

## 왜 같은 working tree를 공유하지 않는가

두 ChatGPT 계정이 같은 checkout을 동시에 수정하면 아래 문제가 생긴다.

- 한쪽의 미커밋 변경을 다른 쪽이 자기 변경으로 오인.
- 자동 sync/checkout이 상대 작업을 방해.
- `git diff`와 테스트 결과의 소유권이 불명확.
- 한 agent의 실패 복구가 다른 agent의 변경을 되돌릴 위험.

따라서 **same repo ≠ same working tree** 원칙을 유지한다.

## `nyang` 세션 역할

`nyang`은 Termux 바깥에서 tmux 세션을 만들고 Ubuntu PRoot 내부의 repository 작업공간에 장기 세션으로 진입하기 위한 wrapper다.

메인폰/서버폰 모두 기기별 branch를 갖도록 설계한다.

주의할 점:

- `git switch <device-branch>` 실패를 무시하고 shell을 계속 열면 사용자가 잘못된 branch에서 작업할 수 있다.
- 향후 wrapper를 강화할 때는 switch 실패 시 명시적으로 중단하거나 현재 branch를 크게 표시해야 한다.

## Sync 원칙

메인폰에 작성된 `nyang-sync`는 다음 조건에서만 동기화하도록 설계됐다.

1. 현재 branch가 해당 기기의 device branch일 것.
2. `git status --porcelain`이 비어 있을 것.
3. fetch 후 fast-forward 가능한 경우에만 진행할 것.

이 철학을 서버폰에도 동일하게 적용하는 것이 목표다.

## ChatGPT-to-local bridge가 들어갈 위치

목표 bridge는 기존 PocketRisu 서비스에 끼워 넣지 않고 coding workspace 옆에 독립 구성한다.

```text
📱 ChatGPT
   │
   │ Plugin / App / approved relay
   ▼
📱 서버폰
   ├─ PocketRisu runtime        (별도 ownership)
   ├─ Tailscale
   ├─ Ubuntu PRoot
   ├─ coding bridge / agent     (이 실험)
   └─ worktrees
       ├─ account-A task
       └─ account-B task
```

## 네트워크 원칙

이미 Tailscale을 운영하고 있으므로 가능한 경우 공개 tunnel보다 Tailnet 내부 연결을 선호한다.

다만 ChatGPT의 공개 Plugin/App가 vendor relay를 필수로 사용하는 경우에는 해당 앱의 인증/relay 모델을 별도로 검토한다. Tailscale이 있다고 해서 ChatGPT SaaS가 직접 `100.x.x.x` 주소에 접근할 수 있는 것은 아니다.

## Security boundary

초기 검증에서는 아래 순서로 권한을 넓힌다.

```text
connectivity
→ pwd / ls
→ read-only temp directory
→ read-only repository
→ isolated worktree write
→ bounded test commands
→ git operations
```

처음부터 전체 디스크 쓰기 + unrestricted shell을 열지 않는다.

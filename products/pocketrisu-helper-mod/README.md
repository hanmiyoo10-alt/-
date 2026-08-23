# 포켓리스 보조 개조 — Product Root

PocketRisu를 **메인폰 + 서버폰** 구조로 운영하면서 만든 보조 개조, 진단 기록, 설계 결정, 앞으로 할 일을 한곳에 유지하는 제품 루트다.

이 디렉터리는 `냥냥냥 Update Channel` 저장소 안에서 SimCore / Usage Dashboard와 **독립된 ownership boundary**로 관리한다. PocketRisu 소스 자체는 여기로 옮기지 않는다.

> 기준 시점: 2026-08-23  
> 상태: `DONE` / `ACTIVE` / `INVESTIGATE` / `TODO` / `HOLD`

## 먼저 읽기

1. [`CURRENT.md`](CURRENT.md) — 지금 상태와 다음 한 단계
2. [`ROUTINE.md`](ROUTINE.md) — 고정 작업/PR/배포 루틴
3. [`PR-LIFECYCLE.md`](PR-LIFECYCLE.md) — 기능 분리, 실패 피드백, merge/deploy 상태 머신
4. [`ROADMAP.md`](ROADMAP.md) — 앞으로 할 일
5. [`docs/features/README.md`](docs/features/README.md) — 기능별 독립 모듈
6. [`docs/history.md`](docs/history.md) — 지금까지 과정
7. [`docs/decisions.md`](docs/decisions.md) — 왜 그렇게 결정했는지

## 이 레포의 두 번째 목적: 미래 upstream PR 재료

이 제품 루트는 단순 인수인계 문서가 아니다.

**기능 하나 = 폴더 하나 = 미래 정식 PR 후보 하나 = 배포 단위 하나**로 관리한다.

각 기능 폴더는 최소:
- `README.md` — 현재 구현/검증
- `UPSTREAM.md` — upstream에 제출할 최소 scope, 의존성, 설명, 검증
- `FAILURES.md` — CI/PR/review/deploy 실패와 피드백

를 가진다.

과거에 이미 여러 개조가 한 branch/tree에 섞인 부분은 억지로 지금 역사 재작성하지 않는다. 대신 기능별 `UPSTREAM.md`에서 분리 상태를 추적하고, 정식 PR 준비 때 최신 upstream base에 **그 기능만 재적용**한다.

## 기기 역할

- 📱 메인폰: Firefox/PocketRisu 사용·재현, SSH core/notify 터널, Android 알림 relay, Termux:Boot, simresume
- 📱 서버폰: PocketRisu 본체 코드/DB, `pocketrisu` 서비스, local-usage/DevPass/bridge, 서버 sshd/로그
- 📱 양쪽: 필요한 작업은 명령을 섞지 않고 **메인폰 → 서버폰** 순서로 분리

서버폰에는 Android 알림을 만들지 않는다. 사용자 알림은 **메인폰 전용**이다.

## 핵심 원칙

- 가능하면 `INSPECT_ONLY → 백업 → 수정 → 검증`.
- 새 소스 작업은 먼저 정확한 `Feature-ID`를 고른다.
- 한 branch/PR에 기능 하나를 기본으로 한다.
- PR/CI/deploy 실패도 해당 기능 `FAILURES.md`에 기록하고 다음 수정 피드백으로 사용한다.
- green이 아닌 기능은 자동 merge/deploy하지 않는다.
- 메인폰 터널 문제와 서버폰 코드 문제를 분리한다.
- runit 유지, PM2 신규 도입 금지.
- `sqlite3` CLI 대신 필요 시 Node + `better-sqlite3`.
- hide/pagehide에 `/api/db/flush` 강제 금지.
- 토큰·비밀번호·SSH key·DB/snapshot/log/backup 원본은 커밋하지 않는다.

## PocketRisu 소스와의 관계

- 실제 소스 포크: `hanmiyoo10-alt/PocketRisu`
- 이 제품 루트: 운영 지식 / 개조 이력 / 설계 / 검증 / TODO / 미래 upstream PR dossier의 기준점
- 개인 포크 PR이 green이면 merge 가능.
- 실제 서버폰 자동 배포는 `safe-updater`가 검증된 뒤 pull-based로 연결.
- 정식 upstream PR은 이 레포의 기능별 `UPSTREAM.md`를 기준으로 새 upstream-base branch에서 최소 diff로 재구성한다.

## Isolation contract

- 기본 소유 범위는 `products/pocketrisu-helper-mod/`.
- shared infrastructure는 `.github/workflows/pocketrisu-helper-docs.yml`만 사용.
- SimCore/Usage Dashboard release 경로와 manifest는 수정하지 않는다.
- 현재 docs CI는 read-only validation.
- 서버폰 실제 배포는 GitHub push-SSH 방식이 아니라 향후 검증된 `safe-updater`가 담당.

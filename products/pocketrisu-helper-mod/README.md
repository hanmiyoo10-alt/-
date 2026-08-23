# 포켓리스 보조 개조 — Product Root

PocketRisu를 **메인폰 + 서버폰** 구조로 운영하면서 만든 보조 개조, 진단 기록, 설계 결정, 앞으로 할 일을 한곳에 유지하는 제품 루트다.

이 디렉터리는 `냥냥냥 Update Channel` 저장소 안에서 SimCore / Usage Dashboard와 **독립된 ownership boundary**로 관리한다. PocketRisu 소스 자체는 여기로 옮기지 않는다.

> 기준 시점: 2026-08-23  
> 상태: `DONE` / `ACTIVE` / `INVESTIGATE` / `TODO` / `HOLD`

## 먼저 읽기

1. [`CURRENT.md`](CURRENT.md) — 지금 상태와 다음 한 단계
2. [`ROUTINE.md`](ROUTINE.md) — 작업 시작/진행/종료 고정 루틴
3. [`ROADMAP.md`](ROADMAP.md) — 앞으로 할 일
4. [`docs/history.md`](docs/history.md) — 지금까지 과정
5. [`docs/decisions.md`](docs/decisions.md) — 왜 그렇게 결정했는지
6. [`docs/features/README.md`](docs/features/README.md) — 기능별 독립 모듈

## 기본 작업 루틴

> **읽기 → 검사 → 백업 → 한 단계 수정 → 검증 → 기능 문서 → CURRENT → ROADMAP → CI**

새 채팅/작업을 시작하면 `CURRENT.md`와 해당 기능 문서를 먼저 읽고, 작업 종료 시 실제 상태를 제품 문서에 다시 동기화한다. 상세 규칙은 [`ROUTINE.md`](ROUTINE.md)를 기준으로 한다.

## 기기 역할

- 📱 메인폰: Firefox/PocketRisu 사용·재현, SSH core/notify 터널, Android 알림 relay, Termux:Boot, simresume
- 📱 서버폰: PocketRisu 본체 코드/DB, `pocketrisu` 서비스, local-usage/DevPass/bridge, 서버 sshd/로그
- 📱 양쪽: 필요한 작업은 명령을 섞지 않고 **메인폰 → 서버폰** 순서로 분리

서버폰에는 Android 알림을 만들지 않는다. 사용자 알림은 **메인폰 전용**이다.

## 핵심 원칙

- 가능하면 `INSPECT_ONLY → 백업 → 수정 → 검증`.
- 메인폰 터널 문제와 서버폰 코드 문제를 분리한다.
- runit 유지, PM2 신규 도입 금지.
- `sqlite3` CLI 대신 필요 시 Node + `better-sqlite3`.
- hide/pagehide에 `/api/db/flush` 강제 금지.
- 토큰·비밀번호·SSH key·DB/snapshot/log/backup 원본은 커밋하지 않는다.

## PocketRisu 소스와의 관계

- 실제 소스 포크: `hanmiyoo10-alt/PocketRisu`
- 이 제품 루트: 운영 지식 / 개조 이력 / 설계 / 검증 / TODO의 기준점
- upstream PR 작업 공간이 아니다.
- 이미 섞인 개조를 억지로 Git 분리하지 않고 여기에서 **기능 단위 논리 분리**를 유지한다.

## Isolation contract

- 기본 소유 범위는 `products/pocketrisu-helper-mod/`.
- shared infrastructure는 `.github/workflows/pocketrisu-helper-docs.yml`만 사용.
- SimCore/Usage Dashboard release 경로와 manifest는 수정하지 않는다.
- 현재 CI는 read-only validation만 하며 `main`에 자동 commit/push하지 않는다.

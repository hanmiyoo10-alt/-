# PR lifecycle automation

상태: **ACTIVE / PARTIAL**

Feature-ID: `pr-lifecycle-automation`

## 목적

PocketRisu 개조를 처음부터 기능별로 분리하고, 개인 포크 PR의 실패/리뷰/merge/deploy 상태를 기능 dossier에 되돌려 기록해 나중에 정식 upstream PR을 최소 diff로 재구성할 수 있게 한다.

## 핵심 계약

`1 Feature-ID = 1 기능 폴더 = 1 branch/PR 후보 = 1 배포 단위`

## 자동화 범위

- PR body의 Feature-ID 식별.
- failed/cancelled CI와 changes requested를 기능별 `FAILURES.md`에 기록.
- 확정 사실과 추정 원인을 분리한 PR feedback.
- green-only merge 후보 판정.
- merge 후 `DEPLOY_READY` 상태 기록.
- 실제 서버폰 배포는 검증된 pull-based `safe-updater`가 구현되기 전까지 수행하지 않음.

## 실패 안전성

- 코드/test 실패를 무작정 rerun하지 않는다.
- infra timeout/cancel처럼 원인이 명확할 때만 제한적 rerun 후보.
- merge/deploy 실패도 지우지 않고 누적한다.
- GitHub Actions가 서버폰 SSH key를 들고 직접 push-deploy하지 않는다.

## 검증

- helper repo 자체는 전용 feature branch/PR로 lifecycle 규칙을 dogfood한다.
- PocketRisu 소스 포크에는 별도의 Feature-ID PR guard를 추가한다.

## 다음 한 단계

- 개인 포크 PR의 Feature-ID guard를 설치하고 PR 상태 감시 자동화를 활성화한다.

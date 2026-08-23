# PR lifecycle automation

상태: **ACTIVE**

Feature-ID: `pr-lifecycle-automation`

## 목적

PocketRisu 개조를 처음부터 기능별로 분리하고, 개인 포크 PR의 실패/리뷰/merge/deploy 상태를 기능 dossier에 되돌려 기록해 나중에 정식 upstream PR을 최소 diff로 재구성할 수 있게 한다.

## 핵심 계약

`1 Feature-ID = 1 기능 폴더 = 1 branch/PR 후보 = 1 배포 단위`

## 설치 완료

- helper repo: 기능별 `README.md + UPSTREAM.md + FAILURES.md` 및 lifecycle 문서.
- source fork: `.github/workflows/feature-pr-guard.yml`.
- source PR template: `Feature-ID: <feature-id>`.
- scheduled watcher: `PocketRisu PR Lifecycle`, 매시간 condition watch.
- 실제 deploy gate: safe-updater dossier의 `AUTO_DEPLOY_GATE` + `AUTO_DEPLOY_VERIFIED` 두 조건으로 fail-closed.

## 자동화 범위

- PR body의 Feature-ID 식별.
- branch ↔ Feature-ID 경계 확인.
- matching helper feature dossier 확인.
- failed/cancelled CI와 changes requested를 기능별 `FAILURES.md`에 기록.
- 확정 사실과 추정 원인을 분리한 PR feedback.
- at least one check가 존재하고 전부 green일 때만 merge 후보 판정.
- merge 후 `DEPLOY_READY` 상태 기록.
- 공식 upstream PR URL이 dossier에 생기면 그 PR의 CI/review 실패도 같은 ledger로 회수.

## 실패 안전성

- check가 하나도 없으면 green으로 간주하지 않는다.
- 코드/test 실패를 무작정 rerun하지 않는다.
- infra timeout/cancel처럼 원인이 명확할 때만 제한적 rerun 후보.
- merge/deploy 실패도 지우지 않고 누적한다.
- GitHub Actions가 서버폰 SSH key를 들고 직접 push-deploy하지 않는다.
- safe-updater가 `AUTO_DEPLOY_GATE=ENABLED` + `AUTO_DEPLOY_VERIFIED=YES`가 되기 전에는 실제 서버폰 배포 금지.

## 검증

- helper lifecycle rollout PR #161: squash-merged.
- PocketRisu source guard PR #3: squash-merged.
- 첫 실제 rollout failure(동시 main 이동으로 non-fast-forward 거절)를 `FAILURES.md`에 기록하고 force 없이 branch/PR 전략으로 교정.
- source guard workflow가 실제 `main`에 존재함을 확인.
- **첫 후속 `feat/*` PR에서 guard/check 실행을 실전 검증할 예정.**

## 다음 한 단계

- 다음 PocketRisu 기능 작업을 먼저 독립 Feature-ID로 만들고, 그 PR에서 boundary guard + lifecycle watcher의 첫 end-to-end 검증을 수행한다.

# App API Mod Lab — Decisions

이 문서는 이 제품 루트의 구조·경계·authority 결정을 오래 남기는 기록이다.

## 2026-09-11 — 독립 제품 루트로 시작

### 결정

앱/API 개조 작업을 기존 plugin/product 범위에 섞지 않고 `products/app-api-mod-lab/**`라는 독립 ownership boundary로 시작한다.

### 이유

- 아직 특정 앱, upstream repository, API surface가 정해지지 않았다.
- 기존 제품의 runtime/release authority를 재사용하면 실제로 존재하지 않는 권한 관계를 만들 수 있다.
- 향후 서로 다른 앱/API 대상이 들어와도 대상별 bounded work area로 분리할 수 있는 중립적인 시작점이 필요하다.

### authority 의미

이 루트의 `CURRENT.md`는 이 연구/개조 영역의 현재 작업 상태 evidence다. 특정 외부 앱, 서비스, API의 production/runtime/release authority를 뜻하지 않는다.

### 후속 규칙

첫 실제 대상이 정해지면 source/upstream authority, 변경 표면, 검증 표면을 먼저 기록한 뒤 구현한다. 서로 다른 대상이나 별개 아이디어는 같은 작업 단위에 섞지 않는다.

## 2026-09-20 — 대상별 Risu O/X 내부 taxonomy

### 결정

App API Mod Lab 자체는 범용 실험실로 유지하고, 실제 대상만 `targets/risu/<target-id>/` 또는 `targets/standalone/<target-id>/`로 분류한다.

`app / api / hybrid` 구분은 물리 경로가 아니라 `TARGET.json` metadata로 둔다.

### 이유

- 하나의 실제 개조 대상이 앱 UI, 로컬 런타임, 원격 API를 동시에 포함할 수 있다.
- app/api를 경로에 고정하면 범위가 넓어질 때 불필요한 디렉터리 이동이 생긴다.
- Risu O/X는 대상의 ecosystem 경계라 비교적 안정적인 분류 축이다.
- 아직 대상이 없는 bootstrap 상태에서 가짜 target을 만들 필요가 없다.

### 검증 계약

`target-contract.json`과 `validate-targets.mjs`가 실제 target root의 구조를 검증한다. zero-target 상태는 정상이며, validator PASS는 metadata 구조만 증명하고 외부 authority나 구현 준비 완료를 증명하지 않는다.

## 2026-09-20 — legacy candidate inventory

### 결정

기존 이슈나 별도 브랜치에 남은 app/API 개조 작업은 바로 concrete target으로 승격하지 않고 `legacy-candidates.json`에 locator-only 후보로 먼저 기록한다.

현재 첫 후보는:
- `chzzk` — issue #2020
- `fortune-golf` — branch `fortune-golf-apk`

둘 다 proposed ecosystem은 `standalone`(Risu X)이며, CHZZK는 `api`, Fortune Golf는 `app` target 후보로 분류한다.

### authority 경계

후보 inventory는 source/runtime/release authority를 만들지 않는다. `materialized=false` / `migration_authorized=false` 상태에서는 target root를 만들거나 기존 브랜치/이슈의 소유권을 재지정하지 않는다.

### 이유

새 target validator는 `targets/**` 아래에 이미 materialize된 대상만 볼 수 있다. 과거 작업이 issue-only 또는 legacy branch에 존재하면 main-tree scan만으로는 누락될 수 있으므로, 그 흔적을 evidence locator로 보존하는 별도 reconciliation layer가 필요하다.

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

## 2026-09-20 — CHZZK 첫 concrete target materialization

### 결정

기존 issue #2020의 CHZZK reconnaissance를 새 target taxonomy 아래 첫 concrete target으로 materialize한다.

```text
targets/standalone/chzzk/
├── TARGET.json
└── README.md
```

CHZZK는 Risu X / `api` target으로 분류한다. materialization 후에는 더 이상 legacy candidate가 아니므로 `legacy-candidates.json`에서는 제거한다. provenance는 target metadata와 README가 #2020을 직접 가리킨다.

### 범위

첫 work unit은 public, anonymous, read-only playback reconnaissance로 한정한다. 로그인/세션, write mutation, creator control, payment/ad mutation, deployment/release는 범위 밖이다.

### authority 의미

App API Mod Lab은 repository-local research/probe/client artifacts만 소유한다. NAVER CHZZK external service/runtime authority를 소유하지 않는다. endpoint/runtime liveness는 fresh evidence 전까지 `UNVERIFIED_RUNTIME`이다.

## 2026-09-20 — target primary category axis

### 결정

각 App API Mod Lab target은 Risu ecosystem과 technical kind 외에 하나의 primary product/domain `category`를 가진다.

세 축은 서로 다른 의미를 가진다.

```text
ecosystem → Risu 관계
kind      → app / api / hybrid
category  → game / streaming / utility ... 제품 분야
```

현재 분류:
- `chzzk` → `streaming`
- `fortune-golf` legacy candidate → proposed `game`

### 물리 경로

category는 경로 계층으로 만들지 않는다.

```text
targets/<ecosystem>/<target-id>/
```

를 계속 유지한다. category 변경은 metadata 변경이며 디렉터리 이동 사유가 아니다.

### 검증 계약

`target-contract.json`이 reviewed category vocabulary와 slug pattern을 소유하고, `validate-targets.mjs`가 모든 concrete target의 required primary category를 검증한다.

Legacy candidate는 `proposed_category`를 같은 vocabulary로 기록하고 `validate-legacy-candidates.mjs`가 검증한다.

category는 탐색/인덱싱용 분류일 뿐 source/runtime/release/deployment authority를 생성하지 않는다. 다중 분야가 실제로 필요해질 때는 primary category를 모호하게 만들지 않고 별도의 secondary/tag contract를 검토한다.

## 2026-09-20 — Fortune Golf legacy branch materialization

### 결정

`fortune-golf-apk` legacy branch의 target-owned corpus를 App API Mod Lab의 두 번째 concrete target으로 materialize한다.

```text
targets/standalone/fortune-golf/
├── TARGET.json
├── README.md
├── android/
├── docs/
├── probe/
└── tools/
```

분류:
- ecosystem: `standalone` / Risu X
- kind: `app`
- category: `game`

### provenance와 source 경계

migration source는 `fortune-golf-apk` exact SHA `62a2e4bab3aa272e021440f05c18c237ea6c592f`다.

첫 migration slice는 target-owned 25개 파일만 재배치한다:
- Fortune Golf 전용 문서 17개
- `fortune-probe/**` 6개
- Android README 1개
- Fortune analysis helper 1개

원본 Com2uS game artifact는 external/private input이라 Git으로 가져오지 않는다. WIE upstream authority도 repository가 흡수하지 않는다.

### workflow 경계

legacy branch의 Fortune Golf GitHub Actions workflow와 generic Ghidra provisioning/transfer workflow는 이번 target materialization에 포함하지 않는다. 옛 path/ref assumptions를 그대로 main에 활성화하지 않고, target root가 안착한 뒤 별도 migration/validation work unit에서 다룬다.

### runtime 의미

historical handoff에서 title/menu 도달 evidence는 있지만 round/save completion은 미검증이고 graphics corruption 및 first-run memory/EventQueue 문제가 남아 있었다. 따라서 materialization은 `WORKING`, `RELEASED`, `COMPATIBLE` claim이 아니다. runtime status는 `PARTIAL_HISTORICAL_EVIDENCE`로 유지한다.

### legacy inventory zero state

Fortune Golf 승격 후 알려진 legacy candidate는 0개다. validator는 `candidates: []`를 정상 empty inventory로 허용해야 하며, 가짜 placeholder candidate를 요구하지 않는다.

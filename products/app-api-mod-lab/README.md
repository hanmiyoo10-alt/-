# App API Mod Lab — Independent Product Root

이 디렉터리는 앞으로 진행할 **앱/API 개조 작업을 다른 제품과 분리해서 관리하는 독립 ownership boundary**다.

현재는 특정 앱, upstream 저장소, API 엔드포인트, 배포 대상에 묶이지 않은 bootstrap 상태다. 실제 대상이 정해지기 전까지 이 루트의 등록 자체는 소스·런타임·배포·릴리스 authority를 만들지 않는다.

## 먼저 읽기

1. [`CURRENT.md`](CURRENT.md) — 현재 상태와 다음 한 단계
2. [`product.json`](product.json) — 제품 루트 locator와 선언 상태
3. [`targets/README.md`](targets/README.md) — 대상별 Risu O/X 및 TARGET 계약
4. [`target-contract.json`](target-contract.json) — machine-readable target contract
5. [`legacy-candidates.json`](legacy-candidates.json) — 기존 이슈/브랜치에서 발견된 target 후보 locator
6. [`docs/decisions.md`](docs/decisions.md) — 범위와 구조 결정 기록
7. [`../../docs/APP_API_MOD_LAB_GUIDELINES.md`](../../docs/APP_API_MOD_LAB_GUIDELINES.md) — canonical 개발/운영 가이드라인

## Isolation contract

- 기본 소유 범위는 `products/app-api-mod-lab/**`다.
- SimCore, Usage Dashboard, DevPass, PocketRisu Helper Mod 등 기존 프로젝트의 release/runtime authority를 소유하거나 변경하지 않는다.
- shared infrastructure 변경이 필요하면 독립 근거와 별도 검증을 가진 명시적 변경으로 취급한다.
- 특정 앱이나 API를 대상으로 삼을 때는 구현 전에 그 대상의 source/upstream authority, 변경 표면, 검증 표면을 `CURRENT.md`와 필요 시 대상별 문서에 기록한다.
- 서로 다른 앱/API 대상은 한 작업 단위에 섞지 않는다.

## 대상 분류

실제 대상은 `targets/risu/<target-id>/` 또는 `targets/standalone/<target-id>/` 아래에서 시작한다.

- Risu O/X는 대상 단위 ecosystem 분류다.
- `app / api / hybrid`는 `TARGET.json` metadata로 관리한다.
- `game / streaming / ...` 같은 primary category도 `TARGET.json` metadata로 관리하며 path layer로 만들지 않는다.
- 대상이 아직 확정되지 않았다면 target 디렉터리를 만들지 않는다.
- 구조 검증은 `node products/app-api-mod-lab/validate-targets.mjs`로 수행한다.

## Legacy candidate inventory

기존 이슈나 별도 브랜치에 남아 있는 app/API 개조 작업은 곧바로 concrete target으로 취급하지 않는다.

현재 concrete targets:
- `targets/standalone/chzzk/` — issue #2020에서 이어진 Risu X / API / `streaming`
- `targets/standalone/fortune-golf/` — issue #2602와 `fortune-golf-apk` branch에서 이어진 Risu X / app / `game`

현재 legacy inventory는 비어 있다. 빈 inventory는 모든 알려진 legacy candidate가 materialize된 정상 상태다.

`legacy-candidates.json`은 evidence locator와 proposed classification만 가진다. source/runtime/release authority를 새로 만들지 않으며, `materialized=false` / `migration_authorized=false` 상태에서는 target root를 만들지 않는다.

검증:

`node products/app-api-mod-lab/validate-legacy-candidates.mjs`

## 기본 작업 흐름

`authority 확인 → 대상/범위 고정 → source/API surface 조사 → 설계 → 최소 변경 → 회귀 검증 → 실제 대상 검증`

구현 전에 무엇을 개조하는지와 무엇이 현재 진실의 소유자인지를 먼저 고정한다. 등록이나 문서만으로 존재하지 않는 production/release/runtime 사실을 만들어내지 않는다.

## 보안 경계

토큰, API key, 세션/인증 정보, 개인 계정 데이터, private device material, 원본 민감 로그를 Git에 커밋하지 않는다. 재현에 필요한 증거는 가능한 한 최소화·비식별화해서 기록한다.

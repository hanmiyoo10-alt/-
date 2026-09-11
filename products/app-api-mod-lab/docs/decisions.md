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

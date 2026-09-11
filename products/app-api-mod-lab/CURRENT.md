# CURRENT — App API Mod Lab

최종 갱신 기준: **2026-09-11**

새 작업이나 새 채팅에서 이 제품 범위로 들어올 때 먼저 읽는 현재 상태 체크포인트다.

## 상태 — ACTIVE / BOOTSTRAP

현재 확정된 내용:

- 독립 제품 루트: `products/app-api-mod-lab/`
- 목적: 향후 앱/API 개조 작업의 격리된 설계·구현·검증 기준점
- 특정 대상 앱: `UNASSIGNED`
- 특정 upstream/source repository: `UNASSIGNED`
- 특정 API surface: `UNASSIGNED`
- production/runtime/deployment/release authority: `NONE DECLARED`
- durable-memory profile: `check-only`

이 상태에서 repository registration은 ownership locator와 작업 시작점을 제공할 뿐, 특정 앱이나 API에 대한 권한·배포 상태·릴리스 진실을 생성하지 않는다.

## 현재 경계

- 기본 변경 소유 범위는 `products/app-api-mod-lab/**`다.
- repository-wide common rules와 `docs/APP_API_MOD_LAB_GUIDELINES.md`를 따른다.
- 다른 프로젝트의 manifest, release branch, generated artifact, runtime path는 이 루트의 authority가 아니다.
- shared path 변경이 필요하면 별도 impact/authority 확인 없이 끼워 넣지 않는다.

## 첫 실제 개조 작업 전에 필요한 것

1. 대상 앱 또는 API를 식별한다.
2. source/upstream 또는 실제 owning authority를 확인한다.
3. 변경할 API/앱 표면과 비변경 범위를 고정한다.
4. 필요한 인증·개인정보·비밀정보가 Git에 들어가지 않도록 증거 경계를 정한다.
5. 가장 강한 실용 검증 표면을 정한다.

## 다음 한 단계

첫 앱/API 개조 요청이 들어오면 해당 대상의 authority와 코드/API surface를 조사해서 이 루트 안에 **대상별 bounded work area**를 만든 뒤 구현 범위를 잠근다.

## 아직 완료로 간주하지 않는 것

- 특정 앱/API 구현: 시작 전
- 실제 runtime probe: 대상 미지정
- regression/runtime validation: 대상 미지정
- deployment/release: authority 없음

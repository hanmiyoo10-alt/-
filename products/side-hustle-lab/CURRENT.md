# CURRENT — Side Hustle Lab

최종 갱신 기준: **2026-09-22**

## 상태 — RESEARCH PROTOTYPE / IMPLEMENTATION_PR

- 기본 변경 소유 범위: `products/side-hustle-lab/**`
- 목적: 공개 부업 후보를 비용·노동·위험·무인성 기준으로 검증하는 무료 정적 도구
- 현재 구현: 후보 비교 화면, 필터/정렬, 저관리 시간 계산기, RSS 파서, 결정론적 분류기
- 샘플 후보: 독자 디지털 키트, 스톡 자산, Magiclight 계열 AI 영상, Amazon 제휴 사이트, 백그라운드 보상 앱
- production/runtime/deployment/release authority: `NONE DECLARED`
- repository registration: `UNKNOWN`
- 외부 결제·제휴·게시·앱 설치: `NOT AUTHORIZED`
- 수익 금액: 모두 `UNKNOWN`

## 현재 경계

- 공개 RSS는 후보 발견 입력일 뿐 수익·안전·약관의 증거가 아니다.
- 정적 데이터는 근거 상태를 `owned / verified / partial / unverified`로 구분한다.
- `free-trial`, `paid`, `unknown` 비용 후보는 무료 추천으로 승격하지 않는다.
- 위험 4 이상 또는 근거 미완료 후보는 `hold`를 유지한다.
- 사용자가 입력하지 않은 수익 숫자를 생성하지 않는다.
- 개인정보, 인증정보, 정산정보를 수집하거나 저장하지 않는다.

## 이번 단계의 검증 목표

1. 샘플 후보가 같은 척도로 렌더링된다.
2. 위험·비용·근거 게이트가 추천 점수보다 우선한다.
3. RSS 파서가 원문 HTML 전체가 아닌 최소 메타데이터만 남긴다.
4. 사이트가 외부 라이브러리 없이 정적으로 동작한다.

## 다음 단계 후보

- PR CI가 통과하면 별도 단계에서 repository scope 등록 필요성을 재평가한다.
- 실제 공개 배포 전에 플랫폼 약관·광고 고지·개인정보 처리 범위를 확정한다.
- 결제 또는 제휴 계정 연결은 사용자 본인확인과 별도 승인 뒤에만 진행한다.

## 아직 완료로 간주하지 않는 것

- 공개 배포: `NOT STARTED`
- 제휴/결제 연결: `NOT STARTED`
- 실제 수익 검증: `UNKNOWN`
- 모바일 백그라운드 앱 안전성: `UNKNOWN`
- repository product authority: `UNKNOWN`


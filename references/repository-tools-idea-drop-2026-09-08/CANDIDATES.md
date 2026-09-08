# Repository tool/skill intake — 2026-09-08

Authority: [Canonical Main Idea Inventory #464](https://github.com/hanmiyoo10-alt/-/issues/464).
본 문서는 원본 보관과 초기 평가의 고정 기록이며 원장을 대체하지 않는다.

## 분류

- 이번 원본 보관: `NO_SYSTEM_UPDATE`.
- 후보의 실제 설치/CI 결합/스킬 활성화: 보수적으로 `SYSTEM_UPDATE_REQUIRED`.
- 전체 후보 상태: `CAPTURED`; 보관 완료는 도구 도입 완료가 아니다.
- ID는 intake 내 provenance 식별자이며 기존 U-/N- 아이디어 ID를 재할당하지 않는다.
- 중요도·난이도·크기는 초기 추정이다. 정식 승격 시 기존 원장 및 활성 packet overlap을 다시 확인한다.
- main 프로젝트 카탈로그와 파일 경로, 기존 repo-ci-mcp/repo-write 문서를 확인했다. 모든 브랜치의 설치 현황을 감사한 것은 아니다.
- actionlint/hyperfine/ast-grep/mise 이슈 검색은 결과 0개였지만 이것을 미설치 증거로 사용하지 않는다.
- gh CLI는 기존 `plugins/usage-dashboard/tools/README-gh-bootstrap.md`와 중복되어 새 후보에서 제외했다. skill-creator는 이번 범위에서 별도 원본 보관하지 않았다.

## 후보 목록

| ID | 도구/스킬 | 중요도 | 난이도 | 크기 | 범위 |
| --- | --- | --- | --- | --- | --- |
| REF-20260908-01 | actionlint (CLI) | 높음 | 낮음 | 작음 | .github/workflows/ |
| REF-20260908-02 | ShellCheck (CLI) | 높음 | 낮음 | 작음 | scripts/, local/termux/, plugins/termux/, workflow run 스크립트 |
| REF-20260908-03 | ast-grep (CLI) | 높음 | 중간 | 중간 | plugins/, products/, .agents/skills/plugin-impact-scope/ |
| REF-20260908-06 | webapp-testing (SKILL) | 높음 | 중간 | 중간 | Usage Dashboard, Termux Large Doc Editor, Voyage UI의 재현 가능한 테스트 화면 |
| REF-20260908-07 | mcp-builder (SKILL) | 높음 | 중간 | 중간 | tools/repo-ci-mcp/, tools/simcore-mcp/, tools/usage-dashboard-mcp/ |
| REF-20260908-04 | hyperfine (CLI) | 중간 | 낮음 | 작음 | tools/, scripts/, Termux 도구의 로컬 측정 |
| REF-20260908-05 | mise (CLI) | 중간 | 중간 | 중간 | Node/Python 기반 tools·plugins 개발환경, CI |

## REF-20260908-01 — actionlint

- 왜 중요한가: GitHub Actions 표현식·입출력·재사용 workflow 오류를 실행 전에 찾는다.
- 적용 후보 범위: .github/workflows/
- 중복/관계 초기 판단: COMPOSE: 기존 프로젝트별 CI/contract를 보완하는 정적 검사 후보.
- 다음 검증/제약: 기존 정상/실패 workflow 표본에서 진단을 비교하고 사용자 정의 runner·action metadata 예외를 확인한다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/rhysd/actionlint/tree/011a6d15e749bb3f2d771eed9c7aa0e7e3e10ee7

## REF-20260908-02 — ShellCheck

- 왜 중요한가: 셸 인용·변수 확장·이식성 오류를 사전에 발견한다.
- 적용 후보 범위: scripts/, local/termux/, plugins/termux/, workflow run 스크립트
- 중복/관계 초기 판단: COMPOSE: 프로젝트 테스트 및 actionlint의 셸 검사 연계 후보.
- 다음 검증/제약: bash/sh/Termux 셸 종류를 구분하고 기존 suppression을 검토한다. GPL 소스를 제품에 편입하는 작업과 외부 검사 CLI 사용을 분리한다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/koalaman/shellcheck/tree/9af7ee28ce587baadd950b85dd6826a16b9c068d

## REF-20260908-03 — ast-grep

- 왜 중요한가: 반복 코드 구조를 AST 패턴으로 찾아 영향 범위 검토의 누락을 줄인다.
- 적용 후보 범위: plugins/, products/, .agents/skills/plugin-impact-scope/
- 중복/관계 초기 판단: COMPOSE: 기존 impact-scope 스킬에 검색 증거를 제공하며 소유권 판단을 대체하지 않는다.
- 다음 검증/제약: 대표 JS/TS/CJS 구문에서 탐지 정확도를 평가한다. 최초 평가는 rewrite 없이 검색만 한다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/ast-grep/ast-grep/tree/fc2b1530db74de49131b725221de98036a552a9f

## REF-20260908-04 — hyperfine

- 왜 중요한가: 반복 측정과 통계로 CLI·검증 명령의 성능 변화를 비교한다.
- 적용 후보 범위: tools/, scripts/, Termux 도구의 로컬 측정
- 중복/관계 초기 판단: COMPOSE: 기존 실기·벤치마크 결과의 측정 보조; 라이브 지연의 원인을 자동 확정하지 않는다.
- 다음 검증/제약: 부작용 없는 고정 입력 명령으로 warmup·캐시·횟수를 통제한다. 결제/API 호출이나 배포 명령을 반복 측정하지 않는다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/sharkdp/hyperfine/tree/f12f3d9f86f3643b3b7deace5e160b1f0f44d2b7

## REF-20260908-05 — mise

- 왜 중요한가: 프로젝트별 도구 버전과 작업 명령을 선언해 환경 재현성을 높인다.
- 적용 후보 범위: Node/Python 기반 tools·plugins 개발환경, CI
- 중복/관계 초기 판단: EXTEND/COMPOSE 검토: 기존 bootstrap·런처·프로젝트별 버전 고정과 중복 가능.
- 다음 검증/제약: 한 개발환경에서만 exact version을 평가한다. Android/Termux 지원·다운로드 제약은 UNKNOWN이며 기존 launcher와 release owner를 교체하지 않는다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/jdx/mise/tree/59ec32fc0be163baf952109c18c986e48c1c901f

## REF-20260908-06 — webapp-testing

- 왜 중요한가: Playwright 기반 화면·콘솔·상호작용 검증 절차를 재사용한다.
- 적용 후보 범위: Usage Dashboard, Termux Large Doc Editor, Voyage UI의 재현 가능한 테스트 화면
- 중복/관계 초기 판단: COMPOSE: 기존 UI/실기 검증을 보완. 호스트 API·기기 실증을 대체하지 않는다.
- 다음 검증/제약: mock/test harness에서 상태 준비 조건을 명시한다. 원본의 networkidle 지침은 지속 연결 앱에서 맞지 않을 수 있어 적용 전 검토한다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/anthropics/skills/tree/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/webapp-testing

## REF-20260908-07 — mcp-builder

- 왜 중요한가: MCP 도구의 입력 스키마·응답·오류·평가 설계에 참고할 수 있다.
- 적용 후보 범위: tools/repo-ci-mcp/, tools/simcore-mcp/, tools/usage-dashboard-mcp/
- 중복/관계 초기 판단: EXTEND/COMPOSE: 기존 MCP 서버와 compactness/authority 계약을 우선한다.
- 다음 검증/제약: 현재 SDK 버전과 검증 예제를 대조한다. 원본의 포괄적 API 노출 권고를 기존 bounded/read-only 계약에 그대로 적용하지 않는다.
- 상태: CAPTURED / NOT INSTALLED / COMPATIBILITY UNKNOWN.
- 원본: https://github.com/anthropics/skills/tree/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/mcp-builder


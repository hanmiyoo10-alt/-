# Ghidra 공통 아이디어 리스트

Status: **IDEA WAREHOUSE — REFERENCE ARCHIVED, NOT APPLIED**

게임/Ghidra 작업 위치는 `fortune-golf-apk` 브랜치의 `fortune-probe/ghidra/`이다.
이 문서는 해당 분석 작업에서 재사용할 외부 도구 아이디어를 보관한다.
다른 프로젝트의 아이디어 목록을 대체하지 않는다.

## 분류 규칙

기존 [Usage Dashboard 아이디어 리스트](USAGE_DASHBOARD_IDEA_LIST.md)의 ID·중요도·난이도·상태 구분과
[SimCore 원본 보관 사례](../references/simcore-plugin-idea-drop-2026-08-30/README.md)의 원본/명세 분리를 참고했다.
보관은 제품 버전 변경 없는 repository-only 작업이다. 설치·분석 실행·게임 변경은 별도로 판단한다.
중요도와 적용 난이도는 초기 평가이며 실행 검증 결과가 아니다.

## 보관된 후보

| ID | 아이디어 | 중요도 | 적용 난이도 | 상태 | 원본 |
| --- | --- | --- | --- | --- | --- |
| GH-001 | 함수 복잡도·호출 빈도로 분석 우선순위 선정 | 중간 | 중간 | SOURCE ARCHIVED / NOT APPLIED | [ghidra_scripts](../references/ghidra-idea-drop-2026-09-08/source/kohnakagawa/ghidra_scripts/) |
| GH-002 | Python 3 스크립트 및 headless 분석 자동화 | 중간 | 높음 | SOURCE ARCHIVED / NOT APPLIED | [Ghidrathon](../references/ghidra-idea-drop-2026-09-08/source/mandiant/Ghidrathon/) |

## 적용 전 확인할 사항

- GH-001: `CalcCyclomaticForAllFunctions.py`, `FindFrequentlyUsedFunctions.py`의 현재 Ghidra API/스크립트 엔진 호환성을 확인하고 복사한 분석 프로젝트에서 결과를 검증한다.
- GH-002: 기존 [Ghidra CLI 환경](ghidra-analysis-environment.md)에 추가 확장이 필요한지 먼저 평가한다. Python/Jep/JDK/Ghidra 조합과 headless 지원은 보관본만으로 검증된 것이 아니다.
- 두 후보 모두 에이전트 SKILL.md나 독립 CLI로 분류하지 않는다.

## 원본·출처

[원본 보관 안내](../references/ghidra-idea-drop-2026-09-08/README.md)와 [파일 명세](../references/ghidra-idea-drop-2026-09-08/MANIFEST.json)에
고정 커밋·라이선스·Git blob 해시·제외 범위를 기록했다.
원본 파일 54개는 upstream과 동일하다. 이미지 5개와 bundled Ghidra 9.2.1 타입 정의는 제외했으며 전체 저장소 복제본은 아니다.

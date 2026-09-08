# Repository-wide tool and skill reference drop — 2026-09-08

공통 아이디어 원장: [#464](https://github.com/hanmiyoo10-alt/-/issues/464).

## 보관 상태

CLI 5개와 스킬 2개의 참고 원본 34개를 보관한다. 설치·활성화·호환성 검증은 수행하지 않았다.
선정은 저장소의 프로젝트 카탈로그, 기존 MCP/스킬/셸/CI 경로와 upstream 문서를 근거로 한 초기 평가이다.

- 스킬: `skills/webapp-testing/`, `skills/mcp-builder/` 각각의 전체 하위 파일을 보관한다.
- CLI: 명세에 적힌 README·라이선스·사용법·참고 소스만 보관한다. 전체 CLI 소스·실행 바이너리·의존성·Git 이력은 포함하지 않는다.
- 원본 내용, 상대 경로, Git 파일 모드를 유지했다. 원본의 링크가 가리키는 미보관 파일은 pinned upstream에서 확인한다.
- `MANIFEST.json`은 각 포함 파일의 크기·Git blob SHA-1·고정 커밋·라이선스를 명시한다.
- 외부 SKILL.md는 `references/` 아래의 참고 자료이며 이 저장소의 활성 지침이나 설치된 스킬이 아니다.
- 각 파일의 생성된 Git blob ID와 upstream tree ID가 모두 일치했다.

## 후보 및 적용 검토

[CANDIDATES.md](CANDIDATES.md)는 #464에 연결할 정적 intake 기록이다.
mutable 우선순위·설계·구현 상태는 #464에 남는다. 이 파일은 별도의 공통 원장이 아니다.

```sh
python3 VERIFY.py
```

체크아웃 후 이 보관 폴더의 VERIFY.py로 원본 바이트 무결성을 재검증할 수 있다.

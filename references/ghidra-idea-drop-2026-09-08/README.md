# Ghidra idea/reference source drop — 2026-09-08

원본 소스 보관용이다. 적용 및 실행 검증 상태는 미확인이다.

## 구성

| Upstream | Commit | License | 보관 범위 |
| --- | --- | --- | --- |
| [mandiant/Ghidrathon](https://github.com/mandiant/Ghidrathon) | `56866ad97ab7cc207ce85542c5ec20e01a10352d` | Apache-2.0 | 이미지 3개를 제외한 원본 텍스트 파일 38개 |
| [kohnakagawa/ghidra_scripts](https://github.com/kohnakagawa/ghidra_scripts) | `5afed1234a7266c0624ec445133280993077c376` | MIT | 이미지 2개와 Ghidra 9.2.1 타입 정의를 제외한 원본 파일 16개 |

- `source/`: 원본 경로·내용·파일 모드를 보존한 텍스트 소스. README와 라이선스도 수정하지 않았다.
- `MANIFEST.json`: 고정 커밋, 파일 크기, Git blob SHA-1, 포함·제외 파일의 전체 목록.
- Git 이력, 배포 바이너리, 외부 의존성은 포함하지 않는다. 전체 레포 백업이 아닌 소스 보관본이다.
- 이미지 원본은 해당 고정 커밋의 upstream에서 확인할 수 있다. 따라서 원본 README의 이미지 링크는 이 보관본에서는 표시되지 않을 수 있다.
- 소스의 workflow는 references 하위에 보관되어 저장소 자동 실행 workflow로 설치되지 않는다.

## 검증 및 재사용

보관 파일 54개 모두 GitHub에 생성한 blob SHA가 upstream tree의 blob SHA와 일치함을 확인했다.
체크아웃 후 아래 명령으로 각 파일을 검증할 수 있다.

```sh
python3 VERIFY.py
```

아이디어 목록: [Ghidra 공통 아이디어 리스트](../../docs/GHIDRA_COMMON_IDEA_LIST.md).
추후 수정본은 별도 작업 경로에 만들고 이 원본은 보존한다.

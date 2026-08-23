# 레포 자동화

## 목적
이 제품 자동화의 1차 목표는 PocketRisu 서버 자동 배포가 아니라 **기억용 문서가 깨지거나 민감 파일이 섞이는 것을 자동으로 막는 것**이다.

## GitHub Actions
공용 workflow: `.github/workflows/pocketrisu-helper-docs.yml`

`products/pocketrisu-helper-mod/**`가 바뀔 때만 동작하며 `ci/validate_docs.py`를 실행한다.

검사:
1. 필수 문서 존재
2. 기능 모듈별 `README.md`
3. Markdown 상대 링크
4. DB/log/PID/snapshot/token file 같은 금지 파일명
5. 흔한 private key/API token 패턴

현재 workflow 권한은 `contents: read`이며 main에 commit/push하지 않는다.

## 작업 완료 시 갱신
- 해당 기능 README
- `CURRENT.md`
- `ROADMAP.md`
- 필요 시 `docs/history.md`
- 결정 변경 시 `docs/decisions.md`

## 아직 자동화하지 않음
- 서버폰 SSH 접속
- PocketRisu 코드 자동 배포
- DB/save 자동 변경
- upstream 자동 merge
- Android notification
- secret/log 수집

안전 updater는 별도 기능 모듈에서 설계한다.

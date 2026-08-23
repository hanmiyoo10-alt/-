# 안전 자동 PocketRisu updater

상태: **TODO**

## 목표
upstream 새 버전을 로컬 개조를 보존하며 안전하게 갱신. 안전 판정이 충분하면 재확인 없이 진행 가능.

## 금지
- 무조건 `git pull`
- dirty tree 무시
- conflict 상태 계속 진행
- backup 없이 overwrite
- 검증 실패 후 새 버전 유지

## 설계
1. 현재 branch/HEAD/dirty 검사
2. backup
3. upstream diff와 custom area compatibility check
4. safe apply
5. syntax/build/health/service 검증
6. 실패 시 이전 상태 rollback
7. 성공/실패는 메인폰 notification relay

서버폰 Android notification 금지.

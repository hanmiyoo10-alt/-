# Local Runtime Tools

Android/Termux에서 사용하는 개인 로컬 런타임 및 운영 도구입니다.

## termux/

`10-start-local-stack`은 기기 부팅 시 다음 작업을 자동으로 수행합니다.

- Termux services 초기화
- `local-usage-runtime-manager` 시작
- PocketRisu 중복 실행 방지
- PocketRisu HTTP readiness 확인 및 재시도
- 시작 중 임시 wake lock 사용 후 자동 해제
- 부팅 진단 로그 기록

실행용 파일은 `~/.termux/boot/10-start-local-stack`에 설치합니다.

이 디렉터리에는 API Key, Bridge Token, 세션/쿠키 등 비밀값을 저장하지 않습니다.

# Local Runtime Tools

Android/Termux에서 사용하는 개인 로컬 런타임 및 운영 도구입니다.

## termux/

`00-update-local-stack`은 Termux:Boot에서 실행되는 **단일 bootstrap**입니다.

부팅 시 다음 순서로 동작합니다.

- 검증된 local runtime을 즉시 실행
- 기존 `~/.termux/boot/10-start-local-stack`이 있으면 runtime 저장소로 자동 마이그레이션
- legacy `10-*` Boot 엔트리를 `~/.termux/boot-disabled/`로 이동
- GitHub `main`의 bootstrap/runtime 최신본을 백그라운드에서 확인
- 다운로드한 스크립트에 `sh -n` 문법 검증 수행
- SHA-256으로 현재 파일과 변경 여부 비교
- 기존 파일을 `~/.termux/boot-backups/`에 백업한 뒤 atomic 교체
- 실패 시 현재 정상 파일을 그대로 유지하고 30초/90초 뒤 재시도
- 실행 중인 PocketRisu나 Local Usage를 강제로 재시작하지 않음
- 업데이트 로그는 `~/pocketrisu-update.log`에 기록

`10-start-local-stack`은 배포용 runtime artifact입니다. 기기에서는 bootstrap이 다음 위치에 설치해 실행합니다.

`~/.local/share/pocketrisu-local-stack/start-local-stack`

runtime은 다음 작업을 수행합니다.

- Termux services 초기화
- `local-usage-runtime-manager` 시작
- PocketRisu를 고정 대기 없이 즉시 시작
- PocketRisu 중복 실행 방지
- Local Usage와 PocketRisu readiness를 함께 확인
- 실패 시 재시도
- 시작 중 임시 wake lock 사용 후 자동 해제
- 부팅 진단 로그를 `~/pocketrisu-start-trace.log`에 기록

최종적으로 `~/.termux/boot/`에는 다음 파일 하나만 남는 구조입니다.

`~/.termux/boot/00-update-local-stack`

자동 업데이트를 임시로 끄려면 다음 marker 파일을 만들 수 있습니다.

`~/.config/pocketrisu-local-stack/disable-auto-update`

이 디렉터리에는 API Key, Bridge Token, 세션/쿠키 등 비밀값을 저장하지 않습니다.

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

`00-update-local-stack`은 GitHub `main`의 `local/termux/`를 안전하게 따라가도록 하는 부팅용 self-updater입니다.

- 네트워크 작업 때문에 부팅을 막지 않도록 백그라운드에서 실행
- updater 자신과 `10-start-local-stack`을 자동 동기화
- 다운로드한 스크립트에 `sh -n` 문법 검증 수행
- SHA-256으로 현재 파일과 변경 여부 비교
- 기존 파일을 `~/.termux/boot-backups/`에 백업한 뒤 atomic 교체
- 실패 시 현재 정상 파일을 그대로 유지하고 30초/90초 뒤 재시도
- 실행 중인 PocketRisu나 Local Usage를 강제로 재시작하지 않음
- 업데이트 로그는 `~/pocketrisu-update.log`에 기록

실행용 파일은 다음 경로에 설치합니다.

- `~/.termux/boot/00-update-local-stack`
- `~/.termux/boot/10-start-local-stack`

자동 업데이트를 임시로 끄려면 다음 marker 파일을 만들 수 있습니다.

`~/.config/pocketrisu-local-stack/disable-auto-update`

이 디렉터리에는 API Key, Bridge Token, 세션/쿠키 등 비밀값을 저장하지 않습니다.

# SECURITY NOTES

이 제품 루트는 운영 지식을 기록하지만 비밀값 저장소가 아니다.

## 절대 커밋하지 않음

- `.local_usage_bridge_token`
- API key / JWT / DevPass 실제 값
- SSH private key / 비밀번호
- `local_usage_snapshot*.json`
- PID / runtime log 원본
- DB/save 원본
- 개인 대화 원문
- `*.bak*` 백업 원본
- 기기 고유 ID

문서에는 필요 시 `<SERVER_LAN_IP>`, `<SERVER_TERMUX_USER>`, `<RELAY_TOKEN>` 같은 placeholder만 사용한다.

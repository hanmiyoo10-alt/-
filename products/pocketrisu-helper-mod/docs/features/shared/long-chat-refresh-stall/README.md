# 초장기챗 새고/복귀 시 health 정체

상태: **INVESTIGATE**

## 현상
초장기챗 새고 시 reconnect watcher가 `state=down`, 약 19초 후 `state=up recovered=1` 기록 및 실제 복구 알림.

## 확인
- 서버 프로세스 재시작 아님: 같은 PID 유지.
- 해당 시각 SSH core tunnel 단절 기록 없음.
- `/api/health` 자체는 DB/disk/external network 없는 초경량.
- `/api/session`은 sync session file write가 있지만 `save/__sessions` 약 7.1KB / 87 entries라 10초대 정체 주원인 가능성 낮음.

## 현재 가설
다른 큰 동기 작업이 Node event loop를 잠깐 막았을 가능성. **원인 확정 아님.**

## 다음
1. 새고 시 DB load/read endpoint 찾기.
2. 큰 stringify/encode/decode 경로 확인.
3. event-loop delay 최소 instrumentation.
4. 재현 후 instrumentation 제거.

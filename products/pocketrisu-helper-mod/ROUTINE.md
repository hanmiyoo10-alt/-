# 포켓리스 보조 개조 작업 루틴

이 문서는 **새 채팅/새 작업에서도 같은 방식으로 안전하게 이어가기 위한 고정 루틴**이다.

원칙: 채팅은 작업 공간이고, 이 제품 루트는 장기 기억이다.

## 0. 작업 시작 — 항상 먼저 읽기

순서:

1. `CURRENT.md`
2. `ROADMAP.md`
3. 이번 작업에 해당하는 `docs/features/<영역>/<기능>/README.md`
4. 필요할 때만 `docs/decisions.md` / `docs/history.md`

시작할 때 확인할 것:

- 이번 작업 담당이 📱 메인폰 / 📱 서버폰 / 📱 양쪽 중 어디인지.
- 현재 상태가 `DONE / ACTIVE / INVESTIGATE / TODO / HOLD` 중 무엇인지.
- 직전의 **다음 한 단계**가 무엇이었는지.
- 실제 기기 상태가 기록과 같은지 애매하면 수정하지 말고 `INSPECT_ONLY`부터.

## 1. 작업 전 — 범위 고정

가능하면 항상:

`INSPECT_ONLY → 백업 → 수정 → 검증`

규칙:

- 한 번에 한 문제 축만 다룬다.
- 메인폰 터널/알림 문제와 서버폰 코드/DB 문제를 섞지 않는다.
- 같은 파일을 메인 SSH 경유와 서버폰 직접 접근으로 동시에 수정하지 않는다.
- 위험하거나 범위가 큰 변경은 단계별로 쪼갠다.
- 예상과 다른 출력이 나오면 다음 수정으로 넘어가지 않는다.

## 2. 작업 중 — 증거를 남긴다

기억해야 할 것은 느낌이 아니라 **검증 가능한 결과**다.

기록 후보:

- 수정 파일/서비스.
- 백업/rollback anchor 이름.
- PID + uptime/duration.
- 정확한 로그 시각과 timezone.
- 성능 측정 전/후.
- syntax/build/test 결과.
- 실제 메인폰 재현 결과.
- 데이터 persistence 재시작 검증.

확정하지 못한 원인은 반드시 `가능성 / 추정 / 조사 중`으로 적는다.

## 3. 기능 하나가 진전될 때 — 해당 기능 문서 갱신

대상:

`docs/features/<영역>/<기능>/README.md`

최소 갱신 항목:

- `상태`
- 현재 동작/관찰
- 이번에 확인한 것
- 검증 근거
- 실패/함정
- rollback 또는 안전 지점
- **다음 한 단계**

기능 폴더가 커지면 필요할 때만 추가:

```text
<feature>/
├─ README.md
├─ INSTALL.md
├─ DIAGNOSTICS.md
├─ ROLLBACK.md
└─ scripts/
```

## 4. 작업 종료 — 기억 동기화

작업을 마칠 때 아래 순서로 동기화한다.

### A. 기능 문서
실제 구현/조사 상태를 가장 자세히 기록.

### B. `CURRENT.md`
**지금 당장 이어서 작업하는 데 필요한 것만** 남긴다.

- 안정적으로 사용 중인 것
- 현재 P0/P1
- 조사 중인 것
- 다음 한 단계
- 절대 되돌리면 안 되는 가드레일

`CURRENT.md`는 작업 일기처럼 길게 만들지 않는다.

### C. `ROADMAP.md`
우선순위나 DONE/TODO가 달라졌을 때 갱신.

### D. `docs/history.md`
의미 있는 기능 완료/큰 성능 개선/운영 구조 변경일 때만 추가.

### E. `docs/decisions.md`
앞으로도 지켜야 할 설계 결정이 새로 생겼을 때만 추가.

## 5. 외부 레포에서 아이디어를 가져올 때

외부 코드를 그대로 복사하는 것보다 **현재 PocketRisu 구조에 맞는 아이디어 단위 포팅**을 우선한다.

분류:

- `바로 포팅 가능` — 작은 범위, 현재 구조와 충돌 낮음.
- `설계 필요` — 가치가 있지만 저장/세션/메모리 구조와 엮임.
- `보류` — 대형 아키텍처 교체 또는 현재 안정화 영역을 흔듦.

반드시 확인:

- 현재 PocketRisu upstream과 이미 겹치는지.
- 우리의 custom save/session/plugin 동작과 충돌하는지.
- hide/pagehide full DB flush를 다시 넣지는 않는지.
- targeted V3 reload를 전체 reload로 퇴행시키지 않는지.
- 서버폰 Android 알림을 추가하지 않는지.

## 6. 고정 가드레일

다음은 명시적 재설계/검증 없이 되돌리지 않는다.

- runit 유지, PM2 신규 도입 금지.
- 서버폰 Android 알림 금지.
- 적극 복구 `pocketrisu-watchdog`을 passive reconnect watcher 대신 사용하지 않음.
- `flushServerDbKeepalive()` no-op 정책 유지.
- hide/pagehide full DB flush 강제 금지.
- `sqlite3` CLI 의존 금지; 필요하면 Node + `better-sqlite3`.
- DB/save 최적화의 incremental hash / selective clone / opaque ETag를 무심코 제거하지 않음.
- V3 targeted reload를 무심코 전체 plugin reload로 되돌리지 않음.
- 토큰/비밀번호/SSH key/DB/snapshot/log/backup 원본 커밋 금지.

## 7. 레포 자동 검증

`products/pocketrisu-helper-mod/ci/validate_docs.py`와 GitHub Actions가 다음을 검사한다.

- 필수 기준 문서 존재.
- 기능 폴더별 `README.md` 존재.
- 금지 runtime/secret 파일.
- 흔한 secret 패턴.
- 깨진 Markdown 상대 링크.
- 이 작업 루틴 문서 존재.
- `CURRENT.md`에 다음 작업 체크포인트가 남아 있는지.

CI는 **read-only validation**이다. 서버폰/메인폰을 자동 수정하거나 PocketRisu를 자동 배포하지 않는다.

## 8. 한 줄 루틴

> **읽기 → 검사 → 백업 → 한 단계 수정 → 검증 → 기능 문서 → CURRENT → ROADMAP → CI**

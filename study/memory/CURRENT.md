# Current Study Memory Snapshot

Status: `EMPTY_BOOTSTRAP`
As of: `2026-09-07`

이 문서는 새 대화/세션이 공부 맥락을 빠르게 재구성하기 위한 **current-only projection**입니다.

중요:

```text
CURRENT.md
!= 원본 장기기억
!= 학습 관찰 원장
!= 전략 결정 권위
```

충돌 시 항상 owning authority가 우선합니다.

## Snapshot health

```text
SNAPSHOT_STATE = EMPTY_BOOTSTRAP
PROFILE_SOURCE = study/memory/PROFILE.md
STRATEGY_SOURCE = study/memory/STRATEGIES.md
EVIDENCE_SOURCE = study/memory/LEDGER.md
CANDIDATE_SOURCE = study/memory/INBOX.md
```

## Active goals

아직 장기기억 시스템에 등록된 활성 목표가 없습니다.

## Active subjects

아직 등록된 활성 과목이 없습니다.

## High-value learner patterns

아직 `PROFILE.md`에서 투영할 확정 패턴이 없습니다.

## Active strategies

아직 `STRATEGIES.md`에서 투영할 활성 전략이 없습니다.

## Current watch items

아직 등록된 항목이 없습니다.

## Immediate next memory action

실제 공부 대화나 문제풀이에서 재사용 가치가 있는 관찰이 생기면 먼저 `INBOX.md` 또는 `LEDGER.md`에 기록하고, 근거가 충분할 때만 `PROFILE.md` / `STRATEGIES.md`로 승격합니다.

## Snapshot states

```text
SNAPSHOT_READY
SNAPSHOT_STALE
SNAPSHOT_BLOCKED
SNAPSHOT_REBUILD_REQUIRED
EMPTY_BOOTSTRAP
```

- `SNAPSHOT_READY`: 원본 기억과 현재 투영이 동기화됨
- `SNAPSHOT_STALE`: 원본이 바뀌었지만 아직 동기화되지 않음
- `SNAPSHOT_BLOCKED`: 원본 권위가 충돌하거나 현재 사실을 추측 없이 정할 수 없음
- `SNAPSHOT_REBUILD_REQUIRED`: 기억 구조 자체의 개편이 필요함
- `EMPTY_BOOTSTRAP`: 시스템은 준비됐지만 승격된 장기기억이 아직 없음

## Update discipline

```text
1. owning memory가 먼저 변경됨
2. 근거/상태를 확인함
3. CURRENT.md를 동기화함
```

`CURRENT.md`의 문구만 바꾼 뒤 그것을 근거로 원본 장기기억을 변경하는 것은 금지합니다.

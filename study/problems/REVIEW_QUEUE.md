# Problem Review Queue

다시 풀거나 다시 확인해야 할 문제/패턴을 관리하는 **현재 작업 큐**입니다.

이 문서는 문제의 역사나 패턴의 의미를 소유하지 않습니다.

```text
문제에서 실제로 무슨 일이 있었나? → LEDGER.md
반복 패턴의 현재 해석은? → PATTERNS.md
무엇을 다시 확인할까? → REVIEW_QUEUE.md
```

## Queue item schema

```text
Queue ID:
Added:
Target: PROBLEM | PATTERN
Target ID:
Reason:
Review mode: RETRY | EXPLAIN | CONTRAST | SPEED_CHECK | TRANSFER_CHECK
Priority: LOW | MEDIUM | HIGH
Due / trigger:
Success condition:
State: OPEN | DONE | CANCELLED | BLOCKED
Result:
Follow-up:
```

## Review modes

- `RETRY`: 같은 문제를 다시 풀어 판단이 교정됐는지 확인
- `EXPLAIN`: 답보다 근거를 자기 말로 설명할 수 있는지 확인
- `CONTRAST`: 헷갈린 두 표현/개념/선지를 직접 비교
- `SPEED_CHECK`: 맞는 판단을 시간 압박 아래에서도 유지하는지 확인
- `TRANSFER_CHECK`: 다른 문제에서도 같은 교정 cue를 적용할 수 있는지 확인

## 큐 운영 원칙

1. 모든 오답을 자동으로 큐에 넣지 않습니다.
2. 같은 문제를 외워서 맞히는 것보다 **다른 문제로 전이되는지**를 더 중요하게 봅니다.
3. `DONE`은 영구 습득을 뜻하지 않습니다. 패턴 재발 시 새 큐 항목을 만들 수 있습니다.
4. 패턴이 충분히 안정되면 단순 재풀이보다 `TRANSFER_CHECK`를 우선합니다.

## Open queue

아직 등록된 복습 항목이 없습니다.

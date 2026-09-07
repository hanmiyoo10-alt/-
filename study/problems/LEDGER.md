# Problem Attempt Ledger

문제 단위 풀이 기록을 보존하는 **append-oriented evidence ledger**입니다.

이 문서는 특정 문제에서 실제로 어떤 판단을 했고, 무엇이 맞거나 틀렸는지를 보존합니다. 반복 약점 여부는 `PATTERNS.md`에서 별도로 판단합니다.

## Entry schema

```text
Problem ID:
Date:
Subject / area:
Source ref:
Result: CORRECT | WRONG | PARTIAL | UNRESOLVED
Confidence before check: LOW | MEDIUM | HIGH

Problem demand summary:
User interpretation / approach:
Correct reasoning summary:

Error type:
Error mechanism:
Next-time cue:

Related pattern IDs:
Review state: NONE | QUEUED | REVIEWED | MASTERED_CHECK
Later evidence / resolution:
```

## 기록 원칙

- 문제 원문이나 해설 원문을 통째로 복사하지 않습니다.
- `User interpretation / approach`는 가능하면 사용자가 실제로 어떤 식으로 읽었는지 남깁니다.
- 틀렸을 때는 정답 자체보다 **오류가 발생한 판단 단계**를 기록합니다.
- 맞았더라도 우연히 맞았거나 근거가 불안정하면 그 사실을 남깁니다.
- 나중에 재평가가 바뀌어도 과거 시점 기록을 삭제하지 않고 후속 내용을 추가합니다.

## Entries

아직 등록된 문제 기록이 없습니다.

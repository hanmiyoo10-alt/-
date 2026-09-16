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

### AI-MATH-W3-3.1

Problem ID: AI-MATH-W3-3.1  
Date: 2026-09-16  
Subject / area: AI 수학 / 도함수와 미분 법칙  
Source ref: `AI 수학 입문` 3주차 연습문제 3.1, 사용자 풀이 사진 `20260916_133912874.jpg`  
Result: WRONG  
Confidence before check: NOT_RECORDED

Problem demand summary: 곱 형태의 유리식 표현을 편한 방식으로 미분한 뒤 특정 점의 도함수 값을 계산한다.  
User interpretation / approach: 곱의 미분법을 바로 쓰지 않고 식을 전개하여 `1 + u^-2 + u^-1 + u^-3` 형태로 만든 뒤 항별로 미분하고 `u=-1`을 대입했다. 전개 전략과 전개 결과는 맞았다.  
Correct reasoning summary: `d(u^n)/du = n u^(n-1)`을 각 항에 적용하면 `J'(u) = -2u^-3 - u^-2 - 3u^-4`이고, `u=-1`을 대입하면 `J'(-1)=-2`이다.

Error type: CALC_PROCESS  
Error mechanism: 마지막 항 `u^-3`을 미분하면서 계수를 `-3`이 아니라 `-4`로 적었다. 지수는 `-4`로 내려가는 것이 맞지만 앞의 계수는 원래 지수 `-3`이어야 한다. 이 한 단계 때문에 최종값을 `-3`으로 계산했다.  
Next-time cue: 거듭제곱 미분 때 `원래 지수 → 앞의 계수`, `지수는 1 감소`를 두 동작으로 분리해 확인한다. 예: `u^-3 → -3u^-4`.

Related pattern IDs: none; 단일 사례이므로 패턴으로 승격하지 않음.  
Review state: NONE  
Later evidence / resolution: pending.

### AI-MATH-W3-3.2

Problem ID: AI-MATH-W3-3.2  
Date: 2026-09-16  
Subject / area: AI 수학 / 연쇄법칙  
Source ref: `AI 수학 입문` 3주차 연습문제 3.2, 사용자 풀이 사진 `20260916_135115459.jpg`  
Result: PARTIAL  
Confidence before check: NOT_RECORDED

Problem demand summary: `tan(sqrt(1+t^2))` 형태의 다층 합성함수를 연쇄법칙으로 미분한다.  
User interpretation / approach: 바깥 `tan`, 가운데 제곱근, 안쪽 `1+t^2`의 세 층을 표시하고 각 층의 미분을 곱하려는 연쇄법칙 구조는 올바르게 잡았다. 다만 최종 식을 확정하지 못했고 `tan` 및 제곱근의 도함수 표현이 섞였다.  
Correct reasoning summary: 바깥부터 미분하면 `sec^2(sqrt(1+t^2)) * (1/(2sqrt(1+t^2))) * 2t`이고, 정리하면 `F'(t) = t sec^2(sqrt(1+t^2)) / sqrt(1+t^2)`이다.

Error type: KNOWLEDGE_GAP  
Error mechanism: 함수의 합성 구조와 연쇄법칙 적용 순서는 인식했지만 기본 도함수 `d(tan x)/dx = sec^2 x`, `d(sqrt{x})/dx = 1/(2sqrt{x})`를 정확히 꺼내 쓰지 못해 식이 섞였다.  
Next-time cue: 연쇄법칙 문제에서는 층을 나눈 뒤 각 층 옆에 기본 도함수만 먼저 적는다: `tan → sec^2`, `sqrt{x} → 1/(2sqrt{x})`, `1+t^2 → 2t`. 그 다음 세 항을 곱한다.

Related pattern IDs: AI-MATH-P1  
Review state: NONE  
Later evidence / resolution: pending.

### AI-MATH-W3-3.3

Problem ID: AI-MATH-W3-3.3  
Date: 2026-09-16  
Subject / area: AI 수학 / 곱의 미분법, 지수함수·삼각함수 미분  
Source ref: `AI 수학 입문` 3주차 연습문제 3.3, 사용자 풀이 사진 `20260916_135845068.jpg`  
Result: PARTIAL  
Confidence before check: NOT_RECORDED

Problem demand summary: `e^theta`와 `(tan theta - theta)`의 곱을 곱의 미분법으로 미분한다.  
User interpretation / approach: 전체 식을 두 인수로 나누고 곱의 미분법의 두 항 구조를 사용하려 했다. 다만 첫 항에서 `(e^theta)'`를 `e^theta`로 유지하지 못했고, 두 번째 항에서 `(tan theta)'`를 `sec^2 theta`로 바꾸지 못했다.  
Correct reasoning summary: `g'(theta) = e^theta(tan theta - theta) + e^theta(sec^2 theta - 1)`. 필요하면 `sec^2 theta - 1 = tan^2 theta`를 써서 `e^theta(tan theta - theta + tan^2 theta)`로 정리할 수 있다.  

Error type: KNOWLEDGE_GAP  
Error mechanism: 곱의 미분법이라는 큰 구조는 인식했지만 기본 도함수 회수 단계에서 `(e^theta)' = e^theta`와 `(tan theta)' = sec^2 theta`를 정확히 유지하지 못했다. 특히 `tan` 도함수 오류는 3.2에 이어 다시 나타났다.  
Next-time cue: 곱의 미분을 전개하기 전에 각 인수 위에 도함수를 따로 적는다: `e^theta -> e^theta`, `tan theta - theta -> sec^2 theta - 1`. 그 다음 `u'v + uv'`에 대입한다.  

Related pattern IDs: AI-MATH-P1  
Review state: NONE  
Later evidence / resolution: pending.

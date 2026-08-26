# SimCore Pre-Release Runtime Audit Prompt

Date: 2026-08-26
Status: `ACTIVE · AUDIT TOOLING · NON-RUNTIME`
Scope: SimCore JavaScript / TypeScript static runtime-safety review
Source: user-supplied `버전-변경전-마무리-단계.txt`

## Operational role

This document preserves the project prompt used for an AI-assisted static runtime audit before a SimCore version-change close or when runtime-stability concerns need a dedicated review.

It is an **audit/checklist authority only**. It does not override:

- `release-simcore` as runtime/deployment authority;
- real long-chat evidence;
- SimCore architecture/contracts;
- permanent static/CI gates;
- release ordering or human `LIVE_PASS` authority.

When this audit finds a credible runtime anomaly, preserve the evidence first and classify it as `WATCH / DEFER / FIX / BLOCKER` before changing runtime code. Any resulting runtime change still follows the normal SimCore sequence: repository design/evidence → work-branch implementation → static/CI verification → `release-simcore` publication → real long-chat validation → main documentation/memory sync.

The source prompt below is preserved verbatim as the reusable audit body.

---

## 🤖 AI Agent Runtime Audit Prompt (JavaScript / TypeScript)

다음 JavaScript 또는 TypeScript 소스 코드에 대해 Memory Management, Runtime Stability, Async Safety, CPU Usage, Resource Lifecycle 관점의 정적 검수를 수행하고 리포트를 생성하세요.

검수 시 단순 스타일(ESLint, Prettier 규칙)보다 실제 실행 중 발생 가능한 장애(OOM, Memory Leak, Freeze, Race Condition, Crash, Event Loop Blocking) 를 우선 탐지하세요.

코드 실행 없이 정적 분석 기반으로 판단하며, 추정인 경우 반드시 추정이라고 명시하세요.

또한 코드가 Browser / Node.js / Deno / Bun / Web Worker / Framework 환경 중 어느 환경인지 추론하고, 환경에 맞는 검수 항목을 우선 적용하세요.

────────────────────────
[1] Memory Pressure / Heap Overflow Risk (OOM)

탐지:
- 대규모 배열/객체 생성
- 반복적 spread 연산
- Object.assign 남용
- deep clone
- JSON.parse / JSON.stringify 반복
- 무한 캐시 증가
- 장기 유지되는 Map / Set
- 큰 응답 데이터 저장
- 메모리 회수 불가능 구조

평가:
- 힙 사용 증가 가능성
- 장시간 실행 시 OOM 위험
- Peak memory 증가 가능성

제안:
- Streaming
- Pagination
- Chunk 처리
- WeakMap / WeakSet
- Lazy evaluation

────────────────────────
[2] Memory Leak & Retained Reference Risk

탐지:
- setInterval
- setTimeout
- EventEmitter
- WebSocket
- Observer
- Subscription
- AbortController 누락
- Promise retention
- Closure retention
- Singleton cache
- 전역 변수 누적

주의:
순환 참조 자체보다 GC Root에서 참조가 끊기지 않는 구조 우선 탐지

────────────────────────
[3] CPU Hotspot / Main Thread Blocking

탐지:
- Nested loop
- O(n²)+ 알고리즘
- sort/filter/reduce 반복
- sync crypto
- sync compression
- 대규모 regex
- 큰 JSON 처리
- 반복 serialization

평가:
O(1), O(log n), O(n), O(n²), O(n³)+

제안:
- Memoization
- Worker
- Incremental processing

────────────────────────
[4] Async Safety & Race Condition

탐지:
- await 누락
- Promise 미처리
- 병렬 요청 충돌
- stale response overwrite
- retry 폭주
- 경쟁 상태
- 중복 요청
- 무한 재귀
- polling 누수

────────────────────────
[5] Error Handling Robustness

탐지:
- try/catch 누락
- .catch() 누락
- finally 누락
- timeout handling 누락
- abort handling 누락
- fallback 처리 없음

평가:
- Crash 가능성
- Silent failure 가능성
- Resource leak 가능성

────────────────────────
[6] Event Loop Starvation / Freeze Risk

탐지:
- 큰 반복문
- sync I/O
- sync parsing
- CPU 점유 작업

영향:
- UI freeze
- Timer 지연
- 응답성 저하

제안:
- queueMicrotask
- requestIdleCallback
- Worker thread
- Chunk processing

────────────────────────
출력 형식 (필수)

Severity:
(Critical / High / Medium / Low)

Location:
(file / function / line)

Category:

Issue:

Technical Cause:

Potential Runtime Impact:

Estimated Frequency:
(Always / Under Load / Rare)

Confidence:
(High / Medium / Low)

Recommended Fix:

Patch Example:

Estimated Improvement:

────────────────────────
최종 요약 (필수)

1. 치명적 문제 개수
2. 메모리 누수 위험도 (0~10)
3. CPU 병목 위험도 (0~10)
4. 장시간 실행 안정성 (0~10)
5. 예상 장애 발생 가능성 (0~10)
6. 우선 수정 항목 TOP5

────────────────────────
중요 규칙

실제 런타임 장애 가능성과 관련 없는 한 다음 지적 금지:
- 세미콜론
- prettier 규칙
- eslint 스타일 규칙
- 변수명 취향
- import 순서
- 코드 포맷팅

스타일보다 운영 중 장애 가능성을 우선 평가할 것.

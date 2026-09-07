# Study

`study/`는 이 저장소 안에서 **공부 관련 자료만 다루는 독립 루트**입니다.

플러그인 개발·배포·운영 경로(`plugins/`, `products/`, `config/` 등)와 분리해서 사용합니다. 이 경로의 문서나 자료가 기존 릴리즈/업데이트 체계의 authority로 해석되지 않도록 합니다.

## 용도

- 개념 정리
- 문제 풀이 및 해설
- 오답·실수 패턴 기록
- 공부 계획과 회고
- 과목별 참고자료 및 체크리스트
- 장기 학습기억 및 전략 연속성 관리
- 문제 단위 풀이 기록과 복습 큐 관리

## 현재 구조

```text
study/
  README.md
  memory/
    README.md
    INBOX.md
    LEDGER.md
    PROFILE.md
    STRATEGIES.md
    CURRENT.md
  problems/
    README.md
    LEDGER.md
    PATTERNS.md
    REVIEW_QUEUE.md
  psat/
  computer-science/
  logs/
  resources/
```

`memory/`는 학습자 특성과 전략의 장기기억을, `problems/`는 개별 문제와 반복 오류 패턴의 증거를 담당합니다. 과목별 폴더는 필요해질 때 하나씩 추가합니다.

## 장기기억 진입점

- 구조와 규칙: `study/memory/README.md`
- 현재 상태 빠른 확인: `study/memory/CURRENT.md`
- 검증 전 후보: `study/memory/INBOX.md`
- 시간축 관찰: `study/memory/LEDGER.md`
- 안정적 학습 특성: `study/memory/PROFILE.md`
- 공부 전략 및 변경 이력: `study/memory/STRATEGIES.md`

## 문제 기억 진입점

- 구조와 분류 규칙: `study/problems/README.md`
- 개별 문제 기록: `study/problems/LEDGER.md`
- 반복 오류/성공 패턴: `study/problems/PATTERNS.md`
- 다시 확인할 항목: `study/problems/REVIEW_QUEUE.md`

## 기본 원칙

1. **공부 자료는 `study/` 안에서 완결**시킵니다.
2. 기존 플러그인·제품 코드와 직접 의존하지 않습니다.
3. 날짜가 필요한 기록은 `YYYY-MM-DD` 형식을 우선 사용합니다.
4. 문제 풀이에서는 정답만 저장하기보다 `왜 틀렸는지 / 어떤 패턴이었는지 / 다음에 어떻게 판별할지`를 함께 남깁니다.
5. 민감한 개인정보, 계정 정보, 자격증명은 저장하지 않습니다.
6. 대화에서 한 번 나온 내용을 곧바로 장기기억으로 확정하지 않습니다.
7. 현재 상태 요약은 원본 기억을 대체하지 않습니다.
8. 한 문제의 오답을 곧바로 일반적인 약점으로 승격하지 않습니다.
9. 문제 원문이나 해설 원문을 장기 저장소에 통째로 복제하지 않습니다.

## 확장 원칙

처음부터 구조를 과하게 고정하지 않습니다. 실제 공부 흐름에서 반복되는 문제가 생길 때만 새 시스템이나 자동화를 추가합니다.

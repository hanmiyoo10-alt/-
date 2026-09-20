# AI Programming Week 2 Assignment Session — 2026-09-20

Status: `ACTIVE`

## Goal

- Subject: AI 프로그래밍입문
- Target: 2주차 과제
- User target: 2026-09-20 23:00 KST까지 마무리
- Completion rule: 문제 원문 확인 → 풀이/코드 작성 → 실행 결과 검증 → 제출물 형태 확인까지 끝나야 완료로 간주한다.

## Authority and current sources

Repository study rules:
- `study/README.md`
- `study/memory/README.md`
- `study/problems/README.md`

Current AI programming evidence:
- `study/logs/2026-09-14-ai-programming-colab.md`
- `study/memory/LEDGER.md` entries E-2026-09-14-001 ~ 003

Google Drive current course folder:
```text
학교_전공공부
→ AI 프로그래밍입문
→ 2주차
```

Observed direct children of the 2주차 folder on 2026-09-20:
- `Untitled1.ipynb의 사본`
- `Untitled0.ipynb의 사본`
- `02변수와연산자.pdf`
- `02_변수와 자료형 1.mp4`
- `02_변수와 자료형 2.mp4`
- `음성 260914_130640.m4a`

## Current progress

The latest 2주차 Colab copy was re-read. It contains practice evidence for:
- variables and assignment
- arithmetic operators
- `input()` and `int()`
- quotient/remainder
- accumulated assignment such as `+=`
- average calculation
- f-string formatting with `:.2f`
- quote boundaries and escape sequences

The last confirmed successful correction in the notebook is:
- average calculation with f-string two-decimal formatting.

The prior unresolved learning boundary remains narrow:
- quote/string literal boundary
- escape sequences such as `\n`, `\t`, and literal backslashes

This remains learning context only and is not assumed to be the assignment requirement.

## 2주차 media verification — 2026-09-20

### PDF — `02변수와연산자.pdf`

- Source file verified directly from Drive.
- 51 pages.
- Main sequence:
  1. variables and user input
  2. expressions/operators
  3. string formatting
  4. exercises
- Verified examples include:
  - triangle area
  - swapping two variables
  - `input()` and `int()`
  - Celsius/Fahrenheit conversion
  - circle circumference/area
  - quotient/remainder
  - Pythagorean hypotenuse
  - compound assignment and daily sales
  - comparison/logical operators and precedence
  - average score
  - f-string formatting, `:.2f`, alignment, escape sequences
- Exercise section contains four tasks:
  - backslash/special-character output
  - compound-interest calculation
  - BMI calculation
  - dog/cat numeric difference using string values

### Video 1 — `02_변수와 자료형 1.mp4`

- Duration: about 19m 38s.
- 1920x1080, H.264 video + AAC stereo audio.
- Sampled frames verify the lecture progresses through:
  - variable concept
  - changing stored values
  - triangle-area example
  - variable swapping
  - `input()`
  - integer conversion
  - Celsius/Fahrenheit example
  - circle circumference/area
  - hands-on Colab practice near the end
- The sampled slide sequence is consistent with the early part of the 2주차 PDF.

### Video 2 — `02_변수와 자료형 2.mp4`

- Duration: about 16m 19s.
- 1920x1080, H.264 video + AAC stereo audio.
- Sampled frames verify:
  - string-to-number conversion
  - Colab practice
  - string indexing/slicing example
  - f-string/string-formatting section
  - additional hands-on Colab work
- This video extends beyond only arithmetic/operators and includes practical string handling/formatting.

### Audio — `음성 260914_130640.m4a`

- Raw source verified directly from Drive.
- Duration: 1h 31m 23s.
- AAC mono, 48 kHz.
- File/container metadata indicates a Samsung Android recording environment.
- Filename timestamp `260914_130640` plus the duration aligns closely with a finish time around 14:38, which is also consistent with the file metadata creation time.
- The audio track is non-empty and has normal recorded signal energy.
- No authoritative transcript/caption surface was found. Spoken semantic content is therefore not claimed from metadata alone.

## Assignment source search

The 2주차 Drive folder contains no file explicitly named as the assignment.

Drive-wide searches using:
- `AI 프로그래밍 과제`
- `2주차 과제`
- `과제`

did not identify a reliable AI 프로그래밍 2주차 assignment prompt.

Therefore:

```text
ASSIGNMENT_PROMPT = UNKNOWN
```

Do not infer the assignment from the practice notebook or lecture PDF.

## Repository write gate observation

A direct create attempt on the default branch was rejected by the protected-branch status check:
- required status check: `Required`
- no bypass attempted

The session log is therefore being proposed through a normal branch/PR path.

## Next action

Acquire the actual assignment prompt from the user or another authoritative course surface, then:
1. split it into required outputs;
2. solve one requirement at a time;
3. run/verify every code result;
4. preserve any new problem-specific errors in `study/problems/`;
5. update this session log with verified completion state.

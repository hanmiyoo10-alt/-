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

## Assignment hypothesis — 2026-09-20

The user identified the PDF Exercise section as the likely week-2 assignment source.

Direct visual re-check of the PDF confirms a dedicated final section titled `Exercise` followed by exactly four exercise slides:

1. `Exercise 1: 역슬래시(\) 출력 프로그램`
   - reproduce the shown multi-line English output with quotes, literal backslash text, and a Windows-style path.
2. `Exercise 2: 원리금 계산 프로그램`
   - input `money`, `rate`, and `year`, then calculate and print `total = money(1+rate)^year`.
   - shown example: 3,500,000 principal, 0.03 annual rate, 3 years → 3,824,544.50 won.
3. `Exercise 3: BMI(비만도) 계산 프로그램`
   - input weight and height as real numbers and compute `bmi = weight / (height**2)`.
   - shown example: 95 kg, 1.82 m → BMI 28.68.
4. `Exercise 4: dog와 cat 계산 문제`
   - given string variables `dogs = '367'` and `cats = '195'`, convert/use them numerically and print that dogs exceed cats by 172.

Current classification:
```text
ASSIGNMENT_CANDIDATE = PDF_EXERCISE_1_TO_4
CONFIDENCE = HIGH
AUTHORITATIVE_INSTRUCTOR_CONFIRMATION = NOT_YET_VERIFIED
```

Until a course announcement or spoken instruction confirms submission scope, keep this as a high-confidence assignment candidate rather than an absolute fact.

## Assignment source search

The 2주차 Drive folder contains no file explicitly named as the assignment.

Drive-wide searches using:
- `AI 프로그래밍 과제`
- `2주차 과제`
- `과제`

did not identify a separate reliable AI 프로그래밍 2주차 assignment prompt.

Therefore the dedicated PDF Exercise section is currently the strongest assignment candidate.

## Repository write gate observation

A direct create attempt on the default branch was rejected by the protected-branch status check:
- required status check: `Required`
- no bypass attempted

The session log is therefore being proposed through a normal branch/PR path.

## Next action

Proceed through Exercise 1 → 4 unless stronger course evidence changes the scope:
1. understand the required output;
2. write the code;
3. execute and compare with the PDF example;
4. record any problem-specific errors;
5. verify final submission form before marking the assignment complete.


## Uploaded assignment review — Exercise 1

The current uploaded week-2 assignment Colab was re-read on 2026-09-20.

Observed state:
- the notebook currently contains one code cell;
- that cell is an attempt at PDF Exercise 1;
- execution state is `SyntaxError`;
- Exercises 2–4 are not present in the current notebook snapshot yet.

The attempt shows the intended output structure but mixes:
- line-continuation backslash,
- argument commas,
- quote boundaries,
- literal `\n`/`\t`,
- Windows-path backslashes.

Validated correction strategy:
- use one `print()` per required output line;
- escape the apostrophe only where needed or choose a compatible outer quote;
- use `\\n` and `\\t` when the literal characters backslash+n/backslash+t must appear;
- use doubled backslashes in the Windows-style path.

A corrected reference form was executed separately and produced the five PDF lines exactly. The user's own Colab still needs to be corrected and re-run before Exercise 1 is marked complete.


## Exercise 1 re-check — second saved attempt

Latest Drive snapshot modified at 2026-09-20 22:18 KST.

Progress observed:
- literal `\\n` / `\\t` intent is now represented inside a string;
- Windows-style path backslashes are doubled;
- the learner added a markdown self-note distinguishing some escape cases.

Remaining blocker:
- the code uses `\\n` outside a string literal as though it were a source-code line separator;
- multiple output pieces are not separated by commas or separate `print()` calls;
- `He said "What's there?"` is not enclosed as a Python string.

Current result remains `SyntaxError`. Exercise 1 is not complete yet.


## Exercise 1 re-check — successful execution

Latest Drive snapshot modified at 2026-09-20 22:24 KST.

Verified:
- newest code cell executed successfully (`execution_count = 3`);
- quote-boundary handling is now valid;
- literal `\\n` / `\\t` output is correct;
- Windows-style path backslashes are correct;
- the intended five output lines are present.

Remaining exact-output difference:
- the fourth line begins with one extra space before `Newline character...`;
- cause: one comma separates two `print()` arguments, so Python inserts the default separator space.

Exercise 1 state: `PARTIAL — ONE LEADING SPACE REMAINS`.
Exercises 2–4 are not present in the current notebook snapshot yet.


## Exercise 1 final verification

Latest Drive snapshot modified at 2026-09-20 22:28 KST.

Verified newest execution:
- `execution_count = 4`
- execution status: success
- all five lines match the PDF Exercise 1 example, including the prior leading-space issue
- literal `\\n` / `\\t`, apostrophe, quoted text, and Windows-style path are all correct

Exercise 1 state: `CORRECT / COMPLETE`.

Current notebook snapshot still contains Exercise 1 work only; Exercise 2–4 are not yet present.


## Exercise 2 first review

Latest Drive snapshot modified at 2026-09-20 22:39 KST.

Observed new Exercise 2 cell:
- execution count: 5
- result: TypeError after the first input
- first entered value: 350000

Primary blocker:
- code uses `int(print(input(...)))`;
- `print()` returns `None`, so `int(None)` raises TypeError.

Additional PDF mismatches:
- interest rate should accept a decimal such as `0.03`, so it needs floating-point conversion rather than `int`;
- the PDF formula is compound interest: `total = money * (1 + rate) ** year`;
- the current expression does not use that formula;
- the final output needs the actual year and total value, formatted to two decimal places.

Exercise 2 state: `WRONG / CORRECTION NEEDED`.


## Exercise 2 re-check — second attempt

Latest Drive snapshot modified at 2026-09-20 22:43 KST.

Progress:
- previous `int(print(input(...)))` misuse was corrected to direct `int(input(...))`;
- principal input 3500000 is accepted.

Current blocker:
- interest-rate variable still uses `int(input(...))`;
- entering 0.03 raises `ValueError: invalid literal for int() with base 10: '0.03'`.

Still remaining after that blocker:
- use `float(input(...))` for the interest rate;
- replace current arithmetic with the PDF compound-interest formula `money * (1 + rate) ** year`;
- replace `f(print(...))` with an f-string inside `print(...)`, formatting the result with `:.2f`.

Exercise 2 state: `WRONG / PROGRESS MADE`.


## Exercise 2 re-check — third attempt

Latest Drive snapshot modified at 2026-09-20 22:48 KST.

Progress verified:
- `money = int(input(...))` works;
- `rate = float(input(...))` works;
- `year = int(input(...))` works;
- example inputs 3500000, 0.03, 3 are all accepted.

Current blocker:
- current code uses `total = money(1+rate)*year`;
- Python interprets `money(...)` as a function call, causing `TypeError: 'int' object is not callable`;
- compound-interest period must be exponentiation, not multiplication.

Required calculation:
- `total = money * (1 + rate) ** year`

Final print is also still pending correction:
- use `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`.

Exercise 2 state: `WRONG / INPUT STAGE COMPLETE`.


## Exercise 2 re-check — fourth attempt

Latest Drive snapshot modified at 2026-09-20 22:53 KST.

Progress verified:
- input types are now correct: principal=int, rate=float, year=int;
- compound-interest formula is now correct: `total = money * (1 + rate) ** year`.

Current blocker:
- final line uses malformed f-string syntax similar to `f'{print('...')}`;
- this causes `SyntaxError: unterminated f-string literal`.

Required final output form:
- `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`

Exercise 2 state: `PARTIAL / ONLY FINAL F-STRING REMAINS`.
Exercise 3 is not present in the current notebook snapshot yet.


## Exercise 2 re-check — fifth attempt

Latest Drive snapshot modified at 2026-09-20 22:58 KST.

Verified:
- principal/rate/year input types are correct;
- compound-interest formula is correct: `total = money * (1 + rate) ** year`;
- learner now recognizes that f-string variables belong in `{ }`.

Current blocker at execution count 16:
- final line starts with malformed `print(f'('...` structure;
- format specifier is written as `{total\2f}` instead of `{total:.2f}`;
- result is `SyntaxError`.

Exact target:
- `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`

Exercise 2 state: `PARTIAL / FINAL F-STRING ONLY`.
Exercise 3 is not present in the current notebook snapshot yet.


## Exercise 2 re-check — sixth attempt

Latest Drive snapshot modified at 2026-09-20 23:02 KST.

Verified:
- input types remain correct;
- compound-interest calculation remains correct;
- learner corrected the decimal-format idea toward `:.2f`.

Current execution count 18 still fails:
- code uses `print(f'('{year}년 후의 원리금은 {total: .2f}원 입니다.'))`;
- the f-string closes immediately after `f'('`, so the following Korean text and braces are outside the string;
- PDF-exact formatting should also use `{total:.2f}` without the extra sign-space option.

Exact final line:
- `print(f'{year}년 후의 원리금은 {total:.2f}원 입니다.')`

Exercise 2 state: `PARTIAL / FINAL STRING BOUNDARY ONLY`.
Exercise 3 is not present in the current notebook snapshot yet.


## Exercise 2 final verification

Latest Drive snapshot modified at 2026-09-20 23:07 KST.

Verified newest execution:
- `execution_count = 24`
- execution status: success
- example inputs: 3500000, 0.03, 3
- output: `3년 후의 원리금은 3824544.50원 입니다.`
- input conversions, compound-interest formula, f-string interpolation, and `:.2f` formatting are all correct

Exercise 2 state: `CORRECT / COMPLETE`.

Current notebook snapshot has an empty new code cell after Exercise 2, but no Exercise 3 solution code yet.


## Exercise 3 first review

Latest Drive snapshot modified at 2026-09-20 23:15 KST.

Observed new Exercise 3 cell:
- execution count: 29
- inputs: weight 95, height 1.82
- calculation: `BMI = weigh / (heigh**2)`
- execution status: success
- calculated value: 28.68

PDF comparison:
- numeric result is correct;
- PDF asks for both height and weight as real numbers, while current weight input uses `int`;
- current output is `(당신의 28.68=입니다.)`, which does not match the example label/order;
- target output is `당신의 BMI= 28.68입니다.`.

Exercise 3 state: `PARTIAL / CALCULATION CORRECT, INPUT TYPE + OUTPUT TEXT NEED FIX`.


## Exercise 3 re-check

Latest Drive snapshot modified at 2026-09-20 23:17 KST.

Verified newest execution:
- `execution_count = 30`
- execution status: success
- example inputs: weight 95, height 1.82
- calculated BMI: 28.68
- output now includes the BMI label: `(당신의 BMI=28.68입니다.)`

Remaining PDF-exact differences:
- weight still uses `int(input(...))`, while the exercise asks for real-valued height and weight input;
- output has surrounding parentheses;
- target example has a space after `BMI=`: `당신의 BMI= 28.68입니다.`

Exercise 3 state: `PARTIAL / TWO SMALL FORMATTING-REQUIREMENT FIXES REMAIN`.
Exercise 4 is not present in the current notebook snapshot yet.


## Exercise 3 re-check — latest saved edit

Latest Drive snapshot modified at 2026-09-20 23:19 KST.

Progress:
- output code is now corrected to `print(f'당신의 BMI= {BMI:.2f}입니다.')`;
- surrounding parentheses were removed and the space after `BMI=` was added.

Remaining:
- weight still uses `int(input(...))` instead of the exercise-requested real-number input;
- newest cell has `execution_count = null` and no output, so the corrected code has not yet been execution-verified.

Exercise 3 state: `PARTIAL / OUTPUT FIXED, WEIGHT FLOAT + RUN REQUIRED`.
Exercise 4 is not present in the current notebook snapshot yet.


## Exercise 3 re-check — execution verified

Latest Drive snapshot modified at 2026-09-20 23:22 KST.

Verified:
- `execution_count = 32`
- execution status: success
- inputs: 95, 1.82
- output: `당신의 BMI= 28.68입니다.`
- BMI formula and output text now match the PDF example

Remaining requirement gap:
- weight still uses `int(input(...))`;
- PDF explicitly asks for both height and weight as real-number input, so weight should also use `float(input(...))`.

Exercise 3 state: `PARTIAL / ONLY WEIGHT FLOAT REMAINS`.

## Exercise 4 first review

A new Exercise 4 cell is present and executed successfully (`execution_count = 33`).

Observed:
- `dogs = '367'`
- `cats = '195'`
- current output is a fixed sentence without the numeric difference

PDF requirement:
- convert the string numbers to numeric values;
- compute the difference 172;
- output `강아지가 고양이보다 172마리 더 많다`.

Exercise 4 state: `WRONG / STRING-TO-INT CONVERSION + DIFFERENCE CALCULATION REQUIRED`.


## Exercise 4 re-check

Latest Drive snapshot modified at 2026-09-20 23:28 KST.

Verified newest Exercise 4 execution:
- `execution_count = 38`
- `dogs = '367'`
- `cats = '195'`
- `difference = int(dogs) - int(cats)` is correct

Current output:
- `강아지가 고양이보다 int(difference)마리 더 많다`

Current blocker:
- `int(difference)` is inside quotes, so it is printed as literal text;
- `difference` is already an int, so no second `int(...)` conversion is needed;
- use an f-string to insert the value.

Target:
- `print(f'강아지가 고양이보다 {difference}마리 더 많다')`
- expected output: `강아지가 고양이보다 172마리 더 많다`

Exercise 4 state: `PARTIAL / CALCULATION COMPLETE, OUTPUT INTERPOLATION REMAINS`.

Exercise 3 remains unchanged from the prior verified state: calculation/output correct, but weight input still uses `int(input(...))` rather than the PDF-requested real-number input.


## Latest verification — Exercise 3 and 4

Latest Drive snapshot modified at 2026-09-20 23:32 KST.

### Exercise 3
Latest source now uses:
- `weigh = float(input(...))`
- `heigh = float(input(...))`
- correct BMI formula
- correct output string `당신의 BMI= {BMI:.2f}입니다.`

However, the cell still shows `execution_count = 32` and the same output from the earlier run when the source still used `int(input(...))`. Colab can retain stale output after source edits.

Exercise 3 state: `PARTIAL / CODE CORRECT, RERUN REQUIRED FOR EVIDENCE`.

### Exercise 4
Verified newest execution:
- `execution_count = 42`
- `difference = int(dogs) - int(cats)`
- `print(f'강아지가 고양이보다 {difference}마리 더 많다')`
- output: `강아지가 고양이보다 172마리 더 많다`

Exercise 4 state: `CORRECT / COMPLETE`.

Overall verified state:
- Exercise 1: COMPLETE
- Exercise 2: COMPLETE
- Exercise 3: code corrected, rerun required
- Exercise 4: COMPLETE


## Week 1 PDF submission protocol check

Source checked: both copies of the week-1 PDF (`01파이썬 소개(입문).pdf` and `01파이썬 소개(입문)_260829_143434.pdf`). The submission instructions are consistent and are repeated in the deck.

Verified submission protocol:
- submit by sharing the practiced/assignment Colab notebook;
- 반드시 학번과 이름을 주석으로 입력하고 시작;
- change General access to `링크가 있는 모든 사용자`;
- permission shown is viewer/read-only;
- copy the share link;
- paste that link into the Cyber Campus assignment room.

The PDF does not state a mandatory filename naming convention for submission. It also does not instruct students to download and upload the `.ipynb` file; submission is via the shared Colab link.


## Clean submission-copy check

A new Colab file was added directly under the `AI 프로그래밍입문` Drive folder:
- title: `202431697 배지혜 2주차 과제의 사본의 사본`
- created 2026-09-20 23:41 KST
- modified 2026-09-20 23:43 KST

Verified contents:
- one compact notebook containing only the final Week-2 solutions;
- Exercise 1 through Exercise 4 are all present;
- execution counts are cleanly sequenced 1, 2, 3, 4;
- Exercise 2 outputs 3824544.50 for the PDF example;
- Exercise 3 source uses float for both weight and height and the executed output is `당신의 BMI= 28.68입니다.`;
- Exercise 4 outputs `강아지가 고양이보다 172마리 더 많다`.

Submission-format note:
- the notebook begins with a Markdown cell containing `# 202431697` and `# 배지혜`;
- the Week-1 PDF wording says to begin by entering student number and name as comments. A Markdown heading is not a Python code comment, so for strict compliance the safer form is a code cell containing `# 202431697` and `# 배지혜`.
- Drive metadata reports the file as shared but does not expose enough permission metadata to verify `Anyone with the link / Viewer`; this must still be checked in the Colab Share dialog.

The filename has an inherited copy suffix (`의 사본의 사본`). Week-1 PDF does not impose a filename rule, but renaming to a clean title would reduce submission ambiguity.


## Clean submission-copy re-check

Latest submission-copy snapshot modified at 2026-09-20 23:47 KST.

Verified improvements:
- student number/name are now in a Python code cell as comments: `# 202431697`, `# 배지혜`;
- Exercise 1 output is correct;
- Exercise 2 source/output remain correct, including 3824544.50;
- Exercise 3 uses float for both inputs and output remains `당신의 BMI= 28.68입니다.`;
- Exercise 4 outputs `강아지가 고양이보다 172마리 더 많다`.

Presentation anomaly:
- assignment-number Markdown headings are shifted one position downward:
  - Exercise 1 code appears before the `1번 과제` heading;
  - `1번 과제` is before Exercise 2;
  - `2번 과제` is before Exercise 3;
  - `3번 과제` is before Exercise 4;
  - a trailing `4번 과제` heading remains after Exercise 4.
- easiest safe cleanup is to move/add headings so each heading precedes its matching code, or remove the optional headings entirely.

Other submission notes:
- filename still contains `의 사본의 사본`; filename naming is not mandated by the Week-1 PDF, but a clean rename is advisable;
- Drive metadata still does not expose enough permission detail to verify `Anyone with the link / Viewer`; check this in the Colab Share dialog.


## Submission-copy final layout re-check

Latest snapshot modified at 2026-09-20 23:48 KST.

Verified cleanup:
- filename is now `202431697 배지혜 2주차 과제`;
- student number/name are in the first Python code cell as comments;
- the shifted assignment-number Markdown headings were removed;
- solution cells now appear directly in the intended Exercise 1 → 2 → 3 → 4 order;
- Exercise 1 source is correct;
- Exercise 2 source is correct and saved output shows 3824544.50;
- Exercise 3 source uses float for both inputs and saved output shows 28.68;
- Exercise 4 source is correct and saved output shows 172.

Verification caveat:
- in this cleaned copy, all code cells currently have `execution_count = null` even though outputs are retained from the source copy;
- therefore the saved outputs are not fresh execution evidence from this exact cleaned copy;
- safest pre-submission action is to rerun each solution cell in the cleaned copy so current source and output are freshly paired.

Share permission remains unverified from Drive metadata; check `Anyone with the link / Viewer` in the Colab Share dialog before submission.

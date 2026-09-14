# AI Programming Colab Study Log — 2026-09-14

Status: `ACTIVE_OBSERVATION`

## Source

Current practice sources:

```text
Google Drive
→ 코랩
→ Untitled1.ipynb

Google Drive
→ 학교_전공공부
→ AI 프로그래밍입문
→ 2주차
→ Untitled1.ipynb의 사본
```

The original notebook was identified as the user-specified 16:57 KST Colab work. The 2주차 copy may be recreated under the same display name, so Drive IDs and share URLs are intentionally not copied into this public repository and the folder should be re-read before assuming a particular copy is current.

Reference material now used alongside the notebook:

```text
Google Drive
→ 학교_전공공부
→ AI 프로그래밍입문
→ 2주차
→ 02변수와연산자.pdf
→ 02_변수와 자료형 1.mp4
→ 02_변수와 자료형 2.mp4
→ 음성 260914_130640.m4a
```

The PDF sequence matters for interpreting the notebook: immediately after the average-score exercise, the material introduces string formatting and f-strings, including `:.2f` for two decimal places.

## Current learner report and evidence

The user reports that the material before the final exercise is now mostly comfortable to solve.

The first clear current bottleneck appears across the transition from numeric calculation to output formatting. In the average-score exercise, the learner correctly reached a floating-point average but then tried `//`, `%`, and `/3.0` while looking for a way to display only two decimal places. The course PDF treats this as a formatting problem rather than a different calculation, using an f-string format such as `{value:.2f}`.

In the newest 2주차 Colab copy, the learner has now written the average-score output in the correct f-string form:

```python
print(f'3과목의 평균 점수는 {avg:.2f} 점 이다.')
```

This is evidence that the specific `f-string + :.2f` correction was successfully applied once. It is not yet treated as durable mastery; a fresh transfer problem should confirm it.

The following string-output exercise combines several string-syntax rules at once.

Observed concepts colliding in that exercise:

```text
calculated value vs displayed representation
+ f-string formatting such as :.2f
+ outer string delimiter
+ apostrophe inside text
+ double quote inside text
+ escape sequences such as \n and \t
+ literal backslash text such as \\n / \\t
+ Windows-style path backslashes
```

The notebook shows `SyntaxError` outcomes around this exercise. The immediate interpretation remains a narrow `OUTPUT_FORMAT / STRING_ESCAPE / QUOTE_BOUNDARY` learning boundary, not a general Python weakness.

## What is currently treated as working baseline

Based on the user's current self-report, earlier introductory material is provisionally treated as substantially more comfortable, including variables, basic arithmetic, simple input conversion, and basic calculations.

The successful f-string correction is added to the current working evidence, but transfer to a new problem should be checked before promoting it to long-term memory.

## Next validation

Teach and test the boundary in this order:

1. give one fresh f-string formatting problem to confirm `:.2f` transfers;
2. apostrophe inside a double-quoted string;
3. double quotes inside a single-quoted string;
4. `\n` as a newline versus `\\n` as the two literal characters backslash+n;
5. `\t` as a tab versus `\\t` as literal text;
6. a Windows-style path containing backslashes;
7. finally recombine all rules into the original one-line `print()` task.

Only repeated failure across these isolated exercises should be promoted into a broader error pattern.

# AI Programming Week 3 Study Log — 2026-09-28

Status: `ACTIVE_OBSERVATION`

## Goal

- Subject: AI 프로그래밍입문
- Target: 3주차
- Current phase: source inventory and current-progress reconstruction before active solving

## Current source authority

Repository study rules:
- `study/README.md`
- `study/memory/README.md`
- `study/problems/README.md`

Current Google Drive course path:

```text
학교_전공공부
→ AI 프로그래밍입문
→ 3주차
```

The folder was re-read directly on 2026-09-28. Drive IDs/share URLs are intentionally not copied into this public repository.

## Observed 3주차 files

Direct children currently observed:
- `03조건문.pdf`
- `수업중 진도 과정...!.ipynb`
- `음성 260928_130501.m4a`
- `음성 260928_130501_original.txt`
- `20260928_142449341.jpg`

### PDF — `03조건문.pdf`

- 21 pages.
- Main topic is Python conditionals:
  - boolean condition expressions
  - `if`
  - `if-else`
  - indentation and block structure
  - `if-elif-else`
- Worked examples include shipping cost and grade classification.
- Final exercise section contains four practice tasks covering:
  - divisibility by 3 and/or 5
  - age-banded movie admission pricing
  - BMI classification
  - leap-year logic using `and` / `or`

### Colab — `수업중 진도 과정...!.ipynb`

Current notebook evidence shows the learner actively followed the lecture rather than copying a finished answer sheet.

Verified progress:
- basic `if/else` structure and indentation were practiced;
- shipping-cost example was eventually made to print the selected variable correctly with an f-string;
- grade classification reached a correct output after recognizing that letter grades such as `"A"` / `"B"` are strings.

Important current gap:
- the latest Exercise 1 attempts are not yet correct;
- the notebook uses division (`/`) where divisibility requires remainder/modulo (`%`);
- the latest checks compare against `1` rather than remainder `0`;
- earlier attempts also show indentation errors;
- the combined 3-and-5 case still needs correct boolean structure and ordering.

One additional correctness note:
- the notebook shipping example currently uses `price >= 20000`, while the course PDF example states the free-shipping condition as strictly greater than 20,000. Exact-boundary behavior should therefore be rechecked rather than treating the notebook result as authoritative.

### Audio + transcript

- Raw audio is present and non-empty.
- Duration: about 99m 20s.
- AAC mono, 48 kHz.
- A companion AI-generated transcript is present.
- The transcript has recognition noise, so exact wording is not authoritative, but it corroborates the lecture sequence.

Corroborated lecture points include:
- conditional statements require True/False conditions;
- indentation is part of Python block structure;
- `elif` is used to choose among multiple mutually exclusive branches;
- divisibility should be tested using remainder `% ... == 0`;
- the 3-and-5 case uses logical `and`;
- later practice covers movie pricing, BMI classification, and leap-year conditions.

### Classroom photo

The photo shows an additional live classroom example not present in the 21-page PDF: a multi-condition SNS-content performance classification example using view/like/share counts. Treat it as supplementary live-lecture material, not as part of the PDF exercise list.

## Current study-state interpretation

The strongest current boundary is not “conditionals in general.” The notebook already shows successful transfer of basic branching and later correction of string-valued grades.

The narrower active blockers are:
1. translating “multiple of N” into `value % N == 0`;
2. combining conditions with `and` / `or`;
3. ordering mutually exclusive branches so the most specific combined condition is not shadowed by an earlier branch;
4. preserving exact boundary operators (`>` vs `>=`) from the source requirement.

The prior f-string/string-boundary weakness is still visible in early notebook attempts, but the shipping example eventually reached correct interpolation. It should remain a watch item rather than be treated as newly unresolved from scratch.

## Immediate next action

Start active study from Exercise 1, but do not reveal a finished solution immediately.

Preferred sequence:
1. ask the learner to restate how to identify a multiple using remainder;
2. test one simple divisibility check;
3. add the second divisor;
4. reason about why the combined 3-and-5 branch must be checked before the single-divisor branches;
5. then move through Exercises 2 → 4 with fresh execution verification.

Problem-memory entries should be added only after the learner makes a current attempt in this session, so old notebook errors are not mistaken for new evidence.


## Live Exercise 1 update — 2026-09-28 16:19 KST

Latest Colab save was re-read after the learner's current-session edit.

Verified improvement:
- divisibility checks were corrected from division to modulo: `num % 3 == 0`, `num % 5 == 0`;
- the combined condition was correctly written as `num % 3 == 0 and num % 5 == 0`.

Current remaining bug:
- the notebook uses one `if/elif` chain for the single-divisor cases and then starts a second independent `if/else` for the combined case;
- with input 12, the saved output is `python` followed by `꽝임`, proving the second `else` is attached only to the second `if`;
- with a common multiple such as 15, the current structure would also allow duplicate output because the first chain can print before the combined condition is checked.

Next cue:
- keep the cases in one mutually exclusive chain;
- place the most specific combined case before the single-divisor cases;
- also correct the literal output spelling from `programing` to the PDF's `programming`.

Do not promote this to a durable learner weakness; this is a current Exercise 1 control-flow correction in progress.


## Live Exercise 1 re-check — 2026-09-28 16:22 KST

Latest Colab save was re-read.

Current execution:
- input: 15
- output: `python` followed by `python programing`

Interpretation:
- modulo checks and the combined `and` condition are now present and functioning;
- the combined case is still implemented as a second independent `if` after the first `if/elif/else` chain, so a common multiple can produce duplicate output;
- the next repair is still to make one mutually exclusive chain with the combined case first;
- output spelling still uses `programing` instead of the PDF's `programming`.

Exercise 1 remains `PARTIAL / CONTROL-FLOW ORDERING REMAINS`.


## Live Exercise 1 verification — 2026-09-28 16:24 KST

Latest Colab save was re-read.

Verified current structure:
- the combined 3-and-5 condition is checked first;
- the single-divisor cases are now chained with `elif`;
- the final fallback is a single `else`;
- input 15 produces only one line, confirming the duplicate-output control-flow bug is fixed.

Remaining source-exact issue:
- output text still uses `programing` instead of the PDF's `programming` in both the 5-only and combined branches.

Exercise 1 state: `LOGIC COMPLETE / OUTPUT SPELLING FIX REMAINS`.


## Live Exercise 2 first verification — 2026-09-28 16:31 KST

Latest Colab save was re-read.

Current source:
- `age = int(input(...))`
- `if age <= 7` → 5000
- `elif age <= 18` → 8000
- `elif age <= 64` → 12000
- `else` → 6000

Current execution:
- input: 65
- output price: 6000
- execution succeeded.

Interpretation:
- the branch ordering correctly partitions the PDF ranges for integer ages because each later `elif` is reached only after the earlier upper bound failed;
- one successful 65-year-old run confirms the final branch, but boundary execution evidence for 7/8, 18/19, and 64/65 is not yet complete.

Exercise 2 state: `LOGIC CORRECT / BOUNDARY EXECUTION CHECK REMAINS`.


## Live Exercise 2 completion — learner-confirmed boundary checks

The learner reported that the Exercise 2 boundary cases were all executed and produced the expected admission prices.

Given the already-verified branch structure and the learner-confirmed boundary runs, Exercise 2 is now classified as:

`CORRECT / COMPLETE`

This completion claim is scoped to the current Exercise 2 logic and its executed boundary checks.

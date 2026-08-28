# SimCore v0.66.0 Builder Validation Harness Failure 04 — Explicit py_compile Bytecode

Date: 2026-08-29

Classification:

```text
FIX / VALIDATION_HARNESS / NON_RUNTIME / PRODUCTION_UNCHANGED
```

## Trigger

Temporary builder-only assertion patch workflow:

```text
Temporary SimCore 06600 Builder Only Patch
run 33199784576
job 98946058428
```

## Intended repair

The workflow was deliberately narrowed so it would mutate only:

```text
products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion.py
```

It attempted the already-proven Slice B assertion repair:

```text
forbidden broad check:
"scheduleDeferredPrune(outIndex)" in session

required narrow check:
"\n  scheduleDeferredPrune(outIndex) {" in session
```

No workflow file or runtime artifact was staged for push.

## Failure

The patch step used:

```text
PYTHONDONTWRITEBYTECODE=1
python3 -m py_compile <builder>
test ! -d products/simcore/tooling/__pycache__
```

and exited before the commit step.

## Root cause

`PYTHONDONTWRITEBYTECODE=1` suppresses ordinary interpreter bytecode caching, but `python -m py_compile` is an explicit request to compile and write a `.pyc` file. Therefore the following hygiene assertion was inherently contradictory:

```text
run py_compile
then require __pycache__ not to exist
```

The workflow stopped before commit/push. No builder change reached the branch from this run.

## Required repair

Use an in-memory syntax check that writes no artifact:

```python
from pathlib import Path
p = Path('<builder>')
compile(p.read_text(encoding='utf-8'), str(p), 'exec')
```

Then stage only the builder file and push once.

After the builder-only commit lands:

```text
- update the read-only exact-production validation workflow's frozen builder SHA through repository contents authority;
- delete obsolete temporary repair workflows through repository contents authority;
- re-run exact-production materialization;
- keep release-simcore read-only until the normal release transaction.
```

## Safety

```text
release-simcore mutation = NONE
production mutation      = NONE
candidate publication    = NONE
runtime exposure         = NONE
```

Slice A/B/C/D implementation semantics are unchanged by this harness failure.

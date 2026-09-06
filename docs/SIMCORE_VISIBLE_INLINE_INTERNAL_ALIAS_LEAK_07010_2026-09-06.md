# SimCore Visible Inline `internal:` Planning-Control Alias Leak under v0.70.10

Date: 2026-09-06 KST
Status: **FIX · OUTPUT HYGIENE / COMPATIBILITY BOUNDARY · DISTINCT FROM INLINE_INTERNAL_MEMO_V1**
Tracking: `#1660`
Observed release: `v0.70.10 Host-Local Telemetry Set Cost Attribution`
Observed generation: `mtpaobnf-gx39fr`
Observed turn: `@3198 -> @3199`

## 1. Observation

The operator-supplied fresh-runtime ordinary RAW assistant body visibly contains two standalone planning-like control lines:

```text
┣ internal: playful resignation, parental warmth, checking physical balance to protect children ┫
...
┣ internal: realizing domestic chaos is harder than special operations training ┫
```

These lines are embedded in the visible narrative body between ordinary prose/dialogue.

The same diagnostic reports:

```text
Version = 0.70.10
output = COMMITTED
Warnings = 0
Compatibility diagnostics = 0
Preamble provenance = THOUGHTS_COMPAT · STRIPPED · SILENT_COMPAT
```

Therefore leading Thoughts compatibility still works, but these inline `internal:` lines survive into the visible committed body.

## 2. Why this is not a v0.70.9 exact-grammar regression

The frozen v0.70.9 Output Compat repair reserves exactly:

```text
INLINE_INTERNAL_MEMO_V1
key = internal_memo:
```

and requires all of the exact grammar conditions to match before deletion.

The same frozen design explicitly forbids broad keyword/global deletion and preserves wrong-key variants. That preservation rule is intentional so user-requested prose, fixtures, logs, fiction, or unknown delimiters are not silently destroyed.

The new lines use:

```text
internal:
```

not:

```text
internal_memo:
```

Thus:

```text
EXACT_INLINE_INTERNAL_MEMO_V1_MATCH = NO
EXACT_V07009_GRAMMAR_REGRESSION = NO
BLIND_GLOBAL_STRIP_AUTHORIZED = NO
```

## 3. Why this still needs its own FIX owner

Although the exact v0.70.9 rule is behaving according to its contract, these concrete `internal:` payloads are visibly planning/control-like:

```text
playful resignation, parental warmth, checking physical balance to protect children
realizing domestic chaos is harder than special operations training
```

They describe generation/planning intent rather than the story's visible world or character-facing content.

This is therefore a new visible-output contamination family rather than a legitimate reason to silently widen the old grammar.

Disposition:

```text
VISIBLE_OUTPUT_CONTAMINATION = CONFIRMED IN THIS SPECIMEN
NEW_INTERNAL_ALIAS_FAMILY = FIX
SOURCE FAMILY = MODEL/GATEWAY + OUTPUT COMPAT BOUNDARY, exact owner not yet designed
RUNTIME CRASH = NO
OUTPUT COMMIT FAILURE = NO
HOST_SET_ATTRIBUTION FAILURE = NO
```

## 4. Scope boundary

Do not repair this inside the v0.70.10 Host-local telemetry attribution evidence transaction.

A future repair design must first answer at least:

```text
Is `internal:` a stable planning-control alias or a one-off generated textual shape?
What exact bounded grammar can distinguish control leakage from legitimate user-requested text?
Should the owner extend Output Compat's reserved grammar family or use a separate recognized alias?
What negative controls preserve quoted/fenced/fiction/log examples?
```

Forbidden premature repair:

```text
replace(/internal:/g, ...)
delete any line containing "internal"
strip every ┣ ... ┫ line
widen INLINE_INTERNAL_MEMO_V1 without a new frozen grammar contract
```

## 5. Advancement boundary

Current v0.70.10 release-specific Host-set evidence collection may continue because this finding is unrelated to the attribution instrumentation.

However the living review rule remains:

```text
unresolved FIX or BLOCKER -> no next runtime advancement
```

Therefore:

```text
CURRENT_V07010_LIVE_COLLECTION = MAY CONTINUE
V07010_HOST_SET_LENS1 = DISTINCT
NEXT_RUNTIME_ADVANCEMENT = HOLD UNTIL #1660 RESOLVED OR EVIDENCE-RECLASSIFIED
```

## 6. Production boundary

This record is evidence only.

```text
runtime mutation = NONE
release-simcore mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
```

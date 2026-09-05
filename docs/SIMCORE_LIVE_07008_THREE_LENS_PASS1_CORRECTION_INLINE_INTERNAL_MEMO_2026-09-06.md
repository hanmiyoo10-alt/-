# SimCore v0.70.8 Three-Lens Pass 1 Correction — Inline `internal_memo` Leak

Date: 2026-09-06 KST
Status: **CORRECTION AUTHORITY · LENS 1 PASS PRESERVED · LENS 3 OVERALL FIX · TERMINAL ADVANCEMENT BLOCKED**
Tracking: `#1589`
Corrects: `docs/SIMCORE_LIVE_07008_THREE_LENS_PASS1_2026-09-06.md`

## 1. Why this correction exists

The first three-lens review correctly classified the v0.70.8 Repeat-Send Representation Rewind Guard controls, but its initial exhaustive sweep missed two inline planning markers present in the operator-supplied RAW assistant body for output `@3151`.

The visible body contains:

```text
┣ internal_memo: Explain core philosophy of task fragmentation and daily physiological baseline ┫
...
┣ internal_memo: Address sleep habits honestly while providing practical insight ┫
```

They occur after the canonical response frame has already begun and are therefore not merely leading response preamble.

## 2. Existing compatibility behavior

The same diagnostic reports:

```text
Warnings = 0
Compatibility detail = Thoughts 호환 preamble 제거
Preamble provenance = THOUGHTS_COMPAT
Action = STRIPPED
```

Fresh production source shows the existing compatibility owner recognizes and removes bounded Thoughts-compatible **preamble** material through the preamble compatibility path. Repository search found no deployed `internal_memo` rule.

Therefore this live specimen proves:

```text
leading Thoughts preamble cleanup = WORKED
inline internal_memo planning marker cleanup = ABSENT / NOT HANDLED
visible inline marker = SURVIVED
```

No causal claim is made yet about whether the marker originated from model generation, provider representation, Host transport, or another upstream layer. The confirmed defect is the final visible-output contamination at the current SimCore output boundary.

## 3. Corrected three-lens disposition

### Lens 1 — v0.70.8 release-specific contract

Unchanged:

```text
ordinary exact carryover = PASS
clean reroll / prior EXACT = PASS
genuine manual edit = PASS
post-edit convergence = PASS
natural OUTPUT_MISMATCH + exact Fresh rewind = NOT_EXERCISED
direct-owner target regression = PASS
V07008_REPEAT_SEND_REWIND_CONTRACT = PASS
```

The inline memo is unrelated to the v0.70.8 rewind guard itself.

### Lens 2 — coherent-set transition

The action sequence remains coherent and the reroll/edit controls remain PASS.

Add finding:

```text
VISIBLE_INLINE_PLANNING_MARKER = FIX / DISTINCT OUTPUT-HYGIENE FINDING
```

### Lens 3 — exhaustive element inventory

The following initial rows require correction:

```text
Warnings = PASS remains true at runtime diagnostic level
Compatibility handling = FIX / INCOMPLETE FOR INLINE PLANNING MARKER
Visible output hygiene = FIX
New runtime correctness FIX/BLOCKER = FIX #1589
```

Corrected set-wide verdict:

```text
LENS_3_RELEASE_SPECIFIC_REWIND = PASS
LENS_3_OVERALL = FIX
INLINE_INTERNAL_MEMO_VISIBLE_OUTPUT = FIX #1589
TERMINAL_ADVANCEMENT = BLOCKED
```

## 4. Advancement consequence

The adopted three-lens protocol states that an unresolved `FIX` or `BLOCKER` prevents advancement even if Lens 1 passes.

Therefore the previous candidate statement:

```text
RELEASE_SPECIFIC_HUMAN_EVIDENCE = SUFFICIENT FOR LIVE_PASS CANDIDATE
```

must now be read only as **release-specific rewind evidence sufficiency**, not as permission to run terminal convergence.

Current legal state is:

```text
v0.70.8 rewind repair evidence = PASS
machine live gate = REMAINS PENDING_REAL_LONG_CHAT
terminal convergence = DO NOT RUN
blocking finding = #1589 inline internal_memo visible-output leak
```

## 5. Repair boundary

Do not globally strip the literal string `internal_memo` from arbitrary assistant prose.

A later repair/design must first define a bounded recognizable control-marker grammar and prove negative controls for legitimate prose/code/fiction containing similar text.

The repair must remain separate from:

```text
#1556 repeat-send pre-snapshot latency
#1587 output snapshot set variance
#1588 Host-local telemetry checkpoint latency
#1545 CURRENT_DEVELOPMENT human-state drift
v0.70.8 repeat-send rewind logic
```

## 6. Production immutability

This correction is evidence/documentation only.

```text
runtime mutation = NONE
release-simcore mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
release-state mutation = NONE
product-manifest mutation = NONE
```

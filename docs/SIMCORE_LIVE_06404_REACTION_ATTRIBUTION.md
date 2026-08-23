# SimCore v0.64.4 Live Evidence — COMMUNITY Reaction Attribution

Date: 2026-08-23
Status: LIVE GATE SATISFIED · ROOT CAUSE PROVEN · FIX
Production: `v0.64.4 — COMMUNITY Reaction Validator Attribution`
Release branch: `release-simcore`
Release commit: `c11216310938a090f5c81cc6e81e9ca8535e002f`
Release blob (`latest.js` = `install.js`): `58aa3ff60bad4ab487230a96718c4ae1a1cc0c2d`

## 1. Verdict

The v0.64.4 attribution-only release succeeded at its intended discriminator.

The recurrent warning is not caused by invisible trailing characters and is not a Reaction grammar defect.

The exact failure is:

```text
bilingual/multiline COMMUNITY comment
→ physical starter line begins with `- ` or `ㄴ `
→ reaction tag is emitted on the following translation/continuation line
→ Structure validates only the physical starter line
→ Reaction inspector sees tagCount = 0
→ MISSING
```

Classification:

```text
COMMUNITY_MULTILINE_REACTION_UNIT_MISMATCH
= FIX / DIRECT_EVIDENCE / STATICALLY_EXPLAINABLE
```

A narrow repair mini is now justified before M2-3.

---

## 2. Natural v0.64.4 recurrence

### B_CONTINUE @2096→2097

```text
Warnings: 1
COMMUNITY 1-3: 댓글 반응 태그 5줄 오류
· missing 5
· multiple 0
· final-tail 0
· tail-format 0
· tail-visible 0
· tail-other 0
· tail-chars 0
```

The affected third platform section is a bilingual X(EN)-style section whose logical comments use this physical shape:

```text
- @handle: English comment text...
(Korean translation...) [RT 61,501,000]
```

All five logical comment/reply units visibly contain exactly one supported reaction tag, but each physical starter line contains none.

### B_CONTINUE @2098→2099

Same attribution recurred:

```text
COMMUNITY 1-3
missing 5
multiple 0
final-tail 0
all tail buckets 0
```

This second natural specimen rules out a one-turn diagnostic glitch.

### B_END @2100→2101

The same family recurred again in the B_END bilingual section:

```text
COMMUNITY 2-3
missing 5
multiple 0
final-tail 0
all tail buckets 0
```

B_END terminal handling itself remained healthy:

```text
Broadcast end authority: ALLOWED · explicit-b-end
Broadcast terminal coverage: EXPLICIT_TERMINAL
frame:    2031-03-21 09:30 PM
terminal: 2031-03-21 09:50 PM
stored:   2031-03-21 09:50 PM
Stored broadcast: UNLOCKED
```

`Broadcast closure` was downgraded to:

```text
PARTIAL · terminal EXPLICIT · structure QUARANTINED
```

because the diagnostic structure component treats any `COMMUNITY` warning as not clean. The repair remains a COMMUNITY validation-scope fix, not a Broadcast semantic change.

---

## 3. Source-level proof

Current Structure builds reaction-validation inputs from physical starter lines only:

```js
const commentLines = commentScope
  .split(/\r?\n/)
  .filter((line) => /^\s*(?:-\s+|ㄴ\s+)/.test(line));

for (const line of commentLines) {
  const inspection = reaction.inspectCommentReactionLine(line);
  ...
}
```

Therefore a bilingual unit like:

```text
- @handle: English text
(translation) [RT 64,101,000]
```

passes the comment-count shape check but sends only:

```text
- @handle: English text
```

to Reaction inspection. `tagCount === 0` is therefore deterministic and correctly attributed as `MISSING` by v0.64.4.

By contrast, Reaction normalization scans the entire comments scope:

```js
const reactionScope = section.slice(scopeStart);
const matches = [...reactionScope.matchAll(REACTION_RE)];
```

so the tag on the continuation line remains visible to normalization and appears correctly in the final canonical/RAW output.

This explains the previously confusing evidence without requiring hidden characters or host rewriting:

```text
Structure validator: physical starter-line scope
Reaction normalizer: whole comment-section scope
```

The mismatch is validation framing, not accepted reaction syntax.

---

## 4. v0.64.4 live-gate disposition

The attribution release required one natural recurrence classified as one of:

```text
MISSING
MULTIPLE
FINAL_TAIL + FORMAT_ONLY
FINAL_TAIL + VISIBLE_OR_UNKNOWN
```

Observed result:

```text
MISSING × 5
```

with exact RAW/source correlation.

Therefore:

```text
v0.64.4 attribution gate: PASS
repair tolerance guessing: NO LONGER NEEDED
repair root cause: PROVEN
next mini authorization: YES
```

---

## 5. Important regression control from the same runtime

The same v0.64.4 runtime naturally re-exercised the protected v0.63.55/M2-2 Representation Fast path.

Previous output @2099:

```text
Deferred mirror: OUTPUT_MISMATCH
CANONICAL 7229:5e06d400
FRESH_CHAT 7228:8dd01bdd
Δchars -1
```

Next request @2100:

```text
Prior representation: OUTPUT_MISMATCH
current == prior FRESH_CHAT
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
```

Classification:

```text
REGRESSION_CONTROL / DIRECT_EVIDENCE
M2-2 representation ownership healthy
v0.63.55 fast-path semantics preserved
```

This control must be retained through the v0.64.5 repair and v0.65.0 M2-3 extraction.

---

## 6. Other observations from the sequence

### B_START semantic warning

Observed once:

```text
방송 화면으로 확인할 수 없는 내면 확정 표현
```

The RAW contains renderer-authored certainty/intent-style prose. This is a generation-semantic warning, not evidence of Reaction/Structure implementation failure.

Classification:

```text
WATCH · GENERATION_SEMANTIC
not part of v0.64.5
```

### Open-broadcast ending-expression warning

Observed once on B_CONTINUE:

```text
열린 방송 장면에 종결 표현이 있음
```

No broadcast unlock or terminal-authority corruption followed; the later B_END remained explicit and correct.

Classification:

```text
WATCH · GENERATION_SEMANTIC
not part of v0.64.5
```

### Storage/cold-init latency

The first B_START after runtime boot showed:

```text
character fetch 1.343 s
turn storage 1.193 s
```

later requests varied substantially lower. No correctness failure or state corruption was observed.

Classification:

```text
WATCH · PERFORMANCE
existing storage/cold-init family
not part of v0.64.5
```

### Narrative-clock telemetry during open Broadcast

Later B turns displayed an older non-broadcast narrative anchor while Broadcast airtime remained correctly locked in 2031. No visible B chronology regression or broadcast-state corruption was observed.

Classification:

```text
WATCH · CROSS-DOMAIN DIAGNOSTIC CONTEXT
not a recurrence of POST_BEND_C_CLOCK_DOMAIN_GAP
no patch from this evidence
```

---

## 7. Next action

Proceed with a separate narrow repair design:

```text
v0.64.5 — COMMUNITY Multiline Reaction Unit Validation Repair
```

The repair must change validation framing from physical starter lines to logical comment/reply units while leaving Reaction grammar, normalization, Structure judge-only behavior, Broadcast semantics and all M2-3 ownership code frozen.

Cross-reference:

- `SIMCORE_06404_COMMUNITY_REACTION_ATTRIBUTION_PLAN.md`
- `SIMCORE_06405_COMMUNITY_MULTILINE_REACTION_UNIT_REPAIR_PLAN.md`
- `SIMCORE_06501_COMMUNITY_REACTION_VALIDATOR_PLAN.md` (older provisional design; superseded for version/order by this evidence)

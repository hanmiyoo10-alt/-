# SimCore v0.64.5 — COMMUNITY Multiline Reaction Unit Validation Repair

Date: 2026-08-23
Status: DESIGN FROZEN · IMPLEMENTATION NOT STARTED
Production parent: `v0.64.4 — COMMUNITY Reaction Validator Attribution`
Parent release commit: `c11216310938a090f5c81cc6e81e9ca8535e002f`
Parent release blob: `58aa3ff60bad4ab487230a96718c4ae1a1cc0c2d`
Major checkpoint: M2-2 remains unchanged
Next major checkpoint after this mini: `v0.65.0 — M2-3 Edit Reconcile Ownership Extraction`

## 1. Purpose

Repair the now-proven validation-unit mismatch for multiline/bilingual COMMUNITY comments.

The accepted reaction grammar is not wrong. The current Structure validator supplies the wrong unit of text to that grammar.

Current behavior:

```text
logical comment
  physical line 1: - @handle: English text
  physical line 2: (translation) [RT N]

Structure
→ validates only physical line 1
→ MISSING
```

Target behavior:

```text
Structure
→ groups one logical comment/reply unit
→ validates the complete unit
→ one supported reaction tag at logical-unit end = PASS
```

No reaction tag is synthesized and malformed units remain invalid.

---

## 2. Triggering proof

v0.64.4 natural long-chat evidence produced the new bounded attribution on three separate Broadcast turns:

```text
B_CONTINUE @2096→2097
COMMUNITY 1-3
missing 5 / multiple 0 / final-tail 0

B_CONTINUE @2098→2099
COMMUNITY 1-3
missing 5 / multiple 0 / final-tail 0

B_END @2100→2101
COMMUNITY 2-3
missing 5 / multiple 0 / final-tail 0
```

Each affected section used bilingual X(EN)-style logical comments of the form:

```text
- @handle: English sentence...
(Korean translation...) [RT 64,101,000]
```

The five logical units visibly contain five valid tags, while the five physical starter lines contain zero tags.

This exactly explains `missing 5`.

See `SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md` for the complete evidence disposition.

---

## 3. Ownership decision

Preserve the existing module contract:

```text
Community
→ COMMUNITY parsing / structural grouping

Reaction
→ reaction grammar/parser / normalization

Structure
→ judge-only validation / integrity
```

Therefore the repair boundary is:

```text
Community: expose logical comment/reply grouping helper
Reaction: keep current regex + inspector semantics
Structure: validate each logical unit instead of each physical starter line
```

Do not move Reaction grammar into Structure.
Do not make Reaction own COMMUNITY section grouping.
Do not make Structure mutate output.

---

## 4. Proposed Community helper

Add one pure helper, name frozen conceptually as:

```js
community.commentUnits(commentScope)
```

Exact implementation name may remain `commentUnits` unless source integration requires a collision-free equivalent.

A unit begins when a physical line matches:

```regex
^\s*(?:-\s+|ㄴ\s+)
```

and includes every following physical line until:

```text
next top-level comment starter
OR
next nested-reply starter
OR
end of the current platform section comment scope
```

Suggested bounded result:

```js
[
  {
    kind: 'TOP' | 'REPLY',
    text: '<logical unit string>'
  }
]
```

Constraints:

```text
pure function
no persistence
no global state
no raw retention after validation
no normalization
no output mutation
```

The helper operates only on the already-bounded platform-section comment scope supplied by Community parsing.

---

## 5. Structure change

Keep existing top/reply cardinality checks unchanged in the first repair:

```text
top-level comments = 4
nested replies = 1
```

Only replace reaction-validation framing.

Before:

```js
const commentLines = commentScope
  .split(/\r?\n/)
  .filter((line) => /^\s*(?:-\s+|ㄴ\s+)/.test(line));

for (const line of commentLines) {
  const inspection = reaction.inspectCommentReactionLine(line);
  ...
}
```

After:

```js
const units = community.commentUnits(commentScope);

for (const unit of units) {
  const inspection = reaction.inspectCommentReactionLine(unit.text);
  ...
}
```

`inspectCommentReactionLine()` is intentionally reused as the grammar inspector because its predicate already works over an arbitrary string:

```text
tagCount === 1
AND
REACTION_AT_END_RE.test(text)
```

A newline inside the logical unit does not weaken the final-tail requirement: the one reaction tag must still terminate the complete logical unit apart from already-accepted trailing whitespace.

No Reaction regex change is required.

---

## 6. Why this is the narrow repair

Reaction normalization already scans the entire comment section rather than starter lines:

```js
const reactionScope = section.slice(scopeStart);
const matches = [...reactionScope.matchAll(REACTION_RE)];
```

This is why final canonical/RAW output correctly contains and normalizes the reaction tags even when Structure reports `MISSING`.

The defect is therefore the validation framing asymmetry:

```text
validator = physical starter line
normalizer = whole comment scope
```

The repair aligns validator framing to logical comment units without changing accepted reaction syntax or normalization behavior.

---

## 7. Required positive fixtures

### Single-line historical format

```text
- user: text [공감 1,000]
```

Expected:

```text
1 TOP unit
reaction PASS
```

### Bilingual top-level comment

```text
- @A: English text
(한국어 번역) [RT 1,000]
```

Expected:

```text
1 TOP unit
one RT tag
final tag at logical-unit end
PASS
```

### Bilingual nested reply

```text
ㄴ @B: English reply
(한국어 번역) [RT 1,001]
```

Expected:

```text
1 REPLY unit
PASS
```

### Full X(EN) section

```text
4 top-level logical units
1 nested logical reply
all five tags on continuation translation lines
```

Expected:

```text
comment counts unchanged
reaction errors 0
```

### Captured v0.64.4 reproducer

Use the exact structural shape from @2097/@2099/@2101.

Expected differential:

```text
v0.64.4 validator framing → missing 5
v0.64.5 logical-unit framing → PASS
```

---

## 8. Required negative fixtures

The mini must not weaken malformed-output detection.

### Missing tag across whole unit

```text
- @A: English text
(translation only)
```

Expected:

```text
MISSING
```

### Multiple tags across unit

```text
- @A: English text [RT 1]
(translation) [RT 2]
```

Expected:

```text
MULTIPLE
```

### Tag before visible continuation

```text
- @A: English text [RT 1]
(translation without final tag)
```

Expected:

```text
FINAL_TAIL
```

The tag exists but does not terminate the logical comment.

### Visible text after final tag

```text
- @A: English text
(translation) [RT 1] extra
```

Expected:

```text
FINAL_TAIL
```

### Unrelated bracket syntax

Do not interpret arbitrary bracketed text as a reaction tag.

### Unit count mismatch

Existing 4-top + 1-reply Structure warning behavior remains unchanged.

---

## 9. Diagnostic wording

Preserve the existing warning prefix for compatibility in v0.64.5 unless CI proves a wording change is necessary:

```text
COMMUNITY X-Y: 댓글 반응 태그 N줄 오류 ...
```

The bounded v0.64.4 attribution fields remain:

```text
missing
multiple
final-tail
tail-format
tail-visible
tail-other
tail-chars
```

Even though validation now uses logical units, avoid mixing a cosmetic diagnostic rename into the behavioral repair unless required. A later diagnostic-only cleanup may rename `줄` to `댓글 단위` if desired.

---

## 10. B_END regression target

The v0.64.4 B_END at @2100→2101 provides the preferred live shape.

Before repair:

```text
Broadcast end authority: ALLOWED
terminal: EXPLICIT
stored terminal airtime: correct
COMMUNITY 2-3: missing 5
Broadcast closure: PARTIAL · structure QUARANTINED
```

After repair, with the same valid bilingual shape:

```text
reaction COMMUNITY warning: 0
Broadcast end authority: unchanged
terminal coverage: unchanged
stored terminal airtime: unchanged
Broadcast closure: COMPLETE · terminal EXPLICIT · structure PASS
```

A non-COMMUNITY Reaction normalization warning such as `stale_scale_fallback` may still appear and is not a failure of this mini.

---

## 11. Frozen surfaces

Do not change:

```text
REACTION_RE
REACTION_AT_END_RE
supported reaction labels
reaction number parsing
per-platform-family maxima
stale_scale_fallback
normalization ordering
COMMUNITY block count
platform-section count
4 top + 1 nested reply cardinality
Structure judge-only principle
stateCommitSafety semantics
B_START/B_CONTINUE/B_END lifecycle
Broadcast terminal authority / airtime / unlock
Frame / Time / Summary Scope
Evidence / Lineage / Handoff / Recurrence
Representation ownership
Edit Reconcile decision tree
Runtime Mirror / Deferred Mirror
Recovery / output-compat / bootstrap-migration
Prompt generation semantics
Store schema / keys / retention / call ordering
host/network/timer surfaces
provider cache claims
```

This is a parser/validator unit-boundary repair only.

---

## 12. M2 regression controls

The same v0.64.4 live sequence naturally re-proved:

```text
Prior OUTPUT_MISMATCH
current == prior FRESH_CHAT
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

v0.64.5 must preserve this exact path.

Also retain the genuine edit control:

```text
Prior EXACT
current != canonical
current != Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

No Edit Reconcile ownership movement belongs in v0.64.5.

---

## 13. Static / CI gate

Required before release:

```text
node --check plugins/simcore/latest.js PASS
node --check plugins/simcore/install.js PASS
latest.js == install.js PASS
Contracts v2 architecture checker PASS
v0.64.4 attribution fixtures PASS
new logical-comment-unit fixtures PASS
captured bilingual reproducer: old FAIL / new PASS
missing/multiple/final-tail negative fixtures still FAIL
Reaction normalization fixtures unchanged PASS
Structure historical fixtures unchanged PASS
B_END closure regression fixture PASS
M2 Representation Fast fixture PASS
genuine edit fixture PASS
no persistent schema delta
no new host/storage/network/timer calls
```

Add a dedicated v0.64.5 CI fixture rather than editing unrelated release-system infrastructure in the same work item.

---

## 14. Work/release sequence

Follow the standard SimCore order:

```text
1. main: design + live evidence frozen
2. create dedicated v0.64.5 work branch
3. implement Community logical-unit helper + Structure call-site change
4. static/CI differential verification
5. ensure latest.js == install.js
6. deploy to release-simcore
7. natural long-chat B/C validation
8. preferred B_END closure validation
9. main docs / CURRENT_DEVELOPMENT synchronization
10. only then resume v0.65.0 M2-3
```

Do not combine release-system changes with this feature repair.

---

## 15. Live close gate

Minimum natural proof:

```text
one bilingual X(EN)-style COMMUNITY section
4 top + 1 reply
reaction tags on translation continuation lines
Warnings contains no reaction-tag error for that section
normalization still works
```

Preferred proof:

```text
B_END
2 COMMUNITY × 3 sections valid
bilingual section valid
terminal EXPLICIT
stored airtime correct
Broadcast closure COMPLETE · structure PASS
```

Negative control remains required statically; natural malformed generation is not required.

---

## 16. Release verdict

```text
COMMUNITY_MULTILINE_REACTION_UNIT_MISMATCH
→ exact live class = MISSING × 5
→ exact structural cause = tag on continuation line outside starter-line validator input
→ source-level explanation established
→ narrow repair justified
→ v0.64.5 before M2-3
```

Implementation is not yet started by this document.

# SimCore v0.65.1 Candidate — COMMUNITY Reaction Validator Repair

Date: 2026-08-23
Status: DESIGN FROZEN CANDIDATE · IMPLEMENT ONLY AFTER M2-3 RELEASE + STATIC REPRODUCTION
Expected parent: `v0.65.0 — M2-3 Edit Reconcile Ownership Extraction`
Version note: `v0.65.1` is provisional until the M2-3 production version is published. If M2-3 lands under a different version, this mini takes the next patch version from that actual production parent.

## Purpose

Repair the repeatedly observed mismatch between visibly valid COMMUNITY comment/reply reaction tails and Structure's per-line reaction-tag validation without widening COMMUNITY generation semantics or turning Structure into a repair engine.

The target is deliberately narrow:

```text
valid comment/reply line
+ exactly one supported reaction tag
+ no proven visible trailing content after that tag
→ Structure must not emit a reaction-tail warning
```

This mini is not a B_END semantic release. B_END only supplied the highest-value discriminator because the same COMMUNITY warning also downgraded `Broadcast closure` from COMPLETE to PARTIAL even though terminal authority and terminal airtime were correct.

---

## 1. Triggering live evidence

Production: `v0.64.3 — B_END Diagnostic Builder Binding Repair`
Runtime generation: `mt4giy5r-34f2jf`

One natural B_START → B_CONTINUE → B_CONTINUE → B_END sequence repeatedly produced:

```text
B_START @2084→2085
Warnings: 1
- COMMUNITY 1-2: 댓글 반응 태그 5줄 오류

B_CONTINUE @2086→2087
Warnings: 1
- COMMUNITY 1-3: 댓글 반응 태그 5줄 오류

B_CONTINUE @2088→2089
Warnings include:
- COMMUNITY 1-3: 댓글 반응 태그 5줄 오류

B_END @2090→2091
Warnings: 1
- COMMUNITY 2-3: 댓글 반응 태그 5줄 오류
```

The copied RAW bodies for those sections visibly show all five required comment/reply lines ending in one supported tag such as:

```text
[공감 65,105,200]
[RT 55,523,920]
[포텐 65,320,900]
[좋아요 12,301,900]
[추천 15,970,900]
```

Each affected section also visibly contains the expected four top-level comments plus one nested reply.

This establishes a recurrent validator/output mismatch family. It does **not yet prove** whether the exact root cause is:

```text
A. Structure/Reaction line-tail predicate defect
B. invisible/non-printing trailing characters not obvious in copied RAW rendering
C. another canonicalization boundary between the validator input and copied RAW
```

Therefore implementation is gated on a static reproducer before any semantic tolerance is added.

---

## 2. Important B_END discriminator

The same natural B_END proved terminal handling itself is healthy:

```text
Broadcast end authority: ALLOWED · explicit-b-end
Broadcast terminal coverage:
  EXPLICIT_TERMINAL
  frame 2031-03-14 09:25 PM
  terminal 2031-03-14 09:40 PM
  stored 2031-03-14 09:40 PM
Stored broadcast: UNLOCKED
```

But the copied diagnostic reported:

```text
Broadcast closure: PARTIAL · terminal EXPLICIT · structure QUARANTINED
```

Current diagnostic source computes the structure part as:

```js
const broadcastCommunityClean = !warnings.some((x) => /^COMMUNITY\b/.test(String(x || '')));
```

Therefore a COMMUNITY warning alone is sufficient to downgrade the B_END closure diagnostic to PARTIAL/QUARANTINED even when broadcast terminal authority is correct.

This makes the reaction-tail warning materially important for observability accuracy, but it still does not justify changing Broadcast semantics.

---

## 3. Current ownership/source correlation

Contracts v2 defines:

```text
Reaction
→ reaction parser
→ per-family historical maxima
→ normalization

Structure
→ validation/integrity/state-commit safety
→ judge only; does not repair
```

Current Reaction exports:

```js
REACTION_RE
REACTION_AT_END_RE
parseReactionNumber
normalizeSectionValues
normalizeReactionNumbers
recordReactionMaxima
```

Current Structure per-line validation does approximately:

```js
const commentLines = ... // four top comments + one reply
for (const line of commentLines) {
  const tags = line.match(new RegExp(reaction.REACTION_RE.source, 'gi')) || [];
  if (tags.length !== 1 || !reaction.REACTION_AT_END_RE.test(line)) {
    reactionLineErrors += 1;
  }
}
```

The architectural boundary is already correct: Structure judges while Reaction owns the reaction grammar. The mini must preserve that direction.

---

## 4. Activation gate — mandatory static reproducer

Do not implement a tolerance rule directly from the live warning.

First create a fixture using copied v0.64.3 RAW comment/reply lines from the affected sections and run the current production validator logic unchanged.

Required branch:

```text
Fixture reproduces warning on visibly valid lines
→ isolate exact failing predicate
→ repair that predicate narrowly

Fixture does NOT reproduce warning
→ do not guess
→ add bounded diagnostic attribution for tail mismatch first
→ collect one more natural sample with the new attribution
```

The mini may ship only after the failing condition is explainable by an exact test.

No broad `trim everything` or `accept anything after ]` rule is allowed.

---

## 5. Recommended ownership change

Prefer one bounded Reaction helper rather than duplicated validation logic in Structure:

```text
reaction.inspectCommentReactionLine(line)
```

Suggested result shape:

```js
{
  ok: boolean,
  tagCount: number,
  finalTagValid: boolean,
  trailingKind: 'NONE' | 'WHITESPACE' | 'FORMAT_ONLY' | 'VISIBLE' | 'UNKNOWN',
  trailingChars: number
}
```

Constraints:

```text
no raw line retention
no logging of comment text
no persistent state
no mutation
no normalization of reaction values
```

Structure then consumes only the bounded result:

```text
ok == true
→ no warning

ok == false
→ existing warning behavior, optionally with bounded reason counts
```

If static reproduction shows the current grammar itself is correct and the live mismatch is caused by a specific invisible formatting tail, only that proven character class may be treated as ignorable.

---

## 6. Forbidden broadening

Do not change:

```text
supported reaction labels
reaction numeric parsing semantics
per-platform-family historical maxima
stale_scale_fallback behavior
reaction normalization ordering
four top-level + one nested reply contract
three platform sections per COMMUNITY block
B_END 2 COMMUNITY × 3 section contract
Structure judge-only principle
stateCommitSafety behavior
Broadcast terminal authority
Broadcast airtime commit
Frame / Time / Summary / Evidence / Lineage / Handoff / Recurrence
Representation / Edit Reconcile
Runtime Mirror / Deferred Mirror
Recovery / output-compat / bootstrap-migration
Prompt placement
Store schema or call counts
host/network/timer surfaces
```

In particular:

```text
Structure must NOT rewrite malformed comments.
Reaction must NOT synthesize missing reaction tags.
A genuinely visible suffix after the final reaction tag must remain invalid.
Multiple reaction tags on one comment line must remain invalid.
Missing reaction tags must remain invalid.
```

---

## 7. Diagnostic improvement

The current warning collapses all line failures into one count:

```text
댓글 반응 태그 5줄 오류
```

Add bounded reason attribution only if it falls out naturally from the helper:

```text
missing=<N>
multiple=<N>
trailing-visible=<N>
trailing-format=<N>
```

Example:

```text
COMMUNITY 1-3 reaction lines: INVALID · missing 0 · multiple 0 · trailing-visible 0 · trailing-format 5
```

Do not expose raw trailing characters or raw comment lines in persistent telemetry.

If the exact defect can be statically repaired without diagnostic expansion, the diagnostic change is optional; keep the release narrower.

---

## 8. Static fixture matrix

Minimum fixture set:

```text
1. Four top comments + one reply, each ending in [공감 N]
   → PASS

2. [RT N]
   → PASS

3. [좋아요 N]
   → PASS

4. [추천 N]
   → PASS

5. [포텐 N]
   → PASS

6. [Upvote N]
   → PASS

7. existing compact suffix units K/M/B/천/만/억
   → preserve current parser behavior

8. trailing ordinary spaces after reaction tag
   → PASS exactly as current grammar intends

9. missing reaction tag
   → FAIL

10. two reaction tags on one line
    → FAIL

11. visible prose after reaction tag
    → FAIL

12. copied v0.64.3 affected RAW section fixture
    → MUST reproduce old failure before repair
    → MUST PASS after repair

13. unaffected historical valid COMMUNITY fixture
    → unchanged PASS

14. malformed historical COMMUNITY fixture
    → unchanged FAIL
```

If the root cause is a proven invisible-format suffix, add exact fixtures for only the observed code points and explicit negative controls for unrelated visible suffixes.

---

## 9. B_END regression fixture

Use the v0.64.3 natural B_END shape as a close regression fixture:

```text
terminal explicit and monotonic
2 COMMUNITY blocks
3 platform sections per block
all comment/reply reaction lines valid
exactly one final Knowledge block
```

Expected after the validator repair:

```text
reaction-tail COMMUNITY warnings: 0
Broadcast closure: COMPLETE · terminal EXPLICIT · structure PASS
Broadcast terminal coverage: unchanged
Stored broadcast airtime: unchanged
```

This fixture is diagnostic/Structure regression evidence only. Do not route the repair through Broadcast.

---

## 10. M2-3 isolation gate

This mini is planned only after the current M2-3 release is complete.

The implementation must preserve M2-3 golden controls unchanged:

```text
EXACT carryover
→ SAME_FAST
→ snapshot UNCHANGED

Prior OUTPUT_MISMATCH + current == prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

No Edit Reconcile source or ownership change belongs in this mini.

---

## 11. Release/static gate

Before release:

```text
node --check latest.js PASS
node --check install.js PASS
latest.js == install.js PASS
Contracts v2 PASS
captured reaction-line reproducer PASS after repair
all invalid reaction-line negative fixtures still FAIL
historical Reaction normalization fixtures PASS
historical Structure fixtures PASS
B_END closure fixture PASS
M2-3 differential fixtures PASS
no persistent schema delta
no new host/storage/network/timer calls
```

`latest.js` and `install.js` must remain byte-identical.

---

## 12. Natural live close gate

Required real-long-chat proof after release:

```text
one natural COMMUNITY-bearing B or C output
→ five visible comment/reply lines per section
→ each line ends in exactly one supported reaction tag
→ no reaction-tail warning
→ Reaction normalization still behaves as before

preferred high-value proof:
B_END
→ terminal EXPLICIT
→ valid 2×3 COMMUNITY structure
→ no COMMUNITY warning
→ Broadcast closure COMPLETE · structure PASS
→ stored terminal airtime unchanged
```

If a line is genuinely malformed, the warning must still fire. The goal is to remove the false-positive mismatch, not suppress diagnostics.

---

## 13. Relationship to Post-B_END clock candidate

`POST_BEND_C_CLOCK_DOMAIN_GAP` currently remains HOLD because a later natural v0.64.3 B_END → C transition advanced correctly without a patch.

Therefore current priority after M2-3 is:

```text
1. COMMUNITY Reaction Validator Repair — recurrent evidence, candidate after static reproduction
2. Post-B_END C clock floor — HOLD until recurrence re-establishes need
```

If new production evidence changes either classification before M2-3 ships, re-rank them from evidence rather than preserving provisional version numbers.

---

## 14. Release verdict

```text
COMMUNITY_REACTION_TAIL_VALIDATOR_MISMATCH
→ recurrent direct evidence
→ exact root cause still requires static reproduction
→ likely narrow Reaction/Structure validator repair
→ no Broadcast semantic change
→ no generation-semantic rewrite
→ no M2-3 blocker
```

Recommended next step after M2-3 production:

```text
captured RAW fixture
→ reproduce old warning statically
→ isolate exact predicate
→ implement narrow validator repair
→ static/CI
→ release-simcore
→ natural long-chat validation
→ main evidence/current-development synchronization
```

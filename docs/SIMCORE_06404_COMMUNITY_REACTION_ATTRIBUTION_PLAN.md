# SimCore v0.64.4 — COMMUNITY Reaction Validator Attribution

Date: 2026-08-23
Status: IMPLEMENTATION AUTHORIZED · ATTRIBUTION ONLY · NO VALIDATOR TOLERANCE
Production parent: `v0.64.3 — B_END Diagnostic Builder Binding Repair`
Parent release commit: `d7fd45cd193ef1ff187c73761ded958d89558ebf`
Work branch: `simcore-06404-community-reaction-attribution`

## Purpose

Narrow the recurrent `COMMUNITY_REACTION_TAIL_VALIDATOR_MISMATCH` before M2-3 without guessing at a repair rule.

Natural v0.64.3 evidence repeatedly emitted:

```text
COMMUNITY ... 댓글 반응 태그 5줄 오류
```

across B_START, B_CONTINUE and B_END. The copied RAW appeared to end each comment/reply with one supported reaction tag, while B_END terminal authority and airtime closure remained healthy. The warning alone downgraded the diagnostic `Broadcast closure` structure component to PARTIAL/QUARANTINED.

The previously frozen post-M2-3 repair candidate remains useful as the eventual repair contract, but its own activation gate requires an exact static reproduction before any tolerance is added.

## Pre-implementation discriminator

The retained visible suffix examples from the live evidence were checked against the current production grammar:

```text
[공감 65,105,200]
[RT 55,523,920]
[포텐 65,320,900]
[좋아요 12,301,900]
[추천 15,970,900]
```

The current production predicates are exactly:

```text
tagCount == 1
AND
REACTION_AT_END_RE == true
```

Those visible suffix forms are accepted by the current regex. The repository does not retain the complete exact failing RAW comment lines needed to reproduce the live false-positive byte-for-byte.

Therefore:

```text
repair tolerance: BLOCKED
bounded attribution: AUTHORIZED
```

No `trim()` broadening, invisible-character acceptance, suffix stripping, reaction synthesis or Structure repair is allowed in v0.64.4.

## Release contract

v0.64.4 may add one bounded Reaction helper:

```text
reaction.inspectCommentReactionLine(line)
```

The helper may return metadata only:

```text
ok
tagCount
finalTagValid
failureReason = NONE | MISSING | MULTIPLE | FINAL_TAIL
tailKind = NONE | WHITESPACE | FORMAT_ONLY | VISIBLE_OR_UNKNOWN | NO_TAG
trailingChars
```

Constraints:

```text
no raw line retention
no logging of comment text
no persistent state
no output mutation
no reaction normalization change
no supported-label change
no numeric parser change
```

Structure remains judge-only. It must consume `inspection.ok` with behavior exactly equivalent to the old predicate:

```js
(tags.length === 1 && REACTION_AT_END_RE.test(line))
```

The only visible behavioral delta is bounded reason attribution appended to the existing warning when a line is already invalid.

## Expected warning attribution

Example only:

```text
COMMUNITY 1-3: 댓글 반응 태그 5줄 오류 (각 댓글/대댓글 끝에 정확히 1개 필요) · missing 0 · multiple 0 · final-tail 5 · tail FORMAT_ONLY:5 · tail-chars 5
```

The warning remains one `COMMUNITY ...` warning. Therefore existing Structure quarantine and B_END diagnostic downgrade semantics remain unchanged.

## Frozen surfaces

Do not change:

```text
Reaction accepted grammar
Reaction normalization and stale_scale_fallback
Structure pass/fail semantics
Structure judge-only ownership
COMMUNITY block/section/comment counts
Broadcast B_START/B_CONTINUE/B_END semantics
B_END terminal coverage / airtime commit / unlock
Time / Frame / Lifecycle
Representation / Edit Reconcile
Recovery / output-compat / bootstrap-migration
Prompt generation semantics
Store schema or call counts
Runtime Mirror / Deferred Mirror
host/network/timer surfaces
```

M2-3 remains a separate mechanical ownership extraction. v0.64.4 must not move Edit Reconcile ownership or alter its decision tree.

## Static gate

Required before production deploy:

```text
node --check latest.js PASS
node --check install.js PASS
latest.js == install.js PASS
Contracts v2 PASS
version/runtime markers 0.64.4
no persistent schema delta
no new host/storage/network/timer calls
```

Reaction/Structure equivalence fixtures:

```text
[공감 N]      PASS old == PASS new
[RT N]        PASS old == PASS new
[좋아요 N]    PASS old == PASS new
[추천 N]      PASS old == PASS new
[포텐 N]      PASS old == PASS new
[Upvote N]    PASS old == PASS new
trailing ordinary spaces PASS old == PASS new
missing tag             FAIL old == FAIL new / MISSING
two tags                FAIL old == FAIL new / MULTIPLE
visible prose suffix    FAIL old == FAIL new / FINAL_TAIL
zero-width suffix       FAIL old == FAIL new / FINAL_TAIL + FORMAT_ONLY
markdown suffix         FAIL old == FAIL new / FINAL_TAIL + VISIBLE_OR_UNKNOWN
```

The retained visible v0.64.3 tag-end examples must explicitly PASS the old predicate. This proves why v0.64.4 is attribution-only rather than a guessed repair.

Frozen M2 controls must remain present:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
```

## Live close / routing gate

After release, collect one natural COMMUNITY-bearing B or C output.

If the old warning recurs, the extended warning must identify the failing class without exposing raw text:

```text
MISSING
MULTIPLE
FINAL_TAIL + FORMAT_ONLY
FINAL_TAIL + VISIBLE_OR_UNKNOWN
```

Then:

```text
exact failing class proven
→ create separate narrow repair mini (likely v0.64.5)
→ old failing fixture MUST fail pre-patch and pass post-patch
```

If a natural valid COMMUNITY produces no warning:

```text
healthy control captured
→ preserve as comparison evidence
→ do not invent a repair solely to satisfy the older warning family
```

## Roadmap relationship

Current sequence after this decision:

```text
v0.64.3 production
→ v0.64.4 COMMUNITY Reaction Validator Attribution
→ natural long-chat discriminator
→ if exact repair is proven: narrow repair mini
→ otherwise proceed to v0.65.0 M2-3
```

`POST_BEND_C_CLOCK_DOMAIN_GAP` remains HOLD until natural recurrence.

The earlier `SIMCORE_06501_COMMUNITY_REACTION_VALIDATOR_PLAN.md` remains the repair design reference, but its provisional version slot is superseded by actual production evidence and versioning. No repair portion of that plan is activated by this attribution release.

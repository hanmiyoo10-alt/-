# SimCore v0.70.9 Inline Planning Marker Hygiene Guard Design

Date: 2026-09-06 KST
Status: **DESIGN FROZEN · VERSION RESERVED · IMPLEMENTATION NOT STARTED · NON-RUNTIME DESIGN RECORD**
Tracking: `#1589`
Parent production: `v0.70.8 Repeat-Send Representation Rewind Guard`

## 1. Release identity

```text
Version = 0.70.9
Release = Inline Planning Marker Hygiene Guard
Primary owner = Output Compat / visible-output hygiene
Primary incident = #1589
Implementation status = NOT STARTED
Publication authorization = NOT GRANTED BY THIS DESIGN ALONE
```

No `0.70.9` reservation was present in fresh repository search before this record.

## 2. Triggering live evidence

The first real turn after a page refresh in the v0.70.8 long-chat generation `mtom5tgq-rbmuf3` contained two planning/control lines inside the visible assistant RAW body:

```text
┣ internal_memo: Explain core philosophy of task fragmentation and daily physiological baseline ┫
...
┣ internal_memo: Address sleep habits honestly while providing practical insight ┫
```

The same diagnostic reported successful leading Thoughts compatibility cleanup:

```text
Preamble provenance = THOUGHTS_COMPAT
Action = STRIPPED
Warnings = 0
```

Therefore this is not the already-supported leading Thoughts preamble family. It is an inline body hygiene gap.

## 3. Fresh source attribution

Current output preparation shape is:

```text
raw output content
-> kernel.stripControlTags(content)
-> Output Compat canonicalizeResponseEnvelope(...)
-> normalizeTailPlacement(...)
-> Structure / Output Finalize path
```

Existing Kernel control stripping is deliberately narrow:

```text
CONTROL_TAG_RE = [방송 시작|중|종료]
```

It does not recognize `internal_memo` planning lines.

The existing Thoughts compatibility path is preamble-oriented and therefore cannot remove an inline marker after the canonical response has begun.

Root-owner conclusion:

```text
MODEL/GATEWAY MAY EMIT INLINE PLANNING CONTROL LINE
+
OUTPUT COMPAT HAS NO BOUNDED INLINE PLANNING-LINE HYGIENE RULE
=
VISIBLE OUTPUT CONTAMINATION
```

Do not attribute the incident to Representation, Edit Reconcile, Deferred Mirror, Structure, storage, cache, Frame, Time, Community, or the v0.70.8 repeat-send repair.

## 4. Why a global string strip is forbidden

The following repair is explicitly forbidden:

```text
content.replace(/internal_memo/g, ...)
includes('internal_memo') -> delete surrounding text
arbitrary line deletion containing internal_memo
```

Those approaches can destroy legitimate prose, user-requested quotations, fiction, code, logs, or documentation.

The repair must recognize a reserved control-line grammar, not a keyword.

## 5. Frozen reserved grammar

A removable inline planning marker must satisfy **all** conditions:

```text
A. standalone physical line
B. outside Markdown fenced code
C. after trimming horizontal outer whitespace, exact left delimiter starts the line: ┣
D. exact case-sensitive control key: internal_memo:
E. exact right delimiter ends the line: ┫
F. payload remains on the same line
G. payload length is bounded to <= 512 UTF-16 code units
H. no embedded right delimiter ┫ occurs inside the payload
```

Conceptual grammar:

```text
^[ \t]*┣[ \t]*internal_memo:[ \t]*([^\r\n┫]{1,512})[ \t]*┫[ \t]*$
```

This exact grammar is reserved as `INLINE_INTERNAL_MEMO_V1`.

The implementation may use an equivalent deterministic parser rather than this literal regex, especially to preserve fenced-code context.

## 6. Preservation rules

The repair must **not** strip any of these controls:

```text
ordinary prose mentioning "internal_memo"
inline prose: "example ┣ internal_memo: text ┫ example"
Markdown inline code containing the marker
Markdown fenced code containing the exact marker line
blockquote or quoted fixture lines whose first non-space character is not ┣
wrong key, e.g. internal_memory:
wrong delimiter
multiline payload
payload > 512 code units
empty payload
```

A user who intentionally needs the literal reserved marker can preserve it inside a fenced code block or by quoting/prefixing the line so it is not the reserved standalone grammar.

## 7. Physical owner and sequencing

The repair belongs in **Output Compat**, not in the generic Kernel control-tag registry.

Frozen sequencing:

```text
function prepareOutput(content, pending) {
    text = kernel.stripControlTags(content)
    text = stripBoundedInlinePlanningMarkers(text)
    envelope = canonicalizeResponseEnvelope(text, pending)
    text = normalizeTailPlacement(envelope.content, pending)
    ...
}
```

Rationale:

- Kernel `CONTROL_TAG_RE` currently owns explicit Core/Broadcast control tokens, not model/gateway compatibility artifacts.
- Output Compat already owns response compatibility/canonicalization and the leading Thoughts compatibility family.
- placing the bounded hygiene step before envelope canonicalization ensures the canonical visible body, fingerprints, Structure validation and committed snapshot all see the cleaned representation.
- the step is pure and synchronous; it adds no Host read/write, storage, network, timer, retry, polling, persistent schema or raw-body retention.

## 8. Fence-aware scanner contract

The implementation must be deterministic and line-oriented.

Minimum fenced-code handling:

```text
recognize opening Markdown fences using ``` or ~~~ with length >= 3
track the opening fence character and minimum length
while inside that fence, never strip planning-marker-shaped lines
close only with the same fence character and sufficient length
```

The implementation does not need to become a full Markdown parser. Its only purpose is to avoid deleting literal code/examples.

## 9. Bounded diagnostic provenance

When at least one marker is removed, emit bounded compatibility provenance without retaining marker payload text.

Required conceptual fields:

```text
Inline planning compat = STRIPPED
Grammar = INLINE_INTERNAL_MEMO_V1
Markers = <count>
Removed chars = <count>
Raw payload = NOT RETAINED
```

The existing `Compatibility diagnostics` count may include this event, but the existing Thoughts provenance must remain distinguishable.

When no marker is found:

```text
no new visible diagnostic line is required
no hot-path warning is emitted
```

The live diagnostic must never echo the removed memo payload.

## 10. Exact behavioral contract

### Positive control

Input body:

```text
# 응답

정상 문단.

┣ internal_memo: plan next paragraph ┫

다음 정상 문단.
```

Expected canonical body:

```text
# 응답

정상 문단.

다음 정상 문단.
```

Expected diagnostics:

```text
Inline planning compat = STRIPPED
Markers = 1
Grammar = INLINE_INTERNAL_MEMO_V1
```

### Multiple-marker control

Two or more valid reserved lines in one response must all be removed deterministically while surrounding visible content remains byte-stable except for the removed lines and bounded adjacent blank-line normalization already owned by Output Compat.

### Negative controls

All must remain byte-identical:

```text
This prose mentions internal_memo normally.
`┣ internal_memo: literal inline code ┫`

```text
┣ internal_memo: literal fenced example ┫
```

> ┣ internal_memo: quoted example ┫

prefix ┣ internal_memo: inline example ┫ suffix
┣ internal_memory: wrong key ┫
┣ internal_memo: ┫
```

### Existing compatibility controls

Unchanged:

```text
leading THOUGHTS_COMPAT -> existing STRIPPED behavior
safe-envelope / envelope confirmation semantics unchanged
normal output with no marker -> byte-equivalent canonicalization
```

## 11. Permanent CI requirements

Implementation qualification must add executable regressions against the real Output Compat owner.

Required fixtures:

```text
1. exact observed standalone internal_memo line -> stripped
2. two separated valid markers -> both stripped
3. marker inside ``` fenced code -> preserved
4. marker inside ~~~ fenced code -> preserved
5. inline marker text -> preserved
6. blockquoted marker -> preserved
7. ordinary internal_memo prose -> preserved
8. malformed/wrong-key marker -> preserved
9. payload > 512 -> preserved
10. existing THOUGHTS_COMPAT preamble fixture -> unchanged PASS
11. ordinary no-marker output -> byte-equivalent PASS
12. latest.js == install.js
13. node syntax / Contracts / active SimCore required verifier PASS
```

The test must exercise the production Output Compat function, not a copied boolean/regex approximation.

## 12. Frozen non-goals

v0.70.9 must not include:

```text
storage latency optimization
Host-local telemetry optimization
repeat-send pre-snapshot latency work
Community alias changes
cache/provider-cache work
Representation/Edit Reconcile changes
Frame/Time/Broadcast changes
new persistent schema
new Host/network/storage/timer surface
release/repository system restructuring
```

Those remain separate lanes.

## 13. Live validation contract

After publication, use the adopted operator-gated three-lens procedure.

### Lens 1 — Version Lens

Required release-specific proof:

```text
ordinary long-chat output remains COMMITTED / BOUND / mirror COMMITTED
no visible internal_memo reserved control line survives when the model emits one naturally
if natural emission occurs, bounded Inline planning compat provenance reports STRIPPED
no regression in Thoughts preamble cleanup
```

Natural re-emission of the model planning line is nondeterministic. Therefore deterministic permanent owner-level regression is the primary exact proof for the target grammar; live long-chat still must prove ordinary output continuity.

### Lens 2 — Set Lens

Review the actual operator sequence separately after operator advancement. Prefer at least:

```text
fresh/ordinary output
-> next natural output
-> reroll or genuine hand-edit control when naturally useful
```

Do not manufacture unrelated state solely to force an `internal_memo` emission.

### Lens 3 — Element Inventory

After operator advancement, complete the exhaustive no-blank inventory required by the three-lens authority.

Any newly discovered FIX/BLOCKER remains advancement-blocking even if Lens 1 passes.

## 14. Advancement and closure

Successful v0.70.9 evidence may close `#1589` only when:

```text
permanent owner-level exact grammar tests = PASS
normal visible output preservation controls = PASS
fenced/quoted/code negative controls = PASS
production publication identity = VERIFIED
real long-chat three-lens review = COMPLETE
no v0.70.9-caused FIX/BLOCKER remains open
```

Existing independent WATCH items remain non-blocking unless promoted by new evidence.

## 15. Separate documentation debt

`#1545 CURRENT_DEVELOPMENT human current-state drift` remains a separate main-documentation FIX and is not repaired by this design transaction.

Do not mix its large continuity-file repair with v0.70.9 runtime implementation.

## 16. Design verdict

```text
V07009_VERSION = RESERVED
V07009_DESIGN = FROZEN
PRIMARY_FIX = #1589
OWNER = OUTPUT_COMPAT
REPAIR = FENCE_AWARE_STANDALONE_INLINE_INTERNAL_MEMO_V1_STRIP
BLIND_GLOBAL_KEYWORD_STRIP = FORBIDDEN
PERSISTENT_SCHEMA_CHANGE = NONE
NEW_IO = NONE
IMPLEMENTATION = NOT STARTED
RELEASE_SIMCORE_MUTATION = NONE
```

# SimCore Frame Permanent Fixture — Implementation Evidence — 2026-08-26

Status: `IMPLEMENTED · EXECUTABLE · REQUIRED GOLDEN GATE · 20 CASES · MIXED EVIDENCE MATURITY PRESERVED · NO RUNTIME CHANGE`

Design authority:
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`

Implementation-start record:
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_IMPLEMENTATION_PLAN_2026-08-26.md`

## 1. Transaction

```text
work branch = work/frame-permanent-fixture
PR          = #429 SimCore: add frame permanent fixture
work head   = 6360ec62bc714a7cf2dffd8afca696bcaec88c72
main merge  = 9b58a01b13f72224a1aa57da9cc4708119ac8db5
merge mode  = squash
```

Changed implementation files:

```text
products/simcore/tests/suites/frame.test.mjs
products/simcore/tests/fixtures/frame/cases.json
products/simcore/tests/registry.mjs
```

No runtime/plugin file was changed.

## 2. Stable suite registration

The existing permanent registry now contains:

```text
id         = frame
coverage   = EXECUTABLE
required   = true
goldenGate = true
```

The suite is automatically included by the existing `batch-a` / `all` aliases.
No second harness, fixture schema, pack topology, or CI topology was introduced.

## 3. Frozen 20-case matrix implemented

Frame parsing / capture:

```text
parse-basic-frame
capture-nearest-assistant-frame
capture-nearest-assistant-unframed-none
```

Frame continuity / deterministic repair:

```text
continuity-clean-pass
chapter-same-title-hold-repair
chapter-title-change-advance-repair
unresolved-title-no-invented-advance
volume-advance-chapter-reset
volume-jump-repair
volume-backward-restore
chatindex-same-repair
chatindex-backward-repair
chatindex-jump-repair
```

Structure-owned frame envelope:

```text
envelope-valid
envelope-duplicate-header-invalid
envelope-malformed-header-invalid
envelope-wrong-order-invalid
envelope-interstitial-text-invalid
envelope-missing-timestamp-invalid
envelope-invalid-timestamp-invalid
```

The suite directly executes current production exports through the existing `BundleLoader`:

```text
Frame.parseFrame
Frame.capturePreviousFrame
Frame.enforceContinuity
Frame.rewriteVolumeNumber
Frame.rewriteChapterNumber
Frame.rewriteChatindexNumber
Structure.responseEnvelopeScope
```

No production algorithm is copied into the suite.

## 4. Protected owner contracts

Frame continuity assertions protect bounded semantic results:

```text
probe.applied
probe.sequenceStatus
probe.volumeSignal
probe.chapterSignal
probe.repairs
probe.output
reparsed Volume / Chapter / Chatindex
```

The capture safety control permanently protects:

```text
nearest prior assistant is framed
→ capture that frame

nearest prior assistant is unframed
→ null
→ do not skip backward to an older assistant frame
```

The Structure sub-family protects only visible frame shape:

```text
frameOk
orderOk
timestampMarkerFound
timestampValid
timestamp
```

It does not make Structure a Narrative clock owner.

## 5. Direct-live repair control preserved

`chatindex-same-repair` corresponds to the v0.64.5 direct long-chat control where a repeated Chatindex was repaired to the exact next index.

Permanent authority is semantic:

```text
observed Chatindex = previous
expected Chatindex = previous + 1
repair             = CHATINDEX_SAME
output             = previous + 1
sequenceStatus     = REPAIRED
```

The suite does not bind to historical reader-facing diagnostic wording.

## 6. Permanent CI proof

PR CI run:

```text
SimCore CI = 32920570077
Verify     = PASS
Required   = PASS
```

PR scope classification:

```text
CI_SELF
HARNESS
```

Proposed verifier gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

Production materialized by CI:

```text
release-simcore commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
production blob        = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
latest/install sha256  = 56aafbe772c7a50c639873aee16ba9e7dd211ac44d83f4fa1bbe5ca557103953
```

The proposed verifier reported:

```text
conclusion  = PASS
reasonCodes = []
```

Therefore the exact frozen 20-case `frame` suite passed as part of the permanent regression pack against deployed SimCore v0.64.7 source authority.

## 7. Evidence maturity remains explicit

```text
Frame deterministic continuity contract = ESTABLISHED
CHATINDEX_SAME repair                    = DIRECT_LIVE_CONTROL / v0.64.5
Structure frame-envelope contract        = GOLDEN_CONTRACT / EXECUTABLE
```

Synthetic malformed-envelope cases do not imply a dedicated historical live incident for each negative shape.
CI success does not fabricate live provenance.

## 8. Production/release boundary

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
real-long-chat requirement for this fixture work = NONE
```

Current production remains SimCore v0.64.7 with the existing real-long-chat gate separate from this fixture implementation.

## 9. Result

```text
SIMCORE_FRAME_PERMANENT_FIXTURE
= IMPLEMENTED
= EXECUTABLE
= REQUIRED
= GOLDEN GATE
= 20 CASES
= PERMANENT CI PASS

NEXT FROZEN FIXTURE WORK
= broadcast-closure expansion
```

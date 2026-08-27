# SimCore v0.64.8 PR1 Pre-Merge Anchor Review — 2026-08-27

Status: **CLOSED_PREMERGE · TEST/BUILDER HARNESS ONLY · NO RUNTIME DESIGN CHANGE**

Parent work: `#623`
PR: `#625`
Related implementation evidence: `docs/SIMCORE_06408_IMPLEMENTATION_EVIDENCE.md`

## Findings

### 1. BUILDER_DIAGNOSTIC_POSTCONDITION_BROAD_COUNT

```text
classification: FIX
subclass: TEST_HARNESS_ANCHOR
impact: candidate materialization false BLOCK risk
runtime impact: NONE
production impact: NONE
status: CLOSED_PREMERGE
```

The first builder draft counted every literal `Telemetry checkpoint:` occurrence after patching. The v0.64.8 release-note text also contained that literal, so a valid generated candidate could have produced count=2 and failed the builder postcondition before candidate verification.

Repair:

```text
release-note wording no longer duplicates the exact diagnostic prefix
builder postcondition counts the precise generated diagnostic template anchor
```

### 2. OUTPUT_ACTIVE_GATE_GLOBAL_SEARCH

```text
classification: FIX
subclass: TEST_HARNESS_ANCHOR
impact: verifier false BLOCK / wrong-anchor risk
runtime impact: NONE
production impact: NONE
status: CLOSED_PREMERGE
```

The first permanent-suite draft used a global `source.indexOf('    if (!result.active) {')`. If another matching guard appeared earlier in the bundle, the verifier could bind the wrong source occurrence.

Repair:

```text
find exact cs.processOutput(...) call first
→ search active gate starting at processOutput anchor
→ search OUTPUT_COMMIT checkpoint starting at active gate
→ search COMMITTED bookkeeping starting at checkpoint
```

This proves ordering within the intended `processCoreOutput` seam rather than relying on a global first match.

## Disposition

Both findings were detected during pre-merge human/diff review, repaired on the same work branch, and require fresh SimCore CI on the new PR head.

They do not widen v0.64.8 scope and do not modify `release-simcore`.

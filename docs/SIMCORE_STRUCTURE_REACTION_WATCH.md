# SimCore Structure / Reaction Watch

Date opened: 2026-08-22
Current classification: `DIRECT_EVIDENCE / RECURRENT_STRUCTURE_OUTPUT_CONTRACT_VIOLATION / NON-BLOCKING`

Purpose: preserve repeated live output-contract failures involving COMMUNITY comment/reply reaction tags and their interaction with Structure quarantine. This watch is separate from Edit Reconcile, Broadcast terminal-time authority, and diagnostic-copy behavior.

## Contract under watch

Current runtime contract requires each COMMUNITY comment/reply line to terminate with exactly one reaction tag, with Reaction normalization operating per platform family.

The runtime validator is already detecting violations; this watch concerns repeated **generation compliance**, not missing observability.

## Natural v0.64.2 evidence

Multiple B-mode turns in the long-chat broadcast sequence emitted warnings of the form:

```text
COMMUNITY ... 댓글 반응 태그 5줄 오류
(각 댓글/대댓글 끝에 정확히 1개 필요)
```

Reaction `stale_scale_fallback` was also observed on some platform families and successfully normalized values. Do not equate stale-scale fallback with the tag-shape warning; they are separate validators.

## Natural v0.64.3 recurrence

Runtime generation: `mt4giy5r-34f2jf`

The warning recurred across the whole broadcast family:

```text
B_START    @2084 → @2085  reaction-tag warning
B_CONTINUE @2086 → @2087  reaction-tag warning
B_CONTINUE @2088 → @2089  reaction-tag warning (+ one stale-scale fallback)
B_END      @2090 → @2091  reaction-tag warning
```

The B_END diagnostic reported:

```text
Broadcast closure: PARTIAL
terminal: EXPLICIT
structure: QUARANTINED
Broadcast terminal coverage: EXPLICIT_TERMINAL
stored airtime == explicit terminal airtime
```

This is useful separation evidence:

```text
Broadcast terminal-time authority: PASS
Structure acceptance: NOT PASS
State quarantine/protection: ACTIVE
```

## Current interpretation

The repeated warnings are no longer a one-off platform-diversity or random malformed-response specimen. The family recurred across B_START, B_CONTINUE and B_END in one natural v0.64.3 broadcast and has historical v0.64.2/v0.63.x evidence.

Classification:

```text
observable output-contract violation: DIRECT
recurrence: ESTABLISHED
runtime state corruption: NOT OBSERVED
validator visibility: WORKING
quarantine behavior: OBSERVED
exact generation-cause attribution: OPEN
M2-3 blocker: NO
later narrow mini candidate: YES
```

## What is NOT yet proven

Do not assume without narrower evidence that the cause is:

```text
Reaction normalization
Structure parser
Prompt wording
platform-family selection
host post-processing
Representation normalization
```

The validator tells us the generated/canonical output violates the reaction-tag contract. It does not yet prove which producer-side layer should be changed.

## Required next evidence

On future natural B/C outputs, preserve:

```text
mode
COMMUNITY block/section position
exact warning text
whether stale_scale_fallback also occurred
whether Structure accepted/quarantined
whether CANONICAL == FRESH
whether the next request fast-reconciled representation drift
whether a reroll clears the warning
```

A narrow fix should be promoted only when the producer-side cause can be isolated without widening normalization or mixing Structure and Reaction responsibilities unnecessarily.

## Release discipline

Do not patch this inside:

```text
M2-3 Edit Reconcile Ownership Extraction
v0.64.3 diagnostic builder repair
post-B_END clock watch
Store performance work
host/history observer work
```

If promoted after M2-3, make it a separate Structure/Reaction output-contract mini with static fixtures derived from these natural warnings.

## Cross references

- `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`
- `SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md`
- `SIMCORE_DEFERRED_LEDGER.md`

# SimCore 3.0M Master Design Mode A Erratum — 2026-09-01

Date: 2026-09-01 KST

Status: **FIX · DOCUMENTATION-ONLY · MODE A PRESERVED · NO RUNTIME CHANGE**

Classification: **3.0M SOURCE INTELLIGENCE · MODE HIERARCHY CLARIFICATION · NON_RUNTIME**

## 1. Trigger

During review of the newly frozen 3.0M Source Intelligence master design, the user asked whether Mode A remains the default/base path.

Fresh repository inspection confirmed that current SimCore runtime/compiler evidence still treats A/B/C as the high-level mode families. The 3.0M master design section that listed only `B_START / B_CONTINUE / B_END / C` as the canonical runtime modes omitted Mode A from the explanatory list.

This is a documentation wording defect, not a runtime defect and not a design change.

Classification:

```text
FIX · 3M_MASTER_DESIGN_MODE_A_OMISSION · DOCUMENTATION_ONLY
```

## 2. Correct mode hierarchy

The intended 3.0M hierarchy is:

```text
A
= default / ordinary primary conversation and roleplay path
= no Source Intelligence expansion required by default

B
= broadcast family
  B_START
  B_CONTINUE
  B_END

C
= community / social-source projection family
= primary surface evolved by 3.0M Source Intelligence
```

Therefore the correct conceptual rule is:

```text
HIGH-LEVEL MODE FAMILIES = A / B / C

B has lifecycle subphases:
B_START / B_CONTINUE / B_END
```

## 3. 3.0M effect on Mode A

Mode A is intentionally preserved as the ordinary/default path.

3.0M does not turn Mode A into a source-sidecar mode and does not require source-family rendering when no source projection is relevant.

Required invariant:

```text
ordinary Mode A chat
+ no source projection requested/relevant
→ current primary-response behavior remains primary
→ Source Intelligence adds near-zero semantic burden
→ no mandatory source UI
→ no source-history accumulation
→ no auxiliary model call
```

A may still supply facts that become eligible for a source projection only through a separately authorized exposure/publication contract in a later design. That possibility does not change Mode A's default role.

## 4. 3.0M mode decision restated

3.0M still introduces no new core mode family.

Do not create:

```text
SNS_MODE
BOARD_MODE
NEWS_MODE
WIKI_MODE
```

Instead:

```text
A = ordinary/default primary conversation
B = broadcast lifecycle family
C = source-aware social/public projection family

source family = orthogonal projection axis
```

Source families such as `LIVE_REACTION`, `BOARD`, `SOCIAL_FEED`, `NEWS`, and `PUBLIC_KNOWLEDGE` remain projections, not replacements for A/B/C.

## 5. Relationship to the frozen master design

This erratum supersedes only the incomplete mode-list wording in:

```text
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
```

All other frozen decisions remain unchanged:

```text
3M_MAJOR_IDENTITY = SOURCE_INTELLIGENCE
MODE_C_SOURCE_AWARE_EVOLUTION = PRESERVED
FIRST_COMPATIBILITY_FAMILY = LIVE_REACTION
LEGACY_COMMUNITY_COMPATIBILITY = REQUIRED
SOURCE_SPECIFIC_DOM_CSS = DOWNSTREAM PRESENTATION DESIGN
IMPLEMENTATION = NOT_AUTHORIZED
S7 / v0.70.3 = UNCHANGED
release-simcore = UNCHANGED
```

A future bounded master-document maintenance transaction may fold this correction directly into the master document. Until then this erratum is the current authority for the 3.0M mode-hierarchy clarification.

## 6. Final state

```text
MODE_A = PRESERVED DEFAULT / ORDINARY PATH
MODE_B = BROADCAST FAMILY
MODE_C = SOURCE-AWARE PROJECTION EVOLUTION TARGET
NEW_CORE_MODE = NONE
RUNTIME_CHANGE = NONE
PRODUCTION_CHANGE = NONE
FIX = RECORDED
```

# SimCore v0.70.4 Terminal Convergence Evidence Invalid Blocker — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX · BLOCKER · NON-RUNTIME · PRODUCTION UNCHANGED**
Classification: **SIMCORE · HUMAN-EVIDENCE TERMINAL CONVERGENCE · ENVELOPE CHECKPOINT REPAIR**

## 1. Trigger

After PR #1459 merged the accepted v0.70.4 HUMAN_EVIDENCE close to `main`, the automatic R2.8 terminal convergence workflow ran against main commit:

```text
2f8b29724647265e93e69284a2488cd502d137f7
```

Workflow:

```text
SimCore R2.8 Human-Evidence Terminal Convergence
run = 33831170848
job = Converge Human-Evidence Terminal State
```

The workflow successfully resolved the exact evidence transaction and reobserved the exact published production, then failed before state projection with:

```text
SIMCORE_R2_8_TERMINAL_BLOCKED_EVIDENCE_INVALID
```

No terminal state mutation occurred.

## 2. Root cause

The accepted evidence file used:

```json
"checkpoint": "07004"
```

Current `products/simcore/tooling/release-terminal-transition.mjs` defines checkpoint syntax as:

```text
M<number>-<number>
```

and the current manifest authority is:

```text
major_update_checkpoint = M2-6
```

Therefore `07004` is an invalid checkpoint token. It incorrectly encoded the release work-item number where the terminal envelope requires the major-update checkpoint.

## 3. Repair boundary

Repair only:

```text
products/simcore/releases/live-evidence/simcore-v0.70.4-new-02.json
checkpoint: 07004 -> M2-6
```

Do not change:

```text
release-terminal-transition.mjs
R2.8 workflow
release-simcore
plugin bytes
v0.70.4 runtime semantics
HUMAN_EVIDENCE decision
production identity
live scenario
next priority
```

## 4. Disposition

```text
classification = FIX / BLOCKER
cause = EVIDENCE_ENVELOPE_CHECKPOINT_DOMAIN_MISMATCH
runtime impact = NONE
production = v0.70.4 UNCHANGED
release-simcore = UNCHANGED
release-system code = UNCHANGED
next = repair envelope -> CI -> merge -> require successful automatic terminal convergence -> only then v0.70.5 fresh source preflight
```

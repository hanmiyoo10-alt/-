# SimCore Live Evidence Auto-Close Operator Convention

Date: 2026-09-04 KST

Status: **ACTIVE OPERATOR CONVENTION · NON_RUNTIME · HUMAN-AUTHORITY PRESERVING**

Applies to: SimCore real-long-chat / live-evidence validation after a release is already published and the active live gate is awaiting human evidence.

Authority preserved:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_8_HUMAN_EVIDENCE_TERMINAL_CONVERGENCE_DESIGN.md`
- repository common rules and current release-specific frozen live acceptance contract

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

---

## 1. Standing operator instruction

When the user has supplied the required real-world/live diagnostic evidence for the active SimCore live gate, and the frozen acceptance contract is satisfied with no unresolved correctness blocker, the operator must not stop at an informal chat verdict or wait for a second separate command such as `close it`, `record it`, or `LIVE_PASS`.

The default routine is:

```text
SUFFICIENT HUMAN-SUPPLIED LIVE EVIDENCE
+ FROZEN ACCEPTANCE CONTRACT SATISFIED
+ NO UNRESOLVED BLOCKER
        ↓
RECORD DURABLE HUMAN-EVIDENCE CLOSE
        ↓
WRITE / VERIFY MACHINE-READABLE LIVE-EVIDENCE ENVELOPE WHEN REQUIRED
        ↓
RUN TERMINAL / ADMIN CONVERGENCE THROUGH EXISTING AUTHORITATIVE PATH
        ↓
VERIFY PR / CI / MERGE GATES
        ↓
EXACT-MAIN READBACK
        ↓
PRODUCTION / LIVE-GATE READBACK
        ↓
REPORT CLOSED STATE TO USER
```

This is the normal completion routine for future SimCore live-evidence work.

---

## 2. Human authority is not weakened

This convention does **not** automate the decision that failing, missing, ambiguous, or contradictory evidence is a `LIVE_PASS`.

`HUMAN_EVIDENCE` remains the authority source. The user's standing instruction authorizes the operator to complete deterministic repository close bookkeeping once the supplied human evidence satisfies the already-frozen acceptance contract.

The operator must fail closed when any of the following is true:

```text
required evidence is materially missing
correctness blocker remains unresolved
release identity / production binding is stale or ambiguous
acceptance contract requires an explicit condition that has not been met
repository authority conflicts
close would require weakening a gate or inventing evidence
```

In those cases the operator records or reports `HOLD`, `PENDING`, `WATCH`, or the applicable bounded state instead of manufacturing a pass.

---

## 3. No duplicate confirmation seam

Once sufficient evidence is already present in the conversation and the live contract is satisfied, a second confirmation prompt is considered unnecessary operator glue.

The operator should proceed directly to repository closure unless the user explicitly requests one of these modes:

```text
analysis-only
no repository writes
hold / do not close yet
collect more evidence first
```

A generic continuation instruction such as `ㄱ`, `go`, or equivalent may continue an already-authorized close transaction, but is not itself a substitute for missing live evidence.

---

## 4. Required closure evidence

A completed auto-close transaction should preserve the existing R2.8 authority chain and, where applicable, leave durable evidence for:

```text
fresh current authority read
release identity / production binding
accepted human live evidence
release-specific close document
machine-readable live-evidence envelope
terminal/admin convergence
PR and required CI
merge result
exact-main post-merge CI/readback
current live-gate state
production branch readback
next priority
```

No success claim should be made for a step that was not actually observed.

---

## 5. Scope boundary

This convention authorizes completion of **already-supported deterministic close operations**. It does not authorize:

```text
new runtime behavior
publication of an unpublished release
release-system gate weakening
force push
automatic retry of failed publication
invented human evidence
optimization outside the active release scope
unrelated repository cleanup
```

If a close operation exposes a new implementation requirement, that work remains a separate scoped transaction.

---

## 6. Operational shorthand

For future SimCore releases, the expected operator behavior is:

```text
"evidence complete" means
"close it durably now"
not
"tell the user it looks complete and wait for another prompt"
```

This convention exists specifically to prevent live evidence from being accepted in chat while the repository remains stale in `LIVE_PENDING` / `PENDING_REAL_LONG_CHAT`.

# SimCore Live Evidence Review / Classification Handoff Template

Status: `R_PREP_NON_RUNTIME APPLIED ARTIFACT · S-04 SUPPORTING REPOSITORY MEMORY · NON-EXECUTABLE · NO RUNTIME CHANGE`

Parent runtime idea: `S-04 Live Evidence Packet Builder`
Parent design authority: `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md`

Purpose: provide one manual repository-review template for turning a bounded S-04-style evidence packet or manually transcribed equivalent into a reviewed SimCore repository disposition without implementing the S-04 runtime builder.

This template is deliberately usable **before** S-04 runtime implementation.
It must never imply that a runtime packet was generated when the reviewer is working from manually transcribed diagnostics.

---

## 1. Intake identity

```text
Review ID: <manual/repo-local identifier>
Review date: <YYYY-MM-DD>
Reviewer: <operator/assistant>
Source form: PACKET_V1 / MANUAL_EQUIVALENT
Primary source document/ref: <path or reference>
Full diagnostic reviewed: YES / NO / NOT_AVAILABLE
RAW/neighbor context reviewed: YES / NO / NOT_REQUIRED / NOT_AVAILABLE
```

Rules:
- `PACKET_V1` means an actual future S-04 packet was produced by the runtime builder.
- `MANUAL_EQUIVALENT` means the same bounded categories were transcribed from existing diagnostics/evidence by a reviewer.
- never label manual transcription as a generated packet.
- this document is a review aid, not the primary live-evidence source.

---

## 2. Capture

Record only bounded identity facts actually present in the source.

```text
Observation identity/digest: <value / UNAVAILABLE>
Observation revision: <value / UNAVAILABLE>
Capture kind: <value / UNAVAILABLE>
CapturedAt: <value / UNAVAILABLE>
Location/chat scope digest: <value / UNAVAILABLE>
Visible user index: <value / UNAVAILABLE>
Visible assistant index: <value / UNAVAILABLE>
Probe user index: <value / UNAVAILABLE>
Probe assistant index: <value / UNAVAILABLE>
```

Do not copy raw user/assistant bodies into this section.

---

## 3. Production

```text
SimCore version: <value>
Release name: <value / UNAVAILABLE>
Runtime generation: <value>
Runtime epoch: <value / UNAVAILABLE>
Release commit/blob: <value / UNAVAILABLE>
```

Repository release identity may be cross-checked separately during review, but do not fabricate missing runtime metadata inside the source record.

---

## 4. Binding

Use the canonical diagnostic binding vocabulary only.

```text
Binding: CURRENT_BOUND / PROBE_AHEAD / PROBE_BEHIND / NO_REQUEST_CONTEXT / UNBOUND / UNAVAILABLE
Request user index: <value / UNAVAILABLE>
Output assistant index: <value / UNAVAILABLE>
Probe context/applicability: <value / UNAVAILABLE>
Observation lifecycle/context: <value / UNAVAILABLE>
```

A stale/unbound observation remains valid evidence of that stale/unbound condition.
Do not upgrade it to current during review.

---

## 5. Runtime path

Copy only already-owner-produced path facts that materially identify the exercised route.

```text
Request hook: <value / NOT_APPLICABLE / UNAVAILABLE>
Core handshake: <value / NOT_APPLICABLE / UNAVAILABLE>
Runtime status: <value / UNAVAILABLE>
Mode: <value / UNAVAILABLE>
Stored last mode: <value / NOT_APPLICABLE / UNAVAILABLE>
Edit origin: <value / NOT_APPLICABLE / UNAVAILABLE>
Edit reconcile: <value / NOT_APPLICABLE / UNAVAILABLE>
Prior representation: <value / NOT_APPLICABLE / UNAVAILABLE>
Output representation: <value / NOT_APPLICABLE / UNAVAILABLE>
Output disposition: <value / NOT_APPLICABLE / UNAVAILABLE>
Deferred Mirror: <value / NOT_APPLICABLE / UNAVAILABLE>
Broadcast lifecycle/end authority: <value / NOT_APPLICABLE / UNAVAILABLE>
Structure: <value / NOT_APPLICABLE / UNAVAILABLE>
Narrative/current-time authority: <value / NOT_APPLICABLE / UNAVAILABLE>
Frame/continuity: <value / NOT_APPLICABLE / UNAVAILABLE>
```

Do not parse human prose to recreate missing machine facts.

---

## 6. Key facts

Maximum recommended working set: `12` lines.

Use:

```text
<subject> = <result> [· reason <reasonId>] [· owner <semanticOwner>]
```

Reviewed key facts:

```text
1. <fact>
2. <fact>
3. <fact>
...
```

Rules:
- all facts must belong to the same primary observation unless explicitly marked as an adjacent control;
- preserve `UNKNOWN / UNAVAILABLE / UNATTRIBUTED / NOT_APPLICABLE / NOT_EXERCISED / UNBOUND` instead of readability upgrades;
- do not turn correlation into causality;
- do not derive severity from warning prose.

---

## 7. Performance evidence

Include only already-measured bounded timing facts when relevant.

```text
Request total: <value / NOT_RELEVANT / UNAVAILABLE>
Request hotspot: <value / NOT_RELEVANT / UNAVAILABLE>
Edit reconcile duration: <value / NOT_RELEVANT / UNAVAILABLE>
Turn storage size/set latency: <value / NOT_RELEVANT / UNAVAILABLE>
Output handler total: <value / NOT_RELEVANT / UNAVAILABLE>
Output hotspot: <value / NOT_RELEVANT / UNAVAILABLE>
Out storage latency: <value / NOT_RELEVANT / UNAVAILABLE>
Cache topology/candidate local cost: <value / NOT_RELEVANT / UNAVAILABLE>
External request→output/model/gateway wait: <value / NOT_RELEVANT / UNAVAILABLE>
```

Never attribute external generation latency to SimCore without separate evidence.

---

## 8. Evidence qualifiers

Preserve the S-04 evidence-limit vocabulary.

```text
Cause: ESTABLISHED / UNESTABLISHED / UNATTRIBUTED
Recurrence: FIRST_SPECIMEN / RECURRENT / UNKNOWN
Recovery: OBSERVED / NOT_OBSERVED / NOT_APPLICABLE / UNKNOWN
State corruption: OBSERVED / NOT_OBSERVED / UNKNOWN
Current-line applicability: CURRENT / HISTORICAL_COMPATIBLE / UNKNOWN
RAW context required: YES / NO
Adjacent control required: YES / NO
```

If a value is not directly supported, choose the weaker state.

---

## 9. Adjacent controls

Maximum: nearest previous + nearest next.

```text
Previous control: <observation/ref / NONE>
Relation: <bounded description / UNAVAILABLE>

Next control: <observation/ref / NONE>
Relation: <bounded description / UNAVAILABLE>
```

Adjacent controls retain independent observation identity.
Never merge their fields into the primary observation.

---

## 10. Forensic review checklist

Before assigning the final repository classification, verify as applicable:

```text
[ ] Primary observation identity is coherent and not mixed across turns.
[ ] Binding/currentness was checked and weak states were preserved.
[ ] Full diagnostic was inspected when the compact evidence was insufficient.
[ ] RAW intent/output/state was inspected when required by the specimen.
[ ] Nearest useful good/bad control was checked when classification depends on comparison.
[ ] Existing owner/reason contracts were used instead of new interpretation vocabulary.
[ ] Provider/cache/external causality was not inferred without authoritative evidence.
[ ] SimCore-local timing was separated from model/provider/gateway wait.
[ ] No raw unbounded body was copied into durable memory unless minimally necessary under existing evidence policy.
[ ] Existing related WATCH/debt/evidence documents were checked for recurrence or prior classification.
```

If a required review source is unavailable, record that limitation explicitly instead of completing the classification by guess.

---

## 11. Classification handoff

The incoming S-04 packet, if present, must still be treated as:

```text
Classification: CLASSIFICATION_PENDING
Repository disposition: REVIEW_REQUIRED
Blocker status: NOT_ASSESSED
```

Only after the forensic review above may this repository template assign:

```text
Final classification: WATCH / DEFER / FIX / BLOCKER
Runtime correctness defect established: YES / NO / UNKNOWN
Current work blocker: YES / NO / UNKNOWN
M2 blocker: YES / NO / NOT_APPLICABLE / UNKNOWN
Reason for classification: <bounded reviewed rationale>
Evidence ceiling / remaining unknowns: <bounded list>
```

Do not use `PASS` here as an anomaly disposition. Healthy/control evidence should be preserved under the relevant evidence/control document rather than pretending an anomaly classification was required.

---

## 12. Repository preservation destination

Select the durable-memory destination after classification.

```text
Dedicated evidence/watch document: <path>
Deferred ledger update required: YES / NO
Current development update required: YES / NO
Roadmap/architecture update required: YES / NO
Evidence Index update required: YES / NO
Natural Evidence Corpus update required: YES / NO
Fixture candidate review required: YES / NO
Related issue/PR/evidence refs: <refs>
```

Canonical rule:

```text
meaningful live anomaly/control
→ preserve in dedicated repo evidence/watch document
→ classification lives there
→ update broader authorities only when the reviewed classification actually requires it
```

This template is not itself a substitute for the dedicated evidence/watch document when the specimen is meaningful enough to preserve.

---

## 13. Final reviewer summary

Keep this bounded and evidence-based.

```text
Observed:
- <directly supported fact>

Not established:
- <unknown / unsupported causal claim>

Classification:
- <WATCH / DEFER / FIX / BLOCKER>

Next action:
- <bounded repo/runtime action or NONE>
```

---

## 14. Hard boundaries

This template must never become:

```text
runtime packet generator
runtime schema/config
GitHub/repository writer
incident auto-classifier
fixture generator
provider/cache inference engine
second diagnostic authority
second evidence authority
raw-body archive
```

Completing this template does not change the S-04 runtime implementation state.

Canonical parent state after this artifact exists:

```text
S-04 DESIGN FROZEN
DOC APPLY CLASS = DOC_APPLIED
R_PREP_NON_RUNTIME = COMPLETE
RUNTIME IMPLEMENTATION = PARKED FOR STABILIZATION
```

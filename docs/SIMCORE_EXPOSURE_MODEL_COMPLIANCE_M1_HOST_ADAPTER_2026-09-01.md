# SimCore Exposure Model Compliance M1 Host Adapter — 2026-09-01

Date: 2026-09-01 KST

Status: **EVAL-ONLY HOST ADAPTER STATIC IMPLEMENTATION COMPLETE · MOCK-HOST REGRESSION PASS · TARGET HOST STILL UNPROVEN · NO MODEL RUN EXECUTED · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · M1 MODEL COMPLIANCE · TEMPORARY RisuAI API v3 HOST ADAPTER · NO PRODUCTION IMPLEMENTATION AUTHORITY**

Related authority/evidence:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS_2026-09-01.md
docs/SIMCORE_EXPOSURE_MODEL_COMPLIANCE_M1_EXECUTION_PREP_2026-09-01.md
docs/REPOSITORY_COMMON_RULES.md
```

Artifacts:

```text
products/simcore/tooling/exposure-model-compliance-m1-host-adapter.js
products/simcore/tooling/exposure-model-compliance-m1-host-adapter.test.mjs
```

The adapter is evaluation tooling only. It is not copied to `release-simcore`, is not part of `plugins/simcore/latest.js` or `install.js`, and grants no production implementation authority.

---

## 1. Purpose

The M1 prep froze the host question:

```text
Can the target RisuAI host materialize B0 and E6
without changing production SimCore,
without rewriting history or saved prompts,
with comparable request/model/output evidence,
and with reliable cleanup?
```

This transaction implements the narrowest public-API adapter for that test.

```text
STATIC ADAPTER
!= TARGET HOST PROOF
!= M1 MODEL EVIDENCE
!= PRODUCTION IMPLEMENTATION
```

---

## 2. Production authority

Unchanged:

```text
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release branch  = release-simcore
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

Exact production insertion anchor re-read:

```text
outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1
```

E6 is inserted immediately after this line, before existing optional new-source guidance.

---

## 3. Fresh RisuAI host-source findings

Fresh upstream source:

```text
repo   = kwaroran/Risuai
commit = ffabb06a386f1aee13217e5ca3c4268a35edb421
```

Public API v3 provides the exact surfaces used here:

```text
addRisuReplacer / removeRisuReplacer
registerBodyIntercepter / unregisterBodyIntercepter
addRisuChatListener / removeRisuChatListener
registerSetting / unregisterUIPart
onUnload
requestPluginPermission('replacer')
```

No private/internal RisuAI API is used.

### Request-stage correction

Exact upstream `requestChatData(...)` order is:

```text
already-built arg.formated
→ beforeRequest replacers
→ RisuAI request trigger
→ requestChatDataMain
→ provider/model reformater
→ provider request
```

Therefore:

```text
beforeRequest messages
!= provider-final request
```

Classification:

```text
FIX · BEFORE_REQUEST_STAGE_OVERCLAIM
```

Bounded meanings used from now on:

```text
flattenedMessageFingerprint
= target-host message-array fingerprint at beforeRequest stage

actualHostRequestFingerprint
= later provider request-body fingerprint when public body interception observes it
```

This document supersedes prior wording that described the `beforeRequest` array itself as byte-exact provider-final evidence.

---

## 4. RCR-D11 effect selection

The adapter deliberately does not use:

```text
production SimCore mutation
saved prompt mutation
chat/history rewrite
pluginStorage/localStorage
database writes
persistent exposure state
new LLM/network call
main-document DOM access
provider replacement
```

It uses:

```text
one beforeRequest replacer
+ one read-only provider-body observer
+ one committed-output listener
+ iframe-local control UI
```

The body interceptor returns the same body object. Its only role is proving whether the candidate survives downstream host processing.

---

## 5. RCR-D12 flow

```text
operator selects one M1 row
→ arm(runId, B0|E6, syntheticScenarioFingerprint)
→ settings/reference hashes captured
→ fixture request sent
→ production SimCore ordinary request work
→ eval beforeRequest adapter

B0:
  exact anchor required
  E6 absent required
  SAME messages object returned

E6:
  exact anchor required
  E6 absent required
  affected message cloned
  exact six lines inserted once

→ beforeRequest input/output hashes
→ later RisuAI request trigger/provider formatting
→ read-only provider-body hash when observable
→ normal model generation
→ committed-output listener
→ bounded in-memory receipt
→ auto-disarm
```

No receipt becomes semantic authority.

---

## 6. One-shot arming

Default:

```text
activeRun = null
candidate effect = OFF
```

Arm requires:

```text
runId
condition = B0 | E6
expectedSyntheticScenarioFingerprint = 64-hex SHA-256
```

Only one active run is allowed.

After one committed output:

```text
receipt finalized
activeRun = null
```

A loaded adapter therefore does not silently apply E6 to ordinary chat.

---

## 7. B0 contract

B0 requires:

```text
unique exact system anchor
all six E6 lines absent
```

Then:

```text
return messages
```

The exact array object is returned without clone or mutation.

The regression requires:

```text
beforeRequestInputFingerprint
==
flattenedMessageFingerprint
```

Missing/ambiguous anchor or unexpected E6 text invalidates the run.

---

## 8. E6 contract

E6:

1. requires one exact system anchor;
2. requires zero pre-existing E6 lines;
3. shallow-clones the array;
4. clones only the anchor message;
5. preserves LF/CRLF;
6. inserts the six frozen lines immediately after the anchor;
7. verifies every frozen line appears exactly once;
8. leaves the input messages unchanged.

Frozen hash:

```text
3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc
```

The adapter recomputes this hash before arming.

---

## 9. Retry / collision contract

Same request fingerprint while active:

```text
same-run retry
→ same B0/E6 condition applied again
→ invocation count increments
```

This prevents a retry from silently changing E6 into B0.

Different request fingerprint while active:

```text
MULTI_REQUEST_COLLISION
→ run INVALID
→ new request returned unchanged
```

No unrelated request inherits an armed candidate.

---

## 10. Provider-boundary observer

`beforeRequest` is not provider-final, so a second public observer is necessary for D13 boundary evidence.

While disarmed:

```text
body → same body
no capture
```

While the target run is active:

```text
body
→ stable serialization
→ SHA-256 only
→ same body object returned
```

Raw request body is not retained.

Captured metadata:

```text
actualHostRequestFingerprint
provider body capture count
body.model when exposed
six-line visibility vector
```

Expected candidate visibility:

```text
B0 = 0
E6 = 6
```

If no body is observable:

```text
providerPropagationStatus = NOT_OBSERVED
actualHostRequestFingerprint = null
```

No provider-final evidence is invented.

---

## 11. Settings/reference/model capture

At arm time, the adapter hashes the API-v3-exposed settings subset:

```text
temperature
maxContext
maxResponse
frequencyPenalty
PresensePenalty
seperateModelsForAxModels
seperateModels
```

It also hashes a top-level character reference projection excluding obvious conversation/runtime containers:

```text
chat
chats
message
messages
scriptstate
```

These hashes are eval comparison metadata, not mutable truth.

Model identifier order:

```text
provider body.model
→ committed output generationInfo model-like field
→ null
```

UNKNOWN stays UNKNOWN.

---

## 12. Output evidence

The public committed-output listener captures the generated output snapshot.

Recorded:

```text
generatedOutput
outputFingerprint
request-stage-to-committed-output elapsed time
```

The adapter does not write the snapshot back to chat and does not grade semantics.

```text
outputStructuralStatus = NOT_EVALUATED_BY_ADAPTER
```

Blind review remains owned by the frozen compliance protocol.

---

## 13. Receipt / persistence boundary

A completed in-memory receipt contains bounded identity, request-stage, provider-observer, model/settings/reference and output evidence.

Receipt history is capped at 8 rows.

The adapter writes nothing to:

```text
pluginStorage
localStorage
chat
database
SimCore SnapshotStore
release artifact
```

The operator can later copy required receipts into the repository-owned evidence workflow.

---

## 14. Cleanup

`onUnload` explicitly removes:

```text
beforeRequest replacer
body interceptor
output listener
settings UI part
```

and disarms any active run.

No polling, background worker, persistent mailbox, or hidden semantic state is added.

---

## 15. Static regression

Author-time Node regression executed against the exact authored plugin file using a mock of the current public API-v3 surface.

Result:

```text
exposure-model-compliance-m1-host-adapter: PASS
```

Coverage includes:

```text
public host registrations
default DISARMED
candidate hash
B0 same-object identity
B0 fingerprint equality
E6 input immutability
exact six-line insertion
anchor ordering
new-source ordering preservation
same-input retry
retry evidence
provider-body propagation mock
multi-request collision fail-closed
pre-existing candidate fail-closed
missing anchor fail-closed
disarmed identity
output receipt
bounded fingerprints
unload cleanup
```

This is mock-host evidence only.

---

## 16. RCR-D13 integration edges

Explicitly validated:

```text
frozen E6 bytes ↔ candidate hash
production provenance line ↔ insertion anchor
B0 ↔ identity return
E6 ↔ exact six-line insertion
beforeRequest input ↔ beforeRequest output hash
E6 insertion ↔ provider-body visibility when observable
provider body ↔ actualHostRequestFingerprint
committed output ↔ receipt
active run ↔ one scenario
unload ↔ effect cleanup
```

The target-host preflight must repeat runtime-dependent edges.

---

## 17. Current disposition

Static state advanced from:

```text
HOST ADAPTER NOT IMPLEMENTED
```

to:

```text
HOST ADAPTER STATICALLY IMPLEMENTED
```

But remains:

```text
HOLD_HOST_PROBE_REQUIRED
```

because the real installation has not yet proven:

```text
permission
registration order relative to SimCore
anchor visibility
B0 identity
E6 insertion
downstream provider propagation
chosen-provider body interception
model/settings/output capture
fresh fixture isolation
real unload cleanup
```

No M1 generation is authorized by this static PASS.

---

## 18. Next target-host preflight

Minimum probes:

```text
P1 adapter loads + replacer permission
P2 disarmed request remains identity
P3 armed B0 observes exactly one production anchor
P4 armed E6 inserts exactly six lines
P5 E6 propagation reaches provider body, or provider-final visibility is explicitly unavailable
P6 output listener captures committed output
P7 one run auto-disarms
P8 unload removes effects
P9 production SimCore/history/prompt preset/persistent semantic state unchanged
```

If P3 fails, do not guess another anchor.

If P5 is unavailable, the protocol must explicitly decide whether beforeRequest-stage evidence is sufficient or a different bounded observer is needed.

---

## 19. WATCH / FIX / BLOCKER

```text
FIX
  BEFORE_REQUEST_STAGE_OVERCLAIM
  → CLOSED by exact-source stage distinction in this document

WATCH
  TARGET_HOST_REPLACER_ORDER
  PROVIDER_BODY_INTERCEPTOR_COVERAGE
  TEMPORARY_PLUGIN_INSTALLATION_IS_HOST_CONFIGURATION

BLOCKER if true
  CANDIDATE_CANNOT_BE_REQUEST_LOCAL
  ANCHOR_NOT_OBSERVABLE
```

---

## 20. Production / S7 boundary

```text
release-simcore              unchanged
plugins/simcore/latest.js    unchanged
plugins/simcore/install.js   unchanged
production Prompt bytes      unchanged
persistent schema            unchanged
history                       unchanged
Lineage/Handoff/Evidence     unchanged
Community/Reaction           unchanged
S7                            unchanged
P13                           not created
v0.70.3 scope                 unchanged
```

Final classification:

```text
M1 HOST ADAPTER SOURCE                  COMPLETE
PUBLIC API v3 SURFACE                  VERIFIED IN UPSTREAM SOURCE
B0 STATIC REGRESSION                    PASS
E6 STATIC REGRESSION                    PASS
RETRY/COLLISION STATIC REGRESSION       PASS
PROVIDER PROPAGATION MOCK REGRESSION    PASS
UNLOAD CLEANUP MOCK REGRESSION          PASS

TARGET HOST PREFLIGHT                   PENDING
M1 24-GENERATION SMOKE                  NOT RUN
M2 72-GENERATION EVIDENCE               NOT RUN
PRODUCTION IMPLEMENTATION               NOT AUTHORIZED
```

Next:

```text
EXPOSURE_MODEL_COMPLIANCE_M1_TARGET_HOST_PREFLIGHT
```

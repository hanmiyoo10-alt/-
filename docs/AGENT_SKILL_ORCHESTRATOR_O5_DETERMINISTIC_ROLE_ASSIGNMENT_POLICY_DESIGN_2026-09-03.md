# Agent Skill Orchestrator O5 Deterministic Role Assignment & Budget Policy Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · POLICY IMPLEMENTATION MAY BE INERT · ASSIGNMENT ACTIVATION BLOCKED · ZERO MODEL CALLS · NO O6 ENTRY**

Tracking authority: issue #1120.

Fresh design baseline: `main@4f9a79299f1701906b4a399a8d4bd39310ebbb0a`.

## 1. Purpose

O5 freezes the deterministic policy that will eventually convert comparable O4 benchmark evidence into role/model assignments and a bounded compute policy.

O5 does **not** manufacture assignment evidence. It does not turn diagnostic replays into independent capability samples. It does not assign a role merely because one model produced a better-looking row on one retrospective case.

The initial O5 implementation may therefore be fully functional while returning `NO_ASSIGNMENT` for every role until the evidence gates below are satisfied.

## 2. Current evidence boundary

The current repository has a successful O4-E Scout authority/ref schema-hardening replay:

- evaluated target: `6b6dcb8104f6107067ea2766b44bbec999fedaa3`;
- request commit: `83398223824313fe68ace1269f6daf9b31ff0b8e`;
- workflow run: `33747002415`, attempt 1 only, SUCCESS;
- matrix SHA256: `2642b6ffd137d3ac1223d5d0b6c4a75ac5b70a4c7eb7624cd8a377224fbdcfeb`;
- response-schema SHA256: `255ca963817f628a550dc932860b7d4518aab1e1439dd3f4e71b1bcbf2c4939e`;
- summary SHA256: `3be1904c965453795678641d94a52d2a984e7b21d7b4b9d8841558b1017c3eea`;
- Qwen and Ministral both completed with parse-valid/contract-valid terminal rows;
- hosted AI calls: 0.

That replay proves the current Scout generation hardening, but it reuses the same historical capability case. It is marked diagnostic-only and **cannot count as an independent assignment sample**.

Current assignment activation state:

- Scout: `NO_ASSIGNMENT / INSUFFICIENT_INDEPENDENT_CASES`;
- Mapper: `NO_ASSIGNMENT / NO_COMPARABLE_O4_EVIDENCE`;
- Critic: `NO_ASSIGNMENT / NO_COMPARABLE_O4_EVIDENCE`;
- Synthesizer: `NO_ASSIGNMENT / NO_COMPARABLE_O4_EVIDENCE`.

O4-C/O4-D historical results remain immutable evidence and are not rewritten or silently reclassified by O5.

## 3. Assignment unit

Assignment is role-local:

```text
role -> one exact enabled model profile
```

Roles are:

- `scout`
- `mapper`
- `critic`
- `synthesizer`

One role may eventually reach `FROZEN_ASSIGNMENT` while another remains `NO_ASSIGNMENT`. A complete O6 standard orchestration is blocked until every role required by the frozen O6 execution plan has a valid frozen assignment.

## 4. Assignment evidence snapshot

O5 consumes a deterministic, derived assignment-evidence snapshot. It does not read free-form issue text and does not ask a model to judge another model.

Each role/model entry must bind at minimum:

- O4 benchmark schema version;
- scoring policy id and SHA256;
- role contract id;
- current generation/response-schema identity required by that role measurement;
- exact model profile id/family/repository/revision/file/SHA256;
- exact retrospective case ids and versions;
- exact fixture/evidence/prompt digests for each case;
- ordered contributing result SHA256 values;
- terminal execution status and parse/contract validity;
- role-specific raw metric numerators/denominators/counts;
- telemetry used by a frozen runtime tie-break;
- explicit `assignment_eligible` classification and basis.

The snapshot itself receives a canonical SHA256 and is immutable input to one assignment policy version.

## 5. Evidence eligibility

A cell may enter assignment evidence only when all of these hold:

1. it is retrospective/consumed evidence, not a prospective held-out;
2. it is not marked `diagnostic_replay_only`;
3. its benchmark/scoring/role-contract identities match the frozen policy requirements;
4. its model profile is still present and enabled in `models/registry.json`;
5. model artifact revision/file/SHA256 match the registry exactly;
6. execution surface is `LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS`;
7. access remains `public_unauthenticated_https`;
8. the case/fixture/evidence/prompt provenance is complete and hash-linked;
9. a terminal result exists for the frozen measurement identity;
10. duplicate role/model/case identities are rejected.

Historical failure/incomplete/invalid evidence is never deleted. It remains attached to the measurement history. A newer measurement identity may be eligible only when its design explicitly justifies the new contract/runtime identity; it never rewrites the old row.

## 6. Minimum comparable evidence gate

Before one role can activate any assignment, O5 v1 requires:

- at least **two distinct assignment-eligible retrospective case ids** for that role;
- at least **two eligible model profiles from different model families**;
- the exact same paired case set for every compared candidate;
- every paired case measured under compatible scoring/contract/generation identities;
- no missing terminal cell for the paired comparison set.

Two cases is the minimum guard against assigning from a single-case specialization. This is a minimum, not a claim of broad generality.

A diagnostic replay of one of those cases does not increase the distinct-case count.

If the gate is not met, verdict is `NO_ASSIGNMENT` with a deterministic reason code. Quality or latency comparison does not run.

## 7. Quality thresholds before latency

O5 v1 uses pre-frozen safety/completeness floors, not a learned or post-hoc tuned weighted score.

Universal rules for assignment-eligible cells:

- execution status must be `COMPLETED`;
- parse validity must be true;
- contract validity must be true;
- invalid source-ref count must be zero where the role emits refs;
- undefined required ratios remain `null` and fail the threshold rather than becoming 0 or 10000.

General ratio floors:

- precision-like quality ratios: **>= 9000 basis points**;
- ordinary material-recall ratios: **>= 5000 basis points**;
- safety-preservation ratios: **10000 basis points**;
- role-specific forbidden/overclaim/optimism violation counts required below: **0**.

These thresholds are model-family-neutral and case-neutral. They exist to prioritize grounded precision and safety preservation while preventing trivial tiny outputs from passing solely on precision.

### Scout threshold set

Required:

- source-selection precision >= 9000;
- source-selection recall >= 5000;
- authority precision >= 9000;
- authority recall >= 5000;
- invalid refs = 0;
- authority overclaims = 0.

### Mapper threshold set

Required:

- owner precision >= 9000;
- owner recall >= 5000;
- edge precision >= 9000;
- edge recall >= 5000;
- grounding precision >= 9000;
- false edges = 0;
- invalid refs = 0.

### Critic threshold set

Required:

- boundary precision >= 9000;
- boundary recall >= 5000;
- blocker precision >= 9000;
- blocker recall >= 5000;
- required-uncertainty preservation recall = 10000;
- false blockers = 0;
- optimism violations = 0;
- invalid refs = 0.

### Synthesizer threshold set

Required:

- required-record preservation recall = 10000;
- required blocker/conflict preservation recall = 10000;
- compact completion succeeds for every paired case;
- forbidden new claims = 0;
- invalid refs = 0 when refs are present.

`optional_useful_selection_recall` and `excess_optional_selection_count` are comparison metrics after the required preservation gates; they cannot compensate for a failed required-preservation gate.

## 8. Deterministic comparison, no weighted composite

Only candidates that pass every threshold enter comparison.

O5 v1 intentionally does not compute one weighted quality score.

Comparison is lexicographic on a pre-frozen role-specific quality vector, using micro-aggregated raw numerators/denominators across the exact paired case set.

### Scout vector

1. authority precision, higher better;
2. source-selection precision, higher better;
3. authority recall, higher better;
4. source-selection recall, higher better.

### Mapper vector

1. grounding precision, higher better;
2. edge precision, higher better;
3. owner precision, higher better;
4. edge recall, higher better;
5. owner recall, higher better.

### Critic vector

1. required-uncertainty preservation recall, higher better;
2. boundary precision, higher better;
3. blocker precision, higher better;
4. boundary recall, higher better;
5. blocker recall, higher better.

### Synthesizer vector

1. required blocker/conflict preservation recall, higher better;
2. required-record preservation recall, higher better;
3. compact-completion rate, higher better;
4. optional-useful selection recall, higher better;
5. excess optional selection count, lower better.

The first unequal component decides quality ordering.

## 9. Runtime tie-break

Latency may be consulted only after candidates:

- pass all quality thresholds; and
- are exactly tied on the entire frozen quality vector.

Runtime comparison uses total measured `wall_clock_ms` across the same paired case set, lower better. `null` runtime telemetry cannot beat a concrete value.

If candidates remain tied after runtime comparison, O5 returns:

`NO_ASSIGNMENT / EXACT_TIE`

O5 does not break an exact tie by profile name, family reputation, artifact size, or arbitrary lexical order.

## 10. Family diversity policy

O5 v1 applies **no diversity bonus**.

The O4 role-isolated matrix can compare role capability, but it cannot by itself prove that assigning different families to Mapper and Critic improves the combined orchestration.

Family-diversity preference may be enabled only by a future policy-version change after a separately frozen interaction benchmark demonstrates a measurable benefit without weakening any quality threshold. Until then, each role is assigned independently.

## 11. Runtime/model eligibility gate

A selected profile must remain eligible at assignment materialization time:

- `enabled: true`;
- exact registry artifact revision/file/SHA256;
- verified license metadata;
- public unauthenticated HTTPS access;
- zero-hosted-AI execution surface;
- compatible pinned llama.cpp runtime.

A benchmark score cannot re-enable a disabled or otherwise ineligible model.

Eligibility failure produces `NO_ASSIGNMENT / MODEL_INELIGIBLE` and does not silently choose a lower-ranked model unless that lower-ranked model independently passes the full evidence/quality comparison under the same policy snapshot.

## 12. O5 v1 generation/runtime freeze

The initial policy preserves the already-proven local deterministic generation profile:

```json
{
  "temperature": 0,
  "seed": 42,
  "n_predict": 768,
  "ctx_size": 16384,
  "threads": 4,
  "gpu_layers": 0
}
```

Pinned llama.cpp identity remains:

- release: `b10516`;
- source digest: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`;
- artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`;
- artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`.

Benchmark/request timeout for O5/O6 local CPU role calls is frozen at **1800 seconds per launched role call** unless a later policy version changes it before any new prospective output.

## 13. Compute budget and escalation policy

O5 v1 standard lane:

- Scout: at most 1 model call;
- Mapper: at most 1 model call;
- Critic: at most 1 model call;
- Synthesizer: at most 1 model call;
- total semantic role calls: at most 4;
- Mapper/Critic may execute concurrently after required Scout evidence is valid;
- hosted AI calls: 0;
- automatic semantic reruns: 0;
- escalation model calls: **disabled in v1**.

If a required role has no frozen assignment, fails, truncates, or leaves a material unresolved blocker/conflict, deterministic control returns `PARTIAL`, `UNKNOWN`, `CONFLICT`, `EXECUTION_INCOMPLETE`, or `INVALID` as appropriate. The budget does not authorize an extra model to erase uncertainty.

Pre-inference infrastructure correction remains governed by the O6 prospective protocol: it is allowed only before meaningful model output and must preserve the frozen semantic fixture, assignments, contracts, assertions, generation parameters, and evidence identities.

## 14. Assignment snapshot

A role assignment snapshot must contain:

- policy id/version and canonical policy SHA256;
- assignment-evidence snapshot SHA256;
- target role;
- assignment status;
- deterministic reason code;
- exact compared candidate profile ids;
- exact paired case ids/versions;
- threshold results per candidate;
- ordered quality-vector values per passing candidate;
- runtime tie-break inputs when reached;
- selected exact model profile id/family/artifact SHA only when status is `FROZEN_ASSIGNMENT`;
- frozen generation profile SHA;
- frozen budget profile SHA;
- canonical assignment snapshot SHA256.

Forbidden fields include model-authored confidence, prose recommendation, brand preference, majority vote, mutable `latest` references, or unbound URLs.

## 15. Reason codes

At minimum:

- `ASSIGNED`
- `INSUFFICIENT_INDEPENDENT_CASES`
- `INSUFFICIENT_MODEL_FAMILIES`
- `MISSING_PAIRED_CELL`
- `INCOMPATIBLE_EVIDENCE_IDENTITY`
- `MODEL_INELIGIBLE`
- `THRESHOLD_FAILURE`
- `UNDEFINED_REQUIRED_METRIC`
- `EXACT_TIE`
- `EVIDENCE_CONFLICT`
- `NO_COMPARABLE_O4_EVIDENCE`

Unknown or contradictory evidence fails closed.

## 16. Current materialization rule

The first O5 implementation must **not** create active role/model bindings from current O4-E metrics.

It may add:

- closed O5 policy/evidence/assignment schemas;
- deterministic policy data;
- assignment/evidence validators;
- deterministic assignment engine;
- synthetic tests proving threshold, pairing, tie, eligibility, provenance, and no-assignment behavior.

It must not add a current `FROZEN_ASSIGNMENT` record for Scout/Mapper/Critic/Synthesizer while the evidence gates remain unmet.

## 17. Additional O4 evidence required before activation

### Scout

At least two **distinct** assignment-eligible retrospective Scout cases, each measured for both Qwen 2.5 3B and Ministral 3 3B under the current evidence-aware generation contract and frozen O4 scoring policy.

The service-tier O4-E replay does not count toward the two-case minimum because it is diagnostic-only.

### Mapper

At least two distinct assignment-eligible retrospective Mapper cases, paired across at least two eligible model families.

### Critic

At least two distinct assignment-eligible retrospective Critic cases, paired across at least two eligible model families.

### Synthesizer

At least two distinct assignment-eligible retrospective Synthesizer cases, paired across at least two eligible model families.

Evidence expansion returns to O4 and is sliced role-by-role/case-by-case. It does not loosen O5 policy after observing new outputs.

## 18. O6 entry gate

O6 is blocked until:

1. every role required by the prospective execution plan has `FROZEN_ASSIGNMENT` under one O5 policy version;
2. assignments bind exact model/profile/artifact digests;
3. generation parameters and standard compute budget are frozen;
4. no required role remains `NO_ASSIGNMENT`;
5. the brand-new O6 held-out source snapshot, bounded context, assertions, judge rules, and single-model comparison are frozen **after** O5 assignments and before any O6 model output.

O5 policy implementation alone is not O6 authorization.

## 19. Tests required for O5 implementation

Focused regressions must prove at minimum:

- canonical policy/evidence/assignment digest reproducibility;
- closed schemas reject unknown winner/recommendation/confidence fields;
- diagnostic replay rows are excluded from independent case count;
- fewer than two distinct cases -> `NO_ASSIGNMENT`;
- fewer than two eligible families -> `NO_ASSIGNMENT`;
- non-paired case sets -> `NO_ASSIGNMENT`;
- incompatible scoring/contract/generation identities -> fail closed;
- disabled/ineligible registry profile cannot be selected;
- null required ratio -> threshold failure, not 0/10000 substitution;
- precision/recall floors exact at boundaries;
- safety preservation must be exactly 10000 where required;
- violation counts must be zero;
- weighted composite score is absent;
- latency is ignored until exact quality-vector tie;
- exact quality+runtime tie -> `NO_ASSIGNMENT / EXACT_TIE`;
- no family-diversity bonus in v1;
- current real O4-E provenance is classified diagnostic-only and cannot activate Scout;
- no active role assignments are materialized from current evidence;
- hosted AI budget is zero;
- role-call budget is at most four with no semantic retry/escalation.

Existing Agent Skills CI and repository required CI remain mandatory.

## 20. Non-goals

O5 v1 does not:

- run a model;
- create new O4 benchmark outputs;
- reinterpret O4-C/O4-D/O4-E history;
- choose a family from one diagnostic case;
- enable dynamic online model selection;
- tune policy thresholds after seeing prospective results;
- enable family-diversity heuristics without measured interaction evidence;
- change Local Usage Dashboard Product/Plugin/Engine/Manager/release bytes;
- change `release-usage-dashboard`;
- change `PILOT_VALIDATED_SCOPES`;
- change device state;
- authorize O6 while any required role lacks assignment.

## 21. Rollback

O5 policy is additive and analysis-only.

Rollback is:

- disable/remove the O5 assignment engine/policy files;
- retain O4 benchmark evidence unchanged;
- retain O2/O3 current single-model mechanical baseline;
- retain existing deterministic router/evidence/budget/judge controls;
- no plugin/release/device rollback is required because O5 changes none of those bytes.

## 22. Exit for the policy slice

The **O5 policy implementation slice** may exit when:

- this design is merged from an exact reviewed/tested head;
- closed schemas/policy/engine/tests are merged from a separate exact tested head;
- full Agent Skills/required CI is green;
- main read-back proves no active assignment was manufactured;
- current real evidence deterministically returns `NO_ASSIGNMENT` for all roles for the documented reasons;
- zero model calls and zero hosted AI calls occurred.

That closes only the deterministic policy slice.

**O5 assignment activation remains blocked** until the additional independent O4 role evidence in section 17 exists and produces frozen assignments under this unchanged policy version.

## 23. Next legitimate step

After the O5 policy slice lands, return to O4 evidence expansion rather than entering O6.

The first evidence-expansion design should freeze one new assignment-eligible retrospective role/case slice without changing O5 thresholds. It should preserve the existing one-family-at-a-time / exact-model-artifact / zero-hosted-AI / terminal-evidence discipline.

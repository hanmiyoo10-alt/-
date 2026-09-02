# Agent Skill Orchestrator O2-B Role Contracts Design — 2026-09-02

## Status

DESIGN_FROZEN_BEFORE_IMPLEMENTATION

O2-A Scout v3 is the stable retrospective baseline. Its fourth frozen diagnostic completed mechanically with exact grounded authority selections and deterministic status projection. O2-B therefore moves to the remaining model roles instead of further tuning Scout.

This slice is contract/control-plane only. It adds no new model call, workflow, model family, generation budget, product/runtime/release/device change, or validated-scope promotion.

## Baseline

- implementation base: `86f6d9b043c8d0821ab3482dddcb75e30b63d1e9`
- existing implemented role: Scout only
- existing shared typed schemas already cover Mapper/Critic/Synthesizer RoleArtifacts and records
- `roles/metadata.json` remains authority for role purpose and allowed typed-record families
- existing single-model Agent Skill evaluation and O2-A Scout remain regression baselines

## Cross-role rule

A small model proposes bounded semantic candidates; deterministic code owns structural validity, source-ref validity, status projection where mechanically derivable, upstream-preservation rules, and final verdict authority.

No O2-B model-visible contract contains a final verdict or confidence field.

## Mapper compact wire v1

Purpose: propose semantic owners and producer-to-consumer edges from supplied bounded evidence and validated Scout selections.

Wire:

```json
{
  "o": [
    {"v": "semantic owner", "r": ["S1@L4"]}
  ],
  "e": [
    {"f": "producer", "t": "consumer", "r": ["S1@L4", "S2@L8"]}
  ]
}
```

Rules:

- top-level fields are exactly `o` and `e`;
- owner record fields are exactly `v`,`r`;
- edge record fields are exactly `f`,`t`,`r`;
- every non-empty record requires at least one known source ref;
- owner/from/to values are short opaque semantic labels, not release/device verdict prose;
- duplicate owners and duplicate `(from,to)` edges fail closed;
- no status field is model-visible;
- deterministic projection of grounded owner claims and edges is `SUPPORTED_LIKELY`, because semantic ownership/flow is inferred rather than directly observed;
- exact empty `{"o":[],"e":[]}` is valid and later projects to explicit mapper uncertainty/blocking state rather than fabricated completion.

Initial ceilings:

- max owners: 8
- max edges: 12
- max refs per record: 3
- max UTF-8 bytes per value: 96
- max total wire: 2400 bytes

Forbidden Mapper output:

- final verdict/confidence;
- release truth or device truth;
- mutation/patch instructions;
- raw Scout prose;
- self-authored `DIRECT`, `UNKNOWN`, `CONFLICT`, or `SUPPORTED_LIKELY` status literals.

## Critic compact wire v1

Purpose: identify bounded missing-risk/preservation surfaces and challenge already validated Mapper output without silently fixing it.

Wire:

```json
{
  "b": [
    {"k": "request_identity", "v": "identity boundary", "r": ["S2@L3"]}
  ],
  "q": [
    {"i": "claim-mapper-001", "k": "missing_evidence", "v": "owner evidence incomplete", "r": ["S1@L4"]}
  ],
  "u": [
    {"k": "unknown", "v": "release impact unresolved", "r": []}
  ]
}
```

Rules:

- top-level fields are exactly `b`,`q`,`u`;
- `b` boundary records use only existing Boundary kinds and require grounded refs;
- `q` challenges reference a validated upstream Mapper claim id and use a fixed blocker-kind vocabulary; refs may only cite known evidence;
- `u` unresolved records use fixed blocker-kind vocabulary and may have zero refs when the point is missing evidence/unknown;
- no model-visible status/confidence/verdict;
- Critic output cannot delete or mark resolved any upstream blocker/conflict/UNKNOWN;
- deterministic projection owns RoleArtifact statuses and blocker records;
- challenge targets not present in the validated Mapper artifact fail closed.

Initial ceilings:

- max boundaries: 8
- max challenges: 8
- max unresolved records: 8
- max refs per record: 3
- max UTF-8 bytes per subject/value: 128
- max total wire: 2400 bytes

## Synthesizer compact wire v1

Purpose: select the narrowest useful subset of already validated upstream typed records while mandatory uncertainty/conflict records are preserved mechanically.

The Synthesizer is not allowed to invent new semantic prose in O2-B.

Deterministic code first assigns compact selection ids to validated upstream records, for example `C1`, `E1`, `B1`, `K1`, `X1`. The model sees only the typed record projection plus those ids, never raw upstream response text.

Wire:

```json
{
  "s": ["C1", "E1", "B1"]
}
```

Rules:

- top-level field is exactly `s`;
- ids must come from the supplied validated upstream record index;
- duplicate ids fail closed;
- no new claims/edges/boundaries/blockers/conflicts may be authored in the wire;
- all upstream records with `UNKNOWN` or `CONFLICT` status, all blockers, and all unresolved conflicts are mandatory and are mechanically unioned into the synthesized selection even if omitted by the model;
- a model cannot select an upstream record that was rejected before entering the evidence bus;
- model-visible input contains structured validated records only and excludes `response.txt`, response envelope, chain-of-thought, or arbitrary upstream prose.

Initial ceilings:

- max selectable ids: 32
- max total wire: 1200 bytes

## Prompt/input isolation

Every role prompt builder must be deterministic for identical inputs.

Mapper receives:

- bounded EvidencePackage;
- validated Scout RoleArtifact projection limited to selected source refs/authority records;
- no raw Scout response.

Critic receives:

- bounded EvidencePackage;
- validated Mapper RoleArtifact projection;
- no raw Mapper response.

Synthesizer receives:

- validated typed upstream records with deterministic compact ids;
- unresolved blockers/conflicts;
- source refs already present in those typed records;
- no raw worker response.

## Deterministic validation

All three validators must:

- reject duplicate JSON keys;
- enforce exact object fields and types;
- enforce byte ceilings before and after canonical normalization;
- enforce known source refs;
- enforce role-specific enumerations;
- reject duplicate semantic records;
- reject forbidden top-level verdict/confidence/status fields by exact-field closure;
- produce stable canonical JSON for identical input.

## O2-B implementation boundary

Implement only:

- `role-contracts/mapper.json`
- `role-contracts/critic.json`
- `role-contracts/synthesizer.json`
- deterministic role wire validators / prompt-input builders under `roles/`
- O2-B unit tests.

Do not implement in this PR:

- Mapper/Critic/Synthesizer llama.cpp execution;
- scheduler changes;
- GitHub Actions fan-out;
- role/model benchmark or assignment;
- new model downloads;
- final judge changes;
- PatchPlan/mutation authority;
- product/plugin/release/device changes;
- any new model call.

## Tests required

Mapper:

- valid grounded owner/edge accepted;
- unknown refs, empty refs on grounded records, duplicates, extra fields, status/verdict fields rejected;
- empty result accepted without fabricated semantic completion;
- prompt receives validated Scout typed projection only.

Critic:

- valid boundary/challenge/unresolved candidate accepted;
- invalid boundary/blocker kind rejected;
- challenge to unknown Mapper claim rejected;
- unknown refs rejected;
- no resolution/verdict/status field accepted;
- upstream blocker/conflict/UNKNOWN preservation represented in deterministic input projection.

Synthesizer:

- valid supplied ids accepted;
- unknown/duplicate ids rejected;
- raw prose/new record fields rejected;
- mandatory UNKNOWN/CONFLICT/blocker/unresolved-conflict ids mechanically preserved even if omitted;
- identical typed input produces identical compact id mapping.

Cross-role:

- existing O2-A Scout tests remain unchanged and green;
- no model/runtime/generation/workflow file changes;
- full Agent Skills CI and SimCore Required green before exact-head merge.

## Exit

O2-B contract surface is complete when all three role wires are closed, fail-closed, provenance-compatible with existing shared schemas, raw-prose isolation is tested, and main materialization is verified.

Only after that may a separate execution slice wire these contracts to the already pinned local llama.cpp runtime. No role inference should occur before O2-B is merged and read back from main.

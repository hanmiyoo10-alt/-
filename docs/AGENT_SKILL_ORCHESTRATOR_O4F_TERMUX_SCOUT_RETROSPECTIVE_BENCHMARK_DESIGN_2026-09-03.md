# Agent Skill Orchestrator O4-F Termux Scout Retrospective Benchmark Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · RETROSPECTIVE ONLY · ONE CONSUMED CASE · TWO MODEL FAMILIES · ZERO HOSTED AI · NO O5 POLICY CHANGE · NO ASSIGNMENT ACTIVATION**

Tracking authority: issue #1120.

Fresh design baseline: `main@926da600d9ed70f709c7d657c96d87f3bace8203`.

## 1. Purpose

O4-F creates the first post-O5, assignment-eligible Scout benchmark case without changing the already-frozen O5 policy. It reclassifies the already-consumed Termux Large Doc Editor background-autosave held-out as retrospective benchmark evidence and measures exactly the two already-admitted 3B local model profiles against the same frozen Scout task.

This slice does not activate an O5 assignment. O5 requires at least two distinct paired retrospective cases and two eligible model families for a role. O4-F can contribute at most one such independent Scout case.

## 2. Source-case eligibility

Source case: `termux-large-doc-background-autosave-heldout`.

This case is eligible for retrospective reuse only because:

- its prospective assertions/source snapshot were frozen before its first model output;
- its first execution is already recorded on #1120;
- repository eval metadata now explicitly states that the Termux held-out is retained only as diagnostic/training evidence after prior execution;
- therefore it is consumed and may be reclassified as `RETROSPECTIVE_COMPATIBILITY` for O4 without becoming new prospective proof.

Frozen source snapshot remains exactly:

`main=f01c2ef304656de9254191ec2fb9a2c046642f21`

Historical first-execution provenance remains immutable and is not overwritten:

- original fixture SHA256: `b1de30bb6a3c04a5971cb812fa8412a94103ec9e392e4f704223b0baf0a16542`
- original evidence-context SHA256: `26bf8190d72a62f03e7e2920c4a611ec7710f6d60794e4e18b6c0996db2b2592`
- original request SHA: `0677dc949942b6457276c1b2d71f011f5c35bea6`
- original workflow run: `33530239469`
- original artifact: `9809665051`
- original artifact ZIP SHA256: `c3437bf26f2ff676791d2d21e66c8b929918fa1cc3b35b1d91dfe5009c0c5364`

O4-F does not score or reinterpret the historical plugin-impact-scope answer. It constructs a new role-isolated Scout benchmark fixture from the frozen repository source bytes.

## 3. Frozen evidence package

Materialize only bounded source blocks from the exact Termux snapshot already registered by the zero-credit context profile:

1. `docs/REPO_PROJECT_CATALOG.md` — `plugin:termux-large-doc-editor` registration;
2. `docs/TERMUX_DEVELOPMENT_GUIDELINES.md` — production release remains UNKNOWN plus state-persistence/network boundaries;
3. `plugins/termux/large-doc-editor/README.md` — prototype/not-production boundary, atomic save, external-change fail-closed behavior;
4. `plugins/termux/large-doc-editor/web/app.js` — dirty chunk, `flushChunk`, `saveDocument`, `visibilitychange`;
5. `plugins/termux/large-doc-editor/server.py` — chunk update, `/api/save`, `SOURCE_CHANGED`;
6. `plugins/termux/large-doc-editor/chunk_store.py` — dirty state, source-mtime guard, atomic `os.replace`, clean-after-save;
7. `plugins/termux/large-doc-editor/tests/test_chunk_store.py` — atomic-save and external-change regressions.

All source blocks must be read from `f01c2ef304656de9254191ec2fb9a2c046642f21`. Current HEAD bytes must not substitute for the frozen snapshot.

The O4 evidence builder must create canonical `S#@L#` refs from those frozen bytes and record source path, exact source SHA, line range, authority class, block digest, and package digest. No source may be invented because it appeared in an old model answer.

## 4. Scout expected labels

Typed expected labels are curated from the frozen source bytes before O4-F inference. They may contain only:

- `source_ref` atoms for source blocks materially relevant to current authority/semantic impact discovery;
- `authority` atoms whose authority class is directly supported by the frozen package metadata.

The benchmark must include the production/release UNKNOWN evidence as a relevant source rather than manufacturing a release authority. It must not require the Scout model to invent semantic flow, a patch, autosave timing, retry/debounce policy, module placement, or a release version.

No expected label is copied from either model's old Termux response.

## 5. Frozen benchmark identities

Role: `scout`.

Role contract: current evidence-aware Scout runtime contract. O4-F must bind the response-schema SHA before inference.

Scoring policy: existing `o4a-retrospective-role-benchmark-v1` unchanged.

Models, exactly once each:

1. `qwen2.5-3b-instruct-q4_k_m`
2. `ministral-3-3b-instruct-2512-q4_k_m`

Model repository/revision/file/SHA/access identity must come from the current model registry and be frozen into the matrix before execution.

Runtime/generation remain the currently proven zero-credit llama.cpp identity and deterministic Scout generation profile unless a pre-inference infrastructure-only correction is separately designed and merged. Hosted AI call ceiling is zero.

## 6. Assignment eligibility

An O4-F cell is `assignment_eligible=true` only if all of the following hold:

- measurement is not a diagnostic replay;
- the frozen Termux case/evidence/prompt/schema identities match across both model cells;
- execution status is `COMPLETED`;
- parse and contract validation are true;
- source refs are valid;
- scoring uses the unchanged O4-A policy;
- no semantic rerun has replaced an observed completed model output.

A timeout, invalid contract, infrastructure failure, or incomplete execution is preserved as terminal benchmark evidence and is not converted into an eligible score.

O4-F success does not itself satisfy O5 Scout entry because only one independent case would then exist.

## 7. Workflow and one-shot boundary

Implementation may add a dedicated O4-F request resolver/workflow or a generic bounded retrospective-matrix request path. In either form:

- request commit must add exactly one bounded request record;
- request parent binds the exact evaluated main SHA;
- target source snapshot remains `f01c2ef...` independently of harness HEAD;
- Qwen runs at most once and Ministral at most once;
- hosted AI calls remain zero;
- no automatic retry after meaningful model output;
- artifact upload preserves matrix, frozen inputs, per-cell raw response/result/score/receipt/metadata and summary;
- winner/rank/recommended-model/assignment semantics are forbidden from O4-F artifacts.

## 8. Required tests

Focused mechanical tests must prove at minimum:

- the Termux source-case is consumed/retrospective and not reintroduced as prospective proof;
- all seven source surfaces are frozen to `f01c2ef...`;
- fixture/evidence digests are deterministic and tamper-sensitive;
- expected labels contain no free-form answer text and no model-derived output;
- matrix is exactly two enabled public zero-credit 3B profiles from distinct families;
- response schema is evidence-aware and bound before inference;
- O4-A scoring identity is unchanged;
- request resolver fails closed on wrong branch, extra path, target mismatch, or modified existing request;
- ordinary Agent Skills CI covers the harness without executing local models;
- O5 policy/evidence files are not modified by the pre-inference implementation PR;
- no active assignment is materialized by O4-F setup.

Full Agent Skills regression, Plugin Control Plane observation, and SimCore Required CI remain mandatory before merge.

## 9. Post-run interpretation

After the one-shot artifact is independently read back:

- record every terminal cell exactly as observed;
- if both cells are valid and completed, append them to a new immutable O4 evidence snapshot as one paired, assignment-eligible Scout case;
- run the already-frozen O5 policy against that snapshot;
- expected phase state after one valid O4-F pair remains `Scout=NO_ASSIGNMENT / INSUFFICIENT_INDEPENDENT_CASES` because the second distinct paired case does not yet exist;
- do not alter thresholds, quality ordering, tie-breaks, budgets, or family-diversity rules after seeing O4-F outputs.

A later second independent Scout retrospective case must receive a separate measurement identity and freeze before inference.

## 10. Non-goals

O4-F does not:

- promote `plugin:termux-large-doc-editor` into `PILOT_VALIDATED_SCOPES`;
- claim current Termux production/release authority where the frozen source says UNKNOWN;
- change Termux source/product behavior;
- assign a model to Scout;
- change O5 policy;
- start O6;
- create prospective proof;
- compare Mapper, Critic, or Synthesizer;
- mutate plugin/product/runtime/release/device state.

## 11. Exit

O4-F implementation may begin only from this frozen design. The implementation exits only after exact-head PR CI, merge, main read-back, and one-shot artifact provenance validation. Assignment eligibility is then determined mechanically from the observed result; it is never assumed from workflow success alone.

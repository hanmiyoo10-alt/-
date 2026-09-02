# Agent Skill Orchestrator O4-B Ministral 3 Model Family Smoke Completion — 2026-09-02

Date: 2026-09-02 KST

Status: **PHASE-A SMOKE PASS · PHASE-B REGISTRY ADMISSION IMPLEMENTED · FULL REGRESSION PENDING**

Tracking authority: issue #1120. Acceptance freeze: comment `5509534926`. Pre-registry smoke evidence: comment `5509909477`.

## 1. Frozen candidate

The Phase-A candidate manifest remains immutable and retains its pre-smoke `pending_smoke` marker so its canonical digest and the live receipt remain reproducible.

- profile: `ministral-3-3b-instruct-2512-q4_k_m`
- repository: `mistralai/Ministral-3-3B-Instruct-2512-GGUF`
- revision: `fc774f009f0c62a186f48e870fd6295b36f63779`
- file: `Ministral-3-3B-Instruct-2512-Q4_K_M.gguf`
- size: `2147023008` bytes
- SHA256: `9ed150d4367e68df0ac8e1540f6ddc65b42d0ee26378329d1ecbca60f93fc5f8`
- license: Apache-2.0
- candidate canonical SHA256: `c2a24d9ec9c2659bb9f14aa957088256717e61d5500189f4609da4a8ee03942f`

## 2. Phase-A one-shot smoke evidence

- trigger commit: `1a3f5258d92b3073ca7cc69372f9a602e62ae9c7`
- workflow: `Agent Skill Orchestrator Model Family Smoke`
- run: `33632096087`, attempt 1, conclusion `SUCCESS`
- fresh GitHub-hosted Ubuntu 24.04 runner
- model credential environment: absent
- exact frozen-revision public HTTPS download: PASS
- measured model size/SHA: exact match
- llama.cpp release: `b10516`
- llama source digest: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`
- llama artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`
- CPU threads: 4
- GPU layers: 0
- HTTP status: 200
- structured content: `{"ready": true}`
- finish reason: `stop`
- local model calls: 1
- hosted-AI calls: 0
- receipt SHA256: `45e1769e541149ad8024158d39634a699b6361e8863a1d421babf8097c3a9c4e`
- artifact id: `9847411724`
- artifact ZIP SHA256: `1690e37704394e3b992177594e856f4d14a792e325a4fdcb8cb171ef739fedf1`

Independent read-back recomputed the artifact ZIP digest, receipt canonical digest, prompt digest, response digest, JSON content, HTTP status, and finish reason. All matched the persisted evidence.

## 3. Phase-B admission boundary

After the smoke evidence was recorded in #1120, Phase B admits exactly one additional model profile to `tools/agent-skill-orchestrator/models/registry.json` using only the identity/access/runtime claims proven above.

This admission does **not**:

- modify `standard-cpu-v1`;
- modify `SCOUT_MODEL_PROFILE_ID`;
- assign Ministral to Scout, Mapper, Critic, or Synthesizer;
- create a composite benchmark score, winner, or preferred model;
- add Ministral to the old zero-credit evaluation allowlist;
- modify O2/O3 live workflow behavior;
- modify plugin/product/release/device bytes.

The successful O2/O3 lane remains bound to `qwen2.5-3b-instruct-q4_k_m` until a later explicitly frozen benchmark/assignment decision.

## 4. Required exit checks

O4-B is not complete until the Phase-B head passes full Agent Skills and SimCore Verify/Required CI, merges from the exact tested head, merged-main regression passes, and main read-back confirms:

1. exactly three eligible orchestrator model profiles, including the smoke-qualified Ministral profile;
2. `standard-cpu-v1` remains bound to Qwen2.5 3B;
3. `SCOUT_MODEL_PROFILE_ID` remains Qwen2.5 3B;
4. no capability winner or permanent role assignment was introduced;
5. the Phase-A candidate manifest/receipt evidence remains unchanged.

Only then may #1120 record **O4-B EXIT: PASS** and O4-C freeze its first role-isolated retrospective benchmark slice before any benchmark model calls occur.

# Agent Skill Orchestrator O2-A Scout Conflict Boundary v2 Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

## Triggering evidence

O2-A Scout diagnostic run `33600464703` used request commit `5ee2bba874070c1359cb2f442c8af070ca10146f`, target `f76d9e33685fcc198e87c6763972e9827f4801a1`, Usage Dashboard release authority `82c4f900cf548068d1eada957c982a5d78f1347b`, and artifact `9835005122` (`sha256:5071e813d8e9b121098b8173a35a5c67c5459e2d581b37edf75d638b87588a62`).

The local Qwen2.5-3B call finished with `stop`, produced 73 wire bytes, used exactly one local model call and zero hosted-AI calls, but failed Scout structured validation. The retained response used `s=C` over `guidelines` and `manifest` refs while carrying `v=guidelines,manifest`; v1 required literal `v=conflict` and at least two supplied authority classes.

This exposed two distinct defects: a wire-literal miss and a semantic-role ambiguity. Different authority classes identify different source/authority categories; class diversity alone does not prove that their contents disagree. The deterministic authority layer currently derives OBSERVED/MISSING/UNKNOWN state, while the orchestration roadmap assigns conflict handling to deterministic code rather than Scout inference.

## v2 decision

Scout remains a bounded source-selection / authority-class projection role. It does not infer semantic authority conflict.

`scout-compact-wire-v2` therefore:

- removes `C` from Scout statuses;
- removes `conflict_value` from the Scout role contract;
- permits only `D`, `L`, and `U` Scout statuses;
- requires every non-UNKNOWN authority record to reference evidence from exactly one supplied `authority_class` and to use that exact class as `v`;
- represents multiple relevant authority classes as separate authority records;
- explicitly instructs the model not to compare authority classes or report conflicts;
- preserves UNKNOWN as `s=U`, `v=unknown`, `r=[]`;
- preserves the 2400-byte ceiling, 12-record ceiling, 3-ref ceiling, Qwen2.5-3B model pin, llama.cpp pin, 768-token budget, CPU-only execution, exact source refs, and zero-hosted-AI accounting.

No Mapper/Critic/Synthesizer semantics, deterministic authority resolution, typed bus conflict handling, judge rules, Usage Dashboard product/runtime/release bytes, validated scopes, or device state are changed.

## Mechanical acceptance criteria

Before any third Scout model call:

1. contract identity is `scout-compact-wire-v2` and exposes only `D|L|U`;
2. old `s=C` wire fails closed;
3. one authority record spanning multiple authority classes fails closed;
4. separate authority records for separate classes validate;
5. prompt says class diversity is not conflict evidence and tells Scout not to report conflicts;
6. UNKNOWN/ref/byte-ceiling/closed-schema behavior stays green;
7. full Agent Skills CI and SimCore required gate are green;
8. exact tested head is merged and read back from main.

Only after these gates may a separately frozen third retrospective diagnostic request be considered. The first two diagnostic runs remain immutable historical evidence and are never relabeled.
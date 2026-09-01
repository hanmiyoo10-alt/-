#!/usr/bin/env python3
"""Prompt dispatcher preserving historical layouts and adding compact candidate v10."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import compose_local_prompt_legacy as _legacy
from local_response_contract import (
    V10_CONTRACT_ID,
    ResponseContractError,
    contract_sha256,
    load_contract,
    source_block_legend,
    v10_source_context_text,
)

# Re-export historical constants/helpers/tests without changing their implementation.
for _name, _value in vars(_legacy).items():
    if _name not in {"__name__", "__file__", "__package__", "__loader__", "__spec__", "compose", "main"}:
        globals()[_name] = _value


def _compose_v10(matrix, context, skill_path: Path, mode: str, response_contract):
    if mode not in _legacy.MODES:
        raise _legacy.PromptError(f"unsupported mode: {mode}")
    if matrix.get("eval_kind") != "output":
        raise _legacy.PromptError("local zero-credit lane supports output evals only")
    skill = matrix.get("skill")
    case_id = str(matrix.get("case_id"))
    fixture_class = str(matrix.get("fixture_class", "standard"))
    prompt_layout = _legacy.resolve_prompt_layout(str(skill), case_id, fixture_class=fixture_class)
    if context.get("skill") != skill or str(context.get("case_id")) != case_id:
        raise _legacy.PromptError("context does not match matrix skill/case")
    user_task = matrix.get("prompt")
    if not isinstance(user_task, str) or not user_task.strip():
        raise _legacy.PromptError("matrix prompt missing")
    context_hash = context.get("context_sha256")
    if not isinstance(context_hash, str):
        raise _legacy.PromptError("context text/hash missing")

    skill_guidance = ""
    skill_guidance_sha256 = None
    canonical_skill_guidance_sha256 = None
    guidance_projection_id = None
    guidance_projection_sha256 = None
    if mode == "with_skill":
        try:
            canonical_skill_guidance = skill_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise _legacy.PromptError(f"cannot read skill guidance: {exc}") from exc
        if not canonical_skill_guidance.strip():
            raise _legacy.PromptError("skill guidance is empty")
        canonical_skill_guidance_sha256 = _legacy.sha256_bytes(canonical_skill_guidance.encode("utf-8"))
        skill_guidance, guidance_projection_id = _legacy._project_candidate_guidance(canonical_skill_guidance, matrix)
        skill_guidance_sha256 = _legacy.sha256_bytes(skill_guidance.encode("utf-8"))
        if guidance_projection_id is not None:
            guidance_projection_sha256 = skill_guidance_sha256

    candidate_frame = _legacy._candidate_eval_frame(matrix)
    grounding_frame = (
        "For candidate structured claims, propose semantics from SOURCE EVIDENCE and ground each affirmative tuple with compact S#@L# source-line references visible in the supplied evidence. A valid line reference proves grounding only, not semantic correctness.\n"
    )
    system_frame = (
        "You are evaluating a repository Agent Skill. Answer the USER TASK only.\n"
        "For mutable repository facts, use only the supplied SOURCE EVIDENCE.\n"
        "If evidence is insufficient, preserve UNKNOWN instead of guessing.\n"
        f"{candidate_frame}"
        "Do not claim you ran tools or changed repository state.\n"
        "Synthesize the supplied guidance and evidence before writing the answer.\n"
        "Return only the compact structured answer; do not restate TARGET SKILL GUIDANCE or raw SOURCE EVIDENCE.\n"
        f"{grounding_frame}"
        "Keep labels and values terse. The evaluator, not the model, derives blockers and the final verdict."
    )
    instruction = response_contract.get("prompt_instruction")
    if not isinstance(instruction, str) or not instruction.strip():
        raise _legacy.PromptError("response contract prompt_instruction missing")
    contract_section = (
        f"\n\nSTRUCTURED OUTPUT CONTRACT\n{instruction.strip()}\n\n"
        "SOURCE BLOCK LEGEND\n"
        f"{source_block_legend(context)}\n\n"
        "Use only compact S#@L# references to numbered lines visible in SOURCE EVIDENCE. Do not copy source paths or anchor prose into the output. The evaluator checks source-line existence, generic completeness, blockers, and verdict."
    )

    guidance_section = skill_guidance if skill_guidance else "(no target skill guidance in baseline mode)"
    system_section = f"SYSTEM FRAME\n{system_frame}{contract_section}\n\n"
    guidance_block = f"TARGET SKILL GUIDANCE\n{guidance_section}\n\n"
    evidence_block = f"SOURCE EVIDENCE\n{v10_source_context_text(context)}\n\n"
    user_block = f"USER TASK\n{user_task}\n"
    if prompt_layout == _legacy.GUIDANCE_AFTER_EVIDENCE_LAYOUT:
        full_prompt = system_section + evidence_block + guidance_block + user_block
    elif prompt_layout == _legacy.CLAIM_SLOT_RECENCY_LAYOUT:
        # Candidate v10 has no case-specific compatibility registry; recency reduces to guidance-after-evidence.
        full_prompt = system_section + evidence_block + guidance_block + user_block
    else:
        full_prompt = system_section + guidance_block + evidence_block + user_block

    meta = {
        "schema_version": _legacy.SCHEMA_VERSION,
        "mode": mode,
        "skill": skill,
        "case_id": case_id,
        "fixture_class": fixture_class,
        "candidate_scope": matrix.get("candidate_scope"),
        "prompt_layout": prompt_layout,
        "user_task_sha256": _legacy.sha256_bytes(user_task.encode("utf-8")),
        "evidence_context_sha256": context_hash,
        "skill_guidance_sha256": skill_guidance_sha256,
        "canonical_skill_guidance_sha256": canonical_skill_guidance_sha256,
        "guidance_projection_id": guidance_projection_id,
        "guidance_projection_sha256": guidance_projection_sha256,
        "response_contract_sha256": contract_sha256(response_contract),
        "full_prompt_sha256": _legacy.sha256_bytes(full_prompt.encode("utf-8")),
    }
    return full_prompt, meta


def compose(matrix, context, skill_path: Path, mode: str, response_contract=None):
    if response_contract is not None and response_contract.get("id") == V10_CONTRACT_ID:
        return _compose_v10(matrix, context, skill_path, mode, response_contract)
    return _legacy.compose(matrix, context, skill_path, mode, response_contract)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", required=True)
    parser.add_argument("--context", required=True)
    parser.add_argument("--skill-file", required=True)
    parser.add_argument("--mode", choices=sorted(_legacy.MODES), required=True)
    parser.add_argument("--response-contracts")
    parser.add_argument("--prompt-output", required=True)
    parser.add_argument("--meta-output", required=True)
    args = parser.parse_args(argv)
    try:
        matrix = _legacy._load(Path(args.matrix))
        context = _legacy._load(Path(args.context))
        response_contract = None
        if args.response_contracts:
            response_contract = load_contract(Path(args.response_contracts), str(matrix.get("skill")), str(matrix.get("case_id")))
        prompt, meta = compose(matrix, context, Path(args.skill_file), args.mode, response_contract)
        prompt_path = Path(args.prompt_output)
        meta_path = Path(args.meta_output)
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(prompt, encoding="utf-8")
        meta_path.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    except (_legacy.PromptError, ResponseContractError) as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

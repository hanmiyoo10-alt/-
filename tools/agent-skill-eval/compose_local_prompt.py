#!/usr/bin/env python3
"""Compose deterministic with-skill/baseline prompts for local Agent Skill output evals."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

from local_response_contract import (
    ResponseContractError,
    claim_evidence_legend,
    contract_sha256,
    evidence_legend,
    flow_edge_legend,
    load_contract,
)

SCHEMA_VERSION = 1
MODES = {"with_skill", "baseline_without_target_skill"}
PROMPT_LAYOUT_SCHEMA_VERSION = 1
DEFAULT_PROMPT_LAYOUT = "guidance_before_evidence"
GUIDANCE_AFTER_EVIDENCE_LAYOUT = "guidance_after_evidence"
CLAIM_SLOT_RECENCY_LAYOUT = "guidance_after_evidence_claim_compatibility_before_task"
PROMPT_LAYOUTS = {
    DEFAULT_PROMPT_LAYOUT,
    GUIDANCE_AFTER_EVIDENCE_LAYOUT,
    CLAIM_SLOT_RECENCY_LAYOUT,
}
DEFAULT_PROMPT_LAYOUTS_PATH = MODULE_DIR / "local-prompt-layouts.json"


class PromptError(ValueError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PromptError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise PromptError("JSON object required")
    return data


def resolve_prompt_layout(
    skill: str,
    case_id: str,
    path: Path = DEFAULT_PROMPT_LAYOUTS_PATH,
) -> str:
    if not path.is_file():
        return DEFAULT_PROMPT_LAYOUT
    data = _load(path)
    if data.get("schema_version") != PROMPT_LAYOUT_SCHEMA_VERSION:
        raise PromptError("unsupported prompt-layout schema_version")
    layouts = data.get("layouts")
    if not isinstance(layouts, dict):
        raise PromptError("prompt layouts map missing")
    skill_map = layouts.get(str(skill))
    if skill_map is None:
        return DEFAULT_PROMPT_LAYOUT
    if not isinstance(skill_map, dict):
        raise PromptError("skill prompt-layout map must be an object")
    layout = skill_map.get(str(case_id), DEFAULT_PROMPT_LAYOUT)
    if layout not in PROMPT_LAYOUTS:
        raise PromptError(f"unsupported prompt layout: {layout}")
    return layout


def compose(
    matrix: dict[str, Any],
    context: dict[str, Any],
    skill_path: Path,
    mode: str,
    response_contract: dict[str, Any] | None = None,
) -> tuple[str, dict[str, Any]]:
    if mode not in MODES:
        raise PromptError(f"unsupported mode: {mode}")
    if matrix.get("eval_kind") != "output":
        raise PromptError("local zero-credit lane supports output evals only")
    skill = matrix.get("skill")
    case_id = str(matrix.get("case_id"))
    prompt_layout = resolve_prompt_layout(str(skill), case_id)
    if context.get("skill") != skill or str(context.get("case_id")) != case_id:
        raise PromptError("context does not match matrix skill/case")
    user_task = matrix.get("prompt")
    if not isinstance(user_task, str) or not user_task.strip():
        raise PromptError("matrix prompt missing")
    context_text = context.get("context_text")
    context_hash = context.get("context_sha256")
    if not isinstance(context_text, str) or not isinstance(context_hash, str):
        raise PromptError("context text/hash missing")

    skill_guidance = ""
    skill_guidance_sha256 = None
    if mode == "with_skill":
        try:
            skill_guidance = skill_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise PromptError(f"cannot read skill guidance: {exc}") from exc
        if not skill_guidance.strip():
            raise PromptError("skill guidance is empty")
        skill_guidance_sha256 = sha256_bytes(skill_guidance.encode("utf-8"))

    structured = response_contract is not None
    grounding_frame = (
        "For flow relations, select only registered F# IDs from FLOW EDGE REGISTRY; do not invent endpoints. For every non-UNKNOWN preservation or test claim, use only a STATUS:E# pair permitted for that claim by CLAIM EVIDENCE STATUS COMPATIBILITY; do not write or invent source paths or anchors in the output.\n"
        if structured
        else "For every non-UNKNOWN semantic edge or preservation claim, name the exact source path and relevant symbol or contract basis from SOURCE EVIDENCE.\n"
    )
    system_frame = (
        "You are evaluating a repository Agent Skill. Answer the USER TASK only.\n"
        "For mutable repository facts, use only the supplied SOURCE EVIDENCE.\n"
        "If evidence is insufficient, preserve UNKNOWN instead of guessing.\n"
        "Do not claim you ran tools or changed repository state.\n"
        "Synthesize the supplied guidance and evidence before writing the answer.\n"
        "Return only the compact final answer; do not restate, quote, summarize, or reproduce TARGET SKILL GUIDANCE, its procedure/completion criteria, or raw SOURCE EVIDENCE.\n"
        "Do not use generic placeholders such as 'producer -> request/state metadata -> consumer' when SOURCE EVIDENCE names exact paths or symbols.\n"
        f"{grounding_frame}"
        "Keep the answer concise and source-grounded."
    )

    contract_section = ""
    compatibility_block = ""
    if response_contract is not None:
        instruction = response_contract.get("prompt_instruction")
        if not isinstance(instruction, str) or not instruction.strip():
            raise PromptError("response contract prompt_instruction missing")
        legend = evidence_legend(response_contract, context)
        flow_legend = flow_edge_legend(response_contract, context)
        compatibility = claim_evidence_legend(response_contract)
        compatibility_block = (
            "CLAIM EVIDENCE STATUS COMPATIBILITY\n"
            f"{compatibility}\n"
        )
        late_compatibility = prompt_layout == CLAIM_SLOT_RECENCY_LAYOUT
        compatibility_in_contract = "" if late_compatibility else compatibility_block + "\n"
        contract_section = (
            f"\n\nSTRUCTURED OUTPUT CONTRACT\n{instruction.strip()}\n\n"
            "EVIDENCE ID LEGEND\n"
            f"{legend}\n\n"
            "FLOW EDGE REGISTRY\n"
            f"{flow_legend}\n\n"
            f"{compatibility_in_contract}"
            "Use only registered F# values in flow_edges. Use only a listed STATUS:E# pair in preservation/test basis fields for that claim; the paths, anchors, and flow endpoints shown here are grounding references only."
        )

    guidance_section = skill_guidance if skill_guidance else "(no target skill guidance in baseline mode)"
    system_section = f"SYSTEM FRAME\n{system_frame}{contract_section}\n\n"
    guidance_block = f"TARGET SKILL GUIDANCE\n{guidance_section}\n\n"
    evidence_block = (
        "SOURCE EVIDENCE\n"
        f"{context_text if context_text else '(no source evidence required by profile)'}\n\n"
    )
    user_block = f"USER TASK\n{user_task}\n"
    if prompt_layout == CLAIM_SLOT_RECENCY_LAYOUT:
        full_prompt = (
            system_section
            + evidence_block
            + guidance_block
            + compatibility_block
            + "\n"
            + user_block
        )
    elif prompt_layout == GUIDANCE_AFTER_EVIDENCE_LAYOUT:
        full_prompt = system_section + evidence_block + guidance_block + user_block
    else:
        full_prompt = system_section + guidance_block + evidence_block + user_block
    meta = {
        "schema_version": SCHEMA_VERSION,
        "mode": mode,
        "skill": skill,
        "case_id": case_id,
        "prompt_layout": prompt_layout,
        "user_task_sha256": sha256_bytes(user_task.encode("utf-8")),
        "evidence_context_sha256": context_hash,
        "skill_guidance_sha256": skill_guidance_sha256,
        "response_contract_sha256": contract_sha256(response_contract),
        "full_prompt_sha256": sha256_bytes(full_prompt.encode("utf-8")),
    }
    return full_prompt, meta


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", required=True)
    parser.add_argument("--context", required=True)
    parser.add_argument("--skill-file", required=True)
    parser.add_argument("--mode", choices=sorted(MODES), required=True)
    parser.add_argument("--response-contracts")
    parser.add_argument("--prompt-output", required=True)
    parser.add_argument("--meta-output", required=True)
    args = parser.parse_args(argv)
    try:
        matrix = _load(Path(args.matrix))
        context = _load(Path(args.context))
        response_contract = None
        if args.response_contracts:
            response_contract = load_contract(
                Path(args.response_contracts),
                str(matrix.get("skill")),
                str(matrix.get("case_id")),
            )
        prompt, meta = compose(
            matrix,
            context,
            Path(args.skill_file),
            args.mode,
            response_contract,
        )
        prompt_path = Path(args.prompt_output)
        meta_path = Path(args.meta_output)
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(prompt, encoding="utf-8")
        meta_path.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    except (PromptError, ResponseContractError) as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

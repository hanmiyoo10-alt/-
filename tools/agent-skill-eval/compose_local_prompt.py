#!/usr/bin/env python3
"""Compose deterministic with-skill/baseline prompts for local Agent Skill output evals."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
MODES = {"with_skill", "baseline_without_target_skill"}


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


def compose(matrix: dict[str, Any], context: dict[str, Any], skill_path: Path, mode: str) -> tuple[str, dict[str, Any]]:
    if mode not in MODES:
        raise PromptError(f"unsupported mode: {mode}")
    if matrix.get("eval_kind") != "output":
        raise PromptError("local zero-credit lane supports output evals only")
    skill = matrix.get("skill")
    case_id = str(matrix.get("case_id"))
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

    system_frame = (
        "You are evaluating a repository Agent Skill. Answer the USER TASK only.\n"
        "For mutable repository facts, use only the supplied SOURCE EVIDENCE.\n"
        "If evidence is insufficient, preserve UNKNOWN instead of guessing.\n"
        "Do not claim you ran tools or changed repository state.\n"
        "Keep the answer concise and source-grounded."
    )
    guidance_section = skill_guidance if skill_guidance else "(no target skill guidance in baseline mode)"
    full_prompt = (
        f"SYSTEM FRAME\n{system_frame}\n\n"
        f"TARGET SKILL GUIDANCE\n{guidance_section}\n\n"
        f"SOURCE EVIDENCE\n{context_text if context_text else '(no source evidence required by profile)'}\n\n"
        f"USER TASK\n{user_task}\n"
    )
    meta = {
        "schema_version": SCHEMA_VERSION,
        "mode": mode,
        "skill": skill,
        "case_id": case_id,
        "user_task_sha256": sha256_bytes(user_task.encode("utf-8")),
        "evidence_context_sha256": context_hash,
        "skill_guidance_sha256": skill_guidance_sha256,
        "full_prompt_sha256": sha256_bytes(full_prompt.encode("utf-8")),
    }
    return full_prompt, meta


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", required=True)
    parser.add_argument("--context", required=True)
    parser.add_argument("--skill-file", required=True)
    parser.add_argument("--mode", choices=sorted(MODES), required=True)
    parser.add_argument("--prompt-output", required=True)
    parser.add_argument("--meta-output", required=True)
    args = parser.parse_args(argv)
    try:
        prompt, meta = compose(
            _load(Path(args.matrix)),
            _load(Path(args.context)),
            Path(args.skill_file),
            args.mode,
        )
        prompt_path = Path(args.prompt_output)
        meta_path = Path(args.meta_output)
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(prompt, encoding="utf-8")
        meta_path.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    except PromptError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

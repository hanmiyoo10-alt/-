#!/usr/bin/env python3
"""Prepare one zero-credit local-model Agent Skill output-eval matrix."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path

DEFAULT_LOCAL_MODEL_ID = "qwen2.5-1.5b-instruct-q4_k_m-local"
LOCAL_MODEL_IDS = frozenset({
    DEFAULT_LOCAL_MODEL_ID,
    "qwen2.5-3b-instruct-q4_k_m-local",
})
LOCAL_SKILLS = frozenset({
    "plugin-authority-scan",
    "plugin-impact-scope",
    "agent-execution-compactness",
})


def _load_base():
    path = Path(__file__).with_name("prepare_eval.py")
    spec = importlib.util.spec_from_file_location("agent_skill_prepare_eval_base", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load prepare_eval.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--skill", required=True)
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--repository-sha", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--model-id", default=os.environ.get("LOCAL_MODEL_ID", DEFAULT_LOCAL_MODEL_ID))
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    base = _load_base()
    try:
        base.ALLOWED_SKILLS = LOCAL_SKILLS
        base.ALLOWED_MODELS = LOCAL_MODEL_IDS
        payload = base.build_matrix(
            Path(args.repo_root).resolve(),
            args.skill,
            "output",
            args.case_id,
            args.model_id,
            args.repository_sha,
        )
        payload["execution_surface"] = "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS"
        text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        if args.output:
            out = Path(args.output)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(text, encoding="utf-8")
        else:
            sys.stdout.write(text)
    except base.EvalPreparationError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Prepare repository Agent Skill live evals with a live-specific skill allowlist."""

from __future__ import annotations

import importlib.util
from pathlib import Path

LIVE_ALLOWED_SKILLS = frozenset(
    {
        "plugin-authority-scan",
        "plugin-impact-scope",
        "agent-execution-compactness",
    }
)


def load_live_base():
    path = Path(__file__).with_name("prepare_eval.py")
    spec = importlib.util.spec_from_file_location("agent_skill_prepare_live_base", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load prepare_eval.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.ALLOWED_SKILLS = LIVE_ALLOWED_SKILLS
    return module


def main(argv: list[str] | None = None) -> int:
    return load_live_base().main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
